"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import JobChat from "@/components/JobChat";
import { CATEGORY_INVENTORY, escrowAction, loadDb, saveInventoryItem } from "@/lib/demo-db";
import { HandijobDB } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

const ESCROW_BADGE: Record<string, string> = {
  funded:      "bg-yellow-100 text-yellow-700",
  accepted:    "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed:   "bg-green-100 text-green-700",
  released:    "bg-gray-100 text-gray-500",
  disputed:    "bg-red-100 text-red-700",
  not_funded:  "bg-gray-100 text-gray-400",
};

const ESCROW_LABEL: Record<string, string> = {
  funded:      "Escrow funded — ready to accept",
  accepted:    "Accepted",
  in_progress: "In progress",
  completed:   "Awaiting payment release",
  released:    "Payment released",
  disputed:    "Disputed",
  not_funded:  "Not funded yet",
};

export default function ArtisanDashboardPage() {
  const [db, setDb] = useState<HandijobDB | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});

  const refresh = () => setDb(loadDb());
  useEffect(() => {
    refresh();
    window.addEventListener("handijob-db-updated", refresh);
    return () => window.removeEventListener("handijob-db-updated", refresh);
  }, []);

  const data = useMemo(() => {
    if (!db) return null;
    const artisan = db.artisans.find((a) => a.applicationStatus === "approved") ?? db.artisans[0];
    const jobs = db.job_requests.filter((j) => j.selectedArtisanId === artisan.id);
    const inventory = db.inventory_items.filter((i) => i.artisanId === artisan.id);
    const lowStock = inventory.filter((i) => i.quantity <= i.lowStockAt);
    const reviews = db.reviews.filter((r) => r.artisanId === artisan.id);
    const activeJobs = jobs.filter((j) => !["released", "refunded", "declined"].includes(j.status));
    const suggestedItems = CATEGORY_INVENTORY[artisan.category] ?? [];
    return { artisan, jobs, inventory, lowStock, reviews, activeJobs, suggestedItems };
  }, [db]);

  if (!db || !data) return null;
  const { artisan, jobs, inventory, lowStock, reviews, activeJobs, suggestedItems } = data;

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

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex h-8 w-8 items-center justify-center bg-green-600 text-sm font-black text-white rounded-lg shrink-0">
            H
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black text-gray-950 truncate">{artisan.fullName}</span>
              {artisan.isVerified && (
                <span className="rounded-full text-[10px] font-black px-2 py-0.5 bg-green-100 text-green-700 shrink-0">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-semibold truncate">{artisan.category}</p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending payout</p>
          <p className="text-sm font-black text-gray-950">{naira(artisan.artisan_pending_balance)}</p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Low-stock alert */}
        {lowStock.length > 0 && (
          <div className="bg-red-50 rounded-xl border border-red-100 px-4 py-3">
            <p className="text-xs font-black text-red-700 mb-1">Low stock alert</p>
            <p className="text-[11px] font-semibold text-red-600">
              {lowStock.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(" · ")}
            </p>
          </div>
        )}

        {/* Work queue */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Work Queue</p>
            {activeJobs.length > 0 && (
              <span className="rounded-full text-[10px] font-black px-2 py-0.5 bg-gray-950 text-white">
                {activeJobs.length}
              </span>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-sm font-semibold text-gray-400">No assigned jobs.</p>
              <p className="text-xs text-gray-400 mt-1">
                Go to{" "}
                <Link href="/report" className="text-green-600 font-black underline">
                  Report
                </Link>{" "}
                and select this artisan.
              </p>
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
                const canComplete = escrow === "in_progress";
                const canDecline = escrow === "not_funded" || escrow === "funded";
                const jobErr = actionError[booking?.id ?? ""] ?? "";

                return (
                  <div key={job.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-5 space-y-3">
                      {/* Job header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-gray-950 text-base leading-snug">
                            {diagnosis?.issue_title ?? job.description}
                          </h3>
                          <p className="text-xs text-gray-400 font-semibold mt-0.5">
                            {customer?.name ?? "Customer"} · {job.location}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {booking ? (
                            <>
                              <p className="font-black text-gray-950 text-base leading-none">{naira(booking.quoteAmount)}</p>
                              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                You receive {naira(booking.quoteAmount - (booking.artisanFee ?? 0))}
                              </p>
                            </>
                          ) : (
                            <p className="font-black text-gray-400 text-sm">—</p>
                          )}
                        </div>
                      </div>

                      {/* Status pill */}
                      {escrow && (
                        <span className={`inline-block rounded-full text-[10px] font-black px-2.5 py-1 ${ESCROW_BADGE[escrow] ?? "bg-gray-100 text-gray-500"}`}>
                          {ESCROW_LABEL[escrow] ?? escrow.replaceAll("_", " ")}
                        </span>
                      )}

                      {/* Error */}
                      {jobErr && <p className="text-xs text-red-600 font-semibold">{jobErr}</p>}

                      {/* Single primary CTA per state */}
                      {booking && (
                        <div className="space-y-2">
                          {canAccept && (
                            <button
                              onClick={() => run(booking.id, "artisan_accept")}
                              className="w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors"
                            >
                              Accept Job
                            </button>
                          )}
                          {canProgress && (
                            <button
                              onClick={() => run(booking.id, "mark_in_progress")}
                              className="w-full py-3 bg-gray-950 text-white text-sm font-black rounded-xl hover:bg-gray-800 transition-colors"
                            >
                              Mark In Progress →
                            </button>
                          )}
                          {canComplete && (
                            <button
                              onClick={() => run(booking.id, "mark_completed")}
                              className="w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors"
                            >
                              Mark Completed ✓
                            </button>
                          )}
                          {escrow === "completed" && (
                            <div className="w-full py-3 bg-gray-100 text-gray-400 text-sm font-black rounded-xl text-center select-none">
                              Waiting for customer to release payment
                            </div>
                          )}
                          {canDecline && (
                            <button
                              onClick={() => run(booking.id, "artisan_decline")}
                              className="block w-full text-center text-xs font-black text-gray-400 hover:text-red-600 transition-colors pt-0.5"
                            >
                              Decline job
                            </button>
                          )}
                        </div>
                      )}

                      {/* AI brief toggle */}
                      {brief && (
                        <button
                          onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                          className="text-[11px] font-black text-gray-400 hover:text-gray-950 transition-colors"
                        >
                          {isExpanded ? "▴ Hide AI brief" : "▾ View AI brief"}
                        </button>
                      )}

                      {/* AI brief content */}
                      {isExpanded && brief && (
                        <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs space-y-1.5 text-gray-700">
                          <p><span className="font-black text-gray-800">Problem:</span> {brief.problem_summary}</p>
                          <p><span className="font-black text-gray-800">Likely cause:</span> {brief.likely_cause}</p>
                          <p><span className="font-black text-gray-800">Tools:</span> {Array.isArray(brief.tools_to_bring) ? brief.tools_to_bring.join(", ") : brief.tools_to_bring}</p>
                          <p><span className="font-black text-gray-800">Estimate:</span> {brief.estimated_price_range}</p>
                        </div>
                      )}
                    </div>

                    {/* Chat collapsed */}
                    <details className="border-t border-gray-100">
                      <summary className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <span>Chat with customer</span>
                        <span className="text-gray-300">▾</span>
                      </summary>
                      <div className="px-0 pb-0">
                        <JobChat jobId={job.id} currentUserType="artisan" />
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory (collapsed) */}
        <details className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <summary className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span>
              Inventory
              {lowStock.length > 0 && (
                <span className="ml-1.5 text-red-500">· {lowStock.length} low</span>
              )}
            </span>
            <span className="text-gray-300">▾</span>
          </summary>
          <div className="px-5 pb-5 pt-4 space-y-3 border-t border-gray-100">
            {inventory.length === 0 ? (
              <p className="text-xs text-gray-400 font-semibold">No items yet.</p>
            ) : (
              <div className="space-y-2">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className={`flex justify-between items-center p-3 rounded-xl border text-sm ${
                      item.quantity <= item.lowStockAt
                        ? "border-red-100 bg-red-50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
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
                <summary className="text-gray-400 cursor-pointer font-black uppercase tracking-wider select-none">
                  Suggested for {artisan.category}
                </summary>
                <ul className="mt-2 space-y-1 text-gray-500 pl-2">
                  {suggestedItems.map((s) => (
                    <li key={s} className="flex gap-1.5">
                      <span className="text-green-600 font-black">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <form onSubmit={addInventory} className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <input
                name="name"
                placeholder="Material"
                className="col-span-2 border border-gray-200 p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 rounded-lg"
                required
              />
              <input
                name="quantity"
                placeholder="Qty"
                className="border border-gray-200 p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 rounded-lg"
                type="number"
                required
              />
              <input
                name="unit"
                placeholder="Unit (pcs)"
                className="border border-gray-200 p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 rounded-lg"
                required
              />
              <input
                name="lowStockAt"
                placeholder="Low at"
                className="border border-gray-200 p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 rounded-lg"
                type="number"
                required
              />
              <button
                type="submit"
                className="bg-gray-950 text-white text-xs font-black py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Add Item
              </button>
            </form>
          </div>
        </details>

        {/* Earnings & Stats (collapsed) */}
        <details className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <summary className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span>Earnings &amp; Stats</span>
            <span className="text-gray-300">▾</span>
          </summary>
          <div className="px-5 pb-5 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Available",      value: naira(artisan.artisan_available_balance), green: true },
                { label: "In Escrow",      value: naira(artisan.artisan_pending_balance) },
                { label: "Jobs Completed", value: String(artisan.completedJobs) },
                { label: "Reviews",        value: String(reviews.length) },
                { label: "Platform Fee",   value: "10%" },
                { label: "Rating",         value: artisan.rating ? `${artisan.rating}★` : "—" },
              ].map((r) => (
                <div key={r.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{r.label}</p>
                  <p className={`text-base font-black mt-1 leading-tight ${r.green ? "text-green-600" : "text-gray-950"}`}>
                    {r.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </details>

      </main>
    </div>
  );
}
