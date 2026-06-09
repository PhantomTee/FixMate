import Link from "next/link";

const FAQS = [
  {
    q: "How do I post a job?",
    a: "Click 'Post a Job' in the navbar. Describe your issue in plain language — our AI will diagnose it, estimate the cost, and match you with the right artisan in your area.",
  },
  {
    q: "How does escrow payment work?",
    a: "When you confirm a booking, your payment is held in secure escrow. The artisan receives nothing until you confirm the job is done. If there's a problem, you can open a dispute and our team will review it.",
  },
  {
    q: "How are artisans verified?",
    a: "Every artisan submits a government-issued ID and completes a background check before being approved. Verified artisans carry a ✓ badge on their profile.",
  },
  {
    q: "Can I choose my artisan?",
    a: "Yes. After the AI diagnosis, you'll see a ranked list of available artisans near you. You can view each profile, their ratings, completed jobs, and skills before deciding.",
  },
  {
    q: "What if I'm not happy with the work?",
    a: "Don't release payment. Open a dispute from your dashboard and our team will review the case within 24 hours. We can issue a full or partial refund depending on the outcome.",
  },
  {
    q: "How do I register as an artisan?",
    a: "Click 'Offer Your Skills' and fill in the registration form. You'll need a valid ID and phone number. Applications are reviewed within 48 hours.",
  },
  {
    q: "What cities do you cover?",
    a: "We are currently active in Lagos, Abuja, Port Harcourt, Ibadan, and Kano. We're expanding — artisans in other cities can register and be first approved when we launch there.",
  },
  {
    q: "Is there a fee for using iSabi?",
    a: "Clients pay a small 2% service fee on each booking. Artisans are charged a 10% commission only on completed, released jobs — you pay nothing until you earn.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-[clamp(1.8rem,5vw,3rem)] font-black text-gray-950 tracking-tight mb-2">Help Centre</h1>
          <p className="text-gray-500">Everything you need to know about iSabi.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-3">
        {FAQS.map((faq, i) => (
          <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors">
              <span className="text-sm font-black text-gray-950">{faq.q}</span>
              <span className="ml-4 shrink-0 text-gray-400 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
            </summary>
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
            </div>
          </details>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="bg-gray-950 rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-black text-white mb-1">Still need help?</p>
            <p className="text-sm text-gray-400">Chat with us on WhatsApp — we typically reply within the hour.</p>
          </div>
          <Link
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "2348000000000"}?text=Hi!%20I%20need%20help%20with%20iSabi.`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-green-600 text-white px-6 py-3 text-sm font-black rounded-xl hover:bg-green-500 transition-colors"
          >
            Chat on WhatsApp →
          </Link>
        </div>
      </div>
    </main>
  );
}
