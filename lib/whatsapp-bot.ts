/**
 * Shared WhatsApp bot state machine.
 * Used by both the Termii webhook (/api/whatsapp/webhook) and the
 * Twilio webhook (/api/whatsapp/twilio).
 *
 * Features:
 *  - New customer registration (name → location → profile)
 *  - Artisan self-registration (name → category → location → experience → ID)
 *  - AI-powered home repair diagnosis
 *  - Artisan matching by location
 *  - Booking creation with Paystack payment link
 *  - Artisan job-alert + ACCEPT / DECLINE via reply
 */

import { createServiceClient } from "@/lib/supabase";
import { diagnoseIssue } from "@/app/actions";
import { ARTISAN_CATEGORIES, ArtisanCategory } from "@/lib/types";

export type BotSend = (to: string, message: string) => Promise<void>;

const CATEGORY_LIST = ARTISAN_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n");
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL ?? "https://fixmate-app-psi.vercel.app";
const PAYSTACK_KEY  = process.env.PAYSTACK_SECRET_KEY ?? "";

const USER_FEE_PCT    = 0.02;
const ARTISAN_FEE_PCT = 0.10;

// ── Entry point ───────────────────────────────────────────────────────────────

export async function handleBotMessage(
  phone: string,
  text:  string,
  send:  BotSend
): Promise<void> {
  const db  = createServiceClient();
  const msg = text.trim();

  // Load or create session
  let { data: session } = await db
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone", phone)
    .single();

  if (!session) {
    const { data: s } = await db
      .from("whatsapp_sessions")
      .insert({ phone, state: "idle", context: {} })
      .select()
      .single();
    session = s!;
  }

  await db
    .from("whatsapp_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("phone", phone);

  const state = session.state as string;
  const ctx   = session.context as Record<string, unknown>;

  // ── Artisan ACCEPT / DECLINE — works from any state ──────────────────────────
  const acceptMatch  = msg.match(/^accept\s+([a-f0-9-]{36})/i);
  const declineMatch = msg.match(/^decline\s+([a-f0-9-]{36})/i);

  if (acceptMatch || declineMatch) {
    const bookingId = (acceptMatch ?? declineMatch)![1];
    await handleArtisanResponse(phone, bookingId, acceptMatch ? "accept" : "decline", send, db);
    return;
  }

  try {
    switch (state) {

      // ── Idle / fresh start ────────────────────────────────────────────────
      case "idle":
      case "done": {
        const lower = msg.toLowerCase();

        // Artisan registration keyword
        if (/^(artisan|join as artisan|register artisan|be an artisan|become artisan)/i.test(lower)) {
          await setSession(db, phone, "artisan_reg_name", {});
          await send(phone,
            "Welcome! Let's get you set up as an iSabi artisan 🔧\n\nWhat is your full name?"
          );
          break;
        }

        // Check for existing customer profile
        const { data: profile } = await db
          .from("users")
          .select("id, name")
          .eq("phone", phone)
          .single();

        if (!profile) {
          // New customer — register first, remember their first message
          await setSession(db, phone, "registering_name", { firstMessage: msg });
          await send(phone,
            "Hi! Welcome to iSabi 👋\n\nI help you find trusted artisans for home repairs in Nigeria.\n\nFirst, what is your name?"
          );
          break;
        }

        // Existing customer — diagnose immediately
        await runDiagnosis(phone, msg, profile.id as string, profile.name as string, send, db);
        break;
      }

      // ── Customer registration: name ───────────────────────────────────────
      case "registering_name": {
        await setSession(db, phone, "registering_location", { ...ctx, name: msg });
        await send(phone, `Nice to meet you, ${msg}! 🙌\n\nWhat area are you in? (e.g. "Yaba, Lagos")`);
        break;
      }

      // ── Customer registration: location → create profile ─────────────────
      case "registering_location": {
        const name     = ctx.name as string;
        const location = msg;

        const { data: newUser } = await db
          .from("users")
          .insert({ phone, name, location })
          .select("id")
          .single();

        const userId      = newUser?.id as string;
        const firstMessage = ctx.firstMessage as string | undefined;

        await send(phone,
          `You're all set, ${name}! 🎉\n\nDescribe any home repair issue and iSabi AI will diagnose it and find you a nearby artisan.`
        );

        if (firstMessage && firstMessage.length > 3) {
          await runDiagnosis(phone, firstMessage, userId, name, send, db);
        } else {
          await setSession(db, phone, "idle", { userId });
          await send(phone, "What needs fixing today? Describe the issue and I'll get on it 🔧");
        }
        break;
      }

      // ── Artisan registration: name ────────────────────────────────────────
      case "artisan_reg_name": {
        await setSession(db, phone, "artisan_reg_category", { ...ctx, name: msg });
        await send(phone,
          `Thanks, ${msg}!\n\nWhat is your service category? Reply with the number:\n\n${CATEGORY_LIST}`
        );
        break;
      }

      // ── Artisan registration: category ────────────────────────────────────
      case "artisan_reg_category": {
        const num      = parseInt(msg) - 1;
        const category = ARTISAN_CATEGORIES[num];
        if (!category) {
          await send(phone, `Please reply with a number between 1 and ${ARTISAN_CATEGORIES.length}.\n\n${CATEGORY_LIST}`);
          break;
        }
        await setSession(db, phone, "artisan_reg_location", { ...ctx, category });
        await send(phone, `${category} — great choice!\n\nWhat area do you work in? (e.g. "Ikeja, Lagos")`);
        break;
      }

      // ── Artisan registration: location ────────────────────────────────────
      case "artisan_reg_location": {
        await setSession(db, phone, "artisan_reg_experience", { ...ctx, location: msg });
        await send(phone, "How many years of experience do you have? (Reply with a number, e.g. 5)");
        break;
      }

      // ── Artisan registration: experience ──────────────────────────────────
      case "artisan_reg_experience": {
        const years = parseInt(msg);
        if (isNaN(years) || years < 0 || years > 60) {
          await send(phone, "Please reply with a number between 0 and 60.");
          break;
        }
        await setSession(db, phone, "artisan_reg_id", { ...ctx, years });
        await send(phone,
          "Last step! Share your NIN, trade association ID, or any verification reference.\n\n(Text is fine — it will be reviewed by our team.)"
        );
        break;
      }

      // ── Artisan registration: verification ID → create record ─────────────
      case "artisan_reg_id": {
        const name     = ctx.name     as string;
        const category = ctx.category as ArtisanCategory;
        const location = ctx.location as string;
        const years    = ctx.years    as number;

        await db.from("artisans").insert({
          full_name:           name,
          phone,
          category,
          location,
          years_experience:    years,
          verification_id:     msg,
          skills:              [],
          service_radius_km:   10,
          trust_score:         50,
          application_status:  "pending",
          is_verified:         false,
          emergency_available: false,
          service_areas:       [],
        });

        await setSession(db, phone, "done", {});
        await send(phone,
          `✅ Application submitted, ${name}!\n\n` +
          `Category: ${category}\nArea: ${location}\nExperience: ${years} yr(s)\n\n` +
          `Our team will review and notify you within 24–48 hours.\n\n` +
          `Check your status anytime at:\n${APP_URL}/artisan/dashboard`
        );
        break;
      }

      // ── Awaiting location (after diagnosis) ───────────────────────────────
      // ── Mid-diagnosis recovery (server restarted between AI call) ──────
      case "diagnosing": {
        await setSession(db, phone, "idle", {});
        await send(phone, "Something interrupted the analysis. Please describe your issue again and I'll retry.");
        break;
      }

      case "awaiting_location": {
        const location = msg;

        const { data: artisans } = await db.rpc("match_artisans", {
          p_category: ctx.category,
          p_location: location,
          p_limit:    3,
        });

        if (!artisans?.length) {
          await send(phone,
            `No ${ctx.category} artisans found near ${location} yet.\n\nTry a broader area (e.g. just "Lagos") or reply with a different location.`
          );
          break;
        }

        await setSession(db, phone, "selecting_artisan", { ...ctx, location, artisans });

        type ARow = { full_name: string; trust_score: number; rating?: number; is_verified: boolean };
        const list = (artisans as ARow[])
          .map((a, i) =>
            `${i + 1}. ${a.full_name}${a.is_verified ? " ✓" : ""} — Trust: ${a.trust_score}%${a.rating ? `, ${a.rating}★` : ""}`
          )
          .join("\n");

        await send(phone,
          `Artisans near ${location}:\n\n${list}\n\nReply 1, 2, or 3 to select — or "none" to search again.`
        );
        break;
      }

      // ── Selecting artisan ─────────────────────────────────────────────────
      case "selecting_artisan": {
        if (msg.toLowerCase() === "none") {
          await setSession(db, phone, "awaiting_location", { ...ctx, artisans: undefined });
          await send(phone, "What area should I search? (e.g. 'Ikeja, Lagos')");
          break;
        }

        const idx         = parseInt(msg) - 1;
        const artisanList = ctx.artisans as Array<{ id: string; full_name: string }> | undefined;

        if (!artisanList || isNaN(idx) || idx < 0 || idx >= artisanList.length) {
          await send(phone, `Please reply with a number between 1 and ${artisanList?.length ?? 3}, or "none" to search again.`);
          break;
        }

        const artisan = artisanList[idx];
        await setSession(db, phone, "awaiting_confirm", { ...ctx, selectedArtisan: artisan });
        await send(phone, `You selected *${artisan.full_name}*.\n\nReply "yes" to book them, or "no" to choose again.`);
        break;
      }

      // ── Confirm booking ───────────────────────────────────────────────────
      case "awaiting_confirm": {
        if (msg.toLowerCase() === "no") {
          const artisanList = ctx.artisans as Array<{ full_name: string; is_verified: boolean; trust_score: number }>;
          await setSession(db, phone, "selecting_artisan", { ...ctx, selectedArtisan: undefined });
          const list = artisanList
            .map((a, i) => `${i + 1}. ${a.full_name}${a.is_verified ? " ✓" : ""} — Trust: ${a.trust_score}%`)
            .join("\n");
          await send(phone, `Choose an artisan:\n\n${list}`);
          break;
        }

        if (msg.toLowerCase() !== "yes") {
          await send(phone, 'Reply "yes" to confirm or "no" to go back.');
          break;
        }

        const artisan     = ctx.selectedArtisan as { id: string; full_name: string };
        const location    = ctx.location        as string;
        const description = ctx.description     as string;
        const userId      = ctx.userId          as string;
        const diag        = ctx.diagnosis       as Record<string, unknown>;

        await send(phone, "Creating your booking... ⏳");

        // 1. Create job_request
        const { data: job, error: jobErr } = await db
          .from("job_requests")
          .insert({
            user_id:     userId,
            description,
            location,
            image_provided: false,
            status:      "diagnosed",
          })
          .select()
          .single();

        if (jobErr || !job) {
          await send(phone, "Sorry, couldn't create the booking. Please try via the app: " + APP_URL);
          break;
        }

        // 2. Create diagnosis
        const { data: diagRecord } = await db
          .from("diagnoses")
          .insert({
            job_id:                    job.id,
            user_id:                   userId,
            issue_title:               diag.issue_title ?? "Home repair",
            summary:                   diag.summary ?? "",
            artisan_category:          diag.artisan_category ?? ctx.category,
            urgency:                   diag.urgency ?? "Medium",
            estimated_min_naira:       diag.estimated_min_naira ?? 0,
            estimated_max_naira:       diag.estimated_max_naira ?? 0,
            estimated_labor_naira:     diag.estimated_labor_naira ?? 0,
            estimated_materials_naira: diag.estimated_materials_naira ?? 0,
            safety_warning:            diag.safety_warning ?? null,
            first_aid_steps:           diag.first_aid_steps ?? [],
            follow_up_questions:       diag.follow_up_questions ?? [],
            artisan_brief:             diag.artisan_brief ?? null,
            language:                  diag.language ?? "English",
          })
          .select()
          .single();

        if (diagRecord) {
          await db.from("job_requests").update({ diagnosis_id: diagRecord.id }).eq("id", job.id);
        }

        // 3. Create booking
        const quoteAmount = Number(diag.estimated_max_naira ?? 30000);
        const userFee     = Math.round(quoteAmount * USER_FEE_PCT);
        const artisanFee  = Math.round(quoteAmount * ARTISAN_FEE_PCT);
        const totalCharge = quoteAmount + userFee;

        const { data: booking, error: bookErr } = await db
          .from("bookings")
          .insert({
            job_id:       job.id,
            user_id:      userId,
            artisan_id:   artisan.id,
            quote_amount: quoteAmount,
            user_fee:     userFee,
            artisan_fee:  artisanFee,
            total_charge: totalCharge,
            escrow_status: "not_funded",
          })
          .select()
          .single();

        if (bookErr || !booking) {
          await send(phone, "Booking created but could not finalise. Continue at: " + APP_URL + "/dashboard");
          break;
        }

        // 4. Update job
        await db
          .from("job_requests")
          .update({ selected_artisan_id: artisan.id, booking_id: booking.id, status: "booking_created" })
          .eq("id", job.id);

        // 5. Notify artisan via WhatsApp
        await notifyArtisanOfJob({
          artisanId:   artisan.id,
          bookingId:   booking.id,
          description,
          location,
          quoteAmount,
        }, db);

        // 6. Generate Paystack payment link
        const payLink = await generatePaymentLink(booking.id, totalCharge, phone, db);

        await setSession(db, phone, "done", {});

        const payMsg = payLink
          ? `\n\nPay securely here:\n${payLink}`
          : `\n\nPay at: ${APP_URL}/booking?bookingId=${booking.id}`;

        await send(phone,
          `✅ Booked! *${artisan.full_name}* has been notified.\n\n` +
          `Estimated cost: ₦${quoteAmount.toLocaleString()} + 2% service fee\n` +
          `Total: ₦${totalCharge.toLocaleString()}` +
          payMsg +
          `\n\nTrack your job: ${APP_URL}/dashboard\n\nSend any message to report a new issue.`
        );
        break;
      }

      default: {
        await setSession(db, phone, "idle", {});
        await send(phone,
          "Hi! I'm iSabi AI 🔧\n\n" +
          "Describe your home repair issue and I'll diagnose it and find you a verified artisan.\n\n" +
          "To join as an artisan, type *artisan*."
        );
      }
    }
  } catch (err) {
    console.error("WhatsApp bot error:", err);
    await send(phone, "Sorry, something went wrong. Please try again in a moment.");
  }
}

// ── Artisan accept / decline ──────────────────────────────────────────────────

async function handleArtisanResponse(
  artisanPhone: string,
  bookingId:    string,
  action:       "accept" | "decline",
  send:         BotSend,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:           any
) {
  // Verify this phone belongs to an artisan
  const { data: artisan } = await db
    .from("artisans")
    .select("id, full_name")
    .eq("phone", artisanPhone)
    .single();

  if (!artisan) {
    await send(artisanPhone, "This command is only for registered artisans.");
    return;
  }

  const { data: booking } = await db
    .from("bookings")
    .select("id, job_id, artisan_id, escrow_status, job_requests(description, location)")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.artisan_id !== artisan.id) {
    await send(artisanPhone, "Booking not found or not assigned to you.");
    return;
  }

  if (action === "accept") {
    await db
      .from("bookings")
      .update({ escrow_status: "accepted" })
      .eq("id", bookingId);

    await db
      .from("job_requests")
      .update({ status: "artisan_accepted" })
      .eq("id", booking.job_id);

    await db.from("escrow_transactions").insert({
      booking_id: bookingId,
      job_id:     booking.job_id,
      action:     "artisan_accept",
      amount:     0,
      actor:      "artisan",
      note:       "Artisan accepted job via WhatsApp",
    });

    await send(artisanPhone,
      `✅ You've accepted the job!\n\nJob: ${booking.job_requests?.description ?? "Home repair"}\nLocation: ${booking.job_requests?.location ?? ""}\n\nHead to the app to coordinate with the customer:\n${APP_URL}/artisan/dashboard`
    );

    // Notify the customer
    await notifyCustomer(booking.job_id, `✅ Your artisan *${artisan.full_name}* has accepted the job and will be in touch shortly.\n\nTrack at: ${APP_URL}/dashboard`, db);

  } else {
    await db
      .from("bookings")
      .update({ escrow_status: "not_funded" })
      .eq("id", bookingId);

    await db
      .from("job_requests")
      .update({ status: "diagnosed" })
      .eq("id", booking.job_id);

    await send(artisanPhone, "You've declined the job. No further action needed.");

    await notifyCustomer(booking.job_id,
      `Your artisan declined this job. Visit ${APP_URL}/report to find another artisan.`,
      db
    );
  }
}

