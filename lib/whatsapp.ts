/**
 * WhatsApp Cloud API helper (Meta Graph API v21.0)
 *
 * Required env vars:
 *   WHATSAPP_TOKEN            – permanent access token or system user token
 *   WHATSAPP_PHONE_NUMBER_ID  – the numeric phone number ID from Meta dashboard
 */

const BASE_URL = "https://graph.facebook.com/v21.0";
const TOKEN    = () => process.env.WHATSAPP_TOKEN!;
const PHONE_ID = () => process.env.WHATSAPP_PHONE_NUMBER_ID!;

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function graphPost(path: string, body: unknown): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${TOKEN()}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      console.error(`[whatsapp] ${path} → ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error(`[whatsapp] ${path} fetch error:`, err);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a plain text message. Fire-and-forget — never throws.
 */
export async function sendText(to: string, text: string): Promise<void> {
  await graphPost(`${PHONE_ID()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

/**
 * Send interactive reply buttons (max 3). Fire-and-forget — never throws.
 */
export async function sendButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  await graphPost(`${PHONE_ID()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

/**
 * Send an interactive list (max 10 rows). Fire-and-forget — never throws.
 */
export async function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  rows: { id: string; title: string; description?: string }[]
): Promise<void> {
  await graphPost(`${PHONE_ID()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: {
        button: buttonLabel,
        sections: [
          {
            rows: rows.slice(0, 10).map((r) => ({
              id:          r.id,
              title:       r.title,
              description: r.description ?? "",
            })),
          },
        ],
      },
    },
  });
}

/**
 * Download a WhatsApp media file by media_id. Returns a Buffer.
 * Can throw — callers should handle errors.
 */
export async function downloadMedia(mediaId: string): Promise<Buffer> {
  // Step 1: resolve the media URL
  const metaRes = await fetch(`${BASE_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });
  if (!metaRes.ok) {
    throw new Error(
      `[whatsapp] media metadata fetch failed: ${metaRes.status}`
    );
  }
  const meta = (await metaRes.json()) as { url: string };

  // Step 2: download the binary
  const binRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });
  if (!binRes.ok) {
    throw new Error(
      `[whatsapp] media download failed: ${binRes.status}`
    );
  }
  const arrayBuffer = await binRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
