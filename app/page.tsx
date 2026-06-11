"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Artisan } from "@/lib/types";

const HERO_IMAGES = [
  "https://i.ibb.co/DgwqHdWt/93661.jpg",
  "https://i.ibb.co/twvQ2ThD/86494.jpg",
  "https://i.ibb.co/Wp6N4fmj/18997.jpg",
  "https://i.ibb.co/bMzhz4qP/139913.jpg",
];

const HERO_CONTENT = [
  {
    top: "Nigeria's home repair",
    accent: "marketplace.",
    sub: "Find verified plumbers, electricians, AC technicians and more. Pay only when the job is done.",
  },
  {
    top: "Skilled artisans,",
    accent: "near you.",
    sub: "From Lagos to Abuja to Port Harcourt — verified tradespeople wherever you are.",
  },
  {
    top: "Your money is safe.",
    accent: "Always.",
    sub: "OPay escrow holds your payment until you confirm the job is complete. Zero risk.",
  },
  {
    top: "Trusted work,",
    accent: "guaranteed.",
    sub: "Every artisan is ID-verified with a real track record. Book with total confidence.",
  },
  {
    top: "Book in minutes,",
    accent: "fixed today.",
    sub: "Describe your issue, get AI-matched to the right artisan, and confirm in seconds.",
  },
];

// ── STATS ──────────────────────────────────────────────────────────────
const STATS = [
  {
    value: "2,400+",
    label: "Artisans registered",
    desc: "Across Lagos, Abuja, PH & more",
    img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80", // team of workers
    href: "/browse",
  },
  {
    value: "18",
    label: "Trade categories",
    desc: "From plumbing to hair styling",
    img: "https://images.unsplash.com/photo-1581093577421-8a2b3a03e08c?w=600&q=80", // technician tools
    href: "/browse",
  },
  {
    value: "₦0",
    label: "Risk with escrow",
    desc: "Secured by OPay — pay on completion",
    img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80",    // secure payment / phone
    href: "/escrow-guidelines",
  },
  {
    value: "4.8",
    label: "Average rating",
    desc: "From real, verified client reviews",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",  // professional portrait (Black man)
    href: "/browse",
  },
];

const CATEGORIES = [
  { label: "Plumbing",   slug: "Plumber",         img: "https://i.ibb.co/hJ7x66Tt/139737.jpg" },
  { label: "Electrical", slug: "Electrician",      img: "https://i.ibb.co/8gjBQPQW/depositphotos-328265494-stock-photo-african-american-electrician-performing-wiring.webp" },
  { label: "AC Repair",  slug: "AC Repair",        img: "https://i.ibb.co/0yFxL87d/92713.jpg" },
  { label: "Generator",  slug: "Generator Repair", img: "https://i.ibb.co/spdBR6ZZ/0bee7ac4-0c24-42eb-ba3a-e8aa4dfc9e10.png" },
  { label: "Painting",   slug: "Painter",          img: "https://i.ibb.co/s9x3CFNP/63282.jpg" },
  { label: "Carpentry",  slug: "Carpenter",        img: "https://i.ibb.co/Tqqm2CQZ/ad96daf5-c27a-4f46-8d77-d4a55ae27ffc.png" },
  { label: "Cleaning",   slug: "Cleaning",         img: "https://i.ibb.co/Z6H6f3PN/7ae539d6-2ae8-475f-a904-b27992bded31.png" },
  { label: "Mechanics",  slug: "Mechanic",         img: "https://i.ibb.co/TqLGt4S2/73045.jpg" },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Describe your job",       body: "Tell us what needs fixing — type it out or upload a photo. Our AI assesses the issue instantly." },
  { n: "02", title: "Get matched to artisans", body: "We match you with verified, reviewed artisans in your area who specialise in your job type." },
  { n: "03", title: "Pay when it's done",       body: "Funds held in secure escrow are released to the artisan only after you confirm completion." },
];

const TRUST_POINTS = [
  { icon: "✓", title: "Identity verified",   body: "Every artisan submits valid government ID before being approved on the platform." },
  { icon: "★", title: "Reviewed by clients", body: "Ratings and reviews are from real, completed jobs — not self-reported." },
  { icon: "🔒", title: "Escrow payments",    body: "Your money stays locked until you're satisfied. No more pay-and-disappear." },
];

