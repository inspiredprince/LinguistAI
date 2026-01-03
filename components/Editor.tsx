import React, { useState } from 'react';
import { Eye, Edit3, Copy, Check } from 'lucide-react';

interface EditorProps {
  text: string;
  setText: (text: string) => void;
  isAnalyzing: boolean;
}

const Editor: React.FC<EditorProps> = ({ text, setText, isAnalyzing }) => {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [copied, setCopied] = useState(false);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('write')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'write' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-slate-500 hover:bg-gray-100'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Write</span>
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'preview' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' : 'text-slate-500 hover:bg-gray-100'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Preview Output</span>
          </button>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
          title="Copy text to clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          <span className={copied ? 'text-green-600' : ''}>{copied ? 'Copied' : 'Copy Text'}</span>
        </button>
      </div>

      <div className="flex-1 relative overflow-auto">
        {mode === 'write' ? (
          <textarea
            className="w-full h-full p-8 resize-none focus:outline-none text-lg text-slate-800 leading-relaxed placeholder-slate-300 font-serif"
            placeholder="Start writing or paste your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false} // We are the spell checker
          />
        ) : (
          <div className="w-full h-full p-8 text-lg text-slate-800 leading-relaxed font-serif prose max-w-none">
             {text.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4 min-h-[1em]">{paragraph}</p>
             ))}
          </div>
        )}
        
        {isAnalyzing && (
          <div className="absolute top-0 right-0 m-4 flex items-center space-x-2 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-indigo-100 animate-pulse pointer-events-none">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
            <span className="text-xs font-medium text-indigo-600">Analyzing...</span>
          </div>
        )}
      </div>
      
      <div className="h-10 border-t border-gray-100 bg-gray-50 flex items-center justify-between px-6 text-xs text-slate-500">
        <div className="flex space-x-4">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
        <div className="flex space-x-2">
          {mode === 'preview' && <span className="text-indigo-600 font-medium">Read Only</span>}
        </div>
      </div>
    </div>
  );
};

export default Editor;