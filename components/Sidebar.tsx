import React, { useState } from 'react';
import { AnalysisResult, PlagiarismResult, Suggestion, ToneTarget } from '../types';
import SuggestionCard from './SuggestionCard';
import { 
  Wand2, 
  Search, 
  Settings2, 
  ShieldCheck, 
  ChevronRight,
  PieChart,
  Sparkles,
  CheckCheck,
  GraduationCap,
  ChevronDown,
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  analysis: AnalysisResult | null;
  plagiarism: PlagiarismResult | null;
  toneTarget: ToneTarget;
  setToneTarget: (tone: ToneTarget) => void;
  onApplySuggestion: (s: Suggestion) => void;
  onDismissSuggestion: (id: string) => void;
  onAcceptAll: () => void;
  onAnalyze: () => void;
  onCheckPlagiarism: () => void;
  isAnalyzing: boolean;
  onRewrite: (instruction: string) => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  analysis, 
  plagiarism,
  toneTarget, 
  setToneTarget, 
  onApplySuggestion, 
  onDismissSuggestion,
  onAcceptAll,
  onAnalyze,
  onCheckPlagiarism,
  isAnalyzing,
  onRewrite
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'genai' | 'plagiarism'>('suggestions');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(true);

  const handleRewrite = async () => {
    if (!customPrompt.trim()) return;
    setIsGenerating(true);
    await onRewrite(customPrompt);
    setIsGenerating(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="h-full bg-slate-50 border-l border-gray-200 flex flex-col w-full">
      <div className="flex border-b border-gray-200 bg-white">
        <button 
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 py-3 text-sm font-medium flex justify-center items-center space-x-1 ${activeTab === 'suggestions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Editor</span>
        </button>
        <button 
          onClick={() => setActiveTab('genai')}
          className={`flex-1 py-3 text-sm font-medium flex justify-center items-center space-x-1 ${activeTab === 'genai' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Wand2 className="w-4 h-4" />
          <span>Gen AI</span>
        </button>
        <button 
          onClick={() => setActiveTab('plagiarism')}
          className={`flex-1 py-3 text-sm font-medium flex justify-center items-center space-x-1 ${activeTab === 'plagiarism' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Check</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Target Tone</span>
              <select 
                value={toneTarget} 
                onChange={(e) => setToneTarget(e.target.value as ToneTarget)}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4"
              >
                {Object.values(ToneTarget).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              
              <button 
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className={`w-full py-2.5 rounded-lg font-bold text-white shadow-sm transition-all ${
                  isAnalyzing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>

            {analysis ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Score</span>
                    <span className={`text-xl font-bold ${getScoreColor(analysis.overallScore)}`}>{analysis.overallScore}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tone</span>
                    <span className="text-xs font-bold text-slate-700 truncate block">{analysis.toneDetected}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Level</span>
                    <span className="text-xs font-bold text-slate-700 block">{analysis.readabilityLevel}</span>
                  </div>
                </div>

                {analysis.learningReview && (
                  <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setIsReviewOpen(!isReviewOpen)}
                      className="w-full flex items-center justify-between p-4 bg-indigo-50/30 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="w-5 h-5 text-indigo-600" />
                        <span className="text-sm font-bold text-indigo-900">Writing Insights</span>
                      </div>
                      {isReviewOpen ? <ChevronDown className="w-4 h-4 text-indigo-400" /> : <ChevronRight className="w-4 h-4 text-indigo-400" />}
                    </button>
                    
                    {isReviewOpen && (
                      <div className="p-4 space-y-4 border-t border-indigo-50">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Focus Areas</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.learningReview.grammarFocusAreas.map((area, idx) => (
                              <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-100">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expert Feedback</p>
                          <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 border-indigo-200 pl-3">
                            {analysis.learningReview.generalFeedback}
                          </p>
                        </div>
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recommended Study</p>
                          {analysis.learningReview.recommendedResources.map((res, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-[11px] text-indigo-600 hover:text-indigo-800 cursor-pointer mb-1 group">
                              <BookOpen className="w-3 h-3" />
                              <span className="underline group-hover:no-underline">{res}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {analysis.suggestions.length > 0 && (
                    <button 
                      onClick={onAcceptAll}
                      className="w-full flex items-center justify-center space-x-2 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 shadow-md transition-all active:scale-95"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Accept {analysis.suggestions.length} Changes</span>
                    </button>
                  )}

                  {analysis.suggestions.map(s => (
                    <SuggestionCard 
                      key={s.id} 
                      suggestion={s} 
                      onApply={onApplySuggestion} 
                      onDismiss={onDismissSuggestion} 
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <PieChart className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="text-sm text-slate-400 font-medium">No analysis performed yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'genai' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                Rewrite with AI
              </h3>
              <p className="text-xs text-slate-500 mb-4">Transform your text using custom instructions.</p>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., 'Make this more engaging for a LinkedIn post' or 'Convert this to an inverted pyramid news lead'"
                className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none mb-3 bg-slate-50"
              />
              <button
                onClick={handleRewrite}
                disabled={isGenerating || !customPrompt.trim()}
                className={`w-full py-3 rounded-lg font-bold text-white text-sm shadow-md transition-all ${
                  isGenerating ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
                }`}
              >
                {isGenerating ? 'Generating...' : 'Apply Rewrite'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => onRewrite("Shorten this text significantly")} className="text-left p-3 rounded-lg border border-gray-100 bg-white hover:bg-indigo-50 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-between group">
                Concise Mode <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button onClick={() => onRewrite("Make the tone more punchy and active")} className="text-left p-3 rounded-lg border border-gray-100 bg-white hover:bg-indigo-50 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-between group">
                Punchy & Active <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'plagiarism' && (
          <div className="space-y-4">
             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <ShieldCheck className="w-8 h-8 text-indigo-500 mb-3" />
                <h3 className="text-sm font-bold text-slate-800 mb-2">Originality Check</h3>
                <p className="text-xs text-slate-500 mb-4">Scan the web for matching phrases to ensure your content is unique.</p>
                <button 
                  onClick={onCheckPlagiarism}
                  className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Start Web Scan</span>
                </button>
             </div>

             {plagiarism && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm mb-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Originality</span>
                    <span className={`text-xl font-black ${plagiarism.originalityScore > 80 ? 'text-green-600' : 'text-amber-500'}`}>
                      {plagiarism.originalityScore}%
                    </span>
                 </div>
                 {plagiarism.matches.map((match, idx) => (
                   <div key={idx} className="bg-white p-4 rounded-xl border border-red-50 mb-3 shadow-sm border-l-4 border-l-red-500">
                     <p className="text-xs text-slate-800 mb-3 leading-relaxed">"{match.segment}"</p>
                     <a href={match.sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline truncate block">
                       {match.sourceTitle}
                     </a>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;