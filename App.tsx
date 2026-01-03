
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
  
  // Real prompt counter state
  const [promptCount, setPromptCount] = useState<number>(0);

  // Load prompt count from local storage for persistence
  useEffect(() => {
    const saved = localStorage.getItem('linguist_prompts');
    if (saved) setPromptCount(parseInt(saved, 10));
  }, []);

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
      const errorMsg = error.message.includes("API_KEY") 
        ? "API Key Error: " + error.message 
        : "Failed to analyze text: " + error.message;
      alert(errorMsg);
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
    } catch (error) {
      console.error(error);
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
    if (newText === text) {
      alert("Could not locate the text to replace. It may have been modified already.");
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
      incrementPrompts();
    } catch (e) {
      alert("Rewrite failed. Please check your API key.");
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
          />
        </div>
      </main>
    </div>
  );
};

export default App;
