"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { escrowAction, loadDb, updateArtisan } from "@/lib/demo-db";
import { generateDisputeSummary } from "@/app/actions";
import { DisputeSummary, HandijobDB } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  pending:  "bg-yellow-100 text-yellow-700",
};
const ESCROW_BADGE: Record<string, string> = {
  funded:      "bg-yellow-100 text-yellow-700",
  accepted:    "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed:   "bg-green-100 text-green-700",
  released:    "bg-gray-100 text-gray-500",
  disputed:    "bg-red-100 text-red-700",
  refunded:    "bg-gray-100 text-gray-400",
  not_funded:  "bg-gray-50 text-gray-400",
};

export default function AdminPage() {
  const [db, setDb] = useState<HandijobDB | null>(null);
  const [disputeSummaries, setDisputeSummaries] = useState<Record<string, DisputeSummary>>({});
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const refresh = () => setDb(loadDb());
  useEffect(() => {
    refresh();
    window.addEventListener("handijob-db-updated", refresh);
    return () => window.removeEventListener("handijob-db-updated", refresh);
  }, []);

  const runEscrow = (bookingId: string, action: "admin_release" | "admin_refund", note: string) => {
    setActionErrors((prev) => ({ ...prev, [bookingId]: "" }));
    try { setDb(escrowAction(bookingId, action, note)); }
    catch (err) { setActionErrors((prev) => ({ ...prev, [bookingId]: err instanceof Error ? err.message : "Action failed." })); }
  };

  const getDisputeSummary = async (disputeId: string) => {
    if (!db) return;
    const dispute = db.disputes.find((d) => d.id === disputeId);
    if (!dispute) return;
    const booking = db.bookings.find((b) => b.id === dispute.bookingId);
    const job = db.job_requests.find((j) => j.id === dispute.jobId);
    const diagnosis = db.diagnoses.find((d) => d.id === job?.diagnosisId);
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
    } finally { setLoadingSummary(null); }
  };

  if (!db) return null;

  const totalEscrow = db.bookings
    .filter((b) => !["released", "refunded"].includes(b.escrowStatus))
    .reduce((s, b) => s + b.quoteAmount, 0);
  const openDisputes = db.disputes.filter((d) => d.status === "open").length;
  const pendingApps = db.artisans.filter((a) => a.applicationStatus === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex h-8 w-8 items-center justify-center bg-green-600 text-sm font-black text-white rounded-lg shrink-0">
            H
          </Link>
          <div>
            <p className="text-sm font-black text-gray-950">Admin Console</p>
            <p className="text-xs text-gray-400 font-semibold">Handijob</p>
          </div>
        </div>
        <Link href="/" className="text-xs font-black text-gray-400 hover:text-gray-950 transition-colors">
          ← Home
        </Link>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`bg-white rounded-2xl border p-4 ${openDisputes > 0 ? "border-red-200" : "border-gray-100"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Open Disputes</p>
            <p className={`text-2xl font-black mt-1 ${openDisputes > 0 ? "text-red-600" : "text-gray-950"}`}>{openDisputes}</p>
          </div>
          <div className={`bg-white rounded-2xl border p-4 ${pendingApps > 0 ? "border-yellow-200" : "border-gray-100"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending Artisans</p>
            <p className={`text-2xl font-black mt-1 ${pendingApps > 0 ? "text-yellow-600" : "text-gray-950"}`}>{pendingApps}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Escrow Locked</p>
            <p className="text-2xl font-black text-gray-950 mt-1">{naira(totalEscrow)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fees Earned</p>
            <p className="text-2xl font-black text-green-600 mt-1">{naira(db.platform_fee_balance)}</p>
          </div>
        </div>

        {/* ── DISPUTES (priority first) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Disputes</p>
            {db.disputes.length > 0 && (
              <span className="rounded-full text-[10px] font-black px-2 py-0.5 bg-red-600 text-white">{db.disputes.length}</span>
            )}
          </div>

          {db.disputes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-sm font-semibold text-gray-400">No disputes. Open one from the booking page to test.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {db.disputes.map((dispute) => {
                const booking = db.bookings.find((b) => b.id === dispute.bookingId);
                const summary = disputeSummaries[dispute.id];
                const RECO_COLOR: Record<string, string> = {
                  refund: "text-red-700", release: "text-green-700",
                  partial_refund: "text-yellow-700", request_evidence: "text-blue-700",
                };
                return (
                  <div key={dispute.id} className={`bg-white rounded-2xl border overflow-hidden ${dispute.status === "open" ? "border-red-200" : "border-gray-100"}`}>
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-block rounded-full text-[10px] font-black px-2.5 py-1 ${dispute.status === "open" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                              {dispute.status.replaceAll("_", " ")}
                            </span>
                            {booking && (
                              <span className={`inline-block rounded-full text-[10px] font-black px-2.5 py-1 ${ESCROW_BADGE[booking.escrowStatus] ?? ""}`}>
                                {booking.escrowStatus.replaceAll("_", " ")}
                              </span>
                            )}
                            {booking && <span className="text-xs font-black text-gray-950">{naira(booking.quoteAmount)}</span>}
                          </div>
                          <p className="text-sm font-semibold text-gray-950">{dispute.reason}</p>
                        </div>
                        <button
                          onClick={() => getDisputeSummary(dispute.id)}
                          disabled={loadingSummary === dispute.id}
                          className="shrink-0 px-3 py-2 bg-gray-950 text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
                        >
                          {loadingSummary === dispute.id ? "Analyzing…" : "AI Summary"}
                        </button>
                      </div>

                      {summary && (
                        <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs space-y-1.5">
                          <p className="text-gray-500">{summary.reasoning}</p>
                          <p>
                            <span className="font-black text-gray-800">Recommendation: </span>
                            <span className={`font-black uppercase ${RECO_COLOR[summary.recommended_action] ?? "text-gray-700"}`}>
                              {summary.recommended_action.replaceAll("_", " ")}
                            </span>
                          </p>
                        </div>
                      )}

                      {dispute.status === "open" && booking && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => runEscrow(booking.id, "admin_release", "Admin released after dispute review.")}
                            className="flex-1 py-2.5 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 transition-colors"
                          >
                            Release to Artisan
                          </button>
                          <button
                            onClick={() => runEscrow(booking.id, "admin_refund", "Admin refunded user after dispute review.")}
                            className="flex-1 py-2.5 border border-red-200 text-red-600 text-xs font-black rounded-xl hover:bg-red-50 transition-colors"
                          >
                            Refund to User
                          </button>
                        </div>
                      )}
                      {actionErrors[booking?.id ?? ""] && (
                        <p className="text-xs text-red-600 font-semibold">{actionErrors[booking?.id ?? ""]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── ARTISAN APPROVALS */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Artisan Approvals</p>
            {pendingApps > 0 && (
              <span className="rounded-full text-[10px] font-black px-2 py-0.5 bg-yellow-500 text-white">{pendingApps}</span>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {db.artisans.map((artisan, i) => (
              <div key={artisan.id} className={`px-5 py-4 flex items-center gap-3 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-gray-950 text-sm truncate">{artisan.fullName}</p>
                    <span className={`inline-block rounded-full text-[10px] font-black px-2.5 py-1 ${STATUS_BADGE[artisan.applicationStatus] ?? ""}`}>
                      {artisan.applicationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">{artisan.category} · {artisan.location}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">Trust score: {artisan.trustScore}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => setDb(updateArtisan(artisan.id, { applicationStatus: "approved", isVerified: true }))}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-black rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setDb(updateArtisan(artisan.id, { applicationStatus: "rejected", isVerified: false }))}
                    className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-black rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setDb(updateArtisan(artisan.id, { trustScore: Math.min(100, artisan.trustScore + 5) }))}
                    className="px-2.5 py-1.5 border border-gray-200 text-gray-600 text-xs font-black rounded-lg hover:bg-gray-50 transition-colors"
                    title="Trust override +5"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => setDb(updateArtisan(artisan.id, { trustScore: Math.max(0, artisan.trustScore - 5) }))}
                    className="px-2.5 py-1.5 border border-gray-200 text-gray-600 text-xs font-black rounded-lg hover:bg-gray-50 transition-colors"
                    title="Trust override −5"
                  >
                    −5
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAYMENTS (collapsed) */}
        <details className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <summary className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span>Payments &amp; Escrow ({db.bookings.length})</span>
            <span className="text-gray-300">▾</span>
          </summary>
          <div className="border-t border-gray-100">
            {db.bookings.length === 0 ? (
              <p className="text-xs text-gray-400 font-semibold py-6 text-center">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <Th>Reference</Th>
                      <Th>Artisan</Th>
                      <Th>Status</Th>
                      <Th>Amount</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.bookings.map((booking) => {
                      const artisan = db.artisans.find((a) => a.id === booking.artisanId);
                      const canAct = !["released", "refunded", "not_funded"].includes(booking.escrowStatus);
                      const err = actionErrors[booking.id];
                      return (
                        <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-5 font-mono text-xs text-gray-400">{booking.opayReference}</td>
                          <td className="pr-4 text-xs font-semibold text-gray-950">{artisan?.fullName ?? "—"}</td>
                          <td className="pr-4">
                            <span className={`inline-block rounded-full text-[10px] font-black px-2.5 py-1 ${ESCROW_BADGE[booking.escrowStatus] ?? ""}`}>
                              {booking.escrowStatus.replaceAll("_", " ")}
                            </span>
                            {err && <p className="text-[10px] text-red-600 mt-0.5">{err}</p>}
                          </td>
                          <td className="pr-4 font-black text-gray-950 text-xs">{naira(booking.quoteAmount)}</td>
                          <td className="py-3 pr-5">
                            {canAct && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => runEscrow(booking.id, "admin_release", "Admin released.")}
                                  className="px-2.5 py-1 bg-green-600 text-white text-[10px] font-black rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Release
                                </button>
                                <button
                                  onClick={() => runEscrow(booking.id, "admin_refund", "Admin refunded.")}
                                  className="px-2.5 py-1 border border-red-200 text-red-600 text-[10px] font-black rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  Refund
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>

        {/* ── ADVANCED: Ledger (collapsed) */}
        <details className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <summary className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span>Advanced — Escrow Ledger ({db.escrow_transactions.length})</span>
            <span className="text-gray-300">▾</span>
          </summary>
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <Th>Reference</Th>
                  <Th>Action</Th>
                  <Th>Amount</Th>
                  <Th>Fee</Th>
                  <Th>Actor</Th>
                </tr>
              </thead>
              <tbody>
                {db.escrow_transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-5 font-mono text-gray-400">{tx.reference}</td>
                    <td className="pr-4 text-gray-700 capitalize">{tx.action.replaceAll("_", " ")}</td>
                    <td className="pr-4 font-semibold text-gray-950">{naira(tx.amount)}</td>
                    <td className="pr-4 text-gray-500">{naira(tx.platformFee)}</td>
                    <td className="pr-5 capitalize text-gray-500">{tx.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

      </main>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="pb-2 px-5 pt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">{children}</th>;
}
