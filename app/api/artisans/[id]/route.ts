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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = createServiceClient();

  const { data: artisanRow, error: artisanError } = await service
    .from("artisans")
    .select("*")
    .eq("id", id)
    .single();

  if (artisanError || !artisanRow) {
    return NextResponse.json({ error: "Artisan not found" }, { status: 404 });
  }

  const artisan = toArtisan(artisanRow as Record<string, unknown>);

  const { data: reviewRows } = await service
    .from("reviews")
    .select("*")
    .eq("artisan_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const reviews = (reviewRows ?? []) as Array<Record<string, unknown>>;

  const userIds = [...new Set(reviews.map((r) => r.user_id as string))].filter(Boolean);

  let userNameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: usersData } = await service
      .from("users")
      .select("id, name")
      .in("id", userIds);

    userNameMap = Object.fromEntries(
      (usersData ?? []).map((u: Record<string, unknown>) => [u.id as string, u.name as string])
    );
  }

  const reviewsWithNames = reviews.map((r) => ({
    id:         r.id as string,
    jobId:      r.job_id as string,
    artisanId:  r.artisan_id as string,
    userId:     r.user_id as string,
    rating:     r.rating as number,
    comment:    r.comment as string,
    createdAt:  r.created_at as string,
    reviewerName: userNameMap[r.user_id as string] ?? null,
  }));

  return NextResponse.json({ artisan, reviews: reviewsWithNames });
}
