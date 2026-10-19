import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureFrame: (imageDataUrl: string, asReference: boolean) => void;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({
  isOpen,
  onClose,
  onCaptureFrame,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      return;
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, selectedDeviceId]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Enumerate devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevs);
      if (!selectedDeviceId && videoDevs.length > 0) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Could not access webcam. Please check browser permissions or use the built-in demo scenarios.'
      );
    }
  };

  const captureFrame = (asReference: boolean) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    onCaptureFrame(dataUrl, asReference);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Live Laptop Camera Acquisition
              </h3>
              <span className="text-xs text-slate-400">
                Observe physical desk workspace or inspect items
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

        {/* Video feed or error display */}
        <div className="relative bg-slate-950 aspect-video rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
          {errorMsg ? (
            <div className="p-6 text-center flex flex-col items-center gap-3 max-w-md">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
              <span className="text-sm font-semibold text-white">Camera Access Notice</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                {errorMsg}
              </p>
              <span className="text-xs text-teal-400 font-medium">
                Tip: You can use the rich built-in demo scenarios (Workbench, Calibration Tray) with identical computer vision pipeline behavior.
              </span>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Camera Selector */}
        {devices.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Device:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Capture buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={startCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Camera
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => captureFrame(true)}
              disabled={!!errorMsg}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Capture as Reference Frame
            </button>

            <button
              onClick={() => captureFrame(false)}
              disabled={!!errorMsg}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-40 rounded-lg transition-colors cursor-pointer shadow-sm shadow-teal-500/20"
            >
              <Check className="w-3.5 h-3.5" />
              Capture Live Observation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
