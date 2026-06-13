/**
 * iSabi WhatsApp bot — state machine
 *
 * Features:
 *  1. Image-based diagnosis  — user sends photo, AI uses vision model
 *  2. Follow-up question     — 1 clarifying question before full diagnosis
 *  3. Auto-fallback artisan  — artisan declines → next best is auto-notified
 *  5. Post-job rating        — artisan sends DONE → customer gets rating prompt
 *  6. Conversation memory    — remembers last 3 issues per user
 *  7. Broadcast to artisans  — web bookings also trigger WhatsApp alerts
 */

import { createServiceClient } from "@/lib/supabase";
import { diagnoseIssue, getFollowUpQuestion } from "@/app/actions";
import { ARTISAN_CATEGORIES, ArtisanCategory } from "@/lib/types";

export type BotSend = (to: string, message: string) => Promise<void>;

const CATEGORY_LIST = ARTISAN_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n");
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL ?? "https://isabiwork.vercel.app";
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
  phone:       string,
  text:        string,
  send:        BotSend,
  imageBase64: string | null = null
): Promise<void> {
  const db  = createServiceClient();
  const msg = text.trim();

  try {
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
      await send(phone, "Sorry, having trouble right now. Please try again.");
      return;
    }

    await db
      .from("whatsapp_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("phone", phone);

    const state = session.state as string;
    const ctx   = session.context as Record<string, unknown>;

    const lower = msg.toLowerCase().trim();

    // ── Global: greeting → onboarding or menu ──────────────────────────────
    if (["menu", "help", "hi", "hello", "start", "0"].includes(lower) && !imageBase64) {
      const { data: profile } = await db
        .from("bot_customers").select("name").eq("phone", phone).single();

      if (!profile) {
        // First-time user — start onboarding
        await setSession(db, phone, "registering_name", {});
        await send(phone,
          `👋 Hi! Welcome to *iSabi* — Nigeria's home repair marketplace.\n\n` +
          `I connect you with verified, trusted artisans for any repair job.\n\n` +
          `Let's get you set up in 2 quick steps.\n\n` +
          `What is your full name?`
        );
        return;
      }

      // Returning user — show menu
      await setSession(db, phone, "idle", {});
      await send(phone, `Hi ${profile.name as string}! 👋\n\n` + MENU);
      return;
    }

    // ── Global: artisan ACCEPT / DECLINE ────────────────────────────────────
    const acceptMatch  = msg.match(/^accept\s+([a-f0-9-]{36})/i);
    const declineMatch = msg.match(/^decline\s+([a-f0-9-]{36})/i);
    if (acceptMatch || declineMatch) {
      const bookingId = (acceptMatch ?? declineMatch)![1];
      await handleArtisanResponse(phone, bookingId, acceptMatch ? "accept" : "decline", send, db);
      return;
    }

    // ── Global: artisan marks job DONE ──────────────────────────────────────
    const doneMatch = msg.match(/^done\s+([a-f0-9-]{36})/i);
    if (doneMatch) {
      await handleJobDone(phone, doneMatch[1], send, db);
      return;
    }

    // ── Global: rating reply (1-5) — works in awaiting_rating state ─────────
    if (state === "awaiting_rating") {
      const stars = parseInt(msg);
      if (stars >= 1 && stars <= 5) {
        await saveRating(phone, stars, ctx, send, db);
        return;
      }
      await send(phone, "Please reply with a number from 1 to 5 ⭐");
      return;
    }

    switch (state) {

      // ── Idle / done ─────────────────────────────────────────────────────────
      case "idle":
      case "done": {

        if (["1", "fix"].includes(lower) && !imageBase64) {
          const { data: profile } = await db
            .from("bot_customers").select("id, name, location").eq("phone", phone).single();
          if (!profile) {
            // Store that this came from "fix" so we resume after registration
            await setSession(db, phone, "registering_name", { pendingFix: true });
            await send(phone, "Hi! Welcome to iSabi 👋\n\nI help you find trusted artisans for home repairs in Nigeria.\n\nFirst, what is your full name?");
            break;
          }
          await send(phone, "What's the issue? You can *describe it in text* or *send a photo* 📸");
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

        if (lower === "update location" || lower.startsWith("update location ") || lower.startsWith("update location to ")) {
          const inline = msg.replace(/^update location (to )?/i, "").trim();
          if (inline) {
            await db.from("bot_customers").update({ location: inline }).eq("phone", phone);
            await setSession(db, phone, "idle", {});
            await send(phone, `✅ Location updated to *${inline}*.\n\n` + MENU);
          } else {
            await setSession(db, phone, "updating_location", {});
            await send(phone, "What is your new area? (e.g. \"Yaba, Lagos\")");
          }
          break;
        }

        const { data: profile } = await db
          .from("bot_customers").select("id, name, location").eq("phone", phone).single();

        if (!profile) {
          await setSession(db, phone, "registering_name", { firstMessage: msg });
          await send(phone,
            "Hi! Welcome to iSabi 👋\n\n" +
            "I help you find trusted artisans for home repairs in Nigeria.\n\n" +
            "First, what is your full name?"
          );
          break;
        }

        // Existing user — go straight to follow-up or diagnosis
        await startIssueFlow(phone, msg, imageBase64, profile.id as string, profile.name as string, profile.location as string, send, db);
        break;
      }

      // ── Awaiting issue after "fix" command ──────────────────────────────────
      case "awaiting_issue": {
        await startIssueFlow(phone, msg, imageBase64, ctx.userId as string, ctx.userName as string, ctx.location as string, send, db);
        break;
      }

      // ── Awaiting follow-up answer ───────────────────────────────────────────
      case "awaiting_followup": {
        const fullDesc = `${ctx.description as string}\n\nFollow-up: ${msg}`;
        await setSession(db, phone, "diagnosing", { ...ctx, description: fullDesc });
        await runDiagnosis(
          phone, fullDesc,
          ctx.imageBase64 as string | null,
          ctx.userId   as string,
          ctx.userName as string,
          ctx.location as string,
          send, db
        );
        break;
      }

      // ── Stuck in diagnosing (server restart mid-AI call) ────────────────────
      case "diagnosing": {
        if (ctx.userId && ctx.location) {
          await send(phone, "Re-analysing... ⏳");
          await runDiagnosis(
            phone,
            (ctx.description as string | undefined) ?? msg,
            ctx.imageBase64 as string | null ?? null,
            ctx.userId   as string,
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
          .from("bot_customers")
          .insert({ phone, name, location })
          .select("id")
          .single();

        const userId       = newUser?.id as string;
        const firstMessage = ctx.firstMessage as string | undefined;
        const pendingFix   = ctx.pendingFix   as boolean | undefined;
        const claimPhone   = (phone.startsWith("whatsapp:") ? phone.slice(9) : phone).replace("+", "");

        await send(phone,
          `You're all set, ${name}! 🎉\n\n` +
          `Your area is saved as *${location}* — I'll always search there first.\n\n` +
          `💡 *Track jobs online:* ${APP_URL}/claim?phone=${claimPhone}\n\n` +
          MENU
        );

        if (pendingFix) {
          // User came from "Fix" command — continue straight to issue description
          await setSession(db, phone, "awaiting_issue", { userId, userName: name, location });
          await send(phone, "Now, what's the issue? Describe it in text or send a photo 📸");
        } else if (firstMessage && firstMessage.length > 3) {
          await startIssueFlow(phone, firstMessage, null, userId, name, location, send, db);
        } else {
          await setSession(db, phone, "idle", {});
        }
        break;
      }

      // ── Update saved location ───────────────────────────────────────────────
      case "updating_location": {
        await db.from("bot_customers").update({ location: msg }).eq("phone", phone);
        await setSession(db, phone, "idle", {});
        await send(phone, `✅ Location updated to *${msg}*.\n\n` + MENU);
        break;
      }

      // ── Artisan registration ────────────────────────────────────────────────
      case "artisan_reg_name": {
        await setSession(db, phone, "artisan_reg_category", { ...ctx, name: msg });
        await send(phone, `Thanks, ${msg}!\n\nWhat is your service category? Reply with the number:\n\n${CATEGORY_LIST}`);
        break;
      }

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

      case "artisan_reg_location": {
        await setSession(db, phone, "artisan_reg_experience", { ...ctx, location: msg });
        await send(phone, "How many years of experience do you have? (e.g. 5)");
        break;
      }

      case "artisan_reg_experience": {
        const years = parseInt(msg);
        if (isNaN(years) || years < 0 || years > 60) {
          await send(phone, "Please reply with a number between 0 and 60.");
          break;
        }
        await setSession(db, phone, "artisan_reg_id", { ...ctx, years });
        await send(phone, "Last step! Share your NIN, trade association ID, or any verification reference.\n\n(Text is fine — our team will review it.)");
        break;
      }

      case "artisan_reg_id": {
        const name     = ctx.name     as string;
        const category = ctx.category as ArtisanCategory;
        const location = ctx.location as string;
        const years    = ctx.years    as number;

        await db.from("artisans").insert({
          full_name: name, phone, category, location,
          years_experience: years, verification_id: msg,
          skills: [], service_radius_km: 10, trust_score: 50,
          application_status: "pending", is_verified: false,
          emergency_available: false, service_areas: [],
        });

        await setSession(db, phone, "done", {});
        await send(phone,
          `✅ Application submitted, ${name}!\n\n` +
          `Category: ${category}\nArea: ${location}\nExperience: ${years} yr(s)\n\n` +
          `Our team will review within 24–48 hours.\n` +
          `Check status: ${APP_URL}/artisan/dashboard\n\n` +
          `Once approved, when a booking is assigned reply:\n` +
          `*ACCEPT [bookingId]* or *DECLINE [bookingId]*\n` +
          `When job is done: *DONE [bookingId]*`
        );
        break;
      }

      // ── Selecting artisan ───────────────────────────────────────────────────
      case "selecting_artisan": {
        if (lower === "none" || lower === "search again") {
          await setSession(db, phone, "change_location", ctx);
          await send(phone, "Enter a different area to search (e.g. \"Lagos Island\"), or reply *cancel* to go back to the menu.");
          break;
        }

        const idx         = parseInt(msg) - 1;
        const artisanList = ctx.artisans as Array<{ id: string; full_name: string }> | undefined;

        if (!artisanList || isNaN(idx) || idx < 0 || idx >= artisanList.length) {
          await send(phone, `Please reply with a number between 1 and ${artisanList?.length ?? 3}, or *none* to search a different area.`);
          break;
        }

        const artisan = artisanList[idx];
        await setSession(db, phone, "awaiting_confirm", { ...ctx, selectedArtisan: artisan });
        await send(phone, `You selected *${artisan.full_name}*.\n\nReply *yes* to confirm the booking, or *no* to choose another.`);
        break;
      }

      // ── Change search location ──────────────────────────────────────────────
      case "change_location": {
        if (lower === "cancel") {
          await setSession(db, phone, "idle", {});
          await send(phone, MENU);
          break;
        }
        const { data: artisans } = await db.rpc("match_artisans", {
          p_category: ctx.category,
          p_location: msg,
          p_limit:    3,
        });

        if (!artisans?.length) {
          await send(phone,
            `❌ No ${ctx.category as string} artisans found near *${msg}* yet.\n\n` +
            `Try a broader area or reply *cancel* to go back to the menu.`
          );
          break;
        }

        await setSession(db, phone, "selecting_artisan", { ...ctx, location: msg, artisans });
        await send(phone, formatArtisanList(artisans, msg));
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
          await send(phone, 'Reply *yes* to confirm or *no* to choose another artisan.');
          break;
        }

        await createBooking(phone, ctx, send, db);
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

// ── Start issue flow: follow-up question or direct diagnosis ──────────────────

async function startIssueFlow(
  phone:       string,
  description: string,
  imageBase64: string | null,
  userId:      string,
  userName:    string,
  location:    string,
  send:        BotSend,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:          any
) {
  // If photo was sent with no/little text, skip follow-up and diagnose directly
  if (imageBase64 && description.length < 10) {
    await send(phone, "📸 Photo received! Analysing your issue with iSabi AI... ⏳");
    await setSession(db, phone, "diagnosing", { description, imageBase64, userId, userName, location });
    await runDiagnosis(phone, description || "See photo", imageBase64, userId, userName, location, send, db);
    return;
  }

  // Ask one clarifying question (skip if no GROQ key or question is null)
  const question = await getFollowUpQuestion(description);

  if (question) {
    await setSession(db, phone, "awaiting_followup", { description, imageBase64, userId, userName, location });
    await send(phone, `🤔 Quick question before I diagnose:\n\n${question}`);
    return;
  }

  // No follow-up needed — diagnose immediately
  await setSession(db, phone, "diagnosing", { description, imageBase64, userId, userName, location });
  await runDiagnosis(phone, description, imageBase64, userId, userName, location, send, db);
}

// ── Run AI diagnosis ──────────────────────────────────────────────────────────

async function runDiagnosis(
  phone:       string,
  description: string,
  imageBase64: string | null,
  userId:      string,
  userName:    string,
  location:    string,
  send:        BotSend,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:          any
) {
  await setSession(db, phone, "diagnosing", { description, imageBase64, userId, userName, location });
  if (!imageBase64) await send(phone, "Analysing your issue with iSabi AI... ⏳ (a few seconds)");

  const diagnosis = await diagnoseIssue(description, imageBase64);

  // Save to memory (last 3 issues)
  await saveToMemory(db, phone, { description, category: diagnosis.artisan_category, diagnosis });

  const urgencyLine = diagnosis.urgency === "High" ? "⚠️ *Urgent issue!*\n\n" : "";
  const warning     = diagnosis.safety_warning ? `\n\n⚠️ *Safety:* ${diagnosis.safety_warning}` : "";
  const costLine    = "💰 *Cost depends on what the artisan finds on-site.* You'll get a quote before any work begins.\n";

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
    // Save an alert so we notify the user when an artisan becomes available
    await db.from("artisan_alerts").insert({
      phone,
      category: diagnosis.artisan_category,
      location,
    });

    await setSession(db, phone, "change_location", {
      description, imageBase64, userId, userName, location,
      diagnosis, category: diagnosis.artisan_category,
    });
    await send(phone,
      diagMsg +
      `\n❌ No *${diagnosis.artisan_category}* artisans found near *${location}* yet.\n\n` +
      `We'll notify you on WhatsApp within *72 hours* if one becomes available in your area.\n\n` +
      `Or reply with a different area to search (e.g. "Lagos Island"), or *cancel* to go back to the menu.`
    );
    return;
  }

  await setSession(db, phone, "selecting_artisan", {
    description, imageBase64, userId, userName, location,
    diagnosis, category: diagnosis.artisan_category, artisans,
  });

  await send(phone, diagMsg + "\n" + formatArtisanList(artisans, location));
}

// ── Create booking ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createBooking(phone: string, ctx: Record<string, unknown>, send: BotSend, db: any) {
  const artisan     = ctx.selectedArtisan as { id: string; full_name: string };
  const location    = ctx.location        as string;
  const description = ctx.description     as string;
  const userId      = ctx.userId          as string;
  const diag        = ctx.diagnosis       as Record<string, unknown>;

  await send(phone, "Creating your booking... ⏳");

  const { data: job, error: jobErr } = await db
    .from("job_requests")
    .insert({ user_id: userId, description, location, image_provided: !!(ctx.imageBase64), status: "diagnosed" })
    .select().single();

  if (jobErr || !job) {
    await send(phone, "Sorry, couldn't create the booking. Please try via the app: " + APP_URL);
    return;
  }

  const { data: diagRecord } = await db
    .from("diagnoses")
    .insert({
      job_id: job.id, user_id: userId,
      issue_title:               diag.issue_title               ?? "Home repair",
      summary:                   diag.summary                   ?? "",
      artisan_category:          diag.artisan_category          ?? ctx.category,
      urgency:                   diag.urgency                   ?? "Medium",
      estimated_min_naira:       diag.estimated_min_naira       ?? 0,
      estimated_max_naira:       diag.estimated_max_naira       ?? 0,
      estimated_labor_naira:     diag.estimated_labor_naira     ?? 0,
      estimated_materials_naira: diag.estimated_materials_naira ?? 0,
      safety_warning:            diag.safety_warning            ?? null,
      first_aid_steps:           diag.first_aid_steps           ?? [],
      follow_up_questions:       diag.follow_up_questions       ?? [],
      artisan_brief:             diag.artisan_brief             ?? null,
      language:                  diag.language                  ?? "English",
    })
    .select().single();

  if (diagRecord) {
    await db.from("job_requests").update({ diagnosis_id: diagRecord.id }).eq("id", job.id);
  }

  const quoteMin    = Number(diag.estimated_min_naira ?? 0);
  const quoteMax    = Number(diag.estimated_max_naira ?? 0);
  const quoteAmount = quoteMax > 0 ? quoteMax : 0;
  const userFee     = quoteAmount > 0 ? Math.round(quoteAmount * USER_FEE_PCT)    : 0;
  const artisanFee  = quoteAmount > 0 ? Math.round(quoteAmount * ARTISAN_FEE_PCT) : 0;
  const totalCharge = quoteAmount + userFee;

  const { data: booking, error: bookErr } = await db
    .from("bookings")
    .insert({
      job_id: job.id, user_id: userId, artisan_id: artisan.id,
      quote_amount: quoteAmount, user_fee: userFee, artisan_fee: artisanFee,
      total_charge: totalCharge, escrow_status: "not_funded",
    })
    .select().single();

  if (bookErr || !booking) {
    await send(phone, "Booking logged but couldn't finalise. Continue at: " + APP_URL + "/dashboard");
    return;
  }

  await db.from("job_requests")
    .update({ selected_artisan_id: artisan.id, booking_id: booking.id, status: "booking_created" })
    .eq("id", job.id);

  await notifyArtisanOfJob({
    artisanId: artisan.id, bookingId: booking.id,
    description, location, quoteMin, quoteMax,
  }, db);

  const payLink = await generatePaymentLink(booking.id, totalCharge, phone, db);

  await setSession(db, phone, "done", {});

  const costLine = "The artisan will provide a quote on-site before any work begins.\n";

  const payMsg = payLink
    ? `\nPay securely: ${payLink}`
    : `\nPay at: ${APP_URL}/booking?bookingId=${booking.id}`;

  await send(phone,
    `✅ Booked! *${artisan.full_name}* has been notified.\n\n` +
    costLine + payMsg +
    `\n\nTrack your job: ${APP_URL}/dashboard\n` +
    `Reply *menu* for a new request.`
  );
}

// ── Artisan ACCEPT / DECLINE ──────────────────────────────────────────────────

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
    .select("id, job_id, artisan_id, escrow_status, job_requests(description, location, user_id)")
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
      note: "Artisan accepted via WhatsApp",
    });

    await send(artisanPhone,
      `✅ Job accepted!\n\n` +
      `Job: ${booking.job_requests?.description ?? "Home repair"}\n` +
      `Location: ${booking.job_requests?.location ?? ""}\n\n` +
      `Coordinate with the customer via the app:\n${APP_URL}/artisan/dashboard\n\n` +
      `When you finish, send: *DONE ${bookingId}*`
    );

    await notifyCustomer(booking.job_id,
      `✅ *${artisan.full_name as string}* has accepted your job and will be in touch shortly.\n\nTrack at: ${APP_URL}/dashboard`,
      db
    );

  } else {
    // Decline → find next best artisan automatically
    await db.from("bookings").update({ escrow_status: "not_funded" }).eq("id", bookingId);
    await db.from("job_requests").update({ status: "diagnosed" }).eq("id", booking.job_id);

    await send(artisanPhone, "You've declined the job. No further action needed.");

    // Try to find the next artisan in the same area
    const { data: diagRow } = await db
      .from("diagnoses")
      .select("artisan_category")
      .eq("job_id", booking.job_id)
      .single();

    const location = booking.job_requests?.location ?? "";
    const category = diagRow?.artisan_category ?? "";

    if (category && location) {
      const { data: nextArtisans } = await db.rpc("match_artisans", {
        p_category: category,
        p_location: location,
        p_limit:    5,
      });

      // Exclude artisans who already declined this booking
      const { data: declinedRows } = await db
        .from("bookings")
        .select("artisan_id")
        .eq("job_id", booking.job_id);

      const excludedIds = new Set((declinedRows ?? []).map((r: { artisan_id: string }) => r.artisan_id));
      excludedIds.add(artisan.id as string);

      type ARow = { id: string; full_name: string };
      const next = (nextArtisans as ARow[] ?? []).find((a) => !excludedIds.has(a.id));

      if (next) {
        // Create a new booking for the next artisan
        const { data: oldBooking } = await db
          .from("bookings")
          .select("quote_amount, user_fee, artisan_fee, total_charge")
          .eq("id", bookingId)
          .single();

        const { data: newBooking } = await db
          .from("bookings")
          .insert({
            job_id:        booking.job_id,
            user_id:       booking.job_requests?.user_id,
            artisan_id:    next.id,
            quote_amount:  oldBooking?.quote_amount  ?? 0,
            user_fee:      oldBooking?.user_fee       ?? 0,
            artisan_fee:   oldBooking?.artisan_fee    ?? 0,
            total_charge:  oldBooking?.total_charge   ?? 0,
            escrow_status: "not_funded",
          })
          .select().single();

        if (newBooking) {
          await db.from("job_requests")
            .update({ selected_artisan_id: next.id, booking_id: newBooking.id, status: "booking_created" })
            .eq("id", booking.job_id);

          await notifyArtisanOfJob({
            artisanId:   next.id,
            bookingId:   newBooking.id,
            description: booking.job_requests?.description ?? "Home repair",
            location,
            quoteMin:    oldBooking?.quote_amount ?? 0,
            quoteMax:    oldBooking?.quote_amount ?? 0,
          }, db);

          await notifyCustomer(booking.job_id,
            `The previous artisan wasn't available. We've automatically assigned *${next.full_name}* to your job.\n\nTrack at: ${APP_URL}/dashboard`,
            db
          );
          return;
        }
      }
    }

    // No next artisan available
    await notifyCustomer(booking.job_id,
      `Your artisan wasn't available for this job. Visit ${APP_URL}/report to find another artisan.`, db
    );
  }
}

