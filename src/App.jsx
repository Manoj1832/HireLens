import React, { useState } from 'react';

// Import local components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RecruiterDashboard from './components/RecruiterDashboard';
import KanbanBoard from './components/KanbanBoard';
import CandidateComparison from './components/CandidateComparison';
import JDMatching from './components/JDMatching';
import ResumeUpload from './components/ResumeUpload';
import ReportsDashboard from './components/ReportsDashboard';
import CandidateDetails from './components/CandidateDetails';

// Candidate Portal Views
import CandidateDashboardView from './components/CandidateDashboardView';
import AssessmentSetup from './components/AssessmentSetup';
import CodingAssessment from './components/CodingAssessment';

// Mock Data
import {
  initialCandidates,
  initialJobs,
  initialAgenda,
  initialAiInsights,
  initialProctoringAlerts
} from './mockData';

export default function App() {
  // Application Views & Navigation Routing
  // Screens: 'landing', 'login', 'dashboard', 'kanban', 'comparison', 'jd-matching', 'resume-upload', 'reports', 'candidate-details'
  const [currentScreen, setScreen] = useState('landing');
  const [isRecruiterView, setIsRecruiterView] = useState(true);

  // Global State
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedCandidateId, setSelectedCandidateId] = useState('cand-1');
  const [searchVal, setSearchVal] = useState('');
  const [alerts, setAlerts] = useState(initialProctoringAlerts);
  const [agenda, setAgenda] = useState(initialAgenda);
  const [insights, setInsights] = useState(initialAiInsights);

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId) || candidates[0];

  // OAuth Redirect Callback Handler
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('accessToken');
    const oauthRefresh = params.get('refreshToken');
    const oauthRole = params.get('role');

    if (oauthToken && oauthRefresh) {
      localStorage.setItem('accessToken', oauthToken);
      localStorage.setItem('refreshToken', oauthRefresh);
      
      // Clean query params from address bar
      window.history.replaceState({}, document.title, window.location.pathname);

      if (oauthRole === 'CANDIDATE') {
        setIsRecruiterView(false);
        setScreen('candidate-portal-dashboard');
      } else {
        setIsRecruiterView(true);
        setScreen('dashboard');
      }
    }
  }, []);

  // Semantic Search Backend Integration
  React.useEffect(() => {
    if (!searchVal.trim()) {
      setCandidates(initialCandidates);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/v1/search?query=${encodeURIComponent(searchVal)}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const resJson = await response.json();
        if (resJson.success && resJson.data && resJson.data.length > 0) {
          const mapped = resJson.data.map((c) => ({
            id: c.candidateId,
            name: c.name,
            initials: c.name.split(' ').map((n) => n[0]).join(''),
            location: 'Remote',
            role: 'Candidate (AI Match)',
            email: c.email || 'no-email@hirelens.test',
            phone: '+1 (555) 019-2831',
            appliedDate: 'Today',
            stage: 'Assessed',
            atsScore: c.atsResult?.atsScore || Math.round(c.score * 100),
            avatar: '',
            skills: c.skills,
            matchDetails: {
              matchPercent: c.atsResult?.atsScore || Math.round(c.score * 100),
              verifiedPoints: [
                { label: 'Resume NLP Parsed', status: 'verified', source: 'Parsed Resume' },
                { label: 'Ollama Embedding Match', status: 'verified', source: `Vector Sim Score: ${c.score.toFixed(2)}` }
              ],
              gaps: c.atsResult?.missingKeywords || [],
              strengths: c.atsResult?.suggestions || []
            },
            codeAssessment: {
              status: 'Passed',
              score: `${c.atsResult?.atsScore || 90}%`,
              date: 'Today',
              tabSwitches: 0,
              warnings: 0,
              codeWritten: '// Live candidate submission',
              testCases: []
            },
            proctoringLogs: [],
            interviewEvaluation: null,
            timeline: []
          }));
          setCandidates(mapped);
        } else {
          setCandidates([]);
        }
      } catch (err) {
        console.warn('Backend search offline or failed, falling back to local mock filter.', err);
        // Fall back to local search filtering
        const query = searchVal.toLowerCase();
        const filtered = initialCandidates.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.role.toLowerCase().includes(query) ||
            c.skills.some((s) => s.toLowerCase().includes(query))
        );
        setCandidates(filtered);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchVal]);

  // Handlers
  const handleLoginSuccess = () => {
    if (isRecruiterView) {
      setScreen('dashboard');
    } else {
      setScreen('candidate-portal-dashboard');
    }
  };

  const toggleRoleView = () => {
    const nextViewIsRecruiter = !isRecruiterView;
    setIsRecruiterView(nextViewIsRecruiter);
    setScreen(nextViewIsRecruiter ? 'dashboard' : 'candidate-portal-dashboard');
  };

  const handleCandidateAdd = (newCand) => {
    setCandidates(prev => [newCand, ...prev]);
  };

  const handleRaiseProctoringAlert = (alertData) => {
    const newAlert = {
      id: `alert-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      candidate: 'Sarah Chen (Simulated)',
      type: alertData.type,
      details: alertData.details,
      status: 'unread',
      severity: 'medium'
    };
    setAlerts(prev => [newAlert, ...prev]);

    // Update proctoring logs of Sarah Chen (or selected candidate)
    setCandidates(prev => 
      prev.map(c => 
        c.name === 'Sarah Chen' 
          ? {
              ...c,
              proctoringLogs: [
                { timestamp: newAlert.time, type: 'warning', message: alertData.details },
                ...c.proctoringLogs
              ],
              codeAssessment: c.codeAssessment 
                ? { ...c.codeAssessment, tabSwitches: c.codeAssessment.tabSwitches + 1 }
                : null
            }
          : c
      )
    );
  };

  const handleFinishAssessment = (assessmentResult) => {
    // Update candidate Sarah Chen's status and assessment results
    setCandidates(prev =>
      prev.map(c =>
        c.name === 'Sarah Chen'
          ? {
              ...c,
              stage: 'Assessed',
              codeAssessment: {
                status: 'Passed',
                score: '100%',
                date: 'Today',
                tabSwitches: assessmentResult.tabSwitches,
                warnings: assessmentResult.tabSwitches,
                codeWritten: assessmentResult.codeWritten,
                testCases: assessmentResult.testCases
              }
            }
          : c
      )
    );
    setScreen('candidate-portal-dashboard');
  };

  const handleNotificationsClick = () => {
    // Clear unread statuses
    setAlerts(prev => prev.map(a => ({ ...a, status: 'read' })));
    setScreen('dashboard');
  };

  // ----------------------------------------------------
  // Perspective 1: Landing Page
  // ----------------------------------------------------
  if (currentScreen === 'landing') {
    return <LandingPage onEnterPortal={() => setScreen('login')} />;
  }

  // ----------------------------------------------------
  // Perspective 2: Login Page
  // ----------------------------------------------------
  if (currentScreen === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // ----------------------------------------------------
  // Perspective 3: Candidate Portal View
  // ----------------------------------------------------
  if (!isRecruiterView) {
    if (currentScreen === 'candidate-portal-dashboard') {
      return (
        <CandidateDashboardView 
          onEnterAssessment={() => setScreen('assessment-setup')}
          onLogout={() => setScreen('landing')}
        />
      );
    }
    if (currentScreen === 'assessment-setup') {
      return (
        <AssessmentSetup 
          candidateName="Sarah Chen"
          onStartExam={() => setScreen('coding-assessment')}
        />
      );
    }
    if (currentScreen === 'coding-assessment') {
      return (
        <CodingAssessment 
          onFinish={handleFinishAssessment}
          onRaiseProctoringAlert={handleRaiseProctoringAlert}
        />
      );
    }
  }

  // ----------------------------------------------------
  // Perspective 4: Recruiter Dashboard Suite
  // ----------------------------------------------------
  const unreadAlertsCount = alerts.filter(a => a.status === 'unread').length;

  return (
    <div className="flex bg-background min-h-screen text-on-surface font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentScreen={currentScreen} 
        setScreen={setScreen} 
        unreadCount={unreadAlertsCount}
        isRecruiterView={isRecruiterView}
        toggleRoleView={toggleRoleView}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          searchVal={searchVal}
          setSearchVal={setSearchVal}
          alerts={alerts}
          onNotificationsClick={handleNotificationsClick}
          setScreen={setScreen}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1440px] w-full mx-auto ml-[260px] max-w-[calc(1440px-260px)]">
          {currentScreen === 'dashboard' && (
            <RecruiterDashboard 
              candidates={candidates}
              jobs={initialJobs}
              agenda={agenda}
              insights={insights}
              searchVal={searchVal}
              setSelectedCandidateId={setSelectedCandidateId}
              setScreen={setScreen}
            />
          )}

          {currentScreen === 'kanban' && (
            <KanbanBoard 
              candidates={candidates}
              setCandidates={setCandidates}
              setSelectedCandidateId={setSelectedCandidateId}
              setScreen={setScreen}
            />
          )}

          {currentScreen === 'comparison' && (
            <CandidateComparison 
              candidates={candidates}
            />
          )}

          {currentScreen === 'jd-matching' && (
            <JDMatching 
              candidates={candidates}
              jobs={initialJobs}
            />
          )}

          {currentScreen === 'resume-upload' && (
            <ResumeUpload 
              onCandidateAdd={handleCandidateAdd}
            />
          )}

          {currentScreen === 'reports' && (
            <ReportsDashboard />
          )}

          {currentScreen === 'candidate-details' && (
            <CandidateDetails 
              candidate={selectedCandidate}
              onBack={() => setScreen('dashboard')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
