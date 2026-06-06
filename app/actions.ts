'use server';

import { GoogleGenAI } from "@google/genai";
import { JobDiagnosis } from "@/lib/types";

export async function diagnoseIssue(description: string, imageBase64: string | null): Promise<JobDiagnosis> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Using mock response.");
      return mockDiagnosis(description);
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
System: You are FixMate AI for Nigeria. Analyze home repair issues. Respond in JSON only.
Input description: ${description}
${imageBase64 ? "Image was provided." : "No image provided."}

Expected output format:
{
  "issue_title": "Short title of the problem",
  "artisan_category": "Plumber" | "Electrician" | "AC Repair" | "Tailor" | "Generator Repair" | "Cleaning" | "Other",
  "urgency": "High" | "Medium" | "Low",
  "estimated_cost_naira": "Amount in Naira e.g. 15,000 - 25,000",
  "safety_warning": "Warning about safety, or null if none",
  "follow_up_questions": ["question 1?", "question 2?"]
}
`;

    const contents: any[] = [prompt];

    if (imageBase64) {
      // Assuming format: data:image/jpeg;base64,...
      const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match && match.length === 3) {
        contents.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
    });

    const text = response.text || "{}";
    
    // Attempt to extract JSON from response
    // Model might return markdown block: ```json\n{...}\n```
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) jsonStr = braceMatch[0];
    }

    return JSON.parse(jsonStr) as JobDiagnosis;

  } catch (error) {
    console.error("Gemini err:", error);
    return {
      error: "Failed to connect to AI assessor."
    };
  }
}

export async function getMapsApiKey() {
  return process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
}

// Fallback logic if API key isn't provided
function mockDiagnosis(desc: string): JobDiagnosis {
  const isAC = desc.toLowerCase().includes('ac') || desc.toLowerCase().includes('air conditioner');
  return {
    issue_title: isAC ? "AC Compressor Issue" : "General Home Repair",
    artisan_category: isAC ? "AC Repair" : "Other",
    urgency: "Medium",
    estimated_cost_naira: "10,000 - 20,000",
    safety_warning: null,
    follow_up_questions: ["When did the problem start?", "Are there any loud noises?"]
  }
}
