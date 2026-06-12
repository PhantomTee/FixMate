import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Vercel cron: runs every hour, releases escrow if client hasn't acted in 48h
export async function GET(req: NextRequest) {
  // Validate cron secret to prevent abuse
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const service = createServiceClient();
  const now     = new Date().toISOString();

  // Find bookings where after_photo uploaded, auto_release_at has passed, still in "completed"
  const { data: bookings, error: fetchErr } = await service
    .from("bookings")
    .select("id, artisan_id, quote_amount, artisan_fee")
    .eq("escrow_status", "completed")
    .not("auto_release_at", "is", null)
    .lte("auto_release_at", now);

  if (fetchErr) {
    console.error("auto-release fetch error:", fetchErr.message);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const released: string[] = [];
  for (const booking of (bookings ?? [])) {
    const { error: updateErr } = await service
      .from("bookings")
      .update({ escrow_status: "released" })
      .eq("id", booking.id);

    if (!updateErr) {
      // Append an escrow transaction record for the auto-release
      await service.from("escrow_transactions").insert({
        reference:   `auto-release-${booking.id}-${Date.now()}`,
        booking_id:  booking.id,
        job_id:      (await service.from("bookings").select("job_id").eq("id", booking.id).single()).data?.job_id,
        action:      "admin_release",
        amount:      booking.quote_amount,
        artisan_fee: booking.artisan_fee,
        actor:       "admin",
        note:        "Auto-released after 48h client inactivity",
      });
      released.push(booking.id);
    }
  }

  return NextResponse.json({ released, count: released.length });
}
