import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { phone, channel } = await req.json() as { phone: string; channel: string };
  if (!phone || !channel) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const db = createServiceClient();
  await db.from("otp_channel_prefs").upsert(
    { phone, channel, created_at: new Date().toISOString() },
    { onConflict: "phone" }
  );

  return NextResponse.json({ ok: true });
}
