"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LocationInput from "@/components/LocationInput";
import { createClient } from "@/lib/supabase";

interface UserProfile {
  id: string;
  name: string;
  phone: string | null;
  location: string;
  avatar?: string | null;
  nin?: string | null;
  nin_verified?: boolean;
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CheckIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [error, setError] = useState("");

  // Edit-mode fields
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNin, setEditNin] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user?: UserProfile | null; email?: string | null }) => {
        if (!data.user) {
          router.push("/auth?next=/profile");
          return;
        }
        setProfile(data.user);
        setAuthEmail(data.email ?? "");
        setEditName(data.user.name ?? "");
        setEditLocation(data.user.location ?? "");
        setEditNin(data.user.nin ?? "");
        setEditAvatar(data.user.avatar ?? "");
      })
      .catch(() => router.push("/auth?next=/profile"))
      .finally(() => setLoading(false));
  }, [router]);

  const startEdit = () => {
    setEditName(profile?.name ?? "");
    setEditLocation(profile?.location ?? "");
    setEditNin(profile?.nin ?? "");
    setEditAvatar(profile?.avatar ?? "");
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setError("");
    setAvatarError("");
    setEditing(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    // Instant local preview
    const reader = new FileReader();
    reader.onloadend = () => setEditAvatar(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/auth/avatar", { method: "POST", body: form });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setEditAvatar(data.url);
    } catch {
      setAvatarError("Photo upload failed — your preview is shown but won't be saved.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     editName.trim(),
          location: editLocation,
          phone:    profile?.phone ?? "",
          nin:      editNin,
          avatar:   editAvatar,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name:         editName.trim(),
              location:     editLocation,
              avatar:       editAvatar,
              nin:          editNin,
              nin_verified: prev.nin_verified || editNin.length === 11,
            }
          : prev
      );
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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

  const initials = (profile?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avatarSrc = editing ? editAvatar : (profile?.avatar ?? "");
  const isVerified = profile?.nin_verified || (editing && editNin.length === 11);
  const maskedNin = profile?.nin
    ? profile.nin.slice(0, 3) + "•".repeat(Math.max(0, profile.nin.length - 3))
    : "";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm font-black text-gray-400 hover:text-gray-950 transition-colors"
        >
          ← Back
        </Link>
        <span className="text-sm font-black text-gray-950">Profile</span>

        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEdit}
              className="text-xs font-black text-gray-400 hover:text-gray-950 transition-colors px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40"
            >
              {saving ? (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckIcon size={11} />
              )}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="p-2 text-gray-400 hover:text-gray-950 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="Edit profile"
          >
            <PencilIcon />
          </button>
        )}
      </div>

      <div className="max-w-sm mx-auto px-4 py-8 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
            {error}
          </div>
        )}

        {/* Avatar + name card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center gap-3">

          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-100 flex items-center justify-center shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-gray-400">{initials}</span>
              )}
            </div>

            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0.5 right-0.5 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-700 transition-colors disabled:opacity-60 border-2 border-white"
                  aria-label="Change photo"
                >
                  {uploadingAvatar ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CameraIcon />
                  )}
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </>
            )}
          </div>
          {avatarError && (
            <p className="text-[10px] text-red-600 font-semibold text-center max-w-[200px]">{avatarError}</p>
          )}

          {/* Name */}
          {editing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-center text-xl font-black text-gray-950 border-b-2 border-green-600 outline-none bg-transparent w-full pb-1"
              placeholder="Full name"
            />
          ) : (
            <h1 className="text-xl font-black text-gray-950 text-center">{profile?.name}</h1>
          )}

          {/* Verified badge */}
          {isVerified && (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-black px-3 py-1 rounded-full border border-green-200">
              <CheckIcon />
              ID Verified
            </span>
          )}
        </div>

        {/* Info fields */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">

          {/* Email */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Email</p>
            <p className="text-sm font-semibold text-gray-700 truncate">{authEmail || "—"}</p>
          </div>

          {/* Phone */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Phone</p>
              {editing && (
                <span className="text-[10px] text-gray-400 font-semibold">Contact support to update</span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-700">{profile?.phone || "—"}</p>
          </div>

          {/* Location */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Location</p>
            {editing ? (
              <LocationInput
                value={editLocation}
                onChange={setEditLocation}
                placeholder="e.g. Ikeja, Lagos"
              />
            ) : (
              <p className="text-sm font-semibold text-gray-700">
                {profile?.location || <span className="text-gray-400 font-normal">Not set</span>}
              </p>
            )}
          </div>

          {/* NIN */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                National ID (NIN)
              </p>
              {(profile?.nin_verified || (editing && editNin.length === 11)) && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <CheckIcon />
                  Verified
                </span>
              )}
            </div>
            {editing ? (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editNin}
                  onChange={(e) =>
                    setEditNin(e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  placeholder="11-digit NIN"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900 tracking-widest"
                />
                <p
                  className={`text-[10px] mt-1 font-semibold ${
                    editNin.length === 11 ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {editNin.length}/11 — {editNin.length === 11 ? "Valid ✓" : "Must be 11 digits"}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-gray-700 tracking-widest">
                {maskedNin || <span className="text-gray-400 font-normal tracking-normal">Not provided</span>}
              </p>
            )}
          </div>
        </div>

        {/* Edit CTA + Sign Out (view mode only) */}
        {!editing && (
          <>
            <button
              onClick={startEdit}
              className="w-full py-3.5 border-2 border-dashed border-gray-200 text-xs font-black text-gray-400 hover:border-green-600 hover:text-green-700 transition-colors rounded-xl flex items-center justify-center gap-2"
            >
              <PencilIcon />
              Edit Profile
            </button>
            <button
              onClick={handleSignOut}
              className="w-full py-3 text-xs font-black text-red-500 hover:text-red-700 transition-colors rounded-xl"
            >
              Sign Out
            </button>
          </>
        )}

      </div>

      {/* Saved toast */}
      {saved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-950 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 whitespace-nowrap">
          <CheckIcon size={12} />
          Changes saved!
        </div>
      )}
    </div>
  );
}
