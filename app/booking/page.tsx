"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { performEscrowAction, subscribeBooking } from "@/lib/api";
import { Artisan, Booking, DiagnosisRecord, JobRequest } from "@/lib/types";
import JobChat from "@/components/JobChat";

interface PaystackPopOptions {
  key: string; email: string; amount: number; ref: string; currency?: string;
  onSuccess: (t: { reference: string }) => void;
  onCancel: () => void;
}
declare global {
  interface Window { PaystackPop: new () => { newTransaction: (o: PaystackPopOptions) => void }; }
}

const naira = (v: number) => `₦${v.toLocaleString()}`;

const STATUS_META: Record<string, { label: string; color: string; hint: string; dot: string }> = {
  not_funded:  { label: "Awaiting Payment",   color: "bg-amber-50 text-amber-700 border border-amber-200",     hint: "Pay to lock funds in escrow.",               dot: "bg-amber-400" },
  payment_pending: { label: "Payment Pending",color: "bg-amber-50 text-amber-700 border border-amber-200",     hint: "Processing your payment…",                  dot: "bg-amber-400" },
  funded:      { label: "Escrow Funded",       color: "bg-blue-50 text-blue-700 border border-blue-200",        hint: "Waiting for artisan to accept.",             dot: "bg-blue-400" },
  accepted:    { label: "Artisan Accepted",    color: "bg-indigo-50 text-indigo-700 border border-indigo-200",  hint: "Artisan is on the way.",                    dot: "bg-indigo-400" },
  in_progress: { label: "In Progress",         color: "bg-purple-50 text-purple-700 border border-purple-200",  hint: "Funds locked until completion.",             dot: "bg-purple-400" },
  completed:   { label: "Job Completed",       color: "bg-green-50 text-green-700 border border-green-200",     hint: "Inspect work and release funds.",            dot: "bg-green-400" },
  released:    { label: "Payment Released",    color: "bg-green-50 text-green-800 border border-green-200",     hint: "Job complete. Payment sent.",                dot: "bg-green-600" },
  disputed:    { label: "Dispute Open",        color: "bg-red-50 text-red-700 border border-red-200",           hint: "Admin is reviewing.",                        dot: "bg-red-400" },
  refunded:    { label: "Refunded",            color: "bg-gray-100 text-gray-600 border border-gray-200",       hint: "Payment returned.",                          dot: "bg-gray-400" },
};

interface BookingData {
  booking:  Booking;
  job:      JobRequest;
  artisan:  Artisan;
  diagnosis: DiagnosisRecord;
}

type Tab = "order" | "chat";

