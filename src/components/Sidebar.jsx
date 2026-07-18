import React from 'react';

export default function Sidebar({ currentScreen, setScreen, unreadCount, isRecruiterView, toggleRoleView }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'kanban', label: 'Candidate Pipeline', icon: 'view_kanban' },
    { id: 'comparison', label: 'Candidate Comparison', icon: 'compare_arrows' },
    { id: 'jd-matching', label: 'JD Match & Gap', icon: 'rule' },
    { id: 'resume-upload', label: 'Resume Upload & OCR', icon: 'cloud_upload' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'bar_chart' },
  ];

  return (
    <aside className="w-[260px] h-screen fixed left-0 top-0 flex flex-col py-6 border-r border-outline-variant bg-surface z-50">
      <div className="px-6 mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-sans text-h2 font-extrabold text-primary flex items-center gap-1.5 leading-none">
            <span className="material-symbols-outlined text-primary font-bold">radar</span>
            HireLens
          </h1>
          <p className="text-on-surface-variant font-medium text-[10px] uppercase tracking-wider mt-1">Enterprise Suite</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = currentScreen === item.id || 
            (item.id === 'dashboard' && currentScreen === 'candidate-details') ||
            (item.id === 'dashboard' && currentScreen === 'resume-analysis') ||
            (item.id === 'dashboard' && currentScreen === 'evaluation-report');
          return (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`w-full flex items-center px-6 py-3 text-body-sm font-medium border-r-4 transition-all duration-200 group text-left ${
                isActive
                  ? 'text-primary font-bold border-primary bg-surface-container-low'
                  : 'text-on-surface-variant border-transparent hover:bg-surface-container-low/50 hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined mr-3 transition-colors ${
                isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
              }`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              
              {item.id === 'dashboard' && unreadCount > 0 && (
                <span className="ml-auto bg-error text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 px-6 border-t border-outline-variant/60 mt-4">
          <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">Internal Testing</p>
          
          <button 
            onClick={toggleRoleView}
            className="w-full flex items-center justify-between p-2 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all text-xs font-semibold"
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">switch_account</span>
              {isRecruiterView ? 'Go to Candidate Portal' : 'Go to Recruiter Portal'}
            </span>
          </button>
        </div>
      </nav>

      <div className="px-6 mt-auto">
        <div className="p-3 bg-surface-container-low border border-outline-variant rounded flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-on-surface">Lens AI System Status</span>
          </div>
          <p className="text-[10px] text-on-surface-variant">Model: Gemini 3.5 Flash</p>
        </div>
      </div>
    </aside>
  );
}
