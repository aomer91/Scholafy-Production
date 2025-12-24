import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { renderQuestion, publishLiveStatus, deleteLiveStatus } from '../utils/playerEngine';
import { Question, LiveStatus, QuestionRecord, LessonResult, BackgroundSession, Badge, ViewState } from '../types';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';



declare global {
  interface Window {
    Plyr: any;
  }
}

export const Player: React.FC = () => {
  const { activeLessonId, setActiveLessonId, availableLessons, saveLessonResult, backgroundSession, minimizeSession } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lessonId: urlLessonId } = useParams();

  // Support both context and URL lesson ID
  const effectiveLessonId = urlLessonId || activeLessonId;
  const lesson = availableLessons.find(l => l.id === effectiveLessonId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstance = useRef<any>(null);

  // Restore session start timestamp from background session if available
  const sessionStartRef = useRef<number>(
    backgroundSession && backgroundSession.lessonId === activeLessonId
      ? backgroundSession.startTimestamp
      : Date.now()
  );

  // Restore history from background session if available
  const historyRef = useRef<QuestionRecord[]>(
    backgroundSession && backgroundSession.lessonId === activeLessonId && backgroundSession.history
      ? backgroundSession.history
      : []
  );

  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<string>>(() => {
    // Restore from background session if available
    if (backgroundSession && backgroundSession.lessonId === activeLessonId && backgroundSession.completedQuestionIds) {
      return new Set(backgroundSession.completedQuestionIds);
    }
    return new Set();
  });
  const [starterResults, setStarterResults] = useState<boolean[]>(() => {
    // Restore from background session if available
    if (backgroundSession && backgroundSession.lessonId === activeLessonId && backgroundSession.starterResults) {
      return backgroundSession.starterResults;
    }
    return [];
  });

  const [phase, setPhase] = useState<'starter' | 'video' | 'question' | 'exit' | 'complete'>(() => {
    if (backgroundSession && backgroundSession.lessonId === activeLessonId) {
      // If minimized during a question, pendingQuestionId will handle restoring it
      // Start in video phase but useEffect will set it to question with the pending question
      if (backgroundSession.phase === 'question' && backgroundSession.pendingQuestionId) {
        return 'video'; // Temporarily video, useEffect will switch to question
      }
      return backgroundSession.phase;
    }
    if (lesson && lesson.starters && lesson.starters.length > 0) return 'starter';
    return 'video';
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showParentLock, setShowParentLock] = useState(false);
  const [sessionResult, setSessionResult] = useState<LessonResult | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [fullscreenInterrupted, setFullscreenInterrupted] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Add loading state for save

  // Refs to avoid re-running init effect when phase/completedQuestionIds change
  const phaseRef = useRef(phase);
  const completedQuestionIdsRef = useRef(completedQuestionIds);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const cueProcessingRef = useRef<Set<string>>(new Set()); // Track cues being processed to prevent duplicates
  const questionStartTimeRef = useRef<number | null>(null); // Track when current question started
  const phaseStartTimeRef = useRef<number>(Date.now()); // Track when phase started
  const isSessionEndingRef = useRef(false); // Ref to prevent zombie updates during end sequence

  useEffect(() => {
    isSessionEndingRef.current = false;
  }, [activeLessonId]);

  useEffect(() => {
    phaseRef.current = phase;
    phaseStartTimeRef.current = Date.now(); // Update phase start time when phase changes
    // Initialize question start time for starter/exit phases
    if (phase === 'starter' || phase === 'exit') {
      questionStartTimeRef.current = Date.now();
    } else if (phase === 'video') {
      questionStartTimeRef.current = null; // Clear for video phase
    }
  }, [phase]);

  useEffect(() => {
    completedQuestionIdsRef.current = completedQuestionIds;
  }, [completedQuestionIds]);

  // RESTORE PENDING QUESTION: If session was minimized during a question, restore it
  // Only runs once on mount if there's a pending question
  const pendingQuestionRestoredRef = useRef(false);
  useEffect(() => {
    // Only restore pending question once, and only if we're in video phase (not starter/exit)
    if (
      backgroundSession?.pendingQuestionId &&
      lesson &&
      !currentQuestion &&
      !pendingQuestionRestoredRef.current &&
      phase === 'video' // Only trigger from video phase
    ) {
      const pendingQ = lesson.questions.find(q => q.id === backgroundSession.pendingQuestionId);
      if (pendingQ && !completedQuestionIds.has(pendingQ.id)) {
        pendingQuestionRestoredRef.current = true; // Mark as restored
        // Restore the question - child must answer before video continues
        setPhase('question');
        setCurrentQuestion(pendingQ);
        questionStartTimeRef.current = Date.now();
      }
    }
  }, [backgroundSession?.pendingQuestionId, lesson, currentQuestion, completedQuestionIds, phase]);

  // Cleanup function to stop video and destroy player
  const cleanupPlayer = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      // CRITICAL: Mute first to stop audio immediately
      videoEl.muted = true;
      videoEl.pause();
      // Clear the source to release audio resources
      videoEl.src = '';
      videoEl.load();
      // Note: Don't remove from DOM - React manages the element lifecycle
    }
    if (playerInstance.current) {
      try {
        playerInstance.current.destroy();
      } catch (e) {
        console.warn('Error destroying Plyr:', e);
      }
      playerInstance.current = null;
    }
  }, []);

  // Stop video when exiting to dashboard
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      cleanupPlayer();
      if (user?.id) deleteLiveStatus(user.id);
    };
  }, [cleanupPlayer, user?.id]);

  // Prevent fullscreen exit during video phase - PAUSE and NOTIFY PARENT
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && phase === 'video' && videoRef.current) {
        // Child pressed Escape or exited fullscreen
        setFullscreenInterrupted(true);
        videoRef.current.pause();
        videoRef.current.muted = true; // Mute audio immediately

        // CRITICAL: Notify parent that child is paused/interrupted
        if (user && lesson) {
          const totalQuestions = (lesson.starters?.length || 0) + lesson.questions.length + (lesson.exits?.length || 0);
          publishLiveStatus(user.id, lesson.id, {
            mode: 'paused', // New mode to indicate paused state
            t: getCurrentTimerValue(),
            total: lesson.estimatedMinutes * 60,
            qText: 'Video Paused (Fullscreen Exited)',
            history: historyRef.current,
            stats: {
              starters: starterResults,
              questionsAnswered: completedQuestionIds.size,
              questionsTotal: totalQuestions,
              starterCount: lesson.starters?.length || 0,
              videoQuestionCount: lesson.questions.length,
              exitCount: lesson.exits?.length || 0
            }
          });
        }
      } else if (document.fullscreenElement && fullscreenInterrupted) {
        setFullscreenInterrupted(false);
        if (videoRef.current) {
          videoRef.current.muted = false; // Unmute when returning to fullscreen
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [phase, fullscreenInterrupted, user, lesson, starterResults, completedQuestionIds]);

  // Initialize video player - only once per lesson
  useEffect(() => {
    if (!lesson || !videoRef.current) {
      return;
    }

    // If player already exists and video source matches, don't re-initialize
    const videoEl = videoRef.current;
    if (playerInstance.current && (videoEl.src === lesson.video || videoEl.currentSrc === lesson.video)) {
      return;
    }

    // Set video source
    // For Firebase Storage videos, use 'auto' preload to ensure full video loads
    videoEl.src = lesson.video;
    videoEl.preload = 'auto'; // Changed from 'metadata' to ensure video buffers fully

    // TEST: Disable Plyr and use native video player
    const USE_NATIVE_PLAYER = true; // Set to false to re-enable Plyr

    if (!USE_NATIVE_PLAYER) {
      // Initialize Plyr
      const initPlyr = () => {
        if (!window.Plyr) return;
        try {
          // Clean up existing player first
          if (playerInstance.current) {
            try {
              playerInstance.current.destroy();
            } catch (e) { }
          }

          const player = new window.Plyr(videoEl, {
            controls: [],
            clickToPlay: false,
            keyboard: { focused: false, global: false },
            fullscreen: { enabled: true },
            autoplay: false,
          });
          playerInstance.current = player;

          // Restore background session if exists
          if (backgroundSession && backgroundSession.lessonId === lesson.id) {
            player.once('ready', () => {
              videoEl.currentTime = backgroundSession.currentTime;
            });
          }
        } catch (err) {
          console.warn("Plyr init error:", err);
        }
      };

      initPlyr();
    } else {

      // Restore background session if exists (for native player)
      if (backgroundSession && backgroundSession.lessonId === lesson.id) {
        videoEl.addEventListener('loadedmetadata', () => {
          videoEl.currentTime = backgroundSession.currentTime;
        }, { once: true });
      }

      videoEl.addEventListener('loadedmetadata', () => {
        // Dimensions log can stay but without fetch
      }, { once: true });
    }

    // Time update handler - check for question cues
    // Use refs to avoid re-creating this handler when phase/completedQuestionIds change
    const onTimeUpdate = () => {
      if (videoEl.seeking) return;
      const t = videoEl.currentTime;
      setCurrentTime(t);


      if (phaseRef.current === 'video') {
        const cue = lesson.questions.find(q =>
          Math.abs(t - (q.time || 0)) < 0.5 &&
          !completedQuestionIdsRef.current.has(q.id) &&
          !cueProcessingRef.current.has(q.id) // Prevent duplicate processing
        );
        if (cue) {
          // Prevent duplicate triggers - mark as processing (but NOT as completed yet)
          cueProcessingRef.current.add(cue.id);
          // Track when question started
          questionStartTimeRef.current = Date.now();
          videoEl.pause();
          setPhase('question');
          setCurrentQuestion(cue);
          // Don't add to completedQuestionIds here - wait until answer is recorded
          if (document.fullscreenElement) document.exitFullscreen();
        }
      }
    };

    // Store event handlers so they can be properly removed
    const onPlay = () => {
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onEnded = () => {
      if (phaseRef.current === 'video') {
        setPhase('exit');
      }
    };

    const onLoadedMetadata = () => {
      setDuration(videoEl.duration);
    };

    const onCanPlay = () => {
      if (videoEl.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        setIsVideoReady(true);
      }
    };

    const onCanPlayThrough = () => {
      setIsVideoReady(true);
    };

    const onError = (e: Event) => {
      console.error('Video error:', videoEl.error);
    };

    const onStalled = () => {
    };

    const onWaiting = () => {
    };

    const onSuspend = () => {
    };

    // Add event listeners
    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('play', onPlay);
    videoEl.addEventListener('pause', onPause);
    videoEl.addEventListener('ended', onEnded);
    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
    videoEl.addEventListener('canplay', onCanPlay);
    videoEl.addEventListener('canplaythrough', onCanPlayThrough);
    videoEl.addEventListener('error', onError);
    videoEl.addEventListener('stalled', onStalled);
    videoEl.addEventListener('waiting', onWaiting);
    videoEl.addEventListener('suspend', onSuspend);

    return () => {
      // Remove all event listeners using stored references
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('play', onPlay);
      videoEl.removeEventListener('pause', onPause);
      videoEl.removeEventListener('ended', onEnded);
      videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      videoEl.removeEventListener('canplay', onCanPlay);
      videoEl.removeEventListener('canplaythrough', onCanPlayThrough);
      videoEl.removeEventListener('error', onError);
      videoEl.removeEventListener('stalled', onStalled);
      videoEl.removeEventListener('waiting', onWaiting);
      videoEl.removeEventListener('suspend', onSuspend);
      setIsVideoReady(false);
    };
  }, [lesson, backgroundSession]); // Only re-run when lesson changes, not on phase changes

  // Handle phase transitions
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !lesson) {
      return;
    }


    if (phase === 'video') {
      // When entering video phase, resume playback from current position
      // Don't restart - just resume if paused

      if (videoEl.paused) {
        // Request fullscreen non-blocking (don't wait for it)
        requestFullscreen().catch(() => {
          // Fullscreen may fail, continue anyway
        });

        // Attempt to play - check if video is ready
        const attemptPlay = () => {

          videoEl.play().then(() => {
            // Verify video is actually playing after a short delay
            setTimeout(() => {
            }, 500);
            // Check again after 1.5 seconds (when user reports visual stops)
            setTimeout(() => {
            }, 1500);
          }).catch((err) => {
            console.warn('Autoplay failed, user can click play button:', err);
          });
        };

        // If video is ready, play immediately; otherwise wait for it
        if (isVideoReady || videoEl.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
          attemptPlay();
        } else {
          // Wait for video to be ready
          const onCanPlayHandler = () => {
            videoEl.removeEventListener('canplay', onCanPlayHandler);
            attemptPlay();
          };
          videoEl.addEventListener('canplay', onCanPlayHandler);
          // Fallback timeout
          setTimeout(() => {
            videoEl.removeEventListener('canplay', onCanPlayHandler);
            attemptPlay();
          }, 3000);
        }
      }
    } else if (phase === 'question' || phase === 'starter' || phase === 'exit') {
      // Pause video during questions/starter/exit
      if (!videoEl.paused) {
        videoEl.pause();
      }
    }
  }, [phase, lesson, isVideoReady]);

  // Calculate current timer value based on phase
  const getCurrentTimerValue = (): number => {
    if (phase === 'video') {
      // Video phase: show video playback time
      return Math.floor(currentTime);
    } else if (phase === 'question' && questionStartTimeRef.current) {
      // Question phase: show time elapsed since question started
      return Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    } else if ((phase === 'starter' || phase === 'exit') && questionStartTimeRef.current) {
      // Starter/Exit phase: show time elapsed since current question started
      return Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    }
    return 0;
  };

  // Heartbeat for live status
  useEffect(() => {
    if (!lesson) return;

    const controller = new AbortController();

    const heartbeat = setInterval(() => {
      if (phase === 'complete' || isSessionEndingRef.current) return;

      // Calculate total questions (starters + video + exits)
      const totalQuestions = (lesson.starters?.length || 0) + lesson.questions.length + (lesson.exits?.length || 0);

      if (user) {
        // Determine current mode - include paused state
        const currentMode = fullscreenInterrupted ? 'paused' : phase;

        publishLiveStatus(user.id, lesson.id, {
          mode: currentMode, // Use currentMode which includes 'paused' state
          t: getCurrentTimerValue(), // Use calculated timer value
          total: lesson.estimatedMinutes * 60,
          qText: currentQuestion?.prompt || null,
          history: historyRef.current,
          stats: {
            starters: starterResults,
            questionsAnswered: completedQuestionIds.size,
            questionsTotal: totalQuestions,
            starterCount: lesson.starters?.length || 0,
            videoQuestionCount: lesson.questions.length,
            exitCount: lesson.exits?.length || 0
          }
        }, controller.signal);
      }
    }, 1000); // Changed from 3000ms to 1000ms for live updates

    return () => {
      clearInterval(heartbeat);
      controller.abort();
    };
  }, [lesson, phase, currentTime, currentQuestion, completedQuestionIds, starterResults, fullscreenInterrupted]);

  const recordAnswer = (q: Question, isCorrect: boolean, phase: 'starter' | 'video' | 'exit', answer: string | string[], questionDurationSeconds?: number) => {
    // Check if already recorded to prevent duplicate submissions
    if (completedQuestionIds.has(q.id)) return;

    historyRef.current.push({
      questionId: q.id,
      prompt: q.prompt,
      phase,
      isCorrect,
      answer,
      timestamp: Date.now(),
      questionDurationSeconds: questionDurationSeconds || 0
    });

    const newCompletedIds = new Set(completedQuestionIds);
    newCompletedIds.add(q.id);
    setCompletedQuestionIds(newCompletedIds);

    // Calculate total questions for stats
    const totalQuestions = (lesson?.starters?.length || 0) + (lesson?.questions.length || 0) + (lesson?.exits?.length || 0);

    // Immediately publish live status with updated history
    if (user) {
      publishLiveStatus(user.id, lesson?.id || '', {
        mode: phase,
        t: getCurrentTimerValue(), // Use calculated timer value
        history: historyRef.current,
        stats: {
          starters: starterResults,
          questionsAnswered: newCompletedIds.size,
          questionsTotal: totalQuestions,
          starterCount: lesson?.starters?.length || 0,
          videoQuestionCount: lesson?.questions.length || 0,
          exitCount: lesson?.exits?.length || 0
        }
      });
    }
  };

  const handleMinimize = () => {
    if (!lesson) return;

    // Flag to prevent remote kill listener from firing during minimize
    isSessionEndingRef.current = true;

    // CRITICAL: Pause and cleanup video FIRST
    const videoEl = videoRef.current;
    const savedTime = videoEl ? videoEl.currentTime : currentTime;
    if (videoEl) {
      videoEl.pause();
    }
    cleanupPlayer();

    // Now save the session with the captured time
    const session: BackgroundSession = {
      lessonId: lesson.id,
      currentTime: savedTime,
      totalDuration: duration || lesson.estimatedMinutes * 60,
      history: historyRef.current,
      completedQuestionIds: Array.from(completedQuestionIds),
      starterResults: starterResults,
      phase: phase,
      startTimestamp: sessionStartRef.current,
      pendingQuestionId: phase === 'question' ? currentQuestion?.id : undefined // Save question to resume
    };

    // CRITICAL: Update live session to 'minimized' mode (don't delete it)
    // Parent will see the session is minimized until child resumes or parent clears it
    if (user) {
      const totalQuestions = (lesson.starters?.length || 0) + lesson.questions.length + (lesson.exits?.length || 0);
      publishLiveStatus(user.id, lesson.id, {
        mode: 'minimized',
        t: savedTime,
        total: lesson.estimatedMinutes * 60,
        qText: 'Session Minimized by Parent',
        history: historyRef.current,
        stats: {
          starters: starterResults,
          questionsAnswered: completedQuestionIds.size,
          questionsTotal: totalQuestions,
          starterCount: lesson.starters?.length || 0,
          videoQuestionCount: lesson.questions.length,
          exitCount: lesson.exits?.length || 0
        }
      });
    }

    minimizeSession(session);
  };

  const handleEndSession = async (forceIncomplete: boolean = false, statusOverride?: 'completed') => {
    if (!lesson || isSaving) return; // Prevent double submission

    // Flag to stop any more heartbeats
    isSessionEndingRef.current = true;
    setIsSaving(true);

    // Stop video playback
    cleanupPlayer();

    const records = historyRef.current;
    const correctCount = records.filter(r => r.isCorrect).length;
    const score = records.length > 0 ? Math.round((correctCount / records.length) * 100) : 0;
    const isFinished = statusOverride === 'completed' || (phase === 'complete' && !forceIncomplete);

    const result: LessonResult = {
      lessonId: lesson.id,
      status: isFinished ? 'completed' : 'incomplete',
      timestamp: Date.now(),
      durationSeconds: Math.floor((Date.now() - sessionStartRef.current) / 1000),
      scorePercent: score,
      records: records,
      xpEarned: 0
    };

    try {
      await saveLessonResult(result);
      if (isFinished) {
        setSessionResult(result);
        setPhase('complete');
      } else {
        exitToDashboard();
      }
    } catch (error) {
      console.error("Error saving session:", error);
      alert("There was an issue saving your progress. Please check your connection and try again.");
      setIsSaving(false);
      isSessionEndingRef.current = false; // Allow retry
    }
  };

  const exitToDashboard = useCallback(() => {
    isSessionEndingRef.current = true;
    // Stop video and cleanup
    cleanupPlayer();
    if (user?.id) deleteLiveStatus(user.id);
    setActiveLessonId(null);
    navigate('/child');
  }, [cleanupPlayer, user?.id, setActiveLessonId, navigate]);

  // Listener for remote session termination (e.g. deletion from Supabase by parent)
  // NOTE: Only triggers on actual parent-initiated remote stop, not during minimize
  useEffect(() => {
    if (!lesson || !user?.id) return;

    const channel = supabase.channel(`remote-kill-${user.id}`)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'live_sessions',
        filter: `profile_id=eq.${user.id}`
      }, () => {
        // Ignore if we're already intentionally ending the session
        if (isSessionEndingRef.current) {
          console.log("Ignoring remote termination - session already ending.");
          return;
        }
        console.log("Remote session termination detected.");
        exitToDashboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lesson?.id, user?.id, exitToDashboard]);

  const requestFullscreen = async () => {
    if (playerContainerRef.current) {
      try {
        await playerContainerRef.current.requestFullscreen();
      } catch (e) {
        // Fullscreen may fail, continue anyway
      }
    }
  };

  const handleQuestionComplete = useCallback(() => {
    if (currentQuestion) {
      // Clear from processing ref so it can be detected again if needed
      // Note: completedQuestionIds is already updated by recordAnswer
      cueProcessingRef.current.delete(currentQuestion.id);
    }
    setCurrentQuestion(null);
    setPhase('video'); // Return to video phase - will auto-resume via phase effect
  }, [currentQuestion]);

  const handleStarterResult = useCallback((correct: boolean, q: Question, answer: string | string[], duration?: number) => {
    recordAnswer(q, correct, 'starter', answer, duration);
    setStarterResults(prev => [...prev, correct]);
  }, []);

  const handleExitResult = useCallback((correct: boolean, q: Question, answer: string | string[], duration?: number) => {
    recordAnswer(q, correct, 'exit', answer, duration);
  }, []);

  const handleStarterComplete = useCallback(() => {
    setPhase('video');
  }, [lesson?.video]);

  const handleExitComplete = useCallback(() => {
    handleEndSession(false, 'completed');
  }, [handleEndSession]);

  if (!lesson) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading from Cloud...</div>;

  if (isSaving) return <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4"><div className="w-8 h-8 border-4 border-scholafy-accent border-t-transparent rounded-full animate-spin"></div><div className="text-lg font-bold">Saving Progress...</div></div>;

  return (
    <div ref={playerContainerRef} className="fixed inset-0 bg-black flex flex-col font-sans text-white z-0">
      <div className="absolute top-4 left-4 z-[150]">
        <button onClick={() => setShowParentLock(true)} className="w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/60 text-white rounded-full border border-white/10 backdrop-blur-md shadow-lg">🔒</button>
      </div>

      {showParentLock && (
        <div className="absolute inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-scholafy-card border border-scholafy-border rounded-xl p-8 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold mb-6">Parent Override</h3>
            <div className="flex flex-col gap-3">
              <Button variant="primary" fullWidth onClick={handleMinimize}>Minimize Session</Button>
              <Button variant="danger" fullWidth onClick={() => handleEndSession(true)}>End Session</Button>
              <Button variant="secondary" fullWidth onClick={() => setShowParentLock(false)}>Back to Video</Button>
            </div>
          </div>
        </div>
      )}

      {/* Video element always mounted so it can load during starter phase */}
      <div
        ref={videoContainerRef}
        className={`relative w-full h-full flex items-center justify-center bg-black ${phase === 'video' || phase === 'question' ? 'block' : 'hidden'}`}
        style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%' }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', display: 'block' }}
        />
        {phase === 'video' && (
          <div className="absolute bottom-6 left-6 z-30 flex items-center gap-4">
            <button
              onClick={() => {
                const videoEl = videoRef.current;
                if (videoEl) {
                  if (videoEl.paused) {
                    videoEl.play();
                  } else {
                    videoEl.pause();
                  }
                }
              }}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
        )}
      </div>

      {phase === 'question' && currentQuestion && (
        <div className="absolute inset-0 z-40 bg-scholafy-navy/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-scholafy-card border border-scholafy-border rounded-2xl p-8 shadow-2xl">
            <QuestionHost
              key={currentQuestion.id}
              question={currentQuestion}
              onResult={(correct, answer, duration) => recordAnswer(currentQuestion, correct, 'video', answer, duration)}
              onComplete={handleQuestionComplete}
              questionStartTime={questionStartTimeRef.current || undefined}
            />
          </div>
        </div>
      )}

      {(phase === 'starter' || phase === 'exit') && (
        <div className="absolute inset-0 z-50 bg-scholafy-navy flex flex-col items-center justify-center p-6">
          <ShellQuiz
            key={`${phase}-${lesson.id}`}
            type={phase}
            questions={phase === 'starter' ? lesson.starters : lesson.exits}
            onResult={phase === 'starter' ? handleStarterResult : handleExitResult}
            onComplete={phase === 'starter' ? handleStarterComplete : handleExitComplete}
            onQuestionChange={(startTime) => { questionStartTimeRef.current = startTime; }}
          />
        </div>
      )}

      {phase === 'complete' && sessionResult && (
        <div className="absolute inset-0 z-50 bg-[#0b1527] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500 overflow-y-auto">
          <div className="absolute top-0 right-0 p-20 bg-scholafy-accent/5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 p-20 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="mb-8 relative">
            <div className="text-8xl mb-4 animate-bounce">
              {sessionResult.scorePercent >= 90 ? '💎' : sessionResult.scorePercent >= 65 ? '🥇' : sessionResult.scorePercent >= 35 ? '🛡️' : '🔑'}
            </div>
            <div className="text-scholafy-accent font-black tracking-widest text-sm uppercase mb-2">
              {sessionResult.scorePercent >= 90 ? 'The Diamond Crown' : sessionResult.scorePercent >= 65 ? 'The Gold Medal' : sessionResult.scorePercent >= 35 ? 'The Silver Shield' : 'The Bronze Key'}
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">Lesson Mastered!</h1>
          <div className="text-white/60 text-lg mb-8">"{lesson.title}"</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 w-full max-w-lg">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="text-xs text-scholafy-muted uppercase tracking-widest font-bold mb-1">Final Score</div>
              <div className="text-4xl font-bold text-scholafy-accent">{sessionResult.scorePercent}%</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="text-xs text-scholafy-muted uppercase tracking-widest font-bold mb-1">XP Earned</div>
              <div className="text-4xl font-bold text-white">+{sessionResult.xpEarned}</div>
            </div>
          </div>

          {sessionResult.badgesEarned && sessionResult.badgesEarned.length > 0 && (
            <div className="mb-10 w-full max-w-lg">
              <div className="text-xs text-scholafy-muted uppercase tracking-widest font-bold mb-6 flex items-center justify-center gap-2">
                <span className="w-8 h-px bg-white/10"></span>
                Badges Unlocked
                <span className="w-8 h-px bg-white/10"></span>
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                {sessionResult.badgesEarned.map(badge => (
                  <div key={badge.id} className="flex flex-col items-center gap-2 group">
                    <div className={`w-20 h-20 rounded-2xl ${badge.color} flex items-center justify-center text-4xl shadow-2xl transform transition-transform group-hover:scale-110 duration-300 ring-2 ring-white/20`}>
                      {badge.icon}
                    </div>
                    <div className="text-xs font-bold text-white tracking-wide">{badge.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <Button size="lg" fullWidth onClick={exitToDashboard}>Return to Dashboard</Button>
            {sessionResult.scorePercent < 100 && (
              <button
                onClick={() => window.location.reload()}
                className="text-scholafy-muted hover:text-white text-sm font-bold uppercase tracking-widest transition-colors py-2"
              >
                Try Again for 100%
              </button>
            )}
          </div>
        </div>
      )}

      {fullscreenInterrupted && phase === 'video' && (
        <div className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6">
          <div className="bg-scholafy-card border border-scholafy-border rounded-2xl p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Lesson In Progress</h2>
            <p className="text-scholafy-muted mb-6">
              {Math.floor((duration - currentTime) / 60)}m {Math.floor((duration - currentTime) % 60)}s remaining
            </p>
            <Button onClick={async () => {
              await requestFullscreen();
              if (videoRef.current) videoRef.current.play();
            }}>Return to Fullscreen</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionHost: React.FC<{ question: Question, onComplete: () => void, onResult?: (res: boolean, answer: string | string[], duration?: number) => void, questionStartTime?: number }> = ({ question, onComplete, onResult, questionStartTime }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRenderedRef = useRef<string | null>(null);
  const isRenderingRef = useRef(false); // Prevent concurrent renders
  // Use refs for callbacks to prevent re-renders
  const onCompleteRef = useRef(onComplete);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onResultRef.current = onResult;
  }, [onComplete, onResult]);

  useEffect(() => {

    // Early return if already rendered, currently rendering, or no container/question
    if (hasRenderedRef.current === question?.id || isRenderingRef.current || !containerRef.current || !question) {
      return;
    }

    // Mark as rendering to prevent concurrent renders
    isRenderingRef.current = true;


    // Mark as rendered BEFORE calling renderQuestion to prevent race conditions
    hasRenderedRef.current = question.id;

    renderQuestion(containerRef.current, question, (isCorrect, answer) => {

      const duration = questionStartTime ? Math.floor((Date.now() - questionStartTime) / 1000) : 0;
      if (onResultRef.current) onResultRef.current(isCorrect, answer, duration);

      // Always call onComplete after delay: 1.5s for correct, 2.5s for incorrect
      const delay = isCorrect ? 1500 : 2500;
      setTimeout(() => onCompleteRef.current(), delay);
    });

    // Mark rendering as complete
    isRenderingRef.current = false;
  }, [question?.id]); // Only depend on question.id, use refs for callbacks

  // Reset hasRendered when question changes to a different one (before render effect runs)
  const prevQuestionIdRef = useRef<string | null>(null);
  if (question?.id !== prevQuestionIdRef.current) {
    if (prevQuestionIdRef.current !== null) {
      // Question changed, reset render state
      hasRenderedRef.current = null;
      isRenderingRef.current = false;
    }
    prevQuestionIdRef.current = question?.id || null;
  }

  return <div ref={containerRef} className="w-full min-h-[200px]" />;
};

const ShellQuiz: React.FC<{ type: 'starter' | 'exit', questions: Question[], onComplete: () => void, onResult?: (res: boolean, q: Question, answer: string | string[], duration?: number) => void, onQuestionChange?: (startTime: number) => void }> = ({ type, questions, onComplete, onResult, onQuestionChange }) => {
  const [index, setIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const questionStartTimeRef = useRef<number>(Date.now()); // Track when current question started


  useEffect(() => {
    if (!questions || questions.length === 0) {
      onComplete();
    }
  }, [questions, onComplete]);

  // Reset question start time when question changes and notify parent
  useEffect(() => {
    const startTime = Date.now();
    questionStartTimeRef.current = startTime;
    onQuestionChange?.(startTime); // Notify parent of question start time
  }, [index, onQuestionChange]);

  if (!questions || questions.length === 0) {
    return null;
  }
  const currentQ = questions[index];

  const handleStepComplete = useCallback(() => {
    if (index < questions.length - 1) {
      setTransitioning(true);
      setTimeout(() => {
        setIndex(index + 1);
        setTransitioning(false);
        questionStartTimeRef.current = Date.now(); // Reset for next question
      }, 300);
    } else {
      onComplete();
    }
  }, [index, questions.length, currentQ.id, onComplete]);

  return (
    <div className={`bg-scholafy-card border border-scholafy-border rounded-2xl p-8 shadow-2xl flex flex-col items-center w-full max-w-2xl transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
      <div className="mb-8 w-full flex justify-between items-center border-b border-white/5 pb-4">
        <span className="uppercase tracking-widest text-xs font-bold text-scholafy-muted">{type === 'starter' ? 'Diagnostic Starter' : 'Exit Exam'}</span>
        <span className="font-mono text-scholafy-accent">{index + 1} / {questions.length}</span>
      </div>
      <QuestionHost
        key={currentQ.id}
        question={currentQ}
        onResult={(res, answer, duration) => onResult?.(res, currentQ, answer, duration)}
        onComplete={handleStepComplete}
        questionStartTime={questionStartTimeRef.current}
      />
    </div>
  );
};
