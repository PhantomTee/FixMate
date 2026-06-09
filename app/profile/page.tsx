"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  location: string;
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user?: UserProfile | null }) => {
        if (!data.user) {
          router.push("/auth?next=/profile");
          return;
        }
        setProfile(data.user);
        setName(data.user.name ?? "");
        setLocation(data.user.location ?? "");
      })
      .catch(() => router.push("/auth?next=/profile"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location, phone: profile?.phone ?? "" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update profile");
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

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

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div>
            <h1 className="text-xl font-black text-gray-950">
              Account Settings
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-semibold">
              Update your name and location below.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-100 px-4 py-3 rounded-xl text-xs text-green-700 font-semibold">
              Profile updated!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Okonkwo"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
                required
              />
            </div>

            {/* City / area */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                City / area
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ikeja, Lagos"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
              />
            </div>

            {/* Phone — read-only */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                Phone number
              </label>
              <p className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-400 bg-gray-50 select-none">
                {profile?.phone ?? "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                Phone cannot be changed after registration.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {saving ? "Saving…" : "Save changes →"}
            </button>
          </form>
        </div>

        {/* Back link */}
        <div className="text-center mt-5">
          <Link
            href="/dashboard"
            className="text-xs font-black text-gray-400 hover:text-gray-950 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
