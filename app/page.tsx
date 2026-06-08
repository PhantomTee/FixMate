"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const heroImages = [
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=1920&auto=format&fit=crop",
];

const previewSteps = [
  {
    key: "diagnose",
    label: "Diagnose",
    title: "Visual fault analysis",
    text: "Gemini reviews the description and optional photo, then returns safety guidance and the right trade category.",
    image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=1200&auto=format&fit=crop",
    stat: "AI triage",
  },
  {
    key: "estimate",
    label: "Estimate",
    title: "Fair price estimate",
    text: "Users see numeric min/max naira estimates, labor, materials, and urgency before booking.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200&auto=format&fit=crop",
    stat: "Transparent cost",
  },
  {
    key: "match",
    label: "Match",
    title: "Verified artisan match",
    text: "FixMate ranks artisans by category, verification, trust score, completed jobs, and location text.",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=1200&auto=format&fit=crop",
    stat: "Trusted pros",
  },
  {
    key: "resolve",
    label: "Resolve",
    title: "Escrow release",
    text: "Payment stays in simulated OPay escrow until the job is complete and the user releases funds.",
    image: "https://images.unsplash.com/photo-1554224154-26032fced8bd?q=80&w=1200&auto=format&fit=crop",
    stat: "Pay on completion",
  },
];

