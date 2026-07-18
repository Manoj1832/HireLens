import React from 'react';

export default function RecruiterDashboard({ 
  candidates, 
  agenda, 
  insights, 
  searchVal, 
  setSelectedCandidateId, 
  setScreen,
  jobs
}) {
  
  // Funnel calculations based on candidate stages
  const funnelStages = [
    { label: 'Applied', count: candidates.filter(c => ['Applied', 'Screened', 'Assessed', 'Interviewed', 'Offered', 'Hired'].includes(c.stage)).length + 1478, color: 'bg-primary' },
    { label: 'Screened', count: candidates.filter(c => ['Screened', 'Assessed', 'Interviewed', 'Offered', 'Hired'].includes(c.stage)).length + 856, color: 'bg-primary/80' },
    { label: 'Assessed', count: candidates.filter(c => ['Assessed', 'Interviewed', 'Offered', 'Hired'].includes(c.stage)).length + 341, color: 'bg-primary/60' },
    { label: 'Interviewed', count: candidates.filter(c => ['Interviewed', 'Offered', 'Hired'].includes(c.stage)).length + 155, color: 'bg-primary/40' },
    { label: 'Offered', count: candidates.filter(c => ['Offered', 'Hired'].includes(c.stage)).length + 22, color: 'bg-primary/20' },
    { label: 'Hired', count: candidates.filter(c => c.stage === 'Hired').length + 16, color: 'bg-secondary' }
  ];

  // Filtering candidates by search value
  const filteredCandidates = candidates.filter((c) => {
    const query = searchVal.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query) ||
      c.location.toLowerCase().includes(query) ||
      c.skills.some((s) => s.toLowerCase().includes(query))
    );
  });

  const getStageBadgeClass = (stage) => {
    switch (stage) {
      case 'Applied': return 'bg-error-container text-on-error-container';
      case 'Screened': return 'bg-surface-container-high text-on-surface-variant';
      case 'Assessed': return 'bg-primary/10 text-primary';
      case 'Interviewed': return 'bg-secondary-container/20 text-on-secondary-container';
      case 'Offered': return 'bg-tertiary-container/20 text-tertiary';
      case 'Hired': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Open Jobs */}
        <div className="bg-white border border-outline-variant p-4 paper-trail-card">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant font-bold text-[10px] tracking-wider uppercase">Open Jobs</span>
            <span className="text-primary material-symbols-outlined text-lg">work</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{jobs.length}</span>
            <span className="text-secondary text-[11px] font-medium">+2 this week</span>
          </div>
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full text-secondary stroke-current fill-none" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path d="M0,15 Q10,10 20,12 T40,5 T60,18 T80,8 T100,10" strokeLinecap="round" strokeWidth="2"></path>
            </svg>
          </div>
        </div>

        {/* Total Candidates */}
        <div className="bg-white border border-outline-variant p-4 paper-trail-card">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant font-bold text-[10px] tracking-wider uppercase">Total Candidates</span>
            <span className="text-primary material-symbols-outlined text-lg">groups</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{1482 + candidates.length - 4}</span>
            <span className="text-secondary text-[11px] font-medium">+12% vs last month</span>
          </div>
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full text-primary stroke-current fill-none" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path d="M0,18 L10,15 L20,16 L30,12 L40,14 L50,8 L60,10 L70,5 L80,7 L90,2 L100,4" strokeLinecap="round" strokeWidth="2"></path>
            </svg>
          </div>
        </div>

        {/* Shortlisted */}
        <div className="bg-white border border-outline-variant p-4 paper-trail-card">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant font-bold text-[10px] tracking-wider uppercase">Shortlisted</span>
            <span className="text-primary material-symbols-outlined text-lg">star</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">156</span>
            <span className="text-on-surface-variant text-[11px] font-medium">8.2% conversion</span>
          </div>
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full text-tertiary stroke-current fill-none" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path d="M0,10 L20,8 L40,12 L60,10 L80,11 L100,9" strokeLinecap="round" strokeWidth="2"></path>
            </svg>
          </div>
        </div>

        {/* Today's Interviews */}
        <div className="bg-white border border-outline-variant p-4 paper-trail-card">
          <div className="flex justify-between items-start mb-2">
            <span className="text-on-surface-variant font-bold text-[10px] tracking-wider uppercase">Interviews</span>
            <span className="text-primary material-symbols-outlined text-lg">event</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{agenda.filter(a => a.time !== '3:00 PM').length}</span>
            <span className="text-error text-[11px] font-medium">Scheduled today</span>
          </div>
          <div className="mt-3 h-8 w-full">
            <svg className="w-full h-full text-error stroke-current fill-none" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path d="M0,5 L25,18 L50,15 L75,19 L100,10" strokeLinecap="round" strokeWidth="2"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Hiring Funnel Overview */}
      <section className="bg-white border border-outline-variant p-5 paper-trail-card overflow-x-auto">
        <h2 className="text-sm font-bold mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">filter_list</span>
          Recruitment Funnel Overview
        </h2>
        <div className="flex min-w-[800px] py-2">
          {funnelStages.map((stage, idx) => {
            const isLast = idx === funnelStages.length - 1;
            const currentCount = stage.count;
            const nextCount = isLast ? null : funnelStages[idx + 1].count;
            const percentDrop = isLast ? null : Math.round(((currentCount - nextCount) / currentCount) * 100);
            
            return (
              <div key={stage.label} className="flex-1 flex flex-col items-center relative">
                <div className={`${stage.color} h-2.5 w-full mb-3 rounded-full`}></div>
                <p className="font-extrabold text-xs text-on-surface">{currentCount.toLocaleString()}</p>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{stage.label}</p>
                {!isLast && (
                  <div className="absolute -right-5 top-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                    <span className="bg-white border border-outline-variant px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-error">
                      -{percentDrop}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Two Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Candidates list */}
        <div className="lg:col-span-2 bg-white border border-outline-variant paper-trail-card">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h2 className="text-sm font-bold text-on-surface">Recent Candidates</h2>
            <button 
              onClick={() => setScreen('kanban')}
              className="text-primary text-xs font-bold hover:underline"
            >
              View Pipeline
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider border-b border-outline-variant bg-surface-container-low/30">
                  <th className="px-5 py-3">Candidate Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">ATS Match</th>
                  <th className="px-5 py-3">Stage</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredCandidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {cand.initials}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-on-surface">{cand.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{cand.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium text-on-surface">{cand.role}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/5 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">
                          {cand.atsScore}%
                        </span>
                        <div className="flex gap-[2px]">
                          {cand.matchDetails?.verifiedPoints.map((point, pIdx) => (
                            <div 
                              key={pIdx}
                              title={point.label}
                              className={`verification-bar-segment w-2 h-1.5 ${
                                point.status === 'verified' ? 'bg-primary' : 'bg-outline-variant'
                              }`}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStageBadgeClass(cand.stage)}`}>
                        {cand.stage}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedCandidateId(cand.id);
                          setScreen('candidate-details');
                        }}
                        className="text-primary hover:text-primary-container text-xs font-bold hover:underline"
                      >
                        Open dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Agenda & AI insights */}
        <div className="space-y-6">
          {/* Today's Agenda */}
          <div className="bg-white border border-outline-variant paper-trail-card">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h2 className="text-sm font-bold text-on-surface">Today's Agenda</h2>
              <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">Oct 24</span>
            </div>
            <div className="p-4 space-y-4">
              {agenda.map((event, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[10px] font-bold text-on-surface-variant">{event.time}</span>
                    {idx < agenda.length - 1 && (
                      <div className="w-[1px] h-full bg-outline-variant/60 my-1"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="p-2.5 bg-surface-container-low border border-outline-variant rounded">
                      <p className="font-bold text-xs leading-none text-on-surface">{event.candidate}</p>
                      <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">
                        {event.type} • {event.duration}
                      </p>
                      <p className="text-[9px] text-outline mt-0.5">{event.details}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights Panel */}
          <div className="bg-tertiary-container text-white p-5 paper-trail-card border-none">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-white text-xl fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <h2 className="text-sm font-extrabold text-white">Lens AI Insights</h2>
            </div>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className="bg-white/10 p-3 border border-white/20 rounded">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/80">{insight.title}</p>
                    <span className="material-symbols-outlined text-white/80 text-sm">{insight.icon}</span>
                  </div>
                  <p className="text-[10px] font-bold text-white/95">{insight.subtitle}</p>
                  <p className="text-[11px] leading-snug text-white/90 mt-1">{insight.text}</p>
                </div>
              ))}
              <button 
                onClick={() => setScreen('reports')}
                className="w-full bg-white text-tertiary font-bold py-2 rounded text-xs hover:bg-opacity-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>View Full Reports</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
