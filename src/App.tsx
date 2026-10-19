import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ViewportComparison } from './components/ViewportComparison';
import { AgentControlBar } from './components/AgentControlBar';
import { AgentTimeline } from './components/AgentTimeline';
import { RoiInspectorModal } from './components/RoiInspectorModal';
import { HumanReviewModal } from './components/HumanReviewModal';
import { AwsStatusPanel } from './components/AwsStatusPanel';
import { EvaluationModal } from './components/EvaluationModal';
import { CodeExplorerModal } from './components/CodeExplorerModal';
import { WebcamModal } from './components/WebcamModal';

import {
  AgentState,
  BoundingBox,
  RoiInspectionDetail,
  QualityMetrics,
  AlignmentResult,
  ComparisonResult,
  SessionReport,
  AwsConfig,
} from './types/vision';
import { AgentController } from './lib/agentController';
import { inspectRoiRegion } from './lib/visionEngine';
import { SAMPLE_SCENARIOS, SampleScenario } from './lib/sampleScenes';
import { DEFAULT_AWS_CONFIG, awsService } from './lib/awsService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'inspector' | 'timeline' | 'aws' | 'evaluation' | 'code'>('inspector');
  const [selectedScenario, setSelectedScenario] = useState<SampleScenario>(SAMPLE_SCENARIOS[0]);
  const [currentState, setCurrentState] = useState<AgentState>('IDLE');
  const [isRunningAuto, setIsRunningAuto] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  // Modals
  const [selectedRoiDetail, setSelectedRoiDetail] = useState<RoiInspectionDetail | null>(null);
  const [isHumanReviewModalOpen, setIsHumanReviewModalOpen] = useState(false);

  // Vision state
  const [quality, setQuality] = useState<QualityMetrics | null>(null);
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // AWS configuration
  const [awsConfig, setAwsConfig] = useState<AwsConfig>(DEFAULT_AWS_CONFIG);
  const [latestReport, setLatestReport] = useState<SessionReport | null>(null);

  // Canvas refs
  const refCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Controller ref
  const controllerRef = useRef<AgentController | null>(null);
  const autoRunTimerRef = useRef<number | null>(null);

  // Initialize or load images onto canvases
  const loadScenarioImages = useCallback(
    async (scenario: SampleScenario) => {
      if (!refCanvasRef.current || !liveCanvasRef.current) return;
      const refCanvas = refCanvasRef.current;
      const liveCanvas = liveCanvasRef.current;

      refCanvas.width = 1280;
      refCanvas.height = 720;
      liveCanvas.width = 1280;
      liveCanvas.height = 720;

      const refCtx = refCanvas.getContext('2d');
      const liveCtx = liveCanvas.getContext('2d');
      if (!refCtx || !liveCtx) return;

      const refImg = new Image();
      const liveImg = new Image();

      refImg.crossOrigin = 'anonymous';
      liveImg.crossOrigin = 'anonymous';

      await Promise.all([
        new Promise((resolve) => {
          refImg.onload = () => {
            refCtx.drawImage(refImg, 0, 0, 1280, 720);
            resolve(true);
          };
          refImg.onerror = () => {
            // Draw clean synthetic fallback
            refCtx.fillStyle = '#0f172a';
            refCtx.fillRect(0, 0, 1280, 720);
            refCtx.fillStyle = '#14b8a6';
            refCtx.font = '24px JetBrains Mono';
            refCtx.fillText('Reference Scene - Nominal Baseline', 360, 360);
            resolve(true);
          };
          refImg.src = scenario.referenceUrl;
        }),
        new Promise((resolve) => {
          liveImg.onload = () => {
            liveCtx.save();

            // Apply displacement if specified
            if (scenario.displacement) {
              liveCtx.translate(scenario.displacement.x, scenario.displacement.y);
            }

            // Apply blur filter if specified
            if (scenario.initialBlur) {
              liveCtx.filter = 'blur(6px)';
            }

            // Apply lighting filter if specified
            if (scenario.lightingOffset) {
              const brightnessPct = 100 + scenario.lightingOffset;
              liveCtx.filter = `brightness(${brightnessPct}%)`;
            }

            liveCtx.drawImage(liveImg, 0, 0, 1280, 720);
            liveCtx.restore();
            resolve(true);
          };
          liveImg.onerror = () => {
            liveCtx.fillStyle = '#0f172a';
            liveCtx.fillRect(0, 0, 1280, 720);
            liveCtx.fillStyle = '#f59e0b';
            liveCtx.font = '24px JetBrains Mono';
            liveCtx.fillText('Live Observation - Discrepancy Active', 360, 360);
            resolve(true);
          };
          liveImg.src = scenario.currentUrl;
        }),
      ]);

      // Initialize controller
      controllerRef.current = new AgentController({
        refCanvas,
        liveCanvas,
      });

      // Reset state
      setCurrentState('IDLE');
      setQuality(null);
      setAlignment(null);
      setComparison(null);
      setRetryCount(0);
      setSelectedRoiDetail(null);
      setIsHumanReviewModalOpen(false);
      setIsRunningAuto(false);
      if (autoRunTimerRef.current) {
        clearInterval(autoRunTimerRef.current);
        autoRunTimerRef.current = null;
      }
    },
    []
  );

  // Initialize on mount
  useEffect(() => {
    loadScenarioImages(selectedScenario);
  }, [selectedScenario, loadScenarioImages]);

  // Handle single Step
  const handleStep = async () => {
    if (!controllerRef.current) return;
    const controller = controllerRef.current;

    try {
      const result = await controller.executeNextStep();
      setCurrentState(result.state);
      setQuality(controller.latestQuality);
      setAlignment(controller.latestAlignment);
      setComparison(controller.latestComparison);
      setRetryCount(controller.retryCount);

      if (controller.latestRoiDetail) {
        setSelectedRoiDetail(controller.latestRoiDetail);
      }

      if (result.requiresHumanReview) {
        setIsHumanReviewModalOpen(true);
        if (isRunningAuto) {
          setIsRunningAuto(false);
        }
      }

      if (result.finished) {
        setIsRunningAuto(false);
        const report = controller.generateSessionReport(selectedScenario.name);
        setLatestReport(report);
      }
    } catch (err) {
      console.error('Error executing agent step:', err);
      setIsRunningAuto(false);
    }
  };

  // Autonomous loop execution
  useEffect(() => {
    if (isRunningAuto) {
      autoRunTimerRef.current = window.setInterval(async () => {
        if (!controllerRef.current) return;
        const controller = controllerRef.current;

        if (controller.isCompleted || controller.isHumanReviewPending) {
          setIsRunningAuto(false);
          return;
        }

        await handleStep();
      }, 750);
    } else {
      if (autoRunTimerRef.current) {
        clearInterval(autoRunTimerRef.current);
        autoRunTimerRef.current = null;
      }
    }

    return () => {
      if (autoRunTimerRef.current) {
        clearInterval(autoRunTimerRef.current);
      }
    };
  }, [isRunningAuto]);

  const handleToggleAutoRun = () => {
    if (currentState === 'COMPLETED') return;
    setIsRunningAuto((prev) => !prev);
  };

  const handleReset = () => {
    if (autoRunTimerRef.current) {
      clearInterval(autoRunTimerRef.current);
      autoRunTimerRef.current = null;
    }
    setIsRunningAuto(false);
    loadScenarioImages(selectedScenario);
  };

  // Simulate user fixing the physical scene and trigger verification
  const handleSimulateFixAndVerify = () => {
    setIsHumanReviewModalOpen(false);
    if (!refCanvasRef.current || !liveCanvasRef.current || !controllerRef.current) return;

    // Draw reference back onto live canvas to simulate technician restoring the physical workspace
    const refCtx = refCanvasRef.current.getContext('2d');
    const liveCtx = liveCanvasRef.current.getContext('2d');
    if (refCtx && liveCtx) {
      liveCtx.clearRect(0, 0, 1280, 720);
      liveCtx.drawImage(refCanvasRef.current, 0, 0);
    }

    controllerRef.current.markResolvedAndVerify();
    setCurrentState('VERIFYING_RESOLUTION');
    // Run verification step immediately
    setTimeout(() => {
      handleStep();
    }, 200);
  };

  const handleHumanReviewDecision = (decision: 'APPROVE_CHANGE' | 'REJECT_CHANGE' | 'FORCE_RETRY') => {
    setIsHumanReviewModalOpen(false);
    if (!controllerRef.current) return;
    controllerRef.current.handleOperatorDecision(decision);
    setCurrentState(controllerRef.current.state);
    setTimeout(() => {
      handleStep();
    }, 200);
  };

  const handleCustomReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !refCanvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const refCanvas = refCanvasRef.current;
        if (!refCanvas) return;
        const ctx = refCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, refCanvas.width, refCanvas.height);
          ctx.drawImage(img, 0, 0, refCanvas.width, refCanvas.height);
          controllerRef.current?.reset();
          setCurrentState('IDLE');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleWebcamFrameCaptured = (dataUrl: string, asReference: boolean) => {
    const targetCanvas = asReference ? refCanvasRef.current : liveCanvasRef.current;
    if (!targetCanvas) return;

    const img = new Image();
    img.onload = () => {
      const ctx = targetCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.drawImage(img, 0, 0, targetCanvas.width, targetCanvas.height);
        setIsWebcamActive(true);
        if (asReference) {
          controllerRef.current?.reset();
          setCurrentState('IDLE');
        } else {
          setCurrentState('CAPTURING');
        }
      }
    };
    img.src = dataUrl;
  };

  const handleExportSessionJson = () => {
    if (!controllerRef.current) return;
    const report = controllerRef.current.generateSessionReport(selectedScenario.name);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canVerify =
    comparison?.hasMeaningfulChange === true ||
    currentState === 'INSPECTING_ROI' ||
    currentState === 'AWAITING_REVIEW';

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isWebcamActive={isWebcamActive}
        onOpenWebcam={() => setIsWebcamOpen(true)}
        isAwsConnected={awsConfig.enabled}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Tab 1: Vision Inspector (Default) */}
        {activeTab === 'inspector' && (
          <div className="flex flex-col gap-6">
            {/* Agent Control Bar */}
            <AgentControlBar
              currentState={currentState}
              isRunningAuto={isRunningAuto}
              onStep={handleStep}
              onToggleAutoRun={handleToggleAutoRun}
              onReset={handleReset}
              onTriggerVerification={handleSimulateFixAndVerify}
              canVerify={canVerify}
              selectedScenarioId={selectedScenario.id}
              onSelectScenario={(sc) => {
                setSelectedScenario(sc);
              }}
              retryCount={retryCount}
            />

            {/* Viewports (Side by Side or Split Curtain) */}
            <ViewportComparison
              refCanvasRef={refCanvasRef}
              liveCanvasRef={liveCanvasRef}
              quality={quality}
              alignment={alignment}
              comparison={comparison}
              onSelectRoi={(roi) => {
                if (!liveCanvasRef.current || !refCanvasRef.current) return;
                const detail = controllerRef.current?.latestRoiDetail;
                if (detail && detail.roi.id === roi.id) {
                  setSelectedRoiDetail(detail);
                } else if (liveCanvasRef.current && refCanvasRef.current) {
                  const d = inspectRoiRegion(liveCanvasRef.current, refCanvasRef.current, roi);
                  setSelectedRoiDetail(d);
                }
              }}
              onUploadReference={handleCustomReferenceUpload}
              onCaptureLiveSnapshot={() => {
                // Re-sample current live image
                handleStep();
              }}
              scenarioName={selectedScenario.name}
            />

            {/* Compact Decision Trace */}
            <AgentTimeline
              trace={controllerRef.current?.trace || []}
              onExportReport={handleExportSessionJson}
              canExport={(controllerRef.current?.trace.length || 0) > 0}
            />
          </div>
        )}

        {/* Tab 2: Decision Timeline View */}
        {activeTab === 'timeline' && (
          <div className="flex flex-col gap-6">
            <AgentTimeline
              trace={controllerRef.current?.trace || []}
              onExportReport={handleExportSessionJson}
              canExport={(controllerRef.current?.trace.length || 0) > 0}
            />
          </div>
        )}

        {/* Tab 3: AWS Pipeline */}
        {activeTab === 'aws' && (
          <div className="flex flex-col gap-6">
            <AwsStatusPanel
              awsConfig={awsConfig}
              onUpdateConfig={(cfg) => {
                setAwsConfig((prev) => ({ ...prev, ...cfg }));
                awsService.updateConfig(cfg);
              }}
              latestReport={latestReport || (controllerRef.current ? controllerRef.current.generateSessionReport(selectedScenario.name) : null)}
            />
          </div>
        )}

        {/* Tab 4: Evaluation Matrix */}
        {activeTab === 'evaluation' && (
          <div className="flex flex-col gap-6">
            <EvaluationModal />
          </div>
        )}

        {/* Tab 5: Source Code & Hackathon Deliverables */}
        {activeTab === 'code' && (
          <div className="flex flex-col gap-6">
            <CodeExplorerModal />
          </div>
        )}
      </main>

      {/* ROI Focused Detail Modal */}
      <RoiInspectorModal
        detail={selectedRoiDetail}
        onClose={() => setSelectedRoiDetail(null)}
        onSimulateFix={handleSimulateFixAndVerify}
      />

      {/* Human Review Escalation Modal */}
      <HumanReviewModal
        isOpen={isHumanReviewModalOpen}
        reason={controllerRef.current?.lastObservation || 'Human operator confirmation required.'}
        onDecision={handleHumanReviewDecision}
        onSimulateFixAndVerify={handleSimulateFixAndVerify}
      />

      {/* Webcam Acquisition Modal */}
      <WebcamModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCaptureFrame={handleWebcamFrameCaptured}
      />

      {/* Clean quiet footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        ScenePilot AI · The Vision Agent That Knows When to Look Again · Open-Source Apache 2.0
      </footer>
    </div>
  );
}
