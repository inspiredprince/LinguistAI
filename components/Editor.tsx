
import React, { useState, useMemo } from 'react';
import { Eye, Edit3, Copy, Check, Trash2 } from 'lucide-react';
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
      case SuggestionType.GRAMMAR: return 'bg-red-50 border-b-2 border-red-400 text-red-900 cursor-help';
      case SuggestionType.CLARITY: return 'bg-blue-50 border-b-2 border-blue-400 text-blue-900 cursor-help';
      case SuggestionType.TONE: return 'bg-purple-50 border-b-2 border-purple-400 text-purple-900 cursor-help';
      case SuggestionType.STRATEGIC: return 'bg-amber-50 border-b-2 border-amber-400 text-amber-900 cursor-help';
      default: return 'bg-indigo-50 border-b-2 border-indigo-200 text-indigo-900 cursor-help';
    }
  };

  // Advanced highlighting logic
  const highlightedContent = useMemo(() => {
    if (mode === 'write' || !analysis || analysis.suggestions.length === 0) return null;

    // Split text into paragraphs
    return text.split('\n').map((paragraph, pIdx) => {
      if (!paragraph.trim()) return <p key={pIdx} className="mb-4 h-4"></p>;

      let currentPos = 0;
      const parts: React.ReactNode[] = [];
      
      // Find suggestions that exist in this paragraph
      const paragraphSuggestions = analysis.suggestions
        .filter(s => paragraph.includes(s.originalText))
        .sort((a, b) => paragraph.indexOf(a.originalText) - paragraph.indexOf(b.originalText));

      paragraphSuggestions.forEach((s, sIdx) => {
        const index = paragraph.indexOf(s.originalText, currentPos);
        if (index === -1) return;

        // Add text before the match
        if (index > currentPos) {
          parts.push(paragraph.substring(currentPos, index));
        }

        // Add the highlighted match
        parts.push(
          <span 
            key={`${sIdx}-${index}`} 
            className={`px-0.5 rounded-sm transition-colors duration-300 ${getHighlightStyles(s.type)}`}
            title={s.explanation}
          >
            {s.originalText}
          </span>
        );

        currentPos = index + s.originalText.length;
      });

      // Add remaining text
      if (currentPos < paragraph.length) {
        parts.push(paragraph.substring(currentPos));
      }

      return <p key={pIdx} className="mb-4 leading-loose">{parts}</p>;
    });
  }, [text, analysis, mode]);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-50 bg-gray-50/30">
        <div className="flex bg-gray-200/50 p-1 rounded-xl">
          <button
            onClick={() => setMode('write')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              mode === 'write' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Composer</span>
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              mode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Review Mode</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleClear}
            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
            title="Clear all text"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Eye className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Export Content'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-auto custom-scrollbar">
        {mode === 'write' ? (
          <textarea
            className="w-full h-full p-12 resize-none focus:outline-none text-xl text-slate-800 leading-relaxed placeholder-slate-200 font-serif bg-transparent selection:bg-indigo-100"
            placeholder="Compose your masterpiece here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="w-full h-full p-12 text-xl text-slate-800 leading-relaxed font-serif max-w-none">
             {highlightedContent || text.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4 min-h-[1em]">{paragraph}</p>
             ))}
          </div>
        )}
        
        {isAnalyzing && (
          <div className="absolute top-8 right-8 flex items-center space-x-3 bg-indigo-600 px-5 py-2.5 rounded-2xl shadow-2xl animate-bounce pointer-events-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">AI Syncing...</span>
          </div>
        )}
      </div>
      
      <div className="h-12 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        <div className="flex space-x-8">
          <span className="flex items-center space-x-2">
            <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
            <span>{wordCount} Words</span>
          </span>
          <span className="flex items-center space-x-2">
            <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
            <span>{text.length} Characters</span>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-indigo-600 font-black">Linguist Engine v4.0</span>
          <div className={`w-1.5 h-1.5 rounded-full ${text.length > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}`}></div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
