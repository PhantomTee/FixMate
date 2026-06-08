"use client";

// WhatsApp-style demo — Shows how FixMate would work via a WhatsApp bot.
// In production this would integrate with the WhatsApp Business API.
// This demo shows the conversation flow and Gemini AI integration.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { diagnoseIssue } from "@/app/actions";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  time: string;
  typing?: boolean;
};

type Stage =
  | "greeting"
  | "awaiting_issue"
  | "analyzing"
  | "show_diagnosis"
  | "awaiting_action"
  | "booking_confirm"
  | "payment"
  | "done";

const uid = () => Math.random().toString(36).slice(2, 8);
const timeStr = () => new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

const SCRIPTED_INTRO: Message[] = [
  {
    id: "intro-1",
    role: "bot",
    text: "👋 Welcome to *FixMate* — Nigeria's trusted home repair assistant.\n\nI can help you:\n• Diagnose household faults\n• Book a verified artisan\n• Secure payment with OPay Escrow\n\nDescribe your issue or send a photo to get started.",
    time: timeStr(),
  },
];

export default function WhatsAppDemoPage() {
  const [messages, setMessages] = useState<Message[]>(SCRIPTED_INTRO);
  const [stage, setStage] = useState<Stage>("awaiting_issue");
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const addMsg = (msg: Omit<Message, "id" | "time">) => {
    setMessages((prev) => [...prev, { ...msg, id: uid(), time: timeStr() }]);
  };

  const botReply = async (text: string, delay = 900) => {
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, delay));
    setIsTyping(false);
    addMsg({ role: "bot", text });
  };

  const handleSend = async () => {
    const val = inputText.trim();
    if (!val || isTyping) return;
    setInputText("");
    addMsg({ role: "user", text: val });

    if (stage === "awaiting_issue") {
      setStage("analyzing");
      await botReply("Got it. Let me analyze this with Gemini AI... 🔍", 600);

      try {
        const result = await diagnoseIssue(val, null, "English");
        const botText = [
          `🤖 *AI Diagnosis: ${result.issue_title}*\n`,
          result.summary,
          "",
          `📂 Category: ${result.artisan_category}`,
          `⚡ Urgency: ${result.urgency}`,
          `💰 Estimate: ₦${result.estimated_min_naira.toLocaleString()} – ₦${result.estimated_max_naira.toLocaleString()}`,
          result.safety_warning ? `\n⚠️ *Safety Alert:*\n${result.safety_warning}` : "",
          "",
          "Reply with:\n*1* – Book nearest verified artisan\n*2* – Show safety steps\n*3* – Cancel",
        ].filter(Boolean).join("\n");
        await botReply(botText, 1200);
        setStage("awaiting_action");
      } catch {
        await botReply(
          `🤖 *AI Diagnosis (Demo Mode)*\n\nI've identified a potential ${val.toLowerCase().includes("generator") ? "Generator Repair" : "home repair"} issue.\n\nA verified artisan will inspect on-site.\n\nReply:\n*1* – Book nearest artisan\n*2* – Cancel`,
          1000
        );
        setStage("awaiting_action");
      }
    } else if (stage === "awaiting_action") {
      if (val === "1" || val.toLowerCase().includes("book")) {
        setStage("booking_confirm");
        await botReply(
          "✅ *Nearest verified artisan found!*\n\n👷 Opeyemi Ahmed\n⭐ 96% Trust Score\n📍 Ikeja, Lagos (4.2km away)\n🔰 Verified ID\n💼 45 completed jobs\n\n*Quote: ₦32,000 (OPay Escrow)*\n\nReply *CONFIRM* to book and initiate OPay payment.",
          1100
        );
      } else if (val === "2") {
        await botReply(
          "🛡️ *Safety Steps:*\n\n1. Stop using the equipment immediately.\n2. Move people away from the area.\n3. Do not attempt repairs yourself.\n4. Keep children away.\n5. Wait for the verified artisan.\n\nReply *1* to book an artisan.",
          900
        );
      } else {
        await botReply("No problem! Type your issue description anytime to get help. 🔧", 600);
        setStage("awaiting_issue");
      }
    } else if (stage === "booking_confirm") {
      if (val.toLowerCase() === "confirm" || val === "1") {
        setStage("payment");
        await botReply(
          "🔒 *OPay Escrow Payment Initiated*\n\nReference: OPAY-FIX-2026-1234\nAmount: ₦32,000 + ₦640 fee\n*Total: ₦32,640*\n\nPay via OPay wallet, bank transfer, or USSD.\n\n_Funds held in escrow until job is complete._\n\nYou will receive a confirmation when Opeyemi Ahmed accepts the job.",
          1200
        );
        setTimeout(async () => {
          await botReply(
            "✅ *Artisan Accepted!*\n\n👷 Opeyemi Ahmed is on the way.\n⏱️ ETA: 35–45 minutes.\n\nYou can track via the FixMate app or reply *STATUS* anytime.\n\n_Payment releases automatically when you confirm completion._",
            2500
          );
          setStage("done");
        }, 3000);
      } else {
        await botReply("Booking cancelled. Type your issue anytime to restart. 🔧", 600);
        setStage("awaiting_issue");
      }
    } else if (stage === "done") {
      if (val.toLowerCase().includes("status")) {
        await botReply(
          "📍 *Job Status*\n\nRef: JOB-2026-1234\nArtisan: Opeyemi Ahmed\nStatus: In Progress\nETA: ~15 mins\n\nReply *RELEASE* once the job is done to release payment.",
          800
        );
      } else if (val.toLowerCase() === "release") {
        await botReply(
          "🎉 *Payment Released!*\n\n₦28,800 sent to Opeyemi Ahmed\n(₦3,200 platform fee applied)\n\nThank you for using FixMate!\nPlease rate your artisan: ⭐⭐⭐⭐⭐",
          900
        );
      } else {
        await botReply(
          "Need help? Type:\n*STATUS* – Track your job\n*RELEASE* – Release payment\n*DISPUTE* – Open a dispute\n\nOr describe a new issue to create another request.",
          700
        );
      }
    }
  };

  const handleQuick = (text: string) => {
    setInputText(text);
    setTimeout(() => handleSend(), 50);
  };

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-sm shadow-2xl flex flex-col" style={{ height: "90vh", maxHeight: 680 }}>
        {/* Header */}
        <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-400 rounded-full flex items-center justify-center font-black text-sm">F</div>
          <div className="flex-1">
            <p className="font-bold text-sm">FixMate AI</p>
            <p className="text-[11px] text-green-200">Powered by Gemini · OPay Escrow</p>
          </div>
          <div className="flex gap-3 text-green-200 text-xs">
            <Link href="/ussd-demo" className="hover:text-white font-semibold">USSD</Link>
            <Link href="/" className="hover:text-white">✕</Link>
          </div>
        </div>

        {/* Demo banner */}
        <div className="bg-amber-50 border-b border-amber-100 px-3 py-1.5 text-[10px] text-amber-700 text-center">
          WhatsApp Bot Demo — Not a real WhatsApp integration · Shows FixMate product direction
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c2c2c2' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                  msg.role === "user"
                    ? "bg-[#dcf8c6] text-gray-900 rounded-br-none"
                    : "bg-white text-gray-900 rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                <p className="text-[10px] text-gray-400 text-right mt-1">{msg.time} ✓✓</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg rounded-bl-none px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        {stage === "awaiting_issue" && !isTyping && (
          <div className="px-3 py-2 bg-[#e5ddd5] flex flex-wrap gap-2">
            {["My generator is smoking", "AC not cooling", "Socket sparking", "Pipe leaking"].map((q) => (
              <button
                key={q}
                onClick={() => handleQuick(q)}
                className="px-3 py-1 bg-white border border-[#075e54] text-[#075e54] text-xs font-semibold rounded-full"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2 border-t border-gray-300">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-white rounded-full px-4 py-2 text-sm outline-none border-none"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="w-10 h-10 bg-[#075e54] text-white rounded-full flex items-center justify-center disabled:opacity-40"
          >
            ▶
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-3 max-w-sm">
        In production: connect to WhatsApp Business API and real OPay payments.
        <Link href="/report" className="text-green-700 font-bold ml-1 underline">Full web app →</Link>
      </p>
    </div>
  );
}
