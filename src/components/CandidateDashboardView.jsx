import React from 'react';

export default function CandidateDashboardView({ onEnterAssessment, onLogout }) {
  const invitations = [
    {
      id: 'inv-1',
      jobTitle: 'Senior Backend Engineer',
      company: 'HireLens Enterprise Dev Group',
      duration: '45 mins',
      dueDate: 'Oct 28, 2026',
      status: 'Ready to Start'
    }
  ];

  const completed = [
    {
      jobTitle: 'Product Designer',
      company: 'Acme Systems',
      completedDate: 'Oct 20, 2026',
      status: 'Evaluated'
    }
  ];

  return (
    <div className="bg-background min-h-screen text-on-surface flex flex-col font-sans">
      <header className="max-w-[1440px] w-full mx-auto px-8 h-16 flex justify-between items-center border-b border-outline-variant bg-surface sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary font-bold text-2xl">radar</span>
          <span className="text-lg font-extrabold text-primary tracking-tight">HireLens Candidate Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-on-surface-variant font-medium">Testing Candidate Profile</span>
          <button 
            onClick={onLogout}
            className="px-3 py-1.5 border border-outline-variant hover:bg-surface-container rounded text-xs font-semibold"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-8 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome, Candidate Workspace</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Access active assessment invites, review diagnostics, and check application status.</p>
        </div>

        {/* Active Invites */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Active Assessments</h2>
          
          {invitations.map(inv => (
            <div key={inv.id} className="bg-white border border-outline-variant p-5 rounded-lg paper-stack flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
              <div className="space-y-1">
                <span className="bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Ready</span>
                <h3 className="text-sm font-bold text-on-surface mt-1">{inv.jobTitle}</h3>
                <p className="text-[11px] text-on-surface-variant">{inv.company} • Dur: {inv.duration}</p>
                <p className="text-[10px] text-outline">Complete by: {inv.dueDate}</p>
              </div>
              <button
                onClick={onEnterAssessment}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded text-xs hover:bg-primary-container active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>Access Test Room</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          ))}
        </section>

        {/* Completed Assessments */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Completed Applications</h2>
          
          <div className="bg-white border border-outline-variant rounded-lg overflow-hidden">
            {completed.map((comp, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center text-xs">
                <div>
                  <h3 className="font-bold text-on-surface">{comp.jobTitle}</h3>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{comp.company} • Submitted: {comp.completedDate}</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  {comp.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
