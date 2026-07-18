import React, { useState } from 'react';

export default function ResumeUpload({ onCandidateAdd }) {
  const [dragActive, setDragActive] = useState(false);
  const [parsingQueue, setParsingQueue] = useState([]);
  const [parsedResumes, setParsedResumes] = useState([
    { name: 'Sarah_Chen_CV.pdf', size: '242 KB', status: 'Completed', date: 'Oct 24, 2026', matchedCandidate: 'Sarah Chen' },
    { name: 'Marcus_Thorne_Portfolio.pdf', size: '1.2 MB', status: 'Completed', date: 'Oct 23, 2026', matchedCandidate: 'Marcus Thorne' }
  ]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const simulateParsing = (fileName, fileSize) => {
    const queueId = Date.now() + Math.random().toString(36).substr(2, 9);
    const steps = [
      { label: 'Reading File...', progress: 20 },
      { label: 'Running OCR Engine...', progress: 40 },
      { label: 'Extracting Entities...', progress: 60 },
      { label: 'Cross-Referencing LinkedIn...', progress: 85 },
      { label: 'Integrity Verification Completed!', progress: 100 }
    ];

    const newQueueItem = {
      id: queueId,
      name: fileName,
      size: fileSize,
      currentStep: steps[0].label,
      progress: 20
    };

    setParsingQueue(prev => [newQueueItem, ...prev]);

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setParsingQueue(prev => 
          prev.map(item => 
            item.id === queueId 
              ? { ...item, currentStep: steps[stepIndex].label, progress: steps[stepIndex].progress } 
              : item
          )
        );
      } else {
        clearInterval(interval);
        // Add to completed list
        const cands = [
          { name: 'Alexander Mercer', initials: 'AM', skills: ['Go', 'PostgreSQL', 'Docker'], score: 82, location: 'Seattle, WA' },
          { name: 'Jessica Vance', initials: 'JV', skills: ['Figma', 'React', 'Tailwind CSS'], score: 79, location: 'Boston, MA' }
        ];
        const selectedMock = cands[Math.floor(Math.random() * cands.length)];

        setParsedResumes(prev => [
          { name: fileName, size: fileSize, status: 'Completed', date: 'Today', matchedCandidate: selectedMock.name },
          ...prev
        ]);
        setParsingQueue(prev => prev.filter(item => item.id !== queueId));

        // Add candidate to global candidates list
        onCandidateAdd({
          id: `cand-${Date.now()}`,
          name: selectedMock.name,
          initials: selectedMock.initials,
          location: selectedMock.location,
          role: 'Senior Backend Engineer',
          email: `${selectedMock.name.toLowerCase().replace(' ', '.')}@techmail.net`,
          phone: '+1 (555) 0192-349',
          appliedDate: 'Today',
          stage: 'Applied',
          atsScore: selectedMock.score,
          skills: selectedMock.skills,
          matchDetails: {
            matchPercent: selectedMock.score,
            verifiedPoints: [
              { label: "Resume NLP Parsed", status: "verified", source: fileName },
              { label: "LinkedIn Cross-Ref", status: "verified", source: `linkedin.com/in/${selectedMock.name.toLowerCase().replace(' ', '')}` },
              { label: "GitHub Contributions", status: "unverified", source: "Not connected" },
              { label: "Coding Assessment", status: "pending", source: "TBD" }
            ],
            gaps: ['GitHub repository connection missing'],
            strengths: ['Strong Go programming skillset', 'Familiar with container orchestration']
          },
          codeAssessment: null,
          proctoringLogs: [],
          interviewEvaluation: null,
          timeline: [
            { date: 'Today', title: 'Application Uploaded', desc: `Resume parsing complete. Match score established: ${selectedMock.score}%` }
          ]
        });
      }
    }, 1000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeStr = file.size > 1024 * 1024 
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
        : (file.size / 1024).toFixed(0) + ' KB';
      simulateParsing(file.name, sizeStr);
    }
  };

  const triggerUploadInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.txt';
    input.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const sizeStr = file.size > 1024 * 1024 
          ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
          : (file.size / 1024).toFixed(0) + ' KB';
        simulateParsing(file.name, sizeStr);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Resume Upload & OCR Pipeline</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">Drag and drop resumes to trigger AI entity extraction, LinkedIn verification, and automated matching.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          <div 
            onDragEnter={handleDrag} 
            onDragOver={handleDrag} 
            onDragLeave={handleDrag} 
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all flex flex-col items-center justify-center min-h-[300px] bg-white ${
              dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-outline-variant hover:border-primary/50'
            }`}
          >
            <span className="material-symbols-outlined text-primary text-5xl mb-4 animate-pulse">cloud_upload</span>
            <h3 className="text-sm font-bold text-on-surface mb-2">Drag and drop your candidate resumes here</h3>
            <p className="text-[11px] text-on-surface-variant mb-6">Supports PDF, DOCX, and TXT files up to 10MB</p>
            <button 
              onClick={triggerUploadInput}
              className="px-6 py-2.5 bg-primary text-white font-bold rounded text-xs hover:bg-primary-container transition-all shadow-sm"
            >
              Browse Files
            </button>
          </div>

          {/* Active Parsing Queue */}
          {parsingQueue.length > 0 && (
            <div className="bg-white border border-outline-variant p-4 paper-trail-card space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Active Processing Queue</h4>
              {parsingQueue.map(item => (
                <div key={item.id} className="p-3 bg-surface-container-low border border-outline-variant rounded space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold truncate max-w-[200px]">{item.name} ({item.size})</span>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider animate-pulse">{item.currentStep}</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload History / Completed Parsed Resumes */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-outline-variant paper-trail-card">
            <div className="p-4 border-b border-outline-variant bg-surface-container-lowest">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Completed Matches</h3>
            </div>
            <div className="divide-y divide-outline-variant max-h-[400px] overflow-y-auto">
              {parsedResumes.map((resume, idx) => (
                <div key={idx} className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface truncate">{resume.name}</p>
                      <p className="text-[10px] text-outline mt-0.5">{resume.size} • Uploaded {resume.date}</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Completed
                    </span>
                  </div>
                  <div className="p-2 bg-surface-container-low border border-outline-variant rounded flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-outline uppercase font-bold">Matched Profile</p>
                      <p className="font-bold text-on-surface text-[11px]">{resume.matchedCandidate}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-sm">open_in_new</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
