"use server";

import Groq from "groq-sdk";
import {
  ARTISAN_CATEGORIES,
  ArtisanBrief,
  ArtisanCategory,
  DisputeSummary,
  JobDiagnosis,
  QuoteFairness,
  SupportedLanguage,
  Urgency,
} from "@/lib/types";

const categories = ARTISAN_CATEGORIES.join(", ");

const GROQ_KEY = process.env.GROQ_API_KEY;

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL   = "llama-3.3-70b-versatile";

function getGroq() {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY is not configured");
  return new Groq({ apiKey: GROQ_KEY });
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function groqJson<T>(
  parts: ContentPart[],
  model: string
): Promise<T> {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: "user", content: parts }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });
  const text = completion.choices[0]?.message?.content ?? "{}";
  return parseJson(text) as T;
}

// ── Diagnosis ─────────────────────────────────────────────────────────────────
export async function diagnoseIssue(
  description: string,
  imageBase64: string | null,
  language: SupportedLanguage = "English"
): Promise<JobDiagnosis> {
  if (!GROQ_KEY) return mockDiagnosis(description, language);
  try {
    const langNote =
      language !== "English"
        ? `Respond in ${language} for user-facing fields (issue_title, summary, safety_warning, first_aid_steps, follow_up_questions). Keep artisan_category and urgency in English.`
        : "Respond in English.";

    const prompt = `You are iSabi AI, a careful Nigerian home/service repair triage assistant.
Return JSON only. Do not include markdown.

${langNote}

Use one artisan_category from: ${categories}.
Use urgency: High, Medium, or Low.
All naira estimate fields must be numbers only.
For electrical, gas, generator smoke/fumes, exposed wires, sparking, burning smells, or fuel leaks:
warn the user to stop using equipment, isolate power/fuel only if safe, ventilate, keep children away, wait for a professional.

Input description:
${description || "No text description provided."}
Image provided: ${imageBase64 ? "yes" : "no"}

Return this exact JSON shape:
{
  "issue_title": "Short title",
  "summary": "2-3 sentence diagnosis",
  "artisan_category": "Plumber",
  "urgency": "High",
  "estimated_min_naira": 15000,
  "estimated_max_naira": 25000,
  "estimated_labor_naira": 10000,
  "estimated_materials_naira": 15000,
  "safety_warning": "Warning text or null",
  "first_aid_steps": ["step 1", "step 2"],
  "follow_up_questions": ["question 1?", "question 2?"],
  "artisan_brief": {
    "problem_summary": "1-2 sentences for the artisan",
    "likely_cause": "Root cause",
    "tools_to_bring": ["tool 1", "tool 2"],
    "safety_risks": ["risk 1"],
    "estimated_price_range": "₦X – ₦Y"
  }
}`;

    const parts: ContentPart[] = [{ type: "text", text: prompt }];
    if (imageBase64) {
      // Pass raw data URI directly — iSabi AI vision accepts data URIs
      parts.push({ type: "image_url", image_url: { url: imageBase64 } });
    }

    const model = imageBase64 ? VISION_MODEL : TEXT_MODEL;
    const raw = await groqJson<Record<string, unknown>>(parts, model);
    const diagnosis = validateDiagnosis(raw, description);
    return { ...diagnosis, language };
  } catch (error) {
    console.error("iSabi AI diagnosis failed:", error);
    return { ...mockDiagnosis(description, language), error: "AI unavailable. Showing a safe demo diagnosis." };
  }
}

