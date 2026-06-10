"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [ready,     setReady]     = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");

  // Supabase puts the access_token in the URL hash on the password
  // recovery redirect. onAuthStateChange fires PASSWORD_RECOVERY so we
  // know the session is established and the update is safe to make.
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords don't match."); return; }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw new Error(err.message);
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <span className="flex h-9 w-9 items-center justify-center bg-green-600 text-sm font-black text-white rounded-lg">S</span>
          <span className="text-lg font-black text-gray-950">iSabi</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          {done ? (
            <div className="text-center space-y-3 py-2">
              <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto text-2xl">✅</div>
              <h1 className="text-xl font-black text-gray-950">Password updated!</h1>
              <p className="text-sm text-gray-500">Redirecting you to your dashboard…</p>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-3 py-4">
              <span className="w-8 h-8 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin inline-block" />
              <p className="text-sm text-gray-500 font-semibold">Verifying reset link…</p>
              <p className="text-xs text-gray-400">
                If nothing happens,{" "}
                <Link href="/auth/reset" className="text-green-600 font-black underline">
                  request a new link
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Set new password</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Choose a strong password.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                />
                <p className={`text-[10px] mt-1 font-semibold ${password.length >= 8 ? "text-green-600" : "text-gray-400"}`}>
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="Repeat your new password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                />
                {confirm && (
                  <p className={`text-[10px] mt-1 font-semibold ${password === confirm ? "text-green-600" : "text-red-500"}`}>
                    {password === confirm ? "Passwords match ✓" : "Passwords don't match"}
                  </p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || password.length < 8 || password !== confirm}
                className="w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {loading ? "Updating…" : "Update password →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
