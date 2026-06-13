/**
 * Shared WhatsApp bot state machine.
 * Used by both the Termii webhook (/api/whatsapp/webhook) and the
 * Twilio webhook (/api/whatsapp/twilio).
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

const MENU =
  `*iSabi Home Repair Bot* 🔧\n\n` +
  `Reply with a number or keyword:\n\n` +
  `1️⃣  *fix* — Describe a repair issue (AI diagnosis + artisan match)\n` +
  `2️⃣  *artisan* — Register as an artisan\n` +
  `3️⃣  *status* — Check your active bookings\n` +
  `4️⃣  *update location* — Change your saved area\n\n` +
  `Or just describe your problem and I'll handle the rest.`;

// ── Entry point ───────────────────────────────────────────────────────────────

export async function handleBotMessage(
  phone: string,
  text:  string,
  send:  BotSend
): Promise<void> {
  const db  = createServiceClient();
  const msg = text.trim();

  try {
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
      session = s;
    }

    if (!session) {
      await send(phone, "Sorry, I'm having trouble right now. Please try again.");
      return;
    }

    await db
      .from("whatsapp_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("phone", phone);

    const state = session.state as string;
    const ctx   = session.context as Record<string, unknown>;

    // ── Global commands — work from any state ─────────────────────────────────
    const lower = msg.toLowerCase().trim();

    if (["menu", "help", "hi", "hello", "start", "0"].includes(lower)) {
      const { data: profile } = await db
        .from("users").select("name").eq("phone", phone).single();
      const greeting = profile ? `Hi ${profile.name as string}! 👋\n\n` : "";
      await setSession(db, phone, "idle", {});
      await send(phone, greeting + MENU);
      return;
    }

    // Artisan ACCEPT / DECLINE
    const acceptMatch  = msg.match(/^accept\s+([a-f0-9-]{36})/i);
    const declineMatch = msg.match(/^decline\s+([a-f0-9-]{36})/i);
    if (acceptMatch || declineMatch) {
      const bookingId = (acceptMatch ?? declineMatch)![1];
      await handleArtisanResponse(phone, bookingId, acceptMatch ? "accept" : "decline", send, db);
      return;
    }

    switch (state) {

      // ── Idle / fresh start ──────────────────────────────────────────────────
      case "idle":
      case "done": {

        // Menu shortcuts
        if (["1", "fix"].includes(lower)) {
          const { data: profile } = await db
            .from("users").select("id, name, location").eq("phone", phone).single();
          if (!profile) {
            await setSession(db, phone, "registering_name", {});
            await send(phone, "Hi! Welcome to iSabi 👋\n\nI help you find trusted artisans for home repairs in Nigeria.\n\nFirst, what is your full name?");
            break;
          }
          await send(phone, "What's the issue? Describe it and our AI will diagnose it. 🔧");
          await setSession(db, phone, "awaiting_issue", { userId: profile.id, userName: profile.name, location: profile.location });
          break;
        }

        if (["2", "artisan", "/artisan"].includes(lower)) {
          await setSession(db, phone, "artisan_reg_name", {});
          await send(phone, "Great! Let's get you set up as an iSabi artisan 🔧\n\nWhat is your full name?");
          break;
        }

        if (["3", "status"].includes(lower)) {
          await handleStatus(phone, send, db);
          break;
        }

        if (lower === "update location") {
          await setSession(db, phone, "updating_location", {});
          await send(phone, "What is your new area? (e.g. \"Yaba, Lagos\")");
          break;
        }

        // Check for existing profile
        const { data: profile } = await db
          .from("users").select("id, name, location").eq("phone", phone).single();

        if (!profile) {
          // New user — show welcome + register
          await setSession(db, phone, "registering_name", { firstMessage: msg });
          await send(phone,
            "Hi! Welcome to iSabi 👋\n\n" +
            "I help you find trusted artisans for home repairs in Nigeria.\n\n" +
            "First, what is your full name?"
          );
          break;
        }

        // Existing user — treat their message as a repair issue
        await setSession(db, phone, "diagnosing", {
          userId:   profile.id,
          userName: profile.name,
          location: profile.location,
        });
        await runDiagnosis(phone, msg, profile.id as string, profile.name as string, profile.location as string, send, db);
        break;
      }

      // ── Awaiting explicit issue description ─────────────────────────────────
      case "awaiting_issue": {
        await setSession(db, phone, "diagnosing", ctx);
        await runDiagnosis(phone, msg, ctx.userId as string, ctx.userName as string, ctx.location as string, send, db);
        break;
      }

      // ── Customer registration: name ─────────────────────────────────────────
      case "registering_name": {
        await setSession(db, phone, "registering_location", { ...ctx, name: msg });
        await send(phone, `Nice to meet you, ${msg}! 🙌\n\nWhat area are you in? (e.g. "Yaba, Lagos")`);
        break;
      }

      // ── Customer registration: location → create profile ────────────────────
      case "registering_location": {
        const name     = ctx.name as string;
        const location = msg;

        const { data: newUser } = await db
          .from("users")
          .insert({ phone, name, location })
          .select("id")
          .single();

        const userId       = newUser?.id as string;
        const firstMessage = ctx.firstMessage as string | undefined;

        await send(phone,
          `You're all set, ${name}! 🎉\n\n` +
          `Your area is saved as *${location}* — I'll always search there first.\n\n` +
          MENU
        );

        if (firstMessage && firstMessage.length > 3) {
          await setSession(db, phone, "diagnosing", { userId, userName: name, location });
          await runDiagnosis(phone, firstMessage, userId, name, location, send, db);
        } else {
          await setSession(db, phone, "idle", {});
        }
        break;
      }

      // ── Update saved location ───────────────────────────────────────────────
      case "updating_location": {
        await db.from("users").update({ location: msg }).eq("phone", phone);
        await setSession(db, phone, "idle", {});
        await send(phone, `✅ Your area has been updated to *${msg}*.\n\n` + MENU);
        break;
      }

      // ── Artisan registration: name ──────────────────────────────────────────
      case "artisan_reg_name": {
        await setSession(db, phone, "artisan_reg_category", { ...ctx, name: msg });
        await send(phone,
          `Thanks, ${msg}!\n\nWhat is your service category? Reply with the number:\n\n${CATEGORY_LIST}`
        );
        break;
      }

      // ── Artisan registration: category ──────────────────────────────────────
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

      // ── Artisan registration: location ──────────────────────────────────────
      case "artisan_reg_location": {
        await setSession(db, phone, "artisan_reg_experience", { ...ctx, location: msg });
        await send(phone, "How many years of experience do you have? (reply with a number, e.g. 5)");
        break;
      }

      // ── Artisan registration: experience ────────────────────────────────────
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

      // ── Artisan registration: verification ID → create record ────────────────
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
          `Our team will review and notify you within 24–48 hours.\n` +
          `Check your status: ${APP_URL}/artisan/dashboard`
        );
        break;
      }

      // ── Stuck in diagnosing (server restart mid-AI call) ────────────────────
      case "diagnosing": {
        // Re-run diagnosis if we have the context, otherwise reset
        if (ctx.userId && ctx.location) {
          await send(phone, "Re-analysing your issue... ⏳");
          await runDiagnosis(
            phone,
            (ctx.description as string | undefined) ?? msg,
            ctx.userId as string,
            ctx.userName as string,
            ctx.location as string,
            send, db
          );
        } else {
          await setSession(db, phone, "idle", {});
          await send(phone, "Something went wrong with the last analysis. " + MENU);
        }
        break;
      }

      // ── Selecting artisan ───────────────────────────────────────────────────
      case "selecting_artisan": {
        if (lower === "none" || lower === "search again") {
          await setSession(db, phone, "change_location", { ...ctx });
          await send(phone, "Enter a different area to search (e.g. \"Ikeja, Lagos\"), or reply *cancel* to go back to the menu.");
          break;
        }

        const idx         = parseInt(msg) - 1;
        const artisanList = ctx.artisans as Array<{ id: string; full_name: string }> | undefined;

        if (!artisanList || isNaN(idx) || idx < 0 || idx >= artisanList.length) {
          const max = artisanList?.length ?? 3;
          await send(phone, `Please reply with a number between 1 and ${max}, or *none* to search a different area.`);
          break;
        }

        const artisan = artisanList[idx];
        await setSession(db, phone, "awaiting_confirm", { ...ctx, selectedArtisan: artisan });
        await send(phone, `You selected *${artisan.full_name}*.\n\nReply *yes* to confirm the booking, or *no* to choose a different artisan.`);
        break;
      }

      // ── Change search location ──────────────────────────────────────────────
      case "change_location": {
        if (lower === "cancel") {
          await setSession(db, phone, "idle", {});
          await send(phone, MENU);
          break;
        }
        const newLocation = msg;
        const { data: artisans } = await db.rpc("match_artisans", {
          p_category: ctx.category,
          p_location: newLocation,
          p_limit:    3,
        });

        if (!artisans?.length) {
          await send(phone,
            `❌ No ${ctx.category as string} artisans found near *${newLocation}* yet.\n\n` +
            `Try a broader area (e.g. just "Lagos") or reply *cancel* to go back to the menu.`
          );
          break;
        }

        await setSession(db, phone, "selecting_artisan", { ...ctx, location: newLocation, artisans });
        await send(phone, formatArtisanList(artisans, newLocation));
        break;
      }

      // ── Confirm booking ─────────────────────────────────────────────────────
      case "awaiting_confirm": {
        if (lower === "no") {
          const artisanList = ctx.artisans as Array<{ full_name: string; is_verified: boolean; trust_score: number }>;
          await setSession(db, phone, "selecting_artisan", { ...ctx, selectedArtisan: undefined });
          await send(phone, formatArtisanList(artisanList, ctx.location as string));
          break;
        }

        if (lower !== "yes") {
          await send(phone, 'Reply *yes* to confirm or *no* to choose a different artisan.');
          break;
        }

        const artisan     = ctx.selectedArtisan as { id: string; full_name: string };
        const location    = ctx.location        as string;
        const description = ctx.description     as string;
        const userId      = ctx.userId          as string;
        const diag        = ctx.diagnosis       as Record<string, unknown>;

        await send(phone, "Creating your booking... ⏳");

        const { data: job, error: jobErr } = await db
          .from("job_requests")
          .insert({ user_id: userId, description, location, image_provided: false, status: "diagnosed" })
          .select()
          .single();

        if (jobErr || !job) {
          await send(phone, "Sorry, couldn't create the booking. Please try via the app: " + APP_URL);
          break;
        }

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

        const quoteMin    = Number(diag.estimated_min_naira ?? 0);
        const quoteMax    = Number(diag.estimated_max_naira ?? 0);
        const quoteAmount = quoteMax > 0 ? quoteMax : 0;
        const userFee     = quoteAmount > 0 ? Math.round(quoteAmount * USER_FEE_PCT) : 0;
        const artisanFee  = quoteAmount > 0 ? Math.round(quoteAmount * ARTISAN_FEE_PCT) : 0;
        const totalCharge = quoteAmount + userFee;

        const { data: booking, error: bookErr } = await db
          .from("bookings")
          .insert({
            job_id:        job.id,
            user_id:       userId,
            artisan_id:    artisan.id,
            quote_amount:  quoteAmount,
            user_fee:      userFee,
            artisan_fee:   artisanFee,
            total_charge:  totalCharge,
            escrow_status: "not_funded",
          })
          .select()
          .single();

        if (bookErr || !booking) {
          await send(phone, "Booking logged but could not finalise. Continue at: " + APP_URL + "/dashboard");
          break;
        }

        await db
          .from("job_requests")
          .update({ selected_artisan_id: artisan.id, booking_id: booking.id, status: "booking_created" })
          .eq("id", job.id);

        await notifyArtisanOfJob({ artisanId: artisan.id, bookingId: booking.id, description, location, quoteMin, quoteMax }, db);

        const payLink = await generatePaymentLink(booking.id, totalCharge, phone, db);

        await setSession(db, phone, "done", {});

        const costLine = quoteMin > 0 && quoteMax > 0
          ? `Estimated cost: ₦${quoteMin.toLocaleString()} – ₦${quoteMax.toLocaleString()} + 2% service fee\n`
          : "Final cost will be quoted by the artisan after assessment.\n";

        const payMsg = payLink
          ? `\nPay securely: ${payLink}`
          : `\nPay at: ${APP_URL}/booking?bookingId=${booking.id}`;

        await send(phone,
          `✅ Booked! *${artisan.full_name}* has been notified and will accept or decline shortly.\n\n` +
          costLine +
          payMsg +
          `\n\nTrack your job: ${APP_URL}/dashboard\n\n` +
          `Reply *menu* to start a new request.`
        );
        break;
      }

      default: {
        await setSession(db, phone, "idle", {});
        await send(phone, MENU);
      }
    }
  } catch (err) {
    console.error("WhatsApp bot error:", err);
    await send(phone, "Sorry, something went wrong. Please try again, or reply *menu* to restart.");
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
  const { data: artisan } = await db
    .from("artisans").select("id, full_name").eq("phone", artisanPhone).single();

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
    await db.from("bookings").update({ escrow_status: "accepted" }).eq("id", bookingId);
    await db.from("job_requests").update({ status: "artisan_accepted" }).eq("id", booking.job_id);
    await db.from("escrow_transactions").insert({
      booking_id: bookingId, job_id: booking.job_id,
      action: "artisan_accept", amount: 0, actor: "artisan",
      note: "Artisan accepted job via WhatsApp",
    });
    await send(artisanPhone,
      `✅ You've accepted the job!\n\n` +
      `Job: ${booking.job_requests?.description ?? "Home repair"}\n` +
      `Location: ${booking.job_requests?.location ?? ""}\n\n` +
      `Coordinate with the customer via the app:\n${APP_URL}/artisan/dashboard`
    );
    await notifyCustomer(booking.job_id,
      `✅ *${artisan.full_name as string}* has accepted your job and will be in touch shortly.\n\nTrack at: ${APP_URL}/dashboard`,
      db
    );
  } else {
    await db.from("bookings").update({ escrow_status: "not_funded" }).eq("id", bookingId);
    await db.from("job_requests").update({ status: "diagnosed" }).eq("id", booking.job_id);
    await send(artisanPhone, "You've declined the job. No further action needed.");
    await notifyCustomer(booking.job_id,
      `Your artisan declined this job. Visit ${APP_URL}/report to find another artisan.`, db
    );
  }
}

// ── Status check ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleStatus(phone: string, send: BotSend, db: any) {
  const { data: user } = await db.from("users").select("id, name").eq("phone", phone).single();
  if (!user) {
    await send(phone, "You don't have an account yet. Reply *1* or *fix* to get started.");
    return;
  }

  const { data: bookings } = await db
    .from("bookings")
    .select("id, escrow_status, created_at, artisans(full_name), job_requests(description, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!bookings?.length) {
    await send(phone, `Hi ${user.name as string}! You have no active bookings.\n\nReply *1* or *fix* to raise a new job.`);
    return;
  }

  type B = { id: string; escrow_status: string; artisans: { full_name: string } | null; job_requests: { description: string; status: string } | null };
  const lines = (bookings as B[]).map((b, i) =>
    `${i + 1}. ${b.artisans?.full_name ?? "Artisan"} — ${b.job_requests?.description?.slice(0, 40) ?? ""}…\n   Status: ${b.job_requests?.status ?? b.escrow_status}`
  ).join("\n\n");

  await send(phone, `Hi ${user.name as string}! Your recent bookings:\n\n${lines}\n\nFull details: ${APP_URL}/dashboard`);
}

// ── Public helper: notify artisan when a booking is created (web or bot) ──────

export async function notifyArtisanOfJob(params: {
  artisanId:   string;
  bookingId:   string;
  description: string;
  location:    string;
  quoteMin?:   number;
  quoteMax?:   number;
  quoteAmount?: number; // legacy compat
}, db?: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = (db as any) ?? createServiceClient();

  const { data: artisan } = await svc
    .from("artisans").select("phone, full_name").eq("id", params.artisanId).single();

  if (!artisan?.phone) return;

  const min = params.quoteMin ?? params.quoteAmount ?? 0;
  const max = params.quoteMax ?? params.quoteAmount ?? 0;
  const payLine = min > 0 && max > 0
    ? `Estimated pay: ₦${Math.round(min * (1 - ARTISAN_FEE_PCT)).toLocaleString()} – ₦${Math.round(max * (1 - ARTISAN_FEE_PCT)).toLocaleString()} (after 10% fee)\n`
    : "Pay will be quoted after assessment.\n";

  const msg =
    `🔔 New job request!\n\n` +
    `Issue: ${params.description}\n` +
    `Location: ${params.location}\n` +
    payLine +
    `\nReply:\nACCEPT ${params.bookingId}\nor\nDECLINE ${params.bookingId}`;

  await sendWhatsApp(artisan.phone as string, msg);
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function runDiagnosis(
  phone:       string,
  description: string,
  userId:      string,
  userName:    string,
  location:    string,
  send:        BotSend,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:          any
) {
  await setSession(db, phone, "diagnosing", { description, userId, userName, location });
  await send(phone, "Analysing your issue... ⏳ (a few seconds)");

  const diagnosis = await diagnoseIssue(description, null);

  const urgencyLine = diagnosis.urgency === "High" ? "⚠️ *Urgent issue!*\n\n" : "";
  const warning     = diagnosis.safety_warning ? `\n\n⚠️ *Safety note:* ${diagnosis.safety_warning}` : "";
  const min         = diagnosis.estimated_min_naira;
  const max         = diagnosis.estimated_max_naira;
  const costLine    = min > 0 && max > 0
    ? `💰 Estimated cost: ₦${min.toLocaleString()} – ₦${max.toLocaleString()}\n`
    : "💰 Cost will be quoted by artisan after assessment.\n";

  // Search artisans in the user's saved location
  const { data: artisans } = await db.rpc("match_artisans", {
    p_category: diagnosis.artisan_category,
    p_location: location,
    p_limit:    3,
  });

  const diagMsg =
    `${urgencyLine}*${diagnosis.issue_title}*\n\n` +
    `${diagnosis.summary}${warning}\n\n` +
    `🔧 Artisan needed: ${diagnosis.artisan_category}\n` +
    costLine;

  if (!artisans?.length) {
    await setSession(db, phone, "change_location", {
      description, userId, userName, location,
      diagnosis, category: diagnosis.artisan_category,
    });
    await send(phone,
      diagMsg +
      `\n❌ No ${diagnosis.artisan_category} artisans found near *${location}* yet.\n\n` +
      `Reply with a different area to search (e.g. "Lagos Island"), or *cancel* to go back to the menu.`
    );
    return;
  }

  await setSession(db, phone, "selecting_artisan", {
    description, userId, userName, location,
    diagnosis, category: diagnosis.artisan_category,
    artisans,
  });

  await send(phone, diagMsg + "\n" + formatArtisanList(artisans, location));
}

type ARow = { full_name: string; trust_score: number; rating?: number; is_verified: boolean };

function formatArtisanList(artisans: ARow[], location: string): string {
  const list = artisans
    .map((a, i) => {
      const verified = a.is_verified ? " ✓" : " (unverified)";
      const rating   = a.rating ? `, ${a.rating}★` : "";
      return `${i + 1}. *${a.full_name}*${verified} — Trust: ${a.trust_score}%${rating}`;
    })
    .join("\n");

  return (
    `Artisans near *${location}*:\n\n${list}\n\n` +
    `Reply *1*, *2*, or *3* to select — or *none* to search a different area.`
  );
}

async function generatePaymentLink(
  bookingId:   string,
  totalCharge: number,
  phone:       string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:          any
): Promise<string | null> {
  if (!PAYSTACK_KEY || totalCharge <= 0) return null;
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
    // payment link non-critical
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyCustomer(jobId: string, message: string, db: any) {
  const { data: job } = await db.from("job_requests").select("user_id").eq("id", jobId).single();
  if (!job) return;
  const { data: user } = await db.from("users").select("phone").eq("id", job.user_id).single();
  if (!user?.phone) return;
  await sendWhatsApp(user.phone as string, message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setSession(db: any, phone: string, state: string, context: Record<string, unknown>) {
  await db.from("whatsapp_sessions").update({ state, context }).eq("phone", phone);
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  const termiiKey    = process.env.TERMII_API_KEY;
  const termiiSender = process.env.TERMII_SENDER_ID ?? "iSabi";

  if (termiiKey) {
    await fetch("https://v3.api.termii.com/api/sms/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to, from: termiiSender, sms: message,
        type: "plain", channel: "WhatsApp", api_key: termiiKey,
      }),
    });
    return;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (accountSid && authToken && fromNumber) {
    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken);
    const dest   = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    await client.messages.create({ from: fromNumber, to: dest, body: message });
  }
}
