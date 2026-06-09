import { NextRequest, NextResponse } from "next/server";

// OPay Webhook Simulation Endpoint
// In production this would be a real OPay-signed webhook receiver.
// Here it validates the payload and returns what the system would do — the
// client calls simulateWebhook() from opay-simulator.ts to apply state changes.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { reference, status } = body;

    if (!reference || typeof reference !== "string") {
      return NextResponse.json({ success: false, error: "Missing reference" }, { status: 400 });
    }
    if (!status || typeof status !== "string") {
      return NextResponse.json({ success: false, error: "Missing status" }, { status: 400 });
    }

    const validStatuses = ["initiated", "pending", "paid", "failed", "expired", "released", "refunded"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: `Invalid status. Use one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    // In production: verify OPay HMAC signature here using the secret key
    // const sig = req.headers.get("X-OPay-Signature");
    // if (!verifySignature(sig, body, OPAY_SECRET)) return 401;

    const payload = {
      event: "payment.status_changed",
      reference,
      status,
      currency: "NGN",
      timestamp: new Date().toISOString(),
      source: "opay_simulator",
      _demo_note: "Simulated webhook payload. In production, replace with real OPay webhook and signature verification.",
      _action_required: status === "paid"
        ? "Fund escrow — move booking from not_funded → funded"
        : status === "failed"
          ? "Payment failed — notify user to retry"
          : status === "refunded"
            ? "Refund confirmed — update user wallet balance"
            : "Status updated",
    };

    return NextResponse.json({ success: true, payload }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: "iSabi OPay Webhook Simulator",
    usage: "POST with { reference: string, status: string }",
    validStatuses: ["initiated", "pending", "paid", "failed", "expired", "released", "refunded"],
    demo: true,
    note: "This endpoint simulates OPay payment webhooks for hackathon demonstration.",
  });
}
