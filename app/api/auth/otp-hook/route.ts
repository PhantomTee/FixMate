/**
 * Supabase Auth Hook — Send SMS
 *
 * Configure in: Supabase Dashboard → Authentication → Hooks → Send SMS hook
 * Set URL to: https://fixmate-app-psi.vercel.app/api/auth/otp-hook
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

export async function POST(req: NextRequest) {
  // Verify Supabase hook signature
  const authHeader = req.headers.get("authorization");
  if (HOOK_SECRET && authHeader !== `Bearer ${HOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
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
  } else {
    await sendViaSMS(phone, otp);
  }

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

async function sendViaSMS(phone: string, otp: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = (process.env.TWILIO_PHONE_NUMBER
    ?? process.env.TWILIO_WHATSAPP_NUMBER?.replace("whatsapp:", "")
    ?? "");

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio SMS env vars missing for OTP delivery");
    return;
  }

  const { default: twilio } = await import("twilio");
  const client = twilio(accountSid, authToken);
  await client.messages.create({
    from: fromNumber,
    to:   phone,
    body: `Your iSabi verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
  });
}
