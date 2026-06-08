"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Browse Artisans", href: "/browse" },
  { label: "Post a Job",      href: "/report" },
  { label: "How it Works",   href: "/#how-it-works" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setIsOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-8 w-8 items-center justify-center bg-green-700 text-sm font-black text-white rounded-lg">H</span>
            <span className="text-base font-black tracking-tight text-gray-950">Handijob</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 text-[13px] font-semibold text-gray-500 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`hover:text-gray-950 transition-colors ${pathname === l.href ? "text-gray-950" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden items-center gap-2.5 md:flex">
            <Link href="/dashboard" className="px-4 py-2 text-sm font-black text-gray-700 hover:text-gray-950 transition-colors">
              Sign In
            </Link>
            <Link href="/artisan/register" className="bg-green-700 px-5 py-2 text-sm font-black text-white hover:bg-green-800 transition-colors rounded-lg">
              Offer Your Skills
            </Link>
            <Link href="/report" className="bg-gray-950 px-5 py-2 text-sm font-black text-white hover:bg-gray-800 transition-colors rounded-lg">
              Hire an Artisan
            </Link>
          </div>

          {/* Mobile menu button — hamburger */}
          <button
            className="p-2 text-gray-900 hover:bg-gray-50 rounded-lg md:hidden transition-colors"
            onClick={() => setIsOpen((o) => !o)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-16 md:hidden overflow-y-auto">
          <nav className="flex flex-col text-sm font-semibold text-gray-800">
            <Link href="/"            onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Home</Link>
            <Link href="/browse"      onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Browse Artisans</Link>
            <Link href="/report"      onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Post a Job</Link>
            <Link href="/dashboard"   onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">My Dashboard</Link>
            <Link href="/artisan/dashboard" onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Artisan Hub</Link>
            <Link href="/artisan/register"  onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Become an Artisan</Link>
            <div className="px-6 py-5 space-y-3">
              <Link href="/report" onClick={close} className="block w-full bg-green-700 text-white text-center py-3.5 text-sm font-black hover:bg-green-800 rounded-xl">
                Hire an Artisan →
              </Link>
              <Link href="/artisan/register" onClick={close} className="block w-full border border-gray-950 text-gray-950 text-center py-3.5 text-sm font-black hover:bg-gray-50 rounded-xl">
                Offer Your Skills
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
