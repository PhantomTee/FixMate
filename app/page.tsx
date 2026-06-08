"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { loadDb } from "@/lib/demo-db";
import { Artisan } from "@/lib/types";

const CATEGORIES = [
  { label: "Plumbing",       icon: "🔧", slug: "Plumber" },
  { label: "Electrical",     icon: "⚡", slug: "Electrician" },
  { label: "AC Repair",      icon: "❄️", slug: "AC Repair" },
  { label: "Generator",      icon: "🔌", slug: "Generator Repair" },
  { label: "Painting",       icon: "🖌️", slug: "Painter" },
  { label: "Carpentry",      icon: "🪚", slug: "Carpenter" },
  { label: "Cleaning",       icon: "🧹", slug: "Cleaning" },
  { label: "Mechanics",      icon: "🚗", slug: "Mechanic" },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Describe your job",       body: "Tell us what needs fixing — type it out or upload a photo. Our AI helps triage the issue instantly." },
  { n: "02", title: "Get matched to artisans", body: "We match you with verified, reviewed artisans in your area who specialise in your job type." },
  { n: "03", title: "Pay when it's done",       body: "Funds are held in secure escrow and only released to the artisan after you confirm the job is complete." },
];

const TRUST_POINTS = [
  { icon: "✓", title: "Identity verified",   body: "Every artisan submits valid ID before being approved on the platform." },
  { icon: "★", title: "Reviewed by clients", body: "Ratings and reviews are from real, completed jobs — not self-reported." },
  { icon: "🔒", title: "Escrow payments",    body: "Your money stays locked until you're satisfied. No more pay-and-disappear." },
];

