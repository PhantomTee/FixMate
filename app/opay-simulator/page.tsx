"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getPayments,
  simulateWebhook,
  OPAY_STATUS_LABELS,
  OPAY_STATUS_COLORS,
  getPendingPayments,
} from "@/lib/opay-simulator";
import { escrowAction, loadDb, resetDemoDb } from "@/lib/demo-db";
import { OPayPayment } from "@/lib/types";

const naira = (v: number) => `₦${v.toLocaleString()}`;

export default function OPaySimulatorPage() {
  const [payments, setPayments] = useState<OPayPayment[]>([]);
  const [lastWebhook, setLastWebhook] = useState<Record<string, unknown> | null>(null);
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const refresh = () => setPayments(getPayments());

  useEffect(() => {
    refresh();
    window.addEventListener("isabi-opay-updated", refresh);
    window.addEventListener("isabi-db-updated", refresh);
    return () => {
      window.removeEventListener("isabi-opay-updated", refresh);
      window.removeEventListener("isabi-db-updated", refresh);
    };
  }, []);

  const act = (reference: string, status: "paid" | "failed" | "expired") => {
    setActiveRef(reference);
    const result = simulateWebhook(reference, status);
    setLastWebhook(result.payload);

    if (status === "paid") {
      // Trigger escrow funding in demo-db
      const payment = getPayments().find((p) => p.reference === reference);
      if (payment?.bookingId) {
        try {
          escrowAction(payment.bookingId, "fund_escrow", "OPay webhook confirmed payment.");
          setMessage(`✓ Payment confirmed. Booking escrow funded.`);
        } catch (e) {
          setMessage(`Webhook received. ${e instanceof Error ? e.message : "DB update skipped."}`);
        }
      }
    } else {
      setMessage(`Webhook sent: payment ${status}.`);
    }

    refresh();
    setTimeout(() => setActiveRef(null), 1200);
  };

  const pending = getPendingPayments();

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-16">
      <header className="bg-white px-4 sm:px-6 py-4 flex items-center justify-between border-b shadow-sm">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-green-700 mb-0.5">iSabi</div>
          <h1 className="text-xl font-bold text-gray-900">OPay Integration Simulator</h1>
        </div>
        <Link href="/" className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Home</Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-bold text-amber-800 mb-1">Hackathon Demo — Simulated OPay Integration</p>
          <p className="text-xs text-amber-700">
            No real OPay API is connected. This page demonstrates the complete OPay escrow payment lifecycle:
            checkout initiation → pending → webhook confirmation → escrow funded → release → settlement.
            Replace each simulated call with the real OPay API in production.
          </p>
        </div>

        {/* Status message */}
        {message && (
          <div className="bg-green-50 border border-green-200 px-4 py-3 text-sm font-semibold text-green-800">
            {message}
          </div>
        )}

        {/* Payment flow diagram */}
        <section className="bg-white border border-gray-200 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Real OPay Escrow Flow</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {[
              { label: "Checkout Init", color: "bg-gray-100 text-gray-700" },
              { label: "→" },
              { label: "Payment Pending", color: "bg-yellow-100 text-yellow-800" },
              { label: "→" },
              { label: "Webhook: paid", color: "bg-green-100 text-green-800" },
              { label: "→" },
              { label: "Escrow Funded", color: "bg-blue-100 text-blue-800" },
              { label: "→" },
              { label: "Artisan Accepts", color: "bg-purple-100 text-purple-800" },
              { label: "→" },
              { label: "Job Complete", color: "bg-indigo-100 text-indigo-800" },
              { label: "→" },
              { label: "Release / Refund", color: "bg-emerald-100 text-emerald-800" },
            ].map((step, i) => (
              step.color
                ? <span key={i} className={`px-2 py-1 ${step.color}`}>{step.label}</span>
                : <span key={i} className="text-gray-400">{step.label}</span>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            In production: OPay sends a signed webhook to <code className="bg-gray-100 px-1">/api/opay/webhook</code> after payment.
            iSabi verifies the signature, updates the booking, and notifies the artisan.
          </p>
        </section>

        {/* Pending payments — judge action area */}
        <section className="bg-white border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Pending Payments
              {pending.length > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5">{pending.length}</span>
              )}
            </h2>
            <Link href="/booking" className="text-xs font-bold text-green-700 underline">
              + Create a booking to generate a payment
            </Link>
          </div>

          {pending.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 border border-gray-100 text-sm text-gray-500">
              No pending payments. Go through the{" "}
              <Link href="/report" className="text-green-700 font-bold underline">report flow</Link>
              {" "}to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((p) => (
                <div key={p.reference} className="border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-gray-900">{p.reference}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{naira(p.amount)} · Booking: {p.bookingId}</p>
                      <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`w-fit px-2 py-1 text-xs font-bold ${OPAY_STATUS_COLORS[p.status]}`}>
                      {OPAY_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => act(p.reference, "paid")}
                      disabled={activeRef === p.reference}
                      className="px-4 py-2 bg-green-700 text-white text-sm font-bold hover:bg-green-800 disabled:opacity-50"
                    >
                      ✓ Simulate OPay Success
                    </button>
                    <button
                      onClick={() => act(p.reference, "failed")}
                      disabled={activeRef === p.reference}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                    >
                      ✗ Simulate Failed Payment
                    </button>
                    <button
                      onClick={() => act(p.reference, "expired")}
                      disabled={activeRef === p.reference}
                      className="px-4 py-2 bg-gray-500 text-white text-sm font-bold hover:bg-gray-600 disabled:opacity-50"
                    >
                      Expire
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All payments ledger */}
        <section className="bg-white border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Payment Ledger ({payments.length})</h2>
            <button
              onClick={() => { resetDemoDb(); setPayments([]); setLastWebhook(null); setMessage("Demo reset."); }}
              className="text-xs text-red-600 hover:text-red-800 font-semibold"
            >
              Reset Demo
            </button>
          </div>
          {payments.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 border border-gray-100">
              No payments yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-xs font-bold uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4">Reference</th>
                    <th className="pr-4">Amount</th>
                    <th className="pr-4">Status</th>
                    <th className="pr-4">Booking</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.reference} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4 font-mono text-xs">{p.reference}</td>
                      <td className="pr-4 font-semibold">{naira(p.amount)}</td>
                      <td className="pr-4">
                        <span className={`px-2 py-0.5 text-xs font-bold ${OPAY_STATUS_COLORS[p.status]}`}>
                          {OPAY_STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="pr-4 text-xs text-gray-500">{p.bookingId}</td>
                      <td className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleString("en-NG")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Last webhook payload */}
        {lastWebhook && (
          <section className="bg-white border border-gray-200 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Last Webhook Payload</h2>
            <p className="text-xs text-gray-500 mb-3">
              This is what OPay would POST to <code className="bg-gray-100 px-1">/api/opay/webhook</code> in production.
            </p>
            <pre className="bg-gray-950 text-green-400 text-xs p-4 overflow-x-auto rounded-none">
              {JSON.stringify(lastWebhook, null, 2)}
            </pre>
          </section>
        )}

        {/* Current DB snapshot */}
        <section className="bg-white border border-gray-200 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Current Escrow Ledger (demo-db)</h2>
          <EscrowLedger />
        </section>

      </main>
    </div>
  );
}

