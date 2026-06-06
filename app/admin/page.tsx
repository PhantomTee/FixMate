'use client';

import Link from 'next/link';

export default function AdminDashboardPage() {
  let currentUserEmail = ''; // Simulate no user logged in
  const ADMIN_EMAIL = 'shuaibthalhat54@gmail.com';
  const isAdmin = currentUserEmail === ADMIN_EMAIL;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-gray-50">
        <div className="text-center border border-gray-200 bg-white p-8 rounded-none shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6 text-sm">You do not have permission to view the Admin Console.</p>
          <Link href="/" className="px-6 py-2.5 bg-green-700 text-white font-medium hover:bg-green-800 transition-colors inline-block text-sm">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans pb-10">
      <header className="bg-gray-900 px-6 py-4 flex items-center justify-between shadow-sm text-white mb-4">
        <span className="text-xl font-bold tracking-tight flex items-center gap-2">
          🛡️ FixMate Admin Console
        </span>
        <div className="flex gap-4 items-center">
           <Link href="/" className="text-sm font-medium text-gray-300 hover:text-white">
             Exit to App
           </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-8 px-6 max-w-6xl mx-auto w-full gap-6">
        
        {/* Top Metrics Row */}
        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-sm text-gray-500 font-medium">Total Escrow Locked</p>
             <h2 className="text-2xl font-bold text-gray-900 mt-1">₦4,250,000</h2>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-sm text-gray-500 font-medium">Platform Fees (10%)</p>
             <h2 className="text-2xl font-bold text-green-600 mt-1">₦425,000</h2>
             <p className="text-xs text-gray-400 mt-1">All time</p>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-sm text-gray-500 font-medium">Active Disputes</p>
             <h2 className="text-2xl font-bold text-red-600 mt-1">1</h2>
             <p className="text-xs text-red-400 mt-1">Attention Required</p>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-sm text-gray-500 font-medium">Artisan Verifications</p>
             <h2 className="text-2xl font-bold text-yellow-600 mt-1">5</h2>
             <p className="text-xs text-gray-400 mt-1">Pending queue</p>
           </div>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Dispute Resolution Center */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">Active Disputes</h3>
            
            <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50 mb-4 text-sm">
               <div className="bg-red-100 p-3 border-b border-red-200 flex justify-between items-center">
                 <span className="font-bold text-red-900">Job #9923: &quot;AC Repair&quot;</span>
                 <span className="text-red-700 font-medium">₦15,000 Escrow</span>
               </div>
               <div className="p-4">
                 <div className="mb-3">
                   <span className="font-semibold text-gray-900">Customer:</span> Chukwudi Eze <br/>
                   <span className="font-semibold text-gray-900">Artisan:</span> Opeyemi Ahmed
                 </div>
                 <div className="p-3 bg-white rounded border border-gray-200 mb-3">
                   <p className="text-xs font-bold text-blue-800 mb-1">🤖 Gemini Dispute Summary:</p>
                   <p className="text-gray-700 text-xs">
                     The customer originally submitted a photo of a frozen coil (diagnosed as low refrigerant). The artisan claims to have topped up the gas, but the customer reported the issue returned after 2 hours. This suggests a leak that was not patched. 
                     <br/><br/>
                     <span className="font-semibold">Gemini Recommendation:</span> Partial refund to customer (₦10,000) for incomplete repair, pay artisan (₦5,000) for diagnostic/call-out effort.
                   </p>
                 </div>
                 <div className="flex gap-2">
                   <button className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow-sm transition-colors text-xs">Approve Full Refund</button>
                   <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm transition-colors text-xs">Apply Gemini Split (10k/5k)</button>
                   <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded shadow-sm transition-colors text-xs">Release to Artisan</button>
                 </div>
               </div>
            </div>
            
            <p className="text-sm text-gray-500 text-center">No other active disputes.</p>
          </div>

          {/* Artisan Verifications */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">Pending Verifications</h3>
            
            <div className="space-y-3 mt-4">
               <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                 <div>
                   <p className="font-bold text-gray-900 text-sm">Ibrahim Musa</p>
                   <p className="text-xs text-gray-500">Electrician • Gbagada</p>
                   <p className="text-xs font-medium text-blue-600 mt-1 flex items-center gap-1">📄 View uploaded NIN</p>
                 </div>
                 <div className="flex gap-2">
                   <button className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 font-bold text-xs rounded">Verify</button>
                   <button className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded">Reject</button>
                 </div>
               </div>
            </div>
          </div>
          
        </div>

      </main>
    </div>
  );
}
