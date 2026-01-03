import React from 'react';
import { Suggestion, SuggestionType } from '../types';
import { SpellCheck, Zap, MessageCircle, Lightbulb, Layout, ShieldAlert } from 'lucide-react';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (id: string) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onApply, onDismiss }) => {
  const getIcon = () => {
    switch (suggestion.type) {
      case SuggestionType.GRAMMAR: return <SpellCheck className="w-4 h-4 text-red-500" />;
      case SuggestionType.CLARITY: return <Zap className="w-4 h-4 text-blue-500" />;
      case SuggestionType.TONE: return <MessageCircle className="w-4 h-4 text-purple-500" />;
      case SuggestionType.STRATEGIC: return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case SuggestionType.FORMATTING: return <Layout className="w-4 h-4 text-teal-500" />;
      default: return <Zap className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBorderColor = () => {
    switch (suggestion.type) {
      case SuggestionType.GRAMMAR: return 'border-l-red-500';
      case SuggestionType.CLARITY: return 'border-l-blue-500';
      case SuggestionType.TONE: return 'border-l-purple-500';
      case SuggestionType.STRATEGIC: return 'border-l-amber-500';
      case SuggestionType.FORMATTING: return 'border-l-teal-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 ${getBorderColor()} mb-3 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{suggestion.type}</span>
        </div>
        <button 
          onClick={() => onDismiss(suggestion.id)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          &times;
        </button>
      </div>
      
      <p className="text-sm text-slate-400 line-through mb-1">{suggestion.originalText}</p>
      <p className="text-sm font-semibold text-slate-800 mb-2">{suggestion.suggestedText}</p>
      
      <p className="text-xs text-slate-500 mb-3 italic">
        {suggestion.explanation}
      </p>
      
      <button 
        onClick={() => onApply(suggestion)}
        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded transition-colors"
      >
        Apply Suggestion
      </button>
    </div>
  );
};

export default SuggestionCard;
