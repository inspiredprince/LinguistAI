
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PlagiarismResult, SuggestionType, ToneTarget } from "../types";

// Upgraded to Pro for "Complex Text Tasks" like advanced grammar reasoning
const MODEL_NAME = "gemini-3-pro-preview"; 

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
      You are a world-class senior editor and linguistic analyst. 
      Analyze the provided text with extreme precision. 
      
      CRITICAL INSTRUCTIONS:
      1. Detect ALL errors: spelling, punctuation (including Oxford commas), syntax, tense shifts, and style inconsistencies.
      2. Adhere strictly to the requested tone: ${targetTone}.
      3. If a sentence is grammatically correct but stylistically weak, provide a "CLARITY" or "ENGAGEMENT" suggestion.
      4. DO NOT overlook subtle errors. Check every single word.
      
      Return a JSON object exactly matching this schema:
      {
        "suggestions": [{"type": "GRAMMAR"|"CLARITY"|"TONE"|"ENGAGEMENT"|"STRATEGIC", "originalText": string, "suggestedText": string, "explanation": string, "context": string}],
        "overallScore": number (0-100),
        "toneDetected": string,
        "readabilityScore": number (0-100),
        "readabilityLevel": string (e.g., "College Level", "Grade 10"),
        "summary": string (one sentence),
        "learningReview": {
          "grammarFocusAreas": [string],
          "vocabularyTips": string,
          "generalFeedback": string,
          "recommendedResources": [string]
        }
      }

      TEXT TO ANALYZE:
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // No schema defined here to give Pro more flexibility in its reasoning, 
        // but the prompt is strict about the JSON structure.
      },
    });

    if (!response.text) throw new Error("LinguistAI: Engine returned empty result.");
    
    // Clean JSON response (sometimes models add markdown blocks)
    const cleanedText = response.text.replace(/```json|```/gi, '').trim();
    const result = JSON.parse(cleanedText) as AnalysisResult;
    
    // Assign stable IDs for React keys
    result.suggestions = result.suggestions.map((s, i) => ({ 
      ...s, 
      id: `sug-${Date.now()}-${i}` 
    }));
    
    return result;
  });
};

export const checkPlagiarism = async (text: string): Promise<PlagiarismResult> => {
  return await callGemini(async (ai) => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Search for direct matches and paraphrased plagiarism for: "${text.substring(0, 1000)}"`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const matches = [];
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
          matches.push({
            segment: "External citation or match detected.",
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
      contents: `Act as an expert rewriter. Transform the following text based on this instruction: "${instruction}".\n\nOriginal Text: "${text}"`,
    });
    return response.text?.trim() || text;
  });
};
