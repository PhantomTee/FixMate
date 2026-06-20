"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useGeoLocation } from "@/lib/useGeoLocation";

const NG_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

const TRADES = [
  "Plumber","Electrician","AC Repair","Tailor","Generator Repair",
  "Cleaning","Shoemaker","Vulcanizer","Carpenter","Painter",
  "Mechanic","Hair Stylist","Other",
];

type Intent = "hire" | "artisan" | null;

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${
          i + 1 === current ? "w-5 h-2 bg-green-700" :
          i + 1 < current  ? "w-2 h-2 bg-green-300" :
                             "w-2 h-2 bg-gray-200"
        }`} />
      ))}
    </div>
  );
}

function OnboardingForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const portfolioRef = useRef<HTMLInputElement>(null);

  const nextParam   = searchParams.get("next") ?? "/profile";
  const intentParam = searchParams.get("intent") as "artisan" | null;

  /* Step numbering:
     1 = intent (hire vs artisan)
     2 = trade (artisan)
     3 = location
     4 = portfolio (artisan)
     5 = rates (artisan)
     6 = KYC (artisan)
  */
  const [step,    setStep]    = useState(1);
  const [intent,  setIntent]  = useState<Intent>(intentParam ?? null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [ready,   setReady]   = useState(false);
  const [userName, setUserName] = useState("");

  // Step 2: trade
  const [trade, setTrade] = useState("");

  // Step 3: location
  const [state,    setState]    = useState("");
  const [lga,      setLga]      = useState("");
  const [landmark, setLandmark] = useState("");
  const geo = useGeoLocation();

  // Step 4: portfolio
  const [portfolio, setPortfolio] = useState<string[]>([]);

  // Step 5: rates
  const [calloutFee, setCalloutFee] = useState("");
  const [dailyRate,  setDailyRate]  = useState("");


  /* Guard: require auth */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        const dest = intentParam
          ? `/auth?next=${encodeURIComponent(`/onboarding?intent=${intentParam}`)}`
          : `/auth?next=${encodeURIComponent("/onboarding")}`;
        router.replace(dest);
        return;
      }
      const name = (session.user.user_metadata?.name as string) ?? "";
      setUserName(name);
      if (intentParam === "artisan") {
        setIntent("artisan");
        setStep(2);
      }
      setReady(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (n: number) => { setError(""); setStep(n); };

  const isArtisan  = intent === "artisan";
  const totalSteps = isArtisan ? 6 : 1;

  /* Intent selection */
  const handleIntent = (chosen: "hire" | "artisan") => {
    setIntent(chosen);
    if (chosen === "hire") {
      router.push(nextParam === "/dashboard" ? "/profile" : nextParam);
    } else {
      go(2);
    }
  };

  /* Portfolio */
  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const readers = files.slice(0, 3 - portfolio.length).map((file) =>
      new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(file);
      })
    );
    Promise.all(readers).then((images) =>
      setPortfolio((prev) => [...prev, ...images].slice(0, 3))
    );
  };

  /* Final artisan submit — KYC happens after, via idnorm redirect from the dashboard */
  const handleArtisanSubmit = async () => {
    setLoading(true);
    setError("");
    const fullLocation = [landmark, lga, state].filter(Boolean).join(", ");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const phone = (user?.phone as string | undefined) ?? "";

    try {
      const res = await fetch("/api/artisans/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName:        userName,
          phone,
          category:        trade,
          location:        fullLocation,
          yearsExperience: 0,
          skills:          [trade],
          serviceRadiusKm: 10,
          calloutFeeNaira: parseInt(calloutFee || "0", 10),
          dailyRateNaira:  parseInt(dailyRate  || "0", 10),
          portfolioPhotos: portfolio,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Registration failed.");
      }
      router.push("/artisan/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ════════════════════════ RENDER ════════════════════════ */
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-green-700/30 border-t-green-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center mb-6 justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isabi-logo.svg" alt="iSabi" className="h-9 w-auto" />
        </Link>

        <StepDots total={totalSteps} current={step} />

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

          {error && (
            <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-xs text-red-700 font-semibold">{error}</div>
          )}

          {/* ── Step 1: Intent ── */}
          {step === 1 && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">
                  {userName ? `Welcome, ${userName.split(" ")[0]}` : "Welcome to iSabi"}
                </h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">How do you want to use iSabi?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleIntent("hire")}
                  className="flex items-center gap-4 border-2 border-gray-200 hover:border-green-600 p-4 rounded-xl text-left transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-green-700">HIRE</span>
                  </div>
                  <div>
                    <p className="font-black text-gray-950 group-hover:text-green-700">I need to hire</p>
                    <p className="text-xs text-gray-400 mt-0.5">Find verified artisans for any repair</p>
                  </div>
                </button>
                <button onClick={() => handleIntent("artisan")}
                  className="flex items-center gap-4 border-2 border-gray-200 hover:border-green-600 p-4 rounded-xl text-left transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-gray-600">WORK</span>
                  </div>
                  <div>
                    <p className="font-black text-gray-950 group-hover:text-green-700">I am an artisan</p>
                    <p className="text-xs text-gray-400 mt-0.5">Offer your skills and get more clients</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Trade ── */}
          {step === 2 && isArtisan && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">What&apos;s your trade?</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Pick the skill you want to offer</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TRADES.map((t) => (
                  <button key={t} onClick={() => setTrade(t)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all text-center min-h-[56px] ${
                      trade === t ? "border-green-600 bg-green-50 text-green-700" : "border-gray-100 hover:border-gray-300 text-gray-700"
                    }`}>
                    <span className="text-[11px] font-black leading-tight">{t}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => { if (!trade) { setError("Pick a trade."); return; } go(3); }}
                disabled={!trade}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40">
                Continue →
              </button>
            </>
          )}

          {/* ── Step 3: Location ── */}
          {step === 3 && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Where are you based?</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Clients nearby will find you faster</p>
              </div>
              <button
                type="button"
                onClick={() => geo.detect(({ city, state: detectedState }) => {
                  const match = NG_STATES.find((s) => s.toLowerCase() === detectedState.toLowerCase());
                  if (match) setState(match);
                  if (city) setLga(city);
                })}
                disabled={geo.loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-green-600 text-green-700 text-sm font-black rounded-xl hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                <span>{geo.loading ? "⟳" : "📍"}</span>
                {geo.loading ? "Detecting location…" : "Use my location"}
              </button>
              {geo.error && <p className="text-xs text-red-500 font-semibold -mt-2">{geo.error}</p>}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">State</label>
                <select value={state} onChange={(e) => setState(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900 bg-white">
                  <option value="">Select state…</option>
                  {NG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">LGA</label>
                <input type="text" value={lga} onChange={(e) => setLga(e.target.value)}
                  placeholder="e.g. Ikeja"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Nearest landmark</label>
                <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Allen Junction"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
                <p className="text-[10px] text-gray-400 mt-1">Optional</p>
              </div>
              <button onClick={() => {
                if (!state) { setError("Select your state."); return; }
                if (!lga.trim()) { setError("Enter your LGA."); return; }
                go(isArtisan ? 4 : 1);
              }} className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors">
                Continue →
              </button>
              <button onClick={() => go(isArtisan ? 2 : 1)} className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
            </>
          )}

          {/* ── Step 4: Portfolio ── */}
          {step === 4 && isArtisan && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Show your work</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Upload up to 3 photos of past jobs</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <button key={i} type="button" onClick={() => portfolioRef.current?.click()}
                    className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${
                      portfolio[i] ? "border-green-300" : "border-gray-200 hover:border-green-400"
                    }`}>
                    {portfolio[i]
                      ? <img src={portfolio[i]} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                      : <span className="text-2xl text-gray-300">+</span>
                    }
                  </button>
                ))}
              </div>
              <input ref={portfolioRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioChange} />
              {portfolio.length > 0 && (
                <button onClick={() => setPortfolio([])} className="text-xs font-black text-red-400 hover:text-red-600">Clear photos</button>
              )}
              <button onClick={() => go(5)}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors">
                {portfolio.length === 0 ? "Skip for now →" : "Continue →"}
              </button>
              <button onClick={() => go(3)} className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
            </>
          )}

          {/* ── Step 5: Rates ── */}
          {step === 5 && isArtisan && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Set your rates</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Clients see this before booking you</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Call-out fee (₦)</label>
                <input type="number" value={calloutFee} onChange={(e) => setCalloutFee(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
                <p className="text-[10px] text-gray-400 mt-1">Charged just for showing up</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Daily rate (₦)</label>
                <input type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
                <p className="text-[10px] text-gray-400 mt-1">Your rate per full working day</p>
              </div>
              <button onClick={() => go(6)}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors">
                Continue →
              </button>
              <button onClick={() => go(4)} className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
            </>
          )}

          {/* ── Step 6: Review & submit ── */}
          {step === 6 && isArtisan && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Review your application</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">
                  You&apos;ll verify your identity from your dashboard after this.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Application Summary</p>
                {[
                  ["Name", userName],
                  ["Trade", trade],
                  ["Location", [landmark, lga, state].filter(Boolean).join(", ")],
                  calloutFee ? ["Call-out fee", `₦${parseInt(calloutFee).toLocaleString()}`] : null,
                  dailyRate  ? ["Daily rate",   `₦${parseInt(dailyRate).toLocaleString()}`]  : null,
                  [`Portfolio`, `${portfolio.length} photo${portfolio.length !== 1 ? "s" : ""}`],
                ].filter(Boolean).map((row) => {
                  const [label, value] = row as [string, string];
                  return (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-gray-400 font-semibold shrink-0">{label}</span>
                      <span className="font-black text-gray-950 text-right">{value}</span>
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-semibold">
                After submitting, you&apos;ll be asked to verify your identity (ID scan + selfie) from your dashboard. Unverified profiles are tagged accordingly until verification completes.
              </div>

              <button
                onClick={handleArtisanSubmit}
                disabled={loading}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Submitting…" : "Submit Application →"}
              </button>
              <p className="text-[10px] text-gray-400 text-center">
                Reviewed within 24 hours. You will receive a WhatsApp notification when approved.
              </p>
              <button onClick={() => go(5)} className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">Back</button>
            </>
          )}

        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4 font-semibold">
          By continuing you agree to iSabi&apos;s terms of service.
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
