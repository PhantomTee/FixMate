import { NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  void cookieStore; // ensure cookies() is awaited before createServerSideClient reads them

  const userClient = await createServerSideClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = (await req.json()) as {
    bookingId: string;
    jobId: string;
    artisanId: string;
    reason: string;
  };

  const { bookingId, jobId, artisanId, reason } = body;

  const service = createServiceClient();

  const { error: insertError } = await service.from("disputes").insert({
    booking_id: bookingId,
    job_id: jobId,
    user_id: user.id,
    artisan_id: artisanId,
    reason,
    status: "open",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: rpcError } = await service.rpc("perform_escrow_action", {
    p_booking_id: bookingId,
    p_action: "open_dispute",
    p_actor: "user",
    p_note: reason,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
