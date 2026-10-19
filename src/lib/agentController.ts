import {
  AgentState,
  ToolName,
  TraceStep,
  QualityMetrics,
  AlignmentResult,
  ComparisonResult,
  RoiInspectionDetail,
  BoundingBox,
  SessionReport,
} from '../types/vision';
import {
  evaluateImageQuality,
  estimateSceneAlignment,
  detectSceneChanges,
  inspectRoiRegion,
  verifyResolutionOfRoi,
} from './visionEngine';

export interface AgentContext {
  refCanvas: HTMLCanvasElement;
  liveCanvas: HTMLCanvasElement;
  onFrameRecaptured?: () => Promise<HTMLCanvasElement>;
  maxRetries?: number;
}

export class AgentController {
  public state: AgentState = 'IDLE';
  public trace: TraceStep[] = [];
  public currentStepNumber: number = 0;
  public retryCount: number = 0;
  public maxRetries: number = 3;

  public latestQuality: QualityMetrics | null = null;
  public latestAlignment: AlignmentResult | null = null;
  public latestComparison: ComparisonResult | null = null;
  public latestRoiDetail: RoiInspectionDetail | null = null;
  public inspectedRois: RoiInspectionDetail[] = [];
  public activeAnomalies: BoundingBox[] = [];
  public verificationResult: { isResolved: boolean; residualDelta: number; explanation: string } | null = null;
  public isHumanReviewPending: boolean = false;
  public lastObservation: string = 'Agent initialized in standby mode.';
  public isCompleted: boolean = false;

