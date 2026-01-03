
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PlagiarismResult, SuggestionType, ToneTarget } from "../types";

// gemini-3-flash-preview: Best balance of high quota and linguistic reasoning for free tier.
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
      You are the world's most rigorous Linguistic Auditor. Your specialty is detecting 100% of punctuation, syntax, and grammatical errors.
      
      CRITICAL OPERATIONAL PROTOCOL:
      1. DETECT: Find every typo, missing comma (especially Oxford commas), misplaced semicolon, and clunky syntactic structure.
      2. VERIFY: Before finalizing a suggestion, perform a "Self-Audit". Ensure your "suggestedText" is itself 100% perfect.
      3. SYNTAX: Identify "wordy" or passive phrasing that obscures meaning.
      4. PUNCTUATION: Check terminal marks, apostrophe placement, and parenthetical commas.
      5. TONE: Ensure strict alignment with the "${targetTone}" profile. If the tone is Professional, eliminate all slang or informal contractions.

      GOAL: Zero errors remain in the text after your suggestions are applied.

      Return ONLY a valid JSON object:
      {
        "suggestions": [{
          "type": "GRAMMAR" | "CLARITY" | "TONE" | "ENGAGEMENT" | "STRATEGIC",
          "originalText": "exact text from the original",
          "suggestedText": "the flawless correction",
          "explanation": "concise linguistic reasoning",
          "context": "short snippet for location"
        }],
        "overallScore": 0-100,
        "toneDetected": "string",
        "readabilityScore": 0-100,
        "readabilityLevel": "string",
        "summary": "One sentence overview of quality.",
        "learningReview": {
          "grammarFocusAreas": ["Specific Topic 1", "Specific Topic 2"],
          "vocabularyTips": "High-level lexical advice",
          "generalFeedback": "A deep critique of the writer's habits",
          "recommendedResources": ["Specific Grammar Guide or Tool"]
        }
      }

      TEXT TO AUDIT:
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Using 0.0 for maximum accuracy and zero "creativity" in grammar checks
        temperature: 0, 
        topP: 0.1,
      },
    });

    if (!response.text) throw new Error("Linguistic Engine returned no data.");
    
    const cleanedText = response.text.replace(/```json|```/gi, '').trim();
    const result = JSON.parse(cleanedText) as AnalysisResult;
    
    // Stabilize suggestion objects
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
      contents: `Perform a global originality scan for: "${text.substring(0, 800)}"`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const matches = [];
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
          matches.push({
            segment: "Web match detected.",
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
      contents: `Refine this text to be grammatically perfect following this instruction: "${instruction}".\n\nOriginal: "${text}"`,
      config: { temperature: 0.2 }
    });
    return response.text?.trim() || text;
  });
};
