"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Artisan, Review } from "@/lib/types";

type ReviewWithName = Review & { reviewerName: string | null };

interface ArtisanPageData {
  artisan: Artisan;
  reviews: ReviewWithName[];
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= rating ? "text-green-600" : "text-gray-200"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white font-sans animate-pulse">
      <div className="bg-gray-950 h-72 w-full" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-4 bg-gray-50 border border-gray-100 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-50 border border-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-50 border border-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-50 border border-gray-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function ArtisanProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<ArtisanPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/artisans/${id}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) { setNotFound(true); return; }
        const json = await res.json() as ArtisanPageData;
        setData(json);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton />;

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-white font-sans flex flex-col items-center justify-center gap-6 px-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          404 — Not Found
        </p>
        <h1 className="text-3xl font-black text-gray-950 text-center">
          Artisan not found
        </h1>
        <p className="text-gray-500 font-semibold text-center max-w-xs">
          This profile does not exist or may have been removed.
        </p>
        <Link
          href="/browse"
          className="bg-green-700 px-6 py-3 text-sm font-black text-white hover:bg-green-800 rounded-xl transition-colors"
        >
          ← Browse artisans
        </Link>
      </div>
    );
  }

  const { artisan: a, reviews } = data;
  const firstName = a.fullName.split(" ")[0];

  const whatsappUrl = `https://wa.me/${a.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi ${firstName}, I found your profile on iSabi and would like to discuss a job.`
  )}`;

  return (
    <div className="min-h-screen bg-white font-sans pb-20">

      {/* ── Dark hero header ───────────────────────────────────── */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-10">

          {/* Back link */}
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-xs font-black text-gray-400 hover:text-white transition-colors mb-8"
          >
            ← Browse artisans
          </Link>

          {/* Avatar + identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="shrink-0">
              {a.avatar ? (
                <Image
                  unoptimized
                  src={a.avatar}
                  alt={a.fullName}
                  width={96}
                  height={96}
                  className="w-24 h-24 object-cover border-2 border-gray-700 rounded-2xl"
                />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center bg-gray-800 border-2 border-gray-700 rounded-2xl">
                  <span className="text-4xl font-black text-gray-300">
                    {a.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {a.fullName}
                </h1>
                {a.isVerified && (
                  <span className="bg-green-700 text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-wider shrink-0">
                    ✓ VERIFIED
                  </span>
                )}
                {a.emergencyAvailable && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-wider shrink-0">
                    ⚡ EMERGENCY
                  </span>
                )}
              </div>
              <p className="text-gray-300 font-semibold text-base">{a.category}</p>
              <p className="text-gray-400 text-sm mt-0.5">{a.location}</p>

              {/* Trust score strip */}
              <div className="mt-4 max-w-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Trust Score
                  </p>
                  <p className="text-[10px] font-black text-gray-300">
                    {a.trustScore}/100
                  </p>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full transition-all"
                    style={{ width: `${Math.min(a.trustScore, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            {[
              { label: "Jobs Done",       value: String(a.completedJobs) },
              { label: "Rating",          value: a.rating ? `${Number(a.rating).toFixed(1)}★` : "New" },
              { label: "Years Exp.",      value: `${a.yearsExperience} yr${a.yearsExperience !== 1 ? "s" : ""}` },
              { label: "Service Radius",  value: `${a.serviceRadiusKm} km` },
            ].map((stat) => (
              <div key={stat.label} className="py-5 px-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  {stat.label}
                </p>
                <p className="text-xl font-black text-gray-950">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two-column body ────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">

          {/* ── Left column: details ──────────────────────────── */}
          <div className="space-y-5">

            {/* Skills */}
            <div className="bg-white border border-gray-200 p-5 rounded-2xl hover:border-green-600 transition-all">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                Skills
              </p>
              {a.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {a.skills.map((skill) => (
                    <span
                      key={skill}
                      className="border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-400">No skills listed.</p>
              )}
            </div>

            {/* Service areas */}
            {(a.serviceAreas ?? []).length > 0 && (
              <div className="bg-white border border-gray-200 p-5 hover:border-green-600 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                  Service Areas
                </p>
                <div className="flex flex-wrap gap-2">
                  {(a.serviceAreas ?? []).map((area) => (
                    <span
                      key={area}
                      className="bg-gray-50 border border-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency badge */}
            {a.emergencyAvailable && (
              <div className="bg-red-50 border border-red-100 p-5 rounded-none">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">
                  Emergency Available
                </p>
                <p className="text-sm font-semibold text-red-700">
                  {firstName} is available for urgent same-day callouts.
                </p>
              </div>
            )}
          </div>

          {/* ── Right column: hire CTA ────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 p-5 rounded-2xl hover:border-green-600 transition-all">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                Hire this Artisan
              </p>
              <h2 className="text-lg font-black text-gray-950 mb-1 leading-snug">
                Work with {firstName}
              </h2>
              <p className="text-sm font-semibold text-gray-500 mb-5">
                Post a job and get a quote. Payments are held in escrow until you&apos;re satisfied.
              </p>

              <Link
                href={`/report?artisan=${a.id}`}
                className="flex items-center justify-center w-full bg-green-700 px-6 py-3 text-sm font-black text-white hover:bg-green-800 rounded-xl transition-colors mb-3"
              >
                → Post a job with {firstName}
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full border border-gray-200 px-6 py-3 text-sm font-black text-gray-700 hover:border-green-600 hover:text-green-700 rounded-xl transition-all"
              >
                💬 Message via WhatsApp
              </a>
            </div>

            {/* Quick facts card */}
            <div className="bg-gray-950 text-white p-5 rounded-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                Quick Facts
              </p>
              <ul className="space-y-2 text-sm font-semibold text-gray-300">
                <li className="flex justify-between">
                  <span className="text-gray-500">Trade</span>
                  <span className="text-white font-black">{a.category}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Location</span>
                  <span className="text-white font-black truncate max-w-[60%] text-right">{a.location}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Experience</span>
                  <span className="text-white font-black">{a.yearsExperience} yr{a.yearsExperience !== 1 ? "s" : ""}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Radius</span>
                  <span className="text-white font-black">{a.serviceRadiusKm} km</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Reviews section ──────────────────────────────────── */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Reviews
            </p>
            <span className="text-[10px] font-black bg-gray-950 text-white px-2 py-0.5 rounded-full">
              {reviews.length}
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="border border-gray-100 py-16 text-center">
              <p className="text-sm font-semibold text-gray-400">No reviews yet.</p>
              <p className="text-xs text-gray-300 mt-1">
                Be the first to work with {firstName} and leave a review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white border border-gray-200 p-5 hover:border-green-600 transition-all rounded-2xl"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-sm font-black text-gray-950">
                        {review.reviewerName ?? "Anonymous"}
                      </p>
                      <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                        {new Date(review.createdAt).toLocaleDateString("en-NG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <StarRow rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="text-sm font-semibold text-gray-600 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
