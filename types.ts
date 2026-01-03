export enum SuggestionType {
  GRAMMAR = 'GRAMMAR',
  CLARITY = 'CLARITY',
  TONE = 'TONE',
  ENGAGEMENT = 'ENGAGEMENT',
  STRATEGIC = 'STRATEGIC',
  FORMATTING = 'FORMATTING',
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  originalText: string;
  suggestedText: string;
  explanation: string;
  context?: string; // Surrounding text to help locate the error
}

export interface LearningReview {
  grammarFocusAreas: string[];
  vocabularyTips: string;
  generalFeedback: string;
  recommendedResources: string[];
}

export interface AnalysisResult {
  suggestions: Suggestion[];
  overallScore: number;
  toneDetected: string;
  readabilityScore: number;
  readabilityLevel: string;
  summary: string;
  learningReview: LearningReview;
}

export interface PlagiarismMatch {
  segment: string;
  sourceUrl: string;
  sourceTitle: string;
  similarity: string; // High, Medium, Low
}

export interface PlagiarismResult {
  matches: PlagiarismMatch[];
  originalityScore: number;
  status: 'clean' | 'suspicious' | 'detected';
}

export enum ToneTarget {
  PROFESSIONAL = 'Professional',
  CASUAL = 'Casual',
  CONFIDENT = 'Confident',
  EMPATHETIC = 'Empathetic',
  ACADEMIC = 'Academic',
  PERSUASIVE = 'Persuasive',
  JOURNALISTIC = 'Journalistic'
}