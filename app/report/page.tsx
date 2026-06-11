"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { diagnoseIssue } from "@/app/actions";
import LocationInput from "@/components/LocationInput";
import { createBooking, createJob } from "@/lib/api";
import { Artisan, DiagnosisRecord, JobRequest, SupportedLanguage } from "@/lib/types";
import { useiSabiStore } from "@/lib/store";

const naira = (v: number) => `₦${v.toLocaleString()}`;
const LANGUAGES: SupportedLanguage[] = ["English", "Pidgin", "Yoruba", "Hausa", "Igbo"];

const URGENCY_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high:     "bg-orange-100 text-orange-700",
  medium:   "bg-yellow-100 text-yellow-700",
  low:      "bg-gray-100 text-gray-600",
};

export default function ReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setDiagnosisState = useiSabiStore((s) => s.setDiagnosis);
  const setSelectedArtisan = useiSabiStore((s) => s.setSelectedArtisan);
  const setActiveJobId = useiSabiStore((s) => s.setActiveJobId);

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState<SupportedLanguage>("English");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisRecord | null>(null);
  const [job, setJob] = useState<JobRequest | null>(null);
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [bookingError, setBookingError] = useState("");
  const [analyzeError, setAnalyzeError] = useState("");

  // Prefill location from user profile
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user?: { location?: string } | null }) => {
        if (data.user?.location) setLocation(data.user.location);
      })
      .catch(() => {});
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!description.trim() && !imagePreview) return;
    setIsAnalyzing(true);
    setAnalyzeError("");
    try {
      const result = await diagnoseIssue(description, imagePreview, language);

      // Create job + diagnosis in Supabase
      const { job: savedJob, diagnosis: savedDiagnosis } = await createJob({
        description,
        location,
        imageProvided: Boolean(imagePreview),
        diagnosis: result,
      });

      setDiagnosisResult(savedDiagnosis);
      setJob(savedJob);
      setDiagnosisState(result);
      setActiveJobId(savedJob.id);

      // Fetch matched artisans from real API
      const params = new URLSearchParams({
        match: "true",
        category: result.artisan_category,
        location,
      });
      const res = await fetch(`/api/artisans?${params}`);
      const matched: Artisan[] = res.ok ? await res.json() : [];
      setArtisans(matched.slice(0, 3));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBook = async (artisan: Artisan) => {
    if (!job || !diagnosisResult) return;
    setBookingError("");
    try {
      const booking = await createBooking({
        jobId: job.id,
        artisanId: artisan.id,
        quoteAmount: diagnosisResult.estimated_max_naira,
      });
      setSelectedArtisan(artisan);
      setActiveJobId(job.id);
      router.push(`/booking?bookingId=${booking.id}`);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to create booking.");
    }
  };

  const reset = () => {
    setDiagnosisResult(null);
    setJob(null);
    setArtisans([]);
    setImagePreview(null);
    setDescription("");
    setBookingError("");
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Page header */}
      <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-950 text-sm font-black tracking-wide transition-colors">← Home</Link>
        <span className="text-gray-200">/</span>
        <span className="text-sm font-black text-gray-950 tracking-tight">Post a Job</span>
      </div>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {!diagnosisResult ? (
          /* ── INPUT FORM ── */
          <div className="space-y-6 animate-fade-in-up">
            <div>
              <h1 className="text-[clamp(1.8rem,6vw,2.8rem)] font-black leading-tight tracking-tight text-gray-950 mb-2">
                What needs fixing?
              </h1>
              <p className="text-gray-500 text-sm">Describe the issue or upload a photo. Gemini will triage it instantly.</p>
            </div>

            {/* Photo upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 p-6 text-center hover:border-green-600 hover:bg-green-50/50 transition-colors group"
            >
              {imagePreview
                ? <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto object-contain" />
                : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">📷</span>
                    <span className="text-sm font-semibold text-gray-500 group-hover:text-green-700">Tap to add a photo</span>
                    <span className="text-xs text-gray-400">Optional — helps Gemini diagnose faster</span>
                  </div>
                )
              }
            </button>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none h-28 text-sm placeholder:text-gray-400"
              placeholder="e.g. My generator is smoking and smells like fuel…"
            />

            {/* Location */}
            <div>
              <LocationInput
                label="Your Location"
                value={location}
                onChange={setLocation}
                placeholder="e.g. Yaba, Lagos"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
              />
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Language</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 text-xs font-black border transition-colors ${
                      language === lang
                        ? "bg-green-700 text-white border-green-700"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-950"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!description.trim() && !imagePreview)}
              className="w-full py-4 bg-green-700 text-white font-black text-base hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isAnalyzing && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isAnalyzing ? "Analyzing…" : "Analyze with Gemini →"}
            </button>

            {analyzeError && (
              <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
                {analyzeError}
              </div>
            )}
          </div>

        ) : (
          /* ── RESULTS ── */
          <div className="space-y-6 animate-fade-in-up">

            {/* Diagnosis card */}
            <div className="border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-6 w-6 items-center justify-center bg-green-700 text-[9px] font-black text-white">AI</span>
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Gemini Diagnosis</span>
                {diagnosisResult.urgency && (
                  <span className={`ml-auto text-[10px] font-black uppercase px-2 py-0.5 ${URGENCY_COLOR[diagnosisResult.urgency] ?? "bg-gray-100 text-gray-600"}`}>
                    {diagnosisResult.urgency}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-black text-gray-950 tracking-tight mb-1">{diagnosisResult.issue_title}</h2>
              <p className="text-sm text-gray-500 mb-4">{diagnosisResult.summary}</p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estimate</p>
                  <p className="text-base font-black text-gray-950 mt-0.5">{naira(diagnosisResult.estimated_min_naira)} – {naira(diagnosisResult.estimated_max_naira)}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</p>
                  <p className="text-base font-black text-gray-950 mt-0.5">{diagnosisResult.artisan_category}</p>
                </div>
              </div>

              {diagnosisResult.safety_warning && (
                <div className="border-l-4 border-red-500 bg-red-50 px-3 py-2 mb-4">
                  <p className="text-xs font-semibold text-red-800">{diagnosisResult.safety_warning}</p>
                </div>
              )}

              <details className="text-xs">
                <summary className="font-black text-gray-500 cursor-pointer hover:text-gray-950 select-none">
                  First-aid steps &amp; questions for artisan ▸
                </summary>
                <div className="mt-3 grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="font-black text-gray-800 mb-1">First-aid steps</p>
                    <ul className="space-y-1 text-gray-500 list-disc list-inside">
                      {diagnosisResult.first_aid_steps.map((s) => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-black text-gray-800 mb-1">Questions for artisan</p>
                    <ul className="space-y-1 text-gray-500 list-disc list-inside">
                      {diagnosisResult.follow_up_questions.map((q) => <li key={q}>{q}</li>)}
                    </ul>
                  </div>
                </div>
              </details>
            </div>

            {/* Artisan list */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Recommended Artisans</h3>
              {bookingError && (
                <div className="mb-3 bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">
                  {bookingError}
                </div>
              )}
              <div className="space-y-3">
                {artisans.map((artisan) => {
                  const brief = diagnosisResult.artisan_brief;
                  return (
                    <div key={artisan.id} className="border border-gray-200 overflow-hidden">
                      <div className="p-4 flex items-center gap-4">
                        <div className="relative shrink-0">
                          {artisan.avatar ? (
                            <Image unoptimized src={artisan.avatar} alt={artisan.fullName} width={48} height={48} className="object-cover border border-gray-200" />
                          ) : (
                            <div className="w-12 h-12 border border-gray-200 bg-gray-100 flex items-center justify-center">
                              <span className="text-lg font-black text-gray-400">{artisan.fullName.charAt(0)}</span>
                            </div>
                          )}
                          {artisan.isVerified && (
                            <span className="absolute -bottom-1 -right-1 bg-green-700 text-white text-[8px] font-black px-1 border border-white">✓</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-gray-950 text-sm">{artisan.fullName}</h4>
                            <span className="text-[10px] font-black text-green-700 bg-green-50 px-1.5 py-0.5">{artisan.trustScore}% Trust</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{artisan.category} · {artisan.location}</p>
                        </div>
                        <button
                          onClick={() => handleBook(artisan)}
                          className="shrink-0 bg-gray-950 text-white px-4 py-2 text-xs font-black hover:bg-gray-800 transition-colors"
                        >
                          Select
                        </button>
                      </div>
                      {brief && (
                        <details className="border-t border-gray-100">
                          <summary className="px-4 py-2 text-[11px] font-black text-gray-400 cursor-pointer hover:bg-gray-50 select-none uppercase tracking-wider">AI Brief ▸</summary>
                          <div className="px-4 pb-3 pt-1 bg-gray-50 text-xs text-gray-600 space-y-1">
                            <p><span className="font-black text-gray-800">Problem:</span> {brief.problem_summary}</p>
                            <p><span className="font-black text-gray-800">Likely cause:</span> {brief.likely_cause}</p>
                            <p><span className="font-black text-gray-800">Tools:</span> {brief.tools_to_bring}</p>
                            <p><span className="font-black text-gray-800">Estimate:</span> {brief.estimated_price_range}</p>
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
                {artisans.length === 0 && (
                  <div className="border border-gray-100 p-6 text-center text-sm text-gray-400">
                    No artisans found near {location}.{" "}
                    <Link href="/browse" className="text-green-700 font-black underline">Browse all artisans</Link>.
                  </div>
                )}
              </div>
            </div>

            <button onClick={reset} className="text-sm font-black text-gray-400 hover:text-gray-950 transition-colors">
              ← Start a new report
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
