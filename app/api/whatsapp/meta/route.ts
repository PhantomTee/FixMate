/**
 * WhatsApp webhook — Meta Cloud API
 *
 * Required env vars (set on Vercel):
 *   META_WA_TOKEN        – permanent system user token
 *   META_PHONE_NUMBER_ID – phone number ID from WhatsApp Manager
 *   META_VERIFY_TOKEN    – any random string; set the same value in Meta webhook config
 */

import { NextRequest, NextResponse } from "next/server";
import { handleBotMessage } from "@/lib/whatsapp-bot";

const VERIFY_TOKEN    = process.env.META_VERIFY_TOKEN ?? "isabi_webhook_2026";
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID!;
const WA_TOKEN        = process.env.META_WA_TOKEN!;

// ── GET: Meta webhook verification handshake ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "ok", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST: inbound message from Meta ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as MetaPayload;

    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    // Status updates (delivered, read) — acknowledge and ignore
    if (value?.statuses?.length) {
      return NextResponse.json({ ok: true });
    }

    const message = value?.messages?.[0];
    if (!message) return NextResponse.json({ ok: true });

    const from      = message.from; // e.g. "2348012345678"
    const messageId = message.id;

    // Fix 1: Deduplication — skip if we've already processed this message ID
    if (messageId) {
      const { createServiceClient } = await import("@/lib/supabase");
      const db = createServiceClient();
      const { error: dedupError } = await db
        .from("whatsapp_processed_messages")
        .insert({ message_id: messageId, processed_at: new Date().toISOString() });
      if (dedupError) {
        // Unique constraint violation = already processed
        return NextResponse.json({ ok: true });
      }
    }

    let text    = "";
    let imageBase64: string | null = null;

    if (message.type === "text") {
      text = message.text?.body ?? "";
    } else if (message.type === "image" && message.image?.id) {
      // Download image from Meta media API
      const mediaId = message.image.id;
      const caption  = message.image.caption ?? "";
      text           = caption;

      try {
        // Step 1: get download URL
        const urlRes  = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
          headers: { Authorization: `Bearer ${WA_TOKEN}` },
        });
        const urlData = await urlRes.json() as { url?: string; mime_type?: string };

        if (urlData.url) {
          // Step 2: download the image
          const imgRes = await fetch(urlData.url, {
            headers: { Authorization: `Bearer ${WA_TOKEN}` },
          });
          if (imgRes.ok) {
            const buf         = await imgRes.arrayBuffer();
            const contentType = urlData.mime_type ?? imgRes.headers.get("content-type") ?? "image/jpeg";
            imageBase64       = `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`;
          } else {
            console.error("Meta image download failed:", imgRes.status);
            await sendMeta(from, "I couldn't download your photo. Please try sending it again.");
            return NextResponse.json({ ok: true });
          }
        }
      } catch (e) {
        console.error("Meta image download error:", e);
        await sendMeta(from, "I couldn't download your photo. Please try sending it again.");
        return NextResponse.json({ ok: true });
      }
    } else {
      // Fix 2: Unsupported message types — voice, sticker, reaction, location, document, etc.
      const unsupportedTypes: Record<string, string> = {
        audio:    "voice notes",
        video:    "videos",
        sticker:  "stickers",
        reaction: "reactions",
        location: "location pins",
        document: "documents",
        contacts: "contact cards",
        order:    "orders",
        button:   "button replies",
      };
      const label = unsupportedTypes[message.type] ?? message.type;
      if (from) {
        await sendMeta(from, `I can only read text messages and photos right now — I can't process ${label}.\n\nDescribe your issue in text or send a photo 📸, or reply *menu* to see options.`);
      }
      return NextResponse.json({ ok: true });
    }

    if (from && (text || imageBase64)) {
      await handleBotMessage(from, text, sendMeta, imageBase64);
    }
  } catch (err) {
    console.error("Meta webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}

// ── Send via Meta Cloud API ───────────────────────────────────────────────────
async function sendMeta(to: string, message: string): Promise<void> {
  // Strip whatsapp: prefix if present (Meta uses raw numbers)
  const dest = to.replace(/^whatsapp:\+?/, "").replace(/^\+/, "");

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type:    "individual",
        to:                dest,
        type:              "text",
        text:              { body: message },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Meta send error:", err);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface MetaPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id:     string;
          from:   string;
          type:   string;
          text?:  { body: string };
          image?: { id: string; caption?: string };
        }>;
        statuses?: Array<unknown>;
      };
    }>;
  }>;
}
