"use client";

import { useState } from "react";

interface Props {
  bookingId: string;
  artisanId: string;
  artisanName: string;
  onDone?: () => void;
}

const DIMENSIONS = [
  { key: "punctuality", label: "Punctuality" },
  { key: "neatness",    label: "Neatness"    },
  { key: "skill",       label: "Skill"       },
  { key: "attitude",    label: "Attitude"    },
] as const;

type DimKey = (typeof DIMENSIONS)[number]["key"];

function StarRow({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-black text-gray-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className={`text-lg leading-none transition-all hover:scale-110 select-none ${
              star <= (hover || value) ? "text-yellow-400" : "text-gray-200"
            }`}
            aria-label={`${star} star`}>
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RatingWidget({ bookingId, artisanId, artisanName, onDone }: Props) {
  const [scores, setScores] = useState<Record<DimKey, number>>({
    punctuality: 0, neatness: 0, skill: 0, attitude: 0,
  });
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  const allScored = Object.values(scores).every((v) => v > 0);

  const submit = async () => {
    if (!allScored) { setError("Please rate all 4 areas."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ratings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, artisanId, ...scores, comment }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to submit rating");
      }
      setDone(true);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
        <p className="font-black text-green-700 text-sm">Thanks for your feedback!</p>
        <p className="text-xs text-green-600 mt-0.5">Ratings help other customers find great artisans.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
      <div>
        <p className="font-black text-gray-950 text-sm">Rate {artisanName}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">How did the job go?</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 px-3 py-2 rounded-lg text-xs text-red-700 font-semibold">{error}</div>
      )}

      <div className="space-y-3">
        {DIMENSIONS.map((d) => (
          <StarRow key={d.key} label={d.label}
            value={scores[d.key]}
            onChange={(v) => setScores((prev) => ({ ...prev, [d.key]: v }))} />
        ))}
      </div>

      <textarea value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="Optional: any extra feedback…"
        rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 resize-none text-gray-900" />

      <button onClick={submit} disabled={loading || !allScored}
        className="w-full py-2.5 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
        {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {loading ? "Submitting…" : "Submit Rating"}
      </button>
    </div>
  );
}
