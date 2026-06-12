import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

const KYC_PROMPT = `You are a KYC verification agent for iSabi, a Nigerian home-services marketplace.

You are given two images:
- Image 1: a government-issued identity document (NIN slip, voter card, or driver's licence)
- Image 2: a live selfie taken by the applicant right now

Your tasks:
1. Use OCR to read the full name and NIN (or ID number) printed on the identity document.
2. Compare the face photograph on the identity document to the face in the live selfie. Consider lighting, angle, and natural ageing.
3. Return ONLY a valid JSON object with exactly this structure — no markdown, no explanation:

{
  "extracted_name": "full name as printed on the document, or empty string if unreadable",
  "extracted_nin": "NIN or ID number as printed, or empty string if unreadable",
  "face_match": true or false,
  "confidence": a number between 0.0 and 1.0,
  "verified": true if face_match is true AND name was extracted successfully, otherwise false,
  "reason": "one sentence explaining the result"
}`;

function stripBase64Prefix(dataUrl: string): { data: string; mimeType: string } {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: "image/jpeg", data: dataUrl };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { ninCard: string; selfie: string };
  if (!body.ninCard || !body.selfie) {
    return NextResponse.json({ error: "ninCard and selfie are required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY_1;
  if (!apiKey) {
    // Demo mode — return mock pass so onboarding can be tested without a key
    return NextResponse.json({
      extracted_name: "Demo User",
      extracted_nin:  "00000000000",
      face_match:     true,
      confidence:     0.99,
      verified:       true,
      reason:         "Demo mode — GEMINI_API_KEY not configured. Set it to enable real KYC.",
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  const idImage  = stripBase64Prefix(body.ninCard);
  const selfieImg = stripBase64Prefix(body.selfie);

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{
        role: "user",
        parts: [
          { text: KYC_PROMPT },
          { inlineData: { mimeType: idImage.mimeType  as "image/jpeg", data: idImage.data  } },
          { inlineData: { mimeType: selfieImg.mimeType as "image/jpeg", data: selfieImg.data } },
        ],
      }],
    });

    const raw = response.text ?? "";
    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "").trim();
    const result = JSON.parse(jsonStr) as {
      extracted_name: string;
      extracted_nin:  string;
      face_match:     boolean;
      confidence:     number;
      verified:       boolean;
      reason:         string;
    };

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gemini KYC call failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
