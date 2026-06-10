"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import LocationInput from "@/components/LocationInput";
import { registerArtisan } from "@/lib/api";
import { ARTISAN_CATEGORIES, ArtisanCategory } from "@/lib/types";

const INPUT =
  "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900 bg-white";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
        {label}
        {hint && (
          <span className="ml-2 normal-case text-[10px] text-gray-300 font-semibold tracking-normal">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

export default function ArtisanRegisterPage() {
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  // Form fields
  const [fullName,        setFullName]        = useState("");
  const [phone,           setPhone]           = useState("");
  const [category,        setCategory]        = useState<ArtisanCategory>("Plumber");
  const [location,        setLocation]        = useState("");
  const [years,           setYears]           = useState("");
  const [verificationId,  setVerificationId]  = useState("");
  const [skills,          setSkills]          = useState("");
  const [radius,          setRadius]          = useState("10");
  const [payoutPhone,     setPayoutPhone]     = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      // Require login
      if (!data.user) {
        router.replace("/auth?next=/artisan/register");
        return;
      }

      // Already registered — skip to dashboard
      const { data: existing } = await supabase
        .from("artisans")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (existing) {
        router.replace("/artisan/dashboard");
        return;
      }

      // Pre-fill from user profile
      try {
        const res  = await fetch("/api/auth/me");
        const me   = await res.json() as { user?: { name?: string; phone?: string; location?: string } | null };
        if (me.user?.name)     setFullName(me.user.name);
        if (me.user?.phone)    setPhone(me.user.phone);
        if (me.user?.location) setLocation(me.user.location);
      } catch { /* prefill is best-effort */ }

      setPageLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !location.trim()) {
      setError("Full name, phone, and location are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await registerArtisan({
        fullName:           fullName.trim(),
        phone:              phone.trim(),
        category,
        location,
        yearsExperience:    Number(years)  || 0,
        verificationId:     verificationId.trim(),
        skills:             skills.split(",").map((s) => s.trim()).filter(Boolean),
        serviceRadiusKm:    Number(radius) || 10,
        opayPhone:          payoutPhone.trim(),
        trustScore:         50,
        isVerified:         false,
        applicationStatus:  "pending",
        avatar:             "",
        emergencyAvailable: false,
        serviceAreas:       [],
      });
      router.push("/artisan/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between">
        <Link href="/" className="text-sm font-black text-gray-400 hover:text-gray-950 transition-colors">
          ← Home
        </Link>
        <span className="text-sm font-black text-gray-950">Join as Artisan</span>
        <div className="w-16" />
      </div>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-black px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Applications reviewed within 48 hrs
          </span>
          <h1 className="text-3xl font-black text-gray-950 tracking-tight">Offer Your Skills</h1>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Join verified artisans earning on iSabi. Just a 10% platform fee on completed jobs — nothing else.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Personal Info ───────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Personal Info</p>

            <Field label="Full Name">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Chinedu Okafor"
                required
                className={INPUT}
              />
            </Field>

            <Field label="Phone Number">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="080..."
                required
                className={INPUT}
              />
            </Field>
          </section>

          {/* ── Your Service ────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Service</p>

            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ArtisanCategory)}
                className={INPUT}
              >
                {ARTISAN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <LocationInput
              label="Base Location"
              value={location}
              onChange={setLocation}
              placeholder="e.g. Ikeja, Lagos"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Years Experience">
                <input
                  type="number"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="e.g. 5"
                  min="0"
                  className={INPUT}
                />
              </Field>
              <Field label="Service Radius" hint="km">
                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="10"
                  min="1"
                  className={INPUT}
                />
              </Field>
            </div>

            <Field label="Skills" hint="separate with commas">
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. Pipe fitting, emergency repairs"
                className={INPUT}
              />
            </Field>
          </section>

          {/* ── Verification ────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verification</p>

            <Field label="ID / NIN" hint="NIN, trade association ID, or brief note">
              <input
                type="text"
                value={verificationId}
                onChange={(e) => setVerificationId(e.target.value)}
                placeholder="NIN or trade ID number"
                className={INPUT}
              />
            </Field>

            <Field label="Payout Phone" hint="optional — can add later from dashboard">
              <input
                type="tel"
                value={payoutPhone}
                onChange={(e) => setPayoutPhone(e.target.value)}
                placeholder="OPay / Kuda / Palmpay number"
                className={INPUT}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Used when you request a payout. You can also enter your bank account details later.
              </p>
            </Field>
          </section>

          {/* Terms */}
          <p className="text-[11px] text-gray-400 text-center font-semibold px-2">
            By applying you agree to our{" "}
            <Link href="/terms" className="text-gray-600 underline">Terms of Service</Link>
            {" "}and the 10% platform fee on every escrow release.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {submitting ? "Submitting application…" : "Apply for Verification →"}
          </button>

        </form>
      </main>
    </div>
  );
}
