"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import JobChat from "@/components/JobChat";
import { DEMO_USER_ID, escrowAction, loadDb, saveReview } from "@/lib/demo-db";
import { Booking, DiagnosisRecord, EscrowTransaction, FixMateDB, JobRequest } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

const STATUS_BADGE: Record<string, string> = {
  funded:      "bg-yellow-100 text-yellow-700",
  accepted:    "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed:   "bg-green-100 text-green-700",
  released:    "bg-green-50 text-green-800",
  disputed:    "bg-red-100 text-red-700",
  not_funded:  "bg-gray-100 text-gray-500",
};

export default function DashboardPage() {
  const [db, setDb] = useState<FixMateDB | null>(null);
  const [reviewText, setReviewText] = useState("");

  const refresh = () => setDb(loadDb());
  useEffect(() => {
    refresh();
    window.addEventListener("fixmate-db-updated", refresh);
    return () => window.removeEventListener("fixmate-db-updated", refresh);
  }, []);

  const data = useMemo(() => {
    if (!db) return null;
    const user = db.users.find((u) => u.id === DEMO_USER_ID) ?? db.users[0];
    const jobs = db.job_requests.filter((j) => j.userId === user.id);
    const active = jobs.find((j) => !["released", "refunded", "declined"].includes(j.status)) ?? jobs[0];
    const booking = active?.bookingId ? db.bookings.find((b) => b.id === active.bookingId) : undefined;
    const diagnosis = active ? db.diagnoses.find((d) => d.id === active.diagnosisId) : undefined;
    const artisan = active?.selectedArtisanId ? db.artisans.find((a) => a.id === active.selectedArtisanId) : undefined;
    const transactions = db.escrow_transactions.filter((tx) => !booking || tx.bookingId === booking.id).slice(0, 5);
    return { user, jobs, active, booking, diagnosis, artisan, transactions };
  }, [db]);

  if (!db || !data) return null;
  const { user, jobs, active, booking, diagnosis, artisan, transactions } = data;
  const canRelease = booking?.escrowStatus === "completed";

  const run = (action: "user_release" | "open_dispute") => {
    if (!booking) return;
    setDb(escrowAction(booking.id, action, action === "open_dispute" ? "Customer opened a dispute." : ""));
  };

  const submitReview = () => {
    if (!active || !reviewText.trim()) return;
    setDb(saveReview(active.id, 5, reviewText.trim()));
    setReviewText("");
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-16">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-7 w-7 items-center justify-center bg-green-700 text-xs font-black text-white shrink-0">F</Link>
          <div>
            <h1 className="text-sm font-black text-gray-950 leading-tight">{user.name}</h1>
            <p className="text-xs text-gray-400">Customer</p>
          </div>
        </div>
        <Link href="/" className="text-xs font-black text-gray-400 hover:text-gray-950 transition-colors">← Home</Link>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Wallet card */}
        <div className="bg-gray-950 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">OPay Wallet Balance</p>
              <p className="text-[clamp(2rem,8vw,3.5rem)] font-black text-white leading-none tracking-tight">{naira(user.user_wallet_balance)}</p>
              <p className="text-xs text-white/40 mt-2">Simulated demo wallet</p>
            </div>
            <div className="bg-white/8 border border-white/10 p-4 sm:min-w-44">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Escrow Locked</p>
              <p className="text-2xl font-black text-white">{naira(user.escrow_balance)}</p>
              <p className="text-xs text-white/40 mt-1">Released on completion</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button className="bg-green-700 px-5 py-3 text-sm font-black text-white hover:bg-green-600 transition-colors">
              Fund Wallet
            </button>
            <Link href="/report" className="border border-white/15 px-5 py-3 text-center text-sm font-black text-white hover:bg-white/5 transition-colors">
              New Job Request →
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Active job */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Active Job</h2>
              {booking && (
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${STATUS_BADGE[booking.escrowStatus] ?? "bg-gray-100 text-gray-500"}`}>
                  {booking.escrowStatus.replaceAll("_", " ")}
                </span>
              )}
            </div>

            {!active || !diagnosis ? (
              <div className="border border-gray-100 p-8 text-center">
                <p className="text-sm text-gray-400 mb-4">No active job.</p>
                <Link href="/report" className="bg-green-700 text-white px-5 py-2.5 text-sm font-black hover:bg-green-800 transition-colors">
                  Report an Issue →
                </Link>
              </div>
            ) : (
              <div className="border border-gray-200 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-gray-950 text-base leading-snug">{diagnosis.issue_title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{artisan?.fullName ?? "No artisan yet"} · {active.location}</p>
                  </div>
                  {booking && <span className="font-black text-gray-950 text-lg shrink-0">{naira(booking.quoteAmount)}</span>}
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Artisan</p>
                    <p className="text-sm font-black text-gray-950 mt-0.5 truncate">{artisan?.fullName ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quote</p>
                    <p className="text-sm font-black text-gray-950 mt-0.5">{booking ? naira(booking.quoteAmount) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</p>
                    <p className="text-sm font-black text-gray-950 mt-0.5 capitalize">{active.status.replaceAll("_", " ")}</p>
                  </div>
                </div>

                {booking && (
                  <div className="flex flex-col sm:flex-row gap-2 border-t border-gray-100 pt-4">
                    <button
                      onClick={() => run("user_release")}
                      disabled={!canRelease}
                      title={!canRelease ? "Available after artisan marks job complete" : ""}
                      className="flex-1 py-3 bg-gray-950 text-white text-sm font-black hover:bg-gray-800 transition-colors disabled:opacity-30"
                    >
                      {canRelease ? "Release Payment" : "Awaiting Completion"}
                    </button>
                    <button
                      onClick={() => run("open_dispute")}
                      disabled={booking.escrowStatus === "released"}
                      className="flex-1 py-3 border border-red-200 text-red-600 text-sm font-black hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      Open Dispute
                    </button>
                    <Link href={`/booking?bookingId=${booking.id}`} className="flex-1 py-3 border border-gray-200 text-sm font-black text-gray-700 hover:bg-gray-50 transition-colors text-center">
                      View Details
                    </Link>
                  </div>
                )}

                <JobChat jobId={active.id} currentUserType="user" />

                {active.status === "released" && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <input
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Leave a review for the artisan…"
                      className="flex-1 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                    <button onClick={submitReview} className="bg-green-700 px-4 py-2 text-sm font-black text-white hover:bg-green-800 transition-colors">
                      Submit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Transactions */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Recent Transactions</h2>
              {transactions.length === 0 ? (
                <div className="border border-gray-100 p-5 text-center text-sm text-gray-400">No transactions yet.</div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)}
                </div>
              )}
            </div>

            {/* Job history */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">All Jobs</h2>
              <div className="space-y-1">
                {jobs.map((job) => {
                  const d = db.diagnoses.find((x) => x.id === job.diagnosisId);
                  const b = job.bookingId ? db.bookings.find((x) => x.id === job.bookingId) : undefined;
                  return <JobRow key={job.id} job={job} diagnosis={d} booking={b} />;
                })}
              </div>
            </div>
          </aside>
        </div>

      </main>
    </div>
  );
}

function TxRow({ tx }: { tx: EscrowTransaction }) {
  return (
    <div className="flex items-center justify-between border border-gray-100 p-3">
      <div>
        <p className="text-xs font-black text-gray-950 capitalize">{tx.action.replaceAll("_", " ")}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{tx.reference}</p>
      </div>
      <p className="text-sm font-black text-gray-950">{naira(tx.amount)}</p>
    </div>
  );
}

function JobRow({ job, diagnosis, booking }: { job: JobRequest; diagnosis?: DiagnosisRecord; booking?: Booking }) {
  return (
    <Link href={booking ? `/booking?bookingId=${booking.id}` : "/report"} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-1 group transition-colors">
      <div className="min-w-0">
        <p className="text-xs font-black text-gray-950 truncate">{diagnosis?.issue_title ?? job.description}</p>
        <p className="text-[10px] text-gray-400 capitalize mt-0.5">{job.status.replaceAll("_", " ")}</p>
      </div>
      <p className="text-xs font-black text-gray-950 shrink-0 ml-3">{booking ? naira(booking.quoteAmount) : "—"}</p>
    </Link>
  );
}
