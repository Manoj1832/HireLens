import React, { useState } from 'react';

export default function AssessmentSetup({ onStartExam, candidateName = "Guest Candidate" }) {
  const [cameraAccess, setCameraAccess] = useState(false);
  const [micAccess, setMicAccess] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(false);
  const [checksComplete, setChecksComplete] = useState(false);

  const requestHardwareAccess = () => {
    setLoadingCamera(true);
    // Request actual or simulate
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setCameraAccess(true);
        setMicAccess(true);
        setLoadingCamera(false);
        // Stop stream to release lock
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(() => {
        // Fallback for mock environments
        setTimeout(() => {
          setCameraAccess(true);
          setMicAccess(true);
          setLoadingCamera(false);
        }, 1000);
      });
  };

  const runDiagnostics = () => {
    setCheckingSystem(true);
    setTimeout(() => {
      setCheckingSystem(false);
      setChecksComplete(true);
    }, 1500);
  };

  const isReady = cameraAccess && micAccess && checksComplete;

  return (
    <div className="max-w-2xl mx-auto my-12 bg-white border border-outline-variant p-6 rounded-lg paper-stack font-sans">
      <div className="border-b border-outline-variant pb-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-extrabold text-on-surface">HireLens Assessment Environment Onboarding</h1>
          <p className="text-[11px] text-on-surface-variant">Candidate: {candidateName}</p>
        </div>
        <span className="bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Test ID #9981</span>
      </div>

      <div className="space-y-6">
        {/* Rules Box */}
        <div className="p-4 bg-tertiary-container/5 border border-tertiary/20 rounded text-xs space-y-2">
          <h3 className="font-bold text-tertiary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">security</span>
            Proctoring & Exam Guidelines
          </h3>
          <ul className="list-disc pl-4 space-y-1 text-on-surface-variant">
            <li>Keep your webcam and microphone active throughout the entire session.</li>
            <li>Maintain focus inside the browser window. Leaving the exam tab will trigger system warnings.</li>
            <li>No external monitor, cellphones, or speaking voices are permitted.</li>
          </ul>
        </div>

        {/* Diagnostics Checklist */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">System Compatibility Checklist</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Webcam / Mic Permissions */}
            <div className="p-3 bg-surface-container-low border border-outline-variant rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">videocam</span>
                <div className="text-left">
                  <p className="text-xs font-bold">Media Diagnostics</p>
                  <p className="text-[9px] text-outline">Webcam & Microphone</p>
                </div>
              </div>
              {cameraAccess ? (
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded">Connected</span>
              ) : (
                <button 
                  onClick={requestHardwareAccess}
                  disabled={loadingCamera}
                  className="px-2.5 py-1 bg-primary text-white font-bold rounded text-[10px] hover:bg-primary-container"
                >
                  {loadingCamera ? 'Linking...' : 'Connect'}
                </button>
              )}
            </div>

            {/* Browser & OS Diagnostics */}
            <div className="p-3 bg-surface-container-low border border-outline-variant rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">computer</span>
                <div className="text-left">
                  <p className="text-xs font-bold">System Status</p>
                  <p className="text-[9px] text-outline">Chrome v120 / Linux</p>
                </div>
              </div>
              {checksComplete ? (
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded">Verified</span>
              ) : (
                <button 
                  onClick={runDiagnostics}
                  disabled={checkingSystem}
                  className="px-2.5 py-1 border border-outline-variant font-bold rounded text-[10px] hover:bg-surface-container"
                >
                  {checkingSystem ? 'Checking...' : 'Run Test'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Start Exam Action */}
        <div className="border-t border-outline-variant pt-6 flex justify-between items-center">
          <p className="text-[10px] text-outline max-w-xs leading-normal">
            By clicking "Launch Test Room", you consent to the secure proctoring terms of HireLens Enterprise.
          </p>
          <button
            onClick={onStartExam}
            disabled={!isReady}
            className={`px-8 py-3 font-bold rounded text-xs transition-all flex items-center gap-1.5 shadow-sm ${
              isReady 
                ? 'bg-primary text-white hover:bg-primary-container active:scale-[0.98]' 
                : 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
            }`}
          >
            <span>Launch Test Room</span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </button>
        </div>
      </div>
    </div>
  );
}
