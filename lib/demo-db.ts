"use client";

import {
  Artisan,
  ArtisanCategory,
  Booking,
  DiagnosisRecord,
  Dispute,
  EscrowAction,
  EscrowTransaction,
  FixMateDB,
  InventoryItem,
  JobDiagnosis,
  JobRequest,
  JobStatus,
  Review,
  User,
} from "@/lib/types";

const STORAGE_KEY = "fixmate_mvp_db_v3";
const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const money = (value: number) => Math.max(0, Math.round(value));

export const DEMO_USER_ID = "user-demo-1";

export function opayReference(sequence: number) {
  return `OPAY-FIX-2026-${String(sequence).padStart(4, "0")}`;
}

// Lagos areas used for demo location matching
export const LAGOS_AREAS = [
  "Yaba", "Ikeja", "Surulere", "Lekki", "Gbagada",
  "Victoria Island", "Ikoyi", "Ajah", "Agege", "Ogba",
  "Mushin", "Festac", "Ikorodu", "Oshodi", "Berger",
];

export function seedDb(): FixMateDB {
  const createdAt = now();
  const users: User[] = [
    {
      id: DEMO_USER_ID,
      name: "Chukwudi Eze",
      phone: "08030000001",
      location: "Yaba, Lagos",
      user_wallet_balance: 250000,
      escrow_balance: 0,
      createdAt,
    },
  ];

  const artisans: Artisan[] = (
    [
      ["artisan-1", "Opeyemi Ahmed",   "AC Repair",        "Ikeja, Lagos",          96, 45,  true,  "https://i.pravatar.cc/150?img=11", true,  ["Ikeja", "Ogba", "Agege"]],
      ["artisan-2", "Chinedu Okafor",  "Plumber",           "Surulere, Lagos",       92, 112, true,  "https://i.pravatar.cc/150?img=12", false, ["Surulere", "Yaba", "Mushin"]],
      ["artisan-3", "Emeka Johnson",   "Generator Repair",  "Lekki, Lagos",          94, 210, true,  "https://i.pravatar.cc/150?img=14", true,  ["Lekki", "Ajah", "Victoria Island"]],
      ["artisan-4", "Ibrahim Musa",    "Electrician",       "Gbagada, Lagos",        83, 34,  false, "https://i.pravatar.cc/150?img=15", false, ["Gbagada", "Agege"]],
      ["artisan-5", "Aisha Bello",     "Cleaning",          "Victoria Island, Lagos",98, 300, true,  "https://i.pravatar.cc/150?img=9",  false, ["Victoria Island", "Ikoyi", "Lekki"]],
      ["artisan-6", "Mercy Adeyemi",   "Tailor",            "Ikeja, Lagos",          95, 211, true,  "https://i.pravatar.cc/150?img=44", false, ["Ikeja", "Agege", "Ogba"]],
    ] as const
  ).map(([artisanId, fullName, category, location, trustScore, completedJobs, verified, avatar, emergency, areas]) => ({
    id: artisanId as string,
    fullName: fullName as string,
    phone: "08090000000",
    category: category as ArtisanCategory,
    location: location as string,
    yearsExperience: 5,
    verificationId: "NIN placeholder uploaded",
    skills: [category as string, "Diagnostics", "Emergency support"],
    serviceRadiusKm: 12,
    opayPhone: "08090000000",
    trustScore: trustScore as number,
    completedJobs: completedJobs as number,
    isVerified: verified as boolean,
    applicationStatus: (verified ? "approved" : "pending") as "approved" | "pending",
    artisan_pending_balance: 0,
    artisan_available_balance: 0,
    avatar: avatar as string,
    emergencyAvailable: emergency as boolean,
    serviceAreas: [...areas] as string[],
    rating: 4.5,
    createdAt,
  }));

  const diagnosis: DiagnosisRecord = {
    id: "diag-demo-1",
    jobId: "job-demo-1",
    userId: DEMO_USER_ID,
    issue_title: "AC dripping water and blowing warm air",
    summary: "Likely blocked drain line or low refrigerant. The artisan should inspect drainage, filters, and compressor performance.",
    artisan_category: "AC Repair",
    urgency: "Medium",
    estimated_min_naira: 18000,
    estimated_max_naira: 32000,
    estimated_labor_naira: 12000,
    estimated_materials_naira: 20000,
    safety_warning: "Switch off the AC if water is touching sockets or extension boxes.",
    first_aid_steps: ["Turn off the AC unit.", "Keep the area dry.", "Do not open the outdoor unit yourself."],
    follow_up_questions: ["When did it start dripping?", "Has the AC been serviced this year?"],
    artisan_brief: {
      problem_summary: "AC dripping water, not cooling properly",
      likely_cause: "Blocked condensate drain or low refrigerant gas",
      tools_to_bring: ["Refrigerant (R22/R410A)", "Drain cleaning kit", "Multimeter", "Manifold gauge"],
      safety_risks: ["Electrical shock if water near sockets", "Refrigerant exposure"],
      estimated_price_range: "₦18,000 – ₦32,000",
    },
    createdAt,
  };

  const job: JobRequest = {
    id: "job-demo-1",
    userId: DEMO_USER_ID,
    description: "My AC is dripping water and not cooling well.",
    imageProvided: false,
    location: "Yaba, Lagos",
    diagnosisId: diagnosis.id,
    selectedArtisanId: "artisan-1",
    bookingId: "booking-demo-1",
    status: "escrow_funded",
    createdAt,
    updatedAt: createdAt,
  };

  const booking: Booking = {
    id: "booking-demo-1",
    jobId: job.id,
    userId: DEMO_USER_ID,
    artisanId: "artisan-1",
    quoteAmount: 32000,
    userFee: 640,      // 2% user-side fee
    artisanFee: 3200,  // 10% platform fee deducted from artisan payout
    totalCharge: 32640,
    escrowStatus: "funded",
    opayReference: opayReference(1),
    createdAt,
    updatedAt: createdAt,
  };

  users[0].user_wallet_balance -= booking.totalCharge;
  users[0].escrow_balance = booking.quoteAmount;

  const inventoryItems: InventoryItem[] = [
    { id: "inv-1", artisanId: "artisan-1", name: "R22 AC Gas",        quantity: 1,  unit: "Cylinder", lowStockAt: 2, createdAt },
    { id: "inv-2", artisanId: "artisan-1", name: "Drain hose",         quantity: 8,  unit: "Meters",   lowStockAt: 3, createdAt },
    { id: "inv-3", artisanId: "artisan-1", name: "AC capacitor",       quantity: 3,  unit: "pcs",      lowStockAt: 2, createdAt },
    { id: "inv-4", artisanId: "artisan-2", name: "PVC pipe 1/2 inch",  quantity: 15, unit: "Meters",   lowStockAt: 5, createdAt },
    { id: "inv-5", artisanId: "artisan-2", name: "Pipe sealing tape",  quantity: 2,  unit: "Rolls",    lowStockAt: 3, createdAt },
    { id: "inv-6", artisanId: "artisan-3", name: "Spark plug",         quantity: 4,  unit: "pcs",      lowStockAt: 2, createdAt },
    { id: "inv-7", artisanId: "artisan-3", name: "Engine oil 5L",      quantity: 1,  unit: "Can",      lowStockAt: 2, createdAt },
    { id: "inv-8", artisanId: "artisan-3", name: "Carburetor cleaner", quantity: 0,  unit: "Can",      lowStockAt: 1, createdAt },
  ];

  return {
    users,
    artisans,
    job_requests: [job],
    diagnoses: [diagnosis],
    bookings: [booking],
    escrow_transactions: [
      {
        id: "txn-demo-1",
        reference: booking.opayReference,
        bookingId: booking.id,
        jobId: job.id,
        action: "fund_escrow",
        amount: booking.quoteAmount,
        userFee: booking.userFee,
        artisanFee: 0,
        platformFee: booking.userFee,
        actor: "user",
        note: "Demo user funded simulated OPay escrow.",
        createdAt,
      },
    ],
    messages: [
      { id: "msg-demo-1", jobId: job.id, senderType: "artisan", text: "Good afternoon. I can check the drain line today, around 2pm.", timestamp: createdAt },
      { id: "msg-demo-2", jobId: job.id, senderType: "user",    text: "Okay, I'll be home. Please bring the gas if you think it needs refilling.", timestamp: createdAt },
    ],
    reviews: [],
    disputes: [],
    inventory_items: inventoryItems,
    platform_fee_balance: booking.userFee,
  };
}

