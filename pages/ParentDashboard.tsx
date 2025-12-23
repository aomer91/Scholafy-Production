import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';
import { ViewState, LiveStatus, LessonResult, QuestionRecord, Lesson, SubjectStats } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Demo ID
// Demo ID - REMOVED

// --- HELPER COMPONENTS ---

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: string; indicator?: boolean }> = ({ active, onClick, label, icon, indicator }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold flex-shrink-0 ${active ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-scholafy-muted hover:text-white hover:bg-white/5 border border-transparent'}`}
    >
        <span>{icon}</span>
        {label}
        {indicator && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
    </button>
);

const SubjectCard: React.FC<{ subject: string; icon: string; color: string; count: number; onClick: () => void }> = ({ subject, icon, color, count, onClick }) => {
    const colorStyles = {
        blue: 'hover:border-blue-500/50 hover:shadow-blue-500/20',
        yellow: 'hover:border-yellow-500/50 hover:shadow-yellow-500/20',
        green: 'hover:border-green-500/50 hover:shadow-green-500/20'
    }[color] || '';

    const bgStyles = {
        blue: 'bg-blue-500',
        yellow: 'bg-yellow-500',
        green: 'bg-green-500'
    }[color] || 'bg-white';

    return (
        <button onClick={onClick} className={`group relative bg-scholafy-card/40 border border-white/10 ${colorStyles} p-6 md:p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl text-left overflow-hidden w-full`}>
            <div className={`absolute top-0 right-0 p-20 ${bgStyles}/5 rounded-full blur-2xl group-hover:${bgStyles}/10 transition-colors`}></div>
            <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform origin-left">{icon}</div>
            <h3 className="text-2xl font-bold mb-1 text-white">{subject}</h3>
            <p className="text-scholafy-muted">{count} Lessons Available</p>
        </button>
    );
};

const LiveQuestionFeed: React.FC<{ history: QuestionRecord[] }> = ({ history }) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    if (!history || history.length === 0) {
        return <div className="text-sm text-scholafy-muted text-center py-4">No questions answered yet.</div>;
    }

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Split questions by phase
    const starterQuestions = history.filter(rec => rec.phase === 'starter');
    const videoQuestions = history.filter(rec => rec.phase === 'video');
    const exitQuestions = history.filter(rec => rec.phase === 'exit');

    const formatAnswer = (answer: string | string[] | undefined, isCorrect: boolean): JSX.Element | string => {
        if (!answer) return <span className="text-scholafy-muted italic">No answer submitted</span>;

        // Check if it's a match question answer (format: "left → right")
        if (Array.isArray(answer)) {
            const isMatchFormat = answer.some(a => typeof a === 'string' && a.includes(' → '));
            if (isMatchFormat) {
                return (
                    <div className="space-y-2 mt-2">
                        {answer.map((pair, idx) => {
                            const [left, right] = (pair as string).split(' → ');
                            return (
                                <div key={idx} className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center justify-between">
                                    <span className="text-white font-medium">{left}</span>
                                    <span className="text-scholafy-muted mx-2">→</span>
                                    <span className="text-white font-medium">{right}</span>
                                    <span className="ml-2 text-green-500">✓</span>
                                </div>
                            );
                        })}
                    </div>
                );
            }
            return <span className="text-white font-medium">{answer.join(', ')}</span>;
        }
        return <span className="text-white font-medium">{answer}</span>;
    };

    const renderQuestionSection = (records: QuestionRecord[], phaseLabel: string, phaseColor: string) => {
        if (records.length === 0) return null;

        return (
            <div className="mb-6">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${phaseColor} border-b border-white/10 pb-2 mb-3`}>
                    {phaseLabel} ({records.length})
                </h4>
                <div className="space-y-2">
                    {records.map((rec, i) => {
                        const isExpanded = expandedIds.has(rec.questionId);

                        return (
                            <div key={`${rec.questionId}-${i}`} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all">
                                <button
                                    onClick={() => toggleExpand(rec.questionId)}
                                    className="w-full p-4 flex justify-between items-center hover:bg-white/10 transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-transform ${isExpanded ? 'rotate-90' : ''} ${rec.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {isExpanded ? '−' : '+'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-white mb-1 truncate group-hover:text-scholafy-accent transition-colors">{rec.prompt}</div>
                                            <div className="text-xs text-scholafy-muted">{new Date(rec.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                        <div className={`font-bold px-3 py-1 rounded text-xs uppercase border ${rec.isCorrect ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                            {rec.isCorrect ? 'Correct' : 'Incorrect'}
                                        </div>
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-white/10 pt-4 bg-black/20">
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-widest text-scholafy-muted mb-2">Question</div>
                                                <div className="text-sm text-white">{rec.prompt}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-widest text-scholafy-muted mb-2">Child's Answer</div>
                                                <div className="text-sm">
                                                    {formatAnswer(rec.answer, rec.isCorrect)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-scholafy-muted pt-2 border-t border-white/5 flex-wrap">
                                                <span>Submitted: {new Date(rec.timestamp).toLocaleString()}</span>
                                                {rec.questionDurationSeconds !== undefined && rec.questionDurationSeconds > 0 && (
                                                    <span className="text-scholafy-accent font-medium">
                                                        ⏱️ {Math.floor(rec.questionDurationSeconds / 60)}m {rec.questionDurationSeconds % 60}s
                                                    </span>
                                                )}
                                                <span className={`${rec.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                                    {rec.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {renderQuestionSection(starterQuestions, 'Starter Questions', 'text-blue-400')}
            {renderQuestionSection(videoQuestions, 'Video Questions', 'text-yellow-400')}
            {renderQuestionSection(exitQuestions, 'Exit Questions', 'text-purple-400')}
        </div>
    );
};

const LiveSessionDetail: React.FC<{ data: LiveStatus; lessonTitle: string }> = ({ data, lessonTitle }) => {
    const [showDebug, setShowDebug] = useState(false);
    const [liveTimer, setLiveTimer] = useState(data.t || 0);

    // Update live timer from data.t and keep it updating smoothly
    useEffect(() => {
        setLiveTimer(data.t || 0);
    }, [data.t]);

    // Smooth timer increment for non-video phases (question/starter/exit)
    useEffect(() => {
        if (data.mode === 'idle' || data.mode === 'complete') return;

        // For video mode, rely on data.t updates from heartbeat
        // For other modes, increment locally for smooth display
        if (data.mode !== 'video') {
            const interval = setInterval(() => {
                setLiveTimer(prev => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [data.mode]);

    return (
        <div className="bg-scholafy-card/60 backdrop-blur-md border border-scholafy-accent/30 p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="animate-pulse w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red]"></span>
                        <span className="text-xs font-bold uppercase tracking-widest text-red-400">Live Feed</span>
                        {data.mode !== 'idle' && data.mode !== 'complete' && (
                            <div className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-[10px] text-yellow-400">
                                <span>🔒</span>
                                <span className="uppercase font-bold">Parent Override Available</span>
                            </div>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold">{lessonTitle}</h2>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-scholafy-muted hover:text-white transition-all"
                    >
                        {showDebug ? 'Hide Entry' : 'Inspect Entry'}
                    </button>
                    <div className="text-left md:text-right bg-black/20 p-2 rounded-lg border border-white/5 min-w-[100px]">
                        <div className="text-2xl font-mono font-bold text-scholafy-accent">
                            {Math.floor((liveTimer || 0) / 60)}:{(liveTimer || 0) % 60 < 10 ? '0' : ''}{Math.floor((liveTimer || 0) % 60)}
                        </div>
                        <div className="text-[10px] text-scholafy-muted uppercase">
                            {data.mode === 'video' ? 'Video Time' : data.mode === 'question' ? 'Question Time' : 'Session Timer'}
                        </div>
                    </div>
                </div>
            </div>

            {showDebug && (
                <div className="mb-6 bg-black/40 rounded-xl p-4 border border-white/10 font-mono text-[10px] overflow-x-auto text-green-400 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
                        <span className="text-white font-bold">RAW SUPABASE ENTRY (`live_sessions`)</span>
                        <span className="text-xs opacity-50">Last Update: {new Date(data.lastUpdate).toLocaleTimeString()}</span>
                    </div>
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-scholafy-muted uppercase mb-1">Activity</div>
                    <div className="text-xl font-bold capitalize text-blue-400">{data.mode}</div>
                    {data.qText && <div className="mt-2 text-sm italic opacity-80 border-l-2 border-white/20 pl-2">"{data.qText}"</div>}
                </div>

                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-scholafy-muted uppercase mb-1">Progress</div>
                    <div className="text-xl font-bold text-white">
                        {data.stats?.questionsAnswered || 0} <span className="text-sm opacity-50">/ {data.stats?.questionsTotal || 0}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(data.stats?.questionsAnswered || 0) / (data.stats?.questionsTotal || 1) * 100}%` }}></div>
                    </div>
                    {data.stats && (data.stats.starterCount || data.stats.videoQuestionCount || data.stats.exitCount) && (
                        <div className="mt-2 text-xs text-scholafy-muted">
                            {data.stats.starterCount ? `${data.stats.starterCount} starter${data.stats.starterCount > 1 ? 's' : ''}` : ''}
                            {data.stats.starterCount && data.stats.videoQuestionCount ? ' • ' : ''}
                            {data.stats.videoQuestionCount ? `${data.stats.videoQuestionCount} video` : ''}
                            {data.stats.videoQuestionCount && data.stats.exitCount ? ' • ' : ''}
                            {data.stats.exitCount ? `${data.stats.exitCount} exit` : ''}
                        </div>
                    )}
                </div>

                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-scholafy-muted uppercase mb-1">Starter Performance</div>
                    {(!data.stats?.starters || data.stats.starters.length === 0) ? (
                        <div className="text-sm text-scholafy-muted">No starter questions</div>
                    ) : (
                        <>
                            <div className="text-xl font-bold text-white mb-2">
                                {data.stats.starters.filter((r: boolean) => r).length} / {data.stats.starters.length} correct
                            </div>
                            <div className="flex gap-2 mt-1 flex-wrap">
                                {data.stats.starters.map((res: boolean, i: number) => (
                                    <div key={i} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${res ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                                        {res ? '✓' : '✗'}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-sm font-bold uppercase tracking-widest text-scholafy-muted mb-3">Real-time Log</h3>
                <LiveQuestionFeed history={data.history || []} />
            </div>
        </div>
    );
};

const TeacherFeedbackCard: React.FC<{ result: LessonResult, lesson?: Lesson }> = ({ result, lesson }) => {
    const score = result.scorePercent;
    let feedback = "";
    if (result.status === 'incomplete') feedback = "Session ended early. Recommend re-assignment.";
    else if (score >= 90) feedback = `High proficiency in ${lesson?.title}. Mastery confirmed.`;
    else if (score >= 70) feedback = "Concepts secure. Minor application errors observed.";
    else if (score >= 50) feedback = "Partial understanding. Review formative cues.";
    else feedback = "Foundational misconceptions identified. Intervention recommended.";

    return (
        <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-xl relative overflow-hidden">
            <h3 className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                <span>🤖</span> Teacher Report
            </h3>
            <p className="text-lg leading-relaxed text-blue-100 font-medium italic">"{feedback}"</p>
        </div>
    );
};

const ResultSection: React.FC<{ title: string, records: QuestionRecord[] }> = ({ title, records }) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    if (records.length === 0) return null;

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-scholafy-muted border-b border-white/10 pb-2">{title}</h4>
            <div className="space-y-2">
                {records.map((rec, i) => {
                    const isExpanded = expandedIds.has(rec.questionId);
                    const answerDisplay = rec.answer
                        ? (Array.isArray(rec.answer) ? rec.answer.join(', ') : rec.answer)
                        : 'No answer submitted';

                    return (
                        <div key={i} className="bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleExpand(rec.questionId)}
                                className="w-full p-4 flex justify-between items-center hover:bg-white/10 transition-colors text-left"
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-white mb-1">{rec.prompt}</div>
                                    <div className="text-xs text-scholafy-muted">{new Date(rec.timestamp).toLocaleTimeString()}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`font-bold px-3 py-1 rounded text-xs uppercase ${rec.isCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {rec.isCorrect ? 'Correct' : 'Incorrect'}
                                    </div>
                                    <span className="text-scholafy-muted">{isExpanded ? '▼' : '▶'}</span>
                                </div>
                            </button>
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-white/5 pt-4">
                                    <div className="text-sm text-scholafy-muted mb-2">Child's Answer:</div>
                                    <div className="text-white font-medium mb-4">{answerDisplay || 'No answer submitted'}</div>
                                    <div className="text-xs text-scholafy-muted">
                                        Submitted: {new Date(rec.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const ParentDashboard: React.FC = () => {
    const { setView, availableLessons, assignedLessons, assignLesson, unassignLesson, lessonHistory, curriculumStats, childProfile } = useApp();
    const [activeTab, setActiveTab] = useState<'monitor' | 'plan' | 'history' | 'standards'>('monitor');
    const [liveData, setLiveData] = useState<LiveStatus | null>(null);
    const [selectedResult, setSelectedResult] = useState<LessonResult | null>(null);
    const [selectedYear, setSelectedYear] = useState(3);
    const [selectedSubject, setSelectedSubject] = useState<'Mathematics' | 'English' | 'Science' | null>(null);
    const [expandedStrands, setExpandedStrands] = useState<Set<string>>(new Set());
    const [stagingQueue, setStagingQueue] = useState<Lesson[]>([]);
    const [isCloudConnected, setIsCloudConnected] = useState(false);
    const { user } = useAuth();

    // --- SYNC LOGIC ---
    const fetchInitialLive = useCallback(async () => {
        if (!isSupabaseConfigured() || !user) return;
        const { data, error } = await supabase.from('live_sessions').select('*').eq('profile_id', user.id).maybeSingle();

        if (error) {
            console.error("Initial fetch error:", error);
        } else {
            setIsCloudConnected(true);
        }

        if (data) {
            setLiveData({
                lessonId: data.lesson_id,
                mode: data.mode,
                t: data.t,
                total: data.total,
                qText: data.q_text,
                stats: data.stats,
                history: data.history,
                lastUpdate: new Date(data.last_update).getTime(),
                alerts: []
            });
        } else {
            setLiveData(null);
        }
    }, []);


    // --- SUPABASE REAL-TIME SUBSCRIPTION + POLLING FALLBACK ---
    useEffect(() => {
        if (!isSupabaseConfigured() || !user) return;

        fetchInitialLive();

        // 1. Setup Realtime Channel
        const channel = supabase.channel('live-monitor-v2')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'live_sessions',
                filter: `profile_id=eq.${user.id}`
            }, (payload) => {
                setIsCloudConnected(true);
                if (payload.eventType === 'DELETE') {
                    setLiveData(null);
                } else {
                    const data = payload.new as any;
                    setLiveData({
                        lessonId: data.lesson_id,
                        mode: data.mode,
                        t: data.t,
                        total: data.total,
                        qText: data.q_text,
                        stats: data.stats,
                        history: data.history,
                        lastUpdate: new Date(data.last_update).getTime(),
                        alerts: []
                    });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setIsCloudConnected(true);
            });

        // 2. Setup Polling Fallback (Every 5 seconds in case Realtime fails)
        const pollInterval = setInterval(fetchInitialLive, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [fetchInitialLive, user]);

    const addToStaging = (lesson: Lesson) => {
        if (!stagingQueue.find(l => l.id === lesson.id) && !assignedLessons.find(l => l.id === lesson.id)) {
            setStagingQueue([...stagingQueue, lesson]);
        }
    };

    const removeFromStaging = (lessonId: string) => {
        setStagingQueue(prev => prev.filter(l => l.id !== lessonId));
    };

    const publishQueue = async () => {
        for (const lesson of stagingQueue) {
            await assignLesson(lesson.id);
        }
        setStagingQueue([]);
    };

    const toggleStrand = (strand: string) => {
        const newSet = new Set(expandedStrands);
        if (newSet.has(strand)) newSet.delete(strand);
        else newSet.add(strand);
        setExpandedStrands(newSet);
    };

    const getStrandsForSubject = (subject: string) => {
        const subjectLessons = availableLessons.filter(l => l.subject === subject && l.year === selectedYear);
        const strands: Record<string, typeof subjectLessons> = {};
        subjectLessons.forEach(l => {
            if (!strands[l.curriculumStrand]) strands[l.curriculumStrand] = [];
            strands[l.curriculumStrand].push(l);
        });
        return strands;
    };

    return (
        <div className="min-h-screen bg-[#0b1527] text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white">
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none fixed" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none fixed" />

            <header className="w-full max-w-7xl mx-auto p-4 md:p-6 z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-blue-400 font-bold text-xl backdrop-blur-md shadow-lg">
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="text-xs text-scholafy-muted uppercase tracking-widest font-semibold">Command Center</div>
                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 border ${isCloudConnected ? 'border-green-500/50 text-green-400 bg-green-500/5' : 'border-red-500/50 text-red-400 bg-red-500/5'}`}>
                                <div className={`w-1 h-1 rounded-full ${isCloudConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                {isCloudConnected ? 'Cloud Sync Active' : 'Offline Mode'}
                            </div>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold">Parent Dashboard</h1>
                    </div>
                </div>
                <button onClick={() => setView(ViewState.LANDING)} className="self-end md:self-auto px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium text-scholafy-muted hover:text-white">Log Out</button>
            </header>

            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mb-8 z-10">
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 inline-flex backdrop-blur-md overflow-x-auto max-w-full custom-scrollbar">
                    <TabButton active={activeTab === 'standards'} onClick={() => setActiveTab('standards')} label="Assessment" icon="📋" />
                    <TabButton active={activeTab === 'monitor'} onClick={() => setActiveTab('monitor')} label="Live Monitor" icon="📡" indicator={!!(liveData && liveData.mode !== 'idle' && liveData.mode !== 'complete')} />
                    <TabButton active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} label="Library" icon="📚" />
                    <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="History" icon="📊" />
                </div>
            </div>

            <main className="w-full max-w-7xl mx-auto px-4 md:px-6 pb-12 z-10 flex-1 relative">
                {activeTab === 'standards' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                Year 3 Assessment
                            </h2>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-lg">🇬🇧</span>
                                <div className="text-xs text-left">
                                    <div className="font-bold text-white">UK National Curriculum</div>
                                    <div className="text-scholafy-muted uppercase tracking-wider text-[10px]">Key Stage 2 Alignment</div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="col-span-1 bg-scholafy-card/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                                <div className="text-xs font-bold uppercase tracking-widest text-scholafy-muted mb-4">Projected Standard</div>
                                <div className="flex gap-3 mb-4">
                                    <div className={`w-4 h-4 rounded-full ${curriculumStats.currentStandard === 'WTS' ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-white/10'}`}></div>
                                    <div className={`w-4 h-4 rounded-full ${curriculumStats.currentStandard === 'EXS' ? 'bg-yellow-500 shadow-[0_0_10px_orange]' : 'bg-white/10'}`}></div>
                                    <div className={`w-4 h-4 rounded-full ${curriculumStats.currentStandard === 'GDS' ? 'bg-green-500 shadow-[0_0_10px_green]' : 'bg-white/10'}`}></div>
                                </div>
                                <h3 className={`text-4xl font-bold mb-2 ${curriculumStats.currentStandard === 'GDS' ? 'text-green-500' : curriculumStats.currentStandard === 'EXS' ? 'text-yellow-500' : 'text-red-500'}`}>{curriculumStats.currentStandard}</h3>
                                <p className="text-sm text-scholafy-muted">{curriculumStats.currentStandard === 'GDS' ? 'Greater Depth' : curriculumStats.currentStandard === 'EXS' ? 'Expected' : 'Working Towards'}</p>
                            </div>
                            <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                    <div className="text-xs font-bold uppercase tracking-widest text-scholafy-muted mb-2">Curriculum Coverage</div>
                                    <div className="text-3xl font-bold text-white mb-1">{curriculumStats.completionPercent}%</div>
                                    <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${curriculumStats.completionPercent}%` }}></div></div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                    <div className="text-xs font-bold uppercase tracking-widest text-scholafy-muted mb-2">Avg. Score</div>
                                    <div className="text-3xl font-bold text-white mb-1">{curriculumStats.averageScore}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'monitor' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {liveData && liveData.mode !== 'idle' && liveData.mode !== 'complete' ? (
                            <LiveSessionDetail data={liveData} lessonTitle={availableLessons.find(l => l.id === liveData.lessonId)?.title || 'Lesson'} />
                        ) : (
                            <div className="bg-scholafy-card/50 backdrop-blur-md border border-white/10 border-dashed rounded-2xl p-12 md:p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner animate-pulse">💤</div>
                                <h2 className="text-2xl font-bold mb-2">System Idle</h2>
                                <p className="text-scholafy-muted max-w-md">No active lesson heartbeats detected from the learning engine. Go to the Child Dashboard and start a lesson to see cloud data here.</p>
                                <Button variant="outline" className="mt-4" onClick={fetchInitialLive}>Manual Refresh</Button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'plan' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2">Library</h2>
                                    <div className="relative group">
                                        <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-1.5 rounded-lg text-sm font-bold border border-white/10 transition-colors">Year {selectedYear}</button>
                                        <div className="absolute top-full left-0 mt-2 w-32 bg-[#0b1527] border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-20">
                                            {[1, 2, 3, 4, 5, 6].map(y => (<button key={y} onClick={() => setSelectedYear(y)} className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 ${y === selectedYear ? 'text-blue-400 font-bold' : 'text-scholafy-muted'}`}>Year {y}</button>))}
                                        </div>
                                    </div>
                                </div>
                                {selectedSubject && (<button onClick={() => setSelectedSubject(null)} className="text-sm text-scholafy-muted hover:text-white">← Subjects</button>)}
                            </div>

                            {!selectedSubject && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SubjectCard subject="Mathematics" icon="📐" color="blue" count={availableLessons.filter(l => l.subject === 'Mathematics').length} onClick={() => setSelectedSubject('Mathematics')} />
                                    <SubjectCard subject="English" icon="📝" color="yellow" count={availableLessons.filter(l => l.subject === 'English').length} onClick={() => setSelectedSubject('English')} />
                                    <SubjectCard subject="Science" icon="🧪" color="green" count={availableLessons.filter(l => l.subject === 'Science').length} onClick={() => setSelectedSubject('Science')} />
                                </div>
                            )}

                            {selectedSubject && (
                                <div className="space-y-4">
                                    {Object.entries(getStrandsForSubject(selectedSubject)).map(([strandName, lessons]) => {
                                        const isExpanded = expandedStrands.has(strandName);
                                        return (
                                            <div key={strandName} className="bg-scholafy-card/40 border border-white/10 rounded-xl overflow-hidden">
                                                <button onClick={() => toggleStrand(strandName)} className="w-full flex items-center justify-between p-5 hover:bg-white/5 text-left transition-colors">
                                                    <div className="flex items-center gap-3"><span className="font-bold">{strandName}</span><span className="text-xs text-scholafy-muted">{lessons.length}</span></div>
                                                </button>
                                                {isExpanded && (
                                                    <div className="border-t border-white/5 bg-black/10">
                                                        {lessons.map(lesson => {
                                                            const isAssigned = assignedLessons.some(al => al.id === lesson.id);
                                                            const isStaged = stagingQueue.some(sl => sl.id === lesson.id);
                                                            return (
                                                                <div key={lesson.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/5 border-b border-white/5 last:border-0 gap-4 transition-colors">
                                                                    <div>
                                                                        <div className="font-bold text-sm">{lesson.title}</div>
                                                                        <div className="text-xs text-scholafy-muted">⏱ {lesson.estimatedMinutes}m | {lesson.goal}</div>
                                                                    </div>
                                                                    <Button variant={isAssigned ? 'outline' : isStaged ? 'secondary' : 'primary'} disabled={isAssigned} onClick={() => isStaged ? removeFromStaging(lesson.id) : addToStaging(lesson)} className="py-2 px-4 text-xs">{isAssigned ? 'Allocated' : isStaged ? 'Remove' : '+ Allocate'}</Button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-scholafy-card/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sticky top-6">
                                <h2 className="text-lg font-bold mb-4 flex justify-between items-center"><span>Allocation Queue</span><span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">{stagingQueue.length}</span></h2>
                                <div className="flex flex-col gap-3">
                                    {stagingQueue.map((lesson) => (
                                        <div key={lesson.id} className="bg-[#0b1527] border border-white/10 p-3 rounded-xl flex justify-between items-center">
                                            <div className="text-sm truncate w-40">{lesson.title}</div>
                                            <button onClick={() => removeFromStaging(lesson.id)} className="text-scholafy-muted">✕</button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={publishQueue} disabled={stagingQueue.length === 0} className="w-full py-3 bg-green-600 mt-6 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-lg hover:shadow-green-500/20">Allocate to Child</button>
                                <p className="text-[10px] text-scholafy-muted text-center mt-3">Lessons must be allocated before they appear on the Child Dashboard.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">History</h2>
                        {lessonHistory.length === 0 ? (<p className="text-scholafy-muted text-center py-20">No lesson history yet.</p>) : (
                            <div className="grid gap-4">
                                {lessonHistory.map((result, idx) => {
                                    const lessonMeta = availableLessons.find(l => l.id === result.lessonId);
                                    return (
                                        <div key={idx} onClick={() => setSelectedResult(result)} className="bg-scholafy-card/60 border border-white/10 p-5 rounded-xl cursor-pointer hover:border-blue-400/50 transition-all flex flex-col sm:flex-row justify-between items-center gap-4">
                                            <div className="flex items-center gap-6">
                                                <div className="text-xl font-bold text-blue-400">{result.scorePercent}%</div>
                                                <div>
                                                    <h3 className="font-bold">{lessonMeta?.title || result.lessonId}</h3>
                                                    <div className="text-xs text-scholafy-muted">{new Date(result.timestamp).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <div className="px-4 py-2 bg-white/5 rounded-full text-sm font-medium">View Report</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {selectedResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0b1527] border border-white/20 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col relative p-6 md:p-8">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold">{availableLessons.find(l => l.id === selectedResult.lessonId)?.title}</h2>
                            <button onClick={() => setSelectedResult(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">✕</button>
                        </div>
                        <TeacherFeedbackCard result={selectedResult} lesson={availableLessons.find(l => l.id === selectedResult.lessonId)} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <div className="p-5 bg-white/5 rounded-xl border border-white/10 text-center">
                                <div className="text-xs uppercase text-scholafy-muted mb-1">Score</div>
                                <div className="text-3xl font-bold text-green-400">{selectedResult.scorePercent}%</div>
                            </div>
                            <div className="p-5 bg-white/5 rounded-xl border border-white/10 text-center">
                                <div className="text-xs uppercase text-scholafy-muted mb-1">Effort</div>
                                <div className="text-3xl font-bold text-white">+{selectedResult.xpEarned} XP</div>
                            </div>
                        </div>
                        <div className="mt-8">
                            <ResultSection title="Detailed Breakdown" records={selectedResult.records} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
