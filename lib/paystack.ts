const SECRET = process.env.PAYSTACK_SECRET_KEY!;
const BASE    = "https://api.paystack.co";

async function paystackPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

type PaystackResult = { status: boolean; message: string; data?: unknown };

/**
 * Issue a full or partial refund for a completed Paystack transaction.
 * @param reference  The Paystack transaction reference stored on the booking.
 * @param amountKobo Optional — omit for a full refund.
 */
export async function refundPaystackTransaction(
  reference:   string,
  amountKobo?: number
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await paystackPost<PaystackResult>("/refund", {
      transaction: reference,
      ...(amountKobo !== undefined && { amount: amountKobo }),
    });
    if (!res.status) {
      console.error("[paystack refund] failed:", res.message);
    }
    return { ok: res.status, message: res.message };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[paystack refund] exception:", msg);
    return { ok: false, message: msg };
  }
}
