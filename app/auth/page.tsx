"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

function AuthForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/profile";

  const [identifier, setIdentifier] = useState(""); // phone or email
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const isPhone = (v: string) => /^[+0]/.test(v.trim()) || /^\d{10,}$/.test(v.replace(/\D/g, ""));
  const fmtPhone = (p: string) => {
    const digits = p.replace(/\D/g, "");
    if (digits.startsWith("0") && digits.length >= 10) return `+234${digits.slice(1)}`;
    if (digits.startsWith("234"))                        return `+${digits}`;
    return p.includes("+") ? p.trim() : `+234${digits}`;
  };

  const handleSignIn = async () => {
    if (!identifier.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      let signInErr;

      if (isPhone(identifier)) {
        const { error: e } = await supabase.auth.signInWithPassword({
          phone: fmtPhone(identifier),
          password,
        });
        signInErr = e;
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({
          email: identifier.trim(),
          password,
        });
        signInErr = e;
      }

      if (signInErr) throw new Error(signInErr.message);

      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json() as { user?: { name?: string } | null };

      if (!meData.user?.name) {
        router.push(`/onboarding?next=${encodeURIComponent(next)}`);
      } else {
        router.push(next === "/dashboard" ? "/profile" : next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <span className="flex h-9 w-9 items-center justify-center bg-green-700 text-sm font-black text-white rounded-lg">S</span>
          <span className="text-lg font-black text-gray-950">iSabi</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div>
            <h1 className="text-xl font-black text-gray-950">Sign in</h1>
            <p className="text-xs text-gray-400 mt-1 font-semibold">Use your phone number or email</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">{error}</div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
              Phone or email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              placeholder="08012345678 or you@email.com"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
            />
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading || !identifier.trim() || !password}
            className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "Signing in…" : "Sign in →"}
          </button>

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
          By continuing you agree to our terms of service.
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
