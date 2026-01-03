
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PlagiarismResult, SuggestionType, ToneTarget } from "../types";

// gemini-3-flash-preview: High quota, low latency, excellent for high-volume editing tasks.
const MODEL_NAME = "gemini-3-flash-preview"; 

const callGemini = async (fn: (ai: GoogleGenAI) => Promise<any>) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
    throw new Error("CONNECTION_REQUIRED: No API Key found.");
  }
  const ai = new GoogleGenAI({ apiKey });
  return await fn(ai);
};

export const analyzeText = async (
  text: string, 
  targetTone: ToneTarget
): Promise<AnalysisResult> => {
  return await callGemini(async (ai) => {
    const prompt = `
      Act as a pedantic Senior Copy Editor. Your goal is to find EVERY flaw in the provided text.
      
      DIAGNOSTIC CHECKLIST (Execute all):
      1. MECHANICAL: Check for typos, subtle spelling errors, and missing/extra spaces.
      2. SYNTACTIC: Find subject-verb disagreements, incorrect tenses, and dangling modifiers.
      3. PUNCTUATION: Identify missing Oxford commas, misplaced semicolons, and curly vs straight quote inconsistencies.
      4. STYLE: Flag passive voice, repetitive words, and weak verbs.
      5. TONE: Grade the text strictly against a "${targetTone}" profile.
      
      CRITICAL: Do not ignore "small" things. Even if the text is generally good, find ways to make it perfect.
      
      Return a JSON object:
      {
        "suggestions": [{
          "type": "GRAMMAR" | "CLARITY" | "TONE" | "ENGAGEMENT" | "STRATEGIC",
          "originalText": "exact text from the original",
          "suggestedText": "the correction",
          "explanation": "why this change is needed",
          "context": "short snippet for location"
        }],
        "overallScore": 0-100,
        "toneDetected": "string",
        "readabilityScore": 0-100,
        "readabilityLevel": "string",
        "summary": "One sentence summary.",
        "learningReview": {
          "grammarFocusAreas": ["Topic A", "Topic B"],
          "vocabularyTips": "Specific advice on word choice",
          "generalFeedback": "Comprehensive critique",
          "recommendedResources": ["Book/Guide Name"]
        }
      }

      TEXT TO SCAN:
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1, // Lower temperature for more consistent, accurate grammar results
      },
    });

    if (!response.text) throw new Error("Engine returned empty result.");
    
    const cleanedText = response.text.replace(/```json|```/gi, '').trim();
    const result = JSON.parse(cleanedText) as AnalysisResult;
    
    // Ensure all suggestions have unique IDs and valid types
    result.suggestions = result.suggestions.map((s, i) => ({ 
      ...s, 
      id: `sug-${Date.now()}-${i}`,
      type: s.type || SuggestionType.CLARITY
    }));
    
    return result;
  });
};

export const checkPlagiarism = async (text: string): Promise<PlagiarismResult> => {
  return await callGemini(async (ai) => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Search for matches for this text segment: "${text.substring(0, 800)}"`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const matches = [];
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
          matches.push({
            segment: "External text match.",
            sourceUrl: chunk.web.uri,
            sourceTitle: chunk.web.title,
            similarity: "Verified"
          });
        }
      }
    }
    const score = matches.length > 0 ? Math.max(0, 100 - (matches.length * 20)) : 100;
    return { 
      matches, 
      originalityScore: score, 
      status: score === 100 ? 'clean' : (score < 40 ? 'detected' : 'suspicious') 
    };
  });
};

export const generateRewrite = async (text: string, instruction: string): Promise<string> => {
  return await callGemini(async (ai) => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Rewrite this text: "${instruction}".\n\nOriginal: "${text}"`,
    });
    return response.text?.trim() || text;
  });
};
