"use client";

import Link from "next/link";

const STATS = [
  { value: "500+", label: "Artisans" },
  { value: "18",   label: "Categories" },
  { value: "₦0",   label: "Risk (escrow)" },
  { value: "60s",  label: "AI triage" },
];

const CARDS = [
  {
    id: "diagnose",
    bg: "bg-gray-950",
    tag: "AI powered",
    tagClass: "border-white/20 text-white/60",
    title: "Identify the fault",
    titleClass: "text-white",
    desc: "Describe or photograph the issue. Gemini returns urgency, cost estimate, and safety steps.",
    descClass: "text-gray-400",
    linkLabel: "Try diagnosis →",
    linkClass: "text-green-400 hover:text-green-300",
    href: "/report",
    num: "01",
    numClass: "text-white/10",
  },
  {
    id: "escrow",
    bg: "bg-[#00e676]",
    tag: "OPay escrow",
    tagClass: "border-black/20 text-black/60",
    title: "Pay only on completion",
    titleClass: "text-gray-950",
    desc: "Funds locked in OPay escrow. Released only when you confirm the job is done.",
    descClass: "text-gray-700",
    linkLabel: "See escrow →",
    linkClass: "text-gray-950 hover:text-gray-700",
    href: "/opay-simulator",
    num: "02",
    numClass: "text-black/10",
  },
  {
    id: "artisan",
    bg: "bg-[#ffe566]",
    tag: "pre-screened",
    tagClass: "border-black/20 text-black/60",
    title: "Match a trusted pro",
    titleClass: "text-gray-950",
    desc: "Ranked by trust score, verified ID, and completed jobs — not ads.",
    descClass: "text-gray-700",
    linkLabel: "Find artisan →",
    linkClass: "text-gray-950 hover:text-gray-700",
    href: "/report",
    num: "03",
    numClass: "text-black/10",
  },
  {
    id: "language",
    bg: "bg-gray-100",
    tag: "5 languages",
    tagClass: "border-gray-400/30 text-gray-500",
    title: "Talk in your language",
    titleClass: "text-gray-950",
    desc: "English, Pidgin, Yoruba, Hausa, Igbo. Gemini responds in your chosen language.",
    descClass: "text-gray-500",
    linkLabel: "Try Pidgin →",
    linkClass: "text-gray-950 hover:text-gray-600",
    href: "/report",
    num: "04",
    numClass: "text-black/8",
  },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Describe or snap",   body: "Type the issue or upload a photo. Works on low-end phones and USSD." },
  { n: "02", title: "Gemini triages",      body: "AI returns urgency, naira cost estimate, safety steps, and artisan brief." },
  { n: "03", title: "Pick an artisan",     body: "Choose from matched, verified pros ranked by trust score and location." },
  { n: "04", title: "Pay on completion",   body: "OPay escrow holds funds. Release only when you are satisfied.", highlight: true },
];

const DEMO_STEPS = [
  { n: "1", title: "Report Issue",    desc: "AI diagnosis + artisan match", href: "/report" },
  { n: "2", title: "Book & Pay",      desc: "Fund OPay escrow",             href: "/booking" },
  { n: "3", title: "Artisan Hub",     desc: "Accept, progress, complete",   href: "/artisan/dashboard" },
  { n: "4", title: "Admin Console",   desc: "Trust scores + dispute tools", href: "/admin" },
];

