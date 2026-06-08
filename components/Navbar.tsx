"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDemoRole, ROLE_META } from "@/lib/demo-auth";
import { DemoRole } from "@/lib/types";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<DemoRole>("user");

  useEffect(() => {
    setRole(getDemoRole());
    const handler = (e: Event) => setRole((e as CustomEvent<DemoRole>).detail);
    window.addEventListener("fixmate-role-changed", handler);
    return () => window.removeEventListener("fixmate-role-changed", handler);
  }, []);

  const close = () => setIsOpen(false);
  const meta = ROLE_META[role];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-8 w-8 items-center justify-center bg-green-700 text-sm font-black text-white">F</span>
            <span className="text-base font-black tracking-tight text-gray-950">FixMate</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 text-[13px] font-semibold text-gray-500 md:flex">
            <Link href="/report"            className="hover:text-gray-950 transition-colors">Report</Link>
            <Link href="/dashboard"         className="hover:text-gray-950 transition-colors">Customer</Link>
            <Link href="/artisan/dashboard" className="hover:text-gray-950 transition-colors">Artisan Hub</Link>
            <Link href="/admin"             className="hover:text-gray-950 transition-colors">Admin</Link>
            <span className="text-gray-200 select-none">|</span>
            <Link href="/opay-simulator"    className="text-blue-600 hover:text-blue-700 transition-colors">OPay Sim</Link>
            <Link href="/ussd-demo"         className="text-purple-600 hover:text-purple-700 transition-colors">USSD</Link>
            <Link href="/whatsapp-demo"     className="text-green-600 hover:text-green-700 transition-colors">WhatsApp</Link>
          </nav>

          {/* Desktop right */}
          <div className="hidden items-center gap-2.5 md:flex">
            <Link
              href={meta.path}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider border transition-colors ${meta.color}`}
            >
              {meta.label} ↗
            </Link>
            <Link
              href="/report"
              className="bg-green-700 px-5 py-2 text-[13px] font-black text-white hover:bg-green-800 transition-colors tracking-wide"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="border border-gray-200 px-3 py-2 text-xs font-black uppercase tracking-wider text-gray-900 md:hidden hover:border-gray-950 transition-colors"
            onClick={() => setIsOpen((o) => !o)}
          >
            {isOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-16 md:hidden overflow-y-auto">
          <nav className="flex flex-col text-sm font-semibold text-gray-800">
            {([
              ["Home",              "/"],
              ["Report Issue",      "/report"],
              ["Customer",          "/dashboard"],
              ["Become an Artisan", "/artisan/register"],
              ["Artisan Hub",       "/artisan/dashboard"],
              ["Admin Console",     "/admin"],
            ] as [string, string][]).map(([label, href]) => (
              <Link key={href} href={href} onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 transition-colors">
                {label}
              </Link>
            ))}

            <p className="px-6 pt-5 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Judge Demo Tools</p>

            {([
              ["OPay Simulator", "/opay-simulator", "text-blue-700"],
              ["USSD Demo",      "/ussd-demo",      "text-purple-700"],
              ["WhatsApp Bot",   "/whatsapp-demo",  "text-green-700"],
            ] as [string, string, string][]).map(([label, href, color]) => (
              <Link key={href} href={href} onClick={close} className={`border-b border-gray-100 px-6 py-4 hover:bg-gray-50 transition-colors ${color}`}>
                {label}
              </Link>
            ))}

            <div className="px-6 py-5">
              <Link href="/report" onClick={close} className="block w-full bg-green-700 text-white text-center py-3.5 text-sm font-black tracking-wide hover:bg-green-800">
                Get Started →
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
