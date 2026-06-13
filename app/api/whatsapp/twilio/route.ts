/**
 * WhatsApp webhook — Twilio
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID     – Twilio Console
 *   TWILIO_AUTH_TOKEN      – Twilio Console
 *   TWILIO_WHATSAPP_NUMBER – your Twilio WhatsApp number (e.g. "whatsapp:+14155238886")
 *
 * Sandbox (instant testing, no approval):
 *   https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
 *
 * Point Twilio webhook to: POST https://<domain>/api/whatsapp/twilio
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { handleBotMessage } from "@/lib/whatsapp-bot";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const text = ((form.get("Body") as string) ?? "").trim();
  const from = (form.get("From") as string) ?? ""; // "whatsapp:+2348012345678"

  if (from && text) {
    try {
      await handleBotMessage(from, text, sendTwilio);
    } catch (err) {
      console.error("Twilio webhook unhandled error:", err);
      // Still return 200 so Twilio doesn't retry
    }
  }

  return new NextResponse("", { status: 200 });
}

async function sendTwilio(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio env vars missing:", { accountSid: !!accountSid, authToken: !!authToken, fromNumber: !!fromNumber });
    return;
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({ from: fromNumber, to, body });
}
