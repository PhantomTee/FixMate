/**
 * Fire-and-forget notification helper.
 * Sends a plain text message via Termii (WhatsApp or SMS).
 * Never throws — a failed notification must never break the main request.
 */

const TERMII_API_KEY   = process.env.TERMII_API_KEY ?? "";
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID ?? "iSabi";
const BASE             = "https://v3.api.termii.com";

export async function sendNotification(
  phone:   string,
  message: string,
  channel: "WhatsApp" | "sms" = "WhatsApp"
): Promise<void> {
  if (!TERMII_API_KEY || !phone?.trim()) return;
  try {
    await fetch(`${BASE}/api/sms/send`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TERMII_API_KEY,
        to:      phone.trim(),
        from:    TERMII_SENDER_ID,
        sms:     message,
        type:    "plain",
        channel: channel === "sms" ? "generic" : "WhatsApp",
      }),
    });
  } catch {
    // intentionally swallowed
  }
}
