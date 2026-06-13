import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { createServiceClient } from "@/lib/supabase";

function formatPhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length >= 10) return `+234${digits.slice(1)}`;
  if (digits.startsWith("234"))                        return `+${digits}`;
  return p.startsWith("+") ? p.trim() : `+234${digits}`;
}

export async function POST(req: NextRequest) {
  const { identifier, channel } = await req.json() as {
    identifier: string;
    channel: "email" | "sms" | "whatsapp";
  };

  if (!identifier || !channel) {
    return NextResponse.json({ error: "Missing identifier or channel" }, { status: 400 });
  }

  try {
    const supabase = await createServerSideClient();

    if (channel === "email") {
      const { error } = await supabase.auth.signInWithOtp({
        email: identifier.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    // SMS or WhatsApp — store channel preference so the hook knows how to deliver
    const phone = formatPhone(identifier);
    const db    = createServiceClient();

    await db.from("otp_channel_prefs").upsert(
      { phone, channel, created_at: new Date().toISOString() },
      { onConflict: "phone" }
    );

    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });

    if (error) {
      await db.from("otp_channel_prefs").delete().eq("phone", phone);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, phone });

  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json({ error: "Failed to send OTP. Please try again." }, { status: 500 });
  }
}
