/**
 * WhatsApp webhook — powered by Twilio
 *
 * Twilio delivers inbound WhatsApp messages as a form-urlencoded POST.
 * Outbound messages are sent via the Twilio Messaging API.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID      – from Twilio Console
 *   TWILIO_AUTH_TOKEN       – from Twilio Console
 *   TWILIO_WHATSAPP_NUMBER  – your Twilio WhatsApp number (e.g. "whatsapp:+14155238886")
 *
 * Twilio Sandbox (for testing without approval):
 *   https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
 *
 * Set this route's URL in Twilio Console → Messaging → WhatsApp → Sandbox
 * Webhook URL: https://<your-domain>/api/whatsapp/twilio
 * HTTP Method: POST
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createServiceClient } from "@/lib/supabase";
import { diagnoseIssue } from "@/app/actions";

const ACCOUNT_SID   = process.env.TWILIO_ACCOUNT_SID!;
const AUTH_TOKEN    = process.env.TWILIO_AUTH_TOKEN!;
const FROM_NUMBER   = process.env.TWILIO_WHATSAPP_NUMBER!; // e.g. "whatsapp:+14155238886"

function getClient() {
  return twilio(ACCOUNT_SID, AUTH_TOKEN);
}

export async function POST(req: NextRequest) {
  // Twilio sends application/x-www-form-urlencoded
  const form = await req.formData();
  const text = ((form.get("Body") as string) ?? "").trim();
  const from = (form.get("From") as string) ?? ""; // e.g. "whatsapp:+2348012345678"

  if (!from || !text) {
    return new NextResponse("ok", { status: 200 });
  }

  const service = createServiceClient();

  // Load or create session keyed by the sender's WhatsApp number
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

  try {
    switch (state) {

      case "idle":
      case "done": {
        await setSession(service, from, "diagnosing", { description: text });
        await send(from, "Got it! Analysing your issue... ⏳");

        const diagnosis = await diagnoseIssue(text, null);
        const ctx = { description: text, diagnosis, category: diagnosis.artisan_category };
        await setSession(service, from, "awaiting_location", ctx);

        const costRange   = `₦${diagnosis.estimated_min_naira.toLocaleString()} – ₦${diagnosis.estimated_max_naira.toLocaleString()}`;
        const urgencyLine = diagnosis.urgency === "High" ? "⚠️ This is urgent!\n" : "";

        await send(from,
          `${urgencyLine}*${diagnosis.issue_title}*\n\n${diagnosis.summary}\n\nEstimated cost: ${costRange}\nArtisan needed: ${diagnosis.artisan_category}\n\nWhat area are you in? (e.g. "Yaba, Lagos")`
        );
        break;
      }

      case "awaiting_location": {
        const location = text;
        const { data: artisans } = await service.rpc("match_artisans", {
          p_category: context.category,
          p_location: location,
          p_limit: 3,
        });

        if (!artisans?.length) {
          await send(from, `Sorry, no ${context.category} artisans found near ${location}. Try a broader area or reply with a different location.`);
          break;
        }

        await setSession(service, from, "selecting_artisan", { ...context, location, artisans });

        const list = (artisans as Array<{ full_name: string; trust_score: number; rating?: number; is_verified: boolean }>)
          .map((a, i) => `${i + 1}. ${a.full_name}${a.is_verified ? " ✓" : ""} — Trust: ${a.trust_score}%${a.rating ? `, ${a.rating}★` : ""}`)
          .join("\n");

        await send(from, `Artisans near ${location}:\n\n${list}\n\nReply 1, 2, or 3 to select one, or "none" to search again.`);
        break;
      }

      case "selecting_artisan": {
        if (text.toLowerCase() === "none") {
          await setSession(service, from, "awaiting_location", { ...context, artisans: undefined });
          await send(from, "What area should I search? (e.g. 'Ikeja, Lagos')");
          break;
        }

        const idx         = parseInt(text) - 1;
        const artisanList = context.artisans as Array<{ id: string; full_name: string }> | undefined;

        if (!artisanList || isNaN(idx) || idx < 0 || idx >= artisanList.length) {
          await send(from, `Please reply with a number between 1 and ${artisanList?.length ?? 3}, or "none" to search again.`);
          break;
        }

        const artisan = artisanList[idx];
        await setSession(service, from, "awaiting_confirm", { ...context, selectedArtisan: artisan });
        await send(from, `You selected *${artisan.full_name}*.\n\nReply "yes" to book them, or "no" to choose again.`);
        break;
      }

      case "awaiting_confirm": {
        if (text.toLowerCase() === "no") {
          const artisanList = context.artisans as Array<{ full_name: string; is_verified: boolean; trust_score: number }>;
          await setSession(service, from, "selecting_artisan", { ...context, selectedArtisan: undefined });
          const list = artisanList.map((a, i) => `${i + 1}. ${a.full_name}${a.is_verified ? " ✓" : ""} — Trust: ${a.trust_score}%`).join("\n");
          await send(from, `Choose an artisan:\n\n${list}`);
          break;
        }

        if (text.toLowerCase() !== "yes") {
          await send(from, 'Reply "yes" to confirm or "no" to go back.');
          break;
        }

        await setSession(service, from, "done", {});
        const artisan = context.selectedArtisan as { full_name: string };
        const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "https://fixmate-app-psi.vercel.app";

        await send(from,
          `✅ Booked! *${artisan.full_name}* will be notified.\n\nTrack your job and pay securely at:\n${appUrl}/dashboard\n\nSend any message to report a new issue.`
        );
        break;
      }

      default: {
        await setSession(service, from, "idle", {});
        await send(from, "Hi! I'm iSabi AI 🔧\n\nDescribe your home repair issue and I'll diagnose it and find you a verified artisan nearby.");
      }
    }
  } catch (err) {
    console.error("WhatsApp/Twilio handler error:", err);
    await send(from, "Sorry, something went wrong. Please try again in a moment.");
  }

  // Twilio expects 200 OK; actual replies are sent via the API above
  return new NextResponse("", { status: 200 });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setSession(service: any, phone: string, state: string, context: Record<string, unknown>) {
  await service.from("whatsapp_sessions").update({ state, context }).eq("phone", phone);
}

async function send(to: string, body: string) {
  const client = getClient();
  await client.messages.create({ from: FROM_NUMBER, to, body });
}
