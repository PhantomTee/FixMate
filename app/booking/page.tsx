"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { performEscrowAction, subscribeBooking } from "@/lib/api";
import { Artisan, Booking, DiagnosisRecord, JobRequest } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

const STATUS_META: Record<string, { label: string; color: string; hint: string }> = {
  not_funded:  { label: "Awaiting Payment",    color: "bg-gray-100 text-gray-600",     hint: "Pay to lock funds in escrow." },
  funded:      { label: "Escrow Funded",        color: "bg-yellow-100 text-yellow-700", hint: "Waiting for artisan to accept." },
  accepted:    { label: "Artisan Accepted",     color: "bg-blue-100 text-blue-700",     hint: "Artisan is on the way." },
  in_progress: { label: "In Progress",          color: "bg-purple-100 text-purple-700", hint: "Funds locked until completion." },
  completed:   { label: "Job Completed",        color: "bg-green-100 text-green-700",   hint: "Inspect work and release funds." },
  released:    { label: "Payment Released",     color: "bg-green-100 text-green-800",   hint: "Job complete. Payment sent." },
  disputed:    { label: "Dispute Open",         color: "bg-red-100 text-red-700",       hint: "Admin is reviewing." },
  refunded:    { label: "Refunded",             color: "bg-gray-100 text-gray-600",     hint: "Payment returned to wallet." },
};

interface BookingData {
  booking: Booking;
  job: JobRequest;
  artisan: Artisan;
  diagnosis: DiagnosisRecord;
  userPhone: string;
}