// ── Artisan marks job DONE → send rating request to customer ─────────────────

async function handleJobDone(
  artisanPhone: string,
  bookingId:    string,
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
    .select("id, job_id, artisan_id, job_requests(description, user_id)")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.artisan_id !== artisan.id) {
    await send(artisanPhone, "Booking not found or not assigned to you.");
    return;
  }

  // Mark job complete
  await db.from("job_requests").update({ status: "completed" }).eq("id", booking.job_id);
  await db.from("bookings").update({ escrow_status: "completed" }).eq("id", bookingId);

  await send(artisanPhone, `✅ Job marked as complete! Thank you, ${artisan.full_name as string}.\n\nYour payment will be processed shortly. Check: ${APP_URL}/artisan/dashboard`);

  // Get customer phone and send rating request
  const { data: customer } = await db
    .from("bot_customers")
    .select("phone, name")
    .eq("id", booking.job_requests?.user_id)
    .single();

  // Also check users table (web users)
  const customerPhone = customer?.phone ?? await getCustomerPhoneFromUsers(booking.job_requests?.user_id, db);

  if (customerPhone) {
    // Set customer session to awaiting_rating
    const dest = customerPhone.startsWith("whatsapp:") ? customerPhone : `whatsapp:${customerPhone}`;
    await db.from("whatsapp_sessions").upsert(
      { phone: dest, state: "awaiting_rating", context: { bookingId, artisanId: artisan.id, artisanName: artisan.full_name }, last_message_at: new Date().toISOString() },
      { onConflict: "phone" }
    );
    await sendWhatsApp(dest,
      `🎉 Your job is done!\n\n` +
      `*${artisan.full_name as string}* has marked it complete.\n\n` +
      `How would you rate the service?\n\nReply with a number:\n⭐ 1 – Poor\n⭐⭐ 2 – Below average\n⭐⭐⭐ 3 – Average\n⭐⭐⭐⭐ 4 – Good\n⭐⭐⭐⭐⭐ 5 – Excellent`
    );
  }
}

