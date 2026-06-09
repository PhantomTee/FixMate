"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [phone, setPhone]       = useState("");

  const next =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("next") ?? "/dashboard")
      : "/dashboard";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }
      if (data.user.phone) setPhone(data.user.phone);
    });
  }, [router, next]);

  const save = async () => {
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!location.trim()) { setError("Please enter your city or area."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/me", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), phone, location: location.trim() }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save profile");
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <span className="flex h-9 w-9 items-center justify-center bg-green-600 text-sm font-black text-white rounded-lg">
            H
          </span>
          <span className="text-lg font-black text-gray-950">Handijob</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          {/* Header */}
          <div>
            <h1 className="text-xl font-black text-gray-950">Welcome! One last step</h1>
            <p className="text-xs text-gray-400 mt-1 font-semibold">
              Tell us your name and location so artisans can find you.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="e.g. Fatima Musa"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
              autoFocus
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
              Your city / area
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="e.g. Yaba, Lagos"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
            />
            <p className="text-[10px] text-gray-400 mt-1">Used to match you with nearby artisans</p>
          </div>

          {/* Submit */}
          <button
            onClick={save}
            disabled={loading || !name.trim() || !location.trim()}
            className="w-full py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? "Saving…" : "Get Started →"}
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4 font-semibold">
          You can update these details later in your profile settings.
        </p>
      </div>
    </div>
  );
}
