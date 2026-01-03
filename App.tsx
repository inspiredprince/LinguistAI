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

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeText(text, toneTarget);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze text. Please ensure your API key is configured correctly.");
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

  const applyCorrection = (currentText: string, suggestion: Suggestion): string => {
    const { originalText, suggestedText, context } = suggestion;

    const createFlexibleRegex = (str: string) => {
      const escaped = str.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return escaped.replace(/\s+/g, '\\s+');
    };

    const flexibleOriginal = createFlexibleRegex(originalText);
    
    // Strategy 1: Context-aware replacement
    if (context) {
      const flexibleContext = createFlexibleRegex(context);
      const regex = new RegExp(`(${flexibleContext})(\\s+)(${flexibleOriginal})`, 'g');
      if (regex.test(currentText)) {
        return currentText.replace(regex, `$1$2${suggestedText}`);
      }
    }
    
    // Strategy 2: Flexible Original replacement
    const regexNoContext = new RegExp(flexibleOriginal, 'g');
    if (regexNoContext.test(currentText)) {
       return currentText.replace(regexNoContext, suggestedText);
    }

    // Strategy 3: Fuzzy Match Fallback (Important for Structure/Formatting)
    // Ignores non-alphanumeric characters to find matches that differ slightly in punctuation/newlines
    const fuzzyOriginal = originalText.replace(/[^a-zA-Z0-9]/g, '');
    if (fuzzyOriginal.length > 10) { // Only do for longer snippets to avoid false positives
      const words = originalText.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 0) {
        // Create a regex that allows anything between words
        const fuzzyPattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*?');
        const fuzzyRegex = new RegExp(fuzzyPattern, 's'); // 's' flag for dotall
        if (fuzzyRegex.test(currentText)) {
          return currentText.replace(fuzzyRegex, suggestedText);
        }
      }
    }

    // Strategy 4: Literal replacement (Fallback)
    if (currentText.includes(originalText)) {
      return currentText.replace(originalText, suggestedText);
    }

    return currentText;
  };

  const handleApplySuggestion = (suggestion: Suggestion) => {
    const newText = applyCorrection(text, suggestion);
    if (newText === text) {
      alert("Could not locate the exact text to replace. It may have been modified already.");
      return;
    }
    setText(newText);
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
      setAnalysis(null);
    } catch (e) {
      alert("Rewrite failed.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
          <Editor text={text} setText={setText} isAnalyzing={isAnalyzing} />
        </div>
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