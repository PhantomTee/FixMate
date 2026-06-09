"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getMessages, sendMessage, subscribeMessages } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { Message } from "@/lib/types";

type UserType = "user" | "artisan";

interface JobChatProps {
  jobId:           string;
  currentUserType: UserType;
  otherName?:      string;
  otherAvatar?:    string;
  className?:      string;
}

const QUICK_REPLIES: Record<UserType, string[]> = {
  user:    ["When will you arrive?", "How long will this take?", "Please send a photo", "Great work, thank you! 🙌"],
  artisan: ["On my way 🏃", "Arrived at location 📍", "Starting work now 🔧", "Done! Please inspect ✅", "Need more materials, back soon"],
};

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const yest  = new Date(today); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString())  return "Yesterday";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default function JobChat({ jobId, currentUserType, otherName: otherNameProp, otherAvatar, className = "" }: JobChatProps) {
  const otherName = otherNameProp ?? (currentUserType === "artisan" ? "Customer" : "Artisan");
  const [inputText,  setInputText]  = useState("");
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [sending,    setSending]    = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const fileRef      = useRef<HTMLInputElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  const loadMessages = useCallback(async () => {
    try { setMessages(await getMessages(jobId)); } catch { /* ignore */ }
  }, [jobId]);

  useEffect(() => {
    loadMessages();
    const ch = subscribeMessages(jobId, (msg) =>
      setMessages((p) => p.find((m) => m.id === msg.id) ? p : [...p, msg])
    );
    return () => { ch.unsubscribe(); };
  }, [jobId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [messages]
  );

  // Group by day
  const grouped = useMemo(() => {
    const out: Array<{ day: string; msgs: Message[] }> = [];
    let last = "";
    for (const msg of sorted) {
      const day = fmtDay(msg.timestamp);
      if (day !== last) { out.push({ day, msgs: [] }); last = day; }
      out[out.length - 1].msgs.push(msg);
    }
    return out;
  }, [sorted]);

  const doSend = async (text?: string) => {
    const t = (text ?? inputText).trim();
    if (!t || sending) return;
    if (!text) setInputText("");
    setSending(true);
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    try { await sendMessage(jobId, t, currentUserType); }
    catch { if (!text) setInputText(t); }
    finally { setSending(false); }
  };

  const doUpload = async (file: File) => {
    setUploading(true);
    try {
      const sb   = createClient();
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${jobId}/${Date.now()}.${ext}`;
      const { error } = await sb.storage.from("chat-images").upload(path, file);
      if (error) throw error;
      const { data: u } = sb.storage.from("chat-images").getPublicUrl(path);
      if (u?.publicUrl) await sendMessage(jobId, "📷 Photo", currentUserType, u.publicUrl);
    } catch { /* best-effort */ }
    finally { setUploading(false); }
  };

  const myInitial    = currentUserType === "artisan" ? "A" : "C";
  const otherInitial = otherName.charAt(0).toUpperCase();

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>

      {/* ── Thread ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" style={{ background: "#efeae2" }}>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-14 h-14 rounded-full bg-white/60 flex items-center justify-center shadow-sm">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs font-black text-gray-500">No messages yet</p>
            <p className="text-[11px] text-gray-400">Say hello to {otherName}</p>
          </div>
        ) : grouped.map(({ day, msgs }) => (
          <div key={day}>
            {/* Day divider */}
            <div className="flex items-center justify-center py-3">
              <span className="bg-white/80 backdrop-blur-sm text-gray-500 text-[10px] font-semibold px-3 py-1 rounded-full shadow-sm">{day}</span>
            </div>

            {msgs.map((msg, i) => {
              const prev    = msgs[i - 1];
              const sameSender = prev?.senderType === msg.senderType;
              const isMe    = msg.senderType === currentUserType;

              /* ── System message ── */
              if (msg.senderType === "admin") {
                return (
                  <div key={msg.id} className="flex justify-center py-1.5">
                    <span className="bg-[#d9f9c4]/90 border border-green-200/50 text-green-800 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm max-w-[85%] text-center leading-snug">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"} ${sameSender ? "mt-0.5" : "mt-3"}`}
                >
                  {/* Avatar */}
                  <div className="w-6 h-6 shrink-0 mb-0.5">
                    {!sameSender && (
                      isMe
                        ? <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-[9px] font-black text-white">{myInitial}</div>
                        : otherAvatar
                          ? <Image unoptimized src={otherAvatar} alt={otherName} width={24} height={24} className="w-6 h-6 rounded-full object-cover" />
                          : <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[9px] font-black text-white">{otherInitial}</div>
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {msg.imageUrl ? (
                      /* Image bubble */
                      <div className={`rounded-xl overflow-hidden shadow-sm ${isMe ? "rounded-br-sm" : "rounded-bl-sm"} bg-white`}>
                        <Image
                          unoptimized
                          src={msg.imageUrl}
                          alt="Photo"
                          width={240}
                          height={200}
                          className="object-cover max-w-[240px] max-h-[200px] w-full"
                        />
                        <div className={`px-2 py-1 text-[10px] text-right ${isMe ? "bg-[#d9fdd3] text-gray-500" : "bg-white text-gray-400"}`}>
                          {fmtTime(msg.timestamp)}
                        </div>
                      </div>
                    ) : (
                      /* Text bubble */
                      <div className={`px-3 py-2 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMe
                          ? "bg-[#d9fdd3] text-gray-900 rounded-xl rounded-br-sm"
                          : "bg-white text-gray-900 rounded-xl rounded-bl-sm"
                      }`}>
                        {msg.text}
                        <span className={`block text-[10px] text-right mt-0.5 select-none ${isMe ? "text-green-700/60" : "text-gray-400"}`}>
                          {fmtTime(msg.timestamp)}
                          {isMe && <span className="ml-1">✓✓</span>}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick replies ─────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1.5 bg-[#f0f2f5] overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 w-max">
          {QUICK_REPLIES[currentUserType].map((r) => (
            <button
              key={r}
              onClick={() => doSend(r)}
              disabled={sending}
              className="shrink-0 text-[11px] font-semibold text-gray-600 bg-white hover:bg-green-50 hover:text-green-700 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap shadow-sm"
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input row ─────────────────────────────────────────────── */}
      <div className="px-3 py-2 bg-[#f0f2f5] flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ""; }}
        />

        {/* Photo button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Send photo"
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-white text-gray-500 hover:text-green-600 shadow-sm transition-colors disabled:opacity-40"
        >
          {uploading
            ? <span className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          }
        </button>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } }}
          placeholder={`Message ${otherName}…`}
          className="flex-1 resize-none overflow-hidden text-sm text-gray-900 placeholder-gray-400 bg-white rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm leading-relaxed max-h-24"
        />

        {/* Send button */}
        <button
          onClick={() => doSend()}
          disabled={!inputText.trim() || sending}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-40 shadow-sm"
        >
          {sending
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          }
        </button>
      </div>
    </div>
  );
}
