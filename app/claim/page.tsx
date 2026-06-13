"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

function ClaimForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const rawPhone     = searchParams.get("phone") ?? "";
  // Restore E.164 format: "2349031963321" → "+2349031963321"
  const phone        = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) { setError("Email and password are required."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      // 1. Create Supabase Auth account
      const supabase = createClient();
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({ email, password });
      if (signUpErr) throw new Error(signUpErr.message);

      const userId = authData.user?.id;
      if (!userId) throw new Error("Account created but user ID missing. Try signing in.");

      // 2. Migrate bot_customers → users via API
      const res = await fetch("/api/claim", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone, userId }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Migration failed.");

      router.push("/dashboard?claimed=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">

        <div className="text-center space-y-1">
          <div className="text-4xl">🔧</div>
          <h1 className="text-xl font-black text-gray-950">Claim your iSabi account</h1>
          <p className="text-xs text-gray-400 font-semibold">
            Your WhatsApp bookings will be linked to this account so you can track everything online.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-0.5">Phone</p>
          <p className="text-sm font-semibold text-gray-800">{phone || "—"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters" required minLength={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && <span className="animate-spin">⟳</span>}
            {loading ? "Creating account…" : "Create account & link bookings"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Already have an account?{" "}
          <a href="/login" className="text-green-700 font-black hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense>
      <ClaimForm />
    </Suspense>
  );
}
