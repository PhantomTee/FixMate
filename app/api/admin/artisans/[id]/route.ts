import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendNotification } from "@/lib/notify";
import { isAdminUser } from "@/lib/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const service = createServiceClient();

  const updates: Record<string, unknown> = {};
  if ("applicationStatus" in body) updates.application_status = body.applicationStatus;
  if ("isVerified"         in body) updates.is_verified        = body.isVerified;
  if ("trustScore"         in body) updates.trust_score        = body.trustScore;

  const { data, error } = await service
    .from("artisans")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget approval notification
  if (body.applicationStatus === "approved" && data?.phone) {
    void sendNotification(
      data.phone as string,
      `Congratulations ${data.full_name ?? ""}! Your iSabi artisan application has been approved. You can now receive jobs on the platform. Visit isabi.ng to get started.`
    );
  }

  return NextResponse.json(data);
}
