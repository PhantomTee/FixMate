/**
 * Production API client.
 *
 * Functions here mirror the demo-db.ts interface so pages can swap imports
 * without logic changes. All financial mutations go through server-side API
 * routes (or Supabase RPCs marked security definer) so clients can never
 * bypass the escrow state machine.
 *
 * Components that still import from demo-db.ts will continue to work in
 * demo mode; migrate them to import from here as you add auth.
 */

import { createClient } from "@/lib/supabase";
import type {
  Artisan,
  ArtisanCategory,
  Booking,
  DiagnosisRecord,
  EscrowAction,
  iSabiDB,
  InventoryItem,
  JobRequest,
  Message,
  Review,
  User,
} from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────

function db() {
  return createClient();
}

// snake_case → camelCase converters

function toUser(r: Record<string, unknown>): User {
  return {
    id:                   r.id as string,
    name:                 r.name as string,
    phone:                r.phone as string,
    location:             r.location as string,
    user_wallet_balance:  r.user_wallet_balance as number,
    escrow_balance:       r.escrow_balance as number,
    createdAt:            r.created_at as string,
  };
}

function toArtisan(r: Record<string, unknown>): Artisan {
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

function toJobRequest(r: Record<string, unknown>): JobRequest {
  return {
    id:                 r.id as string,
    userId:             r.user_id as string,
    description:        r.description as string,
    imageProvided:      r.image_provided as boolean,
    location:           r.location as string,
    diagnosisId:        (r.diagnosis_id ?? "") as string,
    selectedArtisanId:  r.selected_artisan_id as string | undefined,
    bookingId:          r.booking_id as string | undefined,
    status:             r.status as JobRequest["status"],
    createdAt:          r.created_at as string,
    updatedAt:          r.updated_at as string,
  };
}

function toBooking(r: Record<string, unknown>): Booking {
  return {
    id:              r.id as string,
    jobId:           r.job_id as string,
    userId:          r.user_id as string,
    artisanId:       r.artisan_id as string,
    quoteAmount:     r.quote_amount as number,
    userFee:         r.user_fee as number,
    artisanFee:      r.artisan_fee as number,
    totalCharge:     r.total_charge as number,
    escrowStatus:    r.escrow_status as Booking["escrowStatus"],
    opayReference:   (r.paystack_reference ?? r.opay_reference ?? "") as string,
    createdAt:       r.created_at as string,
    updatedAt:       r.updated_at as string,
  };
}

function toDiagnosis(r: Record<string, unknown>): DiagnosisRecord {
  return {
    id:                        r.id as string,
    jobId:                     r.job_id as string,
    userId:                    r.user_id as string,
    issue_title:               r.issue_title as string,
    summary:                   r.summary as string,
    artisan_category:          r.artisan_category as ArtisanCategory,
    urgency:                   r.urgency as DiagnosisRecord["urgency"],
    estimated_min_naira:       r.estimated_min_naira as number,
    estimated_max_naira:       r.estimated_max_naira as number,
    estimated_labor_naira:     r.estimated_labor_naira as number,
    estimated_materials_naira: r.estimated_materials_naira as number,
    safety_warning:            r.safety_warning as string | null,
    first_aid_steps:           (r.first_aid_steps ?? []) as string[],
    follow_up_questions:       (r.follow_up_questions ?? []) as string[],
    artisan_brief:             r.artisan_brief as DiagnosisRecord["artisan_brief"],
    language:                  r.language as DiagnosisRecord["language"],
    createdAt:                 r.created_at as string,
  };
}

function toMessage(r: Record<string, unknown>): Message {
  return {
    id:         r.id as string,
    jobId:      r.job_id as string,
    senderType: r.sender_type as Message["senderType"],
    text:       r.text as string,
    timestamp:  r.timestamp as string,
  };
}

function toReview(r: Record<string, unknown>): Review {
  return {
    id:         r.id as string,
    jobId:      r.job_id as string,
    artisanId:  r.artisan_id as string,
    userId:     r.user_id as string,
    rating:     r.rating as number,
    comment:    r.comment as string,
    createdAt:  r.created_at as string,
  };
}

function toInventoryItem(r: Record<string, unknown>): InventoryItem {
  return {
    id:         r.id as string,
    artisanId:  r.artisan_id as string,
    name:       r.name as string,
    quantity:   r.quantity as number,
    unit:       r.unit as string,
    lowStockAt: r.low_stock_at as number,
    createdAt:  r.created_at as string,
  };
}

// ── Auth ───────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<User | null> {
  const supabase = db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
  return data ? toUser(data as Record<string, unknown>) : null;
}

export async function getCurrentArtisan(): Promise<Artisan | null> {
  const supabase = db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("artisans").select("*").eq("user_id", user.id).single();
  return data ? toArtisan(data as Record<string, unknown>) : null;
}

export async function signInWithPhone(phone: string) {
  return db().auth.signInWithOtp({ phone });
}

export async function verifyOtp(phone: string, token: string) {
  return db().auth.verifyOtp({ phone, token, type: "sms" });
}

