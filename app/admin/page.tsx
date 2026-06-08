"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { escrowAction, loadDb, resetDemoDb, updateArtisan } from "@/lib/demo-db";
import { calculateTrustScore, getTrustTier, TRUST_SCORE_WEIGHTS } from "@/lib/trust-score";
import { generateDisputeSummary } from "@/app/actions";
import { DisputeSummary, FixMateDB } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

export default function AdminPage() {
  const [db, setDb] = useState<FixMateDB | null>(null);
  const [disputeSummaries, setDisputeSummaries] = useState<Record<string, DisputeSummary>>({});
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const refresh = () => setDb(loadDb());
  useEffect(() => {
    refresh();
    window.addEventListener("fixmate-db-updated", refresh);
    return () => window.removeEventListener("fixmate-db-updated", refresh);
  }, []);

  const runEscrow = (bookingId: string, action: "admin_release" | "admin_refund", note: string) => {
    setActionErrors((prev) => ({ ...prev, [bookingId]: "" }));
    try {
      setDb(escrowAction(bookingId, action, note));
    } catch (err) {
      setActionErrors((prev) => ({ ...prev, [bookingId]: err instanceof Error ? err.message : "Action failed." }));
    }
  };

  const getDisputeSummary = async (disputeId: string) => {
    if (!db) return;
    const dispute = db.disputes.find((d) => d.id === disputeId);
    if (!dispute) return;
    const booking = db.bookings.find((b) => b.id === dispute.bookingId);
    const diagnosis = db.diagnoses.find((d) => {
      const job = db.job_requests.find((j) => j.id === dispute.jobId);
      return d.id === job?.diagnosisId;
    });
    setLoadingSummary(disputeId);
    try {
      const summary = await generateDisputeSummary({
        userComplaint: dispute.reason,
        artisanStatus: booking?.escrowStatus ?? "unknown",
        escrowStatus: booking?.escrowStatus ?? "unknown",
        diagnosisTitle: diagnosis?.issue_title ?? "Unknown issue",
        quoteAmount: booking?.quoteAmount ?? 0,
      });
      setDisputeSummaries((prev) => ({ ...prev, [disputeId]: summary }));
    } finally {
      setLoadingSummary(null);
    }
  };

  if (!db) return null;

  const totalEscrow = db.bookings.filter((b) => !["released", "refunded"].includes(b.escrowStatus))
    .reduce((sum, b) => sum + b.quoteAmount, 0);
  const openDisputes = db.disputes.filter((d) => d.status === "open").length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <header className="bg-white px-4 sm:px-6 py-4 flex items-center justify-between border-b shadow-sm mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">FixMate</p>
          <h1 className="text-xl font-bold text-gray-900">Admin Console</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/opay-simulator" className="text-xs font-bold text-blue-700 underline">OPay Sim</Link>
          <button onClick={() => { resetDemoDb(); refresh(); }} className="text-xs text-red-500 hover:text-red-700 font-semibold">Reset Demo</button>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-2 space-y-6">

        {/* Demo banner */}
        <div className="bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <strong>Demo Mode</strong> — All actions update the local simulated OPay escrow ledger.
          No real funds move. This panel demonstrates platform admin capabilities for hackathon judges.
        </div>

        {/* Platform metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Total Escrow Locked" value={naira(totalEscrow)} />
          <Stat label="Platform Fees Earned" value={naira(db.platform_fee_balance)} />
          <Stat label="Open Disputes" value={String(openDisputes)} warn={openDisputes > 0} />
          <Stat label="Artisan Applications" value={String(db.artisans.filter((a) => a.applicationStatus === "pending").length)} />
        </div>

        {/* Trust score info */}
        <Section title="Trust Score Formula">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TRUST_SCORE_WEIGHTS.map((w) => (
              <div key={w.label} className="bg-gray-50 border border-gray-100 p-3">
                <p className="text-sm font-bold text-gray-800">{w.label}</p>
                <p className="text-2xl font-black text-green-700 mt-1">{w.weight}</p>
                <p className="text-xs text-gray-500 mt-0.5">{w.hint}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Trust scores are calculated automatically from jobs, reviews, disputes, and profile completeness.
            Admin can still approve/reject artisans manually.
          </p>
        </Section>

        {/* Artisan applications */}
        <Section title="Artisan Applications & Trust Scores">
          {db.artisans.map((artisan) => {
            const artisanJobs = db.job_requests.filter((j) => j.selectedArtisanId === artisan.id);
            const artisanReviews = db.reviews.filter((r) => r.artisanId === artisan.id);
            const artisanDisputes = db.disputes.filter((d) => d.artisanId === artisan.id);
            const trust = calculateTrustScore(artisan, artisanJobs, artisanReviews, artisanDisputes);
            const tier = getTrustTier(trust.total);
            return (
              <div key={artisan.id} className="p-4 border border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-bold text-gray-900">{artisan.fullName}</h2>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 ${
                      artisan.applicationStatus === "approved" ? "bg-green-100 text-green-800" :
                      artisan.applicationStatus === "rejected" ? "bg-red-100 text-red-800" :
                                                                  "bg-yellow-100 text-yellow-800"
                    }`}>{artisan.applicationStatus}</span>
                    {artisan.isVerified && <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5">✓ Verified</span>}
                  </div>
                  <p className="text-sm text-gray-500">{artisan.category} · {artisan.location}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-24 bg-gray-200 h-1.5">
                        <div className="bg-green-600 h-1.5 transition-all" style={{ width: `${trust.total}%` }} />
                      </div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 ${tier.color}`}>{trust.total}% · {tier.label}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{trust.reasons.join(" · ")}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button onClick={() => setDb(updateArtisan(artisan.id, { applicationStatus: "approved", isVerified: true }))} className="px-3 py-1.5 bg-green-700 text-white text-xs font-bold hover:bg-green-800">Approve</button>
                  <button onClick={() => setDb(updateArtisan(artisan.id, { applicationStatus: "rejected", isVerified: false }))} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold hover:bg-red-700">Reject</button>
                  <button onClick={() => setDb(updateArtisan(artisan.id, { trustScore: Math.min(100, artisan.trustScore + 5) }))} className="px-3 py-1.5 bg-white border text-xs font-bold hover:bg-gray-50">+5 Trust</button>
                  <button onClick={() => setDb(updateArtisan(artisan.id, { trustScore: Math.max(0, artisan.trustScore - 5) }))} className="px-3 py-1.5 bg-white border text-xs font-bold hover:bg-gray-50">−5 Trust</button>
                </div>
              </div>
            );
          })}
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active jobs */}
          <Section title="Active Jobs">
            {db.job_requests.length === 0 && <Empty text="No jobs yet." />}
            {db.job_requests.map((job) => {
              const diagnosis = db.diagnoses.find((d) => d.id === job.diagnosisId);
              const artisan = db.artisans.find((a) => a.id === job.selectedArtisanId);
              return (
                <div key={job.id} className="p-3 border border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-900 text-sm">{diagnosis?.issue_title ?? job.description}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{job.status.replaceAll("_", " ")} · {artisan?.fullName ?? "No artisan"}</p>
                </div>
              );
            })}
          </Section>

          {/* Escrow control */}
          <Section title="Escrow Control">
            {db.bookings.length === 0 && <Empty text="No bookings yet." />}
            {db.bookings.map((booking) => {
              const artisan = db.artisans.find((a) => a.id === booking.artisanId);
              const job = db.job_requests.find((j) => j.id === booking.jobId);
              const err = actionErrors[booking.id];
              const canAct = !["released", "refunded", "not_funded"].includes(booking.escrowStatus);
              return (
                <div key={booking.id} className="p-3 border border-gray-100 bg-gray-50">
                  <div className="flex justify-between gap-3 items-start mb-2">
                    <div>
                      <p className="font-mono text-xs font-bold text-gray-900">{booking.opayReference}</p>
                      <p className="text-xs text-gray-500">{artisan?.fullName} · {booking.escrowStatus}</p>
                      <p className="text-xs text-gray-400">{job?.status.replaceAll("_", " ")}</p>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{naira(booking.quoteAmount)}</p>
                  </div>
                  {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
                  {canAct && (
                    <div className="flex gap-2">
                      <button onClick={() => runEscrow(booking.id, "admin_release", "Admin released escrow.")} className="flex-1 py-1.5 bg-gray-900 text-white text-xs font-bold hover:bg-gray-800">Release</button>
                      <button onClick={() => runEscrow(booking.id, "admin_refund", "Admin refunded user.")} className="flex-1 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50">Refund</button>
                    </div>
                  )}
                </div>
              );
            })}
          </Section>
        </div>

        {/* Disputes with AI summary */}
        <Section title="Disputes">
          {db.disputes.length === 0 && <Empty text="No disputes yet. Open one from the booking page." />}
          {db.disputes.map((dispute) => {
            const booking = db.bookings.find((b) => b.id === dispute.bookingId);
            const summary = disputeSummaries[dispute.id];
            return (
              <div key={dispute.id} className={`p-4 border ${dispute.status === "open" ? "border-red-100 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div>
                    <p className={`text-xs font-bold px-2 py-0.5 w-fit mb-1 ${dispute.status === "open" ? "bg-red-200 text-red-800" : "bg-gray-200 text-gray-700"}`}>
                      {dispute.status.replaceAll("_", " ")}
                    </p>
                    <p className="font-bold text-gray-900">{dispute.reason}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Escrow: {booking?.escrowStatus ?? "unknown"} · {naira(booking?.quoteAmount ?? 0)}</p>
                  </div>
                  <button
                    onClick={() => getDisputeSummary(dispute.id)}
                    disabled={loadingSummary === dispute.id}
                    className="shrink-0 px-3 py-1.5 bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 disabled:opacity-50"
                  >
                    {loadingSummary === dispute.id ? "Analyzing..." : "AI Summary"}
                  </button>
                </div>

                {summary && (
                  <div className="bg-white border border-blue-100 p-3 text-xs space-y-1.5 mb-3">
                    <p><strong>User complaint:</strong> {summary.user_complaint}</p>
                    <p><strong>Artisan status:</strong> {summary.artisan_status}</p>
                    <p><strong>Payment state:</strong> {summary.payment_state}</p>
                    <p><strong>Gemini recommendation:</strong>{" "}
                      <span className={`font-bold ${summary.recommended_action === "refund" ? "text-red-700" : summary.recommended_action === "release" ? "text-green-700" : "text-blue-700"}`}>
                        {summary.recommended_action.replaceAll("_", " ").toUpperCase()}
                      </span>
                    </p>
                    <p className="text-gray-600">{summary.reasoning}</p>
                  </div>
                )}

                {dispute.status === "open" && booking && (
                  <div className="flex gap-2">
                    <button onClick={() => runEscrow(booking.id, "admin_release", "Admin released after dispute review.")} className="flex-1 py-1.5 bg-gray-900 text-white text-xs font-bold">Release to Artisan</button>
                    <button onClick={() => runEscrow(booking.id, "admin_refund", "Admin refunded user after dispute review.")} className="flex-1 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold">Refund to User</button>
                  </div>
                )}
              </div>
            );
          })}
        </Section>

        {/* Full ledger */}
        <Section title="Escrow Ledger">
          {db.escrow_transactions.length === 0 && <Empty text="No transactions yet." />}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3">Reference</th>
                  <th className="pr-3">Action</th>
                  <th className="pr-3">Amount</th>
                  <th className="pr-3">Platform Fee</th>
                  <th className="pr-3">Actor</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {db.escrow_transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 pr-3 font-mono">{tx.reference}</td>
                    <td className="pr-3">{tx.action.replaceAll("_", " ")}</td>
                    <td className="pr-3 font-semibold">{naira(tx.amount)}</td>
                    <td className="pr-3">{naira(tx.platformFee)}</td>
                    <td className="pr-3 capitalize">{tx.actor}</td>
                    <td className="text-gray-400 max-w-[160px] truncate">{tx.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 p-5 sm:p-6 space-y-3">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}
function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`bg-white border p-4 ${warn && value !== "0" ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${warn && value !== "0" ? "text-red-700" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 border border-gray-100">{text}</div>;
}
