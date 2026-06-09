/**
 * WhatsApp Cloud API webhook (Meta Graph API v21.0)
 *
 * Required env vars:
 *   WHATSAPP_VERIFY_TOKEN   – random secret set in Meta App Dashboard
 *   WHATSAPP_TOKEN          – permanent access token (used by lib/whatsapp.ts)
 *   WHATSAPP_PHONE_NUMBER_ID – numeric phone number ID (used by lib/whatsapp.ts)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { diagnoseIssue } from "@/app/actions";
import { sendText, sendButtons, sendList, downloadMedia } from "@/lib/whatsapp";

// ── GET: Meta verification handshake ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "ok", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST: Incoming message handler ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as WhatsAppWebhookPayload;

    // Extract the message from the nested Meta webhook envelope
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const msg   = value?.messages?.[0];

    // Status updates and other non-message events — ack and return
    if (!msg) return NextResponse.json({ ok: true });

    const phone = msg.from; // e.g. "2348012345678"

    // Run the state machine — all errors are caught so Meta never retries
    await handleMessage(phone, msg);
  } catch (err) {
    console.error("[whatsapp/webhook] top-level error:", err);
  }

  // Always 200 — Meta retries on anything else
  return NextResponse.json({ ok: true });
}

// ── State machine entry point ─────────────────────────────────────────────────

async function handleMessage(phone: string, msg: WaMessage) {
  const service = createServiceClient();

  // ── 1. Load or create session ─────────────────────────────────────
  const { data: existing } = await service
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone", phone)
    .single();

  type SessionRow = { phone: string; step: string; context: SessionContext };

  let session: SessionRow;
  if (!existing) {
    const { data: created } = await service
      .from("whatsapp_sessions")
      .insert({ phone, step: "idle", context: {} })
      .select()
      .single();
    session = (created ?? { phone, step: "idle", context: {} }) as SessionRow;
  } else {
    session = existing as SessionRow;
  }

  const step    = session.step as Step;
  const context = (session.context ?? {}) as SessionContext;

  // ── 2. Ensure a Supabase user exists for this phone ───────────────
  const normalised = phone.startsWith("+") ? phone : `+${phone}`;
  let userId: string | undefined = context.userId as string | undefined;

  if (!userId) {
    try {
      // Scan existing users for this phone number
      const { data: listData } = await service.auth.admin.listUsers();
      const matched = listData?.users?.find(
        (u) => u.phone === normalised
      );

      if (matched) {
        userId = matched.id;
      } else {
        const digits = normalised.replace(/\D/g, "");
        const { data: created } = await service.auth.admin.createUser({
          phone:         normalised,
          phone_confirm: true,
          email:         `p${digits}@isabi.ng`,
          email_confirm: true,
        });
        userId = created?.user?.id;
      }
    } catch (err) {
      console.error("[whatsapp] user lookup/create error:", err);
    }
    context.userId = userId;
  }

  // ── 3. Dispatch to step handler ───────────────────────────────────
  try {
    switch (step) {
      case "idle":
        await handleIdle(service, phone, context);
        break;
      case "intake":
        await handleIntake(service, phone, msg, context);
        break;
      case "confirming":
        await handleConfirming(service, phone, msg, context);
        break;
      case "awaiting_location":
        await handleAwaitingLocation(service, phone, msg, context);
        break;
      case "selecting":
        await handleSelecting(service, phone, msg, context, userId);
        break;
      case "awaiting_payment":
        await handleAwaitingPayment(phone, context);
        break;
      case "active":
        await handleActive(phone, context);
        break;
      default:
        // Unknown step — restart
        await handleIdle(service, phone, context);
    }
  } catch (err) {
    console.error(`[whatsapp] step=${step} error:`, err);
    await sendText(phone, "Sorry, something went wrong. Please try again.");
  }
}

// ── Step handlers ─────────────────────────────────────────────────────────────

/** idle — any message triggers the greeting */
async function handleIdle(
  service: ReturnType<typeof createServiceClient>,
  phone: string,
  context: SessionContext
) {
  await upsertSession(service, phone, "intake", context);
  await sendText(
    phone,
    "👋 Hi! I'm iSabi. Tell me what needs fixing at home — describe the problem and send a photo if you have one."
  );
}

