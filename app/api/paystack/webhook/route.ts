import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

function verifySignature(body: string, signature: string): boolean {
  const hash = createHmac("sha512", PAYSTACK_SECRET)
    .update(body)
    .digest("hex");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    data: {
      reference: string;
      status: string;
      metadata?: { booking_id?: string };
    };
  };

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const { reference, status, metadata } = event.data;
  if (status !== "success") return NextResponse.json({ received: true });

  const bookingId = metadata?.booking_id;
  if (!bookingId) {
    console.error("Paystack webhook: no booking_id in metadata for reference", reference);
    return NextResponse.json({ received: true });
  }

  const service = createServiceClient();

  // Verify the reference matches the booking
  const { data: booking } = await service
    .from("bookings")
    .select("id, escrow_status, paystack_reference")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.paystack_reference !== reference) {
    return NextResponse.json({ error: "Reference mismatch" }, { status: 400 });
  }

  if (booking.escrow_status !== "payment_pending") {
    // Already processed or wrong state — idempotency
    return NextResponse.json({ received: true });
  }

  // Fund escrow via the state machine function (actor = user)
  const { error } = await service.rpc("perform_escrow_action", {
    p_booking_id: bookingId,
    p_action:     "fund_escrow",
    p_actor:      "user",
    p_note:       `Paystack payment confirmed: ${reference}`,
  });

  if (error) {
    console.error("Escrow fund_escrow failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
