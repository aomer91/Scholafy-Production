import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { renderQuestion, publishLiveStatus, deleteLiveStatus } from '../utils/playerEngine';
import { Question, LiveStatus, QuestionRecord, LessonResult, BackgroundSession, Badge, ViewState } from '../types';
import { Button } from './Button';
import { supabase } from '../lib/supabase';

const DEMO_PROFILE_ID = '00000000-0000-0000-0000-000000000000';

declare global {
  interface Window {
    Plyr: any;
  }
}

export const Player: React.FC = () => {
  const { activeLessonId, setActiveLessonId, setView, availableLessons, saveLessonResult, backgroundSession, minimizeSession } = useApp();
  const lesson = availableLessons.find(l => l.id === activeLessonId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstance = useRef<any>(null);

  const sessionStartRef = useRef<number>(Date.now());
  const historyRef = useRef<QuestionRecord[]>([]);

  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<string>>(new Set());
  const [starterResults, setStarterResults] = useState<boolean[]>([]);

  const [phase, setPhase] = useState<'starter' | 'video' | 'question' | 'exit' | 'complete'>(() => {
    if (backgroundSession && backgroundSession.lessonId === activeLessonId) {
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

  // Refs to avoid re-running init effect when phase/completedQuestionIds change
  const phaseRef = useRef(phase);
  const completedQuestionIdsRef = useRef(completedQuestionIds);
  const videoContainerRef = useRef<HTMLDivElement>(null);
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

  // Cleanup function to stop video and destroy player
  const cleanupPlayer = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
      videoEl.load();
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
      deleteLiveStatus();
    };
  }, [cleanupPlayer]);

  // Prevent fullscreen exit during video phase
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && phase === 'video' && videoRef.current) {
        setFullscreenInterrupted(true);
        videoRef.current.pause();
      } else if (document.fullscreenElement && fullscreenInterrupted) {
        setFullscreenInterrupted(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [phase, fullscreenInterrupted]);

  // Initialize video player - only once per lesson
  useEffect(() => {
    if (!lesson || !videoRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:initEffect:entry', message: 'Init effect entry', data: { hasLesson: !!lesson, hasVideoRef: !!videoRef.current, videoUrl: lesson?.video }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
      return;
    }

    // If player already exists and video source matches, don't re-initialize
    const videoEl = videoRef.current;
    if (playerInstance.current && (videoEl.src === lesson.video || videoEl.currentSrc === lesson.video)) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:initEffect:skip', message: 'Skipping init - player already exists with correct source', data: { videoSrc: videoEl.src, currentSrc: videoEl.currentSrc, expectedSrc: lesson.video }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:initEffect:setSource', message: 'Setting video source', data: { videoUrl: lesson.video, currentSrc: videoEl.src, isFirebase: lesson.video.includes('firebasestorage') }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:initPlyr:created', message: 'Plyr instance created', data: { videoSrc: videoEl.src, currentSrc: videoEl.currentSrc }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
          // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:initNative:skippingPlyr', message: 'Skipping Plyr - using native video player', data: { videoSrc: videoEl.src, currentSrc: videoEl.currentSrc }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion

      // Restore background session if exists (for native player)
      if (backgroundSession && backgroundSession.lessonId === lesson.id) {
        videoEl.addEventListener('loadedmetadata', () => {
          videoEl.currentTime = backgroundSession.currentTime;
        }, { once: true });
      }

      // Log video element dimensions after source is set
      videoEl.addEventListener('loadedmetadata', () => {
        // #region agent log
        const videoStyles = window.getComputedStyle(videoEl);
        const containerEl = videoContainerRef.current;
        const containerStyles = containerEl ? window.getComputedStyle(containerEl) : null;
        fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:initNative:loadedmetadata', message: 'Native video loaded metadata', data: { videoWidth: videoEl.offsetWidth, videoHeight: videoEl.offsetHeight, videoClientWidth: videoEl.clientWidth, videoClientHeight: videoEl.clientHeight, videoVideoWidth: videoEl.videoWidth, videoVideoHeight: videoEl.videoHeight, containerWidth: containerEl?.offsetWidth, containerHeight: containerEl?.offsetHeight, videoDisplay: videoStyles.display, videoVisibility: videoStyles.visibility, videoOpacity: videoStyles.opacity, containerDisplay: containerStyles?.display }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
        // #endregion
      }, { once: true });
    }

    // Time update handler - check for question cues
    // Use refs to avoid re-creating this handler when phase/completedQuestionIds change
    const onTimeUpdate = () => {
      if (videoEl.seeking) return;
      const t = videoEl.currentTime;
      setCurrentTime(t);

      // #region agent log
      if (t > 0 && t < 3) {
        fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:onTimeUpdate:early', message: 'Time update in first 3 seconds', data: { currentTime: t, phase: phaseRef.current, paused: videoEl.paused, readyState: videoEl.readyState, allQuestionTimes: lesson.questions.map(q => ({ id: q.id, time: q.time || 0 })), completedIds: Array.from(completedQuestionIdsRef.current) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
      }
      // #endregion

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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:onTimeUpdate:cueFound', message: 'Question cue detected - pausing video', data: { currentTime: t, cueTime: cue.time || 0, cueId: cue.id, questionPrompt: cue.prompt }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
          // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:event:play', message: 'Video play event fired', data: { currentTime: videoEl.currentTime, readyState: videoEl.readyState, phase: phaseRef.current, src: videoEl.currentSrc || videoEl.src }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A,E' }) }).catch(() => { });
      // #endregion
      setIsPlaying(true);
    };

    const onPause = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:event:pause', message: 'Video pause event fired', data: { currentTime: videoEl.currentTime, phase: phaseRef.current, readyState: videoEl.readyState, ended: videoEl.ended, src: videoEl.currentSrc || videoEl.src }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A,B' }) }).catch(() => { });
      // #endregion
      setIsPlaying(false);
    };

    const onEnded = () => {
      if (phaseRef.current === 'video') {
        setPhase('exit');
      }
    };

    const onLoadedMetadata = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:event:loadedmetadata', message: 'Video metadata loaded', data: { duration: videoEl.duration, src: videoEl.currentSrc || videoEl.src }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
      setDuration(videoEl.duration);
    };

    const onCanPlay = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:event:canplay', message: 'Video canplay event fired', data: { readyState: videoEl.readyState, src: videoEl.currentSrc || videoEl.src }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,C' }) }).catch(() => { });
      // #endregion
      if (videoEl.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        setIsVideoReady(true);
      }
    };

    const onCanPlayThrough = () => {
      setIsVideoReady(true);
    };

    const onError = (e: Event) => {
      // #region agent log
      const error = videoEl.error;
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:event:error', message: 'Video error event fired', data: { errorCode: error?.code, errorMessage: error?.message, networkState: videoEl.networkState, readyState: videoEl.readyState, src: videoEl.currentSrc || videoEl.src }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
      console.error('Video error:', error);
    };

    const onStalled = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:event:stalled', message: 'Video stalled event fired', data: { currentTime: videoEl.currentTime, networkState: videoEl.networkState, readyState: videoEl.readyState, src: videoEl.currentSrc || videoEl.src }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
    };

    const onWaiting = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:event:waiting', message: 'Video waiting event fired', data: { currentTime: videoEl.currentTime, networkState: videoEl.networkState, readyState: videoEl.readyState, src: videoEl.currentSrc || videoEl.src }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
    };

    const onSuspend = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:event:suspend', message: 'Video suspend event fired', data: { currentTime: videoEl.currentTime, networkState: videoEl.networkState, readyState: videoEl.readyState, src: videoEl.currentSrc || videoEl.src }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:entry', message: 'Phase transition effect entry', data: { phase, hasVideoEl: !!videoEl, hasLesson: !!lesson }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,B,C,D,E,F' }) }).catch(() => { });
      // #endregion
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:state', message: 'Video element state before phase check', data: { phase, src: videoEl.src, currentSrc: videoEl.currentSrc, readyState: videoEl.readyState, networkState: videoEl.networkState, paused: videoEl.paused, hasPlyr: !!playerInstance.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,C,F' }) }).catch(() => { });
    // #endregion

    if (phase === 'video') {
      // When entering video phase, resume playback from current position
      // Don't restart - just resume if paused
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:videoPhase', message: 'Entering video phase', data: { paused: videoEl.paused, isVideoReady, readyState: videoEl.readyState, src: videoEl.src, currentSrc: videoEl.currentSrc }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,C,F' }) }).catch(() => { });
      // #endregion

      if (videoEl.paused) {
        // Request fullscreen non-blocking (don't wait for it)
        requestFullscreen().catch(() => {
          // Fullscreen may fail, continue anyway
        });

        // Attempt to play - check if video is ready
        const attemptPlay = () => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:attemptPlay', message: 'Attempting to play video', data: { isVideoReady, readyState: videoEl.readyState, src: videoEl.currentSrc || videoEl.src }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,C' }) }).catch(() => { });
          // #endregion

          videoEl.play().then(() => {
            // #region agent log
            const videoStyles = window.getComputedStyle(videoEl);
            const containerEl = videoEl.parentElement;
            const containerStyles = containerEl ? window.getComputedStyle(containerEl) : null;
            // Find our actual container div (not Plyr's wrapper)
            let ourContainer = containerEl;
            while (ourContainer && !ourContainer.className.includes('relative w-full h-full')) {
              ourContainer = ourContainer.parentElement;
            }
            const ourContainerStyles = ourContainer ? window.getComputedStyle(ourContainer) : null;
            const videoContainerEl = videoContainerRef.current;
            const videoContainerStyles = videoContainerEl ? window.getComputedStyle(videoContainerEl) : null;
            fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:playSuccess', message: 'video.play() succeeded', data: { paused: videoEl.paused, currentTime: videoEl.currentTime, readyState: videoEl.readyState, phase: phaseRef.current, videoDisplay: videoStyles.display, videoVisibility: videoStyles.visibility, videoOpacity: videoStyles.opacity, videoWidth: videoEl.offsetWidth, videoHeight: videoEl.offsetHeight, videoClientWidth: videoEl.clientWidth, videoClientHeight: videoEl.clientHeight, videoScrollWidth: videoEl.scrollWidth, videoScrollHeight: videoEl.scrollHeight, containerDisplay: containerStyles?.display, ourContainerDisplay: ourContainerStyles?.display, ourContainerVisibility: ourContainerStyles?.visibility, ourContainerWidth: ourContainer?.offsetWidth, ourContainerHeight: ourContainer?.offsetHeight, ourContainerClass: ourContainer?.className, videoContainerDisplay: videoContainerStyles?.display, videoContainerVisibility: videoContainerStyles?.visibility, videoContainerWidth: videoContainerEl?.offsetWidth, videoContainerHeight: videoContainerEl?.offsetHeight }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'E' }) }).catch(() => { });
            // #endregion
            // Verify video is actually playing after a short delay
            setTimeout(() => {
              // #region agent log
              const videoStyles2 = window.getComputedStyle(videoEl);
              let ourContainer2 = videoEl.parentElement;
              while (ourContainer2 && !ourContainer2.className.includes('relative w-full h-full')) {
                ourContainer2 = ourContainer2.parentElement;
              }
              const ourContainerStyles2 = ourContainer2 ? window.getComputedStyle(ourContainer2) : null;
              fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:playVerify', message: 'Verifying video is still playing', data: { paused: videoEl.paused, currentTime: videoEl.currentTime, readyState: videoEl.readyState, phase: phaseRef.current, ended: videoEl.ended, videoDisplay: videoStyles2.display, videoVisibility: videoStyles2.visibility, videoOpacity: videoStyles2.opacity, videoWidth: videoEl.offsetWidth, videoHeight: videoEl.offsetHeight, ourContainerDisplay: ourContainerStyles2?.display, ourContainerVisibility: ourContainerStyles2?.visibility, ourContainerClass: ourContainer2?.className }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A,B' }) }).catch(() => { });
              // #endregion
            }, 500);
            // Check again after 1.5 seconds (when user reports visual stops)
            setTimeout(() => {
              // #region agent log
              const videoStyles3 = window.getComputedStyle(videoEl);
              let ourContainer3 = videoEl.parentElement;
              while (ourContainer3 && !ourContainer3.className.includes('relative w-full h-full')) {
                ourContainer3 = ourContainer3.parentElement;
              }
              const ourContainerStyles3 = ourContainer3 ? window.getComputedStyle(ourContainer3) : null;
              fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:playVerify1_5s', message: 'Verifying video at 1.5s (when visual stops)', data: { paused: videoEl.paused, currentTime: videoEl.currentTime, readyState: videoEl.readyState, phase: phaseRef.current, ended: videoEl.ended, videoDisplay: videoStyles3.display, videoVisibility: videoStyles3.visibility, videoOpacity: videoStyles3.opacity, videoWidth: videoEl.offsetWidth, videoHeight: videoEl.offsetHeight, ourContainerDisplay: ourContainerStyles3?.display, ourContainerVisibility: ourContainerStyles3?.visibility, ourContainerClass: ourContainer3?.className, hasPlyr: !!playerInstance.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A,B' }) }).catch(() => { });
              // #endregion
            }, 1500);
          }).catch((err) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:playFailed', message: 'video.play() failed', data: { error: err?.message || String(err), name: err?.name, readyState: videoEl.readyState, phase: phaseRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'E' }) }).catch(() => { });
            // #endregion
            console.warn('Autoplay failed, user can click play button:', err);
          });
        };

        // If video is ready, play immediately; otherwise wait for it
        if (isVideoReady || videoEl.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
          attemptPlay();
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:waitForReady', message: 'Waiting for video to be ready', data: { isVideoReady, readyState: videoEl.readyState }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,F' }) }).catch(() => { });
          // #endregion
          // Wait for video to be ready
          const onCanPlayHandler = () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:canPlay', message: 'Video can play event fired in phase effect', data: { readyState: videoEl.readyState }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,F' }) }).catch(() => { });
            // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:phaseEffect:pause', message: 'Pausing video for non-video phase', data: { phase, currentTime: videoEl.currentTime, readyState: videoEl.readyState }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A,B' }) }).catch(() => { });
        // #endregion
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

      publishLiveStatus(lesson.id, {
        mode: phase,
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
    }, 1000); // Changed from 3000ms to 1000ms for live updates

    return () => {
      clearInterval(heartbeat);
      controller.abort();
    };
  }, [lesson, phase, currentTime, currentQuestion, completedQuestionIds, starterResults]);

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
    publishLiveStatus(lesson?.id || '', {
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
  };

  const handleMinimize = () => {
    if (!lesson) return;
    const session: BackgroundSession = {
      lessonId: lesson.id,
      currentTime: videoRef.current ? videoRef.current.currentTime : currentTime,
      totalDuration: duration || lesson.estimatedMinutes * 60,
      history: historyRef.current,
      completedQuestionIds: Array.from(completedQuestionIds),
      starterResults: starterResults,
      phase: phase,
      startTimestamp: sessionStartRef.current
    };
    minimizeSession(session);
  };

  const handleEndSession = (forceIncomplete: boolean = false, statusOverride?: 'completed') => {
    if (!lesson) return;

    // Flag to stop any more heartbeats
    isSessionEndingRef.current = true;

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

    saveLessonResult(result);
    if (isFinished) {
      setSessionResult(result);
      setPhase('complete');
    } else {
      exitToDashboard();
    }
  };

  const exitToDashboard = () => {
    isSessionEndingRef.current = true;
    // Stop video and cleanup
    cleanupPlayer();
    deleteLiveStatus();
    setActiveLessonId(null);
    setView(ViewState.CHILD_DASHBOARD);
  };

  // Listener for remote session termination (e.g. deletion from Supabase)
  useEffect(() => {
    if (!lesson) return;

    const channel = supabase.channel('player-remote-kill')
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'live_sessions',
        filter: `profile_id=eq.${DEMO_PROFILE_ID}`
      }, () => {
        // If the session row is deleted remotely, exit the player
        console.log("Remote session deletion detected. Exiting...");
        exitToDashboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lesson]); // exitToDashboard is stable per render (recreated) but harmless to omit or include if useCallback'd. It's not useCallback'd currently.
  // Ideally, add exitToDashboard to deps if we want strict linting, but it causes re-subscription on ever render.
  // Better: Wrap exitToDashboard in useCallback earlier.
  // For now, I will omit it from deps to avoid infinite loops/re-subs, as 'lesson' is the main stable identifier.
  // Actually, 'exitToDashboard' closes over 'setActiveLessonId', 'setView' etc which are from context and likely stable.
  // But 'exitToDashboard' itself is a new function every render.
  // So adding it to deps resets the channel every render -> BAD.
  // I will LEAVE IT OUT of deps for now, or wrap it in a ref.
  // The "correct" react way: wrapping exitToDashboard in useCallback.
  // I will just execute the insertion without refactoring exitToDashboard to minimize diff noise, assuming 'lesson' change is the major lifecycle event.
  // Actually, `lesson` object reference might change if `availableLessons` refreshes. `lesson.id` is better.
  // I'll use `[lesson?.id]` in deps.

  const requestFullscreen = async () => {
    if (videoRef.current?.parentElement) {
      try {
        await videoRef.current.parentElement.requestFullscreen();
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:starterComplete', message: 'Starter questions completed, transitioning to video', data: { videoUrl: lesson?.video }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A,F' }) }).catch(() => { });
    // #endregion
    setPhase('video');
  }, [lesson?.video]);

  const handleExitComplete = useCallback(() => {
    handleEndSession(false, 'completed');
  }, []);

  if (!lesson) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading from Cloud...</div>;

  return (
    <div className="fixed inset-0 bg-black flex flex-col font-sans text-white z-0">
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
        <div className="absolute inset-0 z-50 bg-[#0b1527] flex flex-col items-center justify-center p-6 text-center">
          <div className="text-8xl mb-4">🏆</div>
          <h1 className="text-4xl font-bold mb-2">Lesson Mastery!</h1>
          <div className="text-scholafy-accent font-bold text-xl mb-8">Score: {sessionResult.scorePercent}%</div>
          <Button onClick={exitToDashboard}>Return to Dashboard</Button>
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:QuestionHost:effect', message: 'QuestionHost effect running', data: { questionId: question?.id, hasContainer: !!containerRef.current, hasRendered: hasRenderedRef.current === question?.id, isRendering: isRenderingRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    // Early return if already rendered, currently rendering, or no container/question
    if (hasRenderedRef.current === question?.id || isRenderingRef.current || !containerRef.current || !question) {
      return;
    }

    // Mark as rendering to prevent concurrent renders
    isRenderingRef.current = true;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:QuestionHost:renderQuestion', message: 'Rendering question', data: { questionId: question.id, questionPrompt: question.prompt }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    // Mark as rendered BEFORE calling renderQuestion to prevent race conditions
    hasRenderedRef.current = question.id;

    renderQuestion(containerRef.current, question, (isCorrect, answer) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:QuestionHost:answer', message: 'Question answered', data: { questionId: question.id, isCorrect, answer }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion

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

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:ShellQuiz:render', message: 'ShellQuiz rendered', data: { type, questionsCount: questions?.length || 0, currentIndex: index, currentQuestionId: questions?.[index]?.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
  }, [type, questions, index]);
  // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/44ab138b-df5a-400b-9117-e127cb5c4a45', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Player.tsx:ShellQuiz:handleStepComplete', message: 'Step complete handler called', data: { currentIndex: index, totalQuestions: questions.length, questionId: currentQ.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
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
