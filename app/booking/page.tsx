"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { escrowAction, loadDb } from "@/lib/demo-db";
import { createPaymentIntent } from "@/lib/opay-simulator";
import { Artisan, Booking, DiagnosisRecord, FixMateDB, JobRequest } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

const ESCROW_STEPS = [
  { key: "not_funded",   label: "Fund Escrow" },
  { key: "funded",       label: "Escrow Funded" },
  { key: "accepted",     label: "Artisan Accepted" },
  { key: "in_progress",  label: "In Progress" },
  { key: "completed",    label: "Artisan Completed" },
  { key: "released",     label: "Released" },
];

export default function BookingPage() {
  const router = useRouter();
  const [db, setDb] = useState<FixMateDB | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [disputeText, setDisputeText] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("bookingId");
    const loaded = loadDb();
    setBookingId(id || loaded.bookings[0]?.id || null);
    setDb(loaded);
  }, []);

  useEffect(() => {
    const refresh = () => setDb(loadDb());
    window.addEventListener("fixmate-db-updated", refresh);
    return () => window.removeEventListener("fixmate-db-updated", refresh);
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
        // Also create OPay payment record for the simulator
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
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">No booking found.</p>
        <Link href="/report" className="bg-green-700 text-white px-5 py-3 font-bold text-sm">Create a job request first</Link>
      </div>
    );
  }

  const { booking, artisan, diagnosis, user } = data;
  const isFunded = booking.escrowStatus !== "not_funded";
  const canRelease = booking.escrowStatus === "completed";
  const canDispute = ["funded", "accepted", "in_progress", "completed"].includes(booking.escrowStatus);
  const activeStep = ESCROW_STEPS.findIndex((s) => s.key === booking.escrowStatus);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-20 animate-fade-in-up">
      <header className="bg-white px-4 sm:px-6 py-4 flex items-center border-b shadow-sm mb-4">
        <Link href="/report" className="text-gray-500 hover:text-gray-800 mr-4 font-bold">← Back</Link>
        <span className="text-xl font-bold text-gray-900">OPay Escrow — {booking.opayReference}</span>
      </header>

      <main className="flex-1 flex flex-col items-center py-6 px-4 sm:px-6 max-w-xl mx-auto w-full gap-5">

        {/* Escrow progress */}
        <div className="w-full bg-white border border-gray-200 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Escrow Progress</p>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {ESCROW_STEPS.map((s, i) => {
              const done = i < activeStep || booking.escrowStatus === s.key;
              const active = booking.escrowStatus === s.key;
              return (
                <div key={s.key} className="flex items-center shrink-0">
                  <div className={`flex flex-col items-center ${i > 0 ? "ml-1" : ""}`}>
                    <div className={`w-6 h-6 rounded-none text-[10px] font-black flex items-center justify-center border-2 ${
                      active ? "bg-green-700 text-white border-green-700" :
                      done  ? "bg-gray-900 text-white border-gray-900" :
                              "bg-white text-gray-300 border-gray-200"
                    }`}>{i + 1}</div>
                    <span className={`text-[9px] mt-1 font-semibold text-center leading-tight max-w-[52px] ${active ? "text-green-700" : done ? "text-gray-700" : "text-gray-300"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < ESCROW_STEPS.length - 1 && (
                    <div className={`h-0.5 w-4 mx-1 mt-[-10px] ${i < activeStep ? "bg-gray-900" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Artisan + cost breakdown */}
        <div className="bg-white border border-gray-200 w-full p-5 sm:p-6">
          <div className="flex items-center gap-4 mb-4">
            <Image unoptimized src={artisan.avatar} alt={artisan.fullName} width={56} height={56} className="border border-gray-200" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">{artisan.fullName}</h1>
              <p className="text-sm text-gray-500">{artisan.category} · {artisan.trustScore}% Trust</p>
              {artisan.isVerified && <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5">✓ VERIFIED</span>}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-4 space-y-2 mb-3">
            <Row label="Issue" value={diagnosis.issue_title} />
            <Row label="Gemini estimate" value={`${naira(diagnosis.estimated_min_naira)} – ${naira(diagnosis.estimated_max_naira)}`} />
            <Row label="Job quote" value={naira(booking.quoteAmount)} />
            <Row label="User escrow fee (2%)" value={naira(booking.userFee)} />
            <Row label="Artisan fee (10%, on release)" value={naira(booking.artisanFee)} />
            <Row label="Artisan net payout" value={naira(booking.quoteAmount - booking.artisanFee)} />
            <Row label="OPay reference" value={booking.opayReference} mono />
          </div>

          <div className="flex justify-between items-center px-4 py-3 bg-green-50 border border-green-100 font-bold text-green-900">
            <span>Total charge to customer</span>
            <span>{naira(booking.totalCharge)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full bg-white border border-gray-200 p-5 sm:p-6">

          {!isFunded && (
            <>
              <div className="bg-amber-50 border border-amber-100 p-3 mb-5 text-xs text-amber-800">
                <strong>Simulated OPay Payment</strong> — No real API connected. Clicking below records the ledger movement and creates an OPay payment reference visible in the{" "}
                <Link href="/opay-simulator" className="font-bold underline text-blue-700">OPay Simulator</Link>.
              </div>
              <Row label="Your wallet balance" value={naira(user.user_wallet_balance)} />
              <Row label="Required" value={naira(booking.totalCharge)} />
              {user.user_wallet_balance < booking.totalCharge && (
                <p className="text-sm text-red-600 mt-2">Insufficient balance. Top up your wallet to fund escrow.</p>
              )}
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              <button
                onClick={() => run("fund_escrow")}
                disabled={isWorking || user.user_wallet_balance < booking.totalCharge}
                className="w-full mt-5 py-4 bg-green-700 text-white font-bold text-lg hover:bg-green-800 disabled:opacity-50"
              >
                {isWorking ? "Processing..." : "Fund Escrow with OPay →"}
              </button>
              <p className="text-xs text-center text-gray-400 mt-2">
                In production this initiates a real OPay checkout and waits for webhook confirmation.
              </p>
            </>
          )}

          {isFunded && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="w-14 h-14 bg-green-50 border-2 border-green-600 flex items-center justify-center">
                  <span className="text-xs font-black text-green-700">LOCKED</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Escrow: {booking.escrowStatus.replaceAll("_", " ")}</p>
                  <p className="text-sm text-gray-500">{naira(booking.quoteAmount)} secured in simulated OPay ledger</p>
                </div>
              </div>

              {/* Status-specific messages */}
              {booking.escrowStatus === "funded" && (
                <div className="bg-yellow-50 border border-yellow-100 p-3 text-xs text-yellow-800">
                  Waiting for artisan to accept the job. Artisan cannot accept until escrow is funded (this has been fixed from earlier bug).
                </div>
              )}
              {booking.escrowStatus === "accepted" && (
                <div className="bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
                  Artisan accepted and is on the way. Awaiting job progress update.
                </div>
              )}
              {booking.escrowStatus === "in_progress" && (
                <div className="bg-purple-50 border border-purple-100 p-3 text-xs text-purple-800">
                  Artisan is working on your job. Funds remain locked until completion.
                </div>
              )}
              {booking.escrowStatus === "completed" && (
                <div className="bg-green-50 border border-green-200 p-3 text-sm font-semibold text-green-800">
                  ✓ Artisan has marked the job complete. Please inspect the work and release funds below.
                </div>
              )}
              {booking.escrowStatus === "disputed" && (
                <div className="bg-red-50 border border-red-200 p-3 text-sm font-semibold text-red-800">
                  Dispute is open. Admin is reviewing — visit <Link href="/admin" className="underline font-bold">Admin Console</Link>.
                </div>
              )}
              {booking.escrowStatus === "released" && (
                <div className="bg-green-50 border border-green-200 p-3 text-sm font-semibold text-green-900">
                  ✓ Payment released. {naira(booking.quoteAmount - booking.artisanFee)} sent to artisan. Job complete!
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={() => run("user_release")}
                disabled={isWorking || !canRelease}
                className="w-full py-4 bg-gray-900 text-white font-bold text-base hover:bg-gray-800 disabled:opacity-40"
                title={!canRelease ? "Can only release after artisan marks job completed" : ""}
              >
                {canRelease ? "Release Funds to Artisan" : `Release locked — awaiting artisan completion`}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Funds release only when artisan marks the job completed. This enforces the escrow contract.
              </p>

              {canDispute && !showDispute && (
                <button
                  onClick={() => setShowDispute(true)}
                  disabled={isWorking}
                  className="w-full py-3 text-red-600 font-semibold text-sm border border-red-100 hover:bg-red-50 disabled:opacity-40"
                >
                  Open Dispute
                </button>
              )}
              {showDispute && (
                <div className="border border-red-100 bg-red-50 p-4 space-y-3">
                  <p className="text-sm font-bold text-red-800">Describe the issue (optional)</p>
                  <textarea
                    value={disputeText}
                    onChange={(e) => setDisputeText(e.target.value)}
                    className="w-full border border-red-200 p-2 text-sm h-20 resize-none"
                    placeholder="e.g. The artisan left without fixing the problem..."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => run("open_dispute")} disabled={isWorking} className="flex-1 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                      Submit Dispute
                    </button>
                    <button onClick={() => setShowDispute(false)} className="flex-1 py-2 border border-gray-300 text-sm font-semibold text-gray-700">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <Link href="/opay-simulator" className="block text-center text-xs text-blue-700 font-semibold underline mt-2">
                View payment in OPay Simulator →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 items-center mb-1.5 last:mb-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`font-semibold text-gray-900 text-sm text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
