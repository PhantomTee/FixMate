import { NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";
import { sendNotification } from "@/lib/notify";

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

  // Notify both parties about the dispute
  const [{ data: userRow }, { data: artisanRow }] = await Promise.all([
    service.from("users").select("phone").eq("id", user.id).single(),
    service.from("artisans").select("phone").eq("id", artisanId).single(),
  ]);
  const disputeMsg = `⚠️ A dispute has been opened on your booking. Our team will review within 24 hours and reach out if more information is needed.`;
  await Promise.all([
    userRow?.phone    ? sendNotification(userRow.phone, disputeMsg)    : Promise.resolve(),
    artisanRow?.phone ? sendNotification(artisanRow.phone, disputeMsg) : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true });
}
