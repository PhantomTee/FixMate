import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16 font-sans">
      <section className="mx-auto max-w-2xl bg-white border border-gray-200 p-8 rounded-none shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
        <p className="text-gray-600 mb-6">
          FixMate is a demo MVP. User reports, artisan applications, chat messages, and escrow records are stored in the demo data layer for judging and product testing.
        </p>
        <Link href="/" className="inline-block bg-green-700 text-white px-5 py-3 rounded-none text-sm font-bold hover:bg-green-800">
          Back to Home
        </Link>
      </section>
    </main>
  );
}
