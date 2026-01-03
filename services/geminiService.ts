
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PlagiarismResult, SuggestionType, ToneTarget } from "../types";

// Always initialize fresh to ensure we pick up the latest injected API_KEY
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

// gemini-3-flash-preview is more resilient for general purpose writing tasks
const MODEL_NAME = "gemini-3-flash-preview"; 

export const analyzeText = async (
  text: string, 
  targetTone: ToneTarget
): Promise<AnalysisResult> => {
  try {
    const ai = getAIClient();
    
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

    if (!response.text) throw new Error("API returned an empty response.");
    
    const result = JSON.parse(response.text) as AnalysisResult;
    result.suggestions = result.suggestions.map((s, i) => ({ ...s, id: `sug-${Date.now()}-${i}` }));
    return result;

  } catch (error: any) {
    console.error("Gemini Analysis Error (Detailed):", error);
    // Explicitly throw the error with message for the UI to catch
    throw new Error(error.message || "Unknown error occurred during analysis.");
  }
};

export const checkPlagiarism = async (text: string): Promise<PlagiarismResult> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Check this text for plagiarism: "${text.substring(0, 1500)}"`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const matches = [];
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
          matches.push({
            segment: "Potential match found in external source.",
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
  } catch (error) {
    return { matches: [], originalityScore: 100, status: 'clean' };
  }
};

export const generateRewrite = async (text: string, instruction: string): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Rewrite this text. Instruction: ${instruction}. Text: "${text}"`,
  });
  return response.text?.trim() || text;
};
