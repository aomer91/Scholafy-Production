
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ViewState, ChildProfile, Lesson, LessonResult, BackgroundSession, CurriculumStats, Quote, SubjectStats, Badge } from '../types';
import { supabase } from '../lib/supabase';
import { STATIC_LESSONS } from '../lib/lessonData';

interface AppContextType {
  view: ViewState;
  setView: (v: ViewState) => void;
  childProfile: ChildProfile | null;
  assignedLessons: Lesson[];
  assignLesson: (lessonId: string) => Promise<void>;
  unassignLesson: (lessonId: string) => Promise<void>;
  activeLessonId: string | null;
  setActiveLessonId: (id: string | null) => void;
  availableLessons: Lesson[];
  lessonHistory: LessonResult[];
  saveLessonResult: (result: LessonResult) => Promise<void>;
  backgroundSession: BackgroundSession | null;
  minimizeSession: (session: BackgroundSession) => void;
  resumeSession: () => void;
  curriculumStats: CurriculumStats;
  dailyQuote: Quote;
  availableBadges: Badge[];
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEMO_PROFILE_ID = '00000000-0000-0000-0000-000000000000';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<ViewState>(ViewState.LANDING);
  const [assignedLessons, setAssignedLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [backgroundSession, setBackgroundSession] = useState<BackgroundSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [dailyQuote, setDailyQuote] = useState<Quote>({ text: "Seek knowledge from the cradle to the grave.", source: "Prophet Muhammad (ﷺ)" });

  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [lessonHistory, setLessonHistory] = useState<LessonResult[]>([]);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Static Content (Parallel)
        const [lessonsRes, badgesRes, quotesRes] = await Promise.all([
          supabase.from('lessons').select('*'),
          supabase.from('badges').select('*'),
          supabase.from('quotes').select('*')
        ]);

        let loadedLessons: Lesson[] = [];
        if (lessonsRes.data && lessonsRes.data.length > 0) {
          loadedLessons = lessonsRes.data.map((l: any) => ({
            id: l.id,
            title: l.title,
            year: l.year,
            subject: l.subject,
            curriculumStrand: l.curriculum_strand,
            goal: l.goal,
            video: l.video,
            estimatedMinutes: l.estimated_minutes,
            starterPolicy: l.starter_policy,
            exitPolicy: l.exit_policy,
            starters: l.starters,
            questions: l.questions,
            exits: l.exits
          }));
        } else {
          // Fallback static lessons if Supabase is empty, or use this for local dev override
          loadedLessons = STATIC_LESSONS;
        }
        setAvailableLessons(loadedLessons);

        if (badgesRes.data) setAvailableBadges(badgesRes.data);
        if (quotesRes.data && quotesRes.data.length > 0) {
          const rand = quotesRes.data[Math.floor(Math.random() * quotesRes.data.length)];
          setDailyQuote({ text: rand.text, source: rand.source });
        }

        // 2. Fetch Profile
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', DEMO_PROFILE_ID)
          .single();

        if (!profile) {
          const { data: newProfile } = await supabase.from('profiles').upsert([{
            id: DEMO_PROFILE_ID,
            name: "Shakir",
            year_group: 3,
            streak_days: 12,
            xp: 2450,
            level: 2,
            badges: []
          }]).select().single();
          profile = newProfile;
        }

        if (profile) {
          setChildProfile({
            name: profile.name,
            yearGroup: profile.year_group,
            streakDays: profile.streak_days,
            xp: profile.xp,
            level: profile.level,
            badges: profile.badges || []
          });
        }

        // 3. Fetch Active Assignments
        const { data: assignments } = await supabase
          .from('assignments')
          .select('lesson_id')
          .eq('profile_id', DEMO_PROFILE_ID);

        if (assignments && loadedLessons.length > 0) {
          const matched = loadedLessons.filter(l => assignments.some(a => a.lesson_id === l.id));
          setAssignedLessons(matched.length > 0 ? matched : [loadedLessons[0]]);
        } else if (loadedLessons.length > 0) {
          setAssignedLessons([loadedLessons[0]]);
        }

        // 4. Fetch History
        const { data: history } = await supabase
          .from('lesson_history')
          .select('*')
          .eq('profile_id', DEMO_PROFILE_ID)
          .order('timestamp', { ascending: false });

        if (history) {
          setLessonHistory(history.map(h => ({
            lessonId: h.lesson_id,
            status: h.status,
            timestamp: new Date(h.timestamp).getTime(),
            durationSeconds: h.duration_seconds,
            scorePercent: h.score_percent,
            records: h.records,
            xpEarned: h.xp_earned,
            badgesEarned: h.badges_earned
          })));
        }

      } catch (err) {
        console.error("Supabase sync error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // --- CURRICULUM STATS CALCULATION ---
  const [curriculumStats, setCurriculumStats] = useState<CurriculumStats>({
    totalLessons: 0,
    completedLessons: 0,
    averageScore: 0,
    currentStandard: 'WTS',
    completionPercent: 0,
    subjects: {}
  });

  useEffect(() => {
    if (availableLessons.length === 0) return;

    const completedResults = lessonHistory.filter(h => h.status === 'completed');
    const completedSet = new Set(completedResults.map(h => h.lessonId));

    const avgScore = completedResults.length > 0
      ? completedResults.reduce((acc, curr) => acc + curr.scorePercent, 0) / completedResults.length
      : 0;

    let standard: 'WTS' | 'EXS' | 'GDS' = 'WTS';
    if (avgScore >= 80) standard = 'GDS';
    else if (avgScore >= 50) standard = 'EXS';

    const subjects: Record<string, SubjectStats> = {};
    const allSubjects = Array.from(new Set(availableLessons.map(l => l.subject)));

    allSubjects.forEach(sub => {
      const subLessons = availableLessons.filter(l => l.subject === sub);
      const subCompleted = subLessons.filter(l => completedSet.has(l.id)).length;
      subjects[sub] = {
        total: subLessons.length,
        completed: subCompleted,
        percent: subLessons.length > 0 ? Math.round((subCompleted / subLessons.length) * 100) : 0
      };
    });

    setCurriculumStats({
      totalLessons: availableLessons.length,
      completedLessons: completedSet.size,
      averageScore: Math.round(avgScore),
      currentStandard: standard,
      completionPercent: availableLessons.length > 0 ? Math.round((completedSet.size / availableLessons.length) * 100) : 0,
      subjects
    });
  }, [lessonHistory, availableLessons]);

  // --- OPERATIONS ---

  const assignLesson = async (lessonId: string) => {
    const lesson = availableLessons.find(l => l.id === lessonId);
    if (lesson && !assignedLessons.find(al => al.id === lessonId)) {
      setAssignedLessons([...assignedLessons, lesson]);
      await supabase.from('assignments').insert([{ profile_id: DEMO_PROFILE_ID, lesson_id: lessonId }]);
    }
  };

  const unassignLesson = async (lessonId: string) => {
    setAssignedLessons(prev => prev.filter(l => l.id !== lessonId));
    await supabase.from('assignments').delete().eq('profile_id', DEMO_PROFILE_ID).eq('lesson_id', lessonId);
  };

  const saveLessonResult = async (result: LessonResult) => {
    if (!childProfile) return;

    const lesson = availableLessons.find(l => l.id === result.lessonId);
    let earnedXP = 0;
    let earnedBadges: Badge[] = [];

    if (result.status === 'completed') {
      const masteryMultiplier = result.scorePercent / 100;
      earnedXP = Math.floor((50 + (10 * (lesson?.estimatedMinutes || 5))) * masteryMultiplier);
      result.xpEarned = earnedXP;

      const currentBadges = new Set(childProfile.badges);
      if (lessonHistory.filter(h => h.status === 'completed').length === 0 && !currentBadges.has('first_steps')) {
        const b = availableBadges.find(b => b.id === 'first_steps');
        if (b) earnedBadges.push(b);
      }
      if (result.scorePercent === 100 && !currentBadges.has('perfectionist')) {
        const b = availableBadges.find(b => b.id === 'perfectionist');
        if (b) earnedBadges.push(b);
      }
      result.badgesEarned = earnedBadges;
    }

    // Fix: Using correct property name result.badgesEarned instead of result.badges_earned
    await supabase.from('lesson_history').insert([{
      profile_id: DEMO_PROFILE_ID,
      lesson_id: result.lessonId,
      status: result.status,
      score_percent: result.scorePercent,
      xp_earned: result.xpEarned,
      duration_seconds: result.durationSeconds,
      records: result.records,
      badges_earned: result.badgesEarned
    }]);

    setLessonHistory(prev => [result, ...prev]);
    if (result.status === 'completed') await unassignLesson(result.lessonId);
    await supabase.from('live_sessions').delete().eq('profile_id', DEMO_PROFILE_ID);

    if (result.status === 'completed' && earnedXP > 0) {
      const newXP = childProfile.xp + earnedXP;
      const newLevel = Math.floor(newXP / 1000) + 1;
      const newBadgeIds = [...childProfile.badges, ...earnedBadges.map(b => b.id)];

      const { data: updatedProfile } = await supabase.from('profiles').update({
        xp: newXP,
        level: newLevel,
        badges: newBadgeIds
      }).eq('id', DEMO_PROFILE_ID).select().single();

      if (updatedProfile) {
        setChildProfile({
          name: updatedProfile.name,
          yearGroup: updatedProfile.year_group,
          streakDays: updatedProfile.streak_days,
          xp: updatedProfile.xp,
          level: updatedProfile.level,
          badges: updatedProfile.badges
        });
      }
    }
  };

  const minimizeSession = (session: BackgroundSession) => {
    setBackgroundSession(session);
    setActiveLessonId(null);
    setView(ViewState.ROLE_SELECT);
  };

  const resumeSession = () => {
    if (backgroundSession) {
      setActiveLessonId(backgroundSession.lessonId);
      setView(ViewState.PLAYER);
    }
  };

  return (
    <AppContext.Provider value={{
      view,
      setView,
      childProfile,
      assignedLessons,
      assignLesson,
      unassignLesson,
      activeLessonId,
      setActiveLessonId,
      availableLessons,
      lessonHistory,
      saveLessonResult,
      backgroundSession,
      minimizeSession,
      resumeSession,
      curriculumStats,
      dailyQuote,
      availableBadges,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
