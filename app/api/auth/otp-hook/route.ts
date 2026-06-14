/**
 * Supabase Auth Hook — Send SMS
 * URL: https://isabiwork.vercel.app/api/auth/otp-hook
 * Routes WhatsApp OTPs via Meta Cloud API; SMS OTPs handled by Supabase natively.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase";

const HOOK_SECRET   = process.env.SUPABASE_HOOK_SECRET ?? "";
const META_TOKEN    = process.env.META_WA_TOKEN!;
const META_PHONE_ID = process.env.META_PHONE_NUMBER_ID!;

// Supabase auth hooks use Svix-style HMAC-SHA256 webhook signing.
// Signed content: "${webhook-id}.${webhook-timestamp}.${rawBody}"
// Secret format:  "v1,whsec_<base64>" | "whsec_<base64>" | "v1,<base64>"
async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  if (!HOOK_SECRET) { console.error("OTP-HOOK: SUPABASE_HOOK_SECRET not set"); return false; }

  const msgId        = req.headers.get("webhook-id") ?? "";
  const msgTimestamp = req.headers.get("webhook-timestamp") ?? "";
  const msgSignature = req.headers.get("webhook-signature") ?? "";

  if (!msgId || !msgTimestamp || !msgSignature) {
    console.error("OTP-HOOK: missing Svix headers", { msgId: !!msgId, msgTimestamp: !!msgTimestamp, msgSignature: !!msgSignature });
    return false;
  }

  const ts  = parseInt(msgTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    console.error("OTP-HOOK: webhook timestamp out of tolerance", { ts, now });
    return false;
  }

  let secretBase64 = HOOK_SECRET;
  if (secretBase64.startsWith("v1,whsec_"))  secretBase64 = secretBase64.slice(9);
  else if (secretBase64.startsWith("whsec_")) secretBase64 = secretBase64.slice(6);
  else if (secretBase64.startsWith("v1,"))    secretBase64 = secretBase64.slice(3);

  const secretBytes = Buffer.from(secretBase64, "base64");
  const toSign      = `${msgId}.${msgTimestamp}.${rawBody}`;
  const expectedBuf = createHmac("sha256", secretBytes).update(toSign).digest();

  const receivedSigs = msgSignature.split(" ").map(s => s.replace(/^v\d+,/, ""));
  const valid = receivedSigs.some(sig => {
    try {
      const sigBuf = Buffer.from(sig, "base64");
      return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
    } catch { return false; }
  });

  if (!valid) {
    console.error("OTP-HOOK: signature mismatch", {
      expected: expectedBuf.toString("base64").slice(0, 12),
      received: receivedSigs.map(s => s.slice(0, 12)),
    });
  }
  return valid;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const valid   = await verifySignature(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    user: { phone: string };
    sms:  { otp: string };
  };

  const phone = body.user?.phone;
  const otp   = body.sms?.otp;

  if (!phone || !otp) {
    return NextResponse.json({ error: "Invalid hook payload" }, { status: 400 });
  }

  const db = createServiceClient();

  const { data: pref } = await db
    .from("otp_channel_prefs")
    .select("channel")
    .eq("phone", phone)
    .single();

  if (pref?.channel === "whatsapp") {
    // Fix 5: If Meta send fails, return non-200 so Supabase retries rather than silently losing the OTP
    const sent = await sendViaWhatsApp(phone, otp);
    if (!sent) {
      console.error("WhatsApp OTP delivery failed for", phone, "— letting Supabase retry");
      return NextResponse.json({ error: "WhatsApp delivery failed" }, { status: 500 });
    }
  }
  // SMS: no action — Supabase handles delivery itself when no pref found

  await db.from("otp_channel_prefs").delete().eq("phone", phone);

  return NextResponse.json({});
}

// Returns true if sent successfully, false on failure
async function sendViaWhatsApp(phone: string, otp: string): Promise<boolean> {
  const dest = phone.replace(/^\+/, "");
  try {
    const res  = await fetch(
      `https://graph.facebook.com/v19.0/${META_PHONE_ID}/messages`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${META_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to:   dest,
          type: "text",
          text: {
            body:
              `🔐 *iSabi Verification Code*\n\n` +
              `Your one-time code is: *${otp}*\n\n` +
              `Valid for 10 minutes. Do not share this code with anyone.`,
          },
        }),
      }
    );
    if (!res.ok) {
      console.error("WhatsApp OTP send error:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("WhatsApp OTP send exception:", err);
    return false;
  }
}
