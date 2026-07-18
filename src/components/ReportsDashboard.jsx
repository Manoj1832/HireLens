import React, { useState } from 'react';

export default function ReportsDashboard() {
  const [timeRange, setTimeRange] = useState('Quarter');

  const metrics = [
    { label: 'Avg Time-To-Hire', val: '18 Days', desc: '-4 days from Q2 baseline', icon: 'speed', change: 'good' },
    { label: 'Interview Load', val: '4.2 hrs/wk', desc: 'Per interviewer avg', icon: 'hourglass_empty', change: 'neutral' },
    { label: 'Pass-through Ratio', val: '24%', desc: 'Assessed to Interview stage', icon: 'trending_up', change: 'good' },
    { label: 'Proctoring Risk Rate', val: '1.2%', desc: 'Total assessments flagged', icon: 'gavel', change: 'good' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Reports & Analytics</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">High-density recruitment velocity metrics and proctoring integrity analytics.</p>
        </div>
        <div className="flex gap-1.5 bg-surface-container-low border border-outline-variant p-1 rounded">
          {['Month', 'Quarter', 'Year'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                timeRange === range ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, idx) => (
          <div key={idx} className="bg-white border border-outline-variant p-4 paper-trail-card">
            <div className="flex justify-between items-start mb-2">
              <span className="text-on-surface-variant font-bold text-[10px] tracking-wider uppercase">{m.label}</span>
              <span className="text-primary material-symbols-outlined text-lg">{m.icon}</span>
            </div>
            <p className="text-2xl font-extrabold text-on-surface">{m.val}</p>
            <p className="text-[10px] text-on-surface-variant font-medium mt-1">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Visual Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruitment Velocity Timeline */}
        <div className="bg-white border border-outline-variant p-5 paper-trail-card space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-sm">timeline</span>
            Recruitment Velocity (Time-to-Hire Trend)
          </h3>
          <div className="h-60 w-full flex items-end justify-between pt-6 border-b border-l border-outline-variant/60 px-4">
            {[
              { label: 'May', val: 75, limit: '26 days' },
              { label: 'Jun', val: 65, limit: '24 days' },
              { label: 'Jul', val: 55, limit: '21 days' },
              { label: 'Aug', val: 48, limit: '19 days' },
              { label: 'Sep', val: 42, limit: '18 days' },
              { label: 'Oct', val: 40, limit: '18 days' }
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <span className="text-[9px] font-mono font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.limit}
                </span>
                <div 
                  className="bg-primary/20 hover:bg-primary border border-primary/40 w-8 rounded-t transition-all duration-500" 
                  style={{ height: `${bar.val}%` }}
                ></div>
                <span className="text-[10px] text-on-surface-variant font-bold mt-1">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Proctoring Audits & Integrity Flag Distribution */}
        <div className="bg-white border border-outline-variant p-5 paper-trail-card space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-sm">gavel</span>
            Assessment Integrity & Proctoring Incidents
          </h3>
          
          <div className="space-y-4 pt-4">
            {[
              { type: 'Tab Blur (Window Switching)', count: 24, percent: 65, color: 'bg-primary' },
              { type: 'Acoustic Activity (External Speaking)', count: 9, percent: 25, color: 'bg-tertiary' },
              { type: 'Camera Occlusion (Webcam Blocked)', count: 3, percent: 10, color: 'bg-error' }
            ].map((flag, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-on-surface truncate">{flag.type}</span>
                  <span className="text-on-surface-variant font-mono">{flag.count} Incidents ({flag.percent}%)</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className={`${flag.color} h-full rounded-full`} style={{ width: `${flag.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-surface-container-low border border-outline-variant rounded flex items-center gap-3 mt-6 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-primary">security</span>
            <p className="leading-relaxed">
              Assessment proctoring utilizes behavioral analysis to verify candidate code submissions. All flagged segments contain audio/visual timestamps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
