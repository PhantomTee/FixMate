"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGeoLocation } from "@/lib/useGeoLocation";
import JobChat from "@/components/JobChat";
import RatingWidget from "@/components/RatingWidget";
import {
  loadUserDb,
  performEscrowAction,
  saveReview,
  subscribeBooking,
} from "@/lib/api";
import { Booking, DiagnosisRecord, EscrowTransaction, iSabiDB, JobRequest } from "@/lib/types";

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

const STATUS_LABEL: Record<string, string> = {
  funded:      "Escrow funded",
  accepted:    "Artisan accepted",
  in_progress: "In progress",
  completed:   "Job complete — pending release",
  released:    "Payment released",
  disputed:    "Disputed",
  not_funded:  "Awaiting payment",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface UserProfile { id: string; name: string; phone: string; location: string; avatar?: string }

export default function ProfilePage() {
  const router = useRouter();

  // Profile / settings state
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [editName, setEditName]   = useState("");
  const [editLoc, setEditLoc]     = useState("");
  const [avatar, setAvatar]       = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const geo = useGeoLocation();
  const [saving, setSaving]     = useState(false);
  const [saveOk, setSaveOk]     = useState(false);
  const [saveErr, setSaveErr]   = useState("");

  // Dashboard state
  const [db, setDb]               = useState<iSabiDB | null>(null);
  const [loading, setLoading]     = useState(true);
  const [reviewText, setReviewText]       = useState("");
  const [disputeOpen, setDisputeOpen]     = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await loadUserDb();
      if (!data) {
        router.push("/auth?next=/profile");
        return;
      }
      setDb(data);
    } catch {
      router.push("/auth?next=/profile");
      return;
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // Load profile settings
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user?: UserProfile | null }) => {
        if (!data.user) { router.push("/auth?next=/profile"); return; }
        setProfile(data.user);
        setEditName(data.user.name ?? "");
        setEditLoc(data.user.location ?? "");
        setAvatar(data.user.avatar ?? null);
      })
      .catch(() => router.push("/auth?next=/profile"));

    refresh();
  }, [router, refresh]);

  const data = useMemo(() => {
    if (!db) return null;
    const user = db.users[0];
    if (!user) return null;
    const jobs    = db.job_requests;
    const active  = jobs.find((j) => !["released", "refunded", "declined"].includes(j.status)) ?? jobs[0];
    const booking = active?.bookingId ? db.bookings.find((b) => b.id === active.bookingId) : undefined;
    const diagnosis = active ? db.diagnoses.find((d) => d.id === active.diagnosisId) : undefined;
    const artisan   = active?.selectedArtisanId ? db.artisans.find((a) => a.id === active.selectedArtisanId) : undefined;
    const transactions = db.escrow_transactions.filter((tx) => !booking || tx.bookingId === booking.id).slice(0, 5);
    return { user, jobs, active, booking, diagnosis, artisan, transactions };
  }, [db]);

  useEffect(() => {
    const bookingId = data?.booking?.id;
    if (!bookingId) return;
    const channel = subscribeBooking(bookingId, (updated) => {
      setDb((prev) => {
        if (!prev) return prev;
        return { ...prev, bookings: prev.bookings.map((b) => (b.id === updated.id ? updated : b)) };
      });
    });
    return () => { channel.unsubscribe(); };
  }, [data?.booking?.id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setAvatarUploading(true);
    try {
      const supabase = (await import("@/lib/supabase")).createClient();
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `avatars/${profile.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatar(publicUrl);

      // Persist to users table
      await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, location: editLoc, phone: profile.phone, avatar: publicUrl }),
      });
      setProfile((p) => p ? { ...p, avatar: publicUrl } : p);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveErr("");
    setSaveOk(false);
    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, location: editLoc, phone: profile?.phone ?? "" }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Failed to update profile");
      setSaveOk(true);
      setProfile((p) => p ? { ...p, name: editName, location: editLoc } : p);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const run = async (action: "user_release") => {
    if (!data?.booking) return;
    try {
      const updated = await performEscrowAction(data.booking.id, action, "");
      setDb((prev) => prev ? { ...prev, bookings: prev.bookings.map((b) => (b.id === updated.id ? updated : b)) } : prev);
    } catch { /* ignore */ }
  };

  const submitDispute = async () => {
    if (!data?.booking || !data?.active || !disputeReason.trim()) return;
    setDisputeLoading(true);
    try {
      await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: data.booking.id,
          jobId:     data.active.id,
          artisanId: data.booking.artisanId,
          reason:    disputeReason.trim(),
        }),
      });
      setDisputeOpen(false);
      setDisputeReason("");
      await refresh();
    } catch { /* ignore */ } finally {
      setDisputeLoading(false);
    }
  };

  const submitReview = async () => {
    if (!data?.active || !reviewText.trim()) return;
    try {
      await saveReview(data.active.id, 5, reviewText.trim());
      setReviewText("");
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  const user       = data?.user;
  const jobs       = data?.jobs ?? [];
  const active     = data?.active;
  const booking    = data?.booking;
  const diagnosis  = data?.diagnosis;
  const artisan    = data?.artisan;
  const transactions = data?.transactions ?? [];
  const canRelease = booking?.escrowStatus === "completed";
  const escrow     = booking?.escrowStatus;
  const firstName  = profile?.name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Avatar + stats header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-5">
          <div className="flex items-center gap-4">
            {/* Avatar — click to upload */}
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="relative w-16 h-16 rounded-full shrink-0 overflow-hidden group focus:outline-none"
              title="Change profile photo"
            >
              {avatar
                ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-green-700 flex items-center justify-center text-white text-2xl font-black select-none">
                    {(profile?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
              }
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading
                  ? <span className="text-white text-xs animate-spin">⟳</span>
                  : <span className="text-white text-xs">📷</span>
                }
              </div>
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-gray-950 leading-tight truncate">
                {greeting()}, {firstName}
              </h1>
              {profile?.location && <p className="text-xs text-gray-400 mt-0.5 font-semibold truncate">{profile.location}</p>}
              {profile?.phone   && <p className="text-xs text-gray-400 font-mono">{profile.phone}</p>}
            </div>
            <Link href="/report"
              className="shrink-0 bg-green-700 text-white text-xs font-black px-3 py-2 rounded-xl hover:bg-green-800 transition-colors">
              + New Job
            </Link>
          </div>

          {/* Stats strip */}
          {user && (
            <div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wallet</p>
                <p className="text-base font-black text-gray-950 mt-0.5">{naira(user.user_wallet_balance)}</p>
              </div>
              <div className="text-center border-x border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Escrowed</p>
                <p className="text-base font-black text-yellow-600 mt-0.5">{naira(user.escrow_balance)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Jobs</p>
                <p className="text-base font-black text-gray-950 mt-0.5">{jobs.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Active Job ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Active Job</p>
          {!active || !diagnosis ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-sm font-semibold text-gray-400 mb-4">No active job right now.</p>
              <Link href="/report"
                className="inline-block bg-green-600 text-white text-sm font-black px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors">
                Report New Issue →
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-black text-gray-950 text-base leading-snug">{diagnosis.issue_title}</h2>
                  <p className="text-xs text-gray-400 mt-0.5 font-semibold">
                    {artisan?.fullName ?? "No artisan yet"} · {active.location}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  {booking && <p className="font-black text-gray-950 text-lg leading-none">{naira(booking.quoteAmount)}</p>}
                  {escrow && (
                    <span className={`inline-block rounded-full text-[10px] font-black px-2.5 py-1 ${STATUS_BADGE[escrow] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[escrow] ?? escrow.replaceAll("_", " ")}
                    </span>
                  )}
                </div>
              </div>

              {booking ? (
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  {canRelease && (
                    <>
                      <button onClick={() => run("user_release")}
                        className="w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors">
                        Release Payment →
                      </button>
                      <button onClick={() => setDisputeOpen(true)}
                        className="w-full py-2.5 border border-red-200 text-red-600 text-sm font-black rounded-xl hover:bg-red-50 transition-colors">
                        Open Dispute
                      </button>
                    </>
                  )}

                  {(escrow === "funded" || escrow === "accepted" || escrow === "in_progress") && (
                    <>
                      <div className="w-full py-3 bg-gray-100 text-gray-400 text-sm font-black rounded-xl text-center select-none">
                        {escrow === "funded"      && "Waiting for artisan to accept"}
                        {escrow === "accepted"    && "Waiting for artisan to start"}
                        {escrow === "in_progress" && "Waiting for artisan to complete"}
                      </div>
                      <button onClick={() => setDisputeOpen(true)}
                        className="w-full py-2 border border-red-200 text-red-600 text-xs font-black rounded-xl hover:bg-red-50 transition-colors">
                        Open Dispute
                      </button>
                    </>
                  )}

                  {escrow === "not_funded" && (
                    <Link href={`/booking?bookingId=${booking.id}`}
                      className="block w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors text-center">
                      Pay Now →
                    </Link>
                  )}

                  {escrow === "released" && (
                    <>
                      <Link href={`/booking?bookingId=${booking.id}`}
                        className="block w-full py-3 bg-gray-950 text-white text-sm font-black rounded-xl hover:bg-gray-800 transition-colors text-center">
                        View Booking Details →
                      </Link>
                      {artisan && (
                        <RatingWidget
                          bookingId={booking.id}
                          artisanId={artisan.id}
                          artisanName={artisan.fullName ?? "Artisan"}
                        />
                      )}
                      {!artisan && active.status === "released" && (
                        <div className="flex gap-2 pt-1">
                          <input value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Leave a review for the artisan…"
                            className="flex-1 border border-gray-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 rounded-xl" />
                          <button onClick={submitReview}
                            className="bg-green-600 px-4 py-2 text-sm font-black text-white hover:bg-green-700 transition-colors rounded-xl">
                            Submit
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {escrow === "disputed" && (
                    <div className="w-full py-3 bg-red-50 border border-red-200 text-red-700 text-sm font-black rounded-xl text-center select-none">
                      Dispute under review
                    </div>
                  )}

                  <Link href={`/booking?bookingId=${booking.id}`}
                    className="block text-center text-xs font-black text-gray-400 hover:text-gray-600 transition-colors pt-1">
                    View full booking ↗
                  </Link>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-4">
                  <Link href="/report"
                    className="block w-full py-3 bg-gray-950 text-white text-sm font-black rounded-xl hover:bg-gray-800 transition-colors text-center">
                    View Booking →
                  </Link>
                </div>
              )}

              <details className="border-t border-gray-100 pt-3">
                <summary className="text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none list-none flex items-center justify-between">
                  <span>Messages</span>
                  <span className="text-gray-300">▾</span>
                </summary>
                <div className="mt-3">
                  <JobChat jobId={active.id} currentUserType="user" />
                </div>
              </details>
            </div>
          )}
        </div>

        {/* ── Activity & History ── */}
        <details className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <summary className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span>Activity &amp; History</span>
            <span className="text-gray-300">▾</span>
          </summary>
          <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Recent Transactions</p>
              {transactions.length === 0 ? (
                <p className="text-xs text-gray-400 font-semibold py-3 text-center">No transactions yet.</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">All Jobs</p>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                {jobs.length === 0 ? (
                  <p className="text-xs text-gray-400 font-semibold py-4 text-center">No jobs yet.</p>
                ) : (
                  jobs.map((job) => {
                    const d = db!.diagnoses.find((x) => x.id === job.diagnosisId);
                    const b = job.bookingId ? db!.bookings.find((x) => x.id === job.bookingId) : undefined;
                    return <JobRow key={job.id} job={job} diagnosis={d} booking={b} />;
                  })
                )}
              </div>
            </div>
          </div>
        </details>

        {/* ── Account Settings ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Settings</p>
          </div>
          <form onSubmit={handleSave} className="px-5 py-5 space-y-4">
            {saveErr && (
              <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">{saveErr}</div>
            )}
            {saveOk && (
              <div className="bg-green-50 border border-green-100 px-4 py-3 rounded-xl text-xs text-green-700 font-semibold">Profile updated!</div>
            )}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Full name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                placeholder="Ada Okonkwo"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                required />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">City / area</label>
              <div className="flex gap-2">
                <input type="text" value={editLoc} onChange={(e) => setEditLoc(e.target.value)}
                  placeholder="Ikeja, Lagos"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
                <button
                  type="button"
                  onClick={() => geo.detect(({ formatted }) => setEditLoc(formatted))}
                  disabled={geo.loading}
                  title="Use my location"
                  className="px-3 border border-green-600 text-green-700 rounded-xl hover:bg-green-50 transition-colors disabled:opacity-50 text-base"
                >
                  {geo.loading ? <span className="animate-spin inline-block">⟳</span> : "📍"}
                </button>
              </div>
              {geo.error && <p className="text-xs text-red-500 font-semibold mt-1">{geo.error}</p>}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Phone number</label>
              <p className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-400 bg-gray-50 select-none">
                {profile?.phone ?? "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Phone cannot be changed after registration.</p>
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? "Saving…" : "Save changes →"}
            </button>
          </form>
        </div>

      </main>

      {/* ── Dispute modal ── */}
      {disputeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-sm p-6 space-y-4">
            <div>
              <h2 className="font-black text-gray-950">Open a Dispute</h2>
              <p className="text-xs text-gray-400 mt-1 font-semibold">Describe the issue. Our team reviews disputes within 24 hours.</p>
            </div>
            <textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. Artisan did not complete the work as agreed…"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400 resize-none text-gray-900" />
            <div className="flex gap-2">
              <button onClick={() => { setDisputeOpen(false); setDisputeReason(""); }}
                className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-black rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={submitDispute} disabled={disputeLoading || !disputeReason.trim()}
                className="flex-1 py-3 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {disputeLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {disputeLoading ? "Submitting…" : "Submit Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TxRow({ tx }: { tx: EscrowTransaction }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
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
    <Link href={booking ? `/booking?bookingId=${booking.id}` : "/report"}
      className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors">
      <div className="min-w-0">
        <p className="text-xs font-black text-gray-950 truncate">{diagnosis?.issue_title ?? job.description}</p>
        <p className="text-[10px] text-gray-400 font-semibold capitalize mt-0.5">{job.status.replaceAll("_", " ")}</p>
      </div>
      <p className="text-xs font-black text-gray-950 shrink-0 ml-3">{booking ? naira(booking.quoteAmount) : "—"}</p>
    </Link>
  );
}
