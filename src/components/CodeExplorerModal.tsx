import React, { useState } from 'react';
import {
  FileCode,
  FolderTree,
  Copy,
  Check,
  Download,
  BookOpen,
  Layers,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { PYTHON_CODEBASE_FILES } from '../lib/pythonCodebase';

export const CodeExplorerModal: React.FC = () => {
  const fileKeys = Object.keys(PYTHON_CODEBASE_FILES);
  const [selectedFile, setSelectedFile] = useState<string>(fileKeys[0] || 'app.py');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'architecture' | 'demo_script'>('code');

  const activeContent = PYTHON_CODEBASE_FILES[selectedFile] || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    const archive = JSON.stringify(PYTHON_CODEBASE_FILES, null, 2);
    const blob = new Blob([archive], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenepilot-ai-full-codebase.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Full Python Repository & Hackathon Deliverables
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Production OpenCV & Streamlit App</span>
              <span>·</span>
              <span>Boto3 AWS Services</span>
              <span>·</span>
              <span>Pytest Suite</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subview Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'code' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Source Files ({fileKeys.length})
            </button>
            <button
              onClick={() => setViewMode('architecture')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'architecture' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Architecture Diagram
            </button>
            <button
              onClick={() => setViewMode('demo_script')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'demo_script' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              3-5 Min Demo Script
            </button>
          </div>

          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Code Bundle
          </button>
        </div>
      </div>

      {viewMode === 'code' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* File Tree Sidebar */}
          <div className="md:col-span-1 bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1 max-h-[550px] overflow-y-auto">
            <span className="text-xs font-semibold text-slate-400 px-2 py-1 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-teal-400" />
              scenepilot-ai/
            </span>
            {fileKeys.map((fname) => (
              <button
                key={fname}
                onClick={() => setSelectedFile(fname)}
                className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors truncate cursor-pointer ${
                  selectedFile === fname
                    ? 'bg-teal-950/70 text-teal-300 border border-teal-600/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title={fname}
              >
                {fname}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="md:col-span-3 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
              <span className="font-mono text-teal-300 font-semibold">{selectedFile}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy File'}</span>
              </button>
            </div>
            <pre className="p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed">
              {activeContent}
            </pre>
          </div>
        </div>
      )}

      {viewMode === 'architecture' && (
        <div className="flex flex-col gap-4 p-5 bg-slate-950 border border-slate-800 rounded-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            ScenePilot AI System Architecture
          </h3>
          <pre className="p-4 bg-slate-900 rounded-xl font-mono text-xs text-teal-300 overflow-x-auto leading-relaxed border border-slate-800">
{`+-----------------------------------------------------------------------------------------+
|                               ScenePilot AI - System Architecture                       |
+-----------------------------------------------------------------------------------------+
                                                                                          
    [Webcam Sensor] ----> [Capture Engine]                                                
                                 |                                                        
                                 v                                                        
                     [Image Quality Guardrail]                                            
                     - cv2.Laplacian() variance                                           
                     - Exposure histogram & contrast                                      
                                 |                                                        
                      (Is blurry / dark?)                                                 
                       /               \\                                                  
                    [YES]              [NO]                                               
                     /                   \\                                                
             (request_recapture)          v                                               
             [Auto Look Again]    [Alignment Engine]                                      
                                  - cv2.phaseCorrelate()                                  
                                  - 2D translation offset (dx, dy)                         
                                         |                                                
                                         v                                                
                             [Comparison & Diff Engine]                                   
                             - cv2.absdiff() + adaptive thresh                            
                             - Illumination compensation                                  
                             - cv2.findContours() & BoundingBox                           
                                         |                                                
                               (Meaningful change?)                                       
                                /                 \\                                       
                             [YES]                [NO]                                    
                              /                     \\                                     
                             v                       v                                    
                     [ROI Extraction]        [Pass Baseline]                              
                     - High-res crop         - Conforms to gold std                       
                     - Edge & texture freq           |                                    
                             |                       v                                    
                     (High confidence?)     (save_session_report)                         
                      /             \\                                                     
                   [YES]           [NO]                                                   
                    /                \\                                                    
                   v                  v                                                   
          [Remediation Prompt]  [request_human_review]                                    
                   |                                                                      
                   v                                                                      
          [verify_resolution] <---------------- (Operator clears issue)                   
          - Re-inspect target ROI                                                         
          - Compare residual delta < threshold                                            
                   |                                                                      
            (Issue cleared?)                                                              
             /            \\                                                               
          [YES]           [NO]                                                            
           /                \\                                                             
          v                  v                                                            
    [Report Engine]   [Prompt Re-check]                                                   
          |                                                                               
          +-----------------------+-----------------------+                               
          |                       |                       |                               
          v                       v                       v                               
  [Amazon S3 Storage]    [Amazon CloudWatch]     [AWS API Gateway]                        
  - Evidence frames      - Operational logs      - Structured event                       
  - JSON audit report    - Latency telemetry     - Lambda webhook                         
`}
          </pre>
        </div>
      )}

      {viewMode === 'demo_script' && (
        <div className="flex flex-col gap-4 p-5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed max-h-[550px] overflow-y-auto">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-400" />
            3-to-5 Minute Live Demonstration Script for Hackathon Judges
          </h3>
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="font-bold text-teal-300 block mb-1">
                Minute 0:00 - 0:45: The Problem & Vision Thesis
              </span>
              <p>
                "Hello judges. Most computer vision pipelines are dumb: they capture a single frame, run an inference model, and dump text or bounding boxes. If the frame is blurry, or the camera got bumped, or the lighting dimmed, they either hallucinate or fail. ScenePilot AI is the vision agent that knows <em>when to look again</em>."
              </p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="font-bold text-teal-300 block mb-1">
                Minute 0:45 - 1:45: Act 1 - The Quality Guardrail & Adaptive Recapture
              </span>
              <p>
                "Let me demonstrate Scenario 2: Blurry Frame. Look at what happens when our agent takes a capture: the Laplacian variance is only 22.4. A standard pipeline would produce dozens of false difference artifacts. But ScenePilot recognizes this optical failure, refuses to diff, and autonomously triggers <code>request_recapture()</code>. The evidence from step one changed the agent's next action."
              </p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="font-bold text-teal-300 block mb-1">
                Minute 1:45 - 3:00: Act 2 - Change Localization & Focused ROI Inspection
              </span>
              <p>
                "Now let's switch to Scenario 1: A workbench where a technician moved the multimeter probe and left a jumper wire. The agent checks quality (variance 164.2 - Passed), checks scene alignment (no drift), generates the difference heatmap, and localizes the exact bounding box. Notice it doesn't just stop there: it invokes <code>inspect_roi()</code> to crop high-resolution details and classify the deviation."
              </p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="font-bold text-teal-300 block mb-1">
                Minute 3:00 - 4:15: Act 3 - Closed-Loop Verification & Resolution
              </span>
              <p>
                "Here is the true differentiator: verification. When the technician clears the foreign wire and returns the probe, ScenePilot executes <code>verify_resolution()</code>. It inspects the exact historical ROI, computes residual delta (14.2 &lt; 26.0 threshold), and mathematically confirms the issue is resolved."
              </p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="font-bold text-teal-300 block mb-1">
                Minute 4:15 - 5:00: Act 4 - AWS Architecture, Security & Offline Privacy
              </span>
              <p>
                "All selected evidence frames and audit logs are securely packaged for Amazon S3 and CloudWatch. If running in an air-gapped environment or when credentials are absent, ScenePilot runs 100% locally with zero crashes and strict untrusted visual data isolation."
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
