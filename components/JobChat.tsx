"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadDb, saveMessage } from "@/lib/demo-db";
import { Message } from "@/lib/types";

interface JobChatProps {
  jobId: string;
  currentUserType: "user" | "artisan";
}

export default function JobChat({ jobId, currentUserType }: JobChatProps) {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(() => {
    setMessages(loadDb().messages.filter((msg) => msg.jobId === jobId));
  }, [jobId]);

  useEffect(() => {
    loadMessages();
    const onUpdate = () => loadMessages();
    window.addEventListener("fixmate-db-updated", onUpdate);
    return () => window.removeEventListener("fixmate-db-updated", onUpdate);
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sorted = useMemo(() => [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp)), [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const db = saveMessage(jobId, currentUserType, inputText.trim());
    setMessages(db.messages.filter((msg) => msg.jobId === jobId));
    setInputText("");
  };

  return (
    <div className="flex flex-col h-80 border border-gray-200 rounded-none overflow-hidden bg-white mt-4">
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between gap-3">
        <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-none bg-green-500 animate-pulse" />
          Job Chat
        </h4>
        <span className="text-xs text-gray-500">Persisted demo messages</span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 space-y-4">
        {sorted.length === 0 ? (
          <div className="text-center text-xs text-gray-400 mt-10">
            No messages yet. Send a quick update.
          </div>
        ) : (
          sorted.map((msg) => {
            const isMe = msg.senderType === currentUserType;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-none flex items-center justify-center flex-shrink-0 ${isMe ? "bg-green-700" : "bg-gray-900"}`}>
                  <span className="text-xs text-white uppercase font-bold">{isMe ? "ME" : msg.senderType.charAt(0)}</span>
                </div>
                <div className={`max-w-[75%] rounded-none p-3 text-sm ${isMe ? "bg-green-700 text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMe ? "text-white/70" : "text-gray-400"}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-none px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 text-gray-900"
        />
        <button onClick={handleSend} disabled={!inputText.trim()} className="bg-gray-900 hover:bg-gray-800 text-white p-2 rounded-none disabled:opacity-50">
          Send
        </button>
      </div>
    </div>
  );
}
