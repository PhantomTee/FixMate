/**
 * WhatsApp webhook — Termii
 *
 * Required env vars:
 *   TERMII_API_KEY        – Termii dashboard → Settings → API Key
 *   TERMII_SENDER_ID      – approved WhatsApp sender ID (default "iSabi")
 *   WHATSAPP_VERIFY_TOKEN – random string; set same value in Termii webhook config
 */

import { NextRequest, NextResponse } from "next/server";
import { handleBotMessage } from "@/lib/whatsapp-bot";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;

// ── Verification handshake ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token     = searchParams.get("token");
  const challenge = searchParams.get("challenge");
  if (token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "ok", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── Inbound message ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json() as TermiiPayload;
  const msg  = body.data ?? body;
  const from = msg.phone_number ?? msg.from ?? "";
  const text = (msg.text ?? msg.message ?? "").trim();

  if (from && text) {
    await handleBotMessage(from, text, sendTermii);
  }

  return NextResponse.json({ ok: true });
}

// ── Termii outbound ───────────────────────────────────────────────────────────
async function sendTermii(to: string, message: string) {
  const key    = process.env.TERMII_API_KEY!;
  const sender = process.env.TERMII_SENDER_ID ?? "iSabi";
  await fetch("https://v3.api.termii.com/api/sms/send", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      from:    sender,
      sms:     message,
      type:    "plain",
      channel: "WhatsApp",
      api_key: key,
    }),
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface TermiiPayload {
  data?: { phone_number?: string; from?: string; text?: string; message?: string };
  phone_number?: string;
  from?: string;
  text?: string;
  message?: string;
}
