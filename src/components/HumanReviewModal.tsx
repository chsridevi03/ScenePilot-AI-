import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react';

interface HumanReviewModalProps {
  isOpen: boolean;
  reason: string;
  onDecision: (decision: 'APPROVE_CHANGE' | 'REJECT_CHANGE' | 'FORCE_RETRY') => void;
  onSimulateFixAndVerify: () => void;
}

export const HumanReviewModal: React.FC<HumanReviewModalProps> = ({
  isOpen,
  reason,
  onDecision,
  onSimulateFixAndVerify,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-orange-500/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Agent Decision Escalation: Human Review Required
            </h3>
            <span className="text-xs text-orange-400 font-mono">
              Tool Invoked: request_human_review()
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400">
            Escalation Rationale:
          </span>
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {reason || 'The agent encountered ambiguous visual evidence or reached a required operator decision milestone.'}
          </p>
        </div>

        <div className="text-xs text-slate-400 leading-relaxed">
          The autonomous loop is currently paused. Please select an action to direct the agent's next step:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option 1: Approve change */}
          <button
            onClick={() => onDecision('APPROVE_CHANGE')}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl transition-all cursor-pointer text-center group"
          >
            <CheckCircle className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Approve Change</span>
            <span className="text-[10px] text-slate-400 leading-tight">
              Intentional change; accept as valid
            </span>
          </button>

          {/* Option 2: Reject & Trigger Fix */}
          <button
            onClick={() => {
              onSimulateFixAndVerify();
            }}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-600/50 hover:border-emerald-500 rounded-xl transition-all cursor-pointer text-center group"
          >
            <XCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-emerald-200">Fix & Verify</span>
            <span className="text-[10px] text-emerald-400/80 leading-tight">
              Restore scene & trigger verification
            </span>
          </button>

          {/* Option 3: Force recapture */}
          <button
            onClick={() => onDecision('FORCE_RETRY')}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl transition-all cursor-pointer text-center group"
          >
            <RefreshCw className="w-5 h-5 text-amber-400 group-hover:rotate-180 transition-transform duration-300" />
            <span className="text-xs font-semibold text-white">Force Recapture</span>
            <span className="text-[10px] text-slate-400 leading-tight">
              Retake optical capture from camera
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