export function loadDb(): FixMateDB {
  if (typeof window === "undefined") return seedDb();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as FixMateDB;
    return parsed.users?.length && parsed.artisans?.length ? parsed : seedDb();
  } catch {
    return seedDb();
  }
}

export function saveDb(db: FixMateDB) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new Event("fixmate-db-updated"));
  }
}

export function resetDemoDb() {
  const db = seedDb();
  saveDb(db);
  return db;
}

export function createJobWithDiagnosis(input: {
  description: string;
  imageProvided: boolean;
  location: string;
  diagnosis: JobDiagnosis;
}) {
  const db = loadDb();
  const jobId = uid("job");
  const diagnosisId = uid("diag");
  const createdAt = now();
  const diagnosis: DiagnosisRecord = {
    ...input.diagnosis,
    id: diagnosisId,
    jobId,
    userId: DEMO_USER_ID,
    createdAt,
  };
  const job: JobRequest = {
    id: jobId,
    userId: DEMO_USER_ID,
    description: input.description,
    imageProvided: input.imageProvided,
    location: input.location,
    diagnosisId,
    status: "diagnosed",
    createdAt,
    updatedAt: createdAt,
  };
  db.diagnoses.unshift(diagnosis);
  db.job_requests.unshift(job);
  saveDb(db);
  return { db, job, diagnosis };
}

