import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

type PhotoType = "before" | "after";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const body = (await req.json()) as { type: PhotoType; photo: string };

  if (!["before", "after"].includes(body.type)) {
    return NextResponse.json({ error: "type must be 'before' or 'after'" }, { status: 400 });
  }

  const serverClient = await createServerSideClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // Must be the artisan assigned to this booking
  const { data: booking } = await service.from("bookings")
    .select("id, artisan_id, escrow_status")
    .eq("id", bookingId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const { data: artisan } = await service.from("artisans")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!artisan || artisan.id !== booking.artisan_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const column     = body.type === "before" ? "before_photo" : "after_photo";
  const updateData: Record<string, unknown> = { [column]: body.photo };

  // Uploading after photo triggers payment request
  if (body.type === "after") {
    updateData.payment_requested_at = new Date().toISOString();
    // Auto-release window: 48 hours from now
    const autoRelease = new Date(Date.now() + 48 * 60 * 60 * 1000);
    updateData.auto_release_at = autoRelease.toISOString();
    // Transition escrow to "completed" so user sees the release button
    updateData.escrow_status = "completed";
  }

  const { data, error } = await service.from("bookings")
    .update(updateData)
    .eq("id", bookingId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
