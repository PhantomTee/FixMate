import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";
import { notifyArtisanOfJob } from "@/lib/whatsapp-bot";

const USER_FEE_PCT    = 0.02;   // 2% added to user's charge
const ARTISAN_FEE_PCT = 0.10;   // 10% deducted from artisan payout

export async function POST(req: NextRequest) {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { jobId, artisanId, quoteAmount } = await req.json() as {
    jobId:       string;
    artisanId:   string;
    quoteAmount: number;
  };

  if (!jobId || !artisanId || !quoteAmount) {
    return NextResponse.json({ error: "jobId, artisanId, and quoteAmount are required" }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify the job belongs to this user
  const { data: job } = await service
    .from("job_requests")
    .select("id, user_id")
    .eq("id", jobId)
    .single();

  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ error: "Job not found or not yours" }, { status: 404 });
  }

  const userFee    = Math.round(quoteAmount * USER_FEE_PCT);
  const artisanFee = Math.round(quoteAmount * ARTISAN_FEE_PCT);
  const totalCharge = quoteAmount + userFee;

  const { data: booking, error } = await service
    .from("bookings")
    .insert({
      job_id:      jobId,
      user_id:     user.id,
      artisan_id:  artisanId,
      quote_amount: quoteAmount,
      user_fee:    userFee,
      artisan_fee: artisanFee,
      total_charge: totalCharge,
      escrow_status: "not_funded",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update job with selected artisan + booking id
  const { data: updatedJob } = await service
    .from("job_requests")
    .update({
      selected_artisan_id: artisanId,
      booking_id:          booking.id,
      status:              "booking_created",
    })
    .eq("id", jobId)
    .select("description, location")
    .single();

  // Notify artisan via WhatsApp (fire-and-forget)
  void notifyArtisanOfJob({
    artisanId,
    bookingId:   booking.id,
    description: updatedJob?.description ?? "",
    location:    updatedJob?.location    ?? "",
    quoteAmount,
  });

  return NextResponse.json(booking, { status: 201 });
}
