import React from 'react';
import { Play, Pause, StepForward, RotateCcw, CheckCircle2, AlertTriangle, FastForward } from 'lucide-react';
import { AgentState } from '../types/vision';
import { SAMPLE_SCENARIOS, SampleScenario } from '../lib/sampleScenes';

interface AgentControlBarProps {
  currentState: AgentState;
  isRunningAuto: boolean;
  onStep: () => void;
  onToggleAutoRun: () => void;
  onReset: () => void;
  onTriggerVerification: () => void;
  canVerify: boolean;
  selectedScenarioId: string;
  onSelectScenario: (scenario: SampleScenario) => void;
  retryCount: number;
}

export const AgentControlBar: React.FC<AgentControlBarProps> = ({
  currentState,
  isRunningAuto,
  onStep,
  onToggleAutoRun,
  onReset,
  onTriggerVerification,
  canVerify,
  selectedScenarioId,
  onSelectScenario,
  retryCount,
}) => {
  const stateColors: Record<AgentState, { bg: string; text: string; border: string }> = {
    IDLE: { bg: 'bg-slate-800/80', text: 'text-slate-300', border: 'border-slate-700' },
    CAPTURING: { bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-700/50' },
    CHECKING_QUALITY: { bg: 'bg-cyan-950/60', text: 'text-cyan-300', border: 'border-cyan-700/50' },
    ALIGNING: { bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-700/50' },
    COMPARING: { bg: 'bg-teal-950/60', text: 'text-teal-300', border: 'border-teal-700/50' },
    INSPECTING_ROI: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-700/50' },
    AWAITING_REVIEW: { bg: 'bg-orange-950/80', text: 'text-orange-300', border: 'border-orange-600/60' },
    VERIFYING_RESOLUTION: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/50' },
    REPORTING: { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-700/50' },
    COMPLETED: { bg: 'bg-teal-950/80', text: 'text-teal-300', border: 'border-teal-500/50' },
  };

  const currentTheme = stateColors[currentState] || stateColors.IDLE;

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Scenario Selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="scenario-select" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
            Test Scenario:
          </label>
          <select
            id="scenario-select"
            value={selectedScenarioId}
            onChange={(e) => {
              const sc = SAMPLE_SCENARIOS.find((s) => s.id === e.target.value);
              if (sc) onSelectScenario(sc);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-950 border border-slate-700 rounded-lg hover:border-slate-600 focus:outline-none focus:border-teal-400 cursor-pointer min-w-[280px]"
          >
            {SAMPLE_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* State Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Agent State:</span>
          <div
            className={`px-3 py-1 text-xs font-mono font-semibold rounded-lg border ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border} flex items-center gap-2`}
          >
            {currentState === 'AWAITING_REVIEW' && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
            {currentState === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
            <span>{currentState}</span>
            {retryCount > 0 && <span className="text-amber-400 text-[11px]">(Retries: {retryCount})</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Main Agent Action Controls */}
        <div className="flex items-center gap-2">
          {/* Step Action */}
          <button
            onClick={onStep}
            disabled={isRunningAuto || currentState === 'COMPLETED'}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            <StepForward className="w-3.5 h-3.5 text-teal-400" />
            Step Agent Action
          </button>

          {/* Autonomous Run */}
          <button
            onClick={onToggleAutoRun}
            disabled={currentState === 'COMPLETED'}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm ${
              isRunningAuto
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-teal-500/20'
            }`}
          >
            {isRunningAuto ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause Auto Loop
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Run Autonomous Loop
              </>
            )}
          </button>

          {/* Verification trigger when change is active */}
          {canVerify && (
            <button
              onClick={onTriggerVerification}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 bg-emerald-950/80 border border-emerald-600/60 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Simulate Fix & Verify Resolution
            </button>
          )}
        </div>

        {/* Reset control */}
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Agent
        </button>
      </div>
    </div>
  );
};
