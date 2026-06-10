import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: NextRequest) {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { bookingId } = await req.json() as { bookingId: string };
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const service = createServiceClient();

  // Fetch booking
  const { data: booking } = await service
    .from("bookings")
    .select("*, users!bookings_user_id_fkey(phone, name)")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.user_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.escrow_status !== "not_funded") {
    return NextResponse.json({ error: "Booking is already funded or past this stage" }, { status: 400 });
  }

  const amountKobo = booking.total_charge * 100; // Paystack uses kobo

  // Use real auth email; fall back to deterministic placeholder
  const customerEmail = user.email ?? `u${user.id.slice(0, 8)}@isabi.ng`;

  // Initialize Paystack transaction
  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      amount:    amountKobo,
      email:     customerEmail,
      reference: `ISB-${bookingId.slice(0, 8)}-${Date.now()}`,
      metadata:  { booking_id: bookingId, user_id: user.id },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking?bookingId=${bookingId}`,
    }),
  });

  const paystack = await paystackRes.json() as {
    status: boolean;
    data?: { authorization_url: string; reference: string };
    message: string;
  };

  if (!paystack.status || !paystack.data) {
    return NextResponse.json({ error: paystack.message ?? "Paystack error" }, { status: 502 });
  }

  // Store the reference so the webhook can look up the booking
  await service
    .from("bookings")
    .update({ paystack_reference: paystack.data.reference, escrow_status: "payment_pending" })
    .eq("id", bookingId);

  return NextResponse.json({
    authorizationUrl: paystack.data.authorization_url,
    reference:        paystack.data.reference,
    publicKey:        process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
    email:            customerEmail,
    amountKobo,
  });
}
