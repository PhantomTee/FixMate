import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { identifier, channel } = await req.json() as {
    identifier: string;
    channel: "email";
  };

  if (!identifier || channel !== "email") {
    return NextResponse.json({ error: "Missing identifier, or unsupported channel" }, { status: 400 });
  }

  try {
    const supabase = await createServerSideClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: identifier.trim(),
      options: { shouldCreateUser: true },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json({ error: "Failed to send OTP. Please try again." }, { status: 500 });
  }
}
