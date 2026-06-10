import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";
import { refundPaystackTransaction } from "@/lib/paystack";

async function isAdminUser() {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return false;
  const adminPhones = (process.env.ADMIN_PHONE_WHITELIST ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  return user.user_metadata?.role === "admin" || adminPhones.includes(user.phone ?? "");
}

export async function POST(req: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bookingId, action, note } = await req.json() as {
    bookingId: string;
    action:    string;
    note?:     string;
  };

  if (!["admin_release", "admin_refund"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const service = createServiceClient();

  // Fetch booking before state change so we have the Paystack reference
  const { data: booking } = await service
    .from("bookings")
    .select("paystack_reference, total_charge, escrow_status")
    .eq("id", bookingId)
    .single();

  const { error } = await service.rpc("perform_escrow_action", {
    p_booking_id: bookingId,
    p_action:     action,
    p_actor:      "admin",
    p_note:       note ?? "",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Issue Paystack refund when admin decides to refund the buyer
  if (action === "admin_refund" && booking?.paystack_reference) {
    const kobo = ((booking.total_charge as number) ?? 0) * 100;
    void refundPaystackTransaction(booking.paystack_reference as string, kobo);
  }

  return NextResponse.json({ ok: true });
}
