"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { generateDisputeSummary } from "@/app/actions";
import { Artisan, Booking, DiagnosisRecord, DisputeSummary, EscrowTransaction, JobRequest } from "@/lib/types";

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

// Bar chart colors keyed by escrow status (bg color extracted from ESCROW_BADGE)
const ESCROW_BAR_COLOR: Record<string, string> = {
  funded:      "bg-yellow-400",
  accepted:    "bg-blue-400",
  in_progress: "bg-purple-400",
  completed:   "bg-green-400",
  released:    "bg-gray-300",
  disputed:    "bg-red-400",
  refunded:    "bg-gray-200",
  not_funded:  "bg-gray-200",
};

interface Dispute {
  id: string;
  bookingId: string;
  jobId: string;
  userId: string;
  artisanId: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface AdminData {
  artisans: Artisan[];
  bookings: Booking[];
  disputes: Dispute[];
  txns: EscrowTransaction[];
  jobs: JobRequest[];
  diagnoses: DiagnosisRecord[];
  platformFeeBalance: number;
}

function toArtisan(r: Record<string, unknown>): Artisan {
  return {
    id: r.id as string,
    fullName: r.full_name as string,
    phone: r.phone as string,
    category: r.category as Artisan["category"],
    location: r.location as string,
    yearsExperience: r.years_experience as number,
    verificationId: (r.verification_id ?? "") as string,
    skills: (r.skills ?? []) as string[],
    serviceRadiusKm: r.service_radius_km as number,
    opayPhone: (r.opay_phone ?? "") as string,
    trustScore: r.trust_score as number,
    completedJobs: r.completed_jobs as number,
    isVerified: r.is_verified as boolean,
    applicationStatus: r.application_status as Artisan["applicationStatus"],
    artisan_pending_balance: r.artisan_pending_balance as number,
    artisan_available_balance: r.artisan_available_balance as number,
    avatar: (r.avatar ?? "") as string,
    emergencyAvailable: (r.emergency_available ?? false) as boolean,
    serviceAreas: (r.service_areas ?? []) as string[],
    rating: r.rating as number | undefined,
    createdAt: r.created_at as string,
  };
}

function toBooking(r: Record<string, unknown>): Booking {
  return {
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
  };
}

export default function AdminPage() {
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [disputeSummaries, setDisputeSummaries] = useState<Record<string, DisputeSummary>>({});
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      setError(j.error ?? "Failed to load admin data");
      setLoading(false);
      return;
    }
    const raw = await res.json() as {
      artisans: Record<string, unknown>[];
      bookings: Record<string, unknown>[];
      disputes: Record<string, unknown>[];
      txns: Record<string, unknown>[];
      jobs: Record<string, unknown>[];
      diagnoses: Record<string, unknown>[];
      config: Record<string, unknown> | null;
    };

