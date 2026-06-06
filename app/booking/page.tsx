'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFixMateStore } from '@/lib/store';
import Image from 'next/image';
import { Wallet, Shield, CheckCircle, ChevronLeft } from 'lucide-react';

export default function BookingPage() {
  const router = useRouter();
  const artisan = useFixMateStore((s) => s.selectedArtisan);
  const diagnosis = useFixMateStore((s) => s.diagnosis);
  const userBalance = useFixMateStore((s) => s.userBalance);
  const escrowStatus = useFixMateStore((s) => s.escrowStatus);
  const setEscrowStatus = useFixMateStore((s) => s.setEscrowStatus);
  const deductBalance = useFixMateStore((s) => s.deductBalance);
  
  const [isFunding, setIsFunding] = useState(false);
  
  useEffect(() => {
    if (!artisan && escrowStatus === 'IDLE') {
      router.push('/report');
    }
  }, [artisan, router, escrowStatus]);

  if (!artisan) return null;

  const extractCost = (estimate: string) => {
    if (!estimate) return 15000;
    const nums = estimate.match(/\d+/g);
    if (!nums || nums.length === 0) return 15000;
    return parseInt(nums[0].replace(/,/g, ''));
  };

  const jobCost = diagnosis?.estimated_cost_naira ? extractCost(diagnosis.estimated_cost_naira) : 15000;

  const handleFundEscrow = () => {
    setIsFunding(true);
    setTimeout(() => {
      deductBalance(jobCost);
      setEscrowStatus('FUNDED');
      setIsFunding(false);
    }, 1500);
  };

  const handleFinishJob = () => {
    setEscrowStatus('RELEASED');
    setTimeout(() => {
       alert("Job Completed! Funds have been released to the artisan.");
       router.push('/dashboard');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans mb-20 animate-fade-in-up">
      <header className="bg-white px-6 py-4 flex items-center border-b shadow-sm mb-4">
        <Link href="/report" className="text-gray-500 hover:text-gray-800 mr-4 font-bold flex items-center gap-1">
           <ChevronLeft className="w-5 h-5"/> Back
        </Link>
        <span className="text-xl font-bold text-gray-900 tracking-tight">Book Escrow</span>
      </header>

      <main className="flex-1 flex flex-col items-center py-8 px-6 max-w-xl mx-auto w-full">
        
        <div className="bg-white p-6 rounded-none shadow-sm border border-gray-200 w-full mb-6 relative overflow-hidden">
           {escrowStatus === 'IDLE' && <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 z-0"></div>}
           <div className="flex items-center gap-4 mb-4 relative z-10">
              <Image unoptimized src={artisan.avatar} alt="Avatar" width={64} height={64} className="rounded-none border border-gray-200" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{artisan.name}</h2>
                <p className="text-gray-500 text-sm">
                  {artisan.category} • Trust: {artisan.score}%
                </p>
              </div>
           </div>
           
           <div className="bg-gray-50 rounded-none p-4 border border-gray-100 mb-2 relative z-10">
             <div className="flex justify-between items-center mb-2">
               <span className="text-gray-600 text-sm">Issue</span>
               <span className="font-semibold text-gray-900 text-sm text-right max-w-[200px] truncate">{diagnosis?.issue_title || 'General Repair'}</span>
             </div>
             <div className="flex justify-between items-center mb-2">
               <span className="text-gray-600 text-sm">Estimated Cost</span>
               <span className="font-semibold text-gray-900 text-sm">₦{jobCost.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-gray-600 text-sm">OPay Escrow Fee (2%)</span>
               <span className="font-semibold text-gray-900 text-sm">₦{(jobCost * 0.02).toLocaleString()}</span>
             </div>
           </div>
           <div className="flex justify-between items-center px-4 py-2 bg-green-50 text-green-900 font-bold rounded-none border border-green-100 relative z-10">
             <span>Total</span>
             <span>₦{(jobCost * 1.02).toLocaleString()}</span>
           </div>
        </div>

        <div className="w-full">
           <h3 className="text-lg font-bold text-gray-900 mb-3 px-1">Payment & Security</h3>
           
           <div className="bg-white p-6 rounded-none shadow-sm border border-gray-200">
             
             {escrowStatus === 'IDLE' && (
               <div className="animate-fade-in-overlay duration-300">
                 <div className="relative w-full h-24 flex items-center justify-center mb-6">
                   <div className="absolute w-20 h-20 bg-green-50 rounded-none -z-10"></div>
                   <Wallet className="w-10 h-10 text-gray-800" strokeWidth={1.5} />
                   <Shield className="w-6 h-6 text-green-700 absolute bottom-2 ml-10 bg-white rounded-none p-0.5 border border-gray-100" strokeWidth={1.5} />
                 </div>

                 <div className="flex items-center gap-3 mb-6 bg-green-50 p-3 rounded-none border border-green-100">
                   <Shield className="w-6 h-6 text-green-700" />
                   <div>
                     <p className="text-sm font-semibold text-green-900">OPay Escrow Protection</p>
                     <p className="text-xs text-green-700 mt-0.5">We hold the money safely until job completion.</p>
                   </div>
                 </div>

                 <div className="flex justify-between items-center mb-6 px-1">
                   <span className="text-gray-600 text-sm">Your Wallet Balance:</span>
                   <span className="font-bold text-gray-900">₦{userBalance.toLocaleString()}</span>
                 </div>

                 <button 
                    onClick={handleFundEscrow}
                    disabled={isFunding || userBalance < jobCost * 1.02}
                    className="w-full py-4 bg-green-700 text-white font-bold text-lg rounded-none shadow hover:bg-green-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                 >
                    {isFunding ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-none animate-spin"></span>
                    ) : (
                      "Fund Escrow & Dispatch"
                    )}
                 </button>
               </div>
             )}

             {escrowStatus === 'FUNDED' && (
               <div className="animate-fade-in-up duration-500 text-center py-4">
                 <div className="w-20 h-20 bg-gray-50 text-green-700 rounded-none flex items-center justify-center mx-auto mb-4 border-2 border-green-600">
                    <Shield className="w-10 h-10" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Funds Secured</h3>
                 <p className="text-gray-600 text-sm mb-8">
                   ₦{(jobCost * 1.02).toLocaleString()} locked. Artisan is en route.
                 </p>
                 
                 <div className="border border-gray-200 rounded-none p-4 bg-gray-50 mb-8 max-w-sm mx-auto text-left flex items-start gap-3">
                   <CheckCircle className="w-6 h-6 text-green-700 mt-1 shrink-0" />
                   <div>
                     <p className="font-semibold text-gray-900 text-sm">Work in Progress</p>
                     <p className="text-xs text-gray-500">Only release the funds when the job is done.</p>
                   </div>
                 </div>

                 <button 
                    onClick={handleFinishJob}
                    className="w-full py-4 bg-gray-900 text-white font-bold text-lg rounded-none shadow hover:bg-gray-800 transition-colors flex justify-center items-center"
                 >
                    Release Funds
                 </button>
                 
                 <button className="w-full mt-3 py-3 text-red-600 font-semibold text-sm hover:bg-red-50 rounded-none transition-colors border border-transparent hover:border-red-100">
                    Open Dispute
                 </button>
               </div>
             )}

           </div>
        </div>

      </main>
    </div>
  );
}

