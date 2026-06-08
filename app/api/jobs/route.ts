import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient, createServiceClient } from "@/lib/supabase";

export async function GET() {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await createServiceClient()
    .from("job_requests")
    .select(`
      *,
      diagnoses (*),
      bookings (*)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const userClient = await createServerSideClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { description, location, imageProvided = false, diagnosis } = body as {
    description:   string;
    location:      string;
    imageProvided?: boolean;
    diagnosis:     Record<string, unknown>;
  };

  if (!description || !location || !diagnosis) {
    return NextResponse.json({ error: "description, location, and diagnosis are required" }, { status: 400 });
  }

  const service = createServiceClient();

  // Create job first (without diagnosisId)
  const { data: job, error: jobErr } = await service
    .from("job_requests")
    .insert({
      user_id:       user.id,
      description,
      location,
      image_provided: imageProvided,
      status:        "diagnosed",
    })
    .select()
    .single();

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });

  // Create diagnosis linked to job
  const { data: diag, error: diagErr } = await service
    .from("diagnoses")
    .insert({
      job_id:                    job.id,
      user_id:                   user.id,
      issue_title:               diagnosis.issue_title,
      summary:                   diagnosis.summary,
      artisan_category:          diagnosis.artisan_category,
      urgency:                   diagnosis.urgency ?? "Medium",
      estimated_min_naira:       diagnosis.estimated_min_naira ?? 0,
      estimated_max_naira:       diagnosis.estimated_max_naira ?? 0,
      estimated_labor_naira:     diagnosis.estimated_labor_naira ?? 0,
      estimated_materials_naira: diagnosis.estimated_materials_naira ?? 0,
      safety_warning:            diagnosis.safety_warning ?? null,
      first_aid_steps:           diagnosis.first_aid_steps ?? [],
      follow_up_questions:       diagnosis.follow_up_questions ?? [],
      artisan_brief:             diagnosis.artisan_brief ?? null,
      language:                  diagnosis.language ?? "English",
    })
    .select()
    .single();

  if (diagErr) return NextResponse.json({ error: diagErr.message }, { status: 500 });

  // Back-link job → diagnosis
  await service
    .from("job_requests")
    .update({ diagnosis_id: diag.id })
    .eq("id", job.id);

  return NextResponse.json({ job, diagnosis: diag }, { status: 201 });
}