export default function BookingPage() {
  const router = useRouter();
  const [data,        setData]        = useState<BookingData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [isWorking,   setIsWorking]   = useState(false);
  const [error,       setError]       = useState("");
  const [paySuccess,  setPaySuccess]  = useState(false);
  const [disputeText, setDisputeText] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [activeTab,   setActiveTab]   = useState<Tab>("order");
  const [chatBadge,   setChatBadge]   = useState(false);

  const bookingId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("bookingId")
      : null;

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    const supabase = createClient();
    async function load() {
      const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
      if (!booking) { setLoading(false); return; }
      const [{ data: job }, { data: artisan }] = await Promise.all([
        supabase.from("job_requests").select("*").eq("id", booking.job_id).single(),
        supabase.from("artisans").select("*").eq("id", booking.artisan_id).single(),
      ]);
      if (!job || !artisan) { setLoading(false); return; }
      const { data: diagnosis } = await supabase.from("diagnoses").select("*").eq("id", job.diagnosis_id).single();
      if (!diagnosis) { setLoading(false); return; }

      const toBooking = (r: Record<string, unknown>): Booking => ({
        id: r.id as string, jobId: r.job_id as string, userId: r.user_id as string,
        artisanId: r.artisan_id as string, quoteAmount: r.quote_amount as number,
        userFee: r.user_fee as number, artisanFee: r.artisan_fee as number,
        totalCharge: r.total_charge as number,
        escrowStatus: r.escrow_status as Booking["escrowStatus"],
        opayReference: (r.paystack_reference ?? r.opay_reference ?? "") as string,
        createdAt: r.created_at as string, updatedAt: r.updated_at as string,
      });
      const toJobRequest = (r: Record<string, unknown>): JobRequest => ({
        id: r.id as string, userId: r.user_id as string, description: r.description as string,
        imageProvided: r.image_provided as boolean, location: r.location as string,
        diagnosisId: (r.diagnosis_id ?? "") as string,
        selectedArtisanId: r.selected_artisan_id as string | undefined,
        bookingId: r.booking_id as string | undefined,
        status: r.status as JobRequest["status"],
        createdAt: r.created_at as string, updatedAt: r.updated_at as string,
      });
      const toArtisan = (r: Record<string, unknown>): Artisan => ({
        id: r.id as string, fullName: r.full_name as string, phone: r.phone as string,
        category: r.category as Artisan["category"], location: r.location as string,
        yearsExperience: r.years_experience as number, verificationId: (r.verification_id ?? "") as string,
        skills: (r.skills ?? []) as string[], serviceRadiusKm: r.service_radius_km as number,
        opayPhone: (r.opay_phone ?? "") as string, trustScore: r.trust_score as number,
        completedJobs: r.completed_jobs as number, isVerified: r.is_verified as boolean,
        applicationStatus: r.application_status as Artisan["applicationStatus"],
        artisan_pending_balance: r.artisan_pending_balance as number,
        artisan_available_balance: r.artisan_available_balance as number,
        avatar: (r.avatar ?? "") as string,
        emergencyAvailable: (r.emergency_available ?? false) as boolean,
        serviceAreas: (r.service_areas ?? []) as string[],
        rating: r.rating as number | undefined, createdAt: r.created_at as string,
      });
      const toDiagnosis = (r: Record<string, unknown>): DiagnosisRecord => ({
        id: r.id as string, jobId: r.job_id as string, userId: r.user_id as string,
        issue_title: r.issue_title as string, summary: r.summary as string,
        artisan_category: r.artisan_category as DiagnosisRecord["artisan_category"],
        urgency: r.urgency as DiagnosisRecord["urgency"],
        estimated_min_naira: r.estimated_min_naira as number, estimated_max_naira: r.estimated_max_naira as number,
        estimated_labor_naira: r.estimated_labor_naira as number, estimated_materials_naira: r.estimated_materials_naira as number,
        safety_warning: r.safety_warning as string | null,
        first_aid_steps: (r.first_aid_steps ?? []) as string[],
        follow_up_questions: (r.follow_up_questions ?? []) as string[],
        artisan_brief: r.artisan_brief as DiagnosisRecord["artisan_brief"],
        language: r.language as DiagnosisRecord["language"], createdAt: r.created_at as string,
      });

      setData({
        booking:   toBooking(booking as Record<string, unknown>),
        job:       toJobRequest(job as Record<string, unknown>),
        artisan:   toArtisan(artisan as Record<string, unknown>),
        diagnosis: toDiagnosis(diagnosis as Record<string, unknown>),
      });
      setLoading(false);
    }
    load();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const ch = subscribeBooking(bookingId, (updated) =>
      setData((prev) => prev ? { ...prev, booking: updated } : null)
    );
    return () => { ch.unsubscribe(); };
  }, [bookingId]);

  // Show chat badge when a new message arrives while on Order tab
  useEffect(() => {
    if (!data?.job.id) return;
    const supabase = createClient();
    const ch = supabase
      .channel(`booking-chat-badge:${data.job.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `job_id=eq.${data.job.id}` },
        () => { if (activeTab === "order") setChatBadge(true); }
      )
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [data?.job.id, activeTab]);

  const run = async (action: "user_release" | "open_dispute") => {
    if (!data) return;
    setIsWorking(true); setError("");
    try {
      const note    = action === "open_dispute" ? (disputeText.trim() || "User opened a dispute.") : "";
      const updated = await performEscrowAction(data.booking.id, action, note);
      setData((prev) => prev ? { ...prev, booking: updated } : null);
      if (action === "user_release") setTimeout(() => router.push("/dashboard"), 800);
      setShowDispute(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Action failed."); }
    finally { setIsWorking(false); }
  };

  const fundEscrow = async () => {
    if (!data) return;
    setIsWorking(true); setError("");
    try {
      const res  = await fetch("/api/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: data.booking.id }) });
      const json = await res.json() as { reference?: string; publicKey?: string; email?: string; amountKobo?: number; error?: string };
      if (!res.ok || !json.reference) throw new Error(json.error ?? "Payment init failed");
      const Pop = window.PaystackPop;
      if (!Pop) throw new Error("Payment script not loaded. Please refresh.");
      new Pop().newTransaction({ key: json.publicKey!, email: json.email!, amount: json.amountKobo!, ref: json.reference, currency: "NGN",
        onSuccess: () => { setIsWorking(false); setPaySuccess(true); setTimeout(() => setPaySuccess(false), 5000); },
        onCancel:  () => setIsWorking(false),
      });
    } catch (err) { setError(err instanceof Error ? err.message : "Payment failed."); setIsWorking(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <span className="w-6 h-6 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-6">
      <p className="text-gray-500 font-semibold">No booking found.</p>
      <Link href="/report" className="bg-green-700 text-white px-6 py-3 text-sm font-black rounded-xl hover:bg-green-800">Create a job request →</Link>
    </div>
  );

  const { booking, artisan, diagnosis, job } = data;
  const isFunded  = booking.escrowStatus !== "not_funded" && booking.escrowStatus !== "payment_pending";
  const canRelease = booking.escrowStatus === "completed";
  const canDispute = ["funded", "accepted", "in_progress", "completed"].includes(booking.escrowStatus);
  const meta = STATUS_META[booking.escrowStatus] ?? STATUS_META.not_funded;

  // ── Shared order panel content ──────────────────────────────────
  const OrderPanel = (
    <div className="space-y-4 px-4 sm:px-6 py-6 max-w-lg mx-auto md:mx-0 md:max-w-none">

      {/* Payment success flash */}
      {paySuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-green-600 text-xl shrink-0">✓</span>
          <div>
            <p className="text-sm font-black text-green-800">Payment received!</p>
            <p className="text-xs text-green-700 mt-0.5">Funds secured in escrow. Waiting for artisan to accept.</p>
          </div>
        </div>
      )}

      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${meta.color}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot} ${booking.escrowStatus === "in_progress" ? "animate-pulse" : ""}`} />
        <div>
          <p className="text-sm font-black">{meta.label}</p>
          <p className="text-xs opacity-75 mt-0.5">{meta.hint}</p>
        </div>
      </div>

      {/* Artisan card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        {artisan.avatar
          ? <Image unoptimized src={artisan.avatar} alt={artisan.fullName} width={52} height={52} className="w-13 h-13 rounded-full object-cover border-2 border-green-100 shrink-0" />
          : <div className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-white">{artisan.fullName.charAt(0)}</span>
            </div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-black text-gray-950 text-sm">{artisan.fullName}</h2>
            {artisan.isVerified && <span className="text-[9px] font-black bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">✓ VERIFIED</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 font-semibold">{artisan.category} · {artisan.trustScore}% Trust Score</p>
          <p className="text-xs text-gray-400">{artisan.location}</p>
        </div>
        <span className="text-xl font-black text-gray-950 shrink-0">{naira(booking.totalCharge)}</span>
      </div>

      {/* Payment summary */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Summary</span>
          <span className="ml-auto font-mono text-[10px] text-gray-300">{booking.opayReference || booking.id.slice(0, 8)}</span>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          <Row label={diagnosis.issue_title} value={naira(booking.quoteAmount)} />
          <Row label="Platform fee (2%)" value={naira(booking.userFee)} muted />
          <div className="border-t border-gray-50 pt-2.5">
            <Row label="Total charged" value={naira(booking.totalCharge)} bold />
          </div>
          <div className="border-t border-gray-50 pt-2.5">
            <Row label="AI estimate" value={`${naira(diagnosis.estimated_min_naira)} – ${naira(diagnosis.estimated_max_naira)}`} muted />
            <Row label="Artisan receives" value={naira(booking.quoteAmount - booking.artisanFee)} muted />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-700 font-semibold">{error}</div>}

        {!isFunded && (
          <>
            <button onClick={fundEscrow} disabled={isWorking}
              className="w-full py-4 bg-green-700 text-white font-black text-sm rounded-2xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm">
              {isWorking && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isWorking ? "Opening payment…" : `Pay ${naira(booking.totalCharge)} via Paystack →`}
            </button>
            <p className="text-center text-xs text-gray-400">Secured by Paystack · funds held in escrow until job is done</p>
          </>
        )}

        {isFunded && (
          <>
            {booking.escrowStatus === "completed" && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-semibold text-green-800">
                ✓ Work complete. Inspect then release payment when satisfied.
              </div>
            )}
            {booking.escrowStatus === "disputed" && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm font-semibold text-red-800">
                Dispute open — <Link href="/admin" className="underline font-black">Admin Console</Link> reviewing.
              </div>
            )}
            {booking.escrowStatus === "released" && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm font-semibold text-green-900">
                ✓ {naira(booking.quoteAmount - booking.artisanFee)} sent to artisan. Job complete!
              </div>
            )}
            <button onClick={() => run("user_release")} disabled={isWorking || !canRelease}
              title={!canRelease ? "Available after artisan marks job complete" : ""}
              className="w-full py-4 bg-gray-950 text-white font-black text-sm rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-30 flex items-center justify-center gap-2">
              {isWorking && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {canRelease ? `Release ${naira(booking.quoteAmount)} to Artisan` : "Awaiting artisan completion…"}
            </button>
            {canDispute && !showDispute && (
              <button onClick={() => setShowDispute(true)}
                className="w-full py-3 border border-red-200 text-red-600 text-sm font-black rounded-2xl hover:bg-red-50 transition-colors">
                Open Dispute
              </button>
            )}
            {showDispute && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-black text-gray-950">Describe the issue</p>
                <textarea value={disputeText} onChange={(e) => setDisputeText(e.target.value)}
                  className="w-full border border-red-200 bg-white p-3 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 rounded-xl"
                  placeholder="The artisan left without completing the work…" />
                <div className="flex gap-2">
                  <button onClick={() => run("open_dispute")} disabled={isWorking}
                    className="flex-1 py-2.5 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 disabled:opacity-50">Submit</button>
                  <button onClick={() => setShowDispute(false)}
                    className="flex-1 py-2.5 border border-gray-200 bg-white text-sm font-black text-gray-700 rounded-xl hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── Chat panel header (desktop) ─────────────────────────────────
  const ChatHeader = (
    <div className="px-4 py-3 bg-gray-950 flex items-center gap-3 shrink-0">
      {artisan.avatar
        ? <Image unoptimized src={artisan.avatar} alt={artisan.fullName} width={36} height={36} className="w-9 h-9 rounded-full object-cover border-2 border-white/20" />
        : <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-sm font-black text-white shrink-0">
            {artisan.fullName.charAt(0)}
          </div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white truncate">{artisan.fullName}</p>
        <p className="text-[10px] text-gray-400 font-semibold">{artisan.category}</p>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-green-400">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        Live
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />

      {/* ── Global header ────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3.5 flex items-center gap-3 sticky top-0 z-20 shrink-0">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-950 text-sm font-black transition-colors">← Back</Link>
        <span className="text-gray-200">/</span>
        <span className="text-sm font-black text-gray-950">Booking</span>
        <span className={`ml-2 text-[10px] font-black px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
        <span className="ml-auto font-mono text-xs text-gray-300 hidden sm:block">{booking.id.slice(0, 8).toUpperCase()}</span>
      </header>

      {/* ── DESKTOP: side-by-side ───────────────────────────────── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left: order details */}
        <div className="flex-1 overflow-y-auto">
          {OrderPanel}
        </div>
        {/* Right: chat */}
        <div className="w-[400px] border-l border-gray-100 flex flex-col bg-white shrink-0">
          {ChatHeader}
          <JobChat
            jobId={job.id}
            currentUserType="user"
            otherName={artisan.fullName}
            otherAvatar={artisan.avatar || undefined}
            className="flex-1"
          />
        </div>
      </div>

      {/* ── MOBILE: tab bar ─────────────────────────────────────── */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        {/* Tab bar */}
        <div className="bg-white border-b border-gray-100 flex shrink-0 sticky top-[57px] z-10">
          <button
            onClick={() => setActiveTab("order")}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${
              activeTab === "order" ? "border-b-2 border-gray-950 text-gray-950" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            📋 Order
          </button>
          <button
            onClick={() => { setActiveTab("chat"); setChatBadge(false); }}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "chat" ? "border-b-2 border-gray-950 text-gray-950" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            💬 Chat
            {chatBadge && <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />}
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "order" ? (
          <div className="flex-1 overflow-y-auto">
            {OrderPanel}
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {ChatHeader}
            <JobChat
              jobId={job.id}
              currentUserType="user"
              otherName={artisan.fullName}
              otherAvatar={artisan.avatar || undefined}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, muted = false, bold = false }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className={`text-sm ${muted ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
      <span className={`text-sm text-right ${bold ? "font-black text-gray-950 text-base" : muted ? "text-gray-400" : "font-semibold text-gray-950"}`}>{value}</span>
    </div>
  );
}
