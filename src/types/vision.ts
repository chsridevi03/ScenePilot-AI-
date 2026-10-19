export type AgentState =
  | 'IDLE'
  | 'CAPTURING'
  | 'CHECKING_QUALITY'
  | 'ALIGNING'
  | 'COMPARING'
  | 'INSPECTING_ROI'
  | 'AWAITING_REVIEW'
  | 'VERIFYING_RESOLUTION'
  | 'REPORTING'
  | 'COMPLETED';

export type ToolName =
  | 'capture_frame'
  | 'check_image_quality'
  | 'align_scene'
  | 'compare_reference'
  | 'inspect_roi'
  | 'request_recapture'
  | 'request_human_review'
  | 'verify_resolution'
  | 'save_session_report';

export interface QualityMetrics {
  sharpnessScore: number; // 0 - 100
  laplacianVariance: number;
  isBlurry: boolean;
  brightness: number; // 0 - 255
  contrast: number; // std dev
  isOverExposed: boolean;
  isUnderExposed: boolean;
  overallQuality: 'EXCELLENT' | 'USABLE' | 'DEGRADED' | 'POOR';
}

export interface AlignmentResult {
  offsetX: number; // pixels
  offsetY: number; // pixels
  rotationDeg: number;
  correlationScore: number; // 0 - 1
  neededCorrection: boolean;
}

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  confidence: number;
  label: string;
  changeType: 'OBJECT_MOVED' | 'OBJECT_ADDED' | 'OBJECT_REMOVED' | 'STRUCTURAL_CHANGE' | 'LIGHTING_DRIFT';
}

export interface ComparisonResult {
  hasMeaningfulChange: boolean;
  changeScore: number; // 0 - 100 %
  structuralDifferenceRatio: number;
  illuminationShiftDetected: boolean;
  detectedRois: BoundingBox[];
  confidence: number; // 0 - 1
  uncertaintyScore: number; // 0 - 1
  heatmapDataUrl?: string;
}

export interface RoiInspectionDetail {
  roi: BoundingBox;
  cropDataUrl: string;
  refCropDataUrl?: string;
  edgeGradientScore: number;
  textureComplexity: number;
  anomalyClassification: string;
  recommendedAction: string;
}

export interface TraceStep {
  id: string;
  stepNumber: number;
  timestamp: string;
  stateBefore: AgentState;
  stateAfter: AgentState;
  toolCalled: ToolName;
  inputObservation: string;
  reasoning: string;
  visualEvidence: string;
  toolOutput: Record<string, any>;
  durationMs: number;
  requiresUserAction?: boolean;
}

export interface SessionReport {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  referenceLabel: string;
  totalSteps: number;
  anomaliesDetected: number;
  recaptureCount: number;
  humanReviewsRequested: number;
  isResolved: boolean;
  trace: TraceStep[];
  evidenceFrames: Array<{
    name: string;
    stage: string;
    url: string;
    s3Key?: string;
  }>;
  awsUploadStatus: 'LOCAL_ONLY' | 'UPLOADED' | 'FAILED';
  evaluationMetrics: {
    medianLatencyMs: number;
    detectionConfidence: number;
    qualityScore: number;
  };
}

export interface AwsConfig {
  enabled: boolean;
  region: string;
  s3Bucket: string;
  apiGatewayEndpoint: string;
  cloudWatchLogGroup: string;
  mockMode: boolean;
}