export default function HomePage() {
  const [featuredArtisans, setFeaturedArtisans] = useState<Artisan[]>([]);
  const [heroImg, setHeroImg] = useState(0);
  const [contentIdx, setContentIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setHeroImg((i) => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setContentIdx((i) => (i + 1) % HERO_CONTENT.length); setFade(true); }, 350);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = catRef.current;
    if (!el) return;
    const t = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 220, behavior: "smooth" });
      }
    }, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/artisans?verified=true")
      .then((r) => r.json())
      .then((data) => setFeaturedArtisans(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => {});
  }, []);

  const hero = HERO_CONTENT[contentIdx];

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-gray-950">
        {HERO_IMAGES.map((img, i) => (
          <div
            key={img}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${img})`,
              opacity: i === heroImg ? 0.2 : 0,
              transition: "opacity 1.5s ease-in-out",
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/95 via-gray-950/70 to-gray-950/20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-28 sm:py-36">
          <div className="max-w-2xl">
            <div
              style={{
                opacity: fade ? 1 : 0,
                transform: fade ? "translateY(0)" : "translateY(14px)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
              }}
            >
              <h1 className="text-[clamp(3rem,8.5vw,5.8rem)] font-black leading-[0.93] tracking-[-0.03em] text-white mb-5">
                {hero.top}{" "}
                <span className="text-green-400">{hero.accent}</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/65 max-w-lg mb-10 leading-relaxed font-medium">
                {hero.sub}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/report" className="bg-green-500 text-white px-8 py-4 text-base font-black hover:bg-green-400 transition-colors text-center rounded-xl">
                Post a Job →
              </Link>
              <Link href="/browse" className="border border-white/20 bg-white/5 text-white px-8 py-4 text-base font-black hover:bg-white/10 transition-colors text-center rounded-xl">
                Browse Artisans
              </Link>
            </div>

            <div className="flex gap-2 mt-12">
              {HERO_CONTENT.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setFade(false); setTimeout(() => { setContentIdx(i); setFade(true); }, 200); }}
                  className={`h-1 rounded-full transition-all duration-300 ${i === contentIdx ? "w-8 bg-green-400" : "w-2 bg-white/25 hover:bg-white/40"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {STATS.map((s, i) => (
              <Link
                key={s.label}
                href={s.href}
                className={`relative overflow-hidden border border-gray-100 p-6 hover:border-green-300 hover:shadow-lg transition-all group bg-white ${i === 0 || i === 3 ? "rounded-2xl" : "rounded-none"}`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.06] group-hover:opacity-[0.1] transition-opacity"
                  style={{ backgroundImage: `url(${s.img})` }}
                />
                <div className="relative">
                  <p className="text-[2.5rem] sm:text-[3rem] font-black text-gray-950 leading-none tracking-tight">{s.value}</p>
                  <p className="text-sm font-bold text-gray-700 mt-2.5">{s.label}</p>
                  <p className="text-xs text-gray-400 mt-1.5 leading-snug">{s.desc}</p>
                  <span className="text-[11px] font-black text-green-600 mt-3 inline-block group-hover:translate-x-1 transition-transform">Explore →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-gray-50 py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-[clamp(1.5rem,4vw,2.2rem)] font-black text-gray-950 tracking-tight">
              Browse by trade
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => catRef.current?.scrollBy({ left: -230, behavior: "smooth" })}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white hover:border-gray-400 transition-colors text-gray-500 text-sm"
              >←</button>
              <button
                onClick={() => catRef.current?.scrollBy({ left: 230, behavior: "smooth" })}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white hover:border-gray-400 transition-colors text-gray-500 text-sm"
              >→</button>
            </div>
          </div>

          <div
            ref={catRef}
            className="flex gap-4 overflow-x-auto pb-3 scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {CATEGORIES.map((cat, i) => (
              <Link
                key={cat.slug}
                href={`/browse?category=${encodeURIComponent(cat.slug)}`}
                className={`relative shrink-0 w-48 h-60 overflow-hidden group ${i % 2 === 0 ? "rounded-2xl" : "rounded-none"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.img}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-black text-white text-sm leading-tight">{cat.label}</p>
                  <p className="text-white/60 text-xs mt-1 group-hover:text-green-400 transition-colors font-semibold">Browse →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black text-gray-950 tracking-tight">
            How iSabi works
          </h2>
          <Link href="/report" className="text-sm font-black text-green-700 hover:text-green-800 underline underline-offset-4 whitespace-nowrap">
            Post your first job →
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map((s, i) => (
            <div
              key={s.n}
              className={`p-6 ${i === 2 ? "bg-green-700 rounded-2xl" : i === 0 ? "border border-gray-200 rounded-none" : "border border-gray-200 rounded-xl"}`}
            >
              <span className={`text-5xl font-black block mb-4 ${i === 2 ? "text-green-500/30" : "text-gray-100"}`}>{s.n}</span>
              <h3 className={`font-black text-base mb-2 ${i === 2 ? "text-white" : "text-gray-950"}`}>{s.title}</h3>
              <p className={`text-sm leading-relaxed ${i === 2 ? "text-green-100" : "text-gray-500"}`}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED ARTISANS ─────────────────────────────────────────── */}
      {featuredArtisans.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50 py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-[clamp(1.5rem,4vw,2.2rem)] font-black text-gray-950 tracking-tight">Top-rated artisans</h2>
              <Link href="/browse" className="text-sm font-black text-green-700 hover:text-green-800 underline underline-offset-4">View all →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredArtisans.map((a, i) => (
                <Link
                  key={a.id}
                  href={`/artisan/${a.id}`}
                  className={`bg-white border border-gray-200 p-5 hover:border-green-400 hover:shadow-md transition-all group ${i % 2 === 0 ? "rounded-2xl" : "rounded-none"}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Image unoptimized src={a.avatar} alt={a.fullName} width={44} height={44} className="rounded-full border-2 border-gray-100 object-cover" />
                    <div className="min-w-0">
                      <h3 className="font-black text-sm text-gray-950 truncate">{a.fullName}</h3>
                      <p className="text-xs text-gray-400">{a.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{a.location}</span>
                    <span className="text-[10px] font-black bg-green-50 text-green-700 px-2 py-0.5 rounded-full">✓ VERIFIED</span>
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

      {/* ── TRUST ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black text-gray-950 tracking-tight mb-4">
              Built on trust.<br />Backed by escrow.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Every artisan is verified before joining. Every payment is held in escrow. You stay in control from first message to final payment.
            </p>
            <Link href="/report" className="inline-block bg-green-700 text-white px-7 py-3.5 text-sm font-black hover:bg-green-800 transition-colors rounded-xl">
              Find a Trusted Artisan →
            </Link>
          </div>
          <div className="space-y-4">
            {TRUST_POINTS.map((t, i) => (
              <div key={t.title} className={`flex items-start gap-4 border border-gray-200 p-5 ${i === 1 ? "rounded-2xl" : "rounded-none"}`}>
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

      {/* ── ARTISAN CTA ───────────────────────────────────────────────── */}
      <section className="bg-gray-950 py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-4 block">For skilled tradespeople</span>
            <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-black text-white leading-tight tracking-tight mb-4">
              Grow your repair business with iSabi.
            </h2>
            <p className="text-gray-400 leading-relaxed max-w-md">
              Register your trade, build a verified profile, receive job requests, and get paid securely via OPay escrow.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/artisan/register" className="bg-green-600 text-white px-7 py-4 text-sm font-black hover:bg-green-500 transition-colors text-center rounded-xl">
              Register as Artisan →
            </Link>
            <Link href="/artisan/dashboard" className="border border-white/15 text-white px-7 py-4 text-sm font-black hover:bg-white/5 transition-colors text-center rounded-xl">
              View Artisan Hub
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center bg-green-700 text-sm font-black text-white rounded-lg">S</span>
              <span className="text-base font-black text-gray-950">iSabi</span>
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
          <span>© {new Date().getFullYear()} iSabi. All rights reserved.</span>
          <span>Secured by OPay Escrow · AI-powered by iSabi AI</span>
        </div>
      </footer>
    </div>
  );
}