// Improved artisan matching — category + verified + trust + location + emergency + jobs
export function matchArtisans(db: FixMateDB, category: ArtisanCategory, location: string) {
  const locationText = location.toLowerCase().split(",")[0].trim();
  return [...db.artisans]
    .filter((a) => a.applicationStatus === "approved")
    .map((a) => {
      let score = 0;
      if (a.category === category) score += 1000;
      if (a.isVerified) score += 200;
      score += a.trustScore;
      score += a.completedJobs * 0.2;
      if (locationText && a.location.toLowerCase().includes(locationText)) score += 150;
      if (locationText && a.serviceAreas?.some((area) => area.toLowerCase().includes(locationText))) score += 100;
      if (a.emergencyAvailable) score += 50;
      return { artisan: a, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ artisan }) => artisan);
}

export function getMatchReason(artisan: Artisan, category: ArtisanCategory, location: string): string {
  const parts: string[] = [];
  if (artisan.category === category) parts.push(artisan.category);
  if (artisan.isVerified) parts.push("verified");
  parts.push(`${artisan.trustScore}% trust`);
  const locationText = location.split(",")[0].trim();
  if (artisan.location.toLowerCase().includes(locationText.toLowerCase()) ||
      artisan.serviceAreas?.some((a) => a.toLowerCase().includes(locationText.toLowerCase()))) {
    parts.push(`serves ${locationText}`);
  }
  if (artisan.emergencyAvailable) parts.push("emergency available");
  return `Matched: ${parts.join(", ")}.`;
}

export function createBooking(jobId: string, artisanId: string, quoteAmount: number) {
  const db = loadDb();
  const job = db.job_requests.find((item) => item.id === jobId);
  if (!job) throw new Error("Job not found");
  const createdAt = now();
  const userFee = money(quoteAmount * 0.02);   // 2% charged to user
  const artisanFee = money(quoteAmount * 0.1); // 10% deducted from artisan payout
  const booking: Booking = {
    id: uid("booking"),
    jobId,
    userId: DEMO_USER_ID,
    artisanId,
    quoteAmount: money(quoteAmount),
    userFee,
    artisanFee,
    totalCharge: money(quoteAmount + userFee),
    escrowStatus: "not_funded",
    opayReference: opayReference(db.escrow_transactions.length + 1),
    createdAt,
    updatedAt: createdAt,
  };
  job.selectedArtisanId = artisanId;
  job.bookingId = booking.id;
  job.status = "booking_created";
  job.updatedAt = createdAt;
  db.bookings.unshift(booking);
  saveDb(db);
  return { db, booking };
}

