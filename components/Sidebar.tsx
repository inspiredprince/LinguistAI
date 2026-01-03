
import React, { useState, useEffect } from 'react';
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
  BookOpen,
  Zap,
  Activity
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
  promptCount: number;
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
  onRewrite,
  promptCount
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
    <div className="h-full bg-slate-50 border-l border-gray-100 flex flex-col w-full">
      <div className="flex border-b border-gray-100 bg-white">
        <button 
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex justify-center items-center space-x-2 transition-all ${activeTab === 'suggestions' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Report</span>
        </button>
        <button 
          onClick={() => setActiveTab('genai')}
          className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex justify-center items-center space-x-2 transition-all ${activeTab === 'genai' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Gen AI</span>
        </button>
        <button 
          onClick={() => setActiveTab('plagiarism')}
          className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex justify-center items-center space-x-2 transition-all ${activeTab === 'plagiarism' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Web</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Style Strategy</span>
                 <div className="flex items-center space-x-1.5 px-2 py-1 bg-green-50 rounded-full border border-green-100">
                    <Activity className="w-2.5 h-2.5 text-green-500" />
                    <span className="text-[8px] font-black text-green-700 uppercase">Live</span>
                 </div>
              </div>
              <select 
                value={toneTarget} 
                onChange={(e) => setToneTarget(e.target.value as ToneTarget)}
                className="w-full p-4 border border-gray-100 rounded-2xl text-sm font-black text-slate-700 focus:ring-4 focus:ring-indigo-50 focus:outline-none mb-4 appearance-none bg-slate-50 cursor-pointer"
              >
                {Object.values(ToneTarget).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              
              <button 
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] text-white shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] ${
                  isAnalyzing ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isAnalyzing ? 'Processing AI...' : 'Run Diagnostics'}
              </button>
            </div>

            {analysis ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 text-center shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-tighter">Strength</span>
                    <span className={`text-2xl font-black ${getScoreColor(analysis.overallScore)}`}>{analysis.overallScore}</span>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 text-center shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-tighter">Tone</span>
                    <span className="text-[10px] font-black text-slate-700 truncate block">{analysis.toneDetected}</span>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 text-center shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-tighter">Level</span>
                    <span className="text-[10px] font-black text-slate-700 block">{analysis.readabilityLevel}</span>
                  </div>
                </div>

                {analysis.learningReview && (
                  <div className="bg-white rounded-3xl border border-indigo-50 overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setIsReviewOpen(!isReviewOpen)}
                      className="w-full flex items-center justify-between p-6 bg-indigo-50/10 hover:bg-indigo-50/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <GraduationCap className="w-5 h-5 text-indigo-600" />
                        <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Growth Review</span>
                      </div>
                      {isReviewOpen ? <ChevronDown className="w-4 h-4 text-indigo-400" /> : <ChevronRight className="w-4 h-4 text-indigo-400" />}
                    </button>
                    
                    {isReviewOpen && (
                      <div className="p-6 space-y-6 border-t border-indigo-50 bg-white">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Focus Patterns</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.learningReview.grammarFocusAreas.map((area, idx) => (
                              <span key={idx} className="px-4 py-1.5 bg-slate-50 text-slate-600 rounded-full text-[9px] font-black border border-slate-100 uppercase tracking-tight">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">AI Expert Commentary</p>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium italic bg-indigo-50/30 p-4 rounded-2xl border border-indigo-50">
                            "{analysis.learningReview.generalFeedback}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {analysis.suggestions.length > 0 && (
                    <button 
                      onClick={onAcceptAll}
                      className="w-full flex items-center justify-center space-x-3 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-[0.98]"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Accept {analysis.suggestions.length} Fixes</span>
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
              <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                <PieChart className="w-16 h-16 mx-auto mb-6 text-slate-100" />
                <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">Ready for Scan</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'genai' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-8 rounded-[2rem] shadow-2xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                <Sparkles className="w-24 h-24" />
              </div>
              <h3 className="text-xs font-black mb-1 flex items-center uppercase tracking-[0.2em]">
                <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
                Transformer
              </h3>
              <p className="text-[9px] text-indigo-300 font-black mb-6 uppercase tracking-widest">Generative Style Orchestration</p>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Direct the AI... (e.g. 'Make it more punchy')"
                className="w-full h-40 p-5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none resize-none mb-6 bg-white/5 text-white placeholder-white/20 font-medium"
              />
              <button
                onClick={handleRewrite}
                disabled={isGenerating || !customPrompt.trim()}
                className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98] ${
                  isGenerating ? 'bg-indigo-400' : 'bg-white text-indigo-900 hover:bg-indigo-50 shadow-indigo-950/50'
                }`}
              >
                {isGenerating ? 'Synthesizing...' : 'Apply Evolution'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'plagiarism' && (
          <div className="space-y-6">
             <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <ShieldCheck className="w-12 h-12 text-indigo-600 mb-6" />
                <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-widest">Web Integrity</h3>
                <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed italic">Confirm your original thought against a global index of 100 trillion pages.</p>
                <button 
                  onClick={onCheckPlagiarism}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center space-x-4"
                >
                  <Search className="w-4 h-4" />
                  <span>Start Global Check</span>
                </button>
             </div>

             {plagiarism && (
               <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                 <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integrity Score</span>
                    <span className={`text-3xl font-black ${plagiarism.originalityScore > 85 ? 'text-green-600' : 'text-amber-500'}`}>
                      {plagiarism.originalityScore}%
                    </span>
                 </div>
               </div>
             )}
          </div>
        )}
      </div>

      <div className="p-8 bg-white border-t border-gray-100">
        <div className="flex justify-between items-center mb-3">
           <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Quota</span>
           </div>
           <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{promptCount.toLocaleString()} / 1,000</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full transition-all duration-700" 
            style={{ width: `${(promptCount / 1000) * 100}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-3">
           <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Vercel Config Sync</p>
           <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span className="text-[8px] font-black text-green-600 uppercase">Secured</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