/** intake — accept text (description) or image */
async function handleIntake(
  service: ReturnType<typeof createServiceClient>,
  phone: string,
  msg: WaMessage,
  context: SessionContext
) {
  if (msg.type === "image" && msg.image?.id) {
    // Download the media and upload to Supabase Storage
    try {
      const buffer    = await downloadMedia(msg.image.id);
      const timestamp = Date.now();
      const path      = `wa/${phone}/${timestamp}.jpg`;

      const { data: uploadData, error: uploadErr } = await service.storage
        .from("chat-images")
        .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

      if (uploadErr) {
        console.error("[whatsapp] storage upload error:", uploadErr);
      } else {
        const { data: urlData } = service.storage
          .from("chat-images")
          .getPublicUrl(uploadData.path);

        context.imageUrls = [urlData.publicUrl];
        await upsertSession(service, phone, "intake", context);
      }
    } catch (err) {
      console.error("[whatsapp] image download error:", err);
    }

    await sendText(phone, "📸 Got your photo! Now describe the problem in a few words.");
    return;
  }

  if (msg.type === "text" && msg.text?.body) {
    context.description = msg.text.body;

    // Run AI diagnosis
    const imageUrl = Array.isArray(context.imageUrls) ? (context.imageUrls as string[])[0] : undefined;
    const diagnosis = await diagnoseIssue(
      context.description as string,
      imageUrl ?? null,
      "English"
    );

    // Persist the diagnosis in DB so we have an id to reference
    const { data: diagRow } = await service
      .from("diagnoses")
      .insert({
        // job_id is not yet known — we'll have a null job_id until booking
        user_id:                   context.userId ?? null,
        issue_title:               diagnosis.issue_title,
        summary:                   diagnosis.summary,
        artisan_category:          diagnosis.artisan_category,
        urgency:                   diagnosis.urgency,
        estimated_min_naira:       diagnosis.estimated_min_naira,
        estimated_max_naira:       diagnosis.estimated_max_naira,
        estimated_labor_naira:     diagnosis.estimated_labor_naira,
        estimated_materials_naira: diagnosis.estimated_materials_naira,
        safety_warning:            diagnosis.safety_warning ?? null,
        first_aid_steps:           diagnosis.first_aid_steps,
        follow_up_questions:       diagnosis.follow_up_questions,
        artisan_brief:             diagnosis.artisan_brief ?? null,
        language:                  "English",
      })
      .select("id")
      .single();

    context.diagnosisId      = diagRow?.id;
    context.diagnosisData    = diagnosis as unknown as Record<string, unknown>;

    await upsertSession(service, phone, "confirming", context);

    // Build summary message
    const safetyLine = diagnosis.safety_warning
      ? `\n⚠️ ${diagnosis.safety_warning}`
      : "";

    const summary =
      `🔍 Here's what I found:\n\n` +
      `*${diagnosis.issue_title}*\n` +
      `${diagnosis.summary}\n\n` +
      `💰 Estimated cost: ₦${diagnosis.estimated_min_naira.toLocaleString()} – ₦${diagnosis.estimated_max_naira.toLocaleString()}\n` +
      `⚡ Urgency: ${diagnosis.urgency}` +
      safetyLine +
      `\n\nIs this correct?`;

    await sendButtons(phone, summary, [
      { id: "yes", title: "✅ Yes, find artisan" },
      { id: "no",  title: "✏️ Describe again"  },
    ]);
    return;
  }

  // Other message types — prompt for text
  await sendText(phone, "Please describe the issue in a few words. You can also send a photo.");
}

/** confirming — user taps Yes or No on the diagnosis */
async function handleConfirming(
  service: ReturnType<typeof createServiceClient>,
  phone: string,
  msg: WaMessage,
  context: SessionContext
) {
  const buttonId =
    msg.type === "interactive"
      ? (msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id)
      : undefined;

  // Treat a plain "yes"/"no" text as button tap for UX resilience
  const textLower = msg.type === "text" ? msg.text?.body?.toLowerCase().trim() : undefined;
  const confirmed = buttonId === "yes" || textLower === "yes";
  const denied    = buttonId === "no"  || textLower === "no";

  if (confirmed) {
    await upsertSession(service, phone, "awaiting_location", context);
    await sendText(
      phone,
      "📍 What's your location? Share your area (e.g. 'Lekki Phase 1') or tap the 📎 attachment icon and share your location pin."
    );
    return;
  }

  if (denied) {
    delete context.description;
    delete context.imageUrls;
    delete context.diagnosisId;
    delete context.diagnosisData;
    await upsertSession(service, phone, "intake", context);
    await sendText(phone, "No problem! Describe the issue again 👇");
    return;
  }

  // Any other message — re-prompt
  await sendButtons(
    phone,
    "Please confirm — is this the right diagnosis?",
    [
      { id: "yes", title: "✅ Yes, find artisan" },
      { id: "no",  title: "✏️ Describe again"  },
    ]
  );
}