// ── Artisan Brief ─────────────────────────────────────────────────────────────
export async function generateArtisanBrief(
  diagnosis: JobDiagnosis,
  userLocation: string
): Promise<ArtisanBrief> {
  if (!GROQ_KEY) return mockArtisanBrief(diagnosis);
  try {
    const prompt = `You are iSabi AI creating a pre-job brief for a Nigerian artisan.
Return JSON only. No markdown.

Diagnosis: ${JSON.stringify({ title: diagnosis.issue_title, category: diagnosis.artisan_category, summary: diagnosis.summary })}
Estimated range: ₦${diagnosis.estimated_min_naira} – ₦${diagnosis.estimated_max_naira}
User location: ${userLocation}

Return:
{
  "problem_summary": "Brief for artisan (2 sentences, what to expect on arrival)",
  "likely_cause": "Most likely root cause",
  "tools_to_bring": ["tool 1", "tool 2", "tool 3"],
  "safety_risks": ["risk 1", "risk 2"],
  "estimated_price_range": "₦min – ₦max"
}`;

    const raw = await groqJson<Record<string, unknown>>(
      [{ type: "text", text: prompt }],
      TEXT_MODEL
    );
    return {
      problem_summary: asText(raw.problem_summary, diagnosis.summary),
      likely_cause: asText(raw.likely_cause, "Requires on-site inspection"),
      tools_to_bring: asStringArray(raw.tools_to_bring, ["Tools for " + diagnosis.artisan_category]),
      safety_risks: asStringArray(raw.safety_risks, diagnosis.safety_warning ? [diagnosis.safety_warning] : ["Follow standard precautions"]),
      estimated_price_range: asText(raw.estimated_price_range, `₦${diagnosis.estimated_min_naira.toLocaleString()} – ₦${diagnosis.estimated_max_naira.toLocaleString()}`),
    };
  } catch {
    return mockArtisanBrief(diagnosis);
  }
}

// ── Quote Fairness Checker ────────────────────────────────────────────────────
export async function checkQuoteFairness(
  artisanQuote: number,
  diagnosis: JobDiagnosis
): Promise<QuoteFairness> {
  const { estimated_min_naira: min, estimated_max_naira: max } = diagnosis;
  const ratio = artisanQuote / max;

  if (ratio <= 0.3) {
    return {
      verdict: "too_low",
      explanation: "Quote is significantly below the estimated range. Artisan may cut corners or use substandard materials.",
      recommended_range: `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`,
    };
  }
  if (ratio >= 3.0) {
    return {
      verdict: "suspiciously_high",
      explanation: "Quote is over 3× the estimated range. This may indicate upselling or a misdiagnosis.",
      recommended_range: `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`,
    };
  }

  if (!GROQ_KEY) return localQuoteFairness(artisanQuote, diagnosis);
  try {
    const prompt = `You are iSabi AI reviewing a Nigerian artisan's quote.
Return JSON only. No markdown.

Job: ${diagnosis.issue_title} (${diagnosis.artisan_category})
AI estimated range: ₦${min.toLocaleString()} – ₦${max.toLocaleString()}
Artisan quote: ₦${artisanQuote.toLocaleString()}

Verdict must be one of: "fair", "high_but_explainable", "suspiciously_high", "too_low"

Return:
{
  "verdict": "fair",
  "explanation": "1-2 sentence explanation for the customer",
  "recommended_range": "₦X – ₦Y"
}`;

    const raw = await groqJson<Record<string, unknown>>(
      [{ type: "text", text: prompt }],
      TEXT_MODEL
    );
    const validVerdicts = ["fair", "high_but_explainable", "suspiciously_high", "too_low"];
    return {
      verdict: validVerdicts.includes(raw.verdict as string)
        ? (raw.verdict as QuoteFairness["verdict"])
        : localQuoteFairness(artisanQuote, diagnosis).verdict,
      explanation: asText(raw.explanation, localQuoteFairness(artisanQuote, diagnosis).explanation),
      recommended_range: asText(raw.recommended_range, `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`),
    };
  } catch {
    return localQuoteFairness(artisanQuote, diagnosis);
  }
}

// ── Dispute Summary ───────────────────────────────────────────────────────────
export async function generateDisputeSummary(input: {
  userComplaint: string;
  artisanStatus: string;
  escrowStatus: string;
  diagnosisTitle: string;
  quoteAmount: number;
}): Promise<DisputeSummary> {
  if (!GROQ_KEY) return mockDisputeSummary(input);
  try {
    const prompt = `You are iSabi AI summarizing a payment dispute for a platform admin.
Return JSON only. No markdown.

Dispute details:
- User complaint: ${input.userComplaint}
- Artisan job status: ${input.artisanStatus}
- Escrow status: ${input.escrowStatus}
- Job: ${input.diagnosisTitle}
- Amount at stake: ₦${input.quoteAmount.toLocaleString()}

Recommended action must be one of: "refund", "release", "partial_refund", "request_evidence"

Return:
{
  "user_complaint": "Concise summary of the user's complaint",
  "artisan_status": "Concise summary of the artisan's position",
  "payment_state": "State of the escrow",
  "recommended_action": "refund",
  "reasoning": "1-2 sentences explaining the recommendation"
}`;

    const raw = await groqJson<Record<string, unknown>>(
      [{ type: "text", text: prompt }],
      TEXT_MODEL
    );
    const validActions = ["refund", "release", "partial_refund", "request_evidence"];
    return {
      user_complaint: asText(raw.user_complaint, input.userComplaint),
      artisan_status: asText(raw.artisan_status, input.artisanStatus),
      payment_state: asText(raw.payment_state, input.escrowStatus),
      recommended_action: validActions.includes(raw.recommended_action as string)
        ? (raw.recommended_action as DisputeSummary["recommended_action"])
        : "request_evidence",
      reasoning: asText(raw.reasoning, "Further evidence is needed to determine the outcome."),
    };
  } catch {
    return mockDisputeSummary(input);
  }
}

