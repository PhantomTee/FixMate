import Link from 'next/link';
import JobChat from '@/components/JobChat';

export default function ArtisanDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b shadow-sm mb-4">
        <span className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center font-bold text-white text-xl">
            🛠️
          </div>
          FixMate Artisan
        </span>
        <div className="flex gap-4 items-center">
           <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">Verified</span>
           <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
             Logout
           </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-8 px-6 max-w-5xl mx-auto w-full gap-6">
        
        {/* Top Metrics Row */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
             <p className="text-sm text-gray-500 font-medium mb-1">Available OPay Balance</p>
             <h2 className="text-3xl font-bold text-gray-900">₦142,500</h2>
             <p className="text-xs text-green-600 mt-2 font-medium">+₦13,500 safely released today</p>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
             <p className="text-sm text-gray-500 font-medium mb-1">Pending in Escrow</p>
             <h2 className="text-3xl font-bold text-gray-900">₦25,000</h2>
             <p className="text-xs text-gray-500 mt-2 font-medium">From 2 active jobs</p>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
             <p className="text-sm text-gray-500 font-medium mb-1">Trust Score</p>
             <div className="flex items-end gap-2">
               <h2 className="text-3xl font-bold text-green-600">92%</h2>
               <span className="text-sm text-gray-500 pb-1">Excellent</span>
             </div>
             <p className="text-xs text-green-600 mt-2 font-medium">High visibility ranking</p>
           </div>
        </div>

        {/* Main Content Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Jobs */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg text-gray-900">Active Job Requests</h3>
                 <span className="text-sm text-green-600 font-bold bg-green-50 px-2 py-1 rounded">1 In Progress, 1 New</span>
               </div>
               
               <div className="space-y-6">
                 {/* Job 1 In Progress */}
                 <div className="border border-green-200 rounded-xl p-4 bg-green-50/30">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <h4 className="font-bold text-gray-900">AC Dripping Water + Warm Air</h4>
                         <p className="text-xs text-gray-600 mt-1">Customer: Chukwudi Eze • 📍 Surulere</p>
                       </div>
                       <div className="text-right">
                         <span className="font-bold text-gray-900">₦15,000</span>
                         <p className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-0.5 rounded mt-1">Escrow Hosted</p>
                       </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mt-3 mb-4">
                       <p className="text-xs font-semibold text-blue-900 mb-1">🤖 Gemini Assessor Note:</p>
                       <p className="text-xs text-blue-800">Customer uploaded a photo showing blocked drainage and frozen coils. High probability of low refrigerant.</p>
                    </div>
                    <JobChat jobId="job-123" currentUserType="artisan" />
                    <div className="mt-4">
                       <button className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition">Mark as Completed</button>
                    </div>
                 </div>

                 {/* Job 2 New */}
                 <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <h4 className="font-bold text-gray-900">Generator Won&apos;t Start</h4>
                         <p className="text-xs text-gray-500 mt-1">📍 Yaba • 3km away</p>
                       </div>
                       <div className="text-right">
                         <span className="font-bold text-gray-900">₦10,000</span>
                         <p className="text-xs text-gray-500 font-semibold bg-gray-200 px-2 py-0.5 rounded mt-1">Awaiting Accept</p>
                       </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                       <button className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-gray-800">Accept & Navigate</button>
                       <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold">Decline</button>
                    </div>
                 </div>
               </div>
             </div>

             {/* SME Sales Log */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-lg text-gray-900 mb-4">Recent Completed Jobs</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-gray-200 text-sm text-gray-500">
                       <th className="pb-2 font-medium">Customer</th>
                       <th className="pb-2 font-medium">Service</th>
                       <th className="pb-2 font-medium">Date</th>
                       <th className="pb-2 font-medium text-right">Net Payout</th>
                     </tr>
                   </thead>
                   <tbody className="text-sm">
                     <tr className="border-b border-gray-100 last:border-0">
                       <td className="py-3 font-medium text-gray-900">Chukwudi Eze</td>
                       <td className="py-3 text-gray-600">Generator Servicing</td>
                       <td className="py-3 text-gray-500">Today</td>
                       <td className="py-3 text-right font-bold text-green-600">₦18,000</td>
                     </tr>
                     <tr className="border-b border-gray-100 last:border-0">
                       <td className="py-3 font-medium text-gray-900">Amaka Obi</td>
                       <td className="py-3 text-gray-600">Pipe Fitting</td>
                       <td className="py-3 text-gray-500">Yesterday</td>
                       <td className="py-3 text-right font-bold text-green-600">₦8,500</td>
                     </tr>
                   </tbody>
                 </table>
               </div>
             </div>
          </div>

          {/* Right Sidebar - Inventory Tools */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                 📦 Inventory Tracker
               </h3>
               <p className="text-xs text-gray-500 mb-4">Track materials needed for your jobs so you never run out unexpectedly.</p>
               
               <div className="space-y-3">
                 <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg">
                   <div>
                     <p className="font-semibold text-gray-900 text-sm">R22 AC Gas</p>
                     <p className="text-xs text-red-500 font-medium">Low Stock</p>
                   </div>
                   <span className="font-bold text-gray-900">1 Cylinder</span>
                 </div>
                 <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg">
                   <div>
                     <p className="font-semibold text-gray-900 text-sm">Copper Pipes (1/4&quot;)</p>
                     <p className="text-xs text-green-600 font-medium">Healthy</p>
                   </div>
                   <span className="font-bold text-gray-900">12 Meters</span>
                 </div>
                 <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg">
                   <div>
                     <p className="font-semibold text-gray-900 text-sm">Sealant Tape</p>
                     <p className="text-xs text-green-600 font-medium">Healthy</p>
                   </div>
                   <span className="font-bold text-gray-900">15 Rolls</span>
                 </div>
               </div>
               
               <button className="w-full mt-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-lg transition-colors">
                 + Log New Material
               </button>
            </div>

            {/* OPay Loan Teaser */}
            <div className="bg-gradient-to-br from-green-500 to-green-700 p-6 rounded-2xl shadow-md text-white">
               <h3 className="font-bold text-lg mb-2">Grow your business</h3>
               <p className="text-sm opacity-90 mb-4">Based on your Trust Score and Escrow history, you are pre-approved for an OPay working capital loan up to ₦100,000.</p>
               <button className="w-full py-3 bg-white text-green-700 text-sm font-bold rounded-lg shadow hover:bg-green-50 transition-colors">
                 Apply Now
               </button>
            </div>
          </div>
          
        </div>

      </main>
    </div>
  );
}