/** awaiting_location — accept GPS pin or text area name */
async function handleAwaitingLocation(
  service: ReturnType<typeof createServiceClient>,
  phone: string,
  msg: WaMessage,
  context: SessionContext
) {
  if (msg.type === "location" && msg.location) {
    context.location = {
      lat:     msg.location.latitude,
      lng:     msg.location.longitude,
      name:    msg.location.name,
      address: msg.location.address,
    };
  } else if (msg.type === "text" && msg.text?.body) {
    context.location = { name: msg.text.body };
  } else {
    await sendText(
      phone,
      "📍 Please share your area name (e.g. 'Surulere') or tap the 📎 attachment icon to send your location pin."
    );
    return;
  }

  // Find artisans
  const diagData  = context.diagnosisData as Record<string, unknown> | undefined;
  const category  = diagData?.artisan_category as string | undefined;

  let query = service
    .from("artisans")
    .select("id, full_name, category, trust_score, rating")
    .eq("is_verified", true)
    .eq("application_status", "approved")
    .order("trust_score", { ascending: false })
    .limit(3);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: artisans, error: artisanErr } = await query;

  if (artisanErr) {
    console.error("[whatsapp] artisan query error:", artisanErr);
  }

  if (!artisans || artisans.length === 0) {
    await sendText(
      phone,
      "Sorry, I couldn't find verified artisans nearby right now. Please try again in a moment or describe a different issue."
    );
    return;
  }

  context.artisanOptions = artisans as unknown as Record<string, unknown>[];
  await upsertSession(service, phone, "selecting", context);

  await sendList(
    phone,
    "Here are the top artisans available for your job:",
    "Select Artisan",
    artisans.map((a) => ({
      id:          String(a.id),
      title:       String(a.full_name),
      description: `⭐ ${a.rating ?? "N/A"} · ${a.trust_score ?? 0}% trust · ${a.category}`,
    }))
  );
}