export async function getMapsApiKey() {
  return process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
}

// ── Private helpers ───────────────────────────────────────────────────────────

function parseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const raw = fenced?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  return JSON.parse(raw);
}

function validateDiagnosis(value: unknown, description: string): JobDiagnosis {
  const fallback = mockDiagnosis(description, "English");
  const data = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const category = ARTISAN_CATEGORIES.includes(data.artisan_category as ArtisanCategory)
    ? (data.artisan_category as ArtisanCategory)
    : fallback.artisan_category;
  const urgency = ["High", "Medium", "Low"].includes(data.urgency as Urgency)
    ? (data.urgency as Urgency)
    : fallback.urgency;
  const max = asMoney(data.estimated_max_naira, fallback.estimated_max_naira);
  const min = Math.min(asMoney(data.estimated_min_naira, fallback.estimated_min_naira), max);

  let artisanBrief: ArtisanBrief | undefined;
  if (data.artisan_brief && typeof data.artisan_brief === "object") {
    const b = data.artisan_brief as Record<string, unknown>;
    artisanBrief = {
      problem_summary: asText(b.problem_summary, fallback.summary),
      likely_cause: asText(b.likely_cause, "Requires on-site inspection"),
      tools_to_bring: asStringArray(b.tools_to_bring, []),
      safety_risks: asStringArray(b.safety_risks, []),
      estimated_price_range: asText(b.estimated_price_range, `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`),
    };
  }

  return {
    issue_title: asText(data.issue_title, fallback.issue_title),
    summary: asText(data.summary, fallback.summary),
    artisan_category: category,
    urgency,
    estimated_min_naira: min,
    estimated_max_naira: max,
    estimated_labor_naira: asMoney(data.estimated_labor_naira, fallback.estimated_labor_naira),
    estimated_materials_naira: asMoney(data.estimated_materials_naira, fallback.estimated_materials_naira),
    safety_warning: typeof data.safety_warning === "string" ? data.safety_warning : fallback.safety_warning,
    first_aid_steps: asStringArray(data.first_aid_steps, fallback.first_aid_steps),
    follow_up_questions: asStringArray(data.follow_up_questions, fallback.follow_up_questions),
    artisan_brief: artisanBrief,
  };
}

function asText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
function asMoney(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
function asStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value)
    ? value.filter((i): i is string => typeof i === "string" && i.trim().length > 0).slice(0, 6)
    : fallback;
}

function localQuoteFairness(quote: number, diagnosis: JobDiagnosis): QuoteFairness {
  const { estimated_min_naira: min, estimated_max_naira: max } = diagnosis;
  const ratio = quote / max;
  const range = `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`;
  if (ratio <= 0.5) return { verdict: "too_low", explanation: "Quote is well below typical range. Verify materials quality.", recommended_range: range };
  if (ratio <= 1.2) return { verdict: "fair", explanation: "Quote is within the expected range for this type of repair.", recommended_range: range };
  if (ratio <= 2.0) return { verdict: "high_but_explainable", explanation: "Quote is above typical range but may reflect emergency availability or specialized parts.", recommended_range: range };
  return { verdict: "suspiciously_high", explanation: "Quote is significantly above the AI estimate. Consider getting a second opinion.", recommended_range: range };
}

function mockArtisanBrief(diagnosis: JobDiagnosis): ArtisanBrief {
  return {
    problem_summary: diagnosis.summary,
    likely_cause: "Requires on-site inspection to confirm root cause.",
    tools_to_bring: ["Standard toolkit for " + diagnosis.artisan_category, "Spare parts", "Testing equipment"],
    safety_risks: diagnosis.safety_warning ? [diagnosis.safety_warning] : ["Follow standard safety precautions"],
    estimated_price_range: `₦${diagnosis.estimated_min_naira.toLocaleString()} – ₦${diagnosis.estimated_max_naira.toLocaleString()}`,
  };
}

