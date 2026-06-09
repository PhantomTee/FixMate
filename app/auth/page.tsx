"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+234");
  const [otp, setOtp] = useState("");
  const [pinId, setPinId] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const next =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("next") ?? "/dashboard")
      : "/dashboard";

  const sendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "send", phone: phone.trim() }),
      });
      const data = await res.json() as { pin_id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send OTP");
      setPinId(data.pin_id!);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP. Check your number.");
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "verify", phone: phone.trim(), pin_id: pinId, otp: otp.trim() }),
      });
      const data = await res.json() as { verified?: boolean; phone?: string; token_hash?: string; email?: string; error?: string };
      if (!res.ok || !data.verified) throw new Error(data.error ?? "Invalid OTP");

      // Use magic-link token to establish Supabase session without triggering another OTP
      const supabase = createClient();
      if (data.token_hash && data.email) {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          email:      data.email,
          token_hash: data.token_hash,
          type:       "email",
        });
        if (verifyErr) console.warn("Session verify:", verifyErr.message);
      }

      // Check if user has completed their profile
      const meRes  = await fetch("/api/auth/me");
      const meData = await meRes.json() as { user?: { name?: string } | null };

      if (!meData.user?.name) {
        router.push(`/onboarding?next=${encodeURIComponent(next)}`);
      } else {
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <span className="flex h-9 w-9 items-center justify-center bg-green-600 text-sm font-black text-white rounded-lg">
            H
          </span>
          <span className="text-lg font-black text-gray-950">iSabi</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div>
            <h1 className="text-xl font-black text-gray-950">Sign in</h1>
            <p className="text-xs text-gray-400 mt-1 font-semibold">
              We&apos;ll send a one-time code via WhatsApp.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
              {error}
            </div>
          )}

          {step === "phone" ? (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  placeholder="+2348012345678"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                  autoFocus
                />
                <p className="text-[10px] text-gray-400 mt-1">Format: +234 followed by 10 digits</p>
              </div>
              <button
                onClick={sendOtp}
                disabled={loading || phone.trim().length < 12}
                className="w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Sending…" : "Send OTP via WhatsApp →"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                  OTP code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmOtp()}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-center tracking-[0.4em] text-xl text-gray-900"
                  autoFocus
                />
                <p className="text-[10px] text-gray-400 mt-1 text-center">
                  Sent to {phone} via WhatsApp
                </p>
              </div>
              <button
                onClick={confirmOtp}
                disabled={loading || otp.trim().length < 4}
                className="w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Verifying…" : "Confirm →"}
              </button>
              <button
                onClick={() => { setStep("phone"); setOtp(""); setError(""); setPinId(""); }}
                className="w-full text-center text-xs font-black text-gray-400 hover:text-gray-950 transition-colors"
              >
                ← Change number
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4 font-semibold">
          By continuing you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
