import React, { useState } from 'react';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (val.length > 0 && !val.includes('@')) {
      setErrorMsg('Please enter a valid corporate email address.');
    } else {
      setErrorMsg('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.length === 0 || password.length === 0) return;
    
    setIsValidating(true);
    
    // Simulate validation
    setTimeout(() => {
      setIsValidating(false);
      setIsSuccess(true);
      
      setTimeout(() => {
        onLoginSuccess();
      }, 1000);
    }, 1500);
  };

  const handleGoogleSSO = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/v1/auth/google/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const data = await response.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('Invalid URL returned');
      }
    } catch (err) {
      console.error('Google SSO Error:', err);
      // Fallback for development if backend server is not running
      onLoginSuccess();
    }
  };

  return (
    <div className="bg-background min-h-screen flex text-on-surface font-sans overflow-hidden">
      {/* Left Side: Illustration & Branding */}
      <section className="hidden lg:flex lg:w-1/2 bg-surface-container-lowest relative items-center justify-center p-8 border-r border-outline-variant">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #c3c6d7 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        </div>
        <div className="z-10 w-full max-w-lg space-y-6">
          <div className="space-y-1">
            <h1 className="font-extrabold text-h1 text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl font-bold">radar</span>
              HireLens
            </h1>
            <p className="font-bold text-xs text-outline uppercase tracking-wider">Enterprise Recruitment Intelligence</p>
          </div>

          {/* Dossier Visual Mock */}
          <div className="bg-white border border-outline-variant p-6 rounded-lg paper-stack shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                  <span className="font-bold text-xs text-on-surface">Candidate Dossier #8412</span>
                </div>
                <span className="bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight">AI Verified</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-medium">Match Integrity</span>
                  <span className="font-mono text-primary font-bold text-xs">98.4%</span>
                </div>
                <div className="flex gap-[2px] w-full">
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-primary flex-1"></div>
                  <div className="verification-bar-segment bg-outline-variant flex-1"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 bg-surface-container-low border border-outline-variant rounded flex items-center gap-2 text-[10px]">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">description</span>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-outline font-bold uppercase">Resume</span>
                    <span className="font-semibold">NLP Parsed</span>
                  </div>
                </div>
                <div className="p-2 bg-surface-container-low border border-outline-variant rounded flex items-center gap-2 text-[10px]">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">link</span>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-outline font-bold uppercase">LinkedIn</span>
                    <span className="font-semibold">Cross-Ref</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-w-sm">
            <h2 className="text-xl font-bold text-on-surface">Evidence-Based Hiring</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Every insight is anchored to a verified data point. No black boxes, just transparent, data-driven decisions for high-stakes recruitment.
            </p>
          </div>
        </div>
      </section>

      {/* Right Side: Form */}
      <section className="w-full lg:w-1/2 bg-surface flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl font-bold">radar</span>
            <span className="font-extrabold text-h2 text-primary tracking-tight">HireLens</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-on-surface">
              {isSignUp ? 'Create Enterprise Account' : 'Sign in to Enterprise'}
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {isSignUp 
                ? 'Join 500+ global enterprises using HireLens for intelligent sourcing.' 
                : 'Enter your corporate credentials to access the recruiter dashboard.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="email">Work Email</label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`w-full h-11 px-3 bg-surface border rounded focus:ring-1 transition-all text-xs outline-none ${
                    errorMsg ? 'border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'
                  }`}
                  placeholder="name@company.com"
                  required
                />
                {errorMsg && (
                  <span className="text-[10px] text-error mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    {errorMsg}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="password">Password</label>
                <a className="text-[10px] font-bold text-primary hover:underline" href="#">Forgot Password?</a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 bg-surface border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={isValidating || isSuccess}
                className={`w-full h-11 text-white font-bold rounded active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm text-xs ${
                  isSuccess 
                    ? 'bg-emerald-600' 
                    : isValidating 
                      ? 'bg-primary/70 cursor-not-allowed' 
                      : 'bg-primary hover:bg-primary-container'
                }`}
              >
                {isValidating ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Validating Credentials...
                  </>
                ) : isSuccess ? (
                  <>
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Access Granted
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? 'Get Started' : 'Sign In'}</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center py-2">
                <div className="border-t border-outline-variant w-full"></div>
                <span className="absolute bg-surface px-4 text-outline font-bold text-[9px] uppercase tracking-wider">Or Connect Via</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSSO}
                className="w-full h-11 border border-outline-variant bg-white text-on-surface text-xs font-semibold rounded hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                Sign In with SSO
              </button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-xs text-on-surface-variant">
              <span>{isSignUp ? 'Already have an account?' : 'New to HireLens?'}</span>
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-bold hover:underline ml-1"
              >
                {isSignUp ? 'Sign in instead' : 'Create an account'}
              </button>
            </p>
          </div>
        </div>

        {/* Legal Links */}
        <footer className="absolute bottom-4 right-6 flex gap-4 text-[10px] text-outline font-semibold">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
        </footer>
      </section>
    </div>
  );
}
