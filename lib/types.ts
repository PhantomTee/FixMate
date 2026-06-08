export const ARTISAN_CATEGORIES = [
  "Plumber",
  "Electrician",
  "AC Repair",
  "Tailor",
  "Generator Repair",
  "Cleaning",
  "Shoemaker",
  "Vulcanizer",
  "Carpenter",
  "Painter",
  "Mechanic",
  "Hair Stylist",
  "Other",
] as const;

export type ArtisanCategory = (typeof ARTISAN_CATEGORIES)[number];
export type Urgency = "High" | "Medium" | "Low";
export type SenderType = "user" | "artisan" | "admin";
export type DemoRole = "user" | "artisan" | "admin";
export type SupportedLanguage = "English" | "Pidgin" | "Yoruba" | "Hausa" | "Igbo";

export type OPayPaymentStatus =
  | "initiated"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "released"
  | "refunded";

export type OPayPayment = {
  reference: string;
  bookingId: string;
  amount: number;
  phone: string;
  status: OPayPaymentStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  webhookPayload?: Record<string, unknown>;
};

export type JobStatus =
  | "diagnosed"
  | "booking_created"
  | "payment_pending"
  | "escrow_funded"
  | "artisan_accepted"
  | "in_progress"
  | "artisan_completed"
  | "released"
  | "disputed"
  | "refunded"
  | "declined"
  // kept for backwards-compat with seeded demo data
  | "completed";

export type EscrowStatus =
  | "not_funded"
  | "payment_pending"
  | "funded"
  | "accepted"
  | "in_progress"
  | "completed"
  | "released"
  | "disputed"
  | "refunded";

export type EscrowAction =
  | "fund_escrow"
  | "artisan_accept"
  | "artisan_decline"
  | "mark_in_progress"
  | "mark_completed"
  | "user_release"
  | "open_dispute"
  | "admin_refund"
  | "admin_release"
  | "trust_adjustment";

export type ArtisanBrief = {
  problem_summary: string;
  likely_cause: string;
  tools_to_bring: string[];
  safety_risks: string[];
  estimated_price_range: string;
};

export type QuoteFairness = {
  verdict: "fair" | "high_but_explainable" | "suspiciously_high" | "too_low";
  explanation: string;
  recommended_range: string;
};

export type DisputeSummary = {
  user_complaint: string;
  artisan_status: string;
  payment_state: string;
  recommended_action: "refund" | "release" | "partial_refund" | "request_evidence";
  reasoning: string;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  location: string;
  user_wallet_balance: number;
  escrow_balance: number;
  createdAt: string;
};

export type Artisan = {
  id: string;
  fullName: string;
  phone: string;
  category: ArtisanCategory;
  location: string;
  yearsExperience: number;
  verificationId: string;
  skills: string[];
  serviceRadiusKm: number;
  opayPhone: string;
  trustScore: number;
  completedJobs: number;
  isVerified: boolean;
  applicationStatus: "pending" | "approved" | "rejected";
  artisan_pending_balance: number;
  artisan_available_balance: number;
  avatar: string;
  emergencyAvailable?: boolean;
  serviceAreas?: string[];
  rating?: number;
  createdAt: string;
};

export type ArtisanData = {
  id: string;
  name: string;
  category: string;
  location: string;
  lat?: number;
  lng?: number;
  score: number;
  rate: string;
  avatar: string;
  completedJobs: number;
  isVerified: boolean;
};

export type JobDiagnosis = {
  issue_title: string;
  summary: string;
  artisan_category: ArtisanCategory;
  urgency: Urgency;
  estimated_min_naira: number;
  estimated_max_naira: number;
  estimated_labor_naira: number;
  estimated_materials_naira: number;
  safety_warning: string | null;
  first_aid_steps: string[];
  follow_up_questions: string[];
  artisan_brief?: ArtisanBrief;
  language?: SupportedLanguage;
  error?: string;
};

export type JobRequest = {
  id: string;
  userId: string;
  description: string;
  imageProvided: boolean;
  location: string;
  diagnosisId: string;
  selectedArtisanId?: string;
  bookingId?: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
};

export type DiagnosisRecord = JobDiagnosis & {
  id: string;
  jobId: string;
  userId: string;
  createdAt: string;
};

export type Booking = {
  id: string;
  jobId: string;
  userId: string;
  artisanId: string;
  quoteAmount: number;
  userFee: number;
  artisanFee: number;
  totalCharge: number;
  escrowStatus: EscrowStatus;
  opayReference: string;
  createdAt: string;
  updatedAt: string;
};

export type EscrowTransaction = {
  id: string;
  reference: string;
  bookingId: string;
  jobId: string;
  action: EscrowAction;
  amount: number;
  userFee: number;
  artisanFee: number;
  platformFee: number;
  actor: SenderType;
  note: string;
  createdAt: string;
};

export type Message = {
  id: string;
  jobId: string;
  senderType: SenderType;
  text: string;
  timestamp: string;
};

export type Review = {
  id: string;
  jobId: string;
  artisanId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type Dispute = {
  id: string;
  jobId: string;
  bookingId: string;
  userId: string;
  artisanId: string;
  reason: string;
  status: "open" | "resolved_refund" | "resolved_release";
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  artisanId: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockAt: number;
  createdAt: string;
};

export type FixMateDB = {
  users: User[];
  artisans: Artisan[];
  job_requests: JobRequest[];
  diagnoses: DiagnosisRecord[];
  bookings: Booking[];
  escrow_transactions: EscrowTransaction[];
  messages: Message[];
  reviews: Review[];
  disputes: Dispute[];
  inventory_items: InventoryItem[];
  platform_fee_balance: number;
};
