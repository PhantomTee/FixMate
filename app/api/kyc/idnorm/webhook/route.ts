import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase";

const WEBHOOK_SECRET = process.env.IDNORM_WEBHOOK_SECRET ?? "";

interface IdnormEvent {
  id:     string; // sessionId
  userId: string; // externalUserId (artisan id)
  sessionUpdate?: {
    status: string; // e.g. "STATUS_COMPLETED", "STATUS_FAILED"
    kyc?: unknown;
  };
}

function verifySignature(header: string, rawBody: string): boolean {
  if (!WEBHOOK_SECRET) { console.error("IDNORM-WEBHOOK: IDNORM_WEBHOOK_SECRET not set"); return false; }

  const parts = header.split(".");
  if (parts.length !== 2) return false;
  const [timestampStr, receivedHashHex] = parts;

  const receivedTimestamp = parseInt(timestampStr, 10);
  if (isNaN(receivedTimestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - receivedTimestamp) > 300) {
    console.error("IDNORM-WEBHOOK: timestamp out of tolerance");
    return false;
  }

  let receivedHash: Buffer;
  try {
    receivedHash = Buffer.from(receivedHashHex, "hex");
  } catch {
    return false;
  }

  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigUInt64LE(BigInt(receivedTimestamp));

  let key: Buffer;
  try {
    key = Buffer.from(WEBHOOK_SECRET, "hex");
  } catch {
    return false;
  }

  const hmac = createHmac("sha256", key);
  hmac.update(timestampBuffer);
  hmac.update(rawBody);
  const expectedHash = hmac.digest();

  return receivedHash.length === expectedHash.length && timingSafeEqual(receivedHash, expectedHash);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sigHeader = req.headers.get("idnorm-signature") ?? "";

  if (!verifySignature(sigHeader, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as IdnormEvent;
  const artisanId = event.userId;

  if (!artisanId || !event.sessionUpdate) {
    return NextResponse.json({}); // ignore non-status events (documentExpired, amlUpdated, etc.)
  }

  const status = event.sessionUpdate.status;
  const db = createServiceClient();

  let kycStatus: "verified" | "rejected" | "pending" = "pending";
  let isVerified = false;
  if (status === "STATUS_COMPLETED" || status === "STATUS_APPROVED") {
    kycStatus  = "verified";
    isVerified = true;
  } else if (status === "STATUS_FAILED" || status === "STATUS_REJECTED") {
    kycStatus = "rejected";
  }

  await db
    .from("artisans")
    .update({
      kyc_status:  kycStatus,
      nin_verified: isVerified,
      is_verified:  isVerified,
    })
    .eq("id", artisanId);

  return NextResponse.json({});
}