    setAdminData({
      artisans: (raw.artisans ?? []).map(toArtisan),
      bookings: (raw.bookings ?? []).map(toBooking),
      disputes: (raw.disputes ?? []).map((d) => ({
        id: d.id as string,
        bookingId: d.booking_id as string,
        jobId: d.job_id as string,
        userId: d.user_id as string,
        artisanId: d.artisan_id as string,
        reason: d.reason as string,
        status: d.status as string,
        createdAt: d.created_at as string,
      })),
      txns: (raw.txns ?? []).map((r) => ({
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
        note: r.note as string,
        createdAt: r.created_at as string,
      })) as EscrowTransaction[],
      jobs: (raw.jobs ?? []).map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        description: r.description as string,
        imageProvided: r.image_provided as boolean,
        location: r.location as string,
        diagnosisId: (r.diagnosis_id ?? "") as string,
        selectedArtisanId: r.selected_artisan_id as string | undefined,
        bookingId: r.booking_id as string | undefined,
        status: r.status as JobRequest["status"],
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      })),
      diagnoses: (raw.diagnoses ?? []).map((r) => ({
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
      })),
      platformFeeBalance: (raw.config?.fee_balance ?? 0) as number,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runEscrow = async (bookingId: string, action: "admin_release" | "admin_refund", note: string) => {
    setActionErrors((prev) => ({ ...prev, [bookingId]: "" }));
    const res = await fetch("/api/admin/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, action, note }),
    });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      setActionErrors((prev) => ({ ...prev, [bookingId]: j.error ?? "Action failed." }));
      return;
    }
    await load();
  };

  const updateArtisan = async (artisanId: string, updates: Partial<Artisan>) => {
    await fetch(`/api/admin/artisans/${artisanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await load();
  };

  const getDisputeSummary = async (disputeId: string) => {
    if (!adminData) return;
    const dispute = adminData.disputes.find((d) => d.id === disputeId);
    if (!dispute) return;
    const booking = adminData.bookings.find((b) => b.id === dispute.bookingId);
    const job = adminData.jobs.find((j) => j.id === dispute.jobId);
    const diagnosis = adminData.diagnoses.find((d) => d.id === job?.diagnosisId);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !adminData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 font-semibold">{error || "Access denied."}</p>
        <Link href="/auth?next=/admin" className="bg-green-600 text-white px-6 py-3 text-sm font-black rounded-xl hover:bg-green-700">
          Sign in →
        </Link>
      </div>
    );
  }

  const { artisans, bookings, disputes, txns, platformFeeBalance } = adminData;
  const totalEscrow = bookings
    .filter((b) => !["released", "refunded"].includes(b.escrowStatus))
    .reduce((s, b) => s + b.quoteAmount, 0);
  const openDisputes = disputes.filter((d) => d.status === "open").length;
  const pendingApps = artisans.filter((a) => a.applicationStatus === "pending").length;

  // ── Analytics derived values ──
  const totalRevenue = bookings
    .filter((b) => b.escrowStatus === "released")
    .reduce((s, b) => s + b.quoteAmount, 0);

  const activeJobs = bookings.filter(
    (b) => !["released", "refunded", "not_funded"].includes(b.escrowStatus)
  ).length;

  // Bookings by escrow status
  const statusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.escrowStatus] = (acc[b.escrowStatus] ?? 0) + 1;
    return acc;
  }, {});
  const totalBookings = bookings.length;

  const statusOrder: string[] = [
    "funded", "accepted", "in_progress", "completed", "released", "disputed", "refunded", "not_funded",
  ];
  const chartRows = statusOrder
    .filter((s) => (statusCounts[s] ?? 0) > 0)
    .map((s) => ({ status: s, count: statusCounts[s] ?? 0 }));
  const maxCount = Math.max(...chartRows.map((r) => r.count), 1);

  // Top 5 artisans by completedJobs
  const top5 = [...artisans]
    .sort((a, b) => b.completedJobs - a.completedJobs)
    .slice(0, 5);

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
            <p className="text-xs text-gray-400 font-semibold">iSabi</p>
          </div>
        </div>
        <Link href="/" className="text-xs font-black text-gray-400 hover:text-gray-950 transition-colors">
          ← Home
        </Link>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* ── ANALYTICS SECTION ── */}
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Analytics</p>

          {/* KPI chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 p-5 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Revenue</p>
              <p className="text-3xl font-black text-gray-950 mt-1 leading-none">{naira(totalRevenue)}</p>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active Jobs</p>
              <p className="text-3xl font-black text-gray-950 mt-1 leading-none">{activeJobs}</p>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Registered Artisans</p>
              <p className="text-3xl font-black text-gray-950 mt-1 leading-none">{artisans.length}</p>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending Approvals</p>
              <p className="text-3xl font-black text-gray-950 mt-1 leading-none">{pendingApps}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bookings by status — CSS bar chart */}
            <div className="bg-white border border-gray-200 p-5 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                Bookings by Status
                {totalBookings > 0 && (
                  <span className="ml-1.5 font-semibold normal-case tracking-normal text-gray-300">
                    ({totalBookings} total)
                  </span>
                )}
              </p>
              {chartRows.length === 0 ? (
                <p className="text-xs text-gray-400 font-semibold">No bookings yet</p>
              ) : (
                <div className="space-y-3">
                  {chartRows.map(({ status, count }) => {
                    const pct = totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0;
                    const barWidthPct = totalBookings > 0 ? (count / maxCount) * 100 : 0;
                    const barColor = ESCROW_BAR_COLOR[status] ?? "bg-gray-200";
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-gray-600 capitalize">
                            {status.replaceAll("_", " ")}
                          </span>
                          <span className="text-[10px] font-black text-gray-400">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${barWidthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top 5 artisans by jobs done */}
            <div className="bg-white border border-gray-200 p-5 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                Top 5 Artisans by Jobs Done
              </p>
              {top5.length === 0 ? (
                <p className="text-xs text-gray-400 font-semibold">No artisans yet</p>
              ) : (
                <ol className="space-y-3">
                  {top5.map((artisan, idx) => (
                    <li key={artisan.id} className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          idx === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : idx === 1
                            ? "bg-gray-100 text-gray-600"
                            : idx === 2
                            ? "bg-orange-100 text-orange-600"
                            : "bg-gray-50 text-gray-400"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-gray-950 truncate">{artisan.fullName}</p>
                        <p className="text-[10px] font-semibold text-gray-400 truncate">{artisan.category}</p>
                      </div>
                      <span className="text-xs font-black text-gray-950 shrink-0">
                        {artisan.completedJobs}
                        <span className="text-[10px] font-semibold text-gray-400 ml-0.5">jobs</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* ── SUMMARY STRIP ── */}
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
            <p className="text-2xl font-black text-green-600 mt-1">{naira(platformFeeBalance)}</p>
          </div>
        </div>

        {/* ── DISPUTES (priority first) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Disputes</p>
            {disputes.length > 0 && (
              <span className="rounded-full text-[10px] font-black px-2 py-0.5 bg-red-600 text-white">{disputes.length}</span>
            )}
          </div>

          {disputes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-sm font-semibold text-gray-400">No disputes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((dispute) => {
                const booking = bookings.find((b) => b.id === dispute.bookingId);
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
            {artisans.length === 0 ? (
              <p className="text-xs text-gray-400 font-semibold py-6 text-center">No artisans yet.</p>
            ) : artisans.map((artisan, i) => (
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
                    onClick={() => updateArtisan(artisan.id, { applicationStatus: "approved", isVerified: true })}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-black rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateArtisan(artisan.id, { applicationStatus: "rejected", isVerified: false })}
                    className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-black rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => updateArtisan(artisan.id, { trustScore: Math.min(100, artisan.trustScore + 5) })}
                    className="px-2.5 py-1.5 border border-gray-200 text-gray-600 text-xs font-black rounded-lg hover:bg-gray-50 transition-colors"
                    title="Trust +5"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => updateArtisan(artisan.id, { trustScore: Math.max(0, artisan.trustScore - 5) })}
                    className="px-2.5 py-1.5 border border-gray-200 text-gray-600 text-xs font-black rounded-lg hover:bg-gray-50 transition-colors"
                    title="Trust −5"
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
            <span>Payments &amp; Escrow ({bookings.length})</span>
            <span className="text-gray-300">▾</span>
          </summary>
          <div className="border-t border-gray-100">
            {bookings.length === 0 ? (
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
                    {bookings.map((booking) => {
                      const artisan = artisans.find((a) => a.id === booking.artisanId);
                      const canAct = !["released", "refunded", "not_funded"].includes(booking.escrowStatus);
                      const err = actionErrors[booking.id];
                      return (
                        <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-5 font-mono text-xs text-gray-400">{booking.opayReference || booking.id.slice(0, 8)}</td>
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

        {/* ── LEDGER (collapsed) */}
        <details className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <summary className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span>Advanced — Escrow Ledger ({txns.length})</span>
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
                {txns.map((tx) => (
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