export async function signOut() {
  return db().auth.signOut();
}

// ── Artisans ───────────────────────────────────────────────────

export async function getArtisans(params?: {
  category?: ArtisanCategory;
  location?: string;
  verifiedOnly?: boolean;
}): Promise<Artisan[]> {
  let q = db().from("artisans").select("*").eq("application_status", "approved");
  if (params?.category)    q = q.eq("category", params.category);
  if (params?.verifiedOnly) q = q.eq("is_verified", true);
  const { data, error } = await q.order("trust_score", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toArtisan(r as Record<string, unknown>));
}

export async function matchArtisans(category: ArtisanCategory, location?: string): Promise<Artisan[]> {
  const { data, error } = await db().rpc("match_artisans", {
    p_category: category,
    p_location: location ?? "",
    p_limit: 10,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => toArtisan(r));
}

export async function registerArtisan(
  artisan: Omit<Artisan, "id" | "createdAt" | "artisan_pending_balance" | "artisan_available_balance" | "completedJobs" | "rating">
): Promise<Artisan> {
  const supabase = db();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("artisans").insert({
    user_id:           user?.id,
    full_name:         artisan.fullName,
    phone:             artisan.phone,
    category:          artisan.category,
    location:          artisan.location,
    years_experience:  artisan.yearsExperience,
    verification_id:   artisan.verificationId,
    skills:            artisan.skills,
    service_radius_km: artisan.serviceRadiusKm,
    opay_phone:        artisan.opayPhone,
    avatar:            artisan.avatar,
    emergency_available: artisan.emergencyAvailable,
    service_areas:     artisan.serviceAreas,
  }).select().single();
  if (error) throw error;
  return toArtisan(data as Record<string, unknown>);
}

// ── Jobs ───────────────────────────────────────────────────────

export async function getMyJobs(): Promise<JobRequest[]> {
  const supabase = db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("job_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toJobRequest(r as Record<string, unknown>));
}

export async function getAssignedJobs(artisanId: string): Promise<JobRequest[]> {
  const { data, error } = await db()
    .from("job_requests")
    .select("*")
    .eq("selected_artisan_id", artisanId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toJobRequest(r as Record<string, unknown>));
}

export async function createJob(params: {
  description: string;
  location: string;
  imageProvided?: boolean;
  diagnosis: Omit<DiagnosisRecord, "id" | "jobId" | "userId" | "createdAt">;
}): Promise<{ job: JobRequest; diagnosis: DiagnosisRecord }> {
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error || "Failed to create job");
  }
  return res.json();
}

export async function selectArtisan(jobId: string, artisanId: string): Promise<JobRequest> {
  const res = await fetch(`/api/jobs/${jobId}/artisan`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artisanId }),
  });
  if (!res.ok) throw new Error("Failed to select artisan");
  return res.json();
}

// ── Diagnoses ─────────────────────────────────────────────────

export async function getDiagnosis(diagnosisId: string): Promise<DiagnosisRecord | null> {
  const { data, error } = await db().from("diagnoses").select("*").eq("id", diagnosisId).single();
  if (error) return null;
  return toDiagnosis(data as Record<string, unknown>);
}

// ── Bookings ──────────────────────────────────────────────────

export async function createBooking(params: {
  jobId: string;
  artisanId: string;
  quoteAmount: number;
}): Promise<Booking> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error || "Failed to create booking");
  }
  return res.json();
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const { data, error } = await db().from("bookings").select("*").eq("id", bookingId).single();
  if (error) return null;
  return toBooking(data as Record<string, unknown>);
}

// ── Escrow ────────────────────────────────────────────────────

/**
 * Performs an escrow state transition via a Postgres security-definer
 * function. Clients cannot call this directly — the RPC is the only
 * way to mutate escrow state.
 */
export async function performEscrowAction(
  bookingId: string,
  action: EscrowAction,
  note?: string
): Promise<Booking> {
  const supabase = db();
  const { data: { user } } = await supabase.auth.getUser();
  const actor = user ? "user" : "admin"; // refine per auth role

  const { data, error } = await supabase.rpc("perform_escrow_action", {
    p_booking_id: bookingId,
    p_action:     action,
    p_actor:      actor,
    p_note:       note ?? "",
  });
  if (error) throw new Error(error.message);
  return toBooking(data as Record<string, unknown>);
}

// ── Messages ──────────────────────────────────────────────────

export async function getMessages(jobId: string): Promise<Message[]> {
  const { data, error } = await db()
    .from("messages")
    .select("*")
    .eq("job_id", jobId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toMessage(r as Record<string, unknown>));
}

export async function sendMessage(
  jobId: string,
  text: string,
  senderType: Message["senderType"]
): Promise<Message> {
  const { data, error } = await db()
    .from("messages")
    .insert({ job_id: jobId, text, sender_type: senderType })
    .select()
    .single();
  if (error) throw error;
  return toMessage(data as Record<string, unknown>);
}

