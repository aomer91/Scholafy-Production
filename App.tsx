
import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { ViewState } from './types';
import { ParentDashboard } from './pages/ParentDashboard';
import { ChildDashboard } from './pages/ChildDashboard';
import { Player } from './components/Player';
import { LandingPage } from './pages/LandingPage';
import { isSupabaseConfigured } from './lib/supabase';
import { Auth } from './components/Auth';
import { useAuth } from './context/AuthContext';

// --- DATABASE CONFIG OVERLAY ---
const ConfigOverlay: React.FC = () => (
  <div className="fixed inset-0 z-[9999] bg-scholafy-navy/95 backdrop-blur-xl flex items-center justify-center p-6">
    <div className="bg-scholafy-card border-2 border-scholafy-accent rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
      <div className="text-6xl mb-6">🔌</div>
      <h2 className="text-2xl font-bold mb-4">Database Connection Required</h2>
      <p className="text-scholafy-muted mb-6 leading-relaxed">
        To enable cloud sync and parent monitoring, you need to connect your Supabase project.
      </p>
      <div className="bg-black/20 rounded-xl p-4 text-left text-xs font-mono mb-6 border border-white/10">
        <ol className="list-decimal list-inside space-y-2 text-white/70">
          <li>Create a project at <a href="https://supabase.com" target="_blank" className="text-scholafy-accent underline">supabase.com</a></li>
          <li>Run the SQL script provided in the instructions</li>
          <li>Copy your <strong>URL</strong> and <strong>Anon Key</strong></li>
          <li>Paste them into <code className="text-blue-400">lib/supabase.ts</code></li>
        </ol>
      </div>
      <p className="text-[10px] text-scholafy-muted uppercase tracking-widest animate-pulse">Waiting for valid credentials...</p>
    </div>
  </div>
);