export default function BookingPage() {
  const router = useRouter();
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [disputeText, setDisputeText] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  const bookingId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("bookingId")
      : null;

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }

    const supabase = createClient();

    async function load() {
      const { data: booking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (!booking) { setLoading(false); return; }

      const [
        { data: job },
        { data: artisan },
        { data: authUser },
      ] = await Promise.all([
        supabase.from("job_requests").select("*").eq("id", booking.job_id).single(),
        supabase.from("artisans").select("*").eq("id", booking.artisan_id).single(),
        supabase.auth.getUser(),
      ]);

      if (!job || !artisan) { setLoading(false); return; }

      const { data: diagnosis } = await supabase
        .from("diagnoses")
        .select("*")
        .eq("id", job.diagnosis_id)
        .single();

      if (!diagnosis) { setLoading(false); return; }

      const toBooking = (r: Record<string, unknown>): Booking => ({
        id: r.id as string,
        jobId: r.job_id as string,
        userId: r.user_id as string,
        artisanId: r.artisan_id as string,
        quoteAmount: r.quote_amount as number,
        userFee: r.user_fee as number,
        artisanFee: r.artisan_fee as number,
        totalCharge: r.total_charge as number,
        escrowStatus: r.escrow_status as Booking["escrowStatus"],
        opayReference: (r.paystack_reference ?? r.opay_reference ?? "") as string,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      });

      const toJobRequest = (r: Record<string, unknown>): JobRequest => ({
        id: r.id as string,
        userId: r.user_id as string,
        description: r.description as string,
        imageProvided: r.image_provided as boolean,
        location: r.location as string,
        diagnosisId: (r.diagnosis_id ?? "") as string,
        selectedArtisanId: r.selected_artisan_id as string | undefined,
        bookingId: r.booking_id as string | undefined,
        status: r.status as JobRequest["status"],
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      });

      const toArtisan = (r: Record<string, unknown>): Artisan => ({
        id: r.id as string,
        fullName: r.full_name as string,
        phone: r.phone as string,
        category: r.category as Artisan["category"],
        location: r.location as string,
        yearsExperience: r.years_experience as number,
        verificationId: (r.verification_id ?? "") as string,
        skills: (r.skills ?? []) as string[],
        serviceRadiusKm: r.service_radius_km as number,
        opayPhone: (r.opay_phone ?? "") as string,
        trustScore: r.trust_score as number,
        completedJobs: r.completed_jobs as number,
        isVerified: r.is_verified as boolean,
        applicationStatus: r.application_status as Artisan["applicationStatus"],
        artisan_pending_balance: r.artisan_pending_balance as number,
        artisan_available_balance: r.artisan_available_balance as number,
        avatar: (r.avatar ?? "") as string,
        emergencyAvailable: (r.emergency_available ?? false) as boolean,
        serviceAreas: (r.service_areas ?? []) as string[],
        rating: r.rating as number | undefined,
        createdAt: r.created_at as string,
      });

      const toDiagnosis = (r: Record<string, unknown>): DiagnosisRecord => ({
        id: r.id as string,
        jobId: r.job_id as string,
        userId: r.user_id as string,
        issue_title: r.issue_title as string,
        summary: r.summary as string,
        artisan_category: r.artisan_category as DiagnosisRecord["artisan_category"],
        urgency: r.urgency as DiagnosisRecord["urgency"],
        estimated_min_naira: r.estimated_min_naira as number,
        estimated_max_naira: r.estimated_max_naira as number,
        estimated_labor_naira: r.estimated_labor_naira as number,
        estimated_materials_naira: r.estimated_materials_naira as number,
        safety_warning: r.safety_warning as string | null,
        first_aid_steps: (r.first_aid_steps ?? []) as string[],
        follow_up_questions: (r.follow_up_questions ?? []) as string[],
        artisan_brief: r.artisan_brief as DiagnosisRecord["artisan_brief"],
        language: r.language as DiagnosisRecord["language"],
        createdAt: r.created_at as string,
      });

      setData({
        booking: toBooking(booking as Record<string, unknown>),
        job: toJobRequest(job as Record<string, unknown>),
        artisan: toArtisan(artisan as Record<string, unknown>),
        diagnosis: toDiagnosis(diagnosis as Record<string, unknown>),
        userPhone: authUser.data.user?.phone ?? "",
      });
      setLoading(false);
    }

    load();
  }, [bookingId]);

  // Realtime booking status subscription
  useEffect(() => {
    if (!bookingId) return;
    const channel = subscribeBooking(bookingId, (updated) => {
      setData((prev) => prev ? { ...prev, booking: updated } : null);
    });
    return () => { channel.unsubscribe(); };
  }, [bookingId]);

  const run = async (action: "user_release" | "open_dispute") => {
    if (!data) return;
    setIsWorking(true);
    setError("");
    try {
      const note = action === "open_dispute" ? (disputeText.trim() || "User opened a dispute.") : "";
      const updated = await performEscrowAction(data.booking.id, action, note);
      setData((prev) => prev ? { ...prev, booking: updated } : null);
      if (action === "user_release") setTimeout(() => router.push("/dashboard"), 600);
      setShowDispute(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsWorking(false);
    }
  };

  const fundEscrow = async () => {
    if (!data) return;
    setIsWorking(true);
    setError("");
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: data.booking.id }),
      });
      const json = await res.json() as { authorizationUrl?: string; error?: string };
      if (!res.ok || !json.authorizationUrl) throw new Error(json.error ?? "Payment init failed");
      window.location.href = json.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
      setIsWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-gray-500 font-semibold">No booking found.</p>
        <Link href="/report" className="bg-green-700 text-white px-6 py-3 text-sm font-black hover:bg-green-800">
          Create a job request →
        </Link>
      </div>
    );
  }

  const { booking, artisan, diagnosis } = data;
  const isFunded = booking.escrowStatus !== "not_funded";
  const canRelease = booking.escrowStatus === "completed";
  const canDispute = ["funded", "accepted", "in_progress", "completed"].includes(booking.escrowStatus);
  const meta = STATUS_META[booking.escrowStatus] ?? STATUS_META.not_funded;

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-950 text-sm font-black transition-colors">← Back</Link>
        <span className="text-gray-200">/</span>
        <span className="text-sm font-black text-gray-950">Booking</span>
        <span className="ml-auto font-mono text-xs text-gray-400">{booking.opayReference || booking.id.slice(0, 8)}</span>
      </div>

      <main className="max-w-md mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Status pill */}
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 ${meta.color}`}>{meta.label}</span>
          <span className="text-sm text-gray-500">{meta.hint}</span>
        </div>

        {/* Artisan card */}
        <div className="border border-gray-200 p-4 flex items-center gap-4">
          {artisan.avatar ? (
            <Image unoptimized src={artisan.avatar} alt={artisan.fullName} width={48} height={48} className="border border-gray-200 shrink-0" />
          ) : (
            <div className="w-12 h-12 border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-lg font-black text-gray-400">{artisan.fullName.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-gray-950 text-sm">{artisan.fullName}</h2>
              {artisan.isVerified && <span className="text-[9px] font-black bg-green-100 text-green-800 px-1.5 py-0.5">✓ VERIFIED</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{artisan.category} · {artisan.trustScore}% Trust</p>
          </div>
          <span className="text-xl font-black text-gray-950">{naira(booking.totalCharge)}</span>
        </div>

        {/* Payment breakdown */}
        <div className="border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Summary</p>
          </div>
          <div className="px-4 py-3 space-y-2.5">
            <Row label={diagnosis.issue_title} value={naira(booking.quoteAmount)} />
            <Row label="Platform fee (2%)" value={naira(booking.userFee)} muted />
            <div className="border-t border-gray-100 pt-2.5">
              <Row label="Total charged" value={naira(booking.totalCharge)} bold />
            </div>
            <div className="border-t border-gray-100 pt-2.5">
              <Row label="AI estimate was" value={`${naira(diagnosis.estimated_min_naira)} – ${naira(diagnosis.estimated_max_naira)}`} muted />
              <Row label="Artisan payout (after 10% fee)" value={naira(booking.quoteAmount - booking.artisanFee)} muted />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {error && (
            <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-semibold">{error}</div>
          )}

          {!isFunded && (
            <>
              <button
                onClick={fundEscrow}
                disabled={isWorking}
                className="w-full py-4 bg-green-700 text-white font-black text-base hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isWorking && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isWorking ? "Redirecting…" : `Pay ${naira(booking.totalCharge)} via Paystack →`}
              </button>
              <p className="text-center text-xs text-gray-400">
                Secured by Paystack escrow · funds held until job is complete
              </p>
            </>
          )}

          {isFunded && (
            <>
              {booking.escrowStatus === "completed" && (
                <div className="bg-green-50 border border-green-200 px-4 py-3 text-sm font-semibold text-green-800">
                  ✓ Work completed. Inspect and release payment when satisfied.
                </div>
              )}
              {booking.escrowStatus === "disputed" && (
                <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-800">
                  Dispute open — <Link href="/admin" className="underline font-black">Admin Console</Link> is reviewing.
                </div>
              )}
              {booking.escrowStatus === "released" && (
                <div className="bg-green-50 border border-green-200 px-4 py-3 text-sm font-semibold text-green-900">
                  ✓ {naira(booking.quoteAmount - booking.artisanFee)} sent to artisan. Job complete!
                </div>
              )}

              <button
                onClick={() => run("user_release")}
                disabled={isWorking || !canRelease}
                title={!canRelease ? "Available after artisan marks job complete" : ""}
                className="w-full py-4 bg-gray-950 text-white font-black hover:bg-gray-800 transition-colors disabled:opacity-30"
              >
                {canRelease ? `Release ${naira(booking.quoteAmount)} to Artisan` : "Awaiting artisan completion…"}
              </button>

              {canDispute && !showDispute && (
                <button
                  onClick={() => setShowDispute(true)}
                  className="w-full py-3 border border-red-200 text-red-600 text-sm font-black hover:bg-red-50 transition-colors"
                >
                  Open Dispute
                </button>
              )}
              {showDispute && (
                <div className="border border-red-200 p-4 space-y-3">
                  <p className="text-sm font-black text-gray-950">Describe the issue</p>
                  <textarea
                    value={disputeText}
                    onChange={(e) => setDisputeText(e.target.value)}
                    className="w-full border border-gray-200 p-3 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="The artisan left without completing the work…"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => run("open_dispute")} disabled={isWorking} className="flex-1 py-2.5 bg-red-600 text-white text-sm font-black hover:bg-red-700 disabled:opacity-50">
                      Submit
                    </button>
                    <button onClick={() => setShowDispute(false)} className="flex-1 py-2.5 border border-gray-200 text-sm font-black text-gray-700 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, muted = false, bold = false }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className={`text-sm ${muted ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
      <span className={`text-sm text-right ${bold ? "font-black text-gray-950 text-base" : muted ? "text-gray-400" : "font-semibold text-gray-950"}`}>{value}</span>
    </div>
  );
}
