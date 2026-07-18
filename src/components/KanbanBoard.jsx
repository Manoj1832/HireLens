import React, { useState } from 'react';

const STAGES = ['Applied', 'Screened', 'Assessed', 'Interviewed', 'Offered', 'Hired'];

const stageColors = {
  Applied: { bg: 'bg-error-container/30', border: 'border-error/20', dot: 'bg-error' },
  Screened: { bg: 'bg-surface-container-high/50', border: 'border-outline-variant', dot: 'bg-outline' },
  Assessed: { bg: 'bg-primary/5', border: 'border-primary/20', dot: 'bg-primary' },
  Interviewed: { bg: 'bg-secondary-container/10', border: 'border-secondary/20', dot: 'bg-secondary' },
  Offered: { bg: 'bg-tertiary-container/10', border: 'border-tertiary/20', dot: 'bg-tertiary' },
  Hired: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

export default function KanbanBoard({ candidates, setCandidates, setSelectedCandidateId, setScreen }) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const handleDragStart = (e, candidateId) => {
    setDraggedId(candidateId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    if (draggedId) {
      setCandidates(prev =>
        prev.map(c => c.id === draggedId ? { ...c, stage: targetStage } : c)
      );
    }
    setDraggedId(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Candidate Pipeline</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Drag candidates between stages to update their recruitment status.</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-[10px] font-bold text-outline uppercase tracking-wider">{candidates.length} Total Candidates</span>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '65vh' }}>
        {STAGES.map((stage) => {
          const stageCandidates = candidates.filter(c => c.stage === stage);
          const colors = stageColors[stage];
          const isDragOver = dragOverStage === stage;

          return (
            <div
              key={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDrop={(e) => handleDrop(e, stage)}
              className={`flex-1 min-w-[220px] flex flex-col rounded border transition-all duration-200 ${
                isDragOver
                  ? `${colors.bg} ${colors.border} border-2 shadow-md scale-[1.01]`
                  : 'bg-surface-container-low/30 border-outline-variant/50'
              }`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-outline-variant/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface">{stage}</span>
                </div>
                <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {stageCandidates.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {stageCandidates.length === 0 ? (
                  <div className="text-center py-8 opacity-40">
                    <span className="material-symbols-outlined text-2xl text-outline">person_add</span>
                    <p className="text-[10px] text-outline mt-1">Drop here</p>
                  </div>
                ) : (
                  stageCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cand.id)}
                      onDragEnd={handleDragEnd}
                      className={`p-3 bg-white border border-outline-variant rounded cursor-grab hover:shadow-sm active:cursor-grabbing transition-all duration-150 group ${
                        draggedId === cand.id ? 'opacity-40 scale-95' : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {cand.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{cand.name}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">{cand.role}</p>
                        </div>
                      </div>

                      {/* ATS Score Bar */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-surface-container h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${cand.atsScore}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-primary">{cand.atsScore}%</span>
                      </div>

                      {/* Skills Tags */}
                      <div className="flex flex-wrap gap-1">
                        {cand.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="bg-surface-container-low text-on-surface-variant text-[9px] px-1.5 py-0.5 rounded font-medium">
                            {skill}
                          </span>
                        ))}
                        {cand.skills.length > 3 && (
                          <span className="text-[9px] text-outline font-medium">+{cand.skills.length - 3}</span>
                        )}
                      </div>

                      {/* Action Row (on hover) */}
                      <div className="mt-2 pt-2 border-t border-outline-variant/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedCandidateId(cand.id);
                            setScreen('candidate-details');
                          }}
                          className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">open_in_new</span>
                          Open Dossier
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