function mockDisputeSummary(input: {
  userComplaint: string;
  artisanStatus: string;
  escrowStatus: string;
  diagnosisTitle: string;
  quoteAmount: number;
}): DisputeSummary {
  return {
    user_complaint: input.userComplaint || "User reports the job was not completed satisfactorily.",
    artisan_status: input.artisanStatus || "Artisan claims the job was completed as agreed.",
    payment_state: input.escrowStatus,
    recommended_action: "request_evidence",
    reasoning: "Both parties should provide photo evidence before admin releases or refunds the escrow.",
  };
}

function mockDiagnosis(desc: string, language: SupportedLanguage): JobDiagnosis {
  const text = desc.toLowerCase();
  const dangerous = ["smoke", "sparking", "shock", "burning", "gas", "fuel", "generator"].some((w) => text.includes(w));

  const category: ArtisanCategory = text.includes("generator")
    ? "Generator Repair"
    : text.includes("wire") || text.includes("socket") || text.includes("light") || text.includes("spark")
      ? "Electrician"
      : text.includes("pipe") || text.includes("leak") || text.includes("tap") || text.includes("water")
        ? "Plumber"
        : text.includes("ac") || text.includes("air conditioner") || text.includes("cooling")
          ? "AC Repair"
          : "Other";

  const warningMap: Record<SupportedLanguage, string | null> = {
    English: dangerous ? "Stop using the equipment immediately. Switch off power or fuel if safe, ventilate, keep children away, wait for a professional." : null,
    Pidgin:  dangerous ? "Abeg stop use that equipment now now! Off the light or fuel if e safe, give the place fresh air, move pikin comot, wait for correct professional." : null,
    Yoruba:  dangerous ? "Jọwọ da ẹrọ naa duro lẹsẹkẹsẹ. Pa ina tabi epo ti o ba ṣee ṣe, duro fun ọjọgbọn." : null,
    Hausa:   dangerous ? "Da fatan za a dakatar da amfani da na'urar yanzu. Kashe wutar lantarki ko mai, jira ƙwararren mutum." : null,
    Igbo:    dangerous ? "Biko kwụsị iji ngwa ahụ ozugbo. Wepu ọkụ ma ọ bụ mmanụ, chere ọkà mmụta." : null,
  };

  return {
    issue_title: language === "Pidgin" ? `${category} wahala dey` :
                 language === "Yoruba" ? `Iṣoro ${category}` :
                 language === "Hausa"  ? `Matsalar ${category}` :
                 language === "Igbo"   ? `Nsogbu ${category}` :
                 category === "Other"  ? "General repair request" : `${category} inspection needed`,
    summary: "iSabi AI generated a safe preliminary assessment and matched the likely artisan category for a Nigerian service visit.",
    artisan_category: category,
    urgency: dangerous ? "High" : "Medium",
    estimated_min_naira: dangerous ? 25000 : 12000,
    estimated_max_naira: dangerous ? 55000 : 30000,
    estimated_labor_naira: dangerous ? 20000 : 10000,
    estimated_materials_naira: dangerous ? 35000 : 20000,
    safety_warning: warningMap[language],
    first_aid_steps: dangerous
      ? ["Stop using the equipment.", "Move people away from smoke, fumes, fuel, or exposed wires.", "Do not attempt repairs yourself."]
      : ["Avoid forcing the faulty item.", "Take a clear photo for the artisan.", "Keep the area accessible."],
    follow_up_questions: [
      "When did the issue start?",
      "Has anyone attempted a repair already?",
      "What area of your city should the artisan visit?",
    ],
    artisan_brief: {
      problem_summary: `${category} issue reported. ${dangerous ? "Dangerous condition — artisan should bring safety gear." : "Standard inspection required."}`,
      likely_cause: "Requires on-site inspection to confirm root cause.",
      tools_to_bring: ["Standard toolkit", "Testing equipment", "Spare parts for common faults"],
      safety_risks: dangerous ? ["Fire / electrical hazard", "Toxic fumes possible"] : ["Standard precautions apply"],
      estimated_price_range: `₦${(dangerous ? 25000 : 12000).toLocaleString()} – ₦${(dangerous ? 55000 : 30000).toLocaleString()}`,
    },
    language,
  };
}
