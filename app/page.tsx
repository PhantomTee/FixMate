'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, BarChart3, BookOpen, Users, Rocket } from 'lucide-react';

const bgImages = [
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486825586573-7131f7991bdd?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1920&auto=format&fit=crop"
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('analyse');
  const [bgIndex, setBgIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  
  const tabs = useMemo(() => ['analyse', 'train', 'testing', 'deploy'], []);
  const heroTexts = useMemo(() => [
    "Find Trusted Artisans.",
    "Hire Expert Plumbers.",
    "Get Reliable Electricians.",
    "Book Local Mechanics.",
    "Find Skilled Carpenters.",
    "Discover Pro Tailors."
  ], []);

  useEffect(() => {
    const tabInterval = setInterval(() => {
      setActiveTab((prev) => {
        const idx = tabs.indexOf(prev);
        return tabs[(idx + 1) % tabs.length];
      });
    }, 4000);
    return () => clearInterval(tabInterval);
  }, [tabs]);

  useEffect(() => {
    const bgInterval = setInterval(() => {
      setBgIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * bgImages.length);
        } while (next === prev);
        return next;
      });
    }, 5000);
    return () => clearInterval(bgInterval);
  }, []);

  useEffect(() => {
    const heroInterval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroTexts.length);
    }, 3500);
    return () => clearInterval(heroInterval);
  }, [heroTexts.length]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative">
      <div className="absolute inset-0 z-0 w-full h-[600px] md:h-[800px] overflow-hidden pointer-events-none">
        {bgImages.map((src, idx) => (
          <Image 
            key={src} 
            src={src} 
            fill
            referrerPolicy="no-referrer"
            className={`object-cover transition-opacity duration-1000 ${bgIndex === idx ? 'opacity-10' : 'opacity-0'}`} 
            alt="Background" 
          />
        ))}
        {/* Gradient overlay to blend into the white bg below and maintain text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/95 to-white"></div>
      </div>

      <main className="flex-1 flex flex-col pt-24 pb-32 px-6 max-w-7xl mx-auto w-full text-center relative z-10">
        
        {/* Reviews Badge */}
        <div 
          className="inline-flex items-center gap-2 mb-8 animate-fade-in-up" 
          style={{ opacity: 0, animationDelay: '0.2s' }}
        >
          <div className="w-6 h-6 border border-gray-300 rounded-none flex items-center justify-center bg-gray-50">
            <Star className="w-3.5 h-3.5 fill-green-700 text-green-700" />
          </div>
          <span className="text-sm font-medium text-black">4.7 rating by 233 users</span>
        </div>

        {/* Main Heading */}
        <h1 
          className="text-6xl md:text-7xl lg:text-[80px] font-normal leading-[1.1] tracking-tight mb-5 animate-fade-in-up"
          style={{ opacity: 0, animationDelay: '0.3s' }}
        >
          <span className="inline-block transition-all duration-500 ease-in-out min-h-[1.1em]">
            {heroTexts[heroIndex]}
          </span><br />
          <span className="bg-gradient-to-r from-green-800 via-green-600 to-green-500 bg-clip-text text-transparent">Secured by AI & OPay.</span>
        </h1>

        {/* Subheading */}
        <p 
          className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in-up"
          style={{ opacity: 0, animationDelay: '0.4s' }}
        >
          Post your task, match with verified local artisans around you, and pay securely via OPay Escrow only when the job is done right.
        </p>

        {/* CTA Button */}
        <div className="animate-fade-in-up mb-12" style={{ opacity: 0, animationDelay: '0.5s' }}>
          <Link 
            href="/report" 
            className="inline-block bg-green-700 text-white px-8 py-3 rounded-none text-base font-medium hover:bg-green-800 transition-colors shadow-sm"
          >
            Find an Artisan Now
          </Link>
        </div>

        {/* Tab Bar */}
        <div className="flex justify-center mb-8 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.6s' }}>
          <div className="bg-gray-100 rounded-none p-1 inline-flex w-full md:w-auto">
            {/* Mobile View */}
            <div className="grid grid-cols-2 gap-1 w-full md:hidden">
              <button onClick={() => setActiveTab('analyse')} className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'analyse' ? 'bg-white text-black shadow-sm' : 'text-gray-600'}`}>
                <BarChart3 className="w-4 h-4" /> Diagnose
              </button>
              <button onClick={() => setActiveTab('train')} className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'train' ? 'bg-white text-black shadow-sm' : 'text-gray-600'}`}>
                <BookOpen className="w-4 h-4" /> Estimate
              </button>
              <button onClick={() => setActiveTab('testing')} className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'testing' ? 'bg-white text-black shadow-sm' : 'text-gray-600'}`}>
                <Users className="w-4 h-4" /> Match
              </button>
              <button onClick={() => setActiveTab('deploy')} className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'deploy' ? 'bg-white text-black shadow-sm' : 'text-gray-600'}`}>
                <Rocket className="w-4 h-4" /> Resolve
              </button>
            </div>
            {/* Desktop View */}
            <div className="hidden md:flex items-center w-auto">
              <button onClick={() => setActiveTab('analyse')} className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-colors ${activeTab === 'analyse' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <BarChart3 className="w-4 h-4" /> Diagnose Issue
              </button>
              <div className="w-px h-5 bg-gray-300 mx-1"></div>
              <button onClick={() => setActiveTab('train')} className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-colors ${activeTab === 'train' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <BookOpen className="w-4 h-4" /> Pricing Guidance
              </button>
              <div className="w-px h-5 bg-gray-300 mx-1"></div>
              <button onClick={() => setActiveTab('testing')} className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-colors ${activeTab === 'testing' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <Users className="w-4 h-4" /> Secure Artisan
              </button>
              <div className="w-px h-5 bg-gray-300 mx-1"></div>
              <button onClick={() => setActiveTab('deploy')} className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-colors ${activeTab === 'deploy' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <Rocket className="w-4 h-4" /> Release Escrow
              </button>
            </div>
          </div>
        </div>

        {/* Visualization & Overlays */}
        <div className="relative w-full max-w-5xl mx-auto rounded-none overflow-hidden h-[400px] md:h-[500px] bg-gray-50 border border-gray-200 animate-fade-in-up shadow-sm flex items-center justify-center" style={{ opacity: 0, animationDelay: '0.7s' }}>
          
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

          {/* Analyse / Diagnose Overlay */}
          {activeTab === 'analyse' && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/40 animate-fade-in-overlay flex-col">
               <div className="bg-white p-6 rounded-none shadow-2xl max-w-sm w-full mx-4 absolute top-1/2 left-1/2 animate-slide-up-overlay text-left">
                  <h3 className="text-gray-900 font-semibold mb-2">Analyzing Visual Faults</h3>
                  <div className="w-full bg-gray-100 h-2 mb-4">
                    <div className="bg-green-600 h-2" style={{width: '65%'}}></div>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-none"></div> Leak detected</li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-none"></div> Pipe identified</li>
                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-gray-300 rounded-none"></div> Generating summary...</li>
                  </ul>
               </div>
             </div>
          )}

          {/* Train / Price Overlay */}
          {activeTab === 'train' && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/40 animate-fade-in-overlay flex-col">
               <div className="bg-white p-6 rounded-none shadow-2xl max-w-sm w-full mx-4 absolute top-1/2 left-1/2 animate-slide-up-overlay text-left">
                  <h3 className="text-gray-900 font-semibold mb-4 border-b pb-2">Estimated Job Cost</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-xs text-gray-500">Materials</p>
                       <p className="font-bold text-gray-900">₦12,500</p>
                     </div>
                     <div>
                       <p className="text-xs text-gray-500">Labor Fee</p>
                       <p className="font-bold text-gray-900">₦5,000</p>
                     </div>
                     <div>
                       <p className="text-xs text-gray-500">Urgency</p>
                       <p className="font-bold text-orange-600">High</p>
                     </div>
                     <div>
                       <p className="text-xs text-gray-500">Total Est.</p>
                       <p className="font-bold text-green-700">₦17,500</p>
                     </div>
                  </div>
               </div>
             </div>
          )}

          {/* Testing / Match Overlay */}
          {activeTab === 'testing' && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/40 animate-fade-in-overlay flex-col">
               <div className="bg-white p-6 rounded-none shadow-2xl max-w-sm w-full mx-4 absolute top-1/2 left-1/2 animate-slide-up-overlay text-left">
                  <h3 className="text-gray-900 font-semibold mb-3">Matching Verified Artisans</h3>
                  <div className="p-3 bg-green-50 border border-green-100 flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm text-gray-900">Opeyemi A.</p>
                      <p className="text-xs text-gray-500">AC Repair • 2km away</p>
                    </div>
                    <span className="text-xs bg-green-600 text-white px-2 py-1">Matched</span>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-gray-900">Chinedu O.</p>
                      <p className="text-xs text-gray-500">AC Repair • 4km away</p>
                    </div>
                    <span className="text-xs text-gray-500 px-2 py-1">Standby</span>
                  </div>
               </div>
             </div>
          )}

          {/* Deploy / Escrow Overlay */}
          {activeTab === 'deploy' && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/40 animate-fade-in-overlay flex-col">
               <div className="bg-white p-6 rounded-none shadow-2xl max-w-sm w-full mx-4 absolute top-1/2 left-1/2 animate-slide-up-overlay text-center">
                  <h3 className="text-gray-900 font-semibold mb-4 text-center">OPay Escrow Ready</h3>
                  <ul className="text-sm text-gray-600 mb-5 space-y-2 flex flex-col items-center">
                    <li className="flex items-center gap-2 justify-center w-full"><div className="w-4 h-4 bg-green-100 flex items-center justify-center text-green-700 text-[10px]">✓</div> Funds Verified</li>
                    <li className="flex items-center gap-2 justify-center w-full"><div className="w-4 h-4 bg-green-100 flex items-center justify-center text-green-700 text-[10px]">✓</div> Artisan Accepted</li>
                    <li className="flex items-center gap-2 justify-center w-full"><div className="w-4 h-4 bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]">○</div> Job Completed</li>
                  </ul>
                  <button className="w-full py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors">
                    Lock Funds in Escrow
                  </button>
               </div>
             </div>
          )}
        </div>

        {/* Company Logos */}
        <div className="mt-24 pt-10 border-t border-gray-100 animate-fade-in-up flex flex-wrap justify-center items-center gap-12 md:gap-24 grayscale opacity-60" style={{ opacity: 0, animationDelay: '0.8s' }}>
           <span className="text-2xl font-bold tracking-tight text-gray-800">OPay</span>
           <span className="text-2xl font-semibold tracking-tighter text-gray-800 flex items-center gap-1">
             Google
           </span>
           <span className="text-2xl font-medium tracking-wide text-gray-800 flex items-center gap-1">
             Gemini ✨
           </span>
        </div>

      </main>

      {/* Info Section */}
      <section className="bg-gray-50 py-24 px-6 border-t border-gray-200 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12">
          <div className="flex-1 text-left">
             <h2 className="text-3xl font-bold mb-4 text-gray-900">Fix matters quickly, with confidence.</h2>
             <p className="text-gray-600 mb-6">Our AI analyzes your fault, matches you with the best artisans, and uses OPay Escrow to ensure you only pay when the job is fully completed.</p>
             <ul className="space-y-4 text-gray-700 mb-8">
               <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-none bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">1</span> Snap a photo or video</li>
               <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-none bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">2</span> AI diagnostics & fair pricing</li>
               <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-none bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">3</span> Real-time vetted matching</li>
               <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-none bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">4</span> Funds secured in OPay Escrow</li>
             </ul>
          </div>
          <div className="flex-1 bg-white p-8 border border-gray-200 shadow-sm flex flex-col justify-center text-left">
            <h3 className="text-xl font-bold mb-2">Are you a skilled artisan?</h3>
            <p className="text-gray-600 mb-6">Join our network of elite professionals. Get consistent jobs, guaranteed payments through OPay, and build your reputation.</p>
            <div>
              <Link href="/artisan/register" className="inline-block bg-black text-white px-6 py-3 rounded-none text-sm font-medium hover:bg-gray-800 transition-colors text-center">
                Apply as Artisan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 px-6 border-t border-gray-200 z-10 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-left">
          <div>
            <h4 className="font-bold text-lg mb-4 text-gray-900">FixMate</h4>
            <p className="text-gray-500 text-sm">Empowering home repairs with AI diagnosis and secure OPay Escrow.</p>
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
              <li><Link href="#" className="hover:text-green-700 transition">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-green-700 transition">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-green-700 transition">Escrow Guidelines</Link></li>
              <li><Link href="#" className="hover:text-green-700 transition">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>support@fixmate.io</li>
              <li>Lagos, Nigeria</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-gray-100 pt-8 text-sm text-gray-400 text-center">
          &copy; {new Date().getFullYear()} FixMate. All rights reserved. Secured by OPay and Google Gemini.
        </div>
      </footer>
    </div>
  );
}

