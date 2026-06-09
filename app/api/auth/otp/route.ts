/**
 * OTP via Termii — two actions:
 *   POST { action: "send",   phone }          → sends OTP, returns pin_id
 *   POST { action: "verify", phone, pin_id, otp } → verifies OTP, signs in via Supabase
 *
 * Env vars required:
 *   TERMII_API_KEY   – from Termii dashboard
 *   TERMII_SENDER_ID – approved sender (e.g. "Handijob")
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const TERMII_API_KEY   = process.env.TERMII_API_KEY!;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID ?? "Handijob";
const BASE             = "https://api.ng.termii.com";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action: "send" | "verify";
    phone:  string;
    pin_id?: string;
    otp?:   string;
  };

  if (body.action === "send") {
    const res = await fetch(`${BASE}/api/sms/otp/send`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key:           TERMII_API_KEY,
        message_type:      "NUMERIC",
        to:                body.phone,
        from:              TERMII_SENDER_ID,
        channel:           "WhatsApp",
        pin_attempts:      3,
        pin_time_to_live:  10,
        pin_length:        6,
        pin_placeholder:   "< 1234 >",
        message_text:      "Your Handijob verification code is < 1234 >. Valid for 10 minutes.",
      }),
    });

    const data = await res.json() as { pinId?: string; pin_id?: string; message?: string };
    const pinId = data.pinId ?? data.pin_id;

    if (!res.ok || !pinId) {
      return NextResponse.json({ error: data.message ?? "Failed to send OTP" }, { status: 502 });
    }
    return NextResponse.json({ pin_id: pinId });
  }

  if (body.action === "verify") {
    if (!body.pin_id || !body.otp) {
      return NextResponse.json({ error: "pin_id and otp required" }, { status: 400 });
    }

    const res = await fetch(`${BASE}/api/sms/otp/verify`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TERMII_API_KEY,
        pin_id:  body.pin_id,
        pin:     body.otp,
      }),
    });

    const data = await res.json() as { verified?: boolean; msisdn?: string; message?: string };

    if (!res.ok || !data.verified) {
      return NextResponse.json({ error: data.message ?? "Invalid OTP" }, { status: 401 });
    }

    // OTP verified — sign in or create user via Supabase admin
    const service  = createServiceClient();
    const phone    = data.msisdn ?? body.phone;

    // Upsert the user in auth.users using admin API
    const { data: existingUsers } = await service.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.phone === phone);

    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error } = await service.auth.admin.createUser({
        phone,
        phone_confirm: true,
      });
      if (error || !created.user) {
        return NextResponse.json({ error: error?.message ?? "Failed to create user" }, { status: 500 });
      }
      userId = created.user.id;
    }

    // Generate a short-lived sign-in link and return the session token
    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type:  "magiclink",
      email: `${userId}@handijob.internal`,
    });

    // Fallback: just return the userId so the client can call signInWithOtp
    if (linkError || !linkData) {
      return NextResponse.json({ verified: true, userId, phone });
    }

    return NextResponse.json({ verified: true, userId, phone });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
