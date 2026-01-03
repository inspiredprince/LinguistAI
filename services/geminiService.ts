
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PlagiarismResult, SuggestionType, ToneTarget } from "../types";

const MODEL_NAME = "gemini-3-flash-preview"; 

/**
 * Utility to execute a Gemini call with safety checks.
 * Prevents the SDK from throwing a "Key must be set" error by validating first.
 */
const callGemini = async (fn: (ai: GoogleGenAI) => Promise<any>) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
    throw new Error("CONNECTION_REQUIRED: No API Key found. Please ensure you are running in AI Studio Preview or have set the API_KEY environment variable.");
  }

  // Only instantiate once we know we have a key string
  const ai = new GoogleGenAI({ apiKey });
  return await fn(ai);
};

export const analyzeText = async (
  text: string, 
  targetTone: ToneTarget
): Promise<AnalysisResult> => {
  return await callGemini(async (ai) => {
    const toneInstruction = targetTone === ToneTarget.JOURNALISTIC
      ? "JOURNALISTIC: Adhere strictly to AP Style. Focus on the 'Inverted Pyramid', use active voice, and eliminate editorializing."
      : targetTone;

    const prompt = `
      Analyze this text for grammar, clarity, and tone (Target: ${toneInstruction}).
      
      Return a JSON object:
      - suggestions: Array of {type, originalText, suggestedText, explanation, context}
      - overallScore: 0-100
      - toneDetected: string
      - readabilityScore: 0-100
      - readabilityLevel: string
      - summary: 1-sentence summary
      - learningReview: {
          grammarFocusAreas: Array of strings,
          vocabularyTips: string,
          generalFeedback: string,
          recommendedResources: Array of strings
        }

      TEXT: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: Object.values(SuggestionType) },
                  originalText: { type: Type.STRING },
                  suggestedText: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  context: { type: Type.STRING },
                },
                required: ["type", "originalText", "suggestedText", "explanation"],
              },
            },
            overallScore: { type: Type.NUMBER },
            toneDetected: { type: Type.STRING },
            readabilityScore: { type: Type.NUMBER },
            readabilityLevel: { type: Type.STRING },
            summary: { type: Type.STRING },
            learningReview: {
              type: Type.OBJECT,
              properties: {
                grammarFocusAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                vocabularyTips: { type: Type.STRING },
                generalFeedback: { type: Type.STRING },
                recommendedResources: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["grammarFocusAreas", "vocabularyTips", "generalFeedback", "recommendedResources"]
            }
          },
          required: ["suggestions", "overallScore", "toneDetected", "readabilityScore", "readabilityLevel", "summary", "learningReview"],
        },
      },
    });

    if (!response.text) throw new Error("LinguistAI: Empty response from Gemini engine.");
    
    const result = JSON.parse(response.text) as AnalysisResult;
    result.suggestions = result.suggestions.map((s, i) => ({ ...s, id: `sug-${Date.now()}-${i}` }));
    return result;
  });
};

export const checkPlagiarism = async (text: string): Promise<PlagiarismResult> => {
  return await callGemini(async (ai) => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Perform a web-grounded search to check this text for matches: "${text.substring(0, 1500)}"`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const matches = [];
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
          matches.push({
            segment: "Potential match detected in external sources.",
            sourceUrl: chunk.web.uri,
            sourceTitle: chunk.web.title,
            similarity: "Medium"
          });
        }
      }
    }
    const score = matches.length > 0 ? Math.max(0, 100 - (matches.length * 15)) : 100;
    return { 
      matches, 
      originalityScore: score, 
      status: score === 100 ? 'clean' : (score < 50 ? 'detected' : 'suspicious') 
    };
  });
};

export const generateRewrite = async (text: string, instruction: string): Promise<string> => {
  return await callGemini(async (ai) => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Rewrite text according to: ${instruction}. Text: "${text}"`,
    });
    return response.text?.trim() || text;
  });
};