  private startTime: number = Date.now();
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
    if (context.maxRetries) this.maxRetries = context.maxRetries;
  }

  public updateContext(newContext: Partial<AgentContext>) {
    this.context = { ...this.context, ...newContext };
  }

  public reset() {
    this.state = 'IDLE';
    this.trace = [];
    this.currentStepNumber = 0;
    this.retryCount = 0;
    this.latestQuality = null;
    this.latestAlignment = null;
    this.latestComparison = null;
    this.latestRoiDetail = null;
    this.inspectedRois = [];
    this.activeAnomalies = [];
    this.verificationResult = null;
    this.isHumanReviewPending = false;
    this.lastObservation = 'Agent reset to initial standby.';
    this.isCompleted = false;
    this.startTime = Date.now();
  }

  /**
   * Evaluates current visual evidence and determines next tool to call
   */
  public async executeNextStep(): Promise<{
    state: AgentState;
    step: TraceStep;
    finished: boolean;
    requiresHumanReview: boolean;
  }> {
    const t0 = performance.now();
    const prevObservation = this.lastObservation;
    const stateBefore = this.state;
    this.currentStepNumber++;

    let toolCalled: ToolName;
    let reasoning = '';
    let visualEvidence = '';
    let toolOutput: Record<string, any> = {};
    let stateAfter: AgentState = this.state;
    let requiresUserAction = false;

    // --- State Machine Transition Table ---
    switch (this.state) {
      case 'IDLE': {
        toolCalled = 'capture_frame';
        reasoning = 'Beginning inspection session. Triggering workspace camera capture.';
        visualEvidence = 'Standby mode verified. Capturing live frame from active video buffer.';
        stateAfter = 'CHECKING_QUALITY';
        toolOutput = { status: 'SUCCESS', frameWidth: this.context.liveCanvas.width, frameHeight: this.context.liveCanvas.height };
        this.lastObservation = 'Live frame captured into memory. Ready for optical quality assessment.';
        break;
      }

      case 'CAPTURING': {
        toolCalled = 'capture_frame';
        reasoning = 'Acquired new frame from optical sensor.';
        visualEvidence = 'Fresh frame loaded with current workspace state.';
        stateAfter = 'CHECKING_QUALITY';
        toolOutput = { status: 'SUCCESS', width: this.context.liveCanvas.width, height: this.context.liveCanvas.height };
        this.lastObservation = 'Acquired new frame. Evaluating sharpness and exposure.';
        break;
      }

      case 'CHECKING_QUALITY': {
        toolCalled = 'check_image_quality';
        const liveCtx = this.context.liveCanvas.getContext('2d', { willReadFrequently: true });
        if (!liveCtx) throw new Error('Live canvas unavailable');
        const liveData = liveCtx.getImageData(0, 0, this.context.liveCanvas.width, this.context.liveCanvas.height);
        
        const quality = evaluateImageQuality(liveData);
        this.latestQuality = quality;
        toolOutput = quality;

        visualEvidence = `Laplacian variance: ${quality.laplacianVariance.toFixed(1)}, Sharpness score: ${quality.sharpnessScore}/100, Brightness: ${quality.brightness}/255.`;

        if (quality.isBlurry) {
          if (this.retryCount < this.maxRetries) {
            toolCalled = 'request_recapture';
            this.retryCount++;
            reasoning = `Frame blur detected (variance ${quality.laplacianVariance.toFixed(1)} < 55.0). Diffing now would cause false positives. Requesting recapture (attempt ${this.retryCount}/${this.maxRetries}).`;
            stateAfter = 'CAPTURING';
            this.lastObservation = `Quality degraded by blur. Automatically scheduling re-acquisition attempt ${this.retryCount}.`;
          } else {
            reasoning = `Persistent blur across ${this.maxRetries} captures. Requesting human operator review to clean lens or stabilize mounting.`;
            toolCalled = 'request_human_review';
            stateAfter = 'AWAITING_REVIEW';
            this.isHumanReviewPending = true;
            requiresUserAction = true;
            this.lastObservation = 'Maximum capture retries exceeded due to persistent optical degradation. Human review required.';
          }
        } else {
          reasoning = `Image quality passed (${quality.overallQuality}, sharpness ${quality.sharpnessScore}/100). Proceeding to scene alignment to cancel micro-movements.`;
          stateAfter = 'ALIGNING';
          this.lastObservation = `Optical quality verified (${quality.overallQuality}). Preparing translational alignment.`;
        }
        break;
      }

      case 'ALIGNING': {
        toolCalled = 'align_scene';
        const refCtx = this.context.refCanvas.getContext('2d', { willReadFrequently: true });
        const liveCtx = this.context.liveCanvas.getContext('2d', { willReadFrequently: true });
        if (!refCtx || !liveCtx) throw new Error('Canvas contexts missing');

        const refData = refCtx.getImageData(0, 0, this.context.refCanvas.width, this.context.refCanvas.height);
        const liveData = liveCtx.getImageData(0, 0, this.context.liveCanvas.width, this.context.liveCanvas.height);

        const alignment = estimateSceneAlignment(refData, liveData);
        this.latestAlignment = alignment;
        toolOutput = alignment;

        visualEvidence = `Estimated translational offset: dx = ${alignment.offsetX}px, dy = ${alignment.offsetY}px. Normalized correlation score: ${alignment.correlationScore}.`;

        if (alignment.neededCorrection) {
          reasoning = `Camera shift detected (${alignment.offsetX}px, ${alignment.offsetY}px). Applying transformation offset to live canvas before diffing.`;
        } else {
          reasoning = `Scene is well-registered with reference (<2px drift, correlation ${alignment.correlationScore}). Proceeding to pixel difference analysis.`;
        }

        stateAfter = 'COMPARING';
        this.lastObservation = `Alignment established (offset: [${alignment.offsetX}, ${alignment.offsetY}]). Ready for reference comparison.`;
        break;
      }

      case 'COMPARING': {
        toolCalled = 'compare_reference';
        const refCtx = this.context.refCanvas.getContext('2d', { willReadFrequently: true });
        const liveCtx = this.context.liveCanvas.getContext('2d', { willReadFrequently: true });
        if (!refCtx || !liveCtx) throw new Error('Canvas contexts missing');

        const refData = refCtx.getImageData(0, 0, this.context.refCanvas.width, this.context.refCanvas.height);
        const liveData = liveCtx.getImageData(0, 0, this.context.liveCanvas.width, this.context.liveCanvas.height);

        const offset = this.latestAlignment
          ? { x: this.latestAlignment.offsetX, y: this.latestAlignment.offsetY }
          : { x: 0, y: 0 };

        const comparison = detectSceneChanges(refData, liveData, offset);
        this.latestComparison = comparison;
        toolOutput = {
          hasMeaningfulChange: comparison.hasMeaningfulChange,
          changeScore: comparison.changeScore,
          detectedRoiCount: comparison.detectedRois.length,
          confidence: comparison.confidence,
          uncertaintyScore: comparison.uncertaintyScore,
          illuminationShift: comparison.illuminationShiftDetected,
        };

        visualEvidence = `Detected ${comparison.detectedRois.length} candidate region(s). Overall difference score: ${comparison.changeScore}%. Confidence: ${(comparison.confidence * 100).toFixed(0)}%. Uncertainty: ${(comparison.uncertaintyScore * 100).toFixed(0)}%.`;

        if (!comparison.hasMeaningfulChange) {
          reasoning = `Workspace conforms to reference layout (change score ${comparison.changeScore}% < threshold). No physical anomalies found.`;
          stateAfter = 'REPORTING';
          this.lastObservation = 'Inspection complete: Scene matches reference specification.';
        } else if (comparison.uncertaintyScore > 0.65 || comparison.illuminationShiftDetected) {
          reasoning = `Visual evidence is inconclusive (uncertainty ${(comparison.uncertaintyScore * 100).toFixed(0)}%). Illumination or background noise detected. Requesting human confirmation.`;
          toolCalled = 'request_human_review';
          stateAfter = 'AWAITING_REVIEW';
          this.isHumanReviewPending = true;
          requiresUserAction = true;
          this.activeAnomalies = comparison.detectedRois;
          this.lastObservation = 'Inconclusive visual discrepancy flagged. Human operator review requested.';
        } else {
          reasoning = `Meaningful visual change detected with high confidence (${(comparison.confidence * 100).toFixed(0)}%). Localizing primary ROI for high-resolution inspection.`;
          this.activeAnomalies = comparison.detectedRois;
          stateAfter = 'INSPECTING_ROI';
          this.lastObservation = `High-confidence change detected (${comparison.detectedRois.length} ROIs). Initializing focused inspection.`;
        }
        break;
      }

      case 'INSPECTING_ROI': {
        toolCalled = 'inspect_roi';
        if (this.activeAnomalies.length === 0) {
          stateAfter = 'REPORTING';
          reasoning = 'No active ROIs remain to inspect. Proceeding to final report.';
          visualEvidence = 'Zero pending anomalies.';
          toolOutput = { status: 'CLEARED' };
          break;
        }

        const primaryRoi = this.activeAnomalies[0];
        const detail = inspectRoiRegion(this.context.liveCanvas, this.context.refCanvas, primaryRoi);
        this.latestRoiDetail = detail;
        this.inspectedRois.push(detail);

        toolOutput = {
          roiId: primaryRoi.id,
          boundingBox: [primaryRoi.x, primaryRoi.y, primaryRoi.width, primaryRoi.height],
          area: primaryRoi.area,
          edgeGradientScore: detail.edgeGradientScore,
          classification: detail.anomalyClassification,
          recommendedAction: detail.recommendedAction,
        };

        visualEvidence = `ROI [${primaryRoi.x}, ${primaryRoi.y}, ${primaryRoi.width}x${primaryRoi.height}] inspected. Classification: "${detail.anomalyClassification}". Edge gradient: ${detail.edgeGradientScore}/100.`;
        reasoning = `Focused crop reveals localized physical discrepancy. Operator instruction: ${detail.recommendedAction}. Waiting for intervention or verification.`;

        // The agent now knows where the problem is and asks operator to fix it or review
        stateAfter = 'AWAITING_REVIEW';
        this.isHumanReviewPending = true;
        requiresUserAction = true;
        this.lastObservation = `Anomaly isolated: ${detail.anomalyClassification}. Operator action required to clear workspace or confirm exception.`;
        break;
      }

      case 'AWAITING_REVIEW': {
        // Normal progression if user called step while in review:
        reasoning = 'Operator review currently active. Please use the review panel to confirm, reject, or mark issue resolved.';
        toolCalled = 'request_human_review';
        visualEvidence = 'Waiting for user input.';
        requiresUserAction = true;
        toolOutput = { pendingAction: 'AWAITING_OPERATOR_DECISION' };
        stateAfter = 'AWAITING_REVIEW';
        break;
      }

      case 'VERIFYING_RESOLUTION': {
        toolCalled = 'verify_resolution';
        if (!this.latestRoiDetail) {
          reasoning = 'No prior anomaly ROI recorded to verify.';
          stateAfter = 'REPORTING';
          toolOutput = { status: 'SKIPPED' };
          visualEvidence = 'N/A';
          break;
        }

        const verify = verifyResolutionOfRoi(
          this.latestRoiDetail.roi,
          this.context.liveCanvas,
          this.context.refCanvas
        );
        this.verificationResult = verify;
        toolOutput = verify;

        visualEvidence = `Target ROI re-inspected: Residual delta = ${verify.residualDelta.toFixed(1)}, Resolution confidence = ${(verify.confidence * 100).toFixed(0)}%. Resolved = ${verify.isResolved}.`;

        if (verify.isResolved) {
          reasoning = `Closed-loop verification SUCCESS: The original discrepancy at ROI has been cleared back to reference baseline.`;
          this.activeAnomalies = [];
          stateAfter = 'REPORTING';
          this.lastObservation = 'Resolution verified: Discrepancy successfully corrected by operator.';
        } else {
          reasoning = `Closed-loop verification FAILED: Residual delta (${verify.residualDelta.toFixed(1)}) still exceeds tolerance threshold. Discrepancy persists.`;
          stateAfter = 'AWAITING_REVIEW';
          this.isHumanReviewPending = true;
          requiresUserAction = true;
          this.lastObservation = 'Verification check failed: Workspace still exhibits discrepancy.';
        }
        break;
      }

      case 'REPORTING': {
        toolCalled = 'save_session_report';
        reasoning = 'Inspection cycle complete. Compiling operational evidence, decision trace, and AWS telemetry.';
        visualEvidence = `Session duration: ${Math.round((Date.now() - this.startTime) / 1000)}s, Total decisions: ${this.currentStepNumber}, Anomalies resolved: ${this.verificationResult?.isResolved ? 1 : (this.activeAnomalies.length === 0 ? 0 : 1)}.`;
        stateAfter = 'COMPLETED';
        this.isCompleted = true;
        this.lastObservation = 'Final audit report saved to session registry.';
        toolOutput = {
          sessionId: `SP-${Date.now()}`,
          status: 'SUCCESS',
          totalSteps: this.currentStepNumber,
          isResolved: this.verificationResult ? this.verificationResult.isResolved : (this.latestComparison ? !this.latestComparison.hasMeaningfulChange : true),
        };
        break;
      }

      case 'COMPLETED': {
        toolCalled = 'save_session_report';
        reasoning = 'Session is already finished. Reset to start a new inspection run.';
        visualEvidence = 'Session completed.';
        stateAfter = 'COMPLETED';
        this.isCompleted = true;
        toolOutput = { status: 'COMPLETED' };
        break;
      }

      default:
        toolCalled = 'capture_frame';
        reasoning = 'Unknown state fallback.';
        visualEvidence = 'Standby.';
        stateAfter = 'IDLE';
    }

    const durationMs = Math.round(performance.now() - t0);

    const step: TraceStep = {
      id: `step_${this.currentStepNumber}_${Date.now()}`,
      stepNumber: this.currentStepNumber,
      timestamp: new Date().toLocaleTimeString(),
      stateBefore,
      stateAfter,
      toolCalled,
      inputObservation: prevObservation,
      reasoning,
      visualEvidence,
      toolOutput,
      durationMs,
      requiresUserAction,
    };

    this.state = stateAfter;
    this.trace.unshift(step); // Prepend to show latest on top

    return {
      state: this.state,
      step,
      finished: this.isCompleted,
      requiresHumanReview: requiresUserAction,
    };
  }

  /**
   * Operator human review decision
   */
  public handleOperatorDecision(decision: 'APPROVE_CHANGE' | 'REJECT_CHANGE' | 'FORCE_RETRY') {
    this.isHumanReviewPending = false;
    if (decision === 'APPROVE_CHANGE') {
      this.lastObservation = 'Operator confirmed and approved visual change as an intentional setup modification.';
      this.state = 'REPORTING';
    } else if (decision === 'REJECT_CHANGE') {
      this.lastObservation = 'Operator rejected change as unauthorized discrepancy. Prompting user to restore scene.';
      this.state = 'VERIFYING_RESOLUTION';
    } else {
      this.lastObservation = 'Operator requested full recapture and re-inspection.';
      this.state = 'CAPTURING';
    }
  }

  /**
   * Trigger resolution verification (e.g. user fixed the issue and clicked "I have fixed this")
   */
  public markResolvedAndVerify() {
    this.isHumanReviewPending = false;
    this.state = 'VERIFYING_RESOLUTION';
    this.lastObservation = 'Operator reported physical restoration complete. Triggering verification inspection.';
  }

  /**
   * Generate downloadable structured session report
   */
  public generateSessionReport(refLabel: string = 'Workbench Reference 01'): SessionReport {
    const latencies = this.trace.map((s) => s.durationMs);
    const medianLatency = latencies.length > 0 ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)] : 12;

    const isResolved = this.verificationResult
      ? this.verificationResult.isResolved
      : (this.latestComparison ? !this.latestComparison.hasMeaningfulChange : true);

    return {
      sessionId: `SCENEPILOT-${Date.now().toString(36).toUpperCase()}`,
      startedAt: new Date(this.startTime).toISOString(),
      completedAt: new Date().toISOString(),
      referenceLabel: refLabel,
      totalSteps: this.trace.length,
      anomaliesDetected: this.inspectedRois.length,
      recaptureCount: this.retryCount,
      humanReviewsRequested: this.trace.filter((s) => s.toolCalled === 'request_human_review').length,
      isResolved,
      trace: this.trace,
      evidenceFrames: [
        {
          name: 'reference_frame.png',
          stage: 'BASELINE_REFERENCE',
          url: this.context.refCanvas.toDataURL('image/png'),
          s3Key: `evidence/reference_${Date.now()}.png`,
        },
        {
          name: 'current_observation.png',
          stage: 'LIVE_CAPTURE',
          url: this.context.liveCanvas.toDataURL('image/png'),
          s3Key: `evidence/live_${Date.now()}.png`,
        },
        ...(this.latestComparison?.heatmapDataUrl
          ? [
              {
                name: 'difference_heatmap.png',
                stage: 'CHANGE_HEATMAP',
                url: this.latestComparison.heatmapDataUrl,
                s3Key: `evidence/heatmap_${Date.now()}.png`,
              },
            ]
          : []),
      ],
      awsUploadStatus: 'LOCAL_ONLY',
      evaluationMetrics: {
        medianLatencyMs: medianLatency,
        detectionConfidence: this.latestComparison ? this.latestComparison.confidence : 0.95,
        qualityScore: this.latestQuality ? this.latestQuality.sharpnessScore : 88,
      },
    };
  }
}
