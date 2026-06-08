import Link from "next/link";

export default function EscrowGuidelinesPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16 font-sans">
      <section className="mx-auto max-w-2xl bg-white border border-gray-200 p-8 rounded-none shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Escrow Guidelines</h1>
        <p className="text-gray-600 mb-6">
          FixMate holds demo funds in simulated OPay escrow until the job is completed. Users pay a 2% demo fee, and artisans see a 10% fee on completed payout.
        </p>
        <Link href="/" className="inline-block bg-green-700 text-white px-5 py-3 rounded-none text-sm font-bold hover:bg-green-800">
          Back to Home
        </Link>
      </section>
    </main>
  );
}
