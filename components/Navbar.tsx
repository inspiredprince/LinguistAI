import React from 'react';
import { PenTool, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-2 text-indigo-600">
        <PenTool className="w-6 h-6" />
        <span className="font-bold text-xl tracking-tight text-slate-900">LinguistAI</span>
      </div>
      
      <div className="flex items-center space-x-6 text-sm font-medium text-slate-600">
        <div className="flex items-center space-x-1">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>Grammar</span>
        </div>
        <div className="flex items-center space-x-1">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>Generative AI</span>
        </div>
        <div className="flex items-center space-x-1">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Plagiarism Check</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Free Plan</span>
          <span className="text-xs text-slate-400">1,000 AI prompts/mo</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
          U
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
