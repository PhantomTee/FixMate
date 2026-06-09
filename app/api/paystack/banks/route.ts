import { NextResponse } from "next/server";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function GET() {
  const res = await fetch("https://api.paystack.co/bank?country=nigeria&perPage=100&use_cursor=false", {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    next: { revalidate: 3600 },
  });
  const data = await res.json() as {
    status: boolean;
    data?: Array<{ name: string; code: string; slug: string }>;
  };
  if (!data.status) return NextResponse.json({ banks: [] });
  return NextResponse.json({ banks: data.data ?? [] });
}