// ── Save rating from customer ─────────────────────────────────────────────────

async function saveRating(
  phone:  string,
  stars:  number,
  ctx:    Record<string, unknown>,
  send:   BotSend,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:     any
) {
  const bookingId  = ctx.bookingId  as string;
  const artisanId  = ctx.artisanId  as string;
  const artisanName = ctx.artisanName as string;

  // Look up userId from bot_customers or users
  const { data: botCustomer } = await db.from("bot_customers").select("id").eq("phone", phone).single();
  const userId = botCustomer?.id ?? null;

  if (bookingId && artisanId) {
    const { data: booking } = await db
      .from("bookings").select("job_id").eq("id", bookingId).single();

    if (booking) {
      await db.from("reviews").insert({
        job_id:     booking.job_id,
        artisan_id: artisanId,
        user_id:    userId,
        rating:     stars,
        comment:    `${stars} star rating via WhatsApp`,
      });

      // Update artisan average rating
      const { data: reviews } = await db
        .from("reviews").select("rating").eq("artisan_id", artisanId);
      if (reviews?.length) {
        const avg = reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length;
        await db.from("artisans").update({ rating: Math.round(avg * 10) / 10 }).eq("id", artisanId);
      }
    }
  }

  await setSession(db, phone, "done", {});

  const stars_str = "⭐".repeat(stars);
  await send(phone,
    `${stars_str} Thanks for rating *${artisanName}*!\n\n` +
    `Your feedback helps the iSabi community find trusted artisans.\n\n` +
    MENU
  );
}

