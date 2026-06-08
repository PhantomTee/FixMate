"use client";

// USSD Demo — Simulates low-data USSD-style access to FixMate services.
// Represents how a non-smartphone user in Nigeria could interact with FixMate
// via standard mobile USSD (*xxx#) — critical for OPay's last-mile reach.

import { useState } from "react";
import Link from "next/link";
import { diagnoseIssue } from "@/app/actions";

type Screen = {
  title: string;
  content: string;
  options?: { key: string; label: string }[];
};

type Step =
  | "main"
  | "report_desc"
  | "report_analyzing"
  | "report_result"
  | "track"
  | "pay"
  | "dispute"
  | "support";

const DEMO_JOBS = [
  { ref: "JOB-2026-0012", status: "Artisan en route", artisan: "Opeyemi Ahmed" },
  { ref: "JOB-2026-0011", status: "Payment released", artisan: "Chinedu Okafor" },
];

export default function UssdDemoPage() {
  const [step, setStep] = useState<Step>("main");
  const [input, setInput] = useState("");
  const [description, setDescription] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const push = (text: string) => setHistory((h) => [...h, text]);

  const getScreen = (): Screen => {
    switch (step) {
      case "main":
        return {
          title: "FixMate USSD",
          content: "Welcome to FixMate\nFix home & service issues\nwith trusted artisans.",
          options: [
            { key: "1", label: "Report issue" },
            { key: "2", label: "Track job" },
            { key: "3", label: "Pay artisan" },
            { key: "4", label: "Open dispute" },
            { key: "5", label: "Talk to support" },
          ],
        };
      case "report_desc":
        return {
          title: "Report Issue",
          content: "Describe your problem in one short sentence.\n\nExample:\n'My generator is smoking'\n'Socket sparking'\n'AC not cooling'",
        };
      case "report_analyzing":
        return {
          title: "Analyzing...",
          content: "FixMate AI is reviewing your issue.\nPlease wait...",
        };
      case "report_result":
        return {
          title: "AI Diagnosis",
          content: diagnosisText,
          options: [
            { key: "1", label: "Book nearest artisan" },
            { key: "2", label: "See safety tips" },
            { key: "3", label: "Back to main menu" },
          ],
        };
      case "track":
        return {
          title: "Track Job",
          content: DEMO_JOBS.map((j) => `${j.ref}\n${j.status}\nArtisan: ${j.artisan}`).join("\n\n"),
          options: [{ key: "0", label: "Back" }],
        };
      case "pay":
        return {
          title: "Pay Artisan",
          content: "Your escrow payment is secured.\n\nRef: OPAY-FIX-2026-0001\nAmount: ₦32,000\nStatus: Funded\n\nFunds release automatically when you confirm job completion.",
          options: [
            { key: "1", label: "Confirm job done — Release" },
            { key: "2", label: "Open dispute" },
            { key: "0", label: "Back" },
          ],
        };
      case "dispute":
        return {
          title: "Open Dispute",
          content: "Dispute opened for admin review.\n\nRef: OPAY-FIX-2026-0001\nStatus: Under review\nExpected: 24-48 hours\n\nFunds are frozen until resolved.",
          options: [{ key: "0", label: "Back to main" }],
        };
      case "support":
        return {
          title: "FixMate Support",
          content: "Support options:\n\n1. WhatsApp: +234 800 FIXMATE\n2. Email: support@fixmate.ng\n3. USSD callback: *737*FIX#\n\nAvailable 8am–8pm daily.",
          options: [{ key: "0", label: "Back" }],
        };
    }
  };

  const handleSubmit = async () => {
    const val = input.trim();
    setInput("");

    if (step === "main") {
      push(`> ${val}`);
      if (val === "1") setStep("report_desc");
      else if (val === "2") setStep("track");
      else if (val === "3") setStep("pay");
      else if (val === "4") setStep("dispute");
      else if (val === "5") setStep("support");
    } else if (step === "report_desc") {
      if (!val) return;
      push(`> ${val}`);
      setDescription(val);
      setStep("report_analyzing");
      setIsAnalyzing(true);
      try {
        const result = await diagnoseIssue(val, null, "English");
        const text = [
          result.issue_title,
          "",
          `Urgency: ${result.urgency}`,
          `Category: ${result.artisan_category}`,
          `Est cost: ₦${result.estimated_min_naira.toLocaleString()} – ₦${result.estimated_max_naira.toLocaleString()}`,
          result.safety_warning ? `\n⚠ ${result.safety_warning}` : "",
        ].filter(Boolean).join("\n");
        setDiagnosisText(text);
      } catch {
        setDiagnosisText(`Issue: ${val}\n\nAI diagnosis unavailable.\nA verified artisan will assess on-site.\n\nEst cost: ₦15,000 – ₦50,000`);
      } finally {
        setIsAnalyzing(false);
        setStep("report_result");
      }
    } else if (step === "report_result") {
      push(`> ${val}`);
      if (val === "1") {
        setDiagnosisText(
          `Booking confirmed!\n\nArtisan: Opeyemi Ahmed\nArrival: ~45 mins\nRef: OPAY-FIX-2026-${String(Date.now()).slice(-4)}\n\nSend to escrow via FixMate to secure payment.`
        );
      } else if (val === "3") {
        setStep("main");
      }
    } else if (val === "0") {
      push(`> ${val}`);
      setStep("main");
    } else if (step === "pay" && val === "1") {
      push(`> ${val}`);
      setStep("dispute");
    } else {
      push(`> ${val}`);
      setStep("main");
    }
  };

  const screen = getScreen();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-xs text-gray-400 hover:text-white">← Exit</Link>
          <span className="text-xs font-bold text-green-400 uppercase tracking-widest">USSD Demo</span>
          <span className="text-xs text-gray-500">*737*FIX#</span>
        </div>

        {/* Phone frame */}
        <div className="bg-black border-2 border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
          {/* Status bar */}
          <div className="bg-gray-800 flex justify-between px-4 py-1.5 text-[10px] text-gray-400">
            <span>MTN Nigeria</span>
            <span>12:34</span>
            <span>▓▓▓▓ 92%</span>
          </div>

          {/* USSD screen */}
          <div className="bg-gray-950 p-4 min-h-[280px] flex flex-col">
            <div className="text-green-400 text-xs font-bold mb-3 border-b border-gray-800 pb-2">
              {screen.title}
            </div>

            {/* History */}
            {history.slice(-4).map((line, i) => (
              <div key={i} className="text-gray-500 text-xs mb-1">{line}</div>
            ))}

            {/* Current screen content */}
            <div className="text-white text-xs leading-relaxed flex-1 whitespace-pre-wrap mt-1">
              {isAnalyzing ? (
                <span className="animate-pulse text-yellow-400">Analyzing with Gemini AI...</span>
              ) : (
                screen.content
              )}
            </div>

            {/* Options */}
            {!isAnalyzing && screen.options && (
              <div className="mt-3 border-t border-gray-800 pt-2 space-y-0.5">
                {screen.options.map((opt) => (
                  <div key={opt.key} className="text-xs text-gray-300">
                    {opt.key}. {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="bg-gray-900 p-3 border-t border-gray-700">
            {step === "report_desc" ? (
              <input
                className="w-full bg-black border border-gray-600 text-white text-xs px-3 py-2 outline-none focus:border-green-500"
                placeholder="Type your issue description..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
            ) : (
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-black border border-gray-600 text-white text-sm px-3 py-2 outline-none focus:border-green-500"
                  placeholder="Enter option..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  disabled={isAnalyzing}
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={isAnalyzing || !input.trim()}
                  className="bg-green-700 text-white px-4 py-2 text-xs font-bold disabled:opacity-40"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Simulating USSD access for low-data Nigerian users · Powered by Gemini AI
        </p>
        <div className="flex justify-center gap-4 mt-3">
          <Link href="/whatsapp-demo" className="text-xs text-green-400 hover:text-green-300 underline">
            WhatsApp Demo →
          </Link>
          <Link href="/report" className="text-xs text-blue-400 hover:text-blue-300 underline">
            Full Web App →
          </Link>
        </div>
      </div>
    </div>
  );
}
