"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import JobChat from "@/components/JobChat";
import { CATEGORY_INVENTORY, escrowAction, loadDb, resetDemoDb, saveInventoryItem } from "@/lib/demo-db";
import { FixMateDB } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

const ESCROW_BADGE: Record<string, string> = {
  funded:      "bg-yellow-100 text-yellow-800",
  accepted:    "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed:   "bg-green-100 text-green-800",
  released:    "bg-gray-100 text-gray-600",
  disputed:    "bg-red-100 text-red-700",
  not_funded:  "bg-gray-100 text-gray-400",
};

export default function ArtisanDashboardPage() {
  const [db, setDb] = useState<FixMateDB | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [showInventory, setShowInventory] = useState(false);

  const refresh = () => setDb(loadDb());
  useEffect(() => {
    refresh();
    window.addEventListener("fixmate-db-updated", refresh);
    return () => window.removeEventListener("fixmate-db-updated", refresh);
  }, []);

  if (!db) return null;

  const artisan = db.artisans.find((a) => a.applicationStatus === "approved") ?? db.artisans[0];
  const jobs = db.job_requests.filter((j) => j.selectedArtisanId === artisan.id);
  const inventory = db.inventory_items.filter((i) => i.artisanId === artisan.id);
  const lowStock = inventory.filter((i) => i.quantity <= i.lowStockAt);
  const reviews = db.reviews.filter((r) => r.artisanId === artisan.id);
  const disputes = db.disputes.filter((d) => d.artisanId === artisan.id);
  const suggestedItems = CATEGORY_INVENTORY[artisan.category] ?? [];

  const run = (bookingId: string, action: "artisan_accept" | "artisan_decline" | "mark_in_progress" | "mark_completed") => {
    setActionError((prev) => ({ ...prev, [bookingId]: "" }));
    try { setDb(escrowAction(bookingId, action)); }
    catch (err) { setActionError((prev) => ({ ...prev, [bookingId]: err instanceof Error ? err.message : "Action failed." })); }
  };

  const addInventory = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setDb(saveInventoryItem({
      artisanId: artisan.id,
      name: String(form.get("name") || ""),
      quantity: Number(form.get("quantity") || 0),
      unit: String(form.get("unit") || "pcs"),
      lowStockAt: Number(form.get("lowStockAt") || 1),
    }));
    e.currentTarget.reset();
  };

  const activeJobs = jobs.filter((j) => !["released", "refunded", "declined"].includes(j.status));

  return (
    <div className="min-h-screen bg-white font-sans pb-16">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-7 w-7 items-center justify-center bg-green-700 text-xs font-black text-white shrink-0">F</Link>
          <div>
            <h1 className="text-sm font-black text-gray-950 leading-tight">{artisan.fullName}</h1>
            <p className="text-xs text-gray-400">{artisan.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lowStock.length > 0 && (
            <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-1">⚠ {lowStock.length} low stock</span>
          )}
          <span className={`text-[10px] font-black px-2 py-1 ${artisan.isVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
            {artisan.applicationStatus}
          </span>
          <button onClick={() => { resetDemoDb(); refresh(); }} className="text-xs text-gray-400 hover:text-red-600 font-black transition-colors">Reset</button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Top metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Available" value={naira(artisan.artisan_available_balance)} sub="Ready to withdraw" />
          <MetricCard label="In Escrow" value={naira(artisan.artisan_pending_balance)} sub="Releases on completion" />
          <MetricCard label="Jobs Done" value={String(artisan.completedJobs)} sub={`${reviews.length} review${reviews.length !== 1 ? "s" : ""}`} />
          <MetricCard label="Rating" value={artisan.rating ? `${artisan.rating}★` : "—"} sub={artisan.isVerified ? "✓ Verified" : "Not verified"} />
        </div>

        {/* Active jobs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
              Active Jobs {activeJobs.length > 0 && <span className="ml-1 bg-gray-950 text-white px-1.5 py-0.5 text-[10px]">{activeJobs.length}</span>}
            </h2>
            <span className="text-xs text-gray-400">{artisan.fullName}</span>
          </div>

          {jobs.length === 0 ? (
            <div className="border border-gray-100 p-8 text-center text-sm text-gray-400">
              No assigned jobs. Go to{" "}
              <Link href="/report" className="text-green-700 font-black underline">Report</Link>
              {" "}and select this artisan.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const diagnosis = db.diagnoses.find((d) => d.id === job.diagnosisId);
                const booking = job.bookingId ? db.bookings.find((b) => b.id === job.bookingId) : undefined;
                const customer = db.users.find((u) => u.id === job.userId);
                const brief = diagnosis?.artisan_brief;
                const isExpanded = expandedJob === job.id;
                const escrow = booking?.escrowStatus;
                const canAccept = escrow === "funded";
                const canProgress = escrow === "accepted";
                const canComplete = escrow === "accepted" || escrow === "in_progress";
                const jobErr = actionError[booking?.id ?? ""] ?? "";

                return (
                  <div key={job.id} className="border border-gray-200 overflow-hidden">
                    <div className="p-4 space-y-3">
                      {/* Job header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-gray-950 text-sm leading-snug">{diagnosis?.issue_title ?? job.description}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{customer?.name} · {job.location}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-gray-950 text-sm">{booking ? naira(booking.quoteAmount) : "—"}</p>
                          {booking && <p className="text-[10px] text-gray-400">Net {naira(booking.quoteAmount - (booking.artisanFee ?? 0))}</p>}
                        </div>
                      </div>

                      {/* Status + escrow note */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${ESCROW_BADGE[escrow ?? ""] ?? "bg-gray-100 text-gray-500"}`}>
                          {escrow?.replaceAll("_", " ") ?? job.status.replaceAll("_", " ")}
                        </span>
                        {escrow === "funded" && <span className="text-[11px] text-yellow-700 font-semibold">← Ready to accept</span>}
                        {escrow === "not_funded" && <span className="text-[11px] text-red-500 font-semibold">Escrow not funded yet</span>}
                      </div>

                      {/* Error */}
                      {jobErr && <p className="text-xs text-red-600 font-semibold">{jobErr}</p>}

                      {/* Action buttons */}
                      {booking && (
                        <div className="flex flex-wrap gap-2">
                          {canAccept && (
                            <button onClick={() => run(booking.id, "artisan_accept")} className="px-4 py-2 bg-gray-950 text-white text-xs font-black hover:bg-gray-800 transition-colors">
                              Accept Job
                            </button>
                          )}
                          {canProgress && (
                            <button onClick={() => run(booking.id, "mark_in_progress")} className="px-4 py-2 bg-blue-700 text-white text-xs font-black hover:bg-blue-800 transition-colors">
                              Mark In Progress
                            </button>
                          )}
                          {canComplete && (
                            <button onClick={() => run(booking.id, "mark_completed")} className="px-4 py-2 bg-green-700 text-white text-xs font-black hover:bg-green-800 transition-colors">
                              Mark Completed
                            </button>
                          )}
                          {(escrow === "not_funded" || escrow === "funded") && (
                            <button onClick={() => run(booking.id, "artisan_decline")} className="px-4 py-2 border border-gray-200 text-xs font-black text-gray-600 hover:bg-gray-50 transition-colors">
                              Decline
                            </button>
                          )}
                        </div>
                      )}

                      {/* AI brief toggle */}
                      {brief && (
                        <button
                          onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                          className="text-[11px] font-black text-gray-400 hover:text-gray-950 transition-colors uppercase tracking-wider"
                        >
                          {isExpanded ? "Hide" : "View"} AI Brief ▸
                        </button>
                      )}
                    </div>

                    {isExpanded && brief && (
                      <div className="border-t border-gray-100 bg-blue-50 px-4 py-3 text-xs space-y-1.5 text-gray-700">
                        <p><span className="font-black text-gray-800">Problem:</span> {brief.problem_summary}</p>
                        <p><span className="font-black text-gray-800">Likely cause:</span> {brief.likely_cause}</p>
                        <p><span className="font-black text-gray-800">Tools:</span> {Array.isArray(brief.tools_to_bring) ? brief.tools_to_bring.join(", ") : brief.tools_to_bring}</p>
                        <p><span className="font-black text-gray-800">Estimate:</span> {brief.estimated_price_range}</p>
                      </div>
                    )}

                    <div className="border-t border-gray-100">
                      <JobChat jobId={job.id} currentUserType="artisan" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory (collapsed) */}
        <details open={showInventory} onToggle={(e) => setShowInventory((e.currentTarget as HTMLDetailsElement).open)} className="border border-gray-100">
          <summary className="px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400 cursor-pointer hover:bg-gray-50 select-none flex items-center justify-between">
            <span>Inventory {lowStock.length > 0 && <span className="ml-1 text-red-500">· {lowStock.length} low</span>}</span>
            <span>{showInventory ? "▴" : "▾"}</span>
          </summary>
          <div className="px-4 pb-4 pt-2 space-y-3">
            {inventory.length === 0 ? (
              <p className="text-xs text-gray-400">No items yet.</p>
            ) : (
              <div className="space-y-2">
                {inventory.map((item) => (
                  <div key={item.id} className={`flex justify-between items-center p-2.5 border text-sm ${item.quantity <= item.lowStockAt ? "border-red-100 bg-red-50" : "border-gray-100"}`}>
                    <div>
                      <p className="font-black text-gray-950 text-xs">{item.name}</p>
                      <p className={`text-[10px] font-semibold mt-0.5 ${item.quantity <= item.lowStockAt ? "text-red-600" : "text-green-600"}`}>
                        {item.quantity <= item.lowStockAt ? `Low (min ${item.lowStockAt})` : "OK"}
                      </p>
                    </div>
                    <span className="font-black text-gray-950 text-xs">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            )}
            {suggestedItems.length > 0 && (
              <details className="text-xs">
                <summary className="text-gray-400 cursor-pointer font-black uppercase tracking-wider">Suggested for {artisan.category}</summary>
                <ul className="mt-2 space-y-1 text-gray-500">
                  {suggestedItems.map((s) => <li key={s} className="flex gap-1"><span className="text-green-600">+</span> {s}</li>)}
                </ul>
              </details>
            )}
            <form onSubmit={addInventory} className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <input name="name"       placeholder="Material"  className="col-span-2 border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-600" required />
              <input name="quantity"   placeholder="Qty"       className="border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-600" type="number" required />
              <input name="unit"       placeholder="Unit (pcs)"className="border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-600" required />
              <input name="lowStockAt" placeholder="Low at"    className="border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-600" type="number" required />
              <button type="submit" className="bg-gray-950 text-white text-xs font-black py-2 hover:bg-gray-800 transition-colors">Add Item</button>
            </form>
          </div>
        </details>

        {/* Earnings summary */}
        <div className="border border-gray-100 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: "Available",      value: naira(artisan.artisan_available_balance), green: true },
            { label: "In Escrow",      value: naira(artisan.artisan_pending_balance) },
            { label: "Jobs Done",      value: String(artisan.completedJobs) },
            { label: "Platform Fee",   value: "10%" },
          ].map((r) => (
            <div key={r.label}>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{r.label}</p>
              <p className={`text-base font-black mt-1 ${r.green ? "text-green-700" : "text-gray-950"}`}>{r.value}</p>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-gray-200 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-black text-gray-950 leading-tight">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
