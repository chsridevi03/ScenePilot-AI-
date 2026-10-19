import React from 'react';
import { X, ZoomIn, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';
import { RoiInspectionDetail } from '../types/vision';

interface RoiInspectorModalProps {
  detail: RoiInspectionDetail | null;
  onClose: () => void;
  onSimulateFix: () => void;
}

export const RoiInspectorModal: React.FC<RoiInspectorModalProps> = ({
  detail,
  onClose,
  onSimulateFix,
}) => {
  if (!detail) return null;

  const { roi, cropDataUrl, refCropDataUrl, edgeGradientScore, textureComplexity, anomalyClassification, recommendedAction } = detail;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <ZoomIn className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Focused Region-of-Interest (ROI) Inspection
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                ROI ID: {roi.id} · Bounding Box: [{roi.x}, {roi.y}, {roi.width}x{roi.height}]
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crops comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-300">
              Reference Scene (Expected)
            </span>
            <div className="bg-slate-950 border border-slate-800 rounded-lg aspect-square flex items-center justify-center p-2 overflow-hidden">
              {refCropDataUrl ? (
                <img
                  src={refCropDataUrl}
                  alt="Reference Crop"
                  className="max-h-full max-w-full object-contain rounded"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs text-slate-500">No reference crop</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-teal-300">
              Live Observation (Detected Change)
            </span>
            <div className="bg-slate-950 border border-teal-500/40 rounded-lg aspect-square flex items-center justify-center p-2 overflow-hidden shadow-[0_0_15px_rgba(20,184,166,0.15)]">
              {cropDataUrl ? (
                <img
                  src={cropDataUrl}
                  alt="Live Crop"
                  className="max-h-full max-w-full object-contain rounded"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs text-slate-500">No live crop</span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Classification</span>
            <span className="font-semibold text-white">{anomalyClassification}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Edge Gradient</span>
            <span className="font-mono text-teal-300 font-bold">{edgeGradientScore}/100</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Confidence</span>
            <span className="font-mono text-amber-300 font-bold">{(roi.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Recommended Action */}
        <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs flex flex-col gap-1">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
            Operator Remediation Recommendation:
          </span>
          <p className="text-slate-200">{recommendedAction}</p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Close View
          </button>
          <button
            onClick={() => {
              onClose();
              onSimulateFix();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors cursor-pointer shadow-sm shadow-teal-500/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark Discrepancy Resolved & Verify
          </button>
        </div>
      </div>
    </div>
  );
};
