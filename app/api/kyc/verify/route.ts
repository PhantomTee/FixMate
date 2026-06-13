import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const KYC_PROMPT = `You are a KYC verification agent for iSabi, a Nigerian home-services marketplace.

You are given two images:
- Image 1: a government-issued identity document (NIN slip, voter card, or driver's licence)
- Image 2: a live selfie taken by the applicant right now

Your tasks:
1. Use OCR to read the full name and NIN (or ID number) printed on the identity document.
2. Compare the face photograph on the identity document to the face in the live selfie. Consider lighting, angle, and natural ageing.
3. Return ONLY a valid JSON object — no markdown, no explanation:

{
  "extracted_name": "full name as printed on the document, or empty string if unreadable",
  "extracted_nin": "NIN or ID number as printed, or empty string if unreadable",
  "face_match": true or false,
  "confidence": a number between 0.0 and 1.0,
  "verified": true if face_match is true AND name was extracted successfully, otherwise false,
  "reason": "one sentence explaining the result"
}`;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { ninCard: string; selfie: string };
  if (!body.ninCard || !body.selfie) {
    return NextResponse.json({ error: "ninCard and selfie are required" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Demo mode — return mock pass so onboarding can be tested without a key
    return NextResponse.json({
      extracted_name: "Demo User",
      extracted_nin:  "00000000000",
      face_match:     true,
      confidence:     0.99,
      verified:       true,
      reason:         "Demo mode — iSabi AI verification key not configured.",
    });
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: KYC_PROMPT },
            { type: "image_url", image_url: { url: body.ninCard } },
            { type: "image_url", image_url: { url: body.selfie } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw) as {
      extracted_name: string;
      extracted_nin:  string;
      face_match:     boolean;
      confidence:     number;
      verified:       boolean;
      reason:         string;
    };

    // Ensure required fields exist
    return NextResponse.json({
      extracted_name: result.extracted_name ?? "",
      extracted_nin:  result.extracted_nin  ?? "",
      face_match:     result.face_match     ?? false,
      confidence:     result.confidence     ?? 0,
      verified:       result.verified       ?? false,
      reason:         result.reason         ?? "Unable to verify",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "iSabi AI verification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