function EscrowLedger() {
  const [db, setDb] = useState(() => (typeof window !== "undefined" ? loadDb() : null));
  useEffect(() => {
    const refresh = () => setDb(loadDb());
    window.addEventListener("isabi-db-updated", refresh);
    return () => window.removeEventListener("isabi-db-updated", refresh);
  }, []);
  if (!db) return null;

  const naira = (v: number) => `₦${v.toLocaleString()}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Platform Fees" value={naira(db.platform_fee_balance)} />
        <Stat label="Bookings" value={String(db.bookings.length)} />
        <Stat label="Disputes" value={String(db.disputes.filter(d => d.status === "open").length)} />
        <Stat label="Transactions" value={String(db.escrow_transactions.length)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b text-xs font-bold uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-4">Reference</th>
              <th className="pr-4">Amount</th>
              <th className="pr-4">Escrow Status</th>
              <th>Artisan</th>
            </tr>
          </thead>
          <tbody>
            {db.bookings.map((b) => {
              const artisan = db.artisans.find((a) => a.id === b.artisanId);
              return (
                <tr key={b.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-xs">{b.opayReference}</td>
                  <td className="pr-4 font-semibold">{naira(b.quoteAmount)}</td>
                  <td className="pr-4">
                    <span className={`px-2 py-0.5 text-xs font-bold ${
                      b.escrowStatus === "funded" ? "bg-blue-100 text-blue-800" :
                      b.escrowStatus === "released" ? "bg-green-100 text-green-800" :
                      b.escrowStatus === "refunded" ? "bg-purple-100 text-purple-800" :
                      b.escrowStatus === "disputed" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>{b.escrowStatus}</span>
                  </td>
                  <td className="text-xs text-gray-600">{artisan?.fullName ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 p-3">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
