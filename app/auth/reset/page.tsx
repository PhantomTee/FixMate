"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const supabase    = createClient();
      const redirectTo  =
        (typeof window !== "undefined" ? window.location.origin : "") +
        "/auth/update-password";
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );
      if (err) throw new Error(err.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center mb-8 justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isabi-logo.svg" alt="iSabi" className="h-9 w-auto" />
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          {sent ? (
            <div className="text-center space-y-3 py-2">
              <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto text-2xl">
                ✉️
              </div>
              <h1 className="text-xl font-black text-gray-950">Check your email</h1>
              <p className="text-sm text-gray-500">
                We sent a reset link to <span className="font-black text-gray-950">{email}</span>.
                Click it to set a new password.
              </p>
              <p className="text-xs text-gray-400">Didn't get it? Check your spam folder.</p>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Forgot password?</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">
                  Enter your email and we'll send a reset link.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !email.trim()}
                className="w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {loading ? "Sending…" : "Send reset link →"}
              </button>
            </>
          )}
        </div>

        <p className="text-center mt-5">
          <Link href="/auth" className="text-xs font-black text-gray-400 hover:text-gray-950 transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
