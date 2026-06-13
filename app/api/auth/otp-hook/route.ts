/**
 * Supabase Auth Hook — Send SMS
 *
 * Configure in: Supabase Dashboard → Authentication → Hooks → Send SMS hook
 * Set URL to: https://isabiwork.vercel.app/api/auth/otp-hook
 * Set secret in Supabase dashboard and add SUPABASE_HOOK_SECRET to Vercel env vars.
 *
 * This hook intercepts all phone OTPs from Supabase and routes them to
 * either WhatsApp (via Meta Cloud API) or SMS (via Twilio) based on the
 * channel preference stored in otp_channel_prefs.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const HOOK_SECRET   = process.env.SUPABASE_HOOK_SECRET ?? "";
const META_TOKEN    = process.env.META_WA_TOKEN!;
const META_PHONE_ID = process.env.META_PHONE_NUMBER_ID!;

// Supabase signs hooks with HMAC-SHA256 using the whsec_ secret
async function verifySupabaseHook(req: NextRequest, rawBody: string): Promise<boolean> {
  if (!HOOK_SECRET) return true;
  try {
    const secret    = HOOK_SECRET.startsWith("v1,whsec_")
      ? HOOK_SECRET.slice("v1,whsec_".length)
      : HOOK_SECRET;
    const keyData   = Buffer.from(secret, "base64");
    const key       = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const signature = req.headers.get("x-supabase-signature") ?? "";
    const sigBytes  = Buffer.from(signature, "base64");
    const msgBytes  = new TextEncoder().encode(rawBody);
    return await crypto.subtle.verify("HMAC", key, sigBytes, msgBytes);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const valid   = await verifySupabaseHook(req, rawBody);
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

  // Look up channel preference (set by /api/auth/send-otp before triggering signInWithOtp)
  const { data: pref } = await db
    .from("otp_channel_prefs")
    .select("channel")
    .eq("phone", phone)
    .single();

  const channel = pref?.channel ?? "sms";

  if (channel === "whatsapp") {
    await sendViaWhatsApp(phone, otp);
  }
  // For SMS: if no whatsapp pref found, Supabase handles delivery itself —
  // return {} so Supabase knows the hook succeeded and proceeds normally.

  // Clean up preference
  await db.from("otp_channel_prefs").delete().eq("phone", phone);

  // Supabase expects an empty object on success
  return NextResponse.json({});
}

async function sendViaWhatsApp(phone: string, otp: string) {
  const dest = phone.replace(/^\+/, "");
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
  if (!res.ok) console.error("WhatsApp OTP send error:", await res.text());
}

