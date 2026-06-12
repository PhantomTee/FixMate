import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json() as { email: string; password: string; name: string };
  const { email, password, name } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: "email, password, and name are required" }, { status: 400 });
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Server configuration error. Contact support." }, { status: 500 });
  }

  try {
    const { data, error } = await service.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data.user.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sign-up failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
