/**
 * WhatsApp webhook — powered by Termii
 *
 * Termii delivers inbound WhatsApp messages as a POST to this URL.
 * Outbound messages are sent via Termii's messaging API.
 *
 * Required env vars:
 *   TERMII_API_KEY        – from Termii dashboard → Settings → API Key
 *   TERMII_SENDER_ID      – your approved WhatsApp sender ID (e.g. "Handijob")
 *   WHATSAPP_VERIFY_TOKEN – any random string; set same value in Termii webhook config
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { diagnoseIssue } from "@/app/actions";

const TERMII_API_KEY   = process.env.TERMII_API_KEY!;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID ?? "Handijob";
const VERIFY_TOKEN     = process.env.WHATSAPP_VERIFY_TOKEN!;

// ── Verification handshake (Termii sends a GET to confirm the URL) ─
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token     = searchParams.get("token");
  const challenge = searchParams.get("challenge");

  if (token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "ok", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── Inbound message handler ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json() as TermiiPayload;

  // Termii wraps the message under `data`
  const msg  = body.data ?? body;
  const from = msg.phone_number ?? msg.from;
  const text = (msg.text ?? msg.message ?? "").trim();

  if (!from || !text) return NextResponse.json({ ok: true });

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

  await service
    .from("whatsapp_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("phone", from);

  const state   = session.state as string;
  const context = session.context as Record<string, unknown>;

  // ── State machine ──────────────────────────────────────────────
  try {
    switch (state) {

      case "idle":
      case "done": {
        await setSession(service, from, "diagnosing", { description: text });
        await sendMessage(from, "Got it! Let me analyse your issue... ⏳");

        const diagnosis = await diagnoseIssue(text, null);
        const ctx = { description: text, diagnosis, category: diagnosis.artisan_category };
        await setSession(service, from, "awaiting_location", ctx);

        const costRange   = `₦${diagnosis.estimated_min_naira.toLocaleString()} – ₦${diagnosis.estimated_max_naira.toLocaleString()}`;
        const urgencyLine = diagnosis.urgency === "High" ? "⚠️ This is urgent!\n" : "";

        await sendMessage(from,
          `${urgencyLine}${diagnosis.issue_title}\n\n${diagnosis.summary}\n\nEstimated cost: ${costRange}\nArtisan needed: ${diagnosis.artisan_category}\n\nWhat area are you in? (e.g. "Yaba, Lagos")`
        );
        break;
      }

      case "awaiting_location": {
        const location = text;
        await setSession(service, from, "selecting_artisan", { ...context, location });

        const { data: artisans } = await service.rpc("match_artisans", {
          p_category: context.category,
          p_location: location,
          p_limit: 3,
        });

        if (!artisans?.length) {
          await sendMessage(from, `Sorry, no ${context.category} artisans found near ${location}. Try a broader area or reply with a different location.`);
          await setSession(service, from, "awaiting_location", context);
          break;
        }

        await setSession(service, from, "selecting_artisan", { ...context, location, artisans });

        const list = (artisans as Array<{ full_name: string; trust_score: number; rating?: number; is_verified: boolean }>)
          .map((a, i) => `${i + 1}. ${a.full_name} ${a.is_verified ? "✓" : ""} — Trust: ${a.trust_score}${a.rating ? `, Rating: ${a.rating}★` : ""}`)
          .join("\n");

        await sendMessage(from, `Artisans near ${location}:\n\n${list}\n\nReply 1, 2, or 3 to select one, or type "none" to search again.`);
        break;
      }

      case "selecting_artisan": {
        if (text.toLowerCase() === "none") {
          await setSession(service, from, "awaiting_location", { ...context, artisans: undefined });
          await sendMessage(from, "What area should I search? (e.g. 'Ikeja, Lagos')");
          break;
        }

        const idx        = parseInt(text) - 1;
        const artisanList = context.artisans as Array<{ id: string; full_name: string }> | undefined;

        if (!artisanList || isNaN(idx) || idx < 0 || idx >= artisanList.length) {
          await sendMessage(from, `Please reply with a number between 1 and ${artisanList?.length ?? 3}, or type "none" to search again.`);
          break;
        }

        const artisan = artisanList[idx];
        await setSession(service, from, "awaiting_confirm", { ...context, selectedArtisan: artisan });
        await sendMessage(from, `You selected ${artisan.full_name}.\n\nReply "yes" to book them, or "no" to choose again.`);
        break;
      }

      case "awaiting_confirm": {
        if (text.toLowerCase() === "no") {
          await setSession(service, from, "selecting_artisan", { ...context, selectedArtisan: undefined });
          const artisanList = context.artisans as Array<{ full_name: string; is_verified: boolean; trust_score: number }>;
          const list = artisanList.map((a, i) => `${i + 1}. ${a.full_name} ${a.is_verified ? "✓" : ""} — Trust: ${a.trust_score}`).join("\n");
          await sendMessage(from, `Choose an artisan:\n\n${list}`);
          break;
        }

        if (text.toLowerCase() !== "yes") {
          await sendMessage(from, 'Reply "yes" to confirm or "no" to go back.');
          break;
        }

        await setSession(service, from, "done", {});
        const artisan = context.selectedArtisan as { full_name: string };
        const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "https://fixmate-app-psi.vercel.app";

        await sendMessage(from,
          `✅ Booked! ${artisan.full_name} will be notified.\n\nTrack your job and pay securely at:\n${appUrl}/dashboard\n\nSend any message to report a new issue.`
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
    await sendMessage(from, "Sorry, something went wrong. Please try again.");
  }

  return NextResponse.json({ ok: true });
}

// ── Helpers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setSession(service: any, phone: string, state: string, context: Record<string, unknown>) {
  await service.from("whatsapp_sessions").update({ state, context }).eq("phone", phone);
}

async function sendMessage(to: string, message: string) {
  await fetch("https://api.ng.termii.com/api/sms/send", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      from:    TERMII_SENDER_ID,
      sms:     message,
      type:    "plain",
      channel: "WhatsApp",
      api_key: TERMII_API_KEY,
    }),
  });
}

// ── Types ──────────────────────────────────────────────────────────

interface TermiiPayload {
  data?: {
    phone_number?: string;
    from?: string;
    text?: string;
    message?: string;
  };
  phone_number?: string;
  from?: string;
  text?: string;
  message?: string;
}
