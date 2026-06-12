import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category    = searchParams.get("category");
  const location    = searchParams.get("location") ?? "";
  const query       = searchParams.get("q") ?? "";
  const verifiedOnly = searchParams.get("verified") === "true";
  const matched     = searchParams.get("match") === "true"; // scoring sort

  const service = createServiceClient();

  if (matched && category) {
    const { data, error } = await service.rpc("match_artisans", {
      p_category: category,
      p_location: location,
      p_limit:    10,
    });
    // If RPC succeeds return it; otherwise fall through to regular query
    if (!error) return NextResponse.json(data);
    console.error("match_artisans RPC error:", error.message);
  }

  let q = service
    .from("artisans")
    .select("*")
    .eq("application_status", "approved");

  if (category)    q = q.eq("category", category);
  if (verifiedOnly) q = q.eq("is_verified", true);
  if (query) {
    q = q.or(
      `full_name.ilike.%${query}%,location.ilike.%${query}%,category.ilike.%${query}%`
    );
  }

  q = q.order("trust_score", { ascending: false }).limit(50);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
