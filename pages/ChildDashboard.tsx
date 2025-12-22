import React from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';

export const ChildDashboard: React.FC = () => {
  const { assignedLessons, setActiveLessonId, setView, childProfile, lessonHistory, backgroundSession, resumeSession, curriculumStats, dailyQuote, availableBadges } = useApp();

  const handleStart = (id: string) => {
    if (backgroundSession && backgroundSession.lessonId === id) {
        resumeSession();
    } else {
        setActiveLessonId(id);
        setView(ViewState.PLAYER);
    }
  };

  const handleLogout = () => {
    setView(ViewState.ROLE_SELECT);
  };

  // Re-attempt Logic: We simply show whatever is assigned. 
  // Completion removes it from 'assignedLessons', but re-assigning adds it back.
  // We filter completions just for the "Completed Today" list.
  const completedIds = new Set(lessonHistory.map(h => h.lessonId));
  
  // Tasks to show are just the assigned ones. 
  const activeTasks = assignedLessons; 

  const completedTasks = lessonHistory.filter(h => h.status === 'completed').slice(0, 5); // Show recent 5

  // Gamification Calcs
  const xpProgress = (childProfile.xp % 1000) / 10; // 0-100%

  // Resolve Earned Badges
  const earnedBadges = childProfile.badges.map(id => availableBadges.find(b => b.id === id)).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0b1527] text-white flex flex-col relative overflow-hidden font-sans selection:bg-scholafy-accent selection:text-scholafy-panel">
      
      {/* Ambient Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-scholafy-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* --- HERO HEADER --- */}
      <header className="w-full max-w-6xl mx-auto p-4 md:p-6 z-10">
        <div className="bg-scholafy-card/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col lg:flex-row justify-between items-center shadow-2xl relative overflow-hidden gap-6">
            
            {/* Gloss Highlight */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

            {/* Profile Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 z-10 w-full lg:w-auto text-center sm:text-left">
                <div className="relative group cursor-pointer">
                    <div className="absolute -top-2 -right-2 bg-scholafy-accent text-scholafy-navy font-bold text-xs px-2 py-1 rounded-full z-20 shadow-lg border border-white/20">
                        Lvl {childProfile.level}
                    </div>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-scholafy-accent to-yellow-600 p-[3px] shadow-[0_0_20px_rgba(243,197,0,0.3)] transition-transform group-hover:scale-105">
                        <div className="w-full h-full bg-[#0b1527] rounded-xl flex items-center justify-center font-bold text-3xl text-white overflow-hidden relative">
                             <span className="z-10">{childProfile.name.charAt(0)}</span>
                             <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/10"></div>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 w-full sm:w-auto">
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2 justify-center sm:justify-start">
                        <h1 className="text-2xl font-bold">{childProfile.name}</h1>
                        <span className="bg-white/10 text-xs px-2 py-0.5 rounded text-scholafy-muted border border-white/5">Year {childProfile.yearGroup} Student</span>
                    </div>
                    
                    {/* XP / Level Progress Bar */}
                    <div className="w-full sm:w-80">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-scholafy-muted mb-1">
                            <span>Level {childProfile.level}</span>
                            <span>{childProfile.xp % 1000} / 1000 XP</span>
                        </div>
                        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative group">
                            {/* Stripes pattern */}
                            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}></div>
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${xpProgress}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="flex items-center gap-4 mt-2 lg:mt-0 z-10 w-full lg:w-auto justify-center lg:justify-end">
                 {/* Streak */}
                 <div className="flex flex-col items-center px-6 py-2 bg-black/20 rounded-2xl border border-white/5">
                     <span className="text-2xl">🔥</span>
                     <span className="text-xs font-bold text-scholafy-muted uppercase mt-1">Day Streak</span>
                     <span className="font-bold text-scholafy-accent">{childProfile.streakDays}</span>
                 </div>
                 
                 {/* Logout */}
                 <button 
                    onClick={handleLogout}
                    className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                    title="Log Out"
                >
                    <svg className="w-5 h-5 text-scholafy-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                 </button>
            </div>
        </div>
      </header>

      {/* --- MAIN DASHBOARD CONTENT --- */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col lg:flex-row gap-8 px-4 md:px-6 pb-12 z-10">
        
        {/* LEFT COLUMN: ACTIVE MISSIONS & BADGES */}
        <div className="flex-1 space-y-8">
            
            {/* 1. Assignments */}
            <div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-8 bg-scholafy-accent rounded-full"></span>
                    My Assignments
                    <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-white/70 ml-2">{activeTasks.length}</span>
                </h2>

                {activeTasks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5">
                        {activeTasks.map((lesson, index) => {
                            const isBackground = backgroundSession && backgroundSession.lessonId === lesson.id;
                            return (
                                <div 
                                    key={lesson.id}
                                    onClick={() => handleStart(lesson.id)}
                                    className={`group relative bg-scholafy-card/60 backdrop-blur-md border ${isBackground ? 'border-scholafy-accent ring-1 ring-scholafy-accent shadow-[0_0_30px_rgba(243,197,0,0.15)]' : 'border-white/10'} hover:border-scholafy-accent/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in`}
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-scholafy-accent/0 via-scholafy-accent/5 to-scholafy-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

                                    <div className="flex justify-between items-center relative z-10">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl ${isBackground ? 'bg-scholafy-accent text-scholafy-panel' : 'bg-white/5 border border-white/10 text-white/40 group-hover:border-scholafy-accent group-hover:text-scholafy-accent'} flex items-center justify-center font-bold text-2xl transition-all duration-300 flex-shrink-0`}>
                                                {isBackground ? '▶' : (lesson.subject === 'Mathematics' ? '📐' : '📝')}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-scholafy-muted bg-black/20 px-2 py-0.5 rounded border border-white/5">{lesson.subject}</span>
                                                    <span className="text-[10px] uppercase tracking-widest text-scholafy-accent/80 border border-scholafy-accent/20 px-2 py-0.5 rounded">{lesson.curriculumStrand.split('-')[0]}</span>
                                                </div>
                                                <h3 className="font-bold text-lg md:text-xl group-hover:text-scholafy-accent transition-colors leading-tight">{lesson.title}</h3>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-scholafy-muted flex-wrap">
                                                    <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> {lesson.estimatedMinutes} mins</span>
                                                    <span className="flex items-center gap-1 text-scholafy-accent">Working Towards: {lesson.goal}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`hidden sm:flex w-10 h-10 rounded-full border items-center justify-center transition-all ${isBackground ? 'bg-scholafy-accent border-transparent text-scholafy-panel' : 'border-white/10 bg-white/5 text-white/50 group-hover:bg-scholafy-accent group-hover:text-scholafy-panel group-hover:border-transparent'}`}>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 text-center flex-1 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="text-6xl mb-6 opacity-80 animate-bounce">📚</div>
                        <h3 className="text-2xl font-bold mb-2">No Active Assignments</h3>
                        <p className="text-scholafy-muted">Ask your parent to assign new curriculum tasks.</p>
                    </div>
                )}
            </div>

            {/* 2. Trophy Cabinet */}
            <div>
                 <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                    Trophy Cabinet
                    <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-white/70 ml-2">{earnedBadges.length} / {availableBadges.length}</span>
                </h2>
                
                <div className="bg-scholafy-card/40 border border-white/10 rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {availableBadges.map(badge => {
                        const isUnlocked = childProfile.badges.includes(badge.id);
                        return (
                            <div key={badge.id} className={`flex flex-col items-center text-center p-3 rounded-xl transition-all ${isUnlocked ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'opacity-30 grayscale'}`}>
                                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-2 ${isUnlocked ? badge.color + ' shadow-lg' : 'bg-white/10'}`}>
                                    {badge.icon}
                                </div>
                                <div className="font-bold text-xs md:text-sm leading-tight mb-1">{badge.name}</div>
                                {isUnlocked && <div className="text-[10px] text-scholafy-muted hidden md:block">{badge.description}</div>}
                                {!isUnlocked && <div className="text-[10px] text-white/30 hidden md:block">Locked</div>}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: QUOTES & HISTORY */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
            
            {/* Wisdom Card */}
            <div className="bg-gradient-to-br from-scholafy-card to-[#0b1527] border border-scholafy-accent/20 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-scholafy-accent/40 transition-colors">
                <div className="absolute top-0 right-0 p-10 bg-scholafy-accent/5 rounded-full blur-2xl"></div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-scholafy-accent mb-4 flex items-center gap-2">
                    <span>✨</span> Wisdom of the Day
                </h3>
                <blockquote className="text-lg font-serif italic leading-relaxed text-white/90 mb-4">
                    "{dailyQuote.text}"
                </blockquote>
                <div className="text-xs font-bold text-scholafy-muted text-right">— {dailyQuote.source}</div>
            </div>

            {/* Recent Completions */}
            <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-scholafy-muted mb-4 px-2">History (Recent)</h3>
                <div className="flex flex-col gap-3">
                    {completedTasks.length > 0 ? completedTasks.map((result, i) => {
                         const lesson = assignedLessons.find(l => l.id === result.lessonId) || {title: result.lessonId, curriculumStrand: 'Completed'}; // Fallback
                         return (
                            <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-sm">✓</div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-scholafy-muted">Score: {result.scorePercent}%</div>
                                    <div className="font-medium text-sm truncate">XP Earned: +{result.xpEarned || 0}</div>
                                </div>
                            </div>
                         );
                    }) : (
                        <div className="text-sm text-scholafy-muted italic px-2">No completed tasks yet.</div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};