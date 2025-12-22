// Data Contracts based on JSON provided and Player Logic

export interface Lesson {
  id: string;
  title: string;
  year: number;
  subject: string;
  curriculumStrand: string; // e.g., "Number", "Geometry", "Grammar"
  goal: string;
  video: string; // URL
  estimatedMinutes: number;
  starterPolicy: Policy;
  exitPolicy: Policy;
  starters: Question[];
  questions: Question[];
  exits: Question[];
}

export interface Quote {
  text: string;
  source: string;
}

export interface Policy {
  require: 'all' | 'any';
  minScore: number;
}

export interface Question {
  id: string;
  type: 'choice' | 'multi-choice' | 'cloze' | 'match' | 'order';
  prompt: string;
  time?: number; // For in-video cues
  image?: string;

  // Choice
  options?: Option[];
  buttons?: Option[];

  // Cloze
  clozeText?: string; // "The [cat] sat on the [mat]"

  // Match
  pairs?: { left: string; right: string; leftImage?: string; rightImage?: string }[];

  // Order
  items?: { id: string; content: string }[];
  correctOrder?: string[]; // Array of item IDs in correct sequence

  feedback?: { correct: string; wrong: string };
  hint?: string;
}

export interface Option {
  label: string;
  correct: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
}

// Analytics & State Types

export interface LiveStatus {
  lessonId: string;
  mode: 'idle' | 'video' | 'question' | 'starter' | 'exit';
  t?: number; // Current timestamp in video
  total?: number; // Total duration
  qIndex?: number;
  qTotal?: number;
  qText?: string;
  stats?: {
    starters: boolean[]; // Array of results (true=correct, false=wrong)
    questionsAnswered: number;
    questionsTotal: number;
    starterCount?: number;
    videoQuestionCount?: number;
    exitCount?: number;
  };
  history: QuestionRecord[]; // Real-time feed of answers
  lastUpdate: number;
  alerts: AlertType[];
}

export type AlertType = 'guessing' | 'stalled' | 'rushing' | 'disengaged';

// Historical Results
export interface LessonResult {
  lessonId: string;
  status: 'completed' | 'incomplete';
  timestamp: number;
  durationSeconds: number;
  scorePercent: number;
  records: QuestionRecord[];
  xpEarned: number;
  badgesEarned?: Badge[]; // New badges won this session
}

export interface QuestionRecord {
  questionId: string;
  phase: 'starter' | 'video' | 'exit';
  prompt: string;
  isCorrect: boolean;
  answer?: string | string[]; // child's submitted answer (optional for backward compatibility)
  timestamp: number;
  timestampStr?: string; // formatted time
  questionDurationSeconds?: number; // Time spent on this question
}

// Background Session State (For minimizing)
export interface BackgroundSession {
  lessonId: string;
  currentTime: number;
  totalDuration: number;
  history: QuestionRecord[];
  completedQuestionIds: string[]; // JSON stringified set
  starterResults: boolean[];
  phase: 'starter' | 'video' | 'question' | 'exit' | 'complete';
  startTimestamp: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface ChildProfile {
  name: string;
  yearGroup: number;
  streakDays: number;
  xp: number;
  level: number;
  badges: string[]; // IDs of earned badges
}

export interface SubjectStats {
  total: number;
  completed: number;
  percent: number;
}

export interface CurriculumStats {
  totalLessons: number;
  completedLessons: number;
  averageScore: number;
  currentStandard: 'WTS' | 'EXS' | 'GDS'; // Working Towards, Expected, Greater Depth
  completionPercent: number;
  subjects: Record<string, SubjectStats>; // Breakdown by subject
}

export enum ViewState {
  LANDING,
  ROLE_SELECT,
  PARENT_DASHBOARD,
  CHILD_DASHBOARD,
  PLAYER
}