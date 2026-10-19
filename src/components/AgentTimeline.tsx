import React from 'react';
import {
  TraceStep,
  ToolName,
} from '../types/vision';
import {
  Camera,
  Activity,
  Layers,
  GitCompare,
  Search,
  RefreshCw,
  UserCheck,
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface AgentTimelineProps {
  trace: TraceStep[];
  onExportReport: () => void;
  canExport: boolean;
}

const toolIcons: Record<ToolName, React.ReactNode> = {
  capture_frame: <Camera className="w-3.5 h-3.5" />,
  check_image_quality: <Activity className="w-3.5 h-3.5" />,
  align_scene: <Layers className="w-3.5 h-3.5" />,
  compare_reference: <GitCompare className="w-3.5 h-3.5" />,
  inspect_roi: <Search className="w-3.5 h-3.5" />,
  request_recapture: <RefreshCw className="w-3.5 h-3.5" />,
  request_human_review: <UserCheck className="w-3.5 h-3.5" />,
  verify_resolution: <CheckCircle className="w-3.5 h-3.5" />,
  save_session_report: <FileText className="w-3.5 h-3.5" />,
};

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  trace,
  onExportReport,
  canExport,
}) => {
  return (
    <div className="flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white tracking-wide">
            Agent Decision Trace & Execution Log
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {trace.length} operational steps logged
          </span>
        </div>

        <button
          onClick={onExportReport}
          disabled={!canExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-300 bg-teal-950/80 hover:bg-teal-900 border border-teal-600/50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText className="w-3.5 h-3.5" />
          Export JSON Session Report
        </button>
      </div>

      {trace.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          Agent has not executed any steps yet. Click "Step Agent Action" or "Run Autonomous Loop" to begin the inspection cycle.
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
          {trace.map((step) => {
            const isRecapture = step.toolCalled === 'request_recapture';
            const isReview = step.toolCalled === 'request_human_review';
            const isVerify = step.toolCalled === 'verify_resolution';
            const isDone = step.toolCalled === 'save_session_report';

            let borderTint = 'border-slate-800';
            let bgTint = 'bg-slate-950/70';

            if (isRecapture) {
              borderTint = 'border-amber-700/60';
              bgTint = 'bg-amber-950/20';
            } else if (isReview) {
              borderTint = 'border-orange-600/60';
              bgTint = 'bg-orange-950/25';
            } else if (isVerify) {
              borderTint = 'border-emerald-600/60';
              bgTint = 'bg-emerald-950/20';
            } else if (isDone) {
              borderTint = 'border-teal-600/60';
              bgTint = 'bg-teal-950/25';
            }

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border ${borderTint} ${bgTint} flex flex-col gap-2.5 transition-all text-xs`}
              >
                {/* Step Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      #{step.stepNumber}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono font-semibold text-teal-300 bg-slate-900/90 px-2.5 py-0.5 rounded-md border border-slate-700">
                      {toolIcons[step.toolCalled]}
                      <span>{step.toolCalled}()</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {step.durationMs}ms
                    </span>
                    <span>{step.timestamp}</span>
                    <div className="flex items-center gap-1 text-slate-300">
                      <span>{step.stateBefore}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                      <span className="text-teal-400 font-bold">{step.stateAfter}</span>
                    </div>
                  </div>
                </div>

                {/* Input Observation */}
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400">
                    Observation Prompting Action:
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {step.inputObservation}
                  </p>
                </div>

                {/* Agent Reasoning */}
                <div className="flex flex-col gap-1 pl-1">
                  <span className="text-[10px] font-semibold text-teal-400">
                    Adaptive Rationale:
                  </span>
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {step.reasoning}
                  </p>
                </div>

                {/* Visual Evidence & Tool Output */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      Visual Evidence Extracted:
                    </span>
                    <span className="text-slate-300 font-mono">
                      {step.visualEvidence}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      Structured Tool Output:
                    </span>
                    <pre className="bg-slate-900/80 p-1.5 rounded font-mono text-slate-300 overflow-x-auto text-[10px]">
                      {JSON.stringify(step.toolOutput, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
