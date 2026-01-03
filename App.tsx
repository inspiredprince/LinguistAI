
import React, { useState, useEffect, useCallback } from 'react';
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
  const [promptCount, setPromptCount] = useState<number>(0);
  const [isKeySelected, setIsKeySelected] = useState<boolean>(true); // Default to true to prevent blocking if AI key is pre-injected

  // Sync key selection state
  const syncKeyStatus = useCallback(async () => {
    try {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(selected);
        return selected;
      }
    } catch (e) {
      console.warn("Could not check key status", e);
    }
    return true; // Assume true if we can't check
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('linguist_prompts');
    if (saved) setPromptCount(parseInt(saved, 10));
    syncKeyStatus();
  }, [syncKeyStatus]);

  const handleConnectKey = async () => {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
      } else {
        console.log("window.aistudio.openSelectKey not found, bypassing overlay.");
      }
    } catch (e) {
      console.error("Error opening key selection:", e);
    } finally {
      // CRITICAL: Mitigate race conditions by assuming success after trigger
      setIsKeySelected(true);
    }
  };

  const incrementPrompts = () => {
    setPromptCount(prev => {
      const next = prev + 1;
      localStorage.setItem('linguist_prompts', next.toString());
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeText(text, toneTarget);
      setAnalysis(result);
      incrementPrompts();
    } catch (error: any) {
      console.error("Analysis Failed:", error);
      const errorMsg = error.message?.toLowerCase() || "";
      
      // Detailed error handling for Pro models
      if (errorMsg.includes("not found") || errorMsg.includes("key") || errorMsg.includes("permission") || errorMsg.includes("403") || errorMsg.includes("401")) {
        setIsKeySelected(false);
        alert("Authentication Error: Your Gemini session has expired or the key is invalid. Please reconnect using the 'Connect Cloud Key' button.");
      } else {
        alert("Analysis Error: " + error.message);
      }
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
      incrementPrompts();
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message?.toLowerCase() || "";
      if (errorMsg.includes("key") || errorMsg.includes("403")) {
        setIsKeySelected(false);
      }
    }
  };

  const applyCorrection = (currentText: string, suggestion: Suggestion): string => {
    const { originalText, suggestedText, context } = suggestion;
    const createFlexibleRegex = (str: string) => {
      const escaped = str.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return escaped.replace(/\s+/g, '\\s+');
    };
    const flexibleOriginal = createFlexibleRegex(originalText);
    
    if (context) {
      const flexibleContext = createFlexibleRegex(context);
      const regex = new RegExp(`(${flexibleContext})(\\s+)(${flexibleOriginal})`, 'g');
      if (regex.test(currentText)) return currentText.replace(regex, `$1$2${suggestedText}`);
    }
    
    const regexNoContext = new RegExp(flexibleOriginal, 'g');
    if (regexNoContext.test(currentText)) return currentText.replace(regexNoContext, suggestedText);

    if (currentText.includes(originalText)) return currentText.replace(originalText, suggestedText);
    return currentText;
  };

  const handleApplySuggestion = (suggestion: Suggestion) => {
    const newText = applyCorrection(text, suggestion);
    if (newText === text) return;
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
      incrementPrompts();
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.message?.toLowerCase() || "";
      if (errorMsg.includes("key") || errorMsg.includes("403")) {
        setIsKeySelected(false);
      }
      alert("AI Rewrite failed. Please check your Gemini connection.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-10 overflow-hidden flex flex-col max-w-7xl mx-auto w-full">
          <Editor 
            text={text} 
            setText={setText} 
            isAnalyzing={isAnalyzing} 
            analysis={analysis} 
          />
        </div>
        <div className="w-[480px] bg-white border-l border-gray-100 shadow-2xl z-10 flex flex-col">
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
            promptCount={promptCount}
            isKeySelected={isKeySelected}
            onConnectKey={handleConnectKey}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
