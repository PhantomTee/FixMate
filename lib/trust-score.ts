import { Artisan, Review, JobRequest, Dispute } from "@/lib/types";

export type TrustBreakdown = {
  completedJobsScore: number; // 0–30
  verifiedIdScore: number;    // 0–20
  reviewRatingScore: number;  // 0–20
  disputeRateScore: number;   // 0–15
  responseSpeedScore: number; // 0–10
  profileScore: number;       // 0–5
  total: number;              // 0–100
  reasons: string[];
  avgRating: number;
};

export function calculateTrustScore(
  artisan: Artisan,
  jobs: JobRequest[],
  reviews: Review[],
  disputes: Dispute[]
): TrustBreakdown {
  const reasons: string[] = [];

  // 30% completed jobs (scales to 100 jobs = full score)
  const jobsScore = Math.min(30, Math.round((Math.min(artisan.completedJobs, 100) / 100) * 30));
  if (artisan.completedJobs >= 50) reasons.push(`${artisan.completedJobs} completed jobs`);
  else if (artisan.completedJobs > 0) reasons.push(`${artisan.completedJobs} jobs done`);

  // 20% verified identity
  const verifiedScore = artisan.isVerified ? 20 : 0;
  if (artisan.isVerified) reasons.push("Verified ID");

  // 20% review rating (average 1–5 stars)
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : artisan.rating ?? 3.5;
  const reviewScore = Math.round((avgRating / 5) * 20);
  if (reviews.length > 0) reasons.push(`${avgRating.toFixed(1)}★ avg rating (${reviews.length} reviews)`);
  else if (artisan.rating) reasons.push(`${artisan.rating.toFixed(1)}★ pre-seeded rating`);

  // 15% dispute rate (inverted: 0 disputes = full score)
  const relJobs = Math.max(artisan.completedJobs, 1);
  const disputeRate = disputes.length / relJobs;
  const disputeScore =
    disputeRate === 0 ? 15 : Math.max(0, Math.round(15 - disputeRate * 150));
  if (disputes.length === 0) reasons.push("Zero disputes");
  else reasons.push(`${disputes.length} dispute(s) on record`);

  // 10% response speed (demo: fixed at 8 = fast responder)
  const responseScore = artisan.emergencyAvailable ? 10 : 8;
  if (artisan.emergencyAvailable) reasons.push("Emergency available");

  // 5% profile completeness
  const profileFields = [
    artisan.phone,
    artisan.opayPhone,
    artisan.verificationId,
    artisan.location,
    artisan.skills?.length > 0,
    artisan.yearsExperience > 0,
  ];
  const profileScore = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 5);
  if (profileScore >= 4) reasons.push("Complete profile");

  const total = Math.min(
    100,
    jobsScore + verifiedScore + reviewScore + disputeScore + responseScore + profileScore
  );

  return {
    completedJobsScore: jobsScore,
    verifiedIdScore: verifiedScore,
    reviewRatingScore: reviewScore,
    disputeRateScore: disputeScore,
    responseSpeedScore: responseScore,
    profileScore,
    total,
    reasons,
    avgRating,
  };
}

export const TRUST_TIERS = [
  { min: 90, label: "Elite", color: "text-green-700 bg-green-100" },
  { min: 75, label: "Trusted", color: "text-blue-700 bg-blue-100" },
  { min: 60, label: "Good", color: "text-yellow-700 bg-yellow-100" },
  { min: 0, label: "New", color: "text-gray-700 bg-gray-100" },
] as const;

export function getTrustTier(score: number) {
  return TRUST_TIERS.find((t) => score >= t.min) ?? TRUST_TIERS[TRUST_TIERS.length - 1];
}

export const TRUST_SCORE_WEIGHTS = [
  { label: "Completed Jobs", weight: "30%", hint: "Scales to 100 jobs" },
  { label: "Verified Identity", weight: "20%", hint: "NIN / ID uploaded" },
  { label: "Review Rating", weight: "20%", hint: "Average star rating" },
  { label: "Dispute Rate", weight: "15%", hint: "Lower = better" },
  { label: "Response Speed", weight: "10%", hint: "Emergency availability" },
  { label: "Profile Complete", weight: "5%", hint: "All fields filled" },
];
