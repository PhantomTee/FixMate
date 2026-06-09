import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: NextRequest) {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { bank_code, account_number, account_name, amount_naira } = await req.json() as {
    bank_code: string;
    account_number: string;
    account_name: string;
    amount_naira: number;
  };

  if (!bank_code || !account_number || !amount_naira) {
    return NextResponse.json({ error: "bank_code, account_number, and amount_naira are required" }, { status: 400 });
  }
  if (amount_naira < 100) {
    return NextResponse.json({ error: "Minimum payout is ₦100" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: artisan } = await service
    .from("artisans")
    .select("id, full_name, artisan_available_balance")
    .eq("user_id", user.id)
    .single();

  if (!artisan) return NextResponse.json({ error: "Artisan profile not found" }, { status: 404 });
  if ((artisan.artisan_available_balance ?? 0) < amount_naira) {
    return NextResponse.json({ error: "Insufficient available balance" }, { status: 400 });
  }

  // 1. Create Paystack transfer recipient
  const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type:           "nuban",
      name:           account_name || artisan.full_name,
      account_number: account_number.trim(),
      bank_code:      bank_code.trim(),
      currency:       "NGN",
    }),
  });
  const recipientData = await recipientRes.json() as {
    status: boolean;
    data?: { recipient_code: string };
    message?: string;
  };
  if (!recipientData.status || !recipientData.data) {
    return NextResponse.json(
      { error: recipientData.message ?? "Failed to create transfer recipient" },
      { status: 502 }
    );
  }

  const amountKobo = Math.round(amount_naira * 100);

  // 2. Initiate transfer
  const transferRes = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source:    "balance",
      reason:    `iSabi artisan payout — ${artisan.full_name}`,
      amount:    amountKobo,
      recipient: recipientData.data.recipient_code,
    }),
  });
  const transferData = await transferRes.json() as {
    status: boolean;
    data?: { transfer_code: string; status: string };
    message?: string;
  };
  if (!transferData.status) {
    return NextResponse.json(
      { error: transferData.message ?? "Transfer initiation failed" },
      { status: 502 }
    );
  }

  // 3. Deduct from artisan available balance
  await service
    .from("artisans")
    .update({ artisan_available_balance: (artisan.artisan_available_balance ?? 0) - amount_naira })
    .eq("id", artisan.id);

  return NextResponse.json({
    success:       true,
    transfer_code: transferData.data?.transfer_code,
    status:        transferData.data?.status,
  });
}
