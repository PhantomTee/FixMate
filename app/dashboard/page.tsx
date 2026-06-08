"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import JobChat from "@/components/JobChat";
import { DEMO_USER_ID, escrowAction, loadDb, saveReview } from "@/lib/demo-db";
import { Booking, DiagnosisRecord, EscrowTransaction, FixMateDB, JobRequest } from "@/lib/types";

const naira = (value: number) => `₦${value.toLocaleString()}`;

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
    const user = db.users.find((item) => item.id === DEMO_USER_ID) ?? db.users[0];
    const jobs = db.job_requests.filter((job) => job.userId === user.id);
    const active = jobs.find((job) => !["released", "refunded", "declined"].includes(job.status)) ?? jobs[0];
    const booking = active?.bookingId ? db.bookings.find((item) => item.id === active.bookingId) : undefined;
    const diagnosis = active ? db.diagnoses.find((item) => item.id === active.diagnosisId) : undefined;
    const artisan = active?.selectedArtisanId ? db.artisans.find((item) => item.id === active.selectedArtisanId) : undefined;
    const transactions = db.escrow_transactions.filter((tx) => !booking || tx.bookingId === booking.id).slice(0, 5);
    return { user, jobs, active, booking, diagnosis, artisan, transactions };
  }, [db]);

  if (!db || !data) return null;
  const { user, jobs, active, booking, diagnosis, artisan, transactions } = data;
  const canRelease = booking?.escrowStatus === "completed";

  const run = (action: "user_release" | "open_dispute") => {
    if (!booking) return;
    setDb(escrowAction(booking.id, action, action === "open_dispute" ? "Customer opened a dispute from dashboard." : ""));
  };

  const submitReview = () => {
    if (!active || !reviewText.trim()) return;
    setDb(saveReview(active.id, 5, reviewText.trim()));
    setReviewText("");
  };

  return (
    <div className="min-h-screen bg-[#f5f7f6] font-sans pb-10">
      <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">FixMate wallet</p>
            <h1 className="text-2xl font-bold text-gray-950">Welcome, {user.name}</h1>
          </div>
          <Link href="/" className="text-sm font-semibold text-gray-600 hover:text-gray-950">Logout</Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="bg-gray-950 p-6 text-white shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Available balance</p>
                <h2 className="mt-2 text-4xl font-bold tracking-normal">{naira(user.user_wallet_balance)}</h2>
                <p className="mt-3 text-sm text-white/65">Simulated OPay wallet for FixMate escrow payments.</p>
              </div>
              <div className="bg-white/10 p-4 text-left sm:min-w-56">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Escrow locked</p>
                <p className="mt-2 text-2xl font-bold">{naira(user.escrow_balance)}</p>
                <p className="mt-1 text-xs text-white/60">Held until job completion.</p>
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button className="bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800">Fund Wallet</button>
              <Link href="/report" className="border border-white/20 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white hover:text-gray-950">New Job Request</Link>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Active job payment status</p>
                <h2 className="text-xl font-bold text-gray-950">{diagnosis?.issue_title ?? "No active job"}</h2>
              </div>
              {booking && <span className="w-fit bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-green-800">{booking.escrowStatus}</span>}
            </div>

            {!active || !diagnosis ? (
              <Empty text="No jobs yet. Create a report to see payment status here." />
            ) : (
              <>
                <div className="grid gap-3 border-y border-gray-100 py-4 sm:grid-cols-3">
                  <Metric label="Artisan" value={artisan?.fullName ?? "Not selected"} />
                  <Metric label="Quote" value={booking ? naira(booking.quoteAmount) : "No booking"} />
                  <Metric label="Job status" value={active.status.replaceAll("_", " ")} />
                </div>
                {booking && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <button
                      onClick={() => run("user_release")}
                      disabled={!canRelease}
                      title={!canRelease ? "Can only release after artisan marks job completed" : ""}
                      className="bg-gray-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                    >
                      {canRelease ? "Release Escrow" : "Release Locked"}
                    </button>
                    <button onClick={() => run("open_dispute")} disabled={booking.escrowStatus === "released"} className="border border-red-200 px-4 py-3 text-sm font-bold text-red-600 disabled:opacity-40">
                      Open Dispute
                    </button>
                    <Link href={`/booking?bookingId=${booking.id}`} className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-800">
                      Escrow Details
                    </Link>
                  </div>
                )}
                <JobChat jobId={active.id} currentUserType="user" />
                {active.status === "released" && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Leave a short review" className="flex-1 border border-gray-300 px-3 py-2 text-sm" />
                    <button onClick={submitReview} className="bg-green-700 px-4 py-2 text-sm font-bold text-white">Review</button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-gray-950">Recent transactions</h2>
            <div className="mt-4 space-y-3">
              {transactions.length === 0 ? <Empty text="No escrow transactions yet." /> : transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-gray-950">Recent jobs</h2>
            <div className="mt-4 space-y-3">
              {jobs.map((job) => {
                const itemDiagnosis = db.diagnoses.find((item) => item.id === job.diagnosisId);
                const itemBooking = job.bookingId ? db.bookings.find((item) => item.id === job.bookingId) : undefined;
                return <JobRow key={job.id} job={job} diagnosis={itemDiagnosis} booking={itemBooking} />;
              })}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold capitalize text-gray-950">{value}</p>
    </div>
  );
}

function TransactionRow({ tx }: { tx: EscrowTransaction }) {
  return (
    <div className="border border-gray-100 bg-gray-50 p-3">
      <div className="flex justify-between gap-3">
        <p className="text-sm font-bold text-gray-950">{tx.action.replaceAll("_", " ")}</p>
        <p className="text-sm font-bold text-gray-950">{naira(tx.amount)}</p>
      </div>
      <p className="mt-1 text-xs text-gray-500">{tx.reference}</p>
    </div>
  );
}

function JobRow({ job, diagnosis, booking }: { job: JobRequest; diagnosis?: DiagnosisRecord; booking?: Booking }) {
  return (
    <div className="border-b border-gray-100 pb-3 last:border-0">
      <div className="flex justify-between gap-3">
        <p className="text-sm font-semibold text-gray-950">{diagnosis?.issue_title ?? job.description}</p>
        <p className="text-sm font-bold text-gray-950">{booking ? naira(booking.quoteAmount) : "No booking"}</p>
      </div>
      <p className="mt-1 text-xs capitalize text-gray-500">{job.status.replaceAll("_", " ")}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">{text}</div>;
}
