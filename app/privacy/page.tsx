import Link from "next/link";

const SECTIONS = [
  {
    title: "What we collect",
    body: "We collect your phone number for authentication via WhatsApp OTP. When you post a job, we store your job description, location, and any images you upload. When you book an artisan, we record your payment details and booking status.",
  },
  {
    title: "How we use your data",
    body: "Your data is used to match you with artisans, process escrow payments, send you booking updates via WhatsApp, and improve our AI diagnosis engine. We do not sell your data to third parties.",
  },
  {
    title: "Artisan data",
    body: "Artisans provide their government ID for verification purposes. This is stored securely and only used for background checks. Artisan profiles (name, location, category, skills, ratings) are publicly visible to help clients make booking decisions.",
  },
  {
    title: "Payments",
    body: "Payments are processed via Paystack. Handijob does not store your card details — all payment data is handled by Paystack's PCI-compliant infrastructure. Escrow balances are managed in our Supabase database with full audit trails.",
  },
  {
    title: "Data retention",
    body: "Your account data is retained as long as your account is active. Job records, chat messages, and escrow transactions are retained for 3 years for dispute resolution and tax compliance. You can request deletion by contacting us on WhatsApp.",
  },
  {
    title: "Your rights",
    body: "You can request access to, correction of, or deletion of your personal data at any time. Contact us via WhatsApp. We aim to respond to all requests within 7 business days.",
  },
  {
    title: "Security",
    body: "All data is encrypted in transit (TLS 1.3) and at rest. We use Supabase row-level security policies to ensure users can only access their own data. Admin access is strictly restricted and logged.",
  },
  {
    title: "Changes to this policy",
    body: "We may update this policy from time to time. Significant changes will be communicated via WhatsApp to registered users. Continued use of the platform after changes constitutes acceptance.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-[clamp(1.8rem,5vw,3rem)] font-black text-gray-950 tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-gray-400 text-sm">Last updated: June 2025</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <p className="text-gray-600 leading-relaxed">
          Handijob (&quot;we&quot;, &quot;our&quot;, &quot;the platform&quot;) is committed to protecting your privacy. This policy explains what data we collect, why we collect it, and how we use it.
        </p>
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="font-black text-gray-950 mb-2">{s.title}</h2>
            <p className="text-gray-600 leading-relaxed text-sm">{s.body}</p>
          </div>
        ))}
        <div className="pt-4 border-t border-gray-100">
          <Link href="/" className="text-sm font-black text-green-700 hover:text-green-800 underline underline-offset-4">← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
