import React, { useState } from 'react';
import {
  Cloud,
  ShieldCheck,
  Database,
  Terminal,
  Send,
  CheckCircle2,
  Lock,
  ExternalLink,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';
import { AwsConfig, SessionReport } from '../types/vision';
import { awsService, AwsUploadResult } from '../lib/awsService';

interface AwsStatusPanelProps {
  awsConfig: AwsConfig;
  onUpdateConfig: (config: Partial<AwsConfig>) => void;
  latestReport: SessionReport | null;
}

export const AwsStatusPanel: React.FC<AwsStatusPanelProps> = ({
  awsConfig,
  onUpdateConfig,
  latestReport,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 's3' | 'cloudwatch' | 'lambda'>('overview');
  const [uploadResult, setUploadResult] = useState<AwsUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTestUpload = async () => {
    if (!latestReport) return;
    setIsUploading(true);
    try {
      const res = await awsService.uploadSessionEvidence(latestReport);
      setUploadResult(res);
    } catch (e: any) {
      setUploadResult({
        success: false,
        bytesUploaded: 0,
        message: e?.message || 'Upload failed',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cloudWatchLog = latestReport ? awsService.formatCloudWatchLog(latestReport) : null;
  const lambdaEvent = latestReport ? awsService.formatLambdaPayload(latestReport) : null;

  return (
    <div className="flex flex-col gap-6 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              AWS Cloud Infrastructure & Privacy Controls
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>S3 Evidence Storage</span>
              <span>·</span>
              <span>CloudWatch Telemetry</span>
              <span>·</span>
              <span>API Gateway & Lambda</span>
            </div>
          </div>
        </div>

        {/* Local vs Cloud Mode Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => onUpdateConfig({ enabled: false })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              !awsConfig.enabled
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Local-Only Privacy Mode
          </button>
          <button
            onClick={() => onUpdateConfig({ enabled: true })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              awsConfig.enabled
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            AWS Cloud Integration
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          Configuration & Policy
        </button>
        <button
          onClick={() => setActiveTab('s3')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 's3' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          S3 Evidence Vault
        </button>
        <button
          onClick={() => setActiveTab('cloudwatch')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'cloudwatch' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          CloudWatch Logs
        </button>
        <button
          onClick={() => setActiveTab('lambda')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'lambda' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          API Gateway & Lambda Payload
        </button>
      </div>

      {/* Tab 1: Overview & Config */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <span className="text-xs font-bold text-slate-200">Active AWS Credentials & Endpoints</span>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">AWS Region</label>
                <input
                  type="text"
                  value={awsConfig.region}
                  onChange={(e) => onUpdateConfig({ region: e.target.value })}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">Evidence S3 Bucket</label>
                <input
                  type="text"
                  value={awsConfig.s3Bucket}
                  onChange={(e) => onUpdateConfig({ s3Bucket: e.target.value })}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">API Gateway Ingestion URL</label>
                <input
                  type="text"
                  value={awsConfig.apiGatewayEndpoint}
                  onChange={(e) => onUpdateConfig({ apiGatewayEndpoint: e.target.value })}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">CloudWatch Log Group</label>
                <input
                  type="text"
                  value={awsConfig.cloudWatchLogGroup}
                  onChange={(e) => onUpdateConfig({ cloudWatchLogGroup: e.target.value })}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Privacy & Least-Privilege IAM Policy Info */}
            <div className="flex flex-col gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-teal-400" />
                Security & Privacy Architecture
              </span>
              <ul className="flex flex-col gap-2 text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Continuous Video Streaming:</strong> Only keyframe snapshots corresponding to localized discrepancies are uploaded upon inspection completion.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Client-Side Local-Only Fallback:</strong> If no AWS keys exist, ScenePilot functions completely in-memory without breaking.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Least-Privilege IAM Role:</strong> Grants scoped <code className="text-teal-300">s3:PutObject</code> strictly to <code className="text-teal-300">{awsConfig.s3Bucket}/*</code> and <code className="text-teal-300">logs:PutLogEvents</code>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Untrusted Visual Content Boundary:</strong> Any OCR text detected inside an image is isolated and never evaluated as executable agent instructions.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Test Trigger */}
          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-bold text-white block">
                Evidence Upload & AWS Event Test
              </span>
              <span className="text-xs text-slate-400">
                {latestReport
                  ? `Active session ${latestReport.sessionId} ready for upload`
                  : 'Run an agent inspection first to generate evidence frames'}
              </span>
            </div>

            <button
              onClick={handleTestUpload}
              disabled={!latestReport || isUploading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {isUploading ? 'Uploading to S3...' : 'Push Session to S3 & CloudWatch'}
            </button>
          </div>

          {uploadResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                uploadResult.success
                  ? 'bg-teal-950/30 border-teal-600/50 text-teal-200'
                  : 'bg-red-950/30 border-red-600/50 text-red-200'
              }`}
            >
              <span>{uploadResult.message}</span>
              {uploadResult.s3ReportKey && (
                <span className="font-mono text-slate-400 text-[11px]">
                  Key: {uploadResult.s3ReportKey}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: S3 Evidence Gallery */}
      {activeTab === 's3' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span>
              Target S3 Bucket: <strong className="text-white font-mono">s3://{awsConfig.s3Bucket}/</strong>
            </span>
            <span>
              {latestReport ? `${latestReport.evidenceFrames.length} evidence frames attached` : '0 frames'}
            </span>
          </div>

          {latestReport && latestReport.evidenceFrames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {latestReport.evidenceFrames.map((frame, idx) => (
                <div key={idx} className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-2.5 gap-2">
                  <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={frame.url}
                      alt={frame.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-semibold text-white">{frame.name}</span>
                    <span className="text-[11px] text-teal-400 font-mono">Stage: {frame.stage}</span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">{frame.s3Key}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              No evidence frames generated in the current session yet. Run an inspection to create frames.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: CloudWatch Logs */}
      {activeTab === 'cloudwatch' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Stream: <code className="text-teal-300">{awsConfig.cloudWatchLogGroup}</code></span>
            <button
              onClick={() => copyToClipboard(JSON.stringify(cloudWatchLog, null, 2))}
              className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy JSON</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto max-h-[400px]">
            {cloudWatchLog
              ? JSON.stringify(cloudWatchLog, null, 2)
              : '// Run an agent inspection to inspect the formatted CloudWatch event stream.'}
          </pre>
        </div>
      )}

      {/* Tab 4: Lambda Payload */}
      {activeTab === 'lambda' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>API Gateway Event (HTTP POST Payload for Lambda):</span>
            <button
              onClick={() => copyToClipboard(JSON.stringify(lambdaEvent, null, 2))}
              className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Payload</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto max-h-[400px]">
            {lambdaEvent
              ? JSON.stringify(lambdaEvent, null, 2)
              : '// Run an agent inspection to view the structured event payload.'}
          </pre>
        </div>
      )}
    </div>
  );
};
