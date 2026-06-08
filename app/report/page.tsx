"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { diagnoseIssue } from "@/app/actions";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { createBooking, createJobWithDiagnosis, getMatchReason, loadDb, matchArtisans } from "@/lib/demo-db";
import { Artisan, ArtisanCategory, DiagnosisRecord, JobRequest, SupportedLanguage } from "@/lib/types";
import { useFixMateStore } from "@/lib/store";

const naira = (v: number) => `₦${v.toLocaleString()}`;
const LANGUAGES: SupportedLanguage[] = ["English", "Pidgin", "Yoruba", "Hausa", "Igbo"];

export default function ReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setDiagnosisState = useFixMateStore((s) => s.setDiagnosis);
  const setSelectedArtisan = useFixMateStore((s) => s.setSelectedArtisan);
  const setActiveJobId = useFixMateStore((s) => s.setActiveJobId);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Yaba, Lagos");
  const [language, setLanguage] = useState<SupportedLanguage>("English");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisRecord | null>(null);
  const [job, setJob] = useState<JobRequest | null>(null);
  const [recommendedArtisans, setRecommendedArtisans] = useState<Artisan[]>([]);

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
    try {
      const result = await diagnoseIssue(description, imagePreview, language);
      const saved = createJobWithDiagnosis({
        description,
        imageProvided: Boolean(imagePreview),
        location,
        diagnosis: result,
      });
      setDiagnosisResult(saved.diagnosis);
      setJob(saved.job);
      setDiagnosisState(result);
      setActiveJobId(saved.job.id);
      setRecommendedArtisans(matchArtisans(saved.db, result.artisan_category, location));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBook = (artisan: Artisan) => {
    if (!job || !diagnosisResult) return;
    const { booking } = createBooking(job.id, artisan.id, diagnosisResult.estimated_max_naira);
    setSelectedArtisan(artisan);
    setActiveJobId(job.id);
    router.push(`/booking?bookingId=${booking.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white px-4 sm:px-6 py-4 flex items-center border-b shadow-sm mb-4">
        <Link href="/" className="text-gray-500 hover:text-gray-800 mr-4 font-bold flex items-center gap-1">
          Back
        </Link>
        <span className="text-xl font-bold text-gray-900 tracking-tight">FixMate Diagnostic</span>
      </header>

      <main className="flex-1 flex flex-col items-center py-6 sm:py-10 px-4 sm:px-6 max-w-2xl mx-auto w-full">
        {!diagnosisResult ? (
          <div className="bg-white p-5 sm:p-8 rounded-none shadow-sm border border-gray-200 w-full animate-fade-in-up">
            <div className="relative w-full h-28 flex items-center justify-center mb-4">
              <div className="absolute w-24 h-24 bg-green-50 rounded-none -z-10" />
              <div className="border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-800">Gemini diagnosis</div>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">What needs fixing?</h1>
            <p className="text-gray-600 mb-6 text-center">Describe the issue or upload a photo. Gemini will triage it and create a demo job request.</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-none p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {imagePreview ? <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-none object-contain" /> : <span className="text-sm text-gray-600 font-medium">Tap to upload a photo</span>}
              </button>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Describe the issue</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-none p-4 text-gray-800 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none resize-none h-32"
                placeholder="e.g. My generator is smoking and smells like fuel..."
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <LocationAutocomplete defaultValue={location} onPlaceSelect={(place) => setLocation(place.formatted_address || place.name)} />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 text-sm font-semibold border rounded-none transition-colors ${
                      language === lang ? "bg-green-700 text-white border-green-700" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              {language !== "English" && <p className="text-xs text-gray-500 mt-1.5">Gemini will respond in {language} where possible.</p>}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!description.trim() && !imagePreview)}
              className="w-full py-4 bg-green-700 text-white font-bold rounded-none shadow hover:bg-green-800 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-none animate-spin" />}
              {isAnalyzing ? "Analyzing with Gemini..." : "Analyze Issue"}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-6">
            <div className="bg-white p-6 rounded-none shadow-sm border border-gray-200 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-none bg-green-50 flex items-center justify-center text-green-700 border border-green-100">
                  <span className="text-xs font-black">AI</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Diagnosis saved</h2>
                  <p className="text-sm text-gray-500">Job ref: {job?.id}</p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-none p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">{diagnosisResult.issue_title}</h3>
                <p className="text-sm text-gray-600">{diagnosisResult.summary}</p>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <span className="px-2 py-1 bg-white border border-gray-200">Category: {diagnosisResult.artisan_category}</span>
                  <span className="px-2 py-1 bg-white border border-gray-200">Urgency: {diagnosisResult.urgency}</span>
                  <span className="px-2 py-1 bg-white border border-green-200 text-green-700">Max: {naira(diagnosisResult.estimated_max_naira)}</span>
                  <span className="px-2 py-1 bg-white border border-gray-200">Labor: {naira(diagnosisResult.estimated_labor_naira)}</span>
                </div>
              </div>

              {diagnosisResult.safety_warning && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-none mb-4">
                  <div className="flex items-start gap-2 text-red-800">
                    <p className="text-sm">{diagnosisResult.safety_warning}</p>
                  </div>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">First aid steps</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">{diagnosisResult.first_aid_steps.map((step) => <li key={step}>{step}</li>)}</ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Questions for artisan</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">{diagnosisResult.follow_up_questions.map((q) => <li key={q}>{q}</li>)}</ul>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900 px-1">Recommended Artisans</h3>
            <div className="space-y-4">
              {recommendedArtisans.map((artisan) => {
                const matchReason = diagnosisResult ? getMatchReason(artisan, diagnosisResult.artisan_category, location) : "";
                const brief = diagnosisResult?.artisan_brief;
                return (
                  <div key={artisan.id} className="bg-white rounded-none shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Image unoptimized src={artisan.avatar} alt={artisan.fullName} width={60} height={60} className="rounded-none bg-gray-200 object-cover border border-gray-200" />
                          {artisan.isVerified && <div className="absolute -bottom-1 -right-1 bg-green-700 text-white rounded-none px-1.5 py-0.5 text-[9px] font-bold border border-white">OK</div>}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{artisan.fullName}</h4>
                          <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                            <span>{artisan.category}</span>
                            <span className="hidden sm:inline">|</span>
                            <span>{artisan.trustScore}% Trust</span>
                            <span>{artisan.location}</span>
                          </div>
                          {matchReason && <p className="text-xs text-green-700 font-medium mt-1">{matchReason}</p>}
                        </div>
                      </div>
                      <button onClick={() => handleBook(artisan)} className="w-full sm:w-auto px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-none hover:bg-gray-800">
                        Select & Book
                      </button>
                    </div>
                    {brief && (
                      <details className="border-t border-gray-100">
                        <summary className="px-5 py-2 text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-50 select-none">
                          AI Artisan Brief ▸
                        </summary>
                        <div className="px-5 pb-4 pt-2 bg-gray-50 text-xs space-y-1.5 text-gray-700">
                          <p><span className="font-semibold text-gray-800">Problem:</span> {brief.problem_summary}</p>
                          <p><span className="font-semibold text-gray-800">Likely cause:</span> {brief.likely_cause}</p>
                          <p><span className="font-semibold text-gray-800">Tools needed:</span> {brief.tools_to_bring}</p>
                          <p><span className="font-semibold text-gray-800">Safety risks:</span> {brief.safety_risks}</p>
                          <p><span className="font-semibold text-gray-800">Estimate:</span> {brief.estimated_price_range}</p>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
              {recommendedArtisans.length === 0 && <div className="text-center p-8 bg-gray-100 rounded-none text-gray-500 text-sm border border-gray-200">No verified artisans yet. Admin can approve applications from the admin panel.</div>}
            </div>

            <button onClick={() => { setDiagnosisResult(null); setJob(null); setRecommendedArtisans([]); setImagePreview(null); setDescription(""); }} className="text-gray-500 hover:text-gray-900 text-sm font-medium">
              Start another report
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
