import React, { useState } from 'react';
import { AnalysisResult, PlagiarismResult, Suggestion, SuggestionType, ToneTarget } from '../types';
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
  BookOpen
} from 'lucide-react';
import { generateRewrite } from '../services/geminiService';

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
      {/* Tabs */}
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

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        {/* SUGGESTIONS TAB */}
        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-slate-700">Target Tone</span>
              </div>
              <select 
                value={toneTarget} 
                onChange={(e) => setToneTarget(e.target.value as ToneTarget)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {Object.values(ToneTarget).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              
              <button 
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className={`mt-4 w-full py-2.5 rounded-md font-medium text-white shadow-sm transition-all ${
                  isAnalyzing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Text'}
              </button>
            </div>

            {analysis ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {/* Score */}
                  <div className="bg-white p-2 rounded-lg border border-gray-200 flex flex-col items-center text-center shadow-sm h-24 justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                      {analysis.overallScore}
                    </span>
                  </div>
                  
                  {/* Tone */}
                  <div className="bg-white p-2 rounded-lg border border-gray-200 flex flex-col items-center text-center shadow-sm h-24 justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tone</span>
                    <span className="text-xs font-semibold text-slate-700 capitalize leading-tight">
                      {analysis.toneDetected}
                    </span>
                  </div>

                  {/* Readability */}
                  <div className="bg-white p-2 rounded-lg border border-gray-200 flex flex-col items-center text-center shadow-sm h-24 justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Readability</span>
                    <span className="text-xs font-semibold text-slate-700 leading-tight mb-1">
                      {analysis.readabilityLevel}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded-full">{analysis.readabilityScore}/100</span>
                  </div>
                </div>

                {/* Educational Review Section */}
                {analysis.learningReview && (
                  <div className="bg-indigo-50 rounded-lg border border-indigo-100 overflow-hidden mb-4">
                    <button 
                      onClick={() => setIsReviewOpen(!isReviewOpen)}
                      className="w-full flex items-center justify-between p-3 bg-indigo-100/50 hover:bg-indigo-100 transition-colors"
                    >
                      <div className="flex items-center space-x-2 text-indigo-900">
                         <GraduationCap className="w-4 h-4 text-indigo-600" />
                         <span className="text-sm font-bold">Writing Review & Tips</span>
                      </div>
                      {isReviewOpen ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-indigo-500" />}
                    </button>
                    
                    {isReviewOpen && (
                      <div className="p-4 space-y-4">
                        {/* Focus Areas */}
                        <div>
                          <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Focus Areas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.learningReview.grammarFocusAreas.map((area, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded bg-white border border-indigo-200 text-xs font-medium text-indigo-700">
                                {area}
                              </span>
                            ))}
                            {analysis.learningReview.grammarFocusAreas.length === 0 && (
                               <span className="text-xs text-indigo-600 italic">No specific grammar issues found.</span>
                            )}
                          </div>
                        </div>

                        {/* General Feedback */}
                        <div>
                           <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Feedback</p>
                           <p className="text-xs text-indigo-900 leading-relaxed bg-white/50 p-2 rounded border border-indigo-100">
                             {analysis.learningReview.generalFeedback}
                           </p>
                        </div>

                        {/* Vocab */}
                        <div>
                           <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Vocabulary</p>
                           <p className="text-xs text-indigo-800 italic">
                             "{analysis.learningReview.vocabularyTips}"
                           </p>
                        </div>
                        
                        {/* Resources */}
                        <div>
                           <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Recommended</p>
                           <ul className="space-y-1">
                             {analysis.learningReview.recommendedResources.map((res, idx) => (
                               <li key={idx} className="flex items-start space-x-2 text-xs text-indigo-800">
                                 <BookOpen className="w-3 h-3 mt-0.5 text-indigo-500 flex-shrink-0" />
                                 <span>{res}</span>
                               </li>
                             ))}
                           </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                   {analysis.suggestions.length > 0 && (
                     <button 
                       onClick={onAcceptAll}
                       className="w-full mb-4 flex items-center justify-center space-x-2 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md font-medium text-sm hover:bg-green-100 transition-colors"
                     >
                       <CheckCheck className="w-4 h-4" />
                       <span>Accept All {analysis.suggestions.length} Suggestions</span>
                     </button>
                   )}

                   {analysis.suggestions.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-200" />
                        <p>Great job! No issues found.</p>
                      </div>
                   ) : (
                     analysis.suggestions.map(s => (
                       <SuggestionCard 
                         key={s.id} 
                         suggestion={s} 
                         onApply={onApplySuggestion} 
                         onDismiss={onDismissSuggestion} 
                       />
                     ))
                   )}
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <PieChart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Click Analyze to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* GEN AI TAB */}
        {activeTab === 'genai' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
              <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
                Generative Assistant
              </h3>
              <p className="text-xs text-indigo-700 mb-4">
                Use your 1,000 monthly credits to rewrite, expand, or brainstorm.
              </p>
              
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-slate-500">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => onRewrite("Make it more professional")} className="text-xs bg-white border border-indigo-200 text-indigo-600 py-2 rounded hover:bg-indigo-50 transition">
                    Make Professional
                  </button>
                  <button onClick={() => onRewrite("Shorten this text")} className="text-xs bg-white border border-indigo-200 text-indigo-600 py-2 rounded hover:bg-indigo-50 transition">
                    Shorten
                  </button>
                  <button onClick={() => onRewrite("Fix fluency for non-native speaker")} className="text-xs bg-white border border-indigo-200 text-indigo-600 py-2 rounded hover:bg-indigo-50 transition">
                    Fix Fluency
                  </button>
                  <button onClick={() => onRewrite("Expand with bullet points")} className="text-xs bg-white border border-indigo-200 text-indigo-600 py-2 rounded hover:bg-indigo-50 transition">
                    Use Bullet Points
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Custom Prompt</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md text-sm h-24 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  placeholder="E.g., Rewrite the second paragraph to be more empathetic..."
                />
                <button
                  onClick={handleRewrite}
                  disabled={isGenerating || !customPrompt.trim()}
                  className={`w-full py-2 rounded-md font-medium text-white text-xs ${
                    isGenerating ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PLAGIARISM TAB */}
        {activeTab === 'plagiarism' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
               <h3 className="text-sm font-bold text-slate-700 mb-2">Plagiarism Detection</h3>
               <p className="text-xs text-slate-500 mb-4">
                 Checks your text against web sources to ensure originality.
               </p>
               <button 
                  onClick={onCheckPlagiarism}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md font-medium text-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Scan for Plagiarism</span>
               </button>
            </div>

            {plagiarism && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                   <span className="text-sm font-medium text-slate-600">Originality Score</span>
                   <span className={`text-xl font-bold ${
                     plagiarism.status === 'clean' ? 'text-green-600' : 
                     plagiarism.status === 'suspicious' ? 'text-amber-500' : 'text-red-600'
                   }`}>
                     {plagiarism.originalityScore}%
                   </span>
                </div>

                {plagiarism.matches.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Potential Matches Found</p>
                    {plagiarism.matches.map((match, idx) => (
                      <div key={idx} className="bg-white p-3 rounded border border-red-100 border-l-4 border-l-red-400">
                        <p className="text-xs text-slate-800 font-medium mb-1 line-clamp-2">"{match.segment}"</p>
                        <div className="flex items-center justify-between mt-2">
                           <a href={match.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[150px]">
                             {match.sourceTitle || 'Unknown Source'}
                           </a>
                           <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                             Match
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-green-50 rounded-lg border border-green-100">
                    <ShieldCheck className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-green-800 font-medium">No plagiarism detected</p>
                    <p className="text-xs text-green-600">Your text appears original.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// Helper for the empty state icon
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}

export default Sidebar;