export default function HomePage() {
  const [bgIndex, setBgIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const sponsorText = useMemo(
    () => Array.from({ length: 8 }, () => "Powered by OPay x Google Gemini • Built for trusted local services • WhatsApp bot mirrors website activities • Registration stays on the website •").join(" "),
    [],
  );

  useEffect(() => {
    const timer = setInterval(() => setBgIndex((current) => (current + 1) % heroImages.length), 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setStepIndex((current) => (current + 1) % previewSteps.length), 4200);
    return () => clearInterval(timer);
  }, []);

  const activeStep = previewSteps[stepIndex];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative overflow-x-hidden">
      <section className="relative min-h-[calc(100vh-72px)] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          {heroImages.map((src, index) => (
            <Image
              key={src}
              src={src}
              fill
              priority={index === 0}
              referrerPolicy="no-referrer"
              className={`object-cover transition-opacity duration-1000 ${bgIndex === index ? "opacity-20" : "opacity-0"}`}
              alt="Nigerian artisans and home repair"
            />
          ))}
          <div className="absolute inset-0 bg-white/75" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 py-12 sm:py-16 text-center">
          <div className="mx-auto mb-6 w-fit border border-green-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-800">
            AI diagnosis. Trusted artisans. Simulated OPay escrow.
          </div>
          <h1 className="mx-auto max-w-5xl text-5xl sm:text-6xl lg:text-[76px] font-semibold leading-[1.05] tracking-normal text-gray-950">
            FixMate
            <span className="block text-green-700">repair help that feels secure.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-gray-650">
            Describe a home or service problem, get Gemini-backed guidance, match with a verified local artisan, and release payment only when the job is complete.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-medium text-gray-700">
            WhatsApp bot mirrors website activities. Registration is only available on the website.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/report" className="bg-green-700 px-6 py-3 text-sm font-bold text-white hover:bg-green-800">
              Find an Artisan Now
            </Link>
            <Link href="/artisan/register" className="border border-gray-900 px-6 py-3 text-sm font-bold text-gray-950 hover:bg-gray-950 hover:text-white">
              Apply as Artisan
            </Link>
          </div>

          <div className="mx-auto mt-12 w-full max-w-4xl">
            <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden border border-gray-200 bg-gray-100 shadow-sm">
              <Image src={activeStep.image} fill className="object-cover" alt={activeStep.title} referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute left-4 right-4 top-4 flex justify-between gap-3 text-left">
                <span className="bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-900">{activeStep.stat}</span>
                <span className="bg-green-700 px-3 py-1 text-xs font-bold text-white">{stepIndex + 1} / {previewSteps.length}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-left text-white">
                <p className="mb-2 w-fit bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-green-800">{activeStep.label}</p>
                <h2 className="text-2xl sm:text-3xl font-bold">{activeStep.title}</h2>
                <p className="mt-2 max-w-xl text-sm sm:text-base text-white/85">{activeStep.text}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button onClick={() => setStepIndex((stepIndex + previewSteps.length - 1) % previewSteps.length)} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:border-gray-900">
                Previous
              </button>
              <div className="flex gap-2">
                {previewSteps.map((step, index) => (
                  <button
                    key={step.key}
                    onClick={() => setStepIndex(index)}
                    aria-label={`Show ${step.label}`}
                    className={`h-2.5 w-8 ${index === stepIndex ? "bg-green-700" : "bg-gray-300"}`}
                  />
                ))}
              </div>
              <button onClick={() => setStepIndex((stepIndex + 1) % previewSteps.length)} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:border-gray-900">
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-gray-200 bg-gray-950 py-3 text-white">
        <div className="marquee-track whitespace-nowrap text-sm font-semibold uppercase tracking-[0.16em]">
          {sponsorText}
        </div>
      </div>

      <section className="bg-gray-50 py-20 px-4 sm:px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-2">
          <div className="text-left">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Built for Nigerian repair workflows.</h2>
            <p className="text-gray-600 mb-6">Gemini helps with triage, but FixMate keeps registration, booking, escrow review, and artisan operations on the website for accountability.</p>
            <div className="grid gap-3 text-sm text-gray-700">
              {["Snap or describe the issue", "Receive AI diagnosis and price guidance", "Match with verified local artisans", "Release simulated OPay escrow after completion"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 border border-gray-200 bg-white p-3">
                  <span className="flex h-7 w-7 items-center justify-center bg-green-100 text-xs font-bold text-green-800">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-8 border border-gray-200 shadow-sm text-left">
            <h3 className="text-xl font-bold mb-2">Are you a skilled artisan?</h3>
            <p className="text-gray-600 mb-6">Apply on the website, build a trust score, manage assigned jobs, and track pending escrow balances.</p>
            <Link href="/artisan/register" className="inline-block bg-black text-white px-6 py-3 text-sm font-bold hover:bg-gray-800">
              Apply as Artisan
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gray-950 py-16 px-4 sm:px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block border border-green-500 bg-green-900/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-green-400 mb-6">
            Judge Demo
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Run the Full Demo Flow</h2>
          <p className="text-gray-400 mb-10 max-w-2xl mx-auto">
            Experience the complete FixMate stack — AI diagnosis, escrow payment, artisan matching, and admin controls — in a single walkthrough.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 text-left">
            {[
              { step: "1", title: "Report Issue", desc: "Describe a fault. Upload a photo. Pick a language. Gemini triages and matches artisans.", href: "/report", color: "border-green-600" },
              { step: "2", title: "Book & Pay", desc: "Select an artisan and fund the OPay escrow. Funds stay locked until job completion.", href: "/booking", color: "border-blue-600" },
              { step: "3", title: "Artisan Hub", desc: "Switch to Artisan role. Accept the job, mark progress, mark completed.", href: "/artisan/dashboard", color: "border-purple-600" },
              { step: "4", title: "Admin Console", desc: "Review trust scores, resolve disputes, inspect the full escrow ledger.", href: "/admin", color: "border-amber-600" },
            ].map(({ step, title, desc, href, color }) => (
              <Link key={step} href={href} className={`border-l-4 ${color} bg-white/5 hover:bg-white/10 p-4 transition-colors`}>
                <div className="text-2xl font-black text-white/30 mb-1">{step}</div>
                <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
                <p className="text-xs text-gray-400">{desc}</p>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/report" className="bg-green-700 px-6 py-3 text-sm font-bold text-white hover:bg-green-600">
              Start Demo →
            </Link>
            <Link href="/opay-simulator" className="border border-blue-500 px-6 py-3 text-sm font-bold text-blue-400 hover:bg-blue-900/30">
              OPay Simulator
            </Link>
            <Link href="/ussd-demo" className="border border-purple-500 px-6 py-3 text-sm font-bold text-purple-400 hover:bg-purple-900/30">
              USSD Demo
            </Link>
            <Link href="/whatsapp-demo" className="border border-green-500 px-6 py-3 text-sm font-bold text-green-400 hover:bg-green-900/30">
              WhatsApp Demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white py-12 px-4 sm:px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-left">
          <div>
            <h4 className="font-bold text-lg mb-4 text-gray-900">FixMate</h4>
            <p className="text-gray-500 text-sm">AI-supported repairs, verified artisans, and simulated OPay escrow for safer local services.</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/report" className="hover:text-green-700 transition">Request an Artisan</Link></li>
              <li><Link href="/artisan/register" className="hover:text-green-700 transition">Become an Artisan</Link></li>
              <li><Link href="/dashboard" className="hover:text-green-700 transition">User Dashboard</Link></li>
              <li><Link href="/artisan/dashboard" className="hover:text-green-700 transition">Artisan Hub</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Legal & Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/privacy" className="hover:text-green-700 transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-green-700 transition">Terms of Service</Link></li>
              <li><Link href="/escrow-guidelines" className="hover:text-green-700 transition">Escrow Guidelines</Link></li>
              <li><Link href="/help" className="hover:text-green-700 transition">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Service model</h4>
            <p className="text-sm text-gray-600">WhatsApp bot mirrors website activities. Registration is only available on the website.</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-gray-100 pt-8 text-sm text-gray-400 text-center">
          &copy; {new Date().getFullYear()} FixMate. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