function addTx(
  db: FixMateDB,
  booking: Booking,
  action: EscrowAction,
  amount: number,
  actor: "user" | "artisan" | "admin",
  note: string,
  userFee = 0,
  artisanFee = 0,
  platformFee = 0
) {
  const tx: EscrowTransaction = {
    id: uid("txn"),
    reference: booking.opayReference,
    bookingId: booking.id,
    jobId: booking.jobId,
    action,
    amount: money(amount),
    userFee: money(userFee),
    artisanFee: money(artisanFee),
    platformFee: money(platformFee),
    actor,
    note,
    createdAt: now(),
  };
  db.escrow_transactions.unshift(tx);
}

// ─── STRICT ESCROW STATE MACHINE ─────────────────────────────────────────────
//
// Valid transitions:
//   not_funded  ──[fund_escrow]──►  funded
//   funded      ──[artisan_accept]──► accepted    (ARTISAN CANNOT ACCEPT BEFORE FUNDING)
//   funded      ──[artisan_decline]──► refunded   (auto-refund if escrow was funded)
//   accepted    ──[mark_in_progress]──► in_progress
//   in_progress ──[mark_completed]──► completed
//   accepted    ──[mark_completed]──► completed   (skip in_progress allowed for demo speed)
//   completed   ──[user_release]──► released      (USER CANNOT RELEASE BEFORE ARTISAN COMPLETES)
//   funded/accepted/in_progress/completed ──[open_dispute]──► disputed
//   disputed    ──[admin_refund]──► refunded
//   disputed    ──[admin_release]──► released
//   completed   ──[admin_release]──► released
//   funded/accepted/in_progress/completed/disputed ──[admin_refund]──► refunded
// ─────────────────────────────────────────────────────────────────────────────
export function escrowAction(bookingId: string, action: EscrowAction, note = "") {
  const db = loadDb();
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error("Booking not found");
  const job = db.job_requests.find((j) => j.id === booking.jobId);
  const user = db.users.find((u) => u.id === booking.userId);
  const artisan = db.artisans.find((a) => a.id === booking.artisanId);
  if (!job || !user || !artisan) throw new Error("Linked record not found");

  const stamp = now();
  const setJob = (status: JobStatus) => {
    job.status = status;
    job.updatedAt = stamp;
    booking.updatedAt = stamp;
  };

  // ── Fund escrow ──────────────────────────────────────────────────────────
  if (action === "fund_escrow" && booking.escrowStatus === "not_funded") {
    if (user.user_wallet_balance < booking.totalCharge) {
      throw new Error("Insufficient wallet balance to fund escrow");
    }
    user.user_wallet_balance = money(user.user_wallet_balance - booking.totalCharge);
    user.escrow_balance = money(user.escrow_balance + booking.quoteAmount);
    db.platform_fee_balance = money(db.platform_fee_balance + booking.userFee);
    booking.escrowStatus = "funded";
    setJob("escrow_funded");
    addTx(db, booking, action, booking.quoteAmount, "user",
      "User funded simulated OPay escrow. Artisan notified.", booking.userFee, 0, booking.userFee);
  }

  // ── Artisan accept — REQUIRES funded escrow ──────────────────────────────
  if (action === "artisan_accept") {
    if (booking.escrowStatus !== "funded") {
      throw new Error("Artisan cannot accept until escrow is funded by the customer.");
    }
    booking.escrowStatus = "accepted";
    artisan.artisan_pending_balance = money(artisan.artisan_pending_balance + booking.quoteAmount);
    setJob("artisan_accepted");
    addTx(db, booking, action, 0, "artisan", note || "Artisan accepted the job. En route.");
  }

  // ── Artisan decline ──────────────────────────────────────────────────────
  if (action === "artisan_decline") {
    if (booking.escrowStatus === "funded") {
      // Auto-refund since artisan declined after escrow was funded
      user.escrow_balance = money(user.escrow_balance - booking.quoteAmount);
      user.user_wallet_balance = money(user.user_wallet_balance + booking.quoteAmount);
      db.platform_fee_balance = money(db.platform_fee_balance - booking.userFee);
      booking.escrowStatus = "refunded";
      setJob("refunded");
      addTx(db, booking, action, booking.quoteAmount, "artisan",
        "Artisan declined. Escrow auto-refunded to user wallet.", booking.userFee);
    } else {
      setJob("declined");
      addTx(db, booking, action, 0, "artisan", "Artisan declined the job (escrow not yet funded).");
    }
  }

  // ── Mark in progress ─────────────────────────────────────────────────────
  if (action === "mark_in_progress" && booking.escrowStatus === "accepted") {
    booking.escrowStatus = "in_progress";
    setJob("in_progress");
    addTx(db, booking, action, 0, "artisan", note || "Artisan started work. Job is in progress.");
  }

  // ── Artisan marks completed ──────────────────────────────────────────────
  if (action === "mark_completed" && ["accepted", "in_progress"].includes(booking.escrowStatus)) {
    booking.escrowStatus = "completed";
    setJob("artisan_completed");
    addTx(db, booking, action, 0, "artisan", note || "Artisan marked job completed. Awaiting user confirmation.");
  }

  // ── User releases funds — REQUIRES artisan_completed ────────────────────
  if (action === "user_release") {
    if (booking.escrowStatus !== "completed") {
      throw new Error("Funds can only be released after the artisan marks the job as completed.");
    }
    const netPayout = money(booking.quoteAmount - booking.artisanFee);
    user.escrow_balance = money(user.escrow_balance - booking.quoteAmount);
    artisan.artisan_pending_balance = money(artisan.artisan_pending_balance - booking.quoteAmount);
    artisan.artisan_available_balance = money(artisan.artisan_available_balance + netPayout);
    artisan.completedJobs += 1;
    artisan.trustScore = Math.min(100, artisan.trustScore + 1);
    db.platform_fee_balance = money(db.platform_fee_balance + booking.artisanFee);
    booking.escrowStatus = "released";
    setJob("released");
    addTx(db, booking, action, netPayout, "user",
      note || "User confirmed job complete. Funds released to artisan.",
      0, booking.artisanFee, booking.artisanFee);
  }

  // ── Admin release (dispute resolution) ──────────────────────────────────
  if (action === "admin_release" && ["completed", "disputed", "in_progress", "accepted"].includes(booking.escrowStatus)) {
    const netPayout = money(booking.quoteAmount - booking.artisanFee);
    user.escrow_balance = money(user.escrow_balance - booking.quoteAmount);
    artisan.artisan_pending_balance = money(artisan.artisan_pending_balance - booking.quoteAmount);
    artisan.artisan_available_balance = money(artisan.artisan_available_balance + netPayout);
    artisan.completedJobs += 1;
    db.platform_fee_balance = money(db.platform_fee_balance + booking.artisanFee);
    booking.escrowStatus = "released";
    setJob("released");
    db.disputes.filter((d) => d.bookingId === booking.id && d.status === "open")
      .forEach((d) => (d.status = "resolved_release"));
    addTx(db, booking, action, netPayout, "admin",
      note || "Admin released disputed escrow to artisan.", 0, booking.artisanFee, booking.artisanFee);
  }

  // ── Open dispute ─────────────────────────────────────────────────────────
  if (action === "open_dispute" &&
    ["funded", "accepted", "in_progress", "completed"].includes(booking.escrowStatus)) {
    booking.escrowStatus = "disputed";
    setJob("disputed");
    const dispute: Dispute = {
      id: uid("dispute"),
      jobId: booking.jobId,
      bookingId: booking.id,
      userId: booking.userId,
      artisanId: booking.artisanId,
      reason: note || "Customer opened a dispute for admin review.",
      status: "open",
      createdAt: stamp,
    };
    db.disputes.unshift(dispute);
    addTx(db, booking, action, 0, "user", dispute.reason);
  }

  // ── Admin refund ─────────────────────────────────────────────────────────
  if (action === "admin_refund" &&
    ["funded", "accepted", "in_progress", "completed", "disputed"].includes(booking.escrowStatus)) {
    user.escrow_balance = money(user.escrow_balance - booking.quoteAmount);
    user.user_wallet_balance = money(user.user_wallet_balance + booking.quoteAmount);
    if (artisan.artisan_pending_balance >= booking.quoteAmount) {
      artisan.artisan_pending_balance = money(artisan.artisan_pending_balance - booking.quoteAmount);
    }
    booking.escrowStatus = "refunded";
    setJob("refunded");
    db.disputes.filter((d) => d.bookingId === booking.id && d.status === "open")
      .forEach((d) => (d.status = "resolved_refund"));
    addTx(db, booking, action, booking.quoteAmount, "admin",
      note || "Admin refunded escrow to user after review.");
  }

  saveDb(db);
  return db;
}

