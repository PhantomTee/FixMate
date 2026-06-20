import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

// NOTE: confirm this matches your idnorm account's API host (shown in their
// dashboard / OpenAPI spec download). Defaulting to api.idnorm.com.
const IDNORM_API_BASE = process.env.IDNORM_API_BASE_URL ?? "https://api.idnorm.com";
const IDNORM_API_KEY  = process.env.IDNORM_API_KEY!;
const IDNORM_CONFIG_ID = process.env.IDNORM_CONFIG_ID!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://isabiwork.vercel.app";

export async function POST() {
  try {
    const userClient = await createServerSideClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const service = createServiceClient();
    const { data: artisan } = await service
      .from("artisans")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!artisan) return NextResponse.json({ error: "No artisan profile found" }, { status: 404 });

    const res = await fetch(`${IDNORM_API_BASE}/api/v1/create_session`, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${IDNORM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        configId:        IDNORM_CONFIG_ID,
        externalUserId:  artisan.id,
        callbackUrl:     `${APP_URL}/artisan/dashboard?kyc=complete`,
        durationInSeconds: 60 * 60 * 24, // 24 hours
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("idnorm create_session error:", errText);
      return NextResponse.json({ error: "Failed to start verification" }, { status: 502 });
    }

    const data = await res.json() as { sessionId: string; verificationUrl: string; sessionToken: string };

    await service
      .from("artisans")
      .update({ idnorm_session_id: data.sessionId, kyc_status: "pending" })
      .eq("id", artisan.id);

    return NextResponse.json({ verificationUrl: data.verificationUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("create-session error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
