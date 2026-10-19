import React from 'react';
import { Camera, ShieldCheck, Cloud, Cpu } from 'lucide-react';

interface HeaderProps {
  activeTab: 'inspector' | 'timeline' | 'aws' | 'evaluation' | 'code';
  setActiveTab: (tab: 'inspector' | 'timeline' | 'aws' | 'evaluation' | 'code') => void;
  isWebcamActive: boolean;
  onOpenWebcam: () => void;
  isAwsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isWebcamActive,
  onOpenWebcam,
  isAwsConnected,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#inspector"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('inspector');
          }}
          className="text-lg font-bold tracking-tight text-white hover:text-teal-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Cpu className="w-4 h-4" />
          </div>
          ScenePilot AI
        </a>
      </div>

      {/* Zone 2: Concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={() => setActiveTab('inspector')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'inspector'
              ? 'text-teal-400 font-semibold border-b-2 border-teal-400 pb-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Vision Inspector
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'timeline'
              ? 'text-teal-400 font-semibold border-b-2 border-teal-400 pb-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Agent Decision Trace
        </button>
        <button
          onClick={() => setActiveTab('aws')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'aws'
              ? 'text-teal-400 font-semibold border-b-2 border-teal-400 pb-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          AWS Pipeline
        </button>
        <button
          onClick={() => setActiveTab('evaluation')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'evaluation'
              ? 'text-teal-400 font-semibold border-b-2 border-teal-400 pb-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Evaluation Matrix
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'code'
              ? 'text-teal-400 font-semibold border-b-2 border-teal-400 pb-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Python Source & Docs
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenWebcam}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-teal-500/20"
        >
          <Camera className="w-3.5 h-3.5" />
          {isWebcamActive ? 'Live Camera Active' : 'Connect Camera'}
        </button>
      </div>
    </header>
  );
};
