import React, { useState } from 'react';

export default function CandidateDetails({ candidate, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!candidate) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-on-surface-variant text-sm">No candidate selected.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'person' },
    { id: 'assessment', label: 'Code Assessment', icon: 'code' },
    { id: 'proctoring', label: 'Proctoring Logs', icon: 'visibility' },
    { id: 'interview', label: 'Interview Report', icon: 'record_voice_over' },
    { id: 'timeline', label: 'Timeline', icon: 'timeline' },
  ];

  const renderVerificationBar = () => {
    const points = candidate.matchDetails?.verifiedPoints || [];
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Match Integrity</span>
          <span className="font-mono text-sm font-bold text-primary">{candidate.matchDetails?.matchPercent}%</span>
        </div>
        <div className="flex gap-[3px] w-full">
          {points.map((p, i) => (
            <div
              key={i}
              title={`${p.label}: ${p.source}`}
              className={`verification-bar-segment flex-1 cursor-pointer ${
                p.status === 'verified' ? 'bg-primary' : p.status === 'pending' ? 'bg-amber-400' : 'bg-outline-variant'
              }`}
            ></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {points.map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-surface-container-low border border-outline-variant rounded text-[10px]">
              <span className={`material-symbols-outlined text-sm ${
                p.status === 'verified' ? 'text-primary' : p.status === 'pending' ? 'text-amber-500' : 'text-outline'
              }`}>
                {p.status === 'verified' ? 'verified' : p.status === 'pending' ? 'pending' : 'help'}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-on-surface truncate">{p.label}</p>
                <p className="text-outline truncate">{p.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Back Button */}
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Back to Dashboard
      </button>

      {/* Candidate Header Card */}
      <div className="bg-white border border-outline-variant p-5 paper-trail-card">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-extrabold border-2 border-primary/20">
              {candidate.initials}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-on-surface tracking-tight">{candidate.name}</h1>
              <p className="text-xs text-on-surface-variant">{candidate.role} • {candidate.location}</p>
              <div className="flex gap-3 mt-2 text-[10px] text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">mail</span>
                  {candidate.email}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">phone</span>
                  {candidate.phone}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              candidate.stage === 'Hired' ? 'bg-emerald-100 text-emerald-800' :
              candidate.stage === 'Interviewed' ? 'bg-secondary-container/20 text-secondary' :
              'bg-primary/10 text-primary'
            }`}>{candidate.stage}</span>
            <div className="text-right">
              <p className="font-mono text-2xl font-extrabold text-primary">{candidate.atsScore}%</p>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">ATS Match</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1 border-b border-outline-variant overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Verification Bar */}
            <div className="bg-white border border-outline-variant p-5 paper-trail-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">verified_user</span>
                Evidence Verification
              </h3>
              {renderVerificationBar()}
            </div>

            {/* Skills Grid */}
            <div className="bg-white border border-outline-variant p-5 paper-trail-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">code</span>
                Skills & Technologies
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {candidate.skills.map((skill) => (
                  <span key={skill} className="bg-primary/5 text-primary border border-primary/20 px-2.5 py-1 rounded text-[11px] font-bold">
                    {skill}
                  </span>
                ))}
              </div>

              <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mt-4 mb-2">Strengths</h4>
              <ul className="space-y-1">
                {candidate.matchDetails?.strengths.map((s, i) => (
                  <li key={i} className="text-[11px] text-on-surface flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-emerald-600 text-xs mt-0.5">check_circle</span>
                    {s}
                  </li>
                ))}
              </ul>

              {candidate.matchDetails?.gaps.length > 0 && (
                <>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mt-4 mb-2">Gaps Identified</h4>
                  <ul className="space-y-1">
                    {candidate.matchDetails.gaps.map((g, i) => (
                      <li key={i} className="text-[11px] text-on-surface-variant flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-amber-500 text-xs mt-0.5">info</span>
                        {g}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {/* Code Assessment Tab */}
        {activeTab === 'assessment' && (
          <div className="space-y-5">
            {candidate.codeAssessment ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-outline-variant p-4 paper-trail-card text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</p>
                    <p className="font-bold text-sm text-emerald-700 mt-1">{candidate.codeAssessment.status}</p>
                  </div>
                  <div className="bg-white border border-outline-variant p-4 paper-trail-card text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Score</p>
                    <p className="font-mono font-extrabold text-xl text-primary mt-1">{candidate.codeAssessment.score}</p>
                  </div>
                  <div className="bg-white border border-outline-variant p-4 paper-trail-card text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Tab Switches</p>
                    <p className={`font-bold text-sm mt-1 ${candidate.codeAssessment.tabSwitches > 0 ? 'text-error' : 'text-emerald-700'}`}>
                      {candidate.codeAssessment.tabSwitches}
                    </p>
                  </div>
                  <div className="bg-white border border-outline-variant p-4 paper-trail-card text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Warnings</p>
                    <p className={`font-bold text-sm mt-1 ${candidate.codeAssessment.warnings > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {candidate.codeAssessment.warnings}
                    </p>
                  </div>
                </div>

                {/* Code Block */}
                <div className="bg-white border border-outline-variant paper-trail-card">
                  <div className="p-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Submitted Solution</span>
                    <span className="text-[10px] font-mono text-outline">{candidate.codeAssessment.date}</span>
                  </div>
                  <pre className="p-4 text-[11px] font-mono leading-relaxed text-on-surface overflow-x-auto bg-[#1e1e2e] text-[#cdd6f4] rounded-b">
                    <code>{candidate.codeAssessment.codeWritten}</code>
                  </pre>
                </div>

                {/* Test Cases */}
                <div className="bg-white border border-outline-variant paper-trail-card">
                  <div className="p-3 border-b border-outline-variant bg-surface-container-low/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Test Case Results</span>
                  </div>
                  <div className="divide-y divide-outline-variant">
                    {candidate.codeAssessment.testCases.map((tc, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-sm ${
                            tc.status === 'Pass' ? 'text-emerald-600' : 'text-amber-500'
                          }`}>
                            {tc.status === 'Pass' ? 'check_circle' : 'warning'}
                          </span>
                          <span className="text-xs font-medium text-on-surface">{tc.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold uppercase ${tc.status === 'Pass' ? 'text-emerald-700' : 'text-amber-600'}`}>{tc.status}</span>
                          <span className="font-mono text-[10px] text-outline">{tc.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-outline-variant p-12 text-center paper-trail-card">
                <span className="material-symbols-outlined text-4xl text-outline-variant">code_off</span>
                <p className="text-sm font-bold text-on-surface-variant mt-3">No Code Assessment Submitted</p>
                <p className="text-xs text-outline mt-1">This candidate has not completed the technical coding assessment yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Proctoring Logs Tab */}
        {activeTab === 'proctoring' && (
          <div className="bg-white border border-outline-variant paper-trail-card">
            <div className="p-3 border-b border-outline-variant bg-surface-container-low/30 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">visibility</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">AI Proctoring Session Log</span>
            </div>
            {candidate.proctoringLogs && candidate.proctoringLogs.length > 0 ? (
              <div className="divide-y divide-outline-variant">
                {candidate.proctoringLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-3">
                    <span className="font-mono text-[10px] font-bold text-on-surface-variant w-16 shrink-0 pt-0.5">{log.timestamp}</span>
                    <span className={`material-symbols-outlined text-sm mt-0.5 ${
                      log.type === 'warning' ? 'text-amber-500' : log.type === 'system' ? 'text-primary' : 'text-on-surface-variant'
                    }`}>
                      {log.type === 'warning' ? 'warning' : log.type === 'system' ? 'computer' : 'activity_zone'}
                    </span>
                    <p className={`text-xs flex-1 ${log.type === 'warning' ? 'text-amber-700 font-semibold' : 'text-on-surface'}`}>
                      {log.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-outline-variant">visibility_off</span>
                <p className="text-sm font-bold text-on-surface-variant mt-3">No Proctoring Data Available</p>
              </div>
            )}
          </div>
        )}

        {/* Interview Report Tab */}
        {activeTab === 'interview' && (
          <div className="space-y-5">
            {candidate.interviewEvaluation ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white border border-outline-variant p-5 paper-trail-card">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Soft Skills Assessment</h3>
                    <p className="text-xs text-on-surface leading-relaxed">{candidate.interviewEvaluation.softSkills}</p>
                  </div>
                  <div className="bg-white border border-outline-variant p-5 paper-trail-card">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Technical Depth</h3>
                    <p className="text-xs text-on-surface leading-relaxed">{candidate.interviewEvaluation.technicalDepth}</p>
                  </div>
                </div>

                {/* AI Transcription Snippet */}
                <div className="bg-tertiary-container/5 border border-tertiary/20 p-5 rounded">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">AI Transcription Excerpt</span>
                  </div>
                  <blockquote className="text-xs text-on-surface italic border-l-2 border-tertiary/40 pl-3 leading-relaxed">
                    "{candidate.interviewEvaluation.transcriptionSnippet}"
                  </blockquote>
                </div>

                {/* Recommendation */}
                <div className="bg-white border border-outline-variant p-5 paper-trail-card">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Panel Recommendation</h3>
                  <span className={`text-sm font-extrabold ${
                    candidate.interviewEvaluation.recommendation.toLowerCase().includes('hire') ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {candidate.interviewEvaluation.recommendation}
                  </span>
                </div>
              </>
            ) : (
              <div className="bg-white border border-outline-variant p-12 text-center paper-trail-card">
                <span className="material-symbols-outlined text-4xl text-outline-variant">mic_off</span>
                <p className="text-sm font-bold text-on-surface-variant mt-3">No Interview Conducted</p>
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="bg-white border border-outline-variant p-5 paper-trail-card">
            <div className="space-y-0">
              {candidate.timeline.map((event, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      i === candidate.timeline.length - 1 ? 'border-primary bg-primary' : 'border-primary/40 bg-surface'
                    }`}></div>
                    {i < candidate.timeline.length - 1 && (
                      <div className="w-[1px] h-full bg-outline-variant/60 min-h-[40px]"></div>
                    )}
                  </div>
                  <div className="pb-6 min-w-0">
                    <p className="text-[10px] font-mono font-bold text-on-surface-variant">{event.date}</p>
                    <p className="text-xs font-bold text-on-surface mt-0.5">{event.title}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">{event.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
