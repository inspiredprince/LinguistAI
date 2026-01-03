
import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import { AnalysisResult, PlagiarismResult, Suggestion, ToneTarget } from './types';
import { analyzeText, checkPlagiarism, generateRewrite } from './services/geminiService';
import { AlertCircle, Copy, X, RefreshCw, Terminal } from 'lucide-react';

const App: React.FC = () => {
  const [text, setText] = useState<string>(`Welcome to LinguistAI! This are a demo text to show you how the app work. It include some grammar mistaks and tone issues.

Usually, when you writes an email to a client, you want to be professional. But sometimes, you sound too casual. LinguistAI help you fix this.

Also, it can detects if you copied this sentence from the internet: "To be or not to be, that is the question."`);
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [plagiarism, setPlagiarism] = useState<PlagiarismResult | null>(null);
  const [toneTarget, setToneTarget] = useState<ToneTarget>(ToneTarget.PROFESSIONAL);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [promptCount, setPromptCount] = useState<number>(0);
  
  // Initialize based on existence of injected key
  const [isKeySelected, setIsKeySelected] = useState<boolean>(!!process.env.API_KEY && process.env.API_KEY !== "undefined"); 
  const [globalError, setGlobalError] = useState<string | null>(null);

  const syncKeyStatus = useCallback(async () => {
    try {
      const win = window as any;
      if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
        const selected = await win.aistudio.hasSelectedApiKey();
        setIsKeySelected(selected);
        return selected;
      }
    } catch (e) {
      console.warn("Key status check skipped: Window bridge not available.");
    }
    return !!process.env.API_KEY;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('linguist_prompts');
    if (saved) setPromptCount(parseInt(saved, 10));
    syncKeyStatus();
  }, [syncKeyStatus]);

  const handleConnectKey = () => {
    setGlobalError(null);
    const win = window as any;
    
    // Safety check for the specific bridge required by prompt instructions
    if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
      setIsKeySelected(true); // Unlock UI for the dialog
      win.aistudio.openSelectKey().catch((err: any) => {
        setGlobalError(`Auth Error: ${err.message || "Selection failed."}`);
        setIsKeySelected(false);
      });
    } else {
      // Provide a clear explanation for the 'Interface not available' error
      setGlobalError("Environment Error: The 'AI Studio Key Selection' bridge is not present. This app must be run within the AI Studio preview environment.");
      console.error("Critical: window.aistudio is missing. Cannot open key selector.");
    }
  };

  const handleCopyError = () => {
    if (globalError) {
      const log = `--- LINGUIST AI SYSTEM LOG ---\n${new Date().toISOString()}\nError: ${globalError}\nBridge Available: ${!!(window as any).aistudio}\nKey Present: ${!!process.env.API_KEY}\n-----------------------------`;
      navigator.clipboard.writeText(log).then(() => alert("Full log copied to clipboard."));
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
    setGlobalError(null);
    setIsAnalyzing(true);
    try {
      const result = await analyzeText(text, toneTarget);
      setAnalysis(result);
      incrementPrompts();
    } catch (error: any) {
      console.error("SDK Fault:", error);
      const msg = error.message || "Unknown Engine Fault";
      setGlobalError(msg);
      
      // If SDK says key is missing, lock the UI
      if (msg.includes("API Key") || msg.includes("403") || msg.includes("MISSING_KEY")) {
        setIsKeySelected(false);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!text.trim()) return;
    setPlagiarism(null);
    setGlobalError(null);
    try {
      const result = await checkPlagiarism(text);
      setPlagiarism(result);
      incrementPrompts();
    } catch (error: any) {
      setGlobalError(`Web Check Error: ${error.message}`);
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
    setGlobalError(null);
    try {
      const rewrited = await generateRewrite(text, instruction);
      setText(rewrited);
      setAnalysis(null);
      incrementPrompts();
    } catch (e: any) {
      setGlobalError(`Rewrite Failed: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900">
      <Navbar />
      
      {globalError && (
        <div className="bg-gradient-to-r from-red-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between animate-in slide-in-from-top duration-500 z-[100] shadow-2xl">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 block">System Diagnostic Output</span>
              <p className="text-xs font-bold font-mono">{globalError}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleCopyError}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Raw Error</span>
            </button>
            <button 
              onClick={() => setGlobalError(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