// ── Conversation memory ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveToMemory(db: any, phone: string, issue: { description: string; category: string; diagnosis: unknown }) {
  const { data: session } = await db
    .from("whatsapp_sessions").select("context").eq("phone", phone).single();

  const ctx = (session?.context ?? {}) as Record<string, unknown>;
  const prev = (ctx.previousIssues ?? []) as Array<{ description: string; category: string; date: string }>;

  const updated = [
    { description: issue.description.slice(0, 120), category: issue.category, date: new Date().toISOString() },
    ...prev,
  ].slice(0, 3); // keep last 3

  await db.from("whatsapp_sessions")
    .update({ context: { ...ctx, previousIssues: updated } })
    .eq("phone", phone);
}

// ── Status check ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleStatus(phone: string, send: BotSend, db: any) {
  const { data: user } = await db.from("bot_customers").select("id, name").eq("phone", phone).single();
  if (!user) {
    await send(phone, "You don't have an account yet. Reply *1* or *fix* to get started.");
    return;
  }

  // Show memory of recent issues
  const { data: session } = await db
    .from("whatsapp_sessions").select("context").eq("phone", phone).single();
  const prev = ((session?.context as Record<string, unknown>)?.previousIssues ?? []) as Array<{ description: string; category: string; date: string }>;

  const { data: bookings } = await db
    .from("bookings")
    .select("id, escrow_status, artisans(full_name), job_requests(description, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  let reply = `Hi ${user.name as string}!\n\n`;

  if (bookings?.length) {
    type B = { id: string; escrow_status: string; artisans: { full_name: string } | null; job_requests: { description: string; status: string } | null };
    reply += `*Active bookings:*\n`;
    reply += (bookings as B[]).map((b, i) =>
      `${i + 1}. ${b.artisans?.full_name ?? "Artisan"} — ${(b.job_requests?.description ?? "").slice(0, 40)}…\n   Status: ${b.job_requests?.status ?? b.escrow_status}`
    ).join("\n\n");
    reply += `\n\nFull details: ${APP_URL}/dashboard\n\n`;
  } else {
    reply += "No active bookings.\n\n";
  }

  if (prev.length) {
    reply += `*Past issues (${prev.length}):*\n`;
    reply += prev.map((p, i) => `${i + 1}. ${p.category} — ${p.description.slice(0, 50)}…`).join("\n");
    reply += "\n\nReply *fix* to raise a new issue.";
  } else {
    reply += "Reply *1* or *fix* to raise a new issue.";
  }

  await send(phone, reply);
}

