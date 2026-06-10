"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import JobChat from "@/components/JobChat";
import {
  addInventoryItem,
  getAssignedJobs,
  getCurrentArtisan,
  getInventory,
  performEscrowAction,
  subscribeBooking,
} from "@/lib/api";
import { Artisan, Booking, DiagnosisRecord, EscrowTransaction, InventoryItem, JobRequest } from "@/lib/types";
import { createClient } from "@/lib/supabase";

const naira = (v: number) => `₦${v.toLocaleString()}`;

const CATEGORY_INVENTORY: Partial<Record<string, string[]>> = {
  "AC Repair":        ["R22 AC Gas", "R410A Gas", "Drain hose", "AC capacitor", "Air filter"],
  "Generator Repair": ["Spark plug", "Engine oil", "Fuel hose", "Carburetor cleaner", "AVR module"],
  "Plumber":          ["PVC pipe 1/2in", "PVC pipe 1in", "Pipe tape", "Ball valve", "Elbow joint"],
  "Electrician":      ["Cable 2.5mm", "Cable 4mm", "MCB breaker", "Socket face plate", "Electrical tape"],
  "Carpenter":        ["Wood screws", "Sandpaper 80g", "Wood glue", "Hinges", "Wood filler"],
  "Painter":          ["Emulsion paint", "Gloss paint", "Paint roller", "Masking tape", "Primer"],
};

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

type Tab = "jobs" | "inventory" | "earnings";

interface PageData {
  artisan: Artisan;
  jobs: JobRequest[];
  bookings: Record<string, Booking>;
  diagnoses: Record<string, DiagnosisRecord>;
  customers: Record<string, { name: string }>;
  inventory: InventoryItem[];
  reviews: Array<{ id: string }>;
}

