"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const next =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("next") ?? "/dashboard")
      : "/dashboard";

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw new Error(signInError.message);

      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json() as { user?: { name?: string } | null };

      if (!meData.user?.name) {
        router.push(`/onboarding?next=${encodeURIComponent(next)}`);
      } else {
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      });
      if (signUpError) throw new Error(signUpError.message);

      if (data.user) {
        await supabase.from("users").upsert({
          id:    data.user.id,
          name:  name.trim(),
          email: email.trim(),
        }, { onConflict: "id" });
      }

      router.push(`/onboarding?next=${encodeURIComponent(next)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === "signin") {
      handleSignIn();
    } else {
      handleSignUp();
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  };

  const isSignInDisabled = loading || !email.trim() || !password;
  const isSignUpDisabled = loading || !name.trim() || !email.trim() || password.length < 8;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <span className="flex h-9 w-9 items-center justify-center bg-green-600 text-sm font-black text-white rounded-lg">
            S
          </span>
          <span className="text-lg font-black text-gray-950">iSabi</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="flex gap-2">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl border transition-colors ${
                  mode === m
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
              {error}
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Your full name"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                autoFocus
              />
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
              autoFocus={mode === "signin"}
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
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
            />
            {mode === "signup" && (
              <p className={`text-[10px] mt-1 font-semibold ${password.length >= 8 ? "text-green-600" : "text-gray-400"}`}>
                Minimum 8 characters
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={mode === "signin" ? isSignInDisabled : isSignUpDisabled}
            className="w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
              ? "Sign in →"
              : "Create account →"}
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4 font-semibold">
          By continuing you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