// ── Public: notify artisan of new job (called from web booking flow too) ──────

export async function notifyArtisanOfJob(params: {
  artisanId:    string;
  bookingId:    string;
  description:  string;
  location:     string;
  quoteMin?:    number;
  quoteMax?:    number;
  quoteAmount?: number;
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
    : "Pay to be quoted after assessment.\n";

  await sendWhatsApp(artisan.phone as string,
    `🔔 *New job request!*\n\n` +
    `Issue: ${params.description}\n` +
    `Location: ${params.location}\n` +
    payLine +
    `\nReply:\n*ACCEPT ${params.bookingId}*\nor\n*DECLINE ${params.bookingId}*`
  );
}

// ── Private helpers ───────────────────────────────────────────────────────────

type ARow = { full_name: string; trust_score: number; rating?: number; is_verified: boolean };

function formatArtisanList(artisans: ARow[], location: string): string {
  const list = artisans.map((a, i) => {
    const tag    = a.is_verified ? " ✓" : " (unverified)";
    const rating = a.rating ? `, ${a.rating}★` : "";
    return `${i + 1}. *${a.full_name}*${tag} — Trust: ${a.trust_score}%${rating}`;
  }).join("\n");

  return `Artisans near *${location}*:\n\n${list}\n\nReply *1*, *2*, or *3* to select — or *none* to search a different area.`;
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
  } catch { /* non-critical */ }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyCustomer(jobId: string, message: string, db: any) {
  const { data: job } = await db.from("job_requests").select("user_id").eq("id", jobId).single();
  if (!job) return;

  const customerPhone = await getCustomerPhoneFromBotCustomers(job.user_id, db)
    ?? await getCustomerPhoneFromUsers(job.user_id, db);

  if (customerPhone) await sendWhatsApp(customerPhone, message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCustomerPhoneFromBotCustomers(userId: string, db: any): Promise<string | null> {
  const { data } = await db.from("bot_customers").select("phone").eq("id", userId).single();
  return (data?.phone as string) ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCustomerPhoneFromUsers(userId: string, db: any): Promise<string | null> {
  const { data } = await db.from("users").select("phone").eq("id", userId).single();
  return (data?.phone as string) ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setSession(db: any, phone: string, state: string, context: Record<string, unknown>) {
  await db.from("whatsapp_sessions").update({ state, context }).eq("phone", phone);
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  const metaToken   = process.env.META_WA_TOKEN;
  const metaPhoneId = process.env.META_PHONE_NUMBER_ID;

  if (metaToken && metaPhoneId) {
    const dest = to.replace(/^whatsapp:\+?/, "").replace(/^\+/, "");
    const res  = await fetch(
      `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
      {
        method:  "POST",
        headers: { Authorization: `Bearer ${metaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type:    "individual",
          to:                dest,
          type:              "text",
          text:              { body: message },
        }),
      }
    );
    if (!res.ok) console.error("Meta sendWhatsApp error:", await res.text());
    return;
  }

  // Fallback: Twilio
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
