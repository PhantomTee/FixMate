import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

async function isAdminUser() {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return false;
  const adminPhones = (process.env.ADMIN_PHONE_WHITELIST ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  return user.user_metadata?.role === "admin" || adminPhones.includes(user.phone ?? "");
}

export async function GET(_req: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();

  const [
    { data: artisans },
    { data: bookings },
    { data: disputes },
    { data: txns },
    { data: jobs },
    { data: diagnoses },
    { data: config },
  ] = await Promise.all([
    service.from("artisans").select("*").order("created_at", { ascending: false }),
    service.from("bookings").select("*").order("created_at", { ascending: false }),
    service.from("disputes").select("*").order("created_at", { ascending: false }),
    service.from("escrow_transactions").select("*").order("created_at", { ascending: false }),
    service.from("job_requests").select("*").order("created_at", { ascending: false }),
    service.from("diagnoses").select("*"),
    service.from("platform_config").select("*").single(),
  ]);

  return NextResponse.json({ artisans, bookings, disputes, txns, jobs, diagnoses, config });
}
