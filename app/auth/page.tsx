"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Channel  = "email" | "sms" | "whatsapp";
type AuthMode = "otp" | "password";

function formatPhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length >= 10) return `+234${digits.slice(1)}`;
  if (digits.startsWith("234"))                       return `+${digits}`;
  return p.startsWith("+") ? p.trim() : `+234${digits}`;
}

function AuthForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/profile";

  const [mode,       setMode]       = useState<AuthMode>("otp");
  const [channel,    setChannel]    = useState<Channel>("email");
  const [identifier, setIdentifier] = useState("");
  const [otp,        setOtp]        = useState("");
  const [password,   setPassword]   = useState("");
  const [step,       setStep]       = useState<"input" | "verify">("input");
  const [phone,      setPhone]      = useState(""); // formatted phone for verify
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [info,       setInfo]       = useState("");

  const channelTabs: { key: Channel; label: string; icon: string; placeholder: string }[] = [
    { key: "email",     label: "Email",     icon: "✉️",  placeholder: "you@example.com"  },
    { key: "sms",       label: "SMS",       icon: "💬",  placeholder: "08012345678"       },
    { key: "whatsapp",  label: "WhatsApp",  icon: "📱",  placeholder: "08012345678"       },
  ];

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res  = await fetch("/api/auth/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier: identifier.trim(), channel }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; phone?: string };

      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to send code.");

      if (channel === "email") {
        setInfo(`A 6-digit code was sent to ${identifier.trim()}`);
      } else if (channel === "whatsapp") {
        setInfo(`A code was sent to your WhatsApp (${formatPhone(identifier)})`);
      } else {
        setInfo(`A code was sent via SMS to ${formatPhone(identifier)}`);
      }

      setPhone(data.phone ?? formatPhone(identifier));
      setStep("verify");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      let verifyErr;

      if (channel === "email") {
        const { error: e } = await supabase.auth.verifyOtp({
          email: identifier.trim(),
          token: otp.trim(),
          type:  "email",
        });
        verifyErr = e;
      } else {
        const { error: e } = await supabase.auth.verifyOtp({
          phone: phone,
          token: otp.trim(),
          type:  "sms",
        });
        verifyErr = e;
      }

      if (verifyErr) throw new Error(verifyErr.message);

      const meRes  = await fetch("/api/auth/me");
      const meData = await meRes.json() as { user?: { name?: string } | null };
      router.push(meData.user?.name ? next : `/onboarding?next=${encodeURIComponent(next)}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Password sign-in ─────────────────────────────────────────────────────
  const handlePasswordSignIn = async () => {
    if (!identifier.trim() || !password) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const isPhone  = /^[+0]/.test(identifier.trim()) || /^\d{10,}$/.test(identifier.replace(/\D/g, ""));

      const { error: e } = isPhone
        ? await supabase.auth.signInWithPassword({ phone: formatPhone(identifier), password })
        : await supabase.auth.signInWithPassword({ email: identifier.trim(), password });

      if (e) throw new Error(e.message);

      const meRes  = await fetch("/api/auth/me");
      const meData = await meRes.json() as { user?: { name?: string } | null };
      router.push(meData.user?.name ? next : `/onboarding?next=${encodeURIComponent(next)}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <Link href="/" className="flex items-center mb-8 justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isabi-logo.svg" alt="iSabi" className="h-9 w-auto" />
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

          {/* Mode toggle */}
          <div>
            <h1 className="text-xl font-black text-gray-950">Sign in</h1>
            <div className="flex gap-2 mt-3">
              {(["otp", "password"] as AuthMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setStep("input"); setError(""); setInfo(""); setOtp(""); }}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-colors ${
                    mode === m
                      ? "bg-green-700 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {m === "otp" ? "Send OTP code" : "Use password"}
                </button>
              ))}
            </div>
          </div>

          {/* Error / info */}
          {error && (
            <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
              {error}
            </div>
          )}
          {info && !error && (
            <div className="bg-green-50 border border-green-100 px-4 py-3 rounded-xl text-xs text-green-700 font-semibold">
              {info}
            </div>
          )}

          {/* ── OTP MODE ── */}
          {mode === "otp" && (
            <>
              {step === "input" && (
                <>
                  {/* Channel selector */}
                  <div className="flex gap-1.5">
                    {channelTabs.map(({ key, label, icon }) => (
                      <button
                        key={key}
                        onClick={() => { setChannel(key); setIdentifier(""); setError(""); }}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-colors ${
                          channel === key
                            ? "border-green-600 bg-green-50 text-green-700"
                            : "border-gray-200 text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-base">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Identifier input */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                      {channel === "email" ? "Email address" : "Phone number"}
                    </label>
                    <input
                      type={channel === "email" ? "email" : "tel"}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      placeholder={channelTabs.find(c => c.key === channel)?.placeholder}
                      autoFocus
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                    />
                  </div>

                  <button
                    onClick={handleSendOtp}
                    disabled={loading || !identifier.trim()}
                    className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {loading ? "Sending…" : `Send code via ${channelTabs.find(c => c.key === channel)?.label} →`}
                  </button>
                </>
              )}

              {step === "verify" && (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                      6-digit code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                      placeholder="000000"
                      autoFocus
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-black tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                    />
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length < 6}
                    className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {loading ? "Verifying…" : "Verify & sign in →"}
                  </button>

                  <button
                    onClick={() => { setStep("input"); setOtp(""); setError(""); setInfo(""); }}
                    className="w-full text-xs text-gray-400 font-semibold hover:text-gray-600 transition-colors"
                  >
                    ← Use a different method
                  </button>
                </>
              )}
            </>
          )}

          {/* ── PASSWORD MODE ── */}
          {mode === "password" && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                  Phone or email
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSignIn()}
                  placeholder="08012345678 or you@email.com"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSignIn()}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                />
              </div>

              <button
                onClick={handlePasswordSignIn}
                disabled={loading || !identifier.trim() || !password}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Signing in…" : "Sign in →"}
              </button>

              <div className="text-center">
                <Link href="/auth/reset" className="text-xs font-black text-gray-400 hover:text-gray-600 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </>
          )}

          {/* Footer links */}
          <div className="border-t border-gray-100 pt-4 text-center space-y-2">
            <p className="text-xs text-gray-500">
              New to iSabi?{" "}
              <Link href={`/onboarding?next=${encodeURIComponent(next)}`} className="text-green-700 font-black">
                Create account
              </Link>
            </p>
            <p className="text-xs text-gray-500">
              Want to offer your skills?{" "}
              <Link href="/onboarding?intent=artisan" className="text-green-700 font-black">
                Register as artisan
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4 font-semibold">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline">terms of service</Link>.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
