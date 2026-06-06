export type ArtisanData = {
  id: string;
  name: string;
  category: string;
  location: string;
  score: number;
  rate: string;
  avatar: string;
  completedJobs: number;
  isVerified: boolean;
};

export type JobDiagnosis = {
  issue_title?: string;
  artisan_category?: string;
  urgency?: "High" | "Medium" | "Low";
  estimated_cost_naira?: string;
  safety_warning?: string | null;
  follow_up_questions?: string[];
  error?: string;
};
