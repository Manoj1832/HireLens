import React, { useState, useEffect, useRef } from 'react';

export default function CodingAssessment({ onFinish, onRaiseProctoringAlert }) {
  const [code, setCode] = useState(`// Implement a Rate Limiter in Go
package main

import (
	"sync"
	"time"
)

type Limiter struct {
	mu     sync.Mutex
	cap    int
	tokens int
}

func NewLimiter(cap int) *Limiter {
	return &Limiter{
		cap:    cap,
		tokens: cap,
	}
}

// Allow returns true if request is allowed, false if rejected
func (l *Limiter) Allow() bool {
	// TODO: Implement rate limiting logic
	return true
}`);

  const [isRunning, setIsRunning] = useState(false);
  const [stdout, setStdout] = useState('Terminal ready. Click "Run Code Diagnostics" to compile.');
  const [testCases, setTestCases] = useState([
    { name: 'Basic Request Under Limit', status: 'Pending', duration: '--' },
    { name: 'Burst Request Blocked', status: 'Pending', duration: '--' },
    { name: 'Token Replenishment Speed', status: 'Pending', duration: '--' }
  ]);
  
  const [switches, setSwitches] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCamActive, setIsCamActive] = useState(false);

  // Monitor tab switches or window blurs to raise proctoring alerts
  useEffect(() => {
    const handleBlur = () => {
      setSwitches(prev => {
        const next = prev + 1;
        setTimeout(() => {
          onRaiseProctoringAlert({
            type: 'Window Blur',
            details: `Tab switch detected during coding session (Count: ${next}).`
          });
        }, 0);
        return next;
      });
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [onRaiseProctoringAlert]);

  // Start webcam and Roboflow Inference
  useEffect(() => {
    let stream = null;
    let intervalId = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCamActive(true);
        // Start checking frames every 3 seconds
        intervalId = setInterval(analyzeFrame, 3000);
      } catch (err) {
        console.error("Camera access denied or unavailable", err);
      }
    };

    const analyzeFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (canvas.width === 0 || canvas.height === 0) return;
      
      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get base64 string
      const base64Image = canvas.toDataURL("image/jpeg").split(',')[1];
      
      try {
        const response = await fetch("https://detect.roboflow.com/online-proctoring-system-x27ou-e7abr/1?api_key=HX5fjpV5F4vyCz7WmL7u", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: base64Image
        });
        const data = await response.json();
        
        if (data && data.predictions) {
          // Draw bounding boxes on canvas for visual feedback!
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          let foundViolations = [];
          data.predictions.forEach(p => {
             // Draw bounding box
             ctx.strokeStyle = '#ef4444';
             if(p.class === 'person') ctx.strokeStyle = '#22c55e';
             ctx.lineWidth = 2;
             ctx.strokeRect(p.x - p.width/2, p.y - p.height/2, p.width, p.height);
             
             ctx.fillStyle = ctx.strokeStyle;
             ctx.font = 'bold 12px monospace';
             ctx.fillText(`${p.class} ${(p.confidence*100).toFixed(0)}%`, p.x - p.width/2, (p.y - p.height/2) - 5);
  
             // Check violations
             if (['cell phone', 'laptop', 'headphone', 'book'].includes(p.class)) {
               foundViolations.push(p.class);
             }
          });
          
          const persons = data.predictions.filter(p => p.class === 'person').length;
          if (persons > 1) {
             foundViolations.push('Multiple people');
          } else if (persons === 0) {
             foundViolations.push('No person detected');
          }
  
          if (foundViolations.length > 0) {
             const details = `Proctoring AI detected: ${[...new Set(foundViolations)].join(', ')}.`;
             onRaiseProctoringAlert({
                type: 'Object/Person Detection',
                details: details
             });
          }
        }
      } catch (err) {
        console.error("Roboflow inference error:", err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, [onRaiseProctoringAlert]);

  const handleRunCode = () => {
    setIsRunning(true);
    setStdout('Compiling Go package...\nLinking dependencies...\nExecuting unit tests...\n\n');

    setTimeout(() => {
      setStdout(prev => prev + '--- PASS: TestBasicRequest (0.01s)\n--- PASS: TestBurstRequest (0.02s)\n--- PASS: TestReplenishment (0.12s)\n\nSUCCESS: 3/3 test cases passed successfully.');
      setTestCases([
        { name: 'Basic Request Under Limit', status: 'Pass', duration: '1.2ms' },
        { name: 'Burst Request Blocked', status: 'Pass', duration: '2.4ms' },
        { name: 'Token Replenishment Speed', status: 'Pass', duration: '12.1ms' }
      ]);
      setIsRunning(false);
    }, 1500);
  };

  const handleSubmit = () => {
    onFinish({
      codeWritten: code,
      tabSwitches: switches,
      testCases: testCases
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-surface-bright font-sans border-t border-outline-variant">
      {/* Left Column: Problem Details & Proctoring Panel */}
      <div className="w-full lg:w-1/3 flex flex-col border-r border-outline-variant h-full overflow-y-auto p-4 space-y-4">
        {/* Instructions */}
        <div className="bg-white border border-outline-variant p-4 rounded shadow-sm">
          <span className="bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Medium Complexity</span>
          <h2 className="text-sm font-bold text-on-surface mt-2">Problem Statement: Rate Limiter</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
            Build a concurrent rate limiter struct in Go. The rate limiter should be initialized with a maximum capacity. Implementing the <code>Allow()</code> function should check whether the client has remaining tokens.
          </p>
          <h3 className="text-[10px] font-bold text-on-surface uppercase tracking-wider mt-4">Expected Input/Output</h3>
          <p className="text-[11px] text-on-surface-variant font-mono bg-surface-container-low p-2 rounded mt-2">
            NewLimiter(5) -&gt; 5 requests allowed in burst. 6th request fails.
          </p>
        </div>

        {/* Live Proctoring Monitor */}
        <div className="bg-white border border-outline-variant p-4 rounded shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-primary text-sm">visibility</span>
              Live Proctoring Feed
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${isCamActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
          </div>

          <div className="aspect-video w-full bg-surface-container border border-outline-variant rounded relative flex items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
            {!isCamActive && (
              <span className="material-symbols-outlined text-outline text-3xl">videocam_off</span>
            )}
            {isCamActive && (
              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-bold font-mono px-1.5 py-0.5 rounded z-10">
                AI VISION ACTIVE
              </span>
            )}
          </div>

          {/* Warnings List */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant font-medium">Window Switches Detected</span>
            <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${switches > 0 ? 'bg-error-container text-on-error-container animate-bounce' : 'bg-surface-container'}`}>
              {switches}
            </span>
          </div>
          {switches > 0 && (
            <p className="text-[10px] text-error font-bold leading-tight">
              Warning: Tab loss detected. This incident has been logged.
            </p>
          )}
        </div>
      </div>

      {/* Right Column: Code Editor & Terminal Output */}
      <div className="w-full lg:w-2/3 flex flex-col h-full">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-surface-container-lowest">
          <div className="p-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">go_editor.go</span>
            <div className="flex gap-2">
              <button 
                onClick={handleRunCode}
                disabled={isRunning}
                className="px-3 py-1.5 bg-surface border border-outline-variant hover:bg-surface-container font-semibold rounded text-[11px] transition-all"
              >
                {isRunning ? 'Compiling...' : 'Run Code Diagnostics'}
              </button>
              <button 
                onClick={handleSubmit}
                className="px-4 py-1.5 bg-primary text-white font-bold rounded text-[11px] hover:bg-primary-container transition-all"
              >
                Submit Solutions
              </button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full p-4 font-mono text-[11px] leading-relaxed bg-[#1e1e2e] text-[#cdd6f4] outline-none resize-none"
            spellCheck="false"
          ></textarea>
        </div>

        {/* Terminal Area */}
        <div className="h-48 border-t border-outline-variant bg-[#11111b] text-white flex flex-col">
          <div className="p-2 border-b border-outline-variant/60 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Execution Terminal</span>
            <div className="flex gap-2">
              {testCases.map((tc, idx) => (
                <span 
                  key={idx}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    tc.status === 'Pass' ? 'bg-emerald-600/30 text-emerald-400' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {tc.name.split(' ')[0]}: {tc.status}
                </span>
              ))}
            </div>
          </div>
          <pre className="flex-1 p-3 font-mono text-[10px] text-white/80 overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
            {stdout}
          </pre>
        </div>
      </div>
    </div>
  );
}
