/**
 * OTP via Termii — two actions:
 *   POST { action: "send",   phone }          → sends OTP, returns pin_id
 *   POST { action: "verify", phone, pin_id, otp } → verifies OTP, signs in via Supabase
 *
 * Env vars required:
 *   TERMII_API_KEY   – from Termii dashboard
 *   TERMII_SENDER_ID – approved sender (e.g. "iSabi")
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const TERMII_API_KEY   = process.env.TERMII_API_KEY!;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID ?? "iSabi";
const BASE             = "https://v3.api.termii.com";

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
        message_text:      "Your iSabi verification code is < 1234 >. Valid for 10 minutes.",
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

    // Deterministic fake email so we can issue magic-link tokens (phone-only users have no email)
    const deterministicEmail = `p${phone.replace(/\D/g, "")}@isabi.ng`;

    // Find existing user or create one
    const { data: existingUsers } = await service.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.phone === phone);

    let userId: string;
    if (existing) {
      userId = existing.id;
      // Backfill email if the user was created without one
      if (!existing.email) {
        await service.auth.admin.updateUserById(userId, {
          email: deterministicEmail,
          email_confirm: true,
        });
      }
    } else {
      const { data: created, error } = await service.auth.admin.createUser({
        phone,
        phone_confirm: true,
        email:         deterministicEmail,
        email_confirm: true,
      });
      if (error || !created.user) {
        return NextResponse.json({ error: error?.message ?? "Failed to create user" }, { status: 500 });
      }
      userId = created.user.id;
    }

    // Generate a magic-link token so the client can establish a session without a second OTP
    const { data: linkData } = await service.auth.admin.generateLink({
      type:  "magiclink",
      email: deterministicEmail,
    });

    const tokenHash = linkData?.properties?.hashed_token;
    return NextResponse.json({ verified: true, userId, phone, token_hash: tokenHash, email: deterministicEmail });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
