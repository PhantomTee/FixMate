import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    fullName:         string;
    phone:            string;
    category:         string;
    location:         string;
    yearsExperience?: number;
    skills?:          string[];
    serviceRadiusKm?: number;
    calloutFeeNaira?: number;
    dailyRateNaira?:  number;
    portfolioPhotos?: string[];
    selfieUrl?:       string;
    opayPhone?:       string;
    ninVerified?:     boolean;
    ninReference?:    string;
  };

  let user;
  try {
    const serverClient = await createServerSideClient();
    ({ data: { user } } = await serverClient.auth.getUser());
  } catch {
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const { data, error } = await service.from("artisans").insert({
      user_id:             user?.id ?? null,
      full_name:           body.fullName,
      phone:               body.phone,
      category:            body.category,
      location:            body.location,
      years_experience:    body.yearsExperience ?? 0,
      skills:              body.skills ?? [body.category],
      service_radius_km:   body.serviceRadiusKm ?? 10,
      callout_fee_naira:   body.calloutFeeNaira ?? 0,
      daily_rate_naira:    body.dailyRateNaira ?? 0,
      portfolio_photos:    body.portfolioPhotos ?? [],
      selfie_url:          body.selfieUrl ?? "",
      opay_phone:          body.opayPhone ?? "",
      nin_verified:        body.ninVerified ?? false,
      nin_reference:       body.ninReference ?? "",
      avatar:              "",
      emergency_available: false,
      service_areas:       [],
      trust_score:         60,
      is_verified:         false,
      application_status:  "pending",
      badge:               "Newbie",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
