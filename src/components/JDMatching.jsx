import React, { useState, useEffect } from 'react';

export default function JDMatching({ candidates, jobs }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || '');
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidates[0]?.id || '');
  const [jdText, setJdText] = useState('');
  const [skillWeights, setSkillWeights] = useState({});
  const [adjustedScore, setAdjustedScore] = useState(0);

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  // Sync JD text and initial weights when job changes
  useEffect(() => {
    if (selectedJob) {
      setJdText(selectedJob.description);
      const weights = {};
      selectedJob.requiredSkills.forEach(skill => {
        weights[skill] = 5; // Default weight 5 out of 10
      });
      setSkillWeights(weights);
    }
  }, [selectedJobId, selectedJob]);

  // Recalculate score dynamically based on candidate skills match and weights
  useEffect(() => {
    if (!selectedCandidate || !selectedJob) return;

    let totalWeight = 0;
    let earnedWeight = 0;

    selectedJob.requiredSkills.forEach(skill => {
      const weight = skillWeights[skill] || 5;
      totalWeight += weight;
      if (selectedCandidate.skills.includes(skill)) {
        earnedWeight += weight;
      }
    });

    // Base verification factor: number of verified points
    const verifiedPointsCount = selectedCandidate.matchDetails?.verifiedPoints.filter(p => p.status === 'verified').length || 0;
    const totalPointsCount = selectedCandidate.matchDetails?.verifiedPoints.length || 1;
    const verificationRatio = verifiedPointsCount / totalPointsCount;

    // Calculate final weighted percentage
    const skillScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 80;
    // Weighted final score: 70% skill match + 30% evidence verification
    const finalScore = Math.round((skillScore * 0.7) + (verificationRatio * 30));
    setAdjustedScore(Math.min(100, Math.max(20, finalScore)));
  }, [selectedCandidateId, skillWeights, selectedJob, selectedCandidate]);

  const handleWeightChange = (skill, val) => {
    setSkillWeights(prev => ({
      ...prev,
      [skill]: parseInt(val, 10)
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-on-surface tracking-tight">JD Match & Gap Analysis</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">Adjust weights of required skills to dynamically recalculate Match Integrity Scores.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Job & Candidate Selector / Text Area */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-outline-variant p-4 paper-trail-card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Configuration</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Select Job Role</label>
              <select 
                value={selectedJobId} 
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded p-2 text-xs focus:border-primary outline-none"
              >
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Select Candidate</label>
              <select 
                value={selectedCandidateId} 
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded p-2 text-xs focus:border-primary outline-none"
              >
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Job Description Reference</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="w-full h-40 bg-surface-container-low border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary resize-none leading-relaxed"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Center & Right: Skill Weights Adjustment & Live Recalculations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-outline-variant p-5 paper-trail-card space-y-6">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Interactive Skill Weights</h3>
                <p className="text-[10px] text-on-surface-variant">Set higher importance for critical requirements.</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-tertiary uppercase tracking-wider block">Lens AI Recalculated Score</span>
                <span className="font-mono text-2xl font-extrabold text-primary">{adjustedScore}%</span>
              </div>
            </div>

            <div className="space-y-4">
              {selectedJob?.requiredSkills.map(skill => {
                const isPossessed = selectedCandidate?.skills.includes(skill);
                const weight = skillWeights[skill] || 5;
                
                return (
                  <div key={skill} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-surface-container-low/40 border border-outline-variant rounded">
                    <div className="flex items-center gap-2.5 min-w-[200px]">
                      <span className={`material-symbols-outlined text-sm ${isPossessed ? 'text-primary' : 'text-outline-variant'}`}>
                        {isPossessed ? 'check_circle' : 'cancel'}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-on-surface">{skill}</p>
                        <p className="text-[9px] text-outline font-semibold uppercase">
                          {isPossessed ? 'Verified in dossier' : 'Missing from profile'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-[10px] text-outline font-bold">LOW</span>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={weight}
                        onChange={(e) => handleWeightChange(skill, e.target.value)}
                        className="flex-1 accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-outline font-bold">CRITICAL</span>
                      <span className="font-mono text-xs font-extrabold w-6 text-center text-primary">{weight}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gap Analysis Box */}
            <div className="p-4 bg-tertiary-container/5 border border-tertiary/20 rounded">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-tertiary mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary text-sm">psychology</span>
                Lens AI Real-time Recommendation
              </h4>
              <p className="text-xs text-on-surface leading-relaxed">
                {adjustedScore >= 85 
                  ? `Excellent fit. ${selectedCandidate?.name} possesses all highly weighted skills for the ${selectedJob?.title} role, supported by active Git verification.` 
                  : `${selectedCandidate?.name} is a strong candidate, but you have flagged missing skills (e.g., Kubernetes) as highly critical. We recommend setting up a custom assessment.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
