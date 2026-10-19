import React, { useRef, useState } from 'react';
import { Layers, Eye, Crosshair, ZoomIn, Upload, Camera, RefreshCw } from 'lucide-react';
import { BoundingBox, QualityMetrics, AlignmentResult, ComparisonResult } from '../types/vision';

interface ViewportComparisonProps {
  refCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  liveCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  quality: QualityMetrics | null;
  alignment: AlignmentResult | null;
  comparison: ComparisonResult | null;
  onSelectRoi: (roi: BoundingBox) => void;
  onUploadReference: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCaptureLiveSnapshot: () => void;
  scenarioName: string;
}

export const ViewportComparison: React.FC<ViewportComparisonProps> = ({
  refCanvasRef,
  liveCanvasRef,
  quality,
  alignment,
  comparison,
  onSelectRoi,
  onUploadReference,
  onCaptureLiveSnapshot,
  scenarioName,
}) => {
  const [overlayMode, setOverlayMode] = useState<'heatmap' | 'boxes' | 'none'>('boxes');
  const [viewSplit, setViewSplit] = useState<'side_by_side' | 'split_slider'>('side_by_side');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage for split slider
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rois = comparison?.detectedRois || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Viewport Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300">Overlays</span>
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setOverlayMode('boxes')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                overlayMode === 'boxes'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ROI Contours
            </button>
            <button
              onClick={() => setOverlayMode('heatmap')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                overlayMode === 'heatmap'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Diff Heatmap
            </button>
            <button
              onClick={() => setOverlayMode('none')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                overlayMode === 'none'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Clean Optical
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout mode */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewSplit('side_by_side')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewSplit === 'side_by_side'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setViewSplit('split_slider')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewSplit === 'split_slider'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Split Curtain
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Upload custom reference image"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Ref
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onUploadReference}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={onCaptureLiveSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Grab new snapshot from camera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Snapshot
          </button>
        </div>
      </div>

      {/* Main Viewport Grid */}
      {viewSplit === 'side_by_side' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Reference Scene Viewport */}
          <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Baseline Reference Frame
              </span>
              <span className="text-slate-400 font-mono">Gold Standard</span>
            </div>
            <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
              <canvas
                ref={refCanvasRef}
                className="w-full h-full object-contain block"
              />
            </div>
            <div className="p-3 bg-slate-950/40 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
              <span>Target Standard: Unobstructed configuration</span>
              <span className="font-mono text-slate-400">1280x720 RGB</span>
            </div>
          </div>

          {/* Current Live Observation Viewport */}
          <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                Live Observation Viewport
              </span>
              <div className="flex items-center gap-2 text-slate-400 font-mono">
                {alignment && (
                  <span>
                    Δ: [{alignment.offsetX > 0 ? `+${alignment.offsetX}` : alignment.offsetX},{alignment.offsetY > 0 ? `+${alignment.offsetY}` : alignment.offsetY}]px
                  </span>
                )}
                <span>{quality?.overallQuality || 'READY'}</span>
              </div>
            </div>

            <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden select-none">
              <canvas
                ref={liveCanvasRef}
                className="w-full h-full object-contain block"
              />

              {/* Heatmap Overlay */}
              {overlayMode === 'heatmap' && comparison?.heatmapDataUrl && (
                <img
                  src={comparison.heatmapDataUrl}
                  alt="Difference Heatmap"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen opacity-85 transition-opacity"
                  referrerPolicy="no-referrer"
                />
              )}

              {/* Contour ROIs Overlays */}
              {overlayMode === 'boxes' &&
                rois.map((roi, idx) => {
                  // Coordinate scaling relative to canvas bounds
                  const canvasEl = liveCanvasRef.current;
                  const cWidth = canvasEl ? canvasEl.width : 1280;
                  const cHeight = canvasEl ? canvasEl.height : 720;

                  const leftPct = (roi.x / cWidth) * 100;
                  const topPct = (roi.y / cHeight) * 100;
                  const widthPct = (roi.width / cWidth) * 100;
                  const heightPct = (roi.height / cHeight) * 100;

                  return (
                    <div
                      key={roi.id}
                      onClick={() => onSelectRoi(roi)}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                      }}
                      className="absolute border-2 border-teal-400 bg-teal-500/15 rounded-md hover:border-amber-400 hover:bg-amber-500/20 cursor-pointer transition-all flex flex-col justify-between p-1 z-10 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-mono px-1 py-0.5 bg-slate-900/90 text-teal-300 rounded border border-teal-500/40">
                          ROI #{idx + 1}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1 py-0.5 bg-slate-900/90 text-amber-300 rounded border border-amber-500/30">
                          {(roi.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-semibold text-slate-200 bg-slate-900 px-1 py-0.5 rounded flex items-center gap-0.5">
                          <ZoomIn className="w-2.5 h-2.5" /> Inspect
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-3 bg-slate-950/40 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
              <span>Active Scenario: {scenarioName}</span>
              <span className="font-mono text-slate-300">
                {rois.length > 0 ? `${rois.length} discrepancy region(s) detected` : 'No active anomalies'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Split Curtain Interactive Comparison */
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs">
            <span className="font-semibold text-slate-200">
              Interactive Split Curtain (Drag slider to inspect optical deviations)
            </span>
            <span className="font-mono text-teal-400">Curtain at {splitPos}%</span>
          </div>

          <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden select-none">
            {/* Base Live Canvas */}
            <canvas
              ref={liveCanvasRef}
              className="w-full h-full object-contain block"
            />

            {/* Clipped Reference Canvas */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${splitPos}%` }}
            >
              <canvas
                ref={refCanvasRef}
                className="w-full h-full object-contain block"
                style={{ width: '100%', maxWidth: 'none' }}
              />
            </div>

            {/* Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-teal-400 pointer-events-none shadow-[0_0_10px_#14b8a6]"
              style={{ left: `${splitPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center text-xs font-bold shadow-md">
                ↔
              </div>
            </div>

            {/* Slider input */}
            <input
              type="range"
              min="0"
              max="100"
              value={splitPos}
              onChange={(e) => setSplitPos(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
            />
          </div>

          <div className="p-3 bg-slate-950/40 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Left: Baseline Reference · Right: Live Observation</span>
            <span className="font-mono text-slate-400">Position: {splitPos}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
