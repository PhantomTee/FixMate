"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

/* ── Nigerian states ─────────────────────────────────────── */
const NG_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

/* ── Trade cards ─────────────────────────────────────────── */
const TRADES = [
  { emoji: "🚰", label: "Plumber"          },
  { emoji: "⚡", label: "Electrician"       },
  { emoji: "❄️", label: "AC Repair"         },
  { emoji: "✂️", label: "Tailor"            },
  { emoji: "🔧", label: "Generator Repair"  },
  { emoji: "🧹", label: "Cleaning"          },
  { emoji: "👟", label: "Shoemaker"         },
  { emoji: "🚗", label: "Vulcanizer"        },
  { emoji: "🪵", label: "Carpenter"         },
  { emoji: "🎨", label: "Painter"           },
  { emoji: "🔩", label: "Mechanic"          },
  { emoji: "💇", label: "Hair Stylist"      },
  { emoji: "🔨", label: "Other"             },
];

type Intent = "hire" | "artisan" | null;

/* ── Step indicator ─────────────────────────────────────── */
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

export default function OnboardingPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const fileRef      = useRef<HTMLInputElement>(null);
  const selfieRef    = useRef<HTMLInputElement>(null);
  const portfolioRef = useRef<HTMLInputElement>(null);

  const nextParam = searchParams.get("next") ?? "/report";
  const intentParam = searchParams.get("intent") as "artisan" | null;

  // Global state
  const [step, setStep]     = useState(intentParam === "artisan" ? 1 : 1);
  const [intent, setIntent] = useState<Intent>(intentParam ?? null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2: identity
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");

  // Step 3: OTP
  const [otp, setOtp] = useState("");

  // Step 4: trade (artisan)
  const [trade, setTrade] = useState("");

  // Step 5: location
  const [state, setState]       = useState("");
  const [lga, setLga]           = useState("");
  const [landmark, setLandmark] = useState("");

  // Step 6: portfolio (artisan)
  const [portfolio, setPortfolio] = useState<string[]>([]);

  // Step 7: rate (artisan)
  const [calloutFee, setCalloutFee] = useState("");
  const [dailyRate, setDailyRate]   = useState("");

  // Step 8: selfie (artisan)
  const [selfie, setSelfie] = useState<string | null>(null);

  const totalSteps = intent === "artisan" ? 8 : 3;
  const isArtisan  = intent === "artisan";

  const go = (n: number) => { setError(""); setStep(n); };
  const fmtPhone = (p: string) => {
    const digits = p.replace(/\D/g, "");
    if (digits.startsWith("0") && digits.length >= 10) return `+234${digits.slice(1)}`;
    if (digits.startsWith("234"))                        return `+${digits}`;
    if (!digits.startsWith("+"))                         return `+234${digits}`;
    return `+${digits}`;
  };

  /* ── Step 2: sign up ─────────────────────────────────── */
  const handleSignUp = async () => {
    if (!name.trim())         { setError("Enter your full name."); return; }
    if (!phone.trim())        { setError("Enter your phone number."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    setError("");
    const supabase    = createClient();
    const formattedPhone = fmtPhone(phone);

    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        phone:    formattedPhone,
        password,
        options:  { data: { name: name.trim() } },
      });
      if (signUpErr) throw new Error(signUpErr.message);
      go(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3: verify OTP ──────────────────────────────── */
  const handleVerifyOtp = async () => {
    if (otp.length < 4) { setError("Enter the 6-digit code."); return; }
    setLoading(true);
    setError("");
    const supabase    = createClient();
    const formattedPhone = fmtPhone(phone);
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type:  "sms",
      });
      if (verifyErr) throw new Error(verifyErr.message);

      // Save name to users table
      await fetch("/api/auth/me", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), phone: formattedPhone, location: "" }),
      });

      if (isArtisan) go(4); else await finishHireFlow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const finishHireFlow = async () => {
    const dest = nextParam === "/dashboard" ? "/profile" : nextParam;
    router.push(dest);
  };

  /* ── Step 5: save location ───────────────────────────── */
  const handleLocation = () => {
    if (!state) { setError("Select your state."); return; }
    if (!lga.trim()) { setError("Enter your LGA."); return; }
    setError("");
    go(isArtisan ? 6 : 8);
  };

  /* ── Step 6: portfolio photos ────────────────────────── */
  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const readers = files.slice(0, 3 - portfolio.length).map((file) => {
      return new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(file);
      });
    });
    Promise.all(readers).then((images) =>
      setPortfolio((prev) => [...prev, ...images].slice(0, 3))
    );
  };

  /* ── Step 8: selfie ──────────────────────────────────── */
  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onloadend = () => setSelfie(r.result as string);
    r.readAsDataURL(file);
  };

  /* ── Final artisan submit ────────────────────────────── */
  const handleArtisanSubmit = async () => {
    setLoading(true);
    setError("");
    const formattedPhone = fmtPhone(phone);
    const fullLocation = [landmark, lga, state].filter(Boolean).join(", ");
    try {
      const res = await fetch("/api/artisans/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName:         name.trim(),
          phone:            formattedPhone,
          category:         trade,
          location:         fullLocation,
          yearsExperience:  0,
          skills:           [trade],
          serviceRadiusKm:  10,
          calloutFeeNaira:  parseInt(calloutFee || "0", 10),
          dailyRateNaira:   parseInt(dailyRate || "0", 10),
          portfolioPhotos:  portfolio,
          selfieUrl:        selfie ?? "",
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

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-6 justify-center">
          <span className="flex h-9 w-9 items-center justify-center bg-green-700 text-sm font-black text-white rounded-lg">S</span>
          <span className="text-lg font-black text-gray-950">iSabi</span>
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
                <h1 className="text-xl font-black text-gray-950">Welcome to iSabi</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">How do you want to use iSabi?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => { setIntent("hire"); go(2); }}
                  className="flex items-center gap-4 border-2 border-gray-200 hover:border-green-600 p-4 rounded-xl text-left transition-colors group">
                  <span className="text-3xl">🏠</span>
                  <div>
                    <p className="font-black text-gray-950 group-hover:text-green-700">I need to hire</p>
                    <p className="text-xs text-gray-400 mt-0.5">Find verified artisans for any repair</p>
                  </div>
                </button>
                <button onClick={() => { setIntent("artisan"); go(2); }}
                  className="flex items-center gap-4 border-2 border-gray-200 hover:border-green-600 p-4 rounded-xl text-left transition-colors group">
                  <span className="text-3xl">🔧</span>
                  <div>
                    <p className="font-black text-gray-950 group-hover:text-green-700">I am an artisan</p>
                    <p className="text-xs text-gray-400 mt-0.5">Offer your skills and get more clients</p>
                  </div>
                </button>
              </div>
              <p className="text-center text-xs text-gray-400">
                Already have an account?{" "}
                <Link href="/auth" className="text-green-700 font-black">Sign in</Link>
              </p>
            </>
          )}

          {/* ── Step 2: Identity ── */}
          {step === 2 && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Create your account</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Your phone number is your login ID</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Full name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fatima Musa" autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Phone number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="080xxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
                <p className="text-[10px] text-gray-400 mt-1">We&apos;ll send a verification code to this number</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
                <p className={`text-[10px] mt-1 font-semibold ${password.length >= 8 ? "text-green-600" : "text-gray-400"}`}>
                  Minimum 8 characters
                </p>
              </div>
              <button onClick={handleSignUp} disabled={loading || !name.trim() || !phone.trim() || password.length < 8}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Creating account…" : "Continue →"}
              </button>
              <button onClick={() => go(1)} className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
            </>
          )}

          {/* ── Step 3: OTP ── */}
          {step === 3 && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Verify your number</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">
                  Enter the 6-digit code sent to {fmtPhone(phone)}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Verification code</label>
                <input type="text" inputMode="numeric" maxLength={6}
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456" autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-black text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
              </div>
              <button onClick={handleVerifyOtp} disabled={loading || otp.length < 4}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Verifying…" : "Verify & Continue →"}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Didn&apos;t receive it?{" "}
                <button onClick={() => go(2)} className="text-green-700 font-black">Change number</button>
              </p>
            </>
          )}

          {/* ── Step 4: Trade (artisan only) ── */}
          {step === 4 && isArtisan && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">What&apos;s your trade?</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Pick the skill you want to offer</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TRADES.map((t) => (
                  <button key={t.label} onClick={() => setTrade(t.label)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      trade === t.label ? "border-green-600 bg-green-50" : "border-gray-100 hover:border-gray-300"
                    }`}>
                    <span className="text-2xl leading-none">{t.emoji}</span>
                    <span className="text-[10px] font-black text-gray-700 text-center leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => { if (!trade) { setError("Pick a trade."); return; } go(5); }}
                disabled={!trade}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40">
                Continue →
              </button>
            </>
          )}

          {/* ── Step 5: Location ── */}
          {step === 5 && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Where are you based?</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Clients nearby will find you faster</p>
              </div>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Nearest bus stop / landmark</label>
                <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Allen Junction, Oshodi Underbridge"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
                <p className="text-[10px] text-gray-400 mt-1">Optional — helps clients find you more easily</p>
              </div>
              <button onClick={handleLocation}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors">
                Continue →
              </button>
              <button onClick={() => go(isArtisan ? 4 : 3)} className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
            </>
          )}

          {/* ── Step 6: Portfolio (artisan only) ── */}
          {step === 6 && isArtisan && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Show your work</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Upload up to 3 photos of past jobs — this is your portfolio</p>
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
              <button onClick={() => go(7)}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors">
                {portfolio.length === 0 ? "Skip for now →" : "Continue →"}
              </button>
              <button onClick={() => go(5)} className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
            </>
          )}

          {/* ── Step 7: Rate (artisan only) ── */}
          {step === 7 && isArtisan && (
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
                <p className="text-[10px] text-gray-400 mt-1">Charged just for showing up (even if no work done)</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Daily rate (₦)</label>
                <input type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900" />
                <p className="text-[10px] text-gray-400 mt-1">Your rate per full working day</p>
              </div>
              <button onClick={() => go(8)}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors">
                Continue →
              </button>
              <button onClick={() => go(6)} className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
            </>
          )}

          {/* ── Step 8: Selfie + Review (artisan only) ── */}
          {step === 8 && isArtisan && (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-950">Almost done!</h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Take a selfie for identity and review your details</p>
              </div>

              {/* Selfie capture */}
              <button type="button" onClick={() => selfieRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-6 transition-colors ${
                  selfie ? "border-green-300" : "border-gray-200 hover:border-green-400"
                }`}>
                {selfie
                  ? <img src={selfie} alt="Selfie" className="w-24 h-24 rounded-full object-cover mx-auto" />
                  : <>
                      <span className="text-3xl mb-2">🤳</span>
                      <p className="text-xs font-black text-gray-500">Tap to take a selfie</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Used for identity verification</p>
                    </>
                }
              </button>
              <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieChange} />

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Name</span>
                  <span className="font-black text-gray-950">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Phone</span>
                  <span className="font-black text-gray-950 font-mono">{fmtPhone(phone)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Trade</span>
                  <span className="font-black text-gray-950">{trade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Location</span>
                  <span className="font-black text-gray-950 text-right">{[landmark, lga, state].filter(Boolean).join(", ")}</span>
                </div>
                {calloutFee && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-semibold">Call-out fee</span>
                    <span className="font-black text-gray-950">₦{parseInt(calloutFee).toLocaleString()}</span>
                  </div>
                )}
                {dailyRate && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-semibold">Daily rate</span>
                    <span className="font-black text-gray-950">₦{parseInt(dailyRate).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Portfolio</span>
                  <span className="font-black text-gray-950">{portfolio.length} photo{portfolio.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              <button onClick={handleArtisanSubmit} disabled={loading}
                className="w-full py-3 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Submitting application…" : "Submit Application →"}
              </button>
              <p className="text-[10px] text-gray-400 text-center">
                Your application is reviewed within 24 hours. You&apos;ll receive a WhatsApp notification when approved.
              </p>
              <button onClick={() => go(7)} className="w-full text-xs font-black text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
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
