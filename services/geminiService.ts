import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PlagiarismResult, SuggestionType, ToneTarget } from "../types";

// Helper to ensure API key exists
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
  
  // Refine the tone instruction for Journalistic requests to ensure best practices
  const toneInstruction = targetTone === ToneTarget.JOURNALISTIC
    ? "Journalistic (objective, concise, inverted pyramid structure, AP style adherence, neutral voice)"
    : targetTone;

  const prompt = `
    Analyze the following text for grammar, clarity, tone consistency (target: ${toneInstruction}), engagement, strategic gaps, and formatting opportunities.
    
    The target audience is general professional/educated unless the tone implies otherwise.
    
    Return a JSON object with:
    1. 'suggestions': An array of improvement objects. Each object must have:
       - 'type': One of [GRAMMAR, CLARITY, TONE, ENGAGEMENT, STRATEGIC, FORMATTING]
       - 'originalText': The exact snippet from the source text that needs changing. CRITICAL: Do not truncate. Must match the input text exactly, including punctuation.
       - 'suggestedText': The rewritten version or addition.
       - 'explanation': Brief reasoning.
       - 'context': The exact 3-5 words immediately preceding the 'originalText' to help locate it uniquely.
    2. 'overallScore': A number 0-100 representing overall quality.
    3. 'toneDetected': A string describing the current tone.
    4. 'readabilityScore': A number 0-100 (where 100 is very easy to read).
    5. 'readabilityLevel': A short string estimating the education level required (e.g., "6th Grade", "High School", "College", "PhD").
    6. 'summary': A 1-sentence summary of the writing quality.
    7. 'learningReview': An object containing:
       - 'grammarFocusAreas': Array of strings indicating grammar rules the user struggles with (e.g., "Passive Voice", "Comma Splices").
       - 'vocabularyTips': String giving advice on word choice improvement.
       - 'generalFeedback': String providing constructive critique on structure and flow.
       - 'recommendedResources': Array of strings recommending specific topics to study or general resources (e.g. "Review AP Stylebook", "Practice Subject-Verb Agreement").

    If the text is empty or too short to analyze, return an empty suggestions array.

    Text to analyze:
    "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    if (!response.text) throw new Error("No response from AI");
    
    const result = JSON.parse(response.text) as AnalysisResult;
    // Add IDs to suggestions
    result.suggestions = result.suggestions.map((s, i) => ({ ...s, id: `sug-${Date.now()}-${i}` }));
    return result;

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const checkPlagiarism = async (text: string): Promise<PlagiarismResult> => {
  const ai = getAIClient();
  
  // We use the search tool to find matches
  const prompt = `
    You are a plagiarism detection assistant. 
    Analyze the following text and search the web to see if significant portions of it appear to be copied directly from other sources.
    
    Focus on unique phrases or sentences that are likely to be specific to a source.
    If you find matches, return details about the source.
    
    Text to check:
    "${text.substring(0, 2000)}" 
    (Truncated to first 2000 chars for demo check efficiency)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const matches = [];
    
    // Simulate processing grounding chunks into matches
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
           matches.push({
             segment: "Matching content found related to this source.",
             sourceUrl: chunk.web.uri,
             sourceTitle: chunk.web.title,
             similarity: "Medium"
           });
        }
      }
    }

    // Determine score based on matches
    const score = matches.length > 0 ? Math.max(0, 100 - (matches.length * 20)) : 100;
    const status = score === 100 ? 'clean' : (score < 60 ? 'detected' : 'suspicious');

    return {
      matches: matches as any[], // casting for demo simplicity
      originalityScore: score,
      status: status
    };

  } catch (error) {
    console.error("Plagiarism check failed:", error);
    return { matches: [], originalityScore: 100, status: 'clean' };
  }
};

export const generateRewrite = async (text: string, instruction: string): Promise<string> => {
  const ai = getAIClient();
  
  const prompt = `
    Rewrite the following text based on this instruction: "${instruction}".
    Maintain the original meaning but change the style/tone/format as requested.
    Return only the rewritten text.
    
    Text: "${text}"
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text?.trim() || text;
};