"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { escrowAction, loadDb } from "@/lib/demo-db";
import { createPaymentIntent } from "@/lib/opay-simulator";
import { Artisan, Booking, DiagnosisRecord, HandijobDB, JobRequest } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

const STATUS_META: Record<string, { label: string; color: string; hint: string }> = {
  not_funded:  { label: "Awaiting Payment",    color: "bg-gray-100 text-gray-600",    hint: "Fund escrow to start." },
  funded:      { label: "Escrow Funded",        color: "bg-yellow-100 text-yellow-700", hint: "Waiting for artisan to accept." },
  accepted:    { label: "Artisan Accepted",     color: "bg-blue-100 text-blue-700",    hint: "Artisan is on the way." },
  in_progress: { label: "In Progress",          color: "bg-purple-100 text-purple-700", hint: "Funds locked until completion." },
  completed:   { label: "Job Completed",        color: "bg-green-100 text-green-700",  hint: "Inspect work and release funds." },
  released:    { label: "Payment Released",     color: "bg-green-100 text-green-800",  hint: "Job complete. Payment sent." },
  disputed:    { label: "Dispute Open",         color: "bg-red-100 text-red-700",      hint: "Admin is reviewing." },
  refunded:    { label: "Refunded",             color: "bg-gray-100 text-gray-600",    hint: "Payment returned to wallet." },
};

export default function BookingPage() {
  const router = useRouter();
  const [db, setDb] = useState<HandijobDB | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [disputeText, setDisputeText] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("bookingId");
    const loaded = loadDb();
    setBookingId(id || loaded.bookings[0]?.id || null);
    setDb(loaded);
  }, []);

  useEffect(() => {
    const refresh = () => setDb(loadDb());
    window.addEventListener("handijob-db-updated", refresh);
    return () => window.removeEventListener("handijob-db-updated", refresh);
  }, []);

  const data = useMemo(() => {
    if (!db || !bookingId) return null;
    const booking = db.bookings.find((b) => b.id === bookingId) as Booking | undefined;
    const job = booking ? db.job_requests.find((j) => j.id === booking.jobId) as JobRequest | undefined : undefined;
    const artisan = booking ? db.artisans.find((a) => a.id === booking.artisanId) as Artisan | undefined : undefined;
    const diagnosis = job ? db.diagnoses.find((d) => d.id === job.diagnosisId) as DiagnosisRecord | undefined : undefined;
    const user = booking ? db.users.find((u) => u.id === booking.userId) : undefined;
    return booking && job && artisan && diagnosis && user ? { booking, job, artisan, diagnosis, user } : null;
  }, [db, bookingId]);

  const run = (action: "fund_escrow" | "user_release" | "open_dispute") => {
    if (!data) return;
    setIsWorking(true);
    setError("");
    try {
      const note = action === "open_dispute" ? (disputeText.trim() || "User opened a dispute.") : "";
      const updated = escrowAction(data.booking.id, action, note);
      setDb(updated);
      if (action === "fund_escrow") {
        createPaymentIntent({ bookingId: data.booking.id, amount: data.booking.totalCharge, phone: data.user.phone });
      }
      if (action === "user_release") setTimeout(() => router.push("/dashboard"), 600);
      setShowDispute(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsWorking(false);
    }
  };

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

  const { booking, artisan, diagnosis, user } = data;
  const isFunded = booking.escrowStatus !== "not_funded";
  const canRelease = booking.escrowStatus === "completed";
  const canDispute = ["funded", "accepted", "in_progress", "completed"].includes(booking.escrowStatus);
  const meta = STATUS_META[booking.escrowStatus] ?? STATUS_META.not_funded;

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link href="/report" className="text-gray-400 hover:text-gray-950 text-sm font-black transition-colors">← Back</Link>
        <span className="text-gray-200">/</span>
        <span className="text-sm font-black text-gray-950">Booking</span>
        <span className="ml-auto font-mono text-xs text-gray-400">{booking.opayReference}</span>
      </div>

      <main className="max-w-md mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Status pill */}
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 ${meta.color}`}>{meta.label}</span>
          <span className="text-sm text-gray-500">{meta.hint}</span>
        </div>

        {/* Artisan card */}
        <div className="border border-gray-200 p-4 flex items-center gap-4">
          <Image unoptimized src={artisan.avatar} alt={artisan.fullName} width={48} height={48} className="border border-gray-200 shrink-0" />
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
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Wallet balance</span>
                <span className={`font-black ${user.user_wallet_balance >= booking.totalCharge ? "text-gray-950" : "text-red-600"}`}>
                  {naira(user.user_wallet_balance)}
                </span>
              </div>
              {user.user_wallet_balance < booking.totalCharge && (
                <p className="text-xs text-red-600 font-semibold">Insufficient balance. Top up your wallet.</p>
              )}
              <button
                onClick={() => run("fund_escrow")}
                disabled={isWorking || user.user_wallet_balance < booking.totalCharge}
                className="w-full py-4 bg-green-700 text-white font-black text-base hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isWorking && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isWorking ? "Processing…" : `Pay ${naira(booking.totalCharge)} →`}
              </button>
              <p className="text-center text-xs text-gray-400">
                Secured by OPay escrow ·{" "}
                <Link href="/opay-simulator" className="underline hover:text-gray-950">view simulator</Link>
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
                    <button onClick={() => run("open_dispute")} disabled={isWorking} className="flex-1 py-2.5 bg-red-600 text-white text-sm font-black hover:bg-red-700 disabled:opacity-50">Submit</button>
                    <button onClick={() => setShowDispute(false)} className="flex-1 py-2.5 border border-gray-200 text-sm font-black text-gray-700 hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              <Link href="/opay-simulator" className="block text-center text-xs text-gray-400 hover:text-gray-950 font-semibold transition-colors">
                View in OPay Simulator →
              </Link>
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
