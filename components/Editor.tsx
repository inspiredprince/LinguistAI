
import React, { useState, useMemo } from 'react';
import { Eye, Edit3, Check, Trash2, FileOutput } from 'lucide-react';
import { AnalysisResult, SuggestionType, Suggestion } from '../types';

interface EditorProps {
  text: string;
  setText: (text: string) => void;
  isAnalyzing: boolean;
  analysis?: AnalysisResult | null;
}

const Editor: React.FC<EditorProps> = ({ text, setText, isAnalyzing, analysis }) => {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [copied, setCopied] = useState(false);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all text?")) {
      setText("");
    }
  };

  const getHighlightStyles = (type: SuggestionType) => {
    switch (type) {
      case SuggestionType.GRAMMAR: return 'border-b-2 border-red-400 bg-red-50/50 text-red-900';
      case SuggestionType.CLARITY: return 'border-b-2 border-blue-400 bg-blue-50/50 text-blue-900';
      case SuggestionType.TONE: return 'border-b-2 border-purple-400 bg-purple-50/50 text-purple-900';
      case SuggestionType.STRATEGIC: return 'border-b-2 border-amber-400 bg-amber-50/50 text-amber-900';
      default: return 'border-b-2 border-indigo-200 bg-indigo-50/30';
    }
  };

  const highlightedContent = useMemo(() => {
    if (mode === 'write' || !analysis || analysis.suggestions.length === 0) return null;

    return text.split('\n').map((paragraph, pIdx) => {
      if (!paragraph.trim()) return <p key={pIdx} className="mb-4 h-4"></p>;

      let currentPos = 0;
      const parts: React.ReactNode[] = [];
      
      // Sort suggestions by their position in the current paragraph
      const matches = analysis.suggestions
        .map(s => ({
          suggestion: s,
          index: paragraph.indexOf(s.originalText)
        }))
        .filter(m => m.index !== -1)
        .sort((a, b) => a.index - b.index);

      matches.forEach((m, mIdx) => {
        const { suggestion: s, index } = m;
        if (index < currentPos) return; // Skip overlapping suggestions for now

        // Add plain text before the suggestion
        if (index > currentPos) {
          parts.push(paragraph.substring(currentPos, index));
        }

        // Add highlighted suggestion
        parts.push(
          <span 
            key={`${pIdx}-${mIdx}`} 
            className={`cursor-help transition-all duration-300 ${getHighlightStyles(s.type)}`}
            title={s.explanation}
          >
            {s.originalText}
          </span>
        );

        currentPos = index + s.originalText.length;
      });

      // Add remaining text in paragraph
      if (currentPos < paragraph.length) {
        parts.push(paragraph.substring(currentPos));
      }

      return <p key={pIdx} className="mb-4 leading-[2.2]">{parts}</p>;
    });
  }, [text, analysis, mode]);

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden relative">
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-50 bg-slate-50/30 backdrop-blur-md sticky top-0 z-10">
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
          <button
            onClick={() => setMode('write')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mode === 'write' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Composer</span>
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Review Mode</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleClear}
            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
            title="Clear canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-200 transition-all active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <FileOutput className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Export'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-auto custom-scrollbar">
        {mode === 'write' ? (
          <textarea
            className="w-full h-full p-16 resize-none focus:outline-none text-xl text-slate-700 leading-relaxed placeholder-slate-200 font-serif bg-transparent selection:bg-indigo-100"
            placeholder="Type your draft here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="w-full h-full p-16 text-xl text-slate-700 leading-relaxed font-serif">
             {highlightedContent || text.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4">{paragraph}</p>
             ))}
          </div>
        )}
        
        {isAnalyzing && (
          <div className="absolute bottom-8 right-8 flex items-center space-x-3 bg-indigo-600 px-6 py-3 rounded-[1.5rem] shadow-2xl animate-pulse z-20">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
            </div>
            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Deep Engine Scan</span>
          </div>
        )}
      </div>
      
      <div className="h-14 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between px-12 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <div className="flex space-x-10">
          <span className="flex items-center space-x-3">
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
            <span>{wordCount} Words</span>
          </span>
          <span className="flex items-center space-x-3">
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
            <span>{text.length} Characters</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-indigo-600 font-black">Linguist Engine v4.2</span>
          <div className={`w-2 h-2 rounded-full ${text.length > 0 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
