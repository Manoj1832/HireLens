import React, { useState } from 'react';

export default function CandidateComparison({ candidates }) {
  const eligible = candidates.filter(c => c.atsScore >= 70);
  const [selected, setSelected] = useState(eligible.slice(0, Math.min(3, eligible.length)).map(c => c.id));
  const [showSkills, setShowSkills] = useState(true);
  const [showVerification, setShowVerification] = useState(true);
  const [showAssessment, setShowAssessment] = useState(true);

  const toggleCandidate = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const compared = candidates.filter(c => selected.includes(c.id));

  // Collect all unique skills
  const allSkills = [...new Set(compared.flatMap(c => c.skills))].sort();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Candidate Comparison</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">Select up to 4 candidates for side-by-side evaluation.</p>
      </div>

      {/* Candidate Selector */}
      <div className="bg-white border border-outline-variant p-4 paper-trail-card">
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Select Candidates ({selected.length}/4)</p>
        <div className="flex flex-wrap gap-2">
          {eligible.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCandidate(c.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-semibold transition-all ${
                selected.includes(c.id)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">{c.initials}</span>
              {c.name}
              {selected.includes(c.id) && <span className="material-symbols-outlined text-xs">check</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toggles */}
      <div className="flex gap-3">
        {[
          { label: 'Skills Matrix', val: showSkills, set: setShowSkills },
          { label: 'Verification', val: showVerification, set: setShowVerification },
          { label: 'Assessment', val: showAssessment, set: setShowAssessment },
        ].map(f => (
          <button
            key={f.label}
            onClick={() => f.set(!f.val)}
            className={`px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-wider transition-all ${
              f.val ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant text-on-surface-variant'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {compared.length === 0 ? (
        <div className="bg-white border border-outline-variant p-12 text-center paper-trail-card">
          <span className="material-symbols-outlined text-4xl text-outline-variant">compare_arrows</span>
          <p className="text-sm font-bold text-on-surface-variant mt-3">Select candidates above to compare</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse bg-white border border-outline-variant paper-trail-card">
            {/* Header Row */}
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low/30">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant w-40">Criteria</th>
                {compared.map(c => (
                  <th key={c.id} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {c.initials}
                      </div>
                      <span className="text-xs font-bold text-on-surface">{c.name}</span>
                      <span className="text-[10px] text-on-surface-variant">{c.role}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {/* ATS Score */}
              <tr className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-4 py-2.5 text-xs font-bold text-on-surface">ATS Match Score</td>
                {compared.map(c => {
                  const isHighest = c.atsScore === Math.max(...compared.map(x => x.atsScore));
                  return (
                    <td key={c.id} className="px-4 py-2.5 text-center">
                      <span className={`font-mono text-sm font-extrabold ${isHighest ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {c.atsScore}%
                      </span>
                      {isHighest && <span className="material-symbols-outlined text-primary text-xs ml-1">star</span>}
                    </td>
                  );
                })}
              </tr>

              {/* Stage */}
              <tr className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-4 py-2.5 text-xs font-bold text-on-surface">Current Stage</td>
                {compared.map(c => (
                  <td key={c.id} className="px-4 py-2.5 text-center">
                    <span className="text-[10px] font-bold text-on-surface-variant">{c.stage}</span>
                  </td>
                ))}
              </tr>

              {/* Verification Points */}
              {showVerification && (
                <tr className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-bold text-on-surface">Verified Evidence</td>
                  {compared.map(c => {
                    const verified = c.matchDetails?.verifiedPoints.filter(p => p.status === 'verified').length || 0;
                    const total = c.matchDetails?.verifiedPoints.length || 0;
                    return (
                      <td key={c.id} className="px-4 py-2.5 text-center">
                        <span className="font-mono text-xs font-bold text-on-surface">{verified}/{total}</span>
                        <div className="flex gap-[2px] justify-center mt-1">
                          {c.matchDetails?.verifiedPoints.map((p, i) => (
                            <div key={i} className={`w-3 h-1.5 rounded-full ${p.status === 'verified' ? 'bg-primary' : 'bg-outline-variant'}`}></div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* Assessment Score */}
              {showAssessment && (
                <tr className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-bold text-on-surface">Assessment Score</td>
                  {compared.map(c => (
                    <td key={c.id} className="px-4 py-2.5 text-center">
                      {c.codeAssessment ? (
                        <span className="font-mono text-xs font-bold text-emerald-700">{c.codeAssessment.score}</span>
                      ) : (
                        <span className="text-[10px] text-outline">Not taken</span>
                      )}
                    </td>
                  ))}
                </tr>
              )}

              {/* Skills Matrix */}
              {showSkills && allSkills.map(skill => (
                <tr key={skill} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-4 py-1.5 text-[11px] text-on-surface-variant font-medium">{skill}</td>
                  {compared.map(c => (
                    <td key={c.id} className="px-4 py-1.5 text-center">
                      {c.skills.includes(skill) ? (
                        <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-outline-variant text-sm">remove</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Recommendation */}
              <tr className="hover:bg-surface-container-low/30 transition-colors bg-surface-container-low/20">
                <td className="px-4 py-2.5 text-xs font-bold text-on-surface">Recommendation</td>
                {compared.map(c => (
                  <td key={c.id} className="px-4 py-2.5 text-center">
                    <span className={`text-[10px] font-bold ${
                      c.interviewEvaluation?.recommendation?.toLowerCase().includes('hire') ? 'text-emerald-700' : 'text-on-surface-variant'
                    }`}>
                      {c.interviewEvaluation?.recommendation || 'Pending'}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