export default function HomePage() {
  const [featuredArtisans, setFeaturedArtisans] = useState<Artisan[]>([]);

  useEffect(() => {
    try {
      const db = loadDb();
      const approved = db.artisans.filter((a) => a.applicationStatus === "approved" && a.isVerified).slice(0, 4);
      setFeaturedArtisans(approved);
    } catch { /* no localStorage on SSR */ }
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── HERO ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-24 sm:pb-24">
        <div className="max-w-3xl">
          <h1 className="text-[clamp(2.4rem,7vw,5rem)] font-black leading-[0.95] tracking-[-0.03em] text-gray-950 mb-6">
            Nigeria's home repair<br />
            <span className="text-green-700">marketplace.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mb-10 leading-relaxed">
            Find verified plumbers, electricians, AC technicians, and more. Pay only when the job is done.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/report"
              className="bg-green-700 text-white px-8 py-4 text-base font-black hover:bg-green-800 transition-colors text-center"
            >
              Post a Job →
            </Link>
            <Link
              href="/browse"
              className="border border-gray-300 text-gray-800 px-8 py-4 text-base font-black hover:border-gray-950 transition-colors text-center"
            >
              Browse Artisans
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap gap-0 mt-14 border-t border-gray-100 pt-10">
          {[
            { v: "2,400+", l: "Artisans registered" },
            { v: "18",     l: "Trade categories" },
            { v: "₦0",     l: "Risk with escrow" },
            { v: "4.8★",   l: "Average rating" },
          ].map((s, i) => (
            <div key={s.l} className={`pr-8 mr-8 ${i < 3 ? "border-r border-gray-200" : ""}`}>
              <p className="text-[2rem] font-black text-gray-950 leading-none">{s.v}</p>
              <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="border-t border-gray-100 bg-gray-50 py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-[clamp(1.5rem,4vw,2.2rem)] font-black text-gray-950 tracking-tight mb-8">
            Browse by trade
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/browse?category=${encodeURIComponent(cat.slug)}`}
                className="flex flex-col items-center gap-2 border border-gray-200 bg-white p-4 hover:border-green-600 hover:bg-green-50 transition-all group"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-black text-gray-700 group-hover:text-green-700 text-center leading-tight">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black text-gray-950 tracking-tight">
            How FixMate works
          </h2>
          <Link href="/report" className="text-sm font-black text-green-700 hover:text-green-800 underline underline-offset-4 whitespace-nowrap">
            Post your first job →
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.n} className={`p-6 border ${i === 2 ? "bg-green-700 border-green-700" : "border-gray-200"}`}>
              <span className={`text-5xl font-black block mb-4 ${i === 2 ? "text-green-500/30" : "text-gray-100"}`}>{s.n}</span>
              <h3 className={`font-black text-base mb-2 ${i === 2 ? "text-white" : "text-gray-950"}`}>{s.title}</h3>
              <p className={`text-sm leading-relaxed ${i === 2 ? "text-green-100" : "text-gray-500"}`}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED ARTISANS ── */}
      {featuredArtisans.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50 py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-[clamp(1.5rem,4vw,2.2rem)] font-black text-gray-950 tracking-tight">
                Top-rated artisans
              </h2>
              <Link href="/browse" className="text-sm font-black text-green-700 hover:text-green-800 underline underline-offset-4">
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredArtisans.map((a) => (
                <Link key={a.id} href={`/browse?artisan=${a.id}`} className="bg-white border border-gray-200 p-5 hover:border-green-600 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <Image unoptimized src={a.avatar} alt={a.fullName} width={44} height={44} className="border border-gray-200 object-cover" />
                    <div className="min-w-0">
                      <h3 className="font-black text-sm text-gray-950 truncate">{a.fullName}</h3>
                      <p className="text-xs text-gray-400">{a.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{a.location}</span>
                    <span className="text-[10px] font-black bg-green-50 text-green-700 px-2 py-0.5">✓ VERIFIED</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{a.completedJobs} jobs done</span>
                    <span className="text-xs font-black text-gray-950 group-hover:text-green-700 transition-colors">Hire →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TRUST ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black text-gray-950 tracking-tight mb-4">
              Built on trust.<br />Backed by escrow.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Every artisan is verified before joining. Every payment is held in escrow. You stay in control from first message to final payment.
            </p>
            <Link href="/report" className="inline-block bg-green-700 text-white px-7 py-3.5 text-sm font-black hover:bg-green-800 transition-colors">
              Find a Trusted Artisan →
            </Link>
          </div>
          <div className="space-y-4">
            {TRUST_POINTS.map((t) => (
              <div key={t.title} className="flex items-start gap-4 border border-gray-200 p-5">
                <span className="text-xl shrink-0">{t.icon}</span>
                <div>
                  <h3 className="font-black text-gray-950 text-sm mb-1">{t.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARTISAN CTA ── */}
      <section className="bg-gray-950 py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-4 block">For skilled tradespeople</span>
            <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-black text-white leading-tight tracking-tight mb-4">
              Grow your repair business with FixMate.
            </h2>
            <p className="text-gray-400 leading-relaxed max-w-md">
              Register your trade, build a verified profile, receive job requests, and get paid securely via OPay escrow.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/artisan/register" className="bg-green-600 text-white px-7 py-4 text-sm font-black hover:bg-green-500 transition-colors text-center">
              Register as Artisan →
            </Link>
            <Link href="/artisan/dashboard" className="border border-white/15 text-white px-7 py-4 text-sm font-black hover:bg-white/5 transition-colors text-center">
              View Artisan Hub
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-white py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center bg-green-700 text-sm font-black text-white">F</span>
              <span className="text-base font-black text-gray-950">FixMate</span>
            </div>
            <p className="text-sm text-gray-400 max-w-[220px] leading-relaxed">
              Nigeria's marketplace for trusted home repair professionals.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-black text-gray-950 mb-4 text-[10px] uppercase tracking-widest">For Clients</h4>
              <ul className="space-y-2.5 text-gray-400">
                {[["Post a Job", "/report"], ["Browse Artisans", "/browse"], ["My Dashboard", "/dashboard"], ["How it Works", "/#how-it-works"]].map(([l, h]) => (
                  <li key={l}><Link href={h} className="hover:text-gray-950 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-black text-gray-950 mb-4 text-[10px] uppercase tracking-widest">For Artisans</h4>
              <ul className="space-y-2.5 text-gray-400">
                {[["Register", "/artisan/register"], ["Artisan Hub", "/artisan/dashboard"]].map(([l, h]) => (
                  <li key={l}><Link href={h} className="hover:text-gray-950 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-black text-gray-950 mb-4 text-[10px] uppercase tracking-widest">Legal</h4>
              <ul className="space-y-2.5 text-gray-400">
                {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Escrow Policy", "/escrow-guidelines"], ["Help", "/help"]].map(([l, h]) => (
                  <li key={l}><Link href={h} className="hover:text-gray-950 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-2 text-xs text-gray-300">
          <span>© {new Date().getFullYear()} FixMate. All rights reserved.</span>
          <span>Secured by OPay Escrow · AI-powered by Google Gemini</span>
        </div>
      </footer>
    </div>
  );
}
