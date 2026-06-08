import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

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
    .select("user_id, artisan_id")
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

  return NextResponse.json(data);
}