export default function ArtisanDashboardPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Tab>("jobs");

  // Earnings tab state
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState("");

  // Bank + payout state
  const [banks, setBanks] = useState<Array<{ name: string; code: string }>>([]);
  const [banksLoaded, setBanksLoaded] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth?next=/artisan/dashboard"); return; }

    const artisan = await getCurrentArtisan();
    if (!artisan) { router.replace("/artisan/register"); return; }

    const [jobs, inventory, { data: reviewsData }] = await Promise.all([
      getAssignedJobs(artisan.id),
      getInventory(artisan.id),
      supabase.from("reviews").select("id").eq("artisan_id", artisan.id),
    ]);

    // Load bookings, diagnoses, customers in one batch
    const bookingIds = jobs.map((j) => j.bookingId).filter(Boolean) as string[];
    const diagnosisIds = jobs.map((j) => j.diagnosisId).filter(Boolean) as string[];
    const userIds = [...new Set(jobs.map((j) => j.userId))];

    const [
      { data: bookingsData },
      { data: diagnosesData },
      { data: usersData },
    ] = await Promise.all([
      bookingIds.length ? supabase.from("bookings").select("*").in("id", bookingIds) : Promise.resolve({ data: [] }),
      diagnosisIds.length ? supabase.from("diagnoses").select("*").in("id", diagnosisIds) : Promise.resolve({ data: [] }),
      userIds.length ? supabase.from("users").select("id, name").in("id", userIds) : Promise.resolve({ data: [] }),
    ]);

    const toBooking = (r: Record<string, unknown>): Booking => ({
      id: r.id as string,
      jobId: r.job_id as string,
      userId: r.user_id as string,
      artisanId: r.artisan_id as string,
      quoteAmount: r.quote_amount as number,
      userFee: r.user_fee as number,
      artisanFee: r.artisan_fee as number,
      totalCharge: r.total_charge as number,
      escrowStatus: r.escrow_status as Booking["escrowStatus"],
      opayReference: (r.paystack_reference ?? r.opay_reference ?? "") as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    });

    const toDiagnosis = (r: Record<string, unknown>): DiagnosisRecord => ({
      id: r.id as string,
      jobId: r.job_id as string,
      userId: r.user_id as string,
      issue_title: r.issue_title as string,
      summary: r.summary as string,
      artisan_category: r.artisan_category as DiagnosisRecord["artisan_category"],
      urgency: r.urgency as DiagnosisRecord["urgency"],
      estimated_min_naira: r.estimated_min_naira as number,
      estimated_max_naira: r.estimated_max_naira as number,
      estimated_labor_naira: r.estimated_labor_naira as number,
      estimated_materials_naira: r.estimated_materials_naira as number,
      safety_warning: r.safety_warning as string | null,
      first_aid_steps: (r.first_aid_steps ?? []) as string[],
      follow_up_questions: (r.follow_up_questions ?? []) as string[],
      artisan_brief: r.artisan_brief as DiagnosisRecord["artisan_brief"],
      language: r.language as DiagnosisRecord["language"],
      createdAt: r.created_at as string,
    });

    const bookingsMap = Object.fromEntries(
      (bookingsData ?? []).map((b) => [b.id, toBooking(b as Record<string, unknown>)])
    );
    const diagnosesMap = Object.fromEntries(
      (diagnosesData ?? []).map((d) => [d.id, toDiagnosis(d as Record<string, unknown>)])
    );
    const customersMap = Object.fromEntries(
      (usersData ?? []).map((u: Record<string, unknown>) => [u.id as string, { name: u.name as string }])
    );

    setData({
      artisan,
      jobs,
      bookings: bookingsMap,
      diagnoses: diagnosesMap,
      customers: customersMap,
      inventory,
      reviews: reviewsData ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bookingForJob = useCallback(
    (job: JobRequest) => (job.bookingId ? data?.bookings[job.bookingId] : undefined),
    [data]
  );

  // Subscribe to all active booking channels
  useEffect(() => {
    if (!data) return;
    const activeBookingIds = data.jobs
      .map((j) => j.bookingId)
      .filter((id): id is string => Boolean(id));

    const channels = activeBookingIds.map((id) =>
      subscribeBooking(id, (updated) => {
        setData((prev) => {
          if (!prev) return prev;
          return { ...prev, bookings: { ...prev.bookings, [updated.id]: updated } };
        });
      })
    );
    return () => { channels.forEach((c) => c.unsubscribe()); };
  }, [data?.jobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load transactions when earnings tab is first opened
  useEffect(() => {
    if (activeTab !== "earnings" || txLoaded) return;
    setTxLoading(true);
    fetch("/api/artisan/transactions")
      .then((r) => r.json())
      .then((json: { transactions?: Record<string, unknown>[] }) => {
        const rows = (json.transactions ?? []).map((r) => ({
          id: r.id as string,
          reference: r.reference as string,
          bookingId: r.booking_id as string,
          jobId: r.job_id as string,
          action: r.action as string,
          amount: r.amount as number,
          userFee: r.user_fee as number,
          artisanFee: r.artisan_fee as number,
          platformFee: r.platform_fee as number,
          actor: r.actor as string,
          note: (r.note ?? "") as string,
          createdAt: r.created_at as string,
        })) as EscrowTransaction[];
        setTransactions(rows);
        setTxLoaded(true);
      })
      .catch(() => { setTxLoaded(true); })
      .finally(() => setTxLoading(false));
  }, [activeTab, txLoaded]);

  // Load Nigerian banks list when earnings tab opens
  useEffect(() => {
    if (activeTab !== "earnings" || banksLoaded) return;
    fetch("/api/paystack/banks")
      .then((r) => r.json())
      .then((json: { banks?: Array<{ name: string; code: string }> }) => {
        setBanks(json.banks ?? []);
        setBanksLoaded(true);
      })
      .catch(() => setBanksLoaded(true));
  }, [activeTab, banksLoaded]);

  const computed = useMemo(() => {
    if (!data) return null;
    const lowStock = data.inventory.filter((i) => i.quantity <= i.lowStockAt);
    const activeJobs = data.jobs.filter((j) => !["released", "refunded", "declined"].includes(j.status));
    const suggestedItems = CATEGORY_INVENTORY[data.artisan.category] ?? [];
    return { lowStock, activeJobs, suggestedItems };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !computed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 font-semibold">Sign in as an artisan to view this dashboard.</p>
        <Link href="/auth?next=/artisan/dashboard" className="bg-green-600 text-white px-6 py-3 text-sm font-black rounded-xl hover:bg-green-700">
          Sign in →
        </Link>
      </div>
    );
  }

  const { artisan, jobs, inventory, reviews } = data;
  const { lowStock, activeJobs, suggestedItems } = computed;

  const run = async (bookingId: string, action: "artisan_accept" | "artisan_decline" | "mark_in_progress" | "mark_completed") => {
    setActionError((prev) => ({ ...prev, [bookingId]: "" }));
    try {
      const updated = await performEscrowAction(bookingId, action);
      setData((prev) => prev ? { ...prev, bookings: { ...prev.bookings, [updated.id]: updated } } : prev);
    } catch (err) {
      setActionError((prev) => ({ ...prev, [bookingId]: err instanceof Error ? err.message : "Action failed." }));
    }
  };

  const addInventory = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const item = await addInventoryItem({
        artisanId: artisan.id,
        name: String(form.get("name") || ""),
        quantity: Number(form.get("quantity") || 0),
        unit: String(form.get("unit") || "pcs"),
        lowStockAt: Number(form.get("lowStockAt") || 1),
      });
      setData((prev) => prev ? { ...prev, inventory: [...prev.inventory, item] } : prev);
      e.currentTarget.reset();
    } catch { /* ignore */ }
  };

  const resolveAccount = async () => {
    if (!bankCode || accountNumber.length < 10) return;
    setResolving(true);
    setResolveErr("");
    setAccountName("");
    try {
      const res = await fetch("/api/paystack/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber.trim(), bank_code: bankCode }),
      });
      const json = await res.json() as { account_name?: string; error?: string };
      if (!res.ok || !json.account_name) throw new Error(json.error ?? "Could not verify account");
      setAccountName(json.account_name);
    } catch (err) {
      setResolveErr(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setResolving(false);
    }
  };

  const requestPayout = async () => {
    if (!accountName || !bankCode || !accountNumber) {
      setPayoutMsg("Please verify your bank account first.");
      return;
    }
    const amount = parseFloat(payoutAmount);
    if (!amount || amount < 100) {
      setPayoutMsg("Minimum payout is ₦100.");
      return;
    }
    setPayoutLoading(true);
    setPayoutMsg("");
    try {
      const res = await fetch("/api/paystack/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_code: bankCode,
          account_number: accountNumber.trim(),
          account_name: accountName,
          amount_naira: amount,
        }),
      });
      const json = await res.json() as { success?: boolean; transfer_code?: string; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? "Payout failed");
      setPayoutMsg(`Transfer initiated! Code: ${json.transfer_code ?? "pending"}`);
      // Reset form
      setAccountNumber("");
      setAccountName("");
      setBankCode("");
      setPayoutAmount("");
      // Reload artisan data to reflect updated balance
      load();
    } catch (err) {
      setPayoutMsg(err instanceof Error ? err.message : "Payout failed. Try again.");
    } finally {
      setPayoutLoading(false);
    }
  };

  const TAB_ACTIVE = "border-b-2 border-gray-950 text-gray-950 font-black";
  const TAB_INACTIVE = "text-gray-400 font-semibold hover:text-gray-950";

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

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-10">
        <div className="max-w-lg mx-auto px-4 flex gap-6">
          {(["jobs", "inventory", "earnings"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-xs uppercase tracking-widest transition-colors ${activeTab === tab ? TAB_ACTIVE : TAB_INACTIVE}`}
            >
              {tab === "jobs" ? (
                <span className="flex items-center gap-1.5">
                  Jobs
                  {activeJobs.length > 0 && (
                    <span className="rounded-full text-[9px] font-black px-1.5 py-0.5 bg-gray-950 text-white leading-none">
                      {activeJobs.length}
                    </span>
                  )}
                </span>
              ) : tab === "inventory" ? (
                <span className="flex items-center gap-1.5">
                  Inventory
                  {lowStock.length > 0 && (
                    <span className="rounded-full text-[9px] font-black px-1.5 py-0.5 bg-red-500 text-white leading-none">
                      {lowStock.length}
                    </span>
                  )}
                </span>
              ) : (
                "Earnings"
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Application status banner */}
      {artisan.applicationStatus === "pending" && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 animate-pulse" />
          <p className="text-xs font-black text-yellow-800">
            Your application is under review — you'll be notified once it's approved (usually within 48 hrs).
          </p>
        </div>
      )}
      {artisan.applicationStatus === "rejected" && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <p className="text-xs font-black text-red-700">
            Your application was not approved. Contact support if you think this is a mistake.
          </p>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── JOBS TAB ── */}
        {activeTab === "jobs" && (
          <>
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
                  <p className="text-sm font-semibold text-gray-400">No assigned jobs yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => {
                    const diagnosis = data.diagnoses[job.diagnosisId ?? ""];
                    const booking = bookingForJob(job);
                    const customer = data.customers[job.userId];
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

                          {/* CTAs */}
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
          </>
        )}

        {/* ── INVENTORY TAB ── */}
        {activeTab === "inventory" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 pb-5 pt-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Inventory
                {lowStock.length > 0 && (
                  <span className="ml-1.5 text-red-500">· {lowStock.length} low</span>
                )}
              </p>
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
          </div>
        )}

        {/* ── EARNINGS TAB ── */}
        {activeTab === "earnings" && (
          <div className="space-y-4">
            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 p-5 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Available balance</p>
                <p className="text-3xl font-black text-green-700 mt-1 leading-none">
                  {naira(artisan.artisan_available_balance)}
                </p>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending (in escrow)</p>
                <p className="text-3xl font-black text-yellow-600 mt-1 leading-none">
                  {naira(artisan.artisan_pending_balance)}
                </p>
              </div>
            </div>

            {/* Bank Account + Payout */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Request Payout</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {/* Bank picker */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Bank</label>
                  <select
                    value={bankCode}
                    onChange={(e) => { setBankCode(e.target.value); setAccountName(""); setResolveErr(""); }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900 bg-white"
                  >
                    <option value="">Select bank…</option>
                    {banks.map((b) => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Account number */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Account number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, "")); setAccountName(""); setResolveErr(""); }}
                      placeholder="0123456789"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                    />
                    <button
                      onClick={resolveAccount}
                      disabled={resolving || !bankCode || accountNumber.length < 10}
                      className="px-4 py-3 bg-gray-950 text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 whitespace-nowrap"
                    >
                      {resolving ? "Checking…" : "Verify"}
                    </button>
                  </div>
                  {resolveErr && <p className="mt-1 text-xs text-red-600 font-semibold">{resolveErr}</p>}
                  {accountName && (
                    <p className="mt-1 text-xs font-black text-green-700">✓ {accountName}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                    Amount (₦) <span className="normal-case font-semibold">— max {naira(artisan.artisan_available_balance)}</span>
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={artisan.artisan_available_balance}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                  />
                </div>

                <button
                  onClick={requestPayout}
                  disabled={payoutLoading || !accountName || !payoutAmount || artisan.artisan_available_balance <= 0}
                  className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {payoutLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {payoutLoading ? "Processing…" : "Transfer to Bank →"}
                </button>

                {payoutMsg && (
                  <p className={`text-xs font-semibold text-center ${payoutMsg.startsWith("Transfer initiated") ? "text-green-700" : "text-red-600"}`}>
                    {payoutMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Transaction History */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Transaction History</p>

              {txLoading ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-3 bg-gray-100 rounded flex-1" />
                      <div className="h-3 bg-gray-100 rounded w-20" />
                      <div className="h-3 bg-gray-100 rounded w-16" />
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                  <p className="text-sm font-semibold text-gray-400">No transactions yet</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <EarningsTh>Date</EarningsTh>
                          <EarningsTh>Action</EarningsTh>
                          <EarningsTh>Amount</EarningsTh>
                          <EarningsTh>Note</EarningsTh>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-400 font-semibold whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString("en-NG", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="pr-4 text-gray-700 capitalize font-semibold whitespace-nowrap">
                              {tx.action.replaceAll("_", " ")}
                            </td>
                            <td className="pr-4 font-black text-gray-950 whitespace-nowrap">
                              {naira(tx.amount)}
                            </td>
                            <td className="pr-4 text-gray-400 font-semibold max-w-[140px] truncate">
                              {tx.note || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function EarningsTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="pb-2 px-4 pt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
      {children}
    </th>
  );
}
