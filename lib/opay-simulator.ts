"use client";

// OPay Integration Simulator
// This module mimics the OPay payment API for demo/hackathon purposes.
// In production, replace each function with the real OPay API call.
// See: https://documentation.opayweb.com

import { OPayPayment, OPayPaymentStatus } from "@/lib/types";

const STORAGE_KEY = "fixmate_opay_payments_v1";

export function generateOPayReference(): string {
  const ts = Date.now().toString().slice(-7);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OPAY-FIX-${ts}-${rand}`;
}

export function getPayments(): OPayPayment[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as OPayPayment[];
  } catch {
    return [];
  }
}

function savePayments(payments: OPayPayment[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
    window.dispatchEvent(new Event("fixmate-opay-updated"));
  }
}

// Step 1: User initiates payment — mirrors OPay checkout initiation
export function createPaymentIntent(input: {
  bookingId: string;
  amount: number;
  phone: string;
}): OPayPayment {
  const payment: OPayPayment = {
    reference: generateOPayReference(),
    bookingId: input.bookingId,
    amount: input.amount,
    phone: input.phone,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const payments = getPayments();
  // Replace any existing payment for this booking
  const filtered = payments.filter((p) => p.bookingId !== input.bookingId);
  savePayments([payment, ...filtered]);
  return payment;
}

// Step 2: Verify payment status — mirrors OPay verifyTransaction endpoint
export function verifyPayment(reference: string): OPayPayment | null {
  return getPayments().find((p) => p.reference === reference) ?? null;
}

export function getPaymentByBookingId(bookingId: string): OPayPayment | null {
  return getPayments().find((p) => p.bookingId === bookingId) ?? null;
}

// Step 3: Simulate a webhook from OPay — mirrors the real webhook payload
export function simulateWebhook(
  reference: string,
  status: OPayPaymentStatus
): { success: boolean; payload: Record<string, unknown> } {
  const payments = getPayments();
  const payment = payments.find((p) => p.reference === reference);
  if (!payment) return { success: false, payload: { error: "Reference not found" } };

  payment.status = status;
  payment.updatedAt = new Date().toISOString();
  if (status === "paid") payment.confirmedAt = new Date().toISOString();

  const payload: Record<string, unknown> = {
    event: "payment.status_changed",
    reference: payment.reference,
    orderNo: payment.reference,
    amount: payment.amount,
    currency: "NGN",
    status,
    bookingId: payment.bookingId,
    customerPhone: payment.phone,
    timestamp: new Date().toISOString(),
    source: "opay_simulator",
    _note: "Simulated webhook. Replace with real OPay webhook in production.",
  };
  payment.webhookPayload = payload;
  savePayments(payments);

  return { success: true, payload };
}

// Step 4: Mark escrow as released after job completion
export function releaseEscrowPayment(bookingId: string): OPayPayment | null {
  const payments = getPayments();
  const payment = payments.find((p) => p.bookingId === bookingId);
  if (!payment) return null;
  payment.status = "released";
  payment.updatedAt = new Date().toISOString();
  savePayments(payments);
  return payment;
}

// Step 5: Refund to user wallet
export function refundEscrowPayment(bookingId: string): OPayPayment | null {
  const payments = getPayments();
  const payment = payments.find((p) => p.bookingId === bookingId);
  if (!payment) return null;
  payment.status = "refunded";
  payment.updatedAt = new Date().toISOString();
  savePayments(payments);
  return payment;
}

export function getPendingPayments(): OPayPayment[] {
  return getPayments().filter((p) => p.status === "pending");
}

export const OPAY_STATUS_LABELS: Record<OPayPaymentStatus, string> = {
  initiated: "Initiated",
  pending: "Awaiting Confirmation",
  paid: "Payment Confirmed",
  failed: "Payment Failed",
  expired: "Expired",
  released: "Released to Artisan",
  refunded: "Refunded to User",
};

export const OPAY_STATUS_COLORS: Record<OPayPaymentStatus, string> = {
  initiated: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
  released: "bg-blue-100 text-blue-800",
  refunded: "bg-purple-100 text-purple-800",
};
