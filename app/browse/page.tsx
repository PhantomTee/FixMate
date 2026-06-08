"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadDb } from "@/lib/demo-db";
import { Artisan, ARTISAN_CATEGORIES } from "@/lib/types";

const ALL = "All";
const SORT_OPTIONS = [
  { value: "jobs",   label: "Most Jobs Done" },
  { value: "rating", label: "Highest Rated" },
  { value: "name",   label: "Name A–Z" },
];

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") ?? ALL);
  const [sort, setSort] = useState("jobs");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    try {
      const db = loadDb();
      setArtisans(db.artisans.filter((a) => a.applicationStatus === "approved"));
    } catch { /* SSR */ }
  }, []);

  const filtered = useMemo(() => {
    let list = artisans;
    if (verifiedOnly) list = list.filter((a) => a.isVerified);
    if (category !== ALL) list = list.filter((a) => a.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          (a.skills ?? []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "jobs")   return b.completedJobs - a.completedJobs;
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return a.fullName.localeCompare(b.fullName);
    });
  }, [artisans, search, category, sort, verifiedOnly]);

  const categories = [ALL, ...ARTISAN_CATEGORIES];

  return (
    <div className="min-h-screen bg-white font-sans pb-20">

      {/* Page header */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-[clamp(1.8rem,5vw,3rem)] font-black text-gray-950 tracking-tight leading-tight mb-2">
            Find a trusted artisan
          </h1>
          <p className="text-gray-500 text-base max-w-xl">
            Browse verified tradespeople across Nigeria. Filter by trade, location, or search by name.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Search + controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, trade, or location…"
            className="flex-1 border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 border border-gray-200 px-4 py-3 cursor-pointer select-none bg-white shrink-0">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="accent-green-600"
            />
            <span className="text-sm font-semibold text-gray-700">Verified only</span>
          </label>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${
                category === cat
                  ? "bg-green-700 text-white"
                  : "border border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-400 font-semibold">
            {filtered.length} artisan{filtered.length !== 1 ? "s" : ""} found
          </p>
          {(search || category !== ALL || verifiedOnly) && (
            <button
              onClick={() => { setSearch(""); setCategory(ALL); setVerifiedOnly(false); }}
              className="text-xs font-black text-gray-400 hover:text-gray-950 transition-colors underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="border border-gray-100 py-20 text-center">
            <p className="text-gray-400 text-sm mb-4">No artisans match your filters.</p>
            <button
              onClick={() => { setSearch(""); setCategory(ALL); setVerifiedOnly(false); }}
              className="text-sm font-black text-green-700 hover:text-green-800 underline underline-offset-4"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((a) => (
              <ArtisanCard key={a.id} artisan={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArtisanCard({ artisan: a }: { artisan: Artisan }) {
  return (
    <Link
      href={`/report?artisan=${a.id}`}
      className="bg-white border border-gray-200 p-5 hover:border-green-600 hover:shadow-sm transition-all group flex flex-col"
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-4">
        <Image
          unoptimized
          src={a.avatar}
          alt={a.fullName}
          width={48}
          height={48}
          className="border border-gray-200 object-cover shrink-0"
        />
        <div className="min-w-0">
          <h3 className="font-black text-sm text-gray-950 truncate leading-tight">{a.fullName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{a.category}</p>
        </div>
      </div>

      {/* Location + verification */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 truncate">{a.location}</span>
        {a.isVerified && (
          <span className="text-[10px] font-black bg-green-50 text-green-700 px-2 py-0.5 shrink-0 ml-2">✓ VERIFIED</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 mt-auto">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Jobs Done</p>
          <p className="text-sm font-black text-gray-950 mt-0.5">{a.completedJobs}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Rating</p>
          <p className="text-sm font-black text-gray-950 mt-0.5">{a.rating ? `${a.rating}★` : "New"}</p>
        </div>
      </div>

      {/* Experience */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">{a.yearsExperience} yr{a.yearsExperience !== 1 ? "s" : ""} exp.</span>
        <span className="text-xs font-black text-gray-400 group-hover:text-green-700 transition-colors">Hire →</span>
      </div>
    </Link>
  );
}
