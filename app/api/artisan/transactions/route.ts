import { NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";

export async function GET() {
  const supabase = await createServerSideClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: artisan, error: artisanError } = await supabase
    .from("artisans")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (artisanError || !artisan) {
    return NextResponse.json({ error: "Artisan not found" }, { status: 404 });
  }

  const { data: transactions, error: txError } = await supabase
    .from("escrow_transactions")
    .select("*")
    .eq("artisan_id", artisan.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  return NextResponse.json({ transactions: transactions ?? [] });
}
