
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewState, ChildProfile, Lesson, LessonResult, BackgroundSession, CurriculumStats, Quote, SubjectStats, Badge } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { calculateInsights } from '../utils/insightEngine';

interface AppContextType {
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

// Demo ID - REMOVED for dynamic sync

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
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
  const { user } = useAuth();

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
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
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          const { data: newProfile } = await supabase.from('profiles').upsert([{
            id: user.id,
            name: user.user_metadata?.name || "Shakir",
            year_group: user.user_metadata?.year_group || 3,
            streak_days: 0,
            xp: 0,
            level: 1,
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
          .eq('profile_id', user.id);

        if (assignments && loadedLessons.length > 0) {
          const matched = loadedLessons.filter(l => assignments.some(a => a.lesson_id === l.id));
          setAssignedLessons(matched.length > 0 ? matched : []);
        } else {
          setAssignedLessons([]);
        }

        // 4. Fetch History
        const { data: history } = await supabase
          .from('lesson_history')
          .select('*')
          .eq('profile_id', user.id)
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
            badgesEarned: h.badges_earned,
            effortGrade: h.effort_grade,
            focusIndex: h.focus_index,
            masteryLevel: h.mastery_level,
            insightText: h.insight_text
          })));
        }

      } catch (err) {
        console.error("Supabase sync error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user?.id, availableLessons.length]);

  // --- REAL-TIME SUBSCRIPTIONS ---
  useEffect(() => {
    if (!user || availableLessons.length === 0) return;

    const channel = supabase.channel('app-db-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assignments',
        filter: `profile_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const lesson = availableLessons.find(l => l.id === payload.new.lesson_id);
          if (lesson) {
            setAssignedLessons(prev => {
              if (prev.find(l => l.id === lesson.id)) return prev;
              return [...prev, lesson];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          setAssignedLessons(prev => prev.filter(l => l.id !== payload.old.lesson_id));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        setChildProfile({
          name: payload.new.name,
          yearGroup: payload.new.year_group,
          streakDays: payload.new.streak_days,
          xp: payload.new.xp,
          level: payload.new.level,
          badges: payload.new.badges || []
        });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lesson_history',
        filter: `profile_id=eq.${user.id}`
      }, (payload) => {
        const newResult: LessonResult = {
          lessonId: payload.new.lesson_id,
          status: payload.new.status,
          timestamp: new Date(payload.new.timestamp).getTime(),
          durationSeconds: payload.new.duration_seconds,
          scorePercent: payload.new.score_percent,
          records: payload.new.records,
          xpEarned: payload.new.xp_earned,
          badgesEarned: payload.new.badges_earned,
          effortGrade: payload.new.effort_grade,
          focusIndex: payload.new.focus_index,
          masteryLevel: payload.new.mastery_level,
          insightText: payload.new.insight_text
        };
        setLessonHistory(prev => {
          if (prev.find(h => h.timestamp === newResult.timestamp && h.lessonId === newResult.lessonId)) return prev;
          return [newResult, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, availableLessons]);

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

    let standard: 'PK' | 'WTS' | 'EXS' | 'GDS' = 'PK';
    if (avgScore >= 90) standard = 'GDS';
    else if (avgScore >= 65) standard = 'EXS';
    else if (avgScore >= 35) standard = 'WTS';

    const subjects: Record<string, SubjectStats> = {};
    const allSubjects: string[] = Array.from(new Set(availableLessons.map(l => l.subject)));

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
    if (!user) return;
    const lesson = availableLessons.find(l => l.id === lessonId);
    if (lesson && !assignedLessons.find(al => al.id === lessonId)) {
      setAssignedLessons([...assignedLessons, lesson]);
      await supabase.from('assignments').insert([{ profile_id: user.id, lesson_id: lessonId }]);
    }
  };

  const unassignLesson = async (lessonId: string) => {
    if (!user) return;
    setAssignedLessons(prev => prev.filter(l => l.id !== lessonId));
    await supabase.from('assignments').delete().eq('profile_id', user.id).eq('lesson_id', lessonId);
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

      // 1. First Steps
      if (lessonHistory.filter(h => h.status === 'completed').length === 0 && !currentBadges.has('first_steps')) {
        const b = availableBadges.find(b => b.id === 'first_steps');
        if (b) earnedBadges.push(b);
      }

      // 2. Mastery Badges (Diamond, Gold, Silver, Bronze)
      let masteryBadgeId = '';
      if (result.scorePercent >= 90) masteryBadgeId = 'diamond_crown';
      else if (result.scorePercent >= 65) masteryBadgeId = 'gold_medal';
      else if (result.scorePercent >= 35) masteryBadgeId = 'silver_shield';
      else masteryBadgeId = 'bronze_key';

      if (masteryBadgeId) {
        const b = availableBadges.find(b => b.id === masteryBadgeId);
        if (b) earnedBadges.push(b);
      }

      // 3. Laser Eye (Focus) - Zero questions > 120s
      const hasLostAlert = result.records.some(r => (r.questionDurationSeconds || 0) > 120);
      if (!hasLostAlert) {
        const b = availableBadges.find(b => b.id === 'laser_eye');
        if (b) earnedBadges.push(b);
      }

      // 4. Accuracy Pro (No Guessing) - Zero incorrect answers < 4s
      const hasFlashGuess = result.records.some(r => !r.isCorrect && (r.questionDurationSeconds || 0) < 4);
      if (!hasFlashGuess) {
        const b = availableBadges.find(b => b.id === 'accuracy_pro');
        if (b) earnedBadges.push(b);
      }

      result.badgesEarned = earnedBadges;
    }

    try {
      // Fix: Using correct property name result.badgesEarned instead of result.badges_earned
      // --- CALCULATE INSIGHTS ---
      const lessonTitle = availableLessons.find(l => l.id === result.lessonId)?.title || "Unknown Lesson";
      const insights = calculateInsights(
        result.records,
        result.scorePercent,
        lessonTitle,
        childProfile?.name || "Student"
      );

      const { error: insertError } = await supabase.from('lesson_history').insert([{
        profile_id: user.id,
        lesson_id: result.lessonId,
        status: result.status,
        score_percent: result.scorePercent,
        xp_earned: result.xpEarned,
        duration_seconds: result.durationSeconds,
        records: result.records,
        badges_earned: result.badgesEarned || [], // Ensure it's never undefined

        // New Diagnostic Columns
        effort_grade: insights.effortGrade,
        focus_index: insights.focusIndex,
        mastery_level: insights.masteryLevel,
        insight_text: insights.insightText
      }]);

      if (insertError) throw insertError;

      setLessonHistory(prev => [result, ...prev]);
      if (result.status === 'completed') await unassignLesson(result.lessonId);
      await supabase.from('live_sessions').delete().eq('profile_id', user.id);

      if (result.status === 'completed' && earnedXP > 0) {
        const newXP = childProfile.xp + earnedXP;
        const newLevel = Math.floor(newXP / 1000) + 1;
        const newBadgeIds = [...childProfile.badges, ...(earnedBadges || []).map(b => b.id)]; // Safe map

        const { data: updatedProfile, error: profileError } = await supabase.from('profiles').update({
          xp: newXP,
          level: newLevel,
          badges: newBadgeIds
        }).eq('id', user.id).select().single();

        if (profileError) throw profileError;

        if (updatedProfile) {
          setChildProfile({
            name: updatedProfile.name,
            yearGroup: updatedProfile.year_group,
            streakDays: updatedProfile.streak_days,
            xp: updatedProfile.xp,
            level: updatedProfile.level,
            badges: updatedProfile.badges || []
          });
        }
      }
    } catch (error) {
      console.error("Failed to save lesson result:", error);
      throw error; // Re-throw to let Player.tsx handle the UI
    }
  };

  return (
    <AppContext.Provider value={{
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
      minimizeSession: (session: BackgroundSession) => {
        setBackgroundSession(session);
        setActiveLessonId(null);
        navigate('/child');
      },
      resumeSession: () => {
        if (backgroundSession) {
          setActiveLessonId(backgroundSession.lessonId);
          navigate(`/player/${backgroundSession.lessonId}`);
        }
      },
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