/** Subscribe to new messages – returns the Supabase realtime channel */
export function subscribeMessages(
  jobId: string,
  onMessage: (msg: Message) => void
) {
  return db()
    .channel(`messages:${jobId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `job_id=eq.${jobId}` },
      (payload) => onMessage(toMessage(payload.new as Record<string, unknown>))
    )
    .subscribe();
}

// ── Reviews ───────────────────────────────────────────────────

export async function saveReview(
  jobId: string,
  rating: number,
  comment: string
): Promise<Review> {
  const supabase = db();
  const { data: { user } } = await supabase.auth.getUser();
  const job = await supabase.from("job_requests").select("selected_artisan_id").eq("id", jobId).single();
  const artisanId = job.data?.selected_artisan_id;
  if (!artisanId) throw new Error("No artisan on this job");

  const { data, error } = await supabase
    .from("reviews")
    .upsert({ job_id: jobId, artisan_id: artisanId, user_id: user?.id, rating, comment })
    .select()
    .single();
  if (error) throw error;
  return toReview(data as Record<string, unknown>);
}

// ── Inventory ─────────────────────────────────────────────────

export async function getInventory(artisanId: string): Promise<InventoryItem[]> {
  const { data, error } = await db()
    .from("inventory_items")
    .select("*")
    .eq("artisan_id", artisanId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => toInventoryItem(r as Record<string, unknown>));
}

export async function addInventoryItem(params: {
  artisanId: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockAt: number;
}): Promise<InventoryItem> {
  const { data, error } = await db()
    .from("inventory_items")
    .insert({
      artisan_id:   params.artisanId,
      name:         params.name,
      quantity:     params.quantity,
      unit:         params.unit,
      low_stock_at: params.lowStockAt,
    })
    .select()
    .single();
  if (error) throw error;
  return toInventoryItem(data as Record<string, unknown>);
}

// ── Realtime subscriptions ────────────────────────────────────

/**
 * Subscribe to booking status changes.
 * Replace the demo "isabi-db-updated" event with this.
 */
export function subscribeBooking(
  bookingId: string,
  onUpdate: (booking: Booking) => void
) {
  return db()
    .channel(`booking:${bookingId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
      (payload) => onUpdate(toBooking(payload.new as Record<string, unknown>))
    )
    .subscribe();
}

// ── Full DB snapshot (for pages still using loadDb() pattern) ─

/**
 * Returns a iSabiDB-shaped snapshot for the current user.
 * Use this to migrate pages with minimal diff; refactor to
 * individual queries as you go.
 */
export async function loadUserDb(): Promise<iSabiDB | null> {
  const supabase = db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: users },
    { data: artisans },
    { data: jobs },
    { data: diagnoses },
    { data: bookings },
    { data: txns },
    { data: messages },
    { data: reviews },
    { data: disputes },
    { data: inventory },
    { data: config },
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id),
    supabase.from("artisans").select("*").eq("application_status", "approved"),
    supabase.from("job_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("diagnoses").select("*").eq("user_id", user.id),
    supabase.from("bookings").select("*").eq("user_id", user.id),
    supabase.from("escrow_transactions").select("*"),
    supabase.from("messages").select("*"),
    supabase.from("reviews").select("*"),
    supabase.from("disputes").select("*"),
    supabase.from("inventory_items").select("*"),
    supabase.from("platform_config").select("*").single(),
  ]);

  return {
    users:                (users ?? []).map((r) => toUser(r as Record<string, unknown>)),
    artisans:             (artisans ?? []).map((r) => toArtisan(r as Record<string, unknown>)),
    job_requests:         (jobs ?? []).map((r) => toJobRequest(r as Record<string, unknown>)),
    diagnoses:            (diagnoses ?? []).map((r) => toDiagnosis(r as Record<string, unknown>)),
    bookings:             (bookings ?? []).map((r) => toBooking(r as Record<string, unknown>)),
    escrow_transactions:  (txns ?? []).map((r) => ({
      id:          r.id as string,
      reference:   r.reference as string,
      bookingId:   r.booking_id as string,
      jobId:       r.job_id as string,
      action:      r.action as string,
      amount:      r.amount as number,
      userFee:     r.user_fee as number,
      artisanFee:  r.artisan_fee as number,
      platformFee: r.platform_fee as number,
      actor:       r.actor as string,
      note:        r.note as string,
      createdAt:   r.created_at as string,
    })) as iSabiDB["escrow_transactions"],
    messages:             (messages ?? []).map((r) => toMessage(r as Record<string, unknown>)),
    reviews:              (reviews ?? []).map((r) => toReview(r as Record<string, unknown>)),
    disputes:             (disputes ?? []).map((r) => ({
      id:         r.id as string,
      jobId:      r.job_id as string,
      bookingId:  r.booking_id as string,
      userId:     r.user_id as string,
      artisanId:  r.artisan_id as string,
      reason:     r.reason as string,
      status:     r.status as string,
      createdAt:  r.created_at as string,
    })) as iSabiDB["disputes"],
    inventory_items:      (inventory ?? []).map((r) => toInventoryItem(r as Record<string, unknown>)),
    platform_fee_balance: (config as Record<string, unknown>)?.fee_balance as number ?? 0,
  };
}
