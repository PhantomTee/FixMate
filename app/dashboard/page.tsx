import Link from 'next/link';
import JobChat from '@/components/JobChat';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b shadow-sm mb-4">
        <span className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center font-bold text-white text-xl">
            F
          </div>
          FixMate Dashboard
        </span>
        <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
           Logout
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center py-8 px-6 max-w-4xl mx-auto w-full">
        
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 flex justify-between items-center">
           <div>
             <p className="text-gray-500 text-sm font-medium">Hello, Chukwudi Eze</p>
             <h1 className="text-2xl font-bold text-gray-900">Your Activity</h1>
           </div>
           <Link href="/report" className="px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl shadow hover:bg-green-700 transition-all">
             New Job Request
           </Link>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:col-span-2">
             <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span> Active Job
             </h2>
             <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 mb-2">
               <div className="flex justify-between items-start mb-2">
                 <div>
                   <h4 className="font-bold text-gray-900">AC Dripping Water + Warm Air</h4>
                   <p className="text-sm text-gray-500 mt-1">Artisan: Opeyemi Ahmed</p>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-gray-900 text-lg">₦15,000</span>
                   <p className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-0.5 rounded mt-1">Escrow Hosted</p>
                 </div>
               </div>
               
               <JobChat jobId="job-123" currentUserType="user" />
             </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
               <span>🧾</span> Recent Jobs
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 last:border-0 last:pb-0 opacity-60">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Leaking Kitchen Pipe</p>
                  <p className="text-xs text-gray-500 font-medium">Completed • Chinedu Okafor</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm">₦8,500</p>
                  <p className="text-xs text-gray-500">Yesterday</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
               <span>💳</span> OPay Wallet
            </h2>
            
            <div className="bg-gray-900 text-white p-5 rounded-xl shadow-inner mb-4 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -m-10"></div>
               <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Available Balance</p>
               <h3 className="text-3xl font-bold font-mono tracking-tight">₦34,700</h3>
               <div className="mt-4 flex justify-between items-center">
                 <span className="text-xs bg-white/20 px-2 py-1 rounded">Chukwudi Eze</span>
                 <span className="text-xs font-medium text-green-400 font-mono">OPay Escrow Protected</span>
               </div>
            </div>
            
            <button className="w-full py-3 bg-gray-100 text-gray-800 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors">
              Fund Wallet
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