// ── Public helper: notify artisan when a booking is created (web or bot) ──────

export async function notifyArtisanOfJob(params: {
  artisanId:   string;
  bookingId:   string;
  description: string;
  location:    string;
  quoteAmount: number;
}, db?: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = (db as any) ?? createServiceClient();

  const { data: artisan } = await svc
    .from("artisans")
    .select("phone, full_name")
    .eq("id", params.artisanId)
    .single();

  if (!artisan?.phone) return;

  const msg =
    `🔔 New job request from iSabi!\n\n` +
    `Issue: ${params.description}\n` +
    `Location: ${params.location}\n` +
    `Estimated pay: ₦${Math.round(params.quoteAmount * (1 - 0.10)).toLocaleString()} (after 10% fee)\n\n` +
    `Reply:\nACCEPT ${params.bookingId}\nor\nDECLINE ${params.bookingId}`;

  await sendWhatsApp(artisan.phone as string, msg);
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function runDiagnosis(
  phone:       string,
  description: string,
  userId:      string,
  userName:    string,
  send:        BotSend,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:          any
) {
  await setSession(db, phone, "diagnosing", { description, userId });
  await send(phone, "Analysing your issue... ⏳ This takes a few seconds.");

  const diagnosis = await diagnoseIssue(description, null);

  const cost        = `₦${diagnosis.estimated_min_naira.toLocaleString()} – ₦${diagnosis.estimated_max_naira.toLocaleString()}`;
  const urgencyLine = diagnosis.urgency === "High" ? "⚠️ *This is urgent!*\n\n" : "";
  const warning     = diagnosis.safety_warning ? `\n\n⚠️ ${diagnosis.safety_warning}` : "";

  await setSession(db, phone, "awaiting_location", {
    description,
    userId,
    userName,
    diagnosis,
    category: diagnosis.artisan_category,
  });

  await send(phone,
    `${urgencyLine}*${diagnosis.issue_title}*\n\n` +
    `${diagnosis.summary}${warning}\n\n` +
    `Estimated cost: ${cost}\n` +
    `Artisan needed: ${diagnosis.artisan_category}\n\n` +
    `What area are you in? (e.g. "Yaba, Lagos")`
  );
}

async function generatePaymentLink(
  bookingId:   string,
  totalCharge: number,
  phone:       string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:          any
): Promise<string | null> {
  if (!PAYSTACK_KEY) return null;
  try {
    const ref = `WA-${bookingId.slice(0, 8)}-${Date.now()}`;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method:  "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount:       totalCharge * 100,
        email:        `${phone.replace(/\D/g, "")}@isabi.ng`,
        reference:    ref,
        metadata:     { booking_id: bookingId },
        callback_url: `${APP_URL}/booking?bookingId=${bookingId}`,
      }),
    });
    const data = await res.json() as { status: boolean; data?: { authorization_url: string } };
    if (data.status && data.data?.authorization_url) {
      await db.from("bookings").update({ paystack_reference: ref, escrow_status: "payment_pending" }).eq("id", bookingId);
      return data.data.authorization_url;
    }
  } catch {
    // payment link is non-critical — fall back to web dashboard
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyCustomer(jobId: string, message: string, db: any) {
  const { data: job } = await db
    .from("job_requests")
    .select("user_id")
    .eq("id", jobId)
    .single();
  if (!job) return;

  const { data: user } = await db
    .from("users")
    .select("phone")
    .eq("id", job.user_id)
    .single();
  if (!user?.phone) return;

  await sendWhatsApp(user.phone as string, message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setSession(db: any, phone: string, state: string, context: Record<string, unknown>) {
  await db.from("whatsapp_sessions").update({ state, context }).eq("phone", phone);
}

// Generic outbound WhatsApp — uses Termii if configured, otherwise Twilio
async function sendWhatsApp(to: string, message: string): Promise<void> {
  const termiiKey    = process.env.TERMII_API_KEY;
  const termiiSender = process.env.TERMII_SENDER_ID ?? "iSabi";

  if (termiiKey) {
    await fetch("https://v3.api.termii.com/api/sms/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        from:    termiiSender,
        sms:     message,
        type:    "plain",
        channel: "WhatsApp",
        api_key: termiiKey,
      }),
    });
    return;
  }

  const accountSid  = process.env.TWILIO_ACCOUNT_SID;
  const authToken   = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber  = process.env.TWILIO_WHATSAPP_NUMBER;

  if (accountSid && authToken && fromNumber) {
    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken);
    const dest   = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    await client.messages.create({ from: fromNumber, to: dest, body: message });
  }
}
