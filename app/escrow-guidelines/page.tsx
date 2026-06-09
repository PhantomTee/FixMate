import Link from "next/link";

const STEPS = [
  { n: "01", title: "Client pays into escrow", body: "When you confirm a booking, your payment is charged via Paystack and held securely in escrow. The artisan cannot access these funds until the job is confirmed complete." },
  { n: "02", title: "Artisan accepts and starts work", body: "The artisan accepts the job, arrives at your location, and begins work. You can track status in real time from your dashboard." },
  { n: "03", title: "Artisan marks job complete", body: "When the work is done, the artisan marks the job as complete. You receive a notification to review and confirm." },
  { n: "04", title: "Client confirms or disputes", body: "If you are satisfied, release the payment. If there's an issue, open a dispute. You have 48 hours to act before the escrow auto-releases." },
  { n: "05", title: "Artisan receives payment", body: "On release, the artisan's fee (minus 10% commission) lands in their Handijob wallet. They can request a payout at any time." },
];

const FEES = [
  { who: "Client", fee: "2% service fee", note: "Added on top of the quoted job amount" },
  { who: "Artisan", fee: "10% commission", note: "Deducted from the released payment — nothing upfront" },
  { who: "Platform", fee: "Remainder", note: "Used to maintain the platform and fund dispute resolution" },
];

export default function EscrowGuidelinesPage() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-[clamp(1.8rem,5vw,3rem)] font-black text-gray-950 tracking-tight mb-2">Escrow Guidelines</h1>
          <p className="text-gray-500">How your money is protected from booking to completion.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <div key={s.n} className={`flex gap-5 p-5 border ${i === 2 ? "border-green-200 bg-green-50 rounded-2xl" : "border-gray-200 rounded-xl"}`}>
              <span className={`text-3xl font-black shrink-0 ${i === 2 ? "text-green-200" : "text-gray-100"}`}>{s.n}</span>
              <div>
                <h3 className="font-black text-gray-950 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Fee table */}
        <div>
          <h2 className="font-black text-gray-950 mb-4">Fee structure</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 px-5 py-3 border-b border-gray-200">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Who</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fee</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">When</span>
            </div>
            {FEES.map((f) => (
              <div key={f.who} className="grid grid-cols-3 px-5 py-4 border-b border-gray-100 last:border-0">
                <span className="text-sm font-black text-gray-950">{f.who}</span>
                <span className="text-sm font-black text-green-700">{f.fee}</span>
                <span className="text-sm text-gray-500">{f.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-release */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <h3 className="font-black text-gray-950 mb-2">⚠️ Auto-release policy</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            If a client has not released payment or opened a dispute within <strong>48 hours</strong> of the artisan marking the job complete, the escrow will automatically release to the artisan. Always review your dashboard promptly after job completion.
          </p>
        </div>

        {/* Dispute */}
        <div>
          <h2 className="font-black text-gray-950 mb-2">Disputes</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            You can open a dispute any time before the escrow is released. Our team will review evidence from both parties and make a binding decision within 3 business days. Possible outcomes include full refund, partial refund, or full release to the artisan.
          </p>
          <Link href="/dashboard" className="inline-block bg-green-700 text-white px-6 py-3 text-sm font-black rounded-xl hover:bg-green-800 transition-colors">
            Go to Dashboard →
          </Link>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <Link href="/" className="text-sm font-black text-green-700 hover:text-green-800 underline underline-offset-4">← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
