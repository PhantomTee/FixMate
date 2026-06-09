import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";
import { sendNotification } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bookingId, action, note } = body as {
    bookingId: string;
    action: string;
    note?: string;
  };

  if (!bookingId || !action) {
    return NextResponse.json({ error: "bookingId and action are required" }, { status: 400 });
  }

  // Verify the calling user has the right to perform this action
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Determine actor role
  let actor: "user" | "artisan" | "admin" = "user";
  const serviceClient = createServiceClient();

  const { data: artisan } = await serviceClient
    .from("artisans")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (artisan) actor = "artisan";

  // Validate that this user is a party to the booking
  const { data: booking } = await serviceClient
    .from("bookings")
    .select("user_id, artisan_id, quote_amount")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isUser    = booking.user_id === user.id;
  const isArtisan = artisan && booking.artisan_id === artisan.id;

  if (!isUser && !isArtisan) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate action is allowed for this role
  const userActions    = ["fund_escrow", "user_release", "open_dispute"];
  const artisanActions = ["artisan_accept", "artisan_decline", "mark_in_progress", "mark_completed", "open_dispute"];

  if (actor === "user"    && !userActions.includes(action))    return NextResponse.json({ error: `Users cannot perform action: ${action}` }, { status: 403 });
  if (actor === "artisan" && !artisanActions.includes(action)) return NextResponse.json({ error: `Artisans cannot perform action: ${action}` }, { status: 403 });

  // Call the Postgres security-definer function
  const { data, error } = await serviceClient.rpc("perform_escrow_action", {
    p_booking_id: bookingId,
    p_action:     action,
    p_actor:      actor,
    p_note:       note ?? "",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Fire-and-forget notifications
  void notifyParties(action, booking as { user_id: string; artisan_id: string; quote_amount: number }, serviceClient);

  return NextResponse.json(data);
}

// ── Notification helper ───────────────────────────────────────────────────────
type SupabaseServiceClient = ReturnType<typeof import("@/lib/supabase").createServiceClient>;

async function notifyParties(
  action: string,
  booking: { user_id: string; artisan_id: string; quote_amount: number },
  service: SupabaseServiceClient
) {
  const [{ data: userRow }, { data: artisanRow }] = await Promise.all([
    service.from("users").select("phone, name").eq("id", booking.user_id).single(),
    service.from("artisans").select("phone, full_name").eq("id", booking.artisan_id).single(),
  ]);

  const naira = (v: number) => `₦${v.toLocaleString()}`;
  const customerPhone  = userRow?.phone ?? "";
  const artisanPhone   = artisanRow?.phone ?? "";
  const artisanName    = artisanRow?.full_name ?? "Your artisan";
  const amount         = naira(booking.quote_amount);

  const messages: Record<string, { to: string; text: string }[]> = {
    artisan_accept: [{
      to:   customerPhone,
      text: `✅ ${artisanName} has accepted your job and is on the way! Open iSabi to track progress.`,
    }],
    mark_in_progress: [{
      to:   customerPhone,
      text: `🔧 ${artisanName} has started work on your job. Your ${amount} is secured in escrow.`,
    }],
    mark_completed: [{
      to:   customerPhone,
      text: `✅ Job done! ${artisanName} marked the work as complete. Inspect it and release payment in iSabi when satisfied.`,
    }],
    user_release: [{
      to:   artisanPhone,
      text: `💰 Payment of ${amount} released to your iSabi balance! Open the app to request a payout.`,
    }],
    open_dispute: [
      { to: customerPhone, text: `⚠️ Your dispute has been received. Our team will review your booking within 24 hours.` },
      { to: artisanPhone,  text: `⚠️ A dispute has been opened on one of your bookings. Our team will review within 24 hours.` },
    ],
    artisan_decline: [{
      to:   customerPhone,
      text: `ℹ️ The artisan could not take your job. We are finding another available artisan near you.`,
    }],
  };

  const targets = messages[action] ?? [];
  await Promise.all(targets.map(({ to, text }) => to ? sendNotification(to, text) : Promise.resolve()));
}
