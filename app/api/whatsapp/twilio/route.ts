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
  const form     = await req.formData();
  const text     = ((form.get("Body") as string) ?? "").trim();
  const from     = (form.get("From") as string) ?? "";
  const numMedia = parseInt((form.get("NumMedia") as string) ?? "0");
  const mediaUrl = numMedia > 0 ? (form.get("MediaUrl0") as string | null) : null;

  if (from) {
    try {
      // Fetch image as base64 when present (Twilio media requires Basic Auth)
      let imageBase64: string | null = null;
      if (mediaUrl) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
        const authToken  = process.env.TWILIO_AUTH_TOKEN  ?? "";
        const creds      = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        const imgRes     = await fetch(mediaUrl, { headers: { Authorization: `Basic ${creds}` } });
        if (imgRes.ok) {
          const buf         = await imgRes.arrayBuffer();
          const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
          imageBase64       = `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`;
        }
      }

      if (text || imageBase64) {
        await handleBotMessage(from, text, sendTwilio, imageBase64);
      }
    } catch (err) {
      console.error("Twilio webhook unhandled error:", err);
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