export default function HomePage() {
  const marquee = Array(6).fill(
    "Powered by OPay × Google Gemini  •  Verified artisans  •  Escrow-protected payments  •  5 Nigerian languages  •  "
  ).join("");

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10 sm:pt-24 sm:pb-16">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 items-start">

          {/* Left col */}
          <div>
            <div className="inline-flex items-center gap-2 border border-gray-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              OPay × Google Gemini Hackathon
            </div>

            <h1 className="text-[clamp(3.2rem,8.5vw,6.4rem)] font-black leading-[0.93] tracking-[-0.03em] text-gray-950 mb-6">
              Fix anything.<br />
              <span className="text-green-600">Pay safe.</span>
            </h1>

            <p className="text-gray-500 text-lg max-w-md mb-10 leading-relaxed">
              AI-backed fault diagnosis. Verified local artisans.
              OPay escrow that releases only when the job is done.
            </p>

            <div className="flex flex-wrap gap-3 mb-14">
              <Link
                href="/report"
                className="bg-gray-950 text-white px-7 py-3.5 text-sm font-black tracking-wide hover:bg-gray-800 transition-colors"
              >
                Find an Artisan →
              </Link>
              <Link
                href="/artisan/register"
                className="border border-gray-300 text-gray-800 px-7 py-3.5 text-sm font-black tracking-wide hover:border-gray-950 transition-colors"
              >
                Apply as Artisan
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-stretch border-t border-gray-100 pt-8 gap-0">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className={`pr-7 mr-7 ${i < STATS.length - 1 ? "border-r border-gray-200" : ""}`}
                >
                  <p className="text-[2.2rem] font-black text-gray-950 leading-none tracking-tight">{s.value}</p>
                  <p className="text-xs text-gray-400 font-semibold mt-1 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right col — 2×2 feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {CARDS.map((c) => (
              <div key={c.id} className={`${c.bg} p-5 flex flex-col justify-between min-h-[210px] group`}>
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 ${c.tagClass}`}>
                    {c.tag}
                  </span>
                  <span className={`text-3xl font-black ${c.numClass}`}>{c.num}</span>
                </div>
                <div>
                  <h3 className={`text-[1.05rem] font-black leading-snug mb-2 ${c.titleClass}`}>{c.title}</h3>
                  <p className={`text-xs leading-relaxed mb-4 ${c.descClass}`}>{c.desc}</p>
                  <Link href={c.href} className={`text-xs font-black underline underline-offset-2 ${c.linkClass} transition-colors`}>
                    {c.linkLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────────────── */}
      <div className="overflow-hidden border-y border-gray-200 bg-gray-950 py-3 select-none">
        <div className="marquee-track whitespace-nowrap text-sm font-bold uppercase tracking-[0.16em] text-white/70">
          {marquee}
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-tight tracking-[-0.03em] text-gray-950">
            How FixMate works
          </h2>
          <Link href="/report" className="text-sm font-black text-green-700 hover:text-green-600 underline underline-offset-4 whitespace-nowrap">
            Try it now →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {HOW_IT_WORKS.map((s) => (
            <div
              key={s.n}
              className={`p-6 ${s.highlight ? "bg-green-700 border-green-700" : "border border-gray-200 bg-white"}`}
            >
              <span className={`text-5xl font-black block mb-5 ${s.highlight ? "text-green-500/30" : "text-gray-100"}`}>
                {s.n}
              </span>
              <h3 className={`font-black text-[1rem] mb-2 ${s.highlight ? "text-white" : "text-gray-950"}`}>
                {s.title}
              </h3>
              <p className={`text-sm leading-relaxed ${s.highlight ? "text-green-100" : "text-gray-500"}`}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ARTISAN CTA ───────────────────────────────────────────────── */}
      <section className="bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-green-400 mb-4 block">
              For skilled tradespeople
            </span>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black text-white leading-tight tracking-[-0.03em] mb-5">
              Are you a skilled artisan?
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              Apply on FixMate, build a calculated trust score, and receive escrow-secured payments. Registration is on the website only — WhatsApp mirrors job updates only.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/artisan/register"
              className="bg-green-600 text-white px-7 py-4 text-sm font-black hover:bg-green-500 transition-colors text-center tracking-wide"
            >
              Join as Artisan →
            </Link>
            <Link
              href="/artisan/dashboard"
              className="border border-white/15 text-white px-7 py-4 text-sm font-black hover:bg-white/5 transition-colors text-center tracking-wide"
            >
              View Artisan Hub
            </Link>
          </div>
        </div>
      </section>

      {/* ── JUDGE DEMO CTA ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="border border-gray-200 p-8 sm:p-12">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10">
            <div className="max-w-xl">
              <span className="inline-block bg-gray-950 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 mb-5">
                Judge Demo
              </span>
              <h2 className="text-[clamp(2rem,5vw,3rem)] font-black tracking-[-0.03em] text-gray-950 mb-4">
                Run the full demo flow
              </h2>
              <p className="text-gray-500 leading-relaxed">
                AI diagnosis → escrow booking → artisan acceptance → fund release → admin controls.
                No signup. No API key required.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 min-w-[200px]">
              <Link
                href="/report"
                className="bg-green-700 text-white px-8 py-4 text-sm font-black hover:bg-green-600 transition-colors text-center tracking-wide"
              >
                Start Demo →
              </Link>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/opay-simulator" className="border border-gray-200 py-2.5 text-[10px] font-black text-center hover:border-gray-950 hover:bg-gray-50 transition-colors uppercase tracking-wider">OPay</Link>
                <Link href="/ussd-demo"      className="border border-gray-200 py-2.5 text-[10px] font-black text-center hover:border-gray-950 hover:bg-gray-50 transition-colors uppercase tracking-wider">USSD</Link>
                <Link href="/whatsapp-demo"  className="border border-gray-200 py-2.5 text-[10px] font-black text-center hover:border-gray-950 hover:bg-gray-50 transition-colors uppercase tracking-wider">WA Bot</Link>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-10 pt-8 border-t border-gray-100">
            {DEMO_STEPS.map((s) => (
              <Link
                key={s.n}
                href={s.href}
                className="group p-5 border border-gray-100 hover:border-green-600 hover:bg-green-50 transition-all"
              >
                <span className="text-3xl font-black text-gray-100 group-hover:text-green-200 block mb-3 transition-colors">
                  {s.n}
                </span>
                <h3 className="text-sm font-black text-gray-950 mb-1">{s.title}</h3>
                <p className="text-xs text-gray-400">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center bg-green-700 text-sm font-black text-white">F</span>
              <span className="text-lg font-black text-gray-950">FixMate</span>
            </div>
            <p className="text-sm text-gray-400 max-w-[220px] leading-relaxed">
              AI diagnosis. Trusted artisans. OPay escrow. Built for Nigeria.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-black text-gray-950 mb-4 text-[10px] uppercase tracking-widest">Platform</h4>
              <ul className="space-y-2.5 text-gray-400">
                {[["Report Issue","/report"],["Customer","/dashboard"],["Become Artisan","/artisan/register"],["Artisan Hub","/artisan/dashboard"]].map(([l,h])=>(
                  <li key={l}><Link href={h} className="hover:text-gray-950 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-black text-gray-950 mb-4 text-[10px] uppercase tracking-widest">Demo</h4>
              <ul className="space-y-2.5 text-gray-400">
                {[["Admin","/admin"],["OPay Simulator","/opay-simulator"],["USSD Demo","/ussd-demo"],["WhatsApp Bot","/whatsapp-demo"]].map(([l,h])=>(
                  <li key={l}><Link href={h} className="hover:text-gray-950 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-black text-gray-950 mb-4 text-[10px] uppercase tracking-widest">Legal</h4>
              <ul className="space-y-2.5 text-gray-400">
                {[["Privacy","/privacy"],["Terms","/terms"],["Escrow Guide","/escrow-guidelines"],["Help","/help"]].map(([l,h])=>(
                  <li key={l}><Link href={h} className="hover:text-gray-950 transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-2 text-xs text-gray-300">
          <span>© {new Date().getFullYear()} FixMate. All rights reserved.</span>
          <span>OPay × Google Gemini Hackathon Submission</span>
        </div>
      </footer>
    </div>
  );
}
