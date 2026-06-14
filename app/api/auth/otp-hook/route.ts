/**
 * Supabase Auth Hook — Send SMS
 * URL: https://isabiwork.vercel.app/api/auth/otp-hook
 * Routes WhatsApp OTPs via Meta Cloud API; SMS OTPs handled by Supabase natively.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const HOOK_SECRET   = process.env.SUPABASE_HOOK_SECRET ?? "";
const META_TOKEN    = process.env.META_WA_TOKEN!;
const META_PHONE_ID = process.env.META_PHONE_NUMBER_ID!;

function verifySignature(req: NextRequest): boolean {
  if (!HOOK_SECRET) return false;
  // Supabase Auth hooks send the hook secret directly as the Bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  return token === HOOK_SECRET;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const valid   = verifySignature(req);
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
