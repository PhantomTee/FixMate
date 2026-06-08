import { NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

export async function GET() {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ user: null, artisan: null });

  const service = createServiceClient();

  const [{ data: profile }, { data: artisan }] = await Promise.all([
    service.from("users").select("*").eq("id", user.id).single(),
    service.from("artisans").select("*").eq("user_id", user.id).single(),
  ]);

  return NextResponse.json({ user: profile, artisan });
}

export async function POST(req: Request) {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json() as { name: string; phone: string; location?: string };
  const service = createServiceClient();

  const { data, error } = await service
    .from("users")
    .upsert({
      id:       user.id,
      name:     body.name,
      phone:    body.phone,
      location: body.location ?? "",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
