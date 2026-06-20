/**
 * Bridges a Firebase Phone-Auth verified number into a Supabase session.
 * POST { idToken, mode: "signup" | "signin", name?, password? }
 *
 * Firebase confirms phone ownership (SMS OTP); this route then creates or
 * looks up the matching Supabase user and returns a magic-link token_hash
 * the client can pass to supabase.auth.verifyOtp({ type: "email" }) to get
 * a real session — Supabase has no public API for issuing a session for an
 * arbitrary user, so a phone-keyed deterministic email is used as the bridge.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";

function deterministicEmail(phone: string): string {
  return `p${phone.replace(/\D/g, "")}@isabi.ng`;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    idToken:  string;
    mode:     "signup" | "signin";
    name?:    string;
    password?: string;
  };

  if (!body.idToken || !body.mode) {
    return NextResponse.json({ error: "Missing idToken or mode" }, { status: 400 });
  }

  let phone: string;
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(body.idToken);
    if (!decoded.phone_number) throw new Error("Token has no verified phone number");
    phone = decoded.phone_number;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid token";
    return NextResponse.json({ error: `Phone verification failed: ${msg}` }, { status: 401 });
  }

  const service = createServiceClient();
  const email   = deterministicEmail(phone);

  const { data: existingUsers } = await service.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.phone === phone);

  if (body.mode === "signup") {
    if (existing) {
      return NextResponse.json({ error: "An account with this number already exists. Sign in instead." }, { status: 409 });
    }
    if (!body.password || body.password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const { data: created, error } = await service.auth.admin.createUser({
      phone,
      phone_confirm: true,
      email,
      email_confirm: true,
      password:      body.password,
      user_metadata: { name: body.name?.trim() ?? "" },
    });
    if (error || !created.user) {
      return NextResponse.json({ error: error?.message ?? "Failed to create account" }, { status: 500 });
    }
  } else {
    if (!existing) {
      return NextResponse.json({ error: "No account found for this number. Sign up first." }, { status: 404 });
    }
  }

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return NextResponse.json({ error: linkError?.message ?? "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({ token_hash: tokenHash, email, phone });
}