export function saveMessage(jobId: string, senderType: "user" | "artisan", text: string) {
  const db = loadDb();
  db.messages.push({ id: uid("msg"), jobId, senderType, text, timestamp: now() });
  saveDb(db);
  return db;
}

export function saveReview(jobId: string, rating: number, comment: string) {
  const db = loadDb();
  const job = db.job_requests.find((j) => j.id === jobId);
  if (!job?.selectedArtisanId) return db;
  const review: Review = {
    id: uid("review"),
    jobId,
    artisanId: job.selectedArtisanId,
    userId: DEMO_USER_ID,
    rating,
    comment,
    createdAt: now(),
  };
  db.reviews.unshift(review);
  const artisan = db.artisans.find((a) => a.id === job.selectedArtisanId);
  if (artisan) {
    const artisanReviews = db.reviews.filter((r) => r.artisanId === artisan.id);
    artisan.rating = artisanReviews.reduce((sum, r) => sum + r.rating, 0) / artisanReviews.length;
  }
  saveDb(db);
  return db;
}

export function saveArtisanApplication(
  input: Omit<Artisan, "id" | "trustScore" | "completedJobs" | "isVerified" | "applicationStatus" | "artisan_pending_balance" | "artisan_available_balance" | "avatar" | "createdAt">
) {
  const db = loadDb();
  const artisan: Artisan = {
    ...input,
    id: uid("artisan"),
    trustScore: 60,
    completedJobs: 0,
    isVerified: false,
    applicationStatus: "pending",
    artisan_pending_balance: 0,
    artisan_available_balance: 0,
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(input.phone)}`,
    createdAt: now(),
  };
  db.artisans.unshift(artisan);
  saveDb(db);
  return { db, artisan };
}

export function updateArtisan(artisanId: string, patch: Partial<Artisan>) {
  const db = loadDb();
  const artisan = db.artisans.find((a) => a.id === artisanId);
  if (artisan) Object.assign(artisan, patch);
  saveDb(db);
  return db;
}

export function saveInventoryItem(input: Omit<InventoryItem, "id" | "createdAt">) {
  const db = loadDb();
  db.inventory_items.unshift({ ...input, id: uid("inv"), createdAt: now() });
  saveDb(db);
  return db;
}

// Suggested inventory items per category (used for inventory intelligence)
export const CATEGORY_INVENTORY: Partial<Record<string, string[]>> = {
  "AC Repair":        ["R22 AC Gas", "R410A Gas", "Drain hose", "AC capacitor", "Air filter"],
  "Generator Repair": ["Spark plug", "Engine oil", "Fuel hose", "Carburetor cleaner", "AVR module"],
  "Plumber":          ["PVC pipe 1/2in", "PVC pipe 1in", "Pipe tape", "Ball valve", "Elbow joint"],
  "Electrician":      ["Cable 2.5mm", "Cable 4mm", "MCB breaker", "Socket face plate", "Electrical tape"],
  "Carpenter":        ["Wood screws", "Sandpaper 80g", "Wood glue", "Hinges", "Wood filler"],
  "Painter":          ["Emulsion paint", "Gloss paint", "Paint roller", "Masking tape", "Primer"],
};
