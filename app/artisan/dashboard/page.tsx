"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import JobChat from "@/components/JobChat";
import { CATEGORY_INVENTORY, escrowAction, loadDb, resetDemoDb, saveInventoryItem } from "@/lib/demo-db";
import { calculateTrustScore, getTrustTier } from "@/lib/trust-score";
import { FixMateDB } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

export default function ArtisanDashboardPage() {
  const [db, setDb] = useState<FixMateDB | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});

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
  const trust = calculateTrustScore(artisan, jobs, reviews, disputes);
  const tier = getTrustTier(trust.total);
  const suggestedItems = CATEGORY_INVENTORY[artisan.category] ?? [];

  const run = (bookingId: string, action: "artisan_accept" | "artisan_decline" | "mark_in_progress" | "mark_completed") => {
    setActionError((prev) => ({ ...prev, [bookingId]: "" }));
    try {
      setDb(escrowAction(bookingId, action));
    } catch (err) {
      setActionError((prev) => ({ ...prev, [bookingId]: err instanceof Error ? err.message : "Action failed." }));
    }
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      <header className="bg-white px-4 sm:px-6 py-4 flex items-center justify-between border-b shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 bg-gray-900 flex items-center justify-center font-bold text-white text-base">F</span>
          <span className="text-lg font-bold text-gray-900">Artisan Hub</span>
        </div>
        <div className="flex gap-3 items-center">
          {lowStock.length > 0 && (
            <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1">
              ⚠ {lowStock.length} low stock
            </span>
          )}
          <span className={`text-xs font-bold px-2 py-1 ${artisan.isVerified ? "text-green-700 bg-green-100" : "text-orange-700 bg-orange-100"}`}>
            {artisan.applicationStatus}
          </span>
          <button onClick={() => { resetDemoDb(); refresh(); }} className="text-xs text-gray-400 hover:text-red-600 font-semibold">Reset</button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 space-y-6">

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Available OPay Balance" value={naira(artisan.artisan_available_balance)} hint="Ready to withdraw" />
          <Metric label="Pending in Escrow" value={naira(artisan.artisan_pending_balance)} hint="Releases on completion" />
          <Metric label="Completed Jobs" value={String(artisan.completedJobs)} hint={`${reviews.length} reviews`} />
          <div className="bg-white p-4 border border-gray-200">
            <p className="text-xs text-gray-500 font-medium mb-1">Trust Score</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-green-700">{trust.total}%</h2>
              <span className={`text-xs font-bold px-1.5 py-0.5 ${tier.color}`}>{tier.label}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{trust.reasons.slice(0, 2).join(" · ")}</p>
          </div>
        </div>

        {/* Trust score breakdown */}
        <details className="bg-white border border-gray-200 p-4">
          <summary className="text-sm font-bold text-gray-700 cursor-pointer">Why this trust score?</summary>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Completed Jobs (30%)", score: trust.completedJobsScore, max: 30 },
              { label: "Verified ID (20%)",    score: trust.verifiedIdScore,    max: 20 },
              { label: "Review Rating (20%)",  score: trust.reviewRatingScore,  max: 20 },
              { label: "Dispute Rate (15%)",   score: trust.disputeRateScore,   max: 15 },
              { label: "Response Speed (10%)", score: trust.responseSpeedScore, max: 10 },
              { label: "Profile (5%)",          score: trust.profileScore,       max: 5  },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 p-2 border border-gray-100">
                <p className="text-[10px] text-gray-500 font-medium">{item.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 h-1.5">
                    <div className="bg-green-600 h-1.5" style={{ width: `${(item.score / item.max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-800">{item.score}/{item.max}</span>
                </div>
              </div>
            ))}
          </div>
        </details>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs */}
          <section className="lg:col-span-2 bg-white p-5 sm:p-6 border border-gray-200 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-900">Assigned Jobs</h2>
              <span className="text-sm font-bold text-green-700">{artisan.fullName}</span>
            </div>

            {jobs.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 text-gray-500 text-sm border border-gray-100">
                No assigned jobs. Go to{" "}
                <Link href="/report" className="text-green-700 font-bold underline">Report</Link>
                {" "}and select this artisan to create one.
              </div>
            ) : (
              jobs.map((job) => {
                const diagnosis = db.diagnoses.find((d) => d.id === job.diagnosisId);
                const booking = job.bookingId ? db.bookings.find((b) => b.id === job.bookingId) : undefined;
                const user = db.users.find((u) => u.id === job.userId);
                const brief = diagnosis?.artisan_brief;
                const isExpanded = expandedJob === job.id;
                const escrow = booking?.escrowStatus;
                const canAccept = escrow === "funded";
                const canProgress = escrow === "accepted";
                const canComplete = escrow === "accepted" || escrow === "in_progress";
                const jobErr = actionError[booking?.id ?? ""] ?? "";

                return (
                  <div key={job.id} className="border border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{diagnosis?.issue_title ?? job.description}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Customer: {user?.name} · {job.location}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 ${
                            escrow === "funded"     ? "bg-yellow-100 text-yellow-800" :
                            escrow === "accepted"   ? "bg-blue-100 text-blue-800" :
                            escrow === "in_progress"? "bg-purple-100 text-purple-800" :
                            escrow === "completed"  ? "bg-green-100 text-green-800" :
                            escrow === "released"   ? "bg-gray-100 text-gray-600" :
                                                      "bg-gray-100 text-gray-500"
                          }`}>{escrow ?? job.status.replaceAll("_", " ")}</span>
                          {escrow === "funded" && (
                            <span className="text-[10px] text-yellow-700 font-semibold">← Awaiting your acceptance</span>
                          )}
                          {!canAccept && escrow === "not_funded" && (
                            <span className="text-[10px] text-red-600 font-semibold">Escrow not funded yet — cannot accept</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900">{booking ? naira(booking.quoteAmount) : "—"}</p>
                        {booking && <p className="text-xs text-gray-400">Net: {naira(booking.quoteAmount - (booking.artisanFee ?? 0))}</p>}
                      </div>
                    </div>

                    {/* Artisan brief toggle */}
                    {brief && (
                      <button
                        onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                        className="text-xs text-blue-700 font-semibold underline"
                      >
                        {isExpanded ? "Hide" : "View"} Artisan Brief (AI-generated)
                      </button>
                    )}
                    {isExpanded && brief && (
                      <div className="bg-blue-50 border border-blue-100 p-3 text-xs space-y-2">
                        <p><strong>Problem:</strong> {brief.problem_summary}</p>
                        <p><strong>Likely cause:</strong> {brief.likely_cause}</p>
                        <p><strong>Tools to bring:</strong> {brief.tools_to_bring.join(", ")}</p>
                        <p><strong>Safety risks:</strong> {brief.safety_risks.join(", ")}</p>
                        <p><strong>Est. price:</strong> {brief.estimated_price_range}</p>
                      </div>
                    )}

                    {jobErr && <p className="text-xs text-red-600 font-semibold">{jobErr}</p>}

                    {booking && (
                      <div className="flex flex-wrap gap-2">
                        {canAccept && (
                          <button onClick={() => run(booking.id, "artisan_accept")} className="px-4 py-2 bg-gray-900 text-white text-sm font-bold hover:bg-gray-800">
                            Accept Job
                          </button>
                        )}
                        {canProgress && (
                          <button onClick={() => run(booking.id, "mark_in_progress")} className="px-4 py-2 bg-blue-700 text-white text-sm font-bold hover:bg-blue-800">
                            Mark In Progress
                          </button>
                        )}
                        {canComplete && (
                          <button onClick={() => run(booking.id, "mark_completed")} className="px-4 py-2 bg-green-700 text-white text-sm font-bold hover:bg-green-800">
                            Mark Completed
                          </button>
                        )}
                        {(escrow === "not_funded" || escrow === "funded") && (
                          <button onClick={() => run(booking.id, "artisan_decline")} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50">
                            Decline
                          </button>
                        )}
                      </div>
                    )}

                    <JobChat jobId={job.id} currentUserType="artisan" />
                  </div>
                );
              })
            )}
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            {/* Inventory */}
            <div className="bg-white p-5 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Inventory</h2>
                {lowStock.length > 0 && (
                  <span className="text-xs font-bold text-red-600">{lowStock.length} low</span>
                )}
              </div>

              {inventory.length === 0 ? (
                <p className="text-xs text-gray-500">No items yet. Add your materials below.</p>
              ) : (
                <div className="space-y-2">
                  {inventory.map((item) => (
                    <div key={item.id} className={`flex justify-between items-center p-2 border text-sm ${
                      item.quantity <= item.lowStockAt ? "border-red-100 bg-red-50" : "border-gray-100"
                    }`}>
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className={`text-xs font-medium ${item.quantity <= item.lowStockAt ? "text-red-600" : "text-green-600"}`}>
                          {item.quantity <= item.lowStockAt ? `⚠ Low stock (min: ${item.lowStockAt})` : "Healthy"}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              )}

              {suggestedItems.length > 0 && (
                <details className="text-xs">
                  <summary className="text-gray-500 cursor-pointer font-semibold">Suggested for {artisan.category}</summary>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    {suggestedItems.map((s) => (
                      <li key={s} className="flex items-center gap-1">
                        <span className="text-green-600">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <form onSubmit={addInventory} className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <input name="name"       placeholder="Material"  className="col-span-2 border border-gray-300 p-2 text-xs"  required />
                <input name="quantity"   placeholder="Qty"       className="border border-gray-300 p-2 text-xs" type="number" required />
                <input name="unit"       placeholder="Unit"      className="border border-gray-300 p-2 text-xs" required />
                <input name="lowStockAt" placeholder="Low at"    className="border border-gray-300 p-2 text-xs" type="number" required />
                <button type="submit" className="bg-gray-900 text-white text-xs font-bold py-2 hover:bg-gray-800">Add Item</button>
              </form>
            </div>

            {/* Earnings summary */}
            <div className="bg-white p-5 border border-gray-200">
              <h2 className="font-bold text-gray-900 mb-3">Earnings Summary</h2>
              <div className="space-y-2 text-sm">
                <EarningRow label="Available now" value={naira(artisan.artisan_available_balance)} green />
                <EarningRow label="Pending escrow" value={naira(artisan.artisan_pending_balance)} />
                <EarningRow label="Jobs completed" value={String(artisan.completedJobs)} />
                <EarningRow label="Platform fee (10%)" value="Deducted on each release" />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white p-4 border border-gray-200">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <h2 className="text-2xl font-bold text-gray-900">{value}</h2>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

function EarningRow({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className={`font-bold ${green ? "text-green-700" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}
