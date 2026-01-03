
import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import { AnalysisResult, PlagiarismResult, Suggestion, ToneTarget, SuggestionType } from './types';
import { analyzeText, checkPlagiarism, generateRewrite } from './services/geminiService';
import { AlertCircle, Copy, X, RefreshCw, Terminal, PlayCircle } from 'lucide-react';

const MOCK_ANALYSIS: AnalysisResult = {
  suggestions: [
    {
      id: 'mock-1',
      type: SuggestionType.GRAMMAR,
      originalText: 'This are',
      suggestedText: 'This is',
      explanation: 'Subject-verb agreement error. "This" is singular.',
      context: 'LinguistAI! This are a demo'
    },
    {
      id: 'mock-2',
      type: SuggestionType.TONE,
      originalText: 'help you fix this',
      suggestedText: 'assists you in refining your prose',
      explanation: 'Elevates the professional tone of the concluding sentence.',
      context: 'LinguistAI help you fix this.'
    }
  ],
  overallScore: 82,
  toneDetected: 'Informative but Casual',
  readabilityScore: 75,
  readabilityLevel: 'Grade 8',
  summary: 'The text is clear but contains basic grammatical errors and inconsistent tone.',
  learningReview: {
    grammarFocusAreas: ['Subject-Verb Agreement', 'Pluralization'],
    vocabularyTips: 'Consider using more precise verbs like "refine" instead of "fix".',
    generalFeedback: 'You have a good grasp of structure, but focus on consistency in professional contexts.',
    recommendedResources: ['Strunk & White Elements of Style', 'Advanced Grammar Guide']
  }
};

const MOCK_PLAGIARISM: PlagiarismResult = {
  matches: [
    {
      segment: "To be or not to be, that is the question.",
      sourceUrl: "https://en.wikipedia.org/wiki/To_be,_or_not_to_be",
      sourceTitle: "To be, or not to be - Wikipedia",
      similarity: "High"
    }
  ],
  originalityScore: 78,
  status: 'suspicious'
};

const App: React.FC = () => {
  const [text, setText] = useState<string>(`Welcome to LinguistAI! This are a demo text to show you how the app work. It include some grammar mistaks and tone issues.

Usually, when you writes an email to a client, you want to be professional. But sometimes, you sound too casual. LinguistAI help you fix this.

Also, it can detects if you copied this sentence from the internet: "To be or not to be, that is the question."`);
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [plagiarism, setPlagiarism] = useState<PlagiarismResult | null>(null);
  const [toneTarget, setToneTarget] = useState<ToneTarget>(ToneTarget.PROFESSIONAL);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [promptCount, setPromptCount] = useState<number>(0);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  
  // Check if a real key is available (either via AI Studio or Env)
  const [isKeySelected, setIsKeySelected] = useState<boolean>(
    !!process.env.API_KEY && process.env.API_KEY !== "undefined" && process.env.API_KEY !== ""
  ); 
  const [globalError, setGlobalError] = useState<string | null>(null);

  const syncKeyStatus = useCallback(async () => {
    try {
      const win = window as any;
      if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
        const selected = await win.aistudio.hasSelectedApiKey();
        if (selected) {
          setIsKeySelected(true);
          return true;
        }
      }
      const hasEnvKey = !!process.env.API_KEY && process.env.API_KEY !== "undefined" && process.env.API_KEY !== "";
      setIsKeySelected(hasEnvKey);
      return hasEnvKey;
    } catch (e) {
      return !!process.env.API_KEY;
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('linguist_prompts');
    if (saved) setPromptCount(parseInt(saved, 10));
    syncKeyStatus();
  }, [syncKeyStatus]);

  const handleConnectKey = async () => {
    setGlobalError(null);
    const win = window as any;
    
    if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
      try {
        await win.aistudio.openSelectKey();
        setIsKeySelected(true);
      } catch (err: any) {
        setGlobalError(`Auth Error: ${err.message || "Selection failed."}`);
      }
    } else {
      const found = await syncKeyStatus();
      if (!found) {
        setGlobalError("Connectivity Scan Failed: No API Key detected. Ensure you are in AI Studio or have set the API_KEY env variable.");
      }
    }
  };

  const handleEnterDemo = () => {
    setIsDemoMode(true);
    setGlobalError(null);
  };

  const handleCopyError = () => {
    if (globalError) {
      const log = `--- LINGUIST AI SYSTEM LOG ---\n${new Date().toISOString()}\nError: ${globalError}\nBridge Available: ${!!(window as any).aistudio}\nKey Present: ${!!process.env.API_KEY}\nKey Value Valid: ${!!process.env.API_KEY && process.env.API_KEY !== "undefined"}\n-----------------------------`;
      navigator.clipboard.writeText(log).then(() => alert("System log copied. Support will use this to debug your environment."));
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
      if (isDemoMode && !isKeySelected) {
        // Use simulation logic for demo mode
        await new Promise(r => setTimeout(r, 1500));
        setAnalysis(MOCK_ANALYSIS);
      } else {
        const result = await analyzeText(text, toneTarget);
        setAnalysis(result);
      }
      incrementPrompts();
    } catch (error: any) {
      const msg = error.message || "Unknown Engine Fault";
      setGlobalError(msg);
      if (msg.includes("API Key")) setIsKeySelected(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!text.trim()) return;
    setPlagiarism(null);
    setGlobalError(null);
    try {
      if (isDemoMode && !isKeySelected) {
        await new Promise(r => setTimeout(r, 1200));
        setPlagiarism(MOCK_PLAGIARISM);
      } else {
        const result = await checkPlagiarism(text);
        setPlagiarism(result);
      }
      incrementPrompts();
    } catch (error: any) {
      setGlobalError(`Search Engine Error: ${error.message}`);
    }
  };

  const applyCorrection = (currentText: string, suggestion: Suggestion): string => {
    const { originalText, suggestedText } = suggestion;
    return currentText.replace(originalText, suggestedText);
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
    analysis.suggestions.forEach(suggestion => {
       currentText = applyCorrection(currentText, suggestion);
    });
    setText(currentText);
    setAnalysis({ ...analysis, suggestions: [] });
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
      if (isDemoMode && !isKeySelected) {
        await new Promise(r => setTimeout(r, 800));
        setText(`[PROTOTYPE REWRITE: ${instruction}]\n\n${text}`);
      } else {
        const rewrited = await generateRewrite(text, instruction);
        setText(rewrited);
      }
      setAnalysis(null);
      incrementPrompts();
    } catch (e: any) {
      setGlobalError(`Rewrite Failed: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 selection:bg-indigo-100">
      <Navbar />
      
      {globalError && (
        <div className="bg-gradient-to-r from-red-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between animate-in slide-in-from-top duration-500 z-[100] shadow-2xl">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 block">Diagnostic Failure</span>
              <p className="text-xs font-bold font-mono">{globalError}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isDemoMode && (
               <button 
                onClick={handleEnterDemo}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Launch Prototype</span>
              </button>
            )}
            <button 
              onClick={handleCopyError}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Log</span>
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
            isKeySelected={isKeySelected || isDemoMode}
            onConnectKey={handleConnectKey}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
