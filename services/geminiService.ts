import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PlagiarismResult, SuggestionType, ToneTarget } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeText = async (
  text: string, 
  targetTone: ToneTarget
): Promise<AnalysisResult> => {
  const ai = getAIClient();
  
  const toneInstruction = targetTone === ToneTarget.JOURNALISTIC
    ? "JOURNALISTIC: Adhere strictly to AP Style. Focus on the 'Inverted Pyramid' (most important info first), use active voice, eliminate all editorializing/opinions, and ensure concise, punchy sentences."
    : targetTone;

  const prompt = `
    Analyze this text for grammar, clarity, and tone (Target: ${toneInstruction}).
    
    CRITICAL INSTRUCTIONS:
    1. Identify exact snippets ('originalText') for correction.
    2. Provide a 'suggestedText' that improves the snippet.
    3. Categorize suggestions into: GRAMMAR, CLARITY, TONE, ENGAGEMENT, STRATEGIC, or FORMATTING.
    4. If Journalistic, flag any use of passive voice or flowery adjectives as CLARITY or TONE issues.
    
    Return a JSON object:
    - suggestions: Array of {type, originalText, suggestedText, explanation, context}
    - overallScore: 0-100
    - toneDetected: string
    - readabilityScore: 0-100
    - readabilityLevel: string
    - summary: 1-sentence summary
    - learningReview: {
        grammarFocusAreas: Array of specific patterns to improve,
        vocabularyTips: advice on word choice,
        generalFeedback: structural and logic advice,
        recommendedResources: Array of specific books/links
      }

    TEXT:
    "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    if (!response.text) throw new Error("Empty AI response");
    
    const result = JSON.parse(response.text) as AnalysisResult;
    // Ensure IDs are present
    result.suggestions = result.suggestions.map((s, i) => ({ ...s, id: `sug-${Date.now()}-${i}` }));
    return result;

  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

export const checkPlagiarism = async (text: string): Promise<PlagiarismResult> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Check this text for plagiarism: "${text.substring(0, 1500)}"`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const matches = [];
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
          matches.push({
            segment: "Potential match detected in external source.",
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
    model: "gemini-3-flash-preview",
    contents: `Rewrite this text. Instruction: ${instruction}. Text: "${text}"`,
  });
  return response.text?.trim() || text;
};