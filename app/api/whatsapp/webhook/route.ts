/**
 * WhatsApp Business API webhook
 *
 * Two modes:
 * - GET  → verification challenge from Meta (one-time setup)
 * - POST → inbound message events
 *
 * Set these env vars:
 *   WHATSAPP_VERIFY_TOKEN   – random secret you pick during Meta app setup
 *   WHATSAPP_ACCESS_TOKEN   – Meta permanent access token
 *   WHATSAPP_PHONE_NUMBER_ID – your WhatsApp Business phone number ID
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { diagnoseIssue } from "@/app/actions";

const VERIFY_TOKEN      = process.env.WHATSAPP_VERIFY_TOKEN!;
const ACCESS_TOKEN      = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID!;

// ── Verification handshake ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── Message handler ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json() as WhatsAppPayload;
  const entry = body.entry?.[0]?.changes?.[0]?.value;
  if (!entry?.messages?.length) return NextResponse.json({ ok: true });

  const message = entry.messages[0];
  const from    = message.from; // phone number in E.164 format

  if (message.type !== "text") {
    await sendMessage(from, "Hi! Please send a text message describing your home repair issue and I'll help you find an artisan. 🔧");
    return NextResponse.json({ ok: true });
  }

  const text = message.text.body.trim();
  const service = createServiceClient();

  // Load or create session
  let { data: session } = await service
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone", from)
    .single();

  if (!session) {
    const { data: newSession } = await service
      .from("whatsapp_sessions")
      .insert({ phone: from, state: "idle", context: {} })
      .select()
      .single();
    session = newSession!;
  }

  // Update last seen
  await service
    .from("whatsapp_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("phone", from);

  const state   = session.state as string;
  const context = session.context as Record<string, unknown>;

  // ── State machine ─────────────────────────────────────────────
  try {
    switch (state) {

      case "idle":
      case "done": {
        // First message — treat as issue description
        await setSession(service, from, "diagnosing", { description: text });
        await sendMessage(from, "Got it! Let me analyse your issue... ⏳");

        const diagnosis = await diagnoseIssue(text, null);
        const ctx = {
          description: text,
          diagnosis,
          category: diagnosis.artisan_category,
        };
        await setSession(service, from, "awaiting_location", ctx);

        const costRange = `₦${diagnosis.estimated_min_naira.toLocaleString()} – ₦${diagnosis.estimated_max_naira.toLocaleString()}`;
        const urgencyLine = diagnosis.urgency === "High" ? "⚠️ *This is urgent!*\n" : "";

        await sendMessage(from,
          `${urgencyLine}*${diagnosis.issue_title}*\n\n${diagnosis.summary}\n\nEstimated cost: ${costRange}\nArtisan needed: ${diagnosis.artisan_category}\n\nWhat area are you in? (e.g. "Yaba, Lagos")`
        );
        break;
      }

      case "awaiting_location": {
        const location = text;
        await setSession(service, from, "selecting_artisan", { ...context, location });

        // Find artisans
        const { data: artisans } = await service
          .rpc("match_artisans", {
            p_category: context.category,
            p_location: location,
            p_limit: 3,
          });

        if (!artisans?.length) {
          await sendMessage(from, `Sorry, no ${context.category} artisans found near ${location} right now. Try a broader area or reply with a different location.`);
          break;
        }

        await setSession(service, from, "selecting_artisan", { ...context, location, artisans });

        const list = (artisans as Array<{ full_name: string; trust_score: number; rating?: number; is_verified: boolean }>)
          .map((a, i) => `${i + 1}. *${a.full_name}* ${a.is_verified ? "✓" : ""} — Trust: ${a.trust_score}${a.rating ? `, Rating: ${a.rating}★` : ""}`)
          .join("\n");

        await sendMessage(from, `I found these artisans near ${location}:\n\n${list}\n\nReply *1*, *2*, or *3* to select one, or type *none* to search again.`);
        break;
      }

      case "selecting_artisan": {
        if (text.toLowerCase() === "none") {
          await setSession(service, from, "awaiting_location", { ...context, artisans: undefined });
          await sendMessage(from, "What area should I search? (e.g. 'Ikeja, Lagos')");
          break;
        }

        const idx = parseInt(text) - 1;
        const artisanList = context.artisans as Array<{ id: string; full_name: string }> | undefined;

        if (!artisanList || isNaN(idx) || idx < 0 || idx >= artisanList.length) {
          await sendMessage(from, `Please reply with a number between 1 and ${artisanList?.length ?? 3}, or type *none* to search again.`);
          break;
        }

        const artisan = artisanList[idx];
        await setSession(service, from, "awaiting_confirm", { ...context, selectedArtisan: artisan });
        await sendMessage(from,
          `You selected *${artisan.full_name}*.\n\nReply *yes* to book them, or *no* to choose again.`
        );
        break;
      }

      case "awaiting_confirm": {
        if (text.toLowerCase() === "no") {
          await setSession(service, from, "selecting_artisan", { ...context, selectedArtisan: undefined });
          const artisanList = context.artisans as Array<{ full_name: string; is_verified: boolean; trust_score: number; rating?: number }>;
          const list = artisanList
            .map((a, i) => `${i + 1}. *${a.full_name}* ${a.is_verified ? "✓" : ""} — Trust: ${a.trust_score}`)
            .join("\n");
          await sendMessage(from, `Choose an artisan:\n\n${list}`);
          break;
        }

        if (text.toLowerCase() !== "yes") {
          await sendMessage(from, "Reply *yes* to confirm or *no* to go back.");
          break;
        }

        await setSession(service, from, "done", {});
        const artisan = context.selectedArtisan as { full_name: string };
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://handijob.ng";

        await sendMessage(from,
          `✅ Great! Your job has been logged and *${artisan.full_name}* will be notified.\n\nTrack your job and pay securely at:\n${appUrl}/dashboard\n\nType anything to report a new issue.`
        );
        break;
      }

      default: {
        await setSession(service, from, "idle", {});
        await sendMessage(from, "Hi! Describe your home repair issue and I'll find you an artisan. 🔧");
      }
    }
  } catch (err) {
    console.error("WhatsApp handler error:", err);
    await sendMessage(from, "Sorry, something went wrong. Please try again or visit handijob.ng");
  }

  return NextResponse.json({ ok: true });
}

// ── Helpers ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setSession(service: any, phone: string, state: string, context: Record<string, unknown>) {
  await service
    .from("whatsapp_sessions")
    .update({ state, context })
    .eq("phone", phone);
}

async function sendMessage(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

// ── Types ──────────────────────────────────────────────────────

interface WhatsAppPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          type: string;
          text: { body: string };
        }>;
      };
    }>;
  }>;
}
