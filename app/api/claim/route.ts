import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { phone?: string; userId?: string };
  const { phone, userId } = body;

  if (!phone || !userId) {
    return NextResponse.json({ error: "phone and userId are required" }, { status: 400 });
  }

  const db = createServiceClient();

  // 1. Look up bot_customers record
  const { data: botUser, error: lookupErr } = await db
    .from("bot_customers")
    .select("*")
    .or(`phone.eq.${phone},phone.eq.whatsapp:${phone}`)
    .single();

  if (lookupErr || !botUser) {
    // No bot record found — create a bare users row anyway so the account works
    await db.from("users").insert({
      id:       userId,
      name:     "iSabi User",
      phone,
      location: "",
    });
    return NextResponse.json({ migrated: false });
  }

  // 2. Insert into users table (linked to Supabase Auth)
  const { error: insertErr } = await db.from("users").insert({
    id:       userId,
    name:     botUser.name as string,
    phone:    phone,
    location: botUser.location as string,
  });

  if (insertErr) {
    // Might already exist (e.g. duplicate claim) — not fatal
    if (!insertErr.message.includes("duplicate")) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  // 3. Re-link any job_requests and bookings to the real auth user id
  await db.from("job_requests").update({ user_id: userId }).eq("user_id", botUser.id as string);
  await db.from("bookings").update({ user_id: userId }).eq("user_id", botUser.id as string);

  // 4. Delete the bot_customers record
  await db.from("bot_customers").delete().eq("id", botUser.id as string);

  return NextResponse.json({ migrated: true, name: botUser.name });
}
