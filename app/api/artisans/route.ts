import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { ArtisanCategory } from "@/lib/types";

function toArtisan(r: Record<string, unknown>) {
  return {
    id:                        r.id as string,
    fullName:                  r.full_name as string,
    phone:                     r.phone as string,
    category:                  r.category as ArtisanCategory,
    location:                  r.location as string,
    yearsExperience:           r.years_experience as number,
    verificationId:            (r.verification_id ?? "") as string,
    skills:                    (r.skills ?? []) as string[],
    serviceRadiusKm:           r.service_radius_km as number,
    opayPhone:                 (r.opay_phone ?? "") as string,
    trustScore:                r.trust_score as number,
    completedJobs:             r.completed_jobs as number,
    isVerified:                r.is_verified as boolean,
    ninVerified:               (r.nin_verified ?? false) as boolean,
    applicationStatus:         r.application_status as "pending" | "approved" | "rejected",
    artisan_pending_balance:   r.artisan_pending_balance as number,
    artisan_available_balance: r.artisan_available_balance as number,
    avatar:                    (r.avatar ?? "") as string,
    emergencyAvailable:        (r.emergency_available ?? false) as boolean,
    serviceAreas:              (r.service_areas ?? []) as string[],
    rating:                    r.rating as number | undefined,
    createdAt:                 r.created_at as string,
  };
}

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
    if (!error) return NextResponse.json((data ?? []).map((r) => toArtisan(r as Record<string, unknown>)));
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
  return NextResponse.json((data ?? []).map((r) => toArtisan(r as Record<string, unknown>)));
}
