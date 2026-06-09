import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: NextRequest) {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { account_number, bank_code } = await req.json() as {
    account_number: string;
    bank_code: string;
  };

  if (!account_number || !bank_code) {
    return NextResponse.json({ error: "account_number and bank_code are required" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
  );
  const data = await res.json() as {
    status: boolean;
    data?: { account_name: string; account_number: string };
    message?: string;
  };

  if (!data.status || !data.data) {
    return NextResponse.json({ error: data.message ?? "Could not resolve account" }, { status: 400 });
  }

  return NextResponse.json({ account_name: data.data.account_name });
}