/** selecting — user picks an artisan from the list */
async function handleSelecting(
  service: ReturnType<typeof createServiceClient>,
  phone: string,
  msg: WaMessage,
  context: SessionContext,
  userId: string | undefined
) {
  const artisanId =
    msg.type === "interactive"
      ? (msg.interactive?.list_reply?.id ?? msg.interactive?.button_reply?.id)
      : undefined;

  if (!artisanId) {
    await sendText(phone, "Please select an artisan from the list above.");
    return;
  }

  context.selectedArtisanId = artisanId;

  const description   = (context.description as string | undefined) ?? "Home repair request";
  const diagData      = context.diagnosisData as Record<string, unknown> | undefined;
  const quoteAmount   = typeof diagData?.estimated_min_naira === "number"
    ? (diagData.estimated_min_naira as number)
    : 10000;

  const locationData  = context.location as { lat?: number; lng?: number; name?: string; address?: string } | undefined;
  const locationText  =
    locationData?.address ??
    locationData?.name ??
    (locationData?.lat !== undefined
      ? `${locationData.lat},${locationData.lng}`
      : "Location not specified");

  const imageProvided = Array.isArray(context.imageUrls) && (context.imageUrls as string[]).length > 0;

  const USER_FEE_PCT    = 0.02;
  const ARTISAN_FEE_PCT = 0.10;
  const userFee         = Math.round(quoteAmount * USER_FEE_PCT);
  const artisanFee      = Math.round(quoteAmount * ARTISAN_FEE_PCT);
  const totalCharge     = quoteAmount + userFee;

  // Create job request
  const { data: jobRow, error: jobErr } = await service
    .from("job_requests")
    .insert({
      user_id:        userId ?? null,
      description,
      location:       locationText,
      image_provided: imageProvided,
      status:         "matched",
    })
    .select("id")
    .single();

  if (jobErr) {
    console.error("[whatsapp] job_requests insert error:", jobErr);
    await sendText(phone, "Sorry, I couldn't create your job. Please try again.");
    return;
  }

  context.jobRequestId = jobRow.id;

  // Back-link the diagnosis to the job (if we have a diagnosisId)
  if (context.diagnosisId) {
    await service
      .from("diagnoses")
      .update({ job_id: jobRow.id })
      .eq("id", context.diagnosisId as string);

    await service
      .from("job_requests")
      .update({ diagnosis_id: context.diagnosisId as string })
      .eq("id", jobRow.id);
  }

  // Create booking
  const { data: bookingRow, error: bookingErr } = await service
    .from("bookings")
    .insert({
      job_id:        jobRow.id,
      user_id:       userId ?? null,
      artisan_id:    artisanId,
      quote_amount:  quoteAmount,
      user_fee:      userFee,
      artisan_fee:   artisanFee,
      total_charge:  totalCharge,
      escrow_status: "not_funded",
    })
    .select("id")
    .single();

  if (bookingErr) {
    console.error("[whatsapp] bookings insert error:", bookingErr);
    await sendText(phone, "Sorry, I couldn't create your booking. Please try again.");
    return;
  }

  context.bookingId = bookingRow.id;

  // Update job with booking + artisan references
  await service
    .from("job_requests")
    .update({
      selected_artisan_id: artisanId,
      booking_id:          bookingRow.id,
      status:              "booking_created",
    })
    .eq("id", jobRow.id);

  await upsertSession(service, phone, "awaiting_payment", context);

  await sendText(
    phone,
    `✅ Great choice! Your booking is ready.\n\n` +
    `💰 Tap below to pay securely — funds go into escrow and only release when you're satisfied:\n` +
    `https://isabi.ng/booking?bookingId=${bookingRow.id}\n\n` +
    `Reply *HELP* anytime to restart.`
  );
}

/** awaiting_payment — remind user to pay */
async function handleAwaitingPayment(phone: string, context: SessionContext) {
  const bookingId = context.bookingId as string | undefined;
  if (bookingId) {
    await sendText(
      phone,
      `💰 Your booking is waiting for payment. Tap to pay securely:\n` +
      `https://isabi.ng/booking?bookingId=${bookingId}\n\n` +
      `Reply *HELP* anytime to restart.`
    );
  } else {
    await sendText(phone, "💰 Your booking is awaiting payment. Please check your booking link or reply *HELP* to restart.");
  }
}

/** active — job in progress */
async function handleActive(phone: string, context: SessionContext) {
  const bookingId = context.bookingId as string | undefined;
  await sendText(
    phone,
    bookingId
      ? `Your job is active! Track it here: https://isabi.ng/booking?bookingId=${bookingId}`
      : "Your job is active! Open the iSabi app to track it."
  );
}

// ── Session persistence helper ────────────────────────────────────────────────

async function upsertSession(
  service: ReturnType<typeof createServiceClient>,
  phone: string,
  step: Step,
  context: SessionContext
) {
  const { error } = await service
    .from("whatsapp_sessions")
    .upsert(
      { phone, step, context, updated_at: new Date().toISOString() },
      { onConflict: "phone" }
    );

  if (error) {
    console.error("[whatsapp] session upsert error:", error);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Step =
  | "idle"
  | "intake"
  | "confirming"
  | "awaiting_location"
  | "selecting"
  | "awaiting_payment"
  | "active";

type SessionContext = Record<string, unknown>;

interface WaMessage {
  from:  string;
  type:  "text" | "image" | "interactive" | "location" | string;
  text?: { body: string };
  image?: { id: string; mime_type?: string };
  location?: {
    latitude:  number;
    longitude: number;
    name?:     string;
    address?:  string;
  };
  interactive?: {
    type:          string;
    button_reply?: { id: string; title: string };
    list_reply?:   { id: string; title: string; description?: string };
  };
}

interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messages?: WaMessage[];
        statuses?: unknown[];
        contacts?: unknown[];
      };
      field?: string;
    }>;
  }>;
}
