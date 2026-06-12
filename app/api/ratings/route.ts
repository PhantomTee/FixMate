import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    bookingId:   string;
    artisanId:   string;
    punctuality: number;
    neatness:    number;
    skill:       number;
    attitude:    number;
    comment?:    string;
  };

  const serverClient = await createServerSideClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // Verify the booking belongs to this user
  const { data: booking } = await service.from("bookings")
    .select("id, user_id, escrow_status")
    .eq("id", body.bookingId)
    .single();

  if (!booking || booking.user_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (!["released", "completed"].includes(booking.escrow_status)) {
    return NextResponse.json({ error: "Job must be completed before rating" }, { status: 400 });
  }

  const { data, error } = await service.from("artisan_ratings").insert({
    booking_id:  body.bookingId,
    artisan_id:  body.artisanId,
    user_id:     user.id,
    punctuality: body.punctuality,
    neatness:    body.neatness,
    skill:       body.skill,
    attitude:    body.attitude,
    comment:     body.comment ?? "",
  }).select().single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Already rated" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
