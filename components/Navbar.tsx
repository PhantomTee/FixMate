'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Star, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Simulated Auth for Admin Access
  let currentUserEmail = ''; // In a real app, this would come from useSession() or Auth context
  const ADMIN_EMAIL = 'shuaibthalhat54@gmail.com';
  const isAdmin = currentUserEmail === ADMIN_EMAIL;

  const toggle = () => setIsOpen(!isOpen);

  return (
    <>
      <header className="bg-white px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <Star className="w-5 h-5 fill-black text-black" />
          <span className="text-lg font-semibold text-gray-900 tracking-tight whitespace-nowrap">FixMate.ai</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          <button className="flex items-center gap-1 hover:text-black transition-colors">
            Solutions <ChevronDown className="w-4 h-4" />
          </button>
          <Link href="/explore" className="hover:text-black transition-colors">
            Find Artisans
          </Link>
          <button className="flex items-center gap-1 hover:text-black transition-colors">
            For Artisans <ChevronDown className="w-4 h-4" />
          </button>
          <Link href="/dashboard" className="hover:text-black transition-colors">
            Wallet
          </Link>
          <Link href="/report" className="hover:text-black transition-colors">
            Request an Artisan
          </Link>
        </nav>

        {/* Right Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/artisan/dashboard" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
            Login
          </Link>
          <Link href="/report" className="bg-green-700 text-white px-5 py-2.5 rounded-none text-sm font-medium hover:bg-green-800 transition-colors">
            Get started free
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-gray-800" onClick={toggle} aria-label="Toggle Navigation">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Nav Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-20 flex flex-col h-screen overflow-y-auto w-full">
          <nav className="flex flex-col text-lg font-medium text-gray-800">
            <Link href="/" onClick={toggle} className="py-4 px-6 border-b border-gray-100 block transition-colors hover:bg-gray-50 hover:text-green-600">Home</Link>
            <Link href="/explore" onClick={toggle} className="py-4 px-6 border-b border-gray-100 block transition-colors hover:bg-gray-50 hover:text-green-600">Find Artisans</Link>
            <Link href="/report" onClick={toggle} className="py-4 px-6 border-b border-gray-100 block transition-colors hover:bg-gray-50 hover:text-green-600">Request an Artisan</Link>
            <Link href="/dashboard" onClick={toggle} className="py-4 px-6 border-b border-gray-100 block transition-colors hover:bg-gray-50 hover:text-green-600">User Wallet</Link>
            <Link href="/artisan/dashboard" onClick={toggle} className="py-4 px-6 border-b border-gray-100 block transition-colors hover:bg-gray-50 hover:text-green-600">Artisan Hub</Link>
            {isAdmin && (
              <Link href="/admin" onClick={toggle} className="py-4 px-6 border-b border-gray-100 block transition-colors hover:bg-gray-50 hover:text-green-600">Admin Console</Link>
            )}
            <Link href="/artisan/register" onClick={toggle} className="py-4 px-6 border-b border-gray-100 block text-green-700 hover:bg-green-50 transition-colors">Register as Artisan</Link>
          </nav>
        </div>
      )}
    </>
  );
}