// --- PIN PAD ---
const PinPad: React.FC<{
  targetName: string;
  onSuccess: () => void;
  onBack: () => void;
  correctPin: string;
}> = ({ targetName, onSuccess, onBack, correctPin }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        setTimeout(onSuccess, 300);
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 500);
      }
    }
  }, [pin, correctPin, onSuccess]);

  const handleNum = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="w-full max-w-sm md:max-w-md animate-in fade-in zoom-in duration-300 flex flex-col items-center">
      <div className="text-center mb-6 md:mb-8">
        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-4 border border-white/10 shadow-lg">
          {targetName === 'Parent' ? '🔒' : '👋'}
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Hello, {targetName}</h2>
        <p className="text-scholafy-muted text-xs md:text-sm">Enter your 4-digit access PIN</p>
      </div>

      <div className={`flex gap-4 mb-8 md:mb-10 ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-300 ${i < pin.length ? (error ? 'bg-red-500 scale-110' : 'bg-scholafy-accent scale-110') : 'bg-white/20'}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 md:gap-6 w-full px-4 md:px-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleNum(num.toString())}
            className="h-14 w-14 md:h-16 md:w-16 mx-auto rounded-full bg-white/5 hover:bg-white/15 border border-white/5 hover:border-white/20 text-lg md:text-xl font-medium transition-all active:scale-95 flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div className="flex items-center justify-center">
          <button onClick={onBack} className="text-xs md:text-sm font-medium text-scholafy-muted hover:text-white uppercase tracking-wider">Back</button>
        </div>
        <button
          onClick={() => handleNum("0")}
          className="h-14 w-14 md:h-16 md:w-16 mx-auto rounded-full bg-white/5 hover:bg-white/15 border border-white/5 hover:border-white/20 text-lg md:text-xl font-medium transition-all active:scale-95 flex items-center justify-center"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-14 w-14 md:h-16 md:w-16 mx-auto rounded-full flex items-center justify-center text-scholafy-muted hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
        </button>
      </div>
    </div>
  );
};

// --- AUTH SCREEN ---
const AuthScreen: React.FC = () => {
  const { setView } = useApp();
  const [step, setStep] = useState<'select' | 'auth'>('select');
  const [selectedRole, setSelectedRole] = useState<{ name: string, view: ViewState, pin: string } | null>(null);

  const handleSelect = (name: string, view: ViewState, pin: string) => {
    setSelectedRole({ name, view, pin });
    setStep('auth');
  };

  const handleAuthSuccess = () => {
    if (selectedRole) {
      setView(selectedRole.view);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1527] relative overflow-hidden flex flex-col items-center justify-center font-sans text-white selection:bg-scholafy-accent selection:text-scholafy-panel">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-scholafy-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-6 left-6 z-20 flex gap-4">
        <button onClick={() => setView(ViewState.LANDING)} className="flex items-center gap-2 text-scholafy-muted hover:text-white transition-colors text-sm font-medium">
          <span>←</span> Home
        </button>
      </div>

      <div className="absolute top-6 right-6 z-20">
        <SignOutButton />
      </div>

      <div className="z-10 w-full max-w-5xl px-6 flex flex-col items-center">
        {step === 'select' && (
          <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 md:mb-14 text-center flex flex-col items-center">
              <div className="mb-6 md:mb-8 p-4 bg-white/5 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-md ring-1 ring-white/20">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-scholafy-accent rounded-2xl flex items-center justify-center text-scholafy-navy font-bold text-3xl md:text-4xl shadow-inner">
                  S
                </div>
              </div>
              <h1 className="text-3xl md:text-6xl font-bold tracking-tight mb-4 text-white drop-shadow-sm">Who is learning?</h1>
              <p className="text-scholafy-muted text-base md:text-xl max-w-lg mx-auto leading-relaxed font-medium">
                Select your profile to continue.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 w-full max-w-lg md:max-w-4xl">
              <button
                onClick={() => handleSelect("Shakir", ViewState.CHILD_DASHBOARD, "0000")}
                className="group relative bg-scholafy-card/40 hover:bg-scholafy-card/60 border border-white/10 hover:border-scholafy-accent/50 p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(243,197,0,0.15)] flex flex-row md:flex-col items-center text-left md:text-center backdrop-blur-xl overflow-hidden gap-6 md:gap-0"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-scholafy-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-scholafy-accent to-yellow-600 p-[3px] shadow-2xl md:mb-8 group-hover:scale-105 transition-transform duration-300 ring-4 ring-black/20 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-scholafy-card flex items-center justify-center border-4 border-scholafy-navy relative overflow-hidden">
                    <span className="text-3xl md:text-5xl font-bold text-white z-10 relative">S</span>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/10"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2 group-hover:text-scholafy-accent transition-colors">Shakir</h2>
                  <p className="text-scholafy-muted font-medium mb-2 md:mb-6 text-sm md:text-base">Year 3 Student</p>
                </div>
              </button>

              <button
                onClick={() => handleSelect("Parent", ViewState.PARENT_DASHBOARD, "1234")}
                className="group relative bg-scholafy-card/40 hover:bg-scholafy-card/60 border border-white/10 hover:border-blue-400/50 p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.15)] flex flex-row md:flex-col items-center text-left md:text-center backdrop-blur-xl overflow-hidden gap-6 md:gap-0"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 p-[3px] shadow-2xl md:mb-8 group-hover:scale-105 transition-transform duration-300 ring-4 ring-black/20 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-scholafy-card flex items-center justify-center border-4 border-scholafy-navy relative overflow-hidden">
                    <span className="text-2xl md:text-4xl font-bold text-white z-10">P</span>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/10"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2 group-hover:text-blue-400 transition-colors">Parent</h2>
                  <p className="text-scholafy-muted font-medium mb-2 md:mb-6 text-sm md:text-base">Control & Oversight</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'auth' && selectedRole && (
          <PinPad
            targetName={selectedRole.name}
            correctPin={selectedRole.pin}
            onSuccess={handleAuthSuccess}
            onBack={() => setStep('select')}
          />
        )}
      </div>
    </div>
  );
}



const SignOutButton = () => {
  const { signOut } = useAuth();
  const { setView } = useApp();
  return (
    <button
      onClick={() => { signOut(); setView(ViewState.LANDING); }}
      className="text-scholafy-muted hover:text-white text-sm font-medium px-4 py-2 hover:bg-white/5 rounded-lg transition-all border border-white/10"
    >
      Sign Out
    </button>
  )
}

// --- APP CONTENT SWITCHER ---
const AppContent: React.FC = () => {
  const { view, setView } = useApp();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session && view !== ViewState.LANDING && view !== ViewState.ROLE_SELECT) {
      // Optionally redirect to landing or auth if trying to access protected route without session
      // For now, we handle it in the switch
    }
  }, [session, loading, view]);

  // If Supabase is NOT configured, block the app with a friendly guide
  if (!isSupabaseConfigured()) {
    return <ConfigOverlay />;
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0b1527] flex items-center justify-center text-white">Loading...</div>;
  }

  // Intercept ROLE_SELECT. If no session, show Auth. If session, show Profile Select (AuthScreen)
  if (view === ViewState.ROLE_SELECT && !session) {
    return (
      <div className="min-h-screen bg-[#0b1527] relative overflow-hidden flex flex-col items-center justify-center font-sans text-white">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-scholafy-accent/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-6 left-6 z-20">
          <button onClick={() => setView(ViewState.LANDING)} className="flex items-center gap-2 text-scholafy-muted hover:text-white transition-colors text-sm font-medium">
            <span>←</span> Home
          </button>
        </div>
        <Auth />
      </div>
    );
  }

  switch (view) {
    case ViewState.LANDING:
      return <LandingPage />;
    case ViewState.ROLE_SELECT:
      return <AuthScreen />;
    case ViewState.CHILD_DASHBOARD:
      return session ? <ChildDashboard /> : <AuthScreen />; // Should force login if protected
    case ViewState.PARENT_DASHBOARD:
      return session ? <ParentDashboard /> : <AuthScreen />;
    case ViewState.PLAYER:
      return session ? <Player /> : <AuthScreen />;
    default:
      return <div>Error</div>;
  }
};

export default AppContent;
