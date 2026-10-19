export interface SampleScenario {
  id: string;
  name: string;
  category: 'Workbench' | 'Precision Lab' | 'Edge Case';
  description: string;
  referenceUrl: string;
  currentUrl: string;
  expectedOutcome: string;
  initialBlur?: boolean;
  lightingOffset?: number; // e.g. -40 (dim) or +40 (bright)
  displacement?: { x: number; y: number };
  isResolvedScene?: boolean;
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: 'moved_tool',
    name: '01. Workbench Anomaly: Displaced Multimeter & Wire Added',
    category: 'Workbench',
    description: 'A technician moved the digital multimeter probe and left a jumper wire crossing the circuit board.',
    referenceUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    currentUrl: '/src/assets/images/workbench_altered_1792401725884.jpg',
    expectedOutcome: 'High-confidence change detected; agent localizes ROI and triggers focused inspection.',
  },
  {
    id: 'blurry_frame',
    name: '02. Quality Failure: Blurry Lens Motion Artifact',
    category: 'Edge Case',
    description: 'Camera bumped or out of focus; Laplacian variance drops below sharpness threshold (55.0).',
    referenceUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    currentUrl: '/src/assets/images/workbench_altered_1792401725884.jpg',
    expectedOutcome: 'Agent autonomously detects blur, refuses comparison, and triggers request_recapture.',
    initialBlur: true,
  },
  {
    id: 'camera_nudge',
    name: '03. Mechanical Drift: Camera Nudge (14px Shift)',
    category: 'Workbench',
    description: 'Laptop or tripod was bumped slightly, creating translational misalignment.',
    referenceUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    currentUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    expectedOutcome: 'Agent runs align_scene, calculates cross-correlation offset, and compensates before diffing.',
    displacement: { x: 14, y: -6 },
  },
  {
    id: 'lighting_shift',
    name: '04. Ambient Lighting Drift: Overcast / Dim Lamp',
    category: 'Edge Case',
    description: 'Ambient sunlight dimmed, shifting luminance without physical changes.',
    referenceUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    currentUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    expectedOutcome: 'Agent detects illumination drift, raises uncertainty score, and requests human review if ambiguous.',
    lightingOffset: -45,
  },
  {
    id: 'nominal_clean',
    name: '05. Baseline Compliance: Unchanged Reference Scene',
    category: 'Workbench',
    description: 'Clean workspace matching the exact reference layout within nominal tolerance.',
    referenceUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    currentUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    expectedOutcome: 'No meaningful changes detected; agent passes inspection and generates nominal report.',
  },
  {
    id: 'restored_verification',
    name: '06. Resolution Verification: Tool Returned to Position',
    category: 'Workbench',
    description: 'Technician followed agent guidance and cleared the discrepancy back to baseline.',
    referenceUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    currentUrl: '/src/assets/images/workbench_reference_1792401725704.jpg',
    expectedOutcome: 'Agent inspects prior anomaly ROI, verifies residual delta < tolerance, and confirms resolved state.',
    isResolvedScene: true,
  },
  {
    id: 'precision_tray',
    name: '07. Precision Inspection: Laboratory Calibration Tray',
    category: 'Precision Lab',
    description: 'High-precision surgical and measurement calibration block tray.',
    referenceUrl: '/src/assets/images/lab_tray_reference_1792401725425.jpg',
    currentUrl: '/src/assets/images/lab_tray_reference_1792401725425.jpg',
    expectedOutcome: 'Sub-millimeter baseline alignment verified across instruments.',
  },
];
