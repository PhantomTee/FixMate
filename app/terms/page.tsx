import Link from "next/link";

const SECTIONS = [
  {
    title: "1. Acceptance",
    body: "By using iSabi you agree to these terms. If you do not agree, please do not use the platform. These terms apply to all users — clients, artisans, and visitors.",
  },
  {
    title: "2. The platform",
    body: "iSabi is a marketplace that connects clients with skilled tradespeople (artisans) for home repair and maintenance services in Nigeria. We are not a party to the service contract between client and artisan — we provide the matching, payment, and dispute infrastructure.",
  },
  {
    title: "3. Accounts",
    body: "You must provide a valid Nigerian phone number to create an account. You are responsible for all activity under your account. Accounts found to be fraudulent, abusive, or in violation of these terms will be suspended without notice.",
  },
  {
    title: "4. Artisan registration",
    body: "Artisans must provide a valid government-issued ID for verification. Providing false documents is grounds for immediate and permanent ban. Approved artisans must maintain accurate profiles and service areas.",
  },
  {
    title: "5. Escrow and payments",
    body: "All payments are held in escrow by iSabi until the client confirms job completion. Clients pay a 2% service fee. Artisans pay a 10% commission on released payments. Escrow funds are not released until the client confirms or a dispute is resolved in the artisan's favour.",
  },
  {
    title: "6. Disputes",
    body: "Either party may open a dispute through the platform. iSabi will review evidence submitted by both parties and make a binding decision within 3 business days. Our decision on the allocation of escrow funds is final.",
  },
  {
    title: "7. Prohibited conduct",
    body: "You may not: post fake jobs or reviews, solicit direct payments outside the escrow system, harass or threaten other users, use the platform for any unlawful purpose, or attempt to reverse-engineer the platform.",
  },
  {
    title: "8. Liability",
    body: "iSabi is not liable for the quality of work performed by artisans. Our liability in any dispute is limited to the escrow funds held for that specific booking. We are not liable for injury, property damage, or consequential losses arising from a booking.",
  },
  {
    title: "9. Termination",
    body: "We may suspend or terminate any account at our sole discretion, with or without notice, for violations of these terms. Users may delete their accounts at any time by contacting us via WhatsApp.",
  },
  {
    title: "10. Governing law",
    body: "These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these terms shall be subject to the jurisdiction of the courts in Lagos State.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-[clamp(1.8rem,5vw,3rem)] font-black text-gray-950 tracking-tight mb-2">Terms of Service</h1>
          <p className="text-gray-400 text-sm">Last updated: June 2025</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <p className="text-gray-600 leading-relaxed">
          Please read these terms carefully before using iSabi. By accessing or using the platform you agree to be bound by them.
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
