"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { escrowAction, loadDb, resetDemoDb, updateArtisan } from "@/lib/demo-db";
import { generateDisputeSummary } from "@/app/actions";
import { DisputeSummary, FixMateDB } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
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
    <div className="min-h-screen bg-white font-sans pb-16">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-7 w-7 items-center justify-center bg-green-700 text-xs font-black text-white shrink-0">F</Link>
          <h1 className="text-sm font-black text-gray-950">Admin Console</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/opay-simulator" className="text-xs font-black text-blue-600 hover:text-blue-800 transition-colors">OPay Sim</Link>
          <button onClick={() => { resetDemoDb(); refresh(); }} className="text-xs font-black text-gray-400 hover:text-red-600 transition-colors">Reset</button>
          <Link href="/" className="text-xs font-black text-gray-400 hover:text-gray-950 transition-colors">Home</Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* Top metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Escrow Locked"    value={naira(totalEscrow)} />
          <StatCard label="Fees Earned"      value={naira(db.platform_fee_balance)} green />
          <StatCard label="Open Disputes"    value={String(openDisputes)}  warn={openDisputes > 0} />
          <StatCard label="Pending Artisans" value={String(pendingApps)} warn={pendingApps > 0} />
        </div>

        {/* ── DISPUTES (most urgent first) ────────────────────────────── */}
        <Section title="Disputes" count={db.disputes.length}>
          {db.disputes.length === 0 && <Empty text="No disputes. Open one from the booking page to test." />}
          <div className="space-y-3">
            {db.disputes.map((dispute) => {
              const booking = db.bookings.find((b) => b.id === dispute.bookingId);
              const summary = disputeSummaries[dispute.id];
              const RECO_COLOR: Record<string, string> = { refund: "text-red-700", release: "text-green-700", partial_refund: "text-yellow-700", request_evidence: "text-blue-700" };
              return (
                <div key={dispute.id} className={`border p-4 space-y-3 ${dispute.status === "open" ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${dispute.status === "open" ? "bg-red-200 text-red-800" : "bg-gray-200 text-gray-600"}`}>
                          {dispute.status}
                        </span>
                        {booking && <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${ESCROW_BADGE[booking.escrowStatus] ?? ""}`}>{booking.escrowStatus}</span>}
                        {booking && <span className="text-xs font-black text-gray-500">{naira(booking.quoteAmount)}</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-950">{dispute.reason}</p>
                    </div>
                    <button
                      onClick={() => getDisputeSummary(dispute.id)}
                      disabled={loadingSummary === dispute.id}
                      className="shrink-0 px-3 py-1.5 bg-gray-950 text-white text-xs font-black hover:bg-gray-800 transition-colors disabled:opacity-40"
                    >
                      {loadingSummary === dispute.id ? "Analyzing…" : "AI Summary"}
                    </button>
                  </div>

                  {summary && (
                    <div className="bg-white border border-gray-200 p-3 text-xs space-y-1.5">
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
                      <button onClick={() => runEscrow(booking.id, "admin_release", "Admin released after dispute review.")} className="flex-1 py-2 bg-gray-950 text-white text-xs font-black hover:bg-gray-800 transition-colors">Release to Artisan</button>
                      <button onClick={() => runEscrow(booking.id, "admin_refund", "Admin refunded user after dispute review.")} className="flex-1 py-2 border border-red-200 text-red-600 text-xs font-black hover:bg-red-50 transition-colors">Refund to User</button>
                    </div>
                  )}
                  {actionErrors[booking?.id ?? ""] && <p className="text-xs text-red-600 font-semibold">{actionErrors[booking?.id ?? ""]}</p>}
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── ESCROW / PAYMENTS ───────────────────────────────────────── */}
        <Section title="Escrow & Payments" count={db.bookings.length}>
          {db.bookings.length === 0 && <Empty text="No bookings yet." />}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
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
                    <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4 font-mono text-xs text-gray-500">{booking.opayReference}</td>
                      <td className="pr-4 text-xs font-semibold text-gray-950">{artisan?.fullName ?? "—"}</td>
                      <td className="pr-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${ESCROW_BADGE[booking.escrowStatus] ?? ""}`}>
                          {booking.escrowStatus.replaceAll("_", " ")}
                        </span>
                        {err && <p className="text-[10px] text-red-600 mt-0.5">{err}</p>}
                      </td>
                      <td className="pr-4 font-black text-gray-950 text-xs">{naira(booking.quoteAmount)}</td>
                      <td>
                        {canAct && (
                          <div className="flex gap-1.5">
                            <button onClick={() => runEscrow(booking.id, "admin_release", "Admin released.")} className="px-2.5 py-1 bg-gray-950 text-white text-[10px] font-black hover:bg-gray-800 transition-colors">Release</button>
                            <button onClick={() => runEscrow(booking.id, "admin_refund", "Admin refunded.")} className="px-2.5 py-1 border border-red-200 text-red-600 text-[10px] font-black hover:bg-red-50 transition-colors">Refund</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── ARTISAN APPROVALS ───────────────────────────────────────── */}
        <Section title="Artisans" count={db.artisans.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {db.artisans.map((artisan) => {
                  return (
                    <tr key={artisan.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <p className="font-black text-gray-950 text-sm">{artisan.fullName}</p>
                        <p className="text-xs text-gray-400">{artisan.location}</p>
                      </td>
                      <td className="pr-4 text-xs text-gray-600">{artisan.category}</td>
                      <td className="pr-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${STATUS_BADGE[artisan.applicationStatus] ?? ""}`}>
                          {artisan.applicationStatus}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1.5 flex-wrap">
                          <button onClick={() => setDb(updateArtisan(artisan.id, { applicationStatus: "approved", isVerified: true }))} className="px-2.5 py-1 bg-green-700 text-white text-[10px] font-black hover:bg-green-800 transition-colors">Approve</button>
                          <button onClick={() => setDb(updateArtisan(artisan.id, { applicationStatus: "rejected", isVerified: false }))} className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-black hover:bg-red-700 transition-colors">Reject</button>
                          <button onClick={() => setDb(updateArtisan(artisan.id, { trustScore: Math.min(100, artisan.trustScore + 5) }))} className="px-2 py-1 border border-gray-200 text-[10px] font-black hover:bg-gray-50 transition-colors">+5</button>
                          <button onClick={() => setDb(updateArtisan(artisan.id, { trustScore: Math.max(0, artisan.trustScore - 5) }))} className="px-2 py-1 border border-gray-200 text-[10px] font-black hover:bg-gray-50 transition-colors">−5</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── LEDGER (collapsed) ──────────────────────────────────────── */}
        <details className="border border-gray-100">
          <summary className="px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400 cursor-pointer hover:bg-gray-50 select-none">
            Escrow Ledger ({db.escrow_transactions.length} transactions) ▸
          </summary>
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-xs text-left border-collapse mt-2">
              <thead>
                <tr className="border-b border-gray-200">
                  <Th>Reference</Th>
                  <Th>Action</Th>
                  <Th>Amount</Th>
                  <Th>Fee</Th>
                  <Th>Actor</Th>
                </tr>
              </thead>
              <tbody>
                {db.escrow_transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 pr-3 font-mono text-gray-400">{tx.reference}</td>
                    <td className="pr-3 text-gray-700">{tx.action.replaceAll("_", " ")}</td>
                    <td className="pr-3 font-semibold text-gray-950">{naira(tx.amount)}</td>
                    <td className="pr-3 text-gray-500">{naira(tx.platformFee)}</td>
                    <td className="capitalize text-gray-500">{tx.actor}</td>
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

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="bg-gray-950 text-white text-[10px] font-black px-1.5 py-0.5">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, green = false, warn = false }: { label: string; value: string; green?: boolean; warn?: boolean }) {
  return (
    <div className={`border p-4 ${warn && value !== "0" ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-black ${green ? "text-green-700" : warn && value !== "0" ? "text-red-700" : "text-gray-950"}`}>{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="pb-2 pr-4 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">{children}</th>;
}

function Empty({ text }: { text: string }) {
  return <div className="py-6 text-center text-sm text-gray-400 border border-gray-100">{text}</div>;
}
