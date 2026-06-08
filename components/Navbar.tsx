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
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center bg-green-700 text-sm font-black text-white">F</span>
            <span className="text-lg font-semibold tracking-normal text-gray-950 whitespace-nowrap">FixMate</span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-medium text-gray-700 md:flex">
            <Link href="/report" className="hover:text-black">Report Issue</Link>
            <Link href="/dashboard" className="hover:text-black">Customer</Link>
            <Link href="/artisan/dashboard" className="hover:text-black">Artisan Hub</Link>
            <Link href="/admin" className="hover:text-black">Admin</Link>
            <span className="text-gray-200">|</span>
            <Link href="/opay-simulator" className="hover:text-black text-blue-700">OPay Sim</Link>
            <Link href="/ussd-demo" className="hover:text-black text-purple-700">USSD</Link>
            <Link href="/whatsapp-demo" className="hover:text-black text-green-700">WhatsApp</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href={meta.path}
              className={`px-3 py-1 text-xs font-bold border ${meta.color}`}
            >
              {meta.label} ↗
            </Link>
            <Link href="/report" className="bg-green-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-800">
              Get Started
            </Link>
          </div>

          <button
            className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 md:hidden"
            onClick={() => setIsOpen((o) => !o)}
          >
            {isOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-20 md:hidden overflow-y-auto">
          <nav className="flex flex-col text-base font-medium text-gray-800">
            <Link href="/"                  onClick={close} className="border-b border-gray-100 px-6 py-4">Home</Link>
            <Link href="/report"            onClick={close} className="border-b border-gray-100 px-6 py-4">Report Issue</Link>
            <Link href="/dashboard"         onClick={close} className="border-b border-gray-100 px-6 py-4">Customer Dashboard</Link>
            <Link href="/artisan/register"  onClick={close} className="border-b border-gray-100 px-6 py-4">Become an Artisan</Link>
            <Link href="/artisan/dashboard" onClick={close} className="border-b border-gray-100 px-6 py-4">Artisan Hub</Link>
            <Link href="/admin"             onClick={close} className="border-b border-gray-100 px-6 py-4">Admin Console</Link>
            <div className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-gray-400">Judge Demo Tools</div>
            <Link href="/opay-simulator"    onClick={close} className="border-b border-gray-100 px-6 py-4 text-blue-700">OPay Simulator</Link>
            <Link href="/ussd-demo"         onClick={close} className="border-b border-gray-100 px-6 py-4 text-purple-700">USSD Demo</Link>
            <Link href="/whatsapp-demo"     onClick={close} className="border-b border-gray-100 px-6 py-4 text-green-700">WhatsApp Demo</Link>
          </nav>
        </div>
      )}
    </>
  );
}
