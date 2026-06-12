import { NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/admin";

export async function GET() {
  try {
    const userClient = await createServerSideClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ user: null, artisan: null, email: null, isAdmin: false });

    const service = createServiceClient();

    const [{ data: profile }, { data: artisan }, adminFlag] = await Promise.all([
      service.from("users").select("*").eq("id", user.id).single(),
      service.from("artisans").select("*").eq("user_id", user.id).single(),
      isAdminUser(),
    ]);

    return NextResponse.json({ user: profile, artisan, email: user.email ?? null, isAdmin: adminFlag });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userClient = await createServerSideClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await req.json() as {
      name: string;
      phone?: string;
      location?: string;
      nin?: string;
      avatar?: string;
    };

    const service = createServiceClient();
    const ninClean = (body.nin ?? "").replace(/\D/g, "");

    const { data, error } = await service
      .from("users")
      .upsert({
        id:           user.id,
        name:         body.name,
        phone:        body.phone || null,
        location:     body.location ?? "",
        ...(body.avatar !== undefined  && { avatar: body.avatar }),
        ...(body.nin   !== undefined   && { nin: ninClean }),
        ...(ninClean.length === 11     && { nin_verified: true }),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
