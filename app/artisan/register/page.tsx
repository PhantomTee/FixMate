import Link from 'next/link';
import { Briefcase, CheckSquare, ShieldCheck, ChevronLeft } from 'lucide-react';
import LocationAutocomplete from '@/components/LocationAutocomplete';

export default function ArtisanRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white px-6 py-4 flex items-center border-b shadow-sm mb-4">
        <Link href="/" className="text-gray-500 hover:text-gray-800 mr-4 font-bold flex items-center gap-1">
           <ChevronLeft className="w-5 h-5"/> Back
        </Link>
        <span className="text-xl font-bold text-gray-900 tracking-tight">Artisan Onboarding</span>
      </header>

      <main className="flex-1 flex flex-col items-center py-10 px-6 max-w-lg mx-auto w-full animate-fade-in-up">
        <div className="bg-white p-8 rounded-none shadow-sm border border-gray-200 w-full">
          <div className="relative w-full h-24 flex items-center justify-center mb-6">
            <div className="absolute w-20 h-20 bg-gray-50 rounded-none -z-10"></div>
            <Briefcase className="w-12 h-12 text-gray-800" strokeWidth={1.5} />
            <ShieldCheck className="w-6 h-6 text-green-700 absolute bottom-2 ml-10 bg-white rounded-none p-0.5 border border-gray-100" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">Join FixMate</h2>
          <p className="text-gray-600 mb-6 text-center text-sm">Secure OPay payments and verified leads.</p>
          
          <form action="/artisan/dashboard" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" required className="w-full border border-gray-300 rounded-none p-3 text-gray-800 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all" placeholder="e.g. Chinedu Okafor" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" required className="w-full border border-gray-300 rounded-none p-3 text-gray-800 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all" placeholder="080..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop / Home Address</label>
              <LocationAutocomplete placeholder="e.g. 10 Awolowo Road, Ikoyi" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
              <select required className="w-full border border-gray-300 rounded-none p-3 text-gray-800 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all">
                <option value="">Select Category</option>
                <option value="plumber">Plumber</option>
                <option value="electrician">Electrician</option>
                <option value="ac">AC Technician</option>
                <option value="shoemaker">Shoemaker</option>
                <option value="vulcanizer">Vulcanizer</option>
                <option value="carpenter">Carpenter</option>
                <option value="tailor">Tailor / Seamstress</option>
                <option value="mechanic">Mechanic</option>
                <option value="painter">Painter</option>
                <option value="generator">Generator Repair</option>
              </select>
            </div>

            <div className="pt-4">
              <button type="submit" className="w-full py-4 bg-gray-900 text-white font-bold rounded-none shadow hover:bg-gray-800 transition-colors">
                Apply for Verification
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              10% escrow fee per completed job.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

