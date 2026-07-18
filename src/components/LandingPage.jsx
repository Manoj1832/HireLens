import React from 'react';

export default function LandingPage({ onEnterPortal }) {
  return (
    <div className="bg-background min-h-screen text-on-surface flex flex-col font-sans overflow-x-hidden">
      {/* Landing Header */}
      <header className="max-w-[1440px] w-full mx-auto px-8 md:px-16 h-20 flex justify-between items-center border-b border-outline-variant/60 bg-surface/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary font-bold text-3xl">radar</span>
          <span className="text-xl font-extrabold text-primary tracking-tight">HireLens</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={onEnterPortal}
            className="px-5 py-2 bg-primary text-white font-bold rounded hover:bg-primary-container active:scale-[0.98] transition-all text-xs"
          >
            Access Portal
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-8 md:px-16 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <span className="bg-tertiary-container/10 border border-tertiary-container/30 text-tertiary text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            Evidence-Based Enterprise Recruitment
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-on-surface tracking-tight leading-[1.1] font-sans">
            Recruitment verified by <span className="text-primary">evidence</span>, not promises.
          </h1>
          <p className="text-on-surface-variant text-md md:text-lg leading-relaxed max-w-lg">
            An authoritative, transparent screening system that anchors AI insights to source documents. No black boxes. Just verified code, portfolios, and assessments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={onEnterPortal}
              className="px-8 py-3.5 bg-primary text-white font-bold rounded hover:bg-primary-container active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              Sign In to Enterprise Portal
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
            <button 
              onClick={onEnterPortal}
              className="px-8 py-3.5 border border-outline-variant hover:bg-surface-container-low transition-all text-sm font-semibold rounded"
            >
              View Developer Demo
            </button>
          </div>
        </div>

        {/* Hero Visual Block */}
        <div className="relative flex justify-center">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #c3c6d7 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
          </div>
          
          <div className="bg-white border border-outline-variant p-6 rounded-lg paper-stack shadow-lg max-w-md w-full z-10 transition-transform hover:scale-[1.02] duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                  <span className="font-bold text-xs">Verify Candidate Match Integrity</span>
                </div>
                <span className="bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded text-[10px] font-bold uppercase">AI Evaluated</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">Candidate Score</span>
                  <span className="font-mono text-primary font-bold text-sm">94.8%</span>
                </div>
                {/* Segmented Verification Bar */}
                <div className="flex gap-[2px] w-full">
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-outline-variant flex-1"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2.5 bg-surface-container-low border border-outline-variant rounded flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">description</span>
                  <div className="flex flex-col text-[10px]">
                    <span className="text-outline font-bold uppercase text-[8px]">Resume</span>
                    <span className="font-semibold text-on-surface">NLP Verified</span>
                  </div>
                </div>
                <div className="p-2.5 bg-surface-container-low border border-outline-variant rounded flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">link</span>
                  <div className="flex flex-col text-[10px]">
                    <span className="text-outline font-bold uppercase text-[8px]">LinkedIn</span>
                    <span className="font-semibold text-on-surface">Verified Profile</span>
                  </div>
                </div>
                <div className="p-2.5 bg-surface-container-low border border-outline-variant rounded flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">code</span>
                  <div className="flex flex-col text-[10px]">
                    <span className="text-outline font-bold uppercase text-[8px]">GitHub</span>
                    <span className="font-semibold text-on-surface">Repo Match</span>
                  </div>
                </div>
                <div className="p-2.5 bg-surface-container-low border border-outline-variant rounded flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">gavel</span>
                  <div className="flex flex-col text-[10px]">
                    <span className="text-outline font-bold uppercase text-[8px]">Proctoring</span>
                    <span className="font-semibold text-on-surface">0 Flags Raised</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Trust Grid */}
      <section className="bg-surface border-y border-outline-variant/60 py-12">
        <div className="max-w-[1440px] w-full mx-auto px-8 md:px-16 text-center">
          <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-6">Empowering high-stakes recruitment teams globally</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center opacity-60">
            <span className="text-lg font-bold font-mono tracking-tight text-on-surface-variant">ACME TECH</span>
            <span className="text-lg font-bold font-mono tracking-tight text-on-surface-variant">GLOBAL CORP</span>
            <span className="text-lg font-bold font-mono tracking-tight text-on-surface-variant">HEXA CORP</span>
            <span className="text-lg font-bold font-mono tracking-tight text-on-surface-variant">APEX SOLUTIONS</span>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="max-w-[1440px] w-full mx-auto px-8 md:px-16 py-16 md:py-24 space-y-16">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Recruiter-driven AI analysis.</h2>
          <p className="text-on-surface-variant text-sm">We provide an audit trail for every automated evaluation point, building trust between talent and hiring teams.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white border border-outline-variant paper-trail-card">
            <span className="material-symbols-outlined text-primary text-3xl mb-4">gavel</span>
            <h3 className="text-lg font-bold mb-2">Simulated Proctoring Integrity</h3>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Verify screen sharing, webcam feeds, and window blur flags in real-time, preventing cheating on online assessments.
            </p>
          </div>
          <div className="p-6 bg-white border border-outline-variant paper-trail-card">
            <span className="material-symbols-outlined text-primary text-3xl mb-4">compare</span>
            <h3 className="text-lg font-bold mb-2">Side-by-Side Comparison</h3>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Compare candidate skill grids, credentials, and verification points side-by-side using high-density visualization matrices.
            </p>
          </div>
          <div className="p-6 bg-white border border-outline-variant paper-trail-card">
            <span className="material-symbols-outlined text-primary text-3xl mb-4">rule</span>
            <h3 className="text-lg font-bold mb-2">Adjustable JD Skill Weights</h3>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Dynamically refine skills importance on a JD and watch candidate Match Integrity scores adjust instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-outline-variant/60 py-8 bg-surface-container-low">
        <div className="max-w-[1440px] w-full mx-auto px-8 md:px-16 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-outline font-semibold">
          <p>© 2026 HireLens Enterprise. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Standards</a>
            <a href="#" className="hover:text-primary transition-colors">Compliance Shield</a>
            <a href="#" className="hover:text-primary transition-colors">SOC2 Audits</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
