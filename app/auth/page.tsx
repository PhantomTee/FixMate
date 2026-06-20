"use client";

import { Suspense, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { firebaseAuth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

type Tab     = "signin" | "signup" | "forgot";
type Channel = "email" | "phone";
type Mode    = "otp" | "password";

// Phone/WhatsApp sign-up & OTP are temporarily disabled (Firebase Blaze billing
// pending). All the Firebase phone-auth code below stays intact — flip this
// back to true once billing + service-account env vars are in place.
const PHONE_AUTH_ENABLED = false;

function formatPhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length >= 10) return `+234${digits.slice(1)}`;
  if (digits.startsWith("234"))                       return `+${digits}`;
  return p.startsWith("+") ? p.trim() : `+234${digits}`;
}

function isEmailStr(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}

/* ── Shared input classes ── */
const INPUT = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900";
const BTN_GREEN = "w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2";
const LABEL = "text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5";

function AuthForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/profile";

  const [tab, setTab] = useState<Tab>("signin");

  /* ── Sign In state ── */
  const [mode,       setMode]       = useState<Mode>("otp");
  const [channel,    setChannel]    = useState<Channel>("email");
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [otp,        setOtp]        = useState("");
  const [otpStep,    setOtpStep]    = useState<"input" | "verify">("input");
  const [phone,      setPhone]      = useState("");

  /* ── Sign Up state ── */
  const [suName,       setSuName]       = useState("");
  const [suIdentifier, setSuIdentifier] = useState("");
  const [suPassword,   setSuPassword]   = useState("");
  const [suOtp,        setSuOtp]        = useState("");
  const [suStep,       setSuStep]       = useState<"form" | "verify">("form");
  const [suPhone,      setSuPhone]      = useState("");

  /* ── Forgot Password state ── */
  const [fpEmail, setFpEmail] = useState("");
  const [fpSent,  setFpSent]  = useState(false);

  /* ── Shared ── */
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [info,    setInfo]    = useState("");

  /* ── Firebase phone auth ── */
  const confirmationRef     = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  function getRecaptchaVerifier(): RecaptchaVerifier {
    if (!firebaseAuth) throw new Error("Phone verification is not configured.");
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", { size: "invisible" });
    }
    return recaptchaVerifierRef.current;
  }

  async function sendPhoneOtp(fmtPhone: string): Promise<void> {
    if (!firebaseAuth) throw new Error("Phone verification is not configured.");
    const verifier = getRecaptchaVerifier();
    confirmationRef.current = await signInWithPhoneNumber(firebaseAuth, fmtPhone, verifier);
  }

  async function establishSupabaseSession(token_hash: string): Promise<void> {
    const supabase = createClient();
    const { error: e } = await supabase.auth.verifyOtp({ token_hash, type: "email" });
    if (e) throw new Error(e.message);
  }

  const reset = (t: Tab) => {
    setTab(t);
    setError("");
    setInfo("");
    setLoading(false);
  };

  /* ═══════════════════════════════════════════════════
     SIGN IN
  ═══════════════════════════════════════════════════ */
  const handleSendOtp = async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      if (channel === "email") {
        const res  = await fetch("/api/auth/send-otp", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ identifier: identifier.trim(), channel }),
        });
        const data = await res.json() as { ok?: boolean; error?: string };
        if (!res.ok || data.error) throw new Error(data.error ?? "Failed to send code.");
        setInfo(`A sign-in link was sent to ${identifier.trim()} — check your inbox and click it.`);
      } else {
        const fmtPhone = formatPhone(identifier);
        await sendPhoneOtp(fmtPhone);
        setPhone(fmtPhone);
        setInfo(`A 6-digit code was sent via SMS to ${fmtPhone}`);
        setOtpStep("verify");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (!confirmationRef.current) throw new Error("Session expired. Request a new code.");
      const cred    = await confirmationRef.current.confirm(otp.trim());
      const idToken = await cred.user.getIdToken();

      const res  = await fetch("/api/auth/firebase-phone", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ idToken, mode: "signin" }),
      });
      const data = await res.json() as { token_hash?: string; error?: string };
      if (!res.ok || !data.token_hash) throw new Error(data.error ?? "Sign-in failed.");

      await establishSupabaseSession(data.token_hash);
      await afterSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      await afterSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const afterSignIn = async () => {
    const meRes  = await fetch("/api/auth/me");
    const meData = await meRes.json() as { user?: { name?: string } | null };
    router.push(meData.user?.name ? next : `/onboarding?next=${encodeURIComponent(next)}`);
  };

  /* ═══════════════════════════════════════════════════
     SIGN UP
  ═══════════════════════════════════════════════════ */
  const handleSignUp = async () => {
    if (!suName.trim())        { setError("Enter your full name."); return; }
    if (!suIdentifier.trim())  { setError("Enter your email address."); return; }
    if (!PHONE_AUTH_ENABLED && !isEmailStr(suIdentifier)) {
      setError("Phone sign-up is temporarily unavailable — please use your email address.");
      return;
    }
    if (suPassword.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    setError("");
    const supabase = createClient();

    try {
      if (isEmailStr(suIdentifier)) {
        const res  = await fetch("/api/auth/signup", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email: suIdentifier.trim(), password: suPassword, name: suName.trim() }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Sign-up failed.");

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: suIdentifier.trim().toLowerCase(),
          password: suPassword,
        });
        if (signInErr) throw new Error(signInErr.message);

        await fetch("/api/auth/me", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: suName.trim(), phone: null, location: "" }),
        });

        router.push(`/onboarding?next=${encodeURIComponent(next)}`);
      } else {
        const fmtPhone = formatPhone(suIdentifier);
        await sendPhoneOtp(fmtPhone);
        setSuPhone(fmtPhone);
        setSuStep("verify");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignUpOtp = async () => {
    if (suOtp.length < 6) { setError("Enter the 6-digit code."); return; }
    setLoading(true);
    setError("");
    try {
      if (!confirmationRef.current) throw new Error("Session expired. Request a new code.");
      const cred    = await confirmationRef.current.confirm(suOtp);
      const idToken = await cred.user.getIdToken();

      const res  = await fetch("/api/auth/firebase-phone", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ idToken, mode: "signup", name: suName.trim(), password: suPassword }),
      });
      const data = await res.json() as { token_hash?: string; error?: string };
      if (!res.ok || !data.token_hash) throw new Error(data.error ?? "Sign-up failed.");

      await establishSupabaseSession(data.token_hash);

      await fetch("/api/auth/me", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: suName.trim(), phone: suPhone, location: "" }),
      });

      router.push(`/onboarding?next=${encodeURIComponent(next)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════
     FORGOT PASSWORD
  ═══════════════════════════════════════════════════ */
  const handleForgotPassword = async () => {
    if (!fpEmail.trim()) { setError("Enter your email address."); return; }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: e } = await supabase.auth.resetPasswordForEmail(fpEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (e) throw new Error(e.message);
      setFpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <Link href="/" className="flex items-center mb-8 justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isabi-logo.svg" alt="iSabi" className="h-9 w-auto" />
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

          {/* Top tab bar */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(["signin", "signup", "forgot"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => reset(t)}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-colors ${
                  tab === t ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "signin" ? "Sign In" : t === "signup" ? "Sign Up" : "Forgot"}
              </button>
            ))}
          </div>

          {/* Error / info banners */}
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

          {/* ══════════════════════════════
              TAB: SIGN IN
          ══════════════════════════════ */}
          {tab === "signin" && (
            <>
              {/* OTP / Password toggle */}
              <div className="flex gap-2">
                {(["otp", "password"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setOtpStep("input"); setError(""); setInfo(""); setOtp(""); }}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-colors ${
                      mode === m ? "bg-green-700 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {m === "otp" ? "Send OTP code" : "Use password"}
                  </button>
                ))}
              </div>

              {/* OTP mode */}
              {mode === "otp" && (
                <>
                  {otpStep === "input" && (
                    <>
                      {PHONE_AUTH_ENABLED && (
                        <div className="flex gap-1.5">
                          {(["email", "phone"] as Channel[]).map((c) => (
                            <button
                              key={c}
                              onClick={() => { setChannel(c); setIdentifier(""); setError(""); setInfo(""); }}
                              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-colors ${
                                channel === c
                                  ? "border-green-600 bg-green-50 text-green-700"
                                  : "border-gray-200 text-gray-400 hover:border-gray-300"
                              }`}
                            >
                              <span className="text-base">{c === "email" ? "✉️" : "📱"}</span>
                              {c === "email" ? "Email" : "Phone"}
                            </button>
                          ))}
                        </div>
                      )}
                      <div>
                        <label className={LABEL}>{channel === "email" ? "Email address" : "Phone number"}</label>
                        <input
                          type={channel === "email" ? "email" : "tel"}
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                          placeholder={channel === "email" ? "you@example.com" : "08012345678"}
                          autoFocus
                          className={INPUT}
                        />
                      </div>
                      <button onClick={handleSendOtp} disabled={loading || !identifier.trim()} className={BTN_GREEN}>
                        {loading && <Spinner />}
                        {loading ? "Sending…" : `Send code via ${channel === "email" ? "Email" : "SMS"} →`}
                      </button>
                    </>
                  )}

                  {otpStep === "verify" && (
                    <>
                      <div>
                        <label className={LABEL}>6-digit code</label>
                        <input
                          type="text" inputMode="numeric" maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                          placeholder="000000"
                          autoFocus
                          className={`${INPUT} text-2xl font-black tracking-[0.4em] text-center`}
                        />
                      </div>
                      <button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className={BTN_GREEN}>
                        {loading && <Spinner />}
                        {loading ? "Verifying…" : "Verify & sign in →"}
                      </button>
                      <button onClick={() => { setOtpStep("input"); setOtp(""); setError(""); setInfo(""); }}
                        className="w-full text-xs text-gray-400 font-semibold hover:text-gray-600 transition-colors">
                        ← Use a different method
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Password mode */}
              {mode === "password" && (
                <>
                  <div>
                    <label className={LABEL}>Phone or email</label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePasswordSignIn()}
                      placeholder="08012345678 or you@email.com"
                      autoFocus
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePasswordSignIn()}
                      placeholder="••••••••"
                      className={INPUT}
                    />
                  </div>
                  <button onClick={handlePasswordSignIn} disabled={loading || !identifier.trim() || !password} className={BTN_GREEN}>
                    {loading && <Spinner />}
                    {loading ? "Signing in…" : "Sign in →"}
                  </button>
                  <div className="text-center">
                    <button onClick={() => reset("forgot")} className="text-xs font-black text-gray-400 hover:text-gray-600 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ══════════════════════════════
              TAB: SIGN UP
          ══════════════════════════════ */}
          {tab === "signup" && (
            <>
              {suStep === "form" && (
                <>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">Create your iSabi account</p>
                  </div>
                  <div>
                    <label className={LABEL}>Full name</label>
                    <input
                      type="text"
                      value={suName}
                      onChange={(e) => setSuName(e.target.value)}
                      placeholder="e.g. Fatima Musa"
                      autoFocus
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>{PHONE_AUTH_ENABLED ? "Phone or email" : "Email address"}</label>
                    <input
                      type="text"
                      value={suIdentifier}
                      onChange={(e) => setSuIdentifier(e.target.value)}
                      placeholder={PHONE_AUTH_ENABLED ? "080xxxxxxxx or you@email.com" : "you@email.com"}
                      className={INPUT}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      {!PHONE_AUTH_ENABLED
                        ? "We'll send a confirmation link to this email"
                        : isEmailStr(suIdentifier)
                          ? "We'll send a confirmation link to this email"
                          : "We'll send a one-time SMS code to confirm your number"}
                    </p>
                  </div>
                  <div>
                    <label className={LABEL}>Password</label>
                    <input
                      type="password"
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={INPUT}
                    />
                    <p className={`text-[10px] mt-1 font-semibold ${suPassword.length >= 8 ? "text-green-600" : "text-gray-400"}`}>
                      Minimum 8 characters
                    </p>
                  </div>
                  <button
                    onClick={handleSignUp}
                    disabled={loading || !suName.trim() || !suIdentifier.trim() || suPassword.length < 8}
                    className={BTN_GREEN}
                  >
                    {loading && <Spinner />}
                    {loading ? "Creating account…" : "Create account →"}
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    Already have an account?{" "}
                    <button onClick={() => reset("signin")} className="text-green-700 font-black">Sign in</button>
                  </p>
                </>
              )}

              {suStep === "verify" && (
                <>
                  <div>
                    <p className="text-sm font-black text-gray-950">Verify your number</p>
                    <p className="text-xs text-gray-400 mt-1 font-semibold">
                      Enter the 6-digit code sent to {suPhone}
                    </p>
                  </div>

                  <div>
                    <label className={LABEL}>Verification code</label>
                    <input
                      type="text" inputMode="numeric" maxLength={6}
                      value={suOtp}
                      onChange={(e) => setSuOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      autoFocus
                      className={`${INPUT} text-lg font-black text-center tracking-widest`}
                    />
                  </div>
                  <button onClick={handleVerifySignUpOtp} disabled={loading || suOtp.length < 6} className={BTN_GREEN}>
                    {loading && <Spinner />}
                    {loading ? "Verifying…" : "Verify & continue →"}
                  </button>
                  <button onClick={() => { setSuStep("form"); setSuOtp(""); setError(""); }}
                    className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">
                    ← Change number
                  </button>
                </>
              )}
            </>
          )}

          {/* ══════════════════════════════
              TAB: FORGOT PASSWORD
          ══════════════════════════════ */}
          {tab === "forgot" && (
            <>
              {!fpSent ? (
                <>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">
                      Enter your email and we'll send a reset link.
                    </p>
                  </div>
                  <div>
                    <label className={LABEL}>Email address</label>
                    <input
                      type="email"
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                      placeholder="you@example.com"
                      autoFocus
                      className={INPUT}
                    />
                  </div>
                  <button onClick={handleForgotPassword} disabled={loading || !fpEmail.trim()} className={BTN_GREEN}>
                    {loading && <Spinner />}
                    {loading ? "Sending…" : "Send reset link →"}
                  </button>
                </>
              ) : (
                <div className="bg-green-50 border border-green-100 px-4 py-4 rounded-xl text-xs text-green-700 font-semibold text-center space-y-2">
                  <p className="font-black text-sm">Check your inbox</p>
                  <p>A reset link was sent to <span className="font-black">{fpEmail}</span>. Click it to set a new password.</p>
                </div>
              )}
              <p className="text-center text-xs text-gray-400">
                Remembered it?{" "}
                <button onClick={() => reset("signin")} className="text-green-700 font-black">Sign in</button>
              </p>
            </>
          )}

          {/* Bottom links — only on sign-in tab */}
          {tab === "signin" && (
            <div className="border-t border-gray-100 pt-4 text-center space-y-2">
              <p className="text-xs text-gray-500">
                New to iSabi?{" "}
                <button onClick={() => reset("signup")} className="text-green-700 font-black">Create account</button>
              </p>
              <p className="text-xs text-gray-500">
                Want to offer your skills?{" "}
                <Link href="/onboarding?intent=artisan" className="text-green-700 font-black">
                  Register as artisan
                </Link>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4 font-semibold">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline">terms of service</Link>.
        </p>
      </div>

      {/* Invisible reCAPTCHA host required by Firebase Phone Auth */}
      <div id="recaptcha-container" />
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
