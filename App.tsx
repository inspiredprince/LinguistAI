import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import { AnalysisResult, PlagiarismResult, Suggestion, ToneTarget } from './types';
import { analyzeText, checkPlagiarism, generateRewrite } from './services/geminiService';

const App: React.FC = () => {
  const [text, setText] = useState<string>(`Welcome to LinguistAI! This are a demo text to show you how the app work. It include some grammar mistaks and tone issues.

Usually, when you writes an email to a client, you want to be professional. But sometimes, you sound too casual. LinguistAI help you fix this.

Also, it can detects if you copied this sentence from the internet: "To be or not to be, that is the question."`);
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [plagiarism, setPlagiarism] = useState<PlagiarismResult | null>(null);
  const [toneTarget, setToneTarget] = useState<ToneTarget>(ToneTarget.PROFESSIONAL);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Clear results when text changes significantly to avoid stale suggestions
  useEffect(() => {
    if (analysis && Math.abs(text.length - (analysis.suggestions.length > 0 ? text.length : 0)) > 50) {
      // Don't clear immediately on small edits, but maybe invalidate or show warning?
      // For simplicity in this demo, we keep them until user re-analyzes or applies.
    }
  }, [text, analysis]);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null); // Clear previous
    try {
      const result = await analyzeText(text, toneTarget);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze text. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!text.trim()) return;
    setPlagiarism(null);
    try {
      const result = await checkPlagiarism(text);
      setPlagiarism(result);
    } catch (error) {
      console.error(error);
      alert("Plagiarism check failed.");
    }
  };

  // Helper function to apply a single suggestion to text
  const applyCorrection = (currentText: string, suggestion: Suggestion): string => {
    const { originalText, suggestedText, context } = suggestion;

    // Helper to escape regex special characters and allow for flexible whitespace
    // matches (e.g., spaces in regex match newlines in text)
    const createFlexibleRegex = (str: string) => {
      // Escape special regex chars
      const escaped = str.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Replace literal spaces with \s+ to match newlines, tabs, or multiple spaces
      return escaped.replace(/\s+/g, '\\s+');
    };

    const flexibleOriginal = createFlexibleRegex(originalText);
    
    // Strategy 1: Context-aware replacement (Most precise)
    if (context) {
      const flexibleContext = createFlexibleRegex(context);
      // Pattern: (Context) followed by (Whitespace) followed by (Original Text)
      const regex = new RegExp(`(${flexibleContext})(\\s+)(${flexibleOriginal})`);
      
      if (regex.test(currentText)) {
        return currentText.replace(regex, (match, p1, p2, p3) => {
           // p1 is context, p2 is whitespace separator, p3 is what we replace
           return `${p1}${p2}${suggestedText}`;
        });
      }
    }
    
    // Strategy 2: Flexible Original replacement (If context fails)
    // Matches the original text even if line breaks/spaces differ slightly
    const regexNoContext = new RegExp(flexibleOriginal);
    if (regexNoContext.test(currentText)) {
       return currentText.replace(regexNoContext, suggestedText);
    }

    // Strategy 3: Literal replacement (Fallback)
    // Sometimes simple string replacement works if regex fails due to complex characters
    if (currentText.includes(originalText)) {
      return currentText.replace(originalText, suggestedText);
    }

    return currentText;
  };

  const handleApplySuggestion = (suggestion: Suggestion) => {
    const newText = applyCorrection(text, suggestion);
    
    if (newText === text) {
      alert("Could not find the exact text segment to replace. It might have already been changed.");
      return;
    }

    setText(newText);
    
    // Remove the applied suggestion from the list
    if (analysis) {
      setAnalysis({
        ...analysis,
        suggestions: analysis.suggestions.filter(s => s.id !== suggestion.id)
      });
    }
  };

  const handleAcceptAll = () => {
    if (!analysis) return;

    let currentText = text;
    const appliedIds: string[] = [];

    analysis.suggestions.forEach(suggestion => {
       const nextText = applyCorrection(currentText, suggestion);
       if (nextText !== currentText) {
         currentText = nextText;
         appliedIds.push(suggestion.id);
       }
    });

    setText(currentText);
    
    // Update analysis to remove accepted suggestions
    setAnalysis({
      ...analysis,
      suggestions: analysis.suggestions.filter(s => !appliedIds.includes(s.id))
    });
  };

  const handleDismissSuggestion = (id: string) => {
    if (analysis) {
      setAnalysis({
        ...analysis,
        suggestions: analysis.suggestions.filter(s => s.id !== id)
      });
    }
  };

  const handleRewrite = async (instruction: string) => {
    try {
      const rewrited = await generateRewrite(text, instruction);
      setText(rewrited);
      // Clear analysis as text changed completely
      setAnalysis(null);
    } catch (e) {
      console.error(e);
      alert("Rewrite failed.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Navbar />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
          <Editor 
            text={text} 
            setText={setText} 
            isAnalyzing={isAnalyzing}
          />
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-white border-l border-gray-200 shadow-xl z-10 flex flex-col">
          <Sidebar
            analysis={analysis}
            plagiarism={plagiarism}
            toneTarget={toneTarget}
            setToneTarget={setToneTarget}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
            onAcceptAll={handleAcceptAll}
            onAnalyze={handleAnalyze}
            onCheckPlagiarism={handleCheckPlagiarism}
            isAnalyzing={isAnalyzing}
            onRewrite={handleRewrite}
          />
        </div>
      </main>
    </div>
  );
};

export default App;