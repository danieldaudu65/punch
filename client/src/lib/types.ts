/** Shapes returned by the API. Kept in one place so every screen agrees. */

export interface EarnedBadge {
  key: string;
  earnedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  xp: number;
  quizzesCompleted: number;
  badges: EarnedBadge[];
  createdAt: string;
  updatedAt: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  minXp: number;
  nextLevelXp: number | null;
  nextLevelTitle: string | null;
  progressPercent: number;
}

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface Badge {
  key: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
}

export interface DashboardBadge extends Badge {
  earned: boolean;
  earnedAt: string | null;
}

export interface AttemptSummary {
  attemptId: string;
  quiz: { id: string; title: string } | null;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  xpAwarded: number;
  isPractice: boolean;
  submittedAt: string;
}

export interface Dashboard {
  student: { id: string; name: string; email: string };
  stats: {
    xp: number;
    level: LevelInfo;
    quizzesCompleted: number;
    totalQuizzes: number;
    averageScore: number | null;
    rank: number;
    totalStudents: number;
    badgesEarned: number;
    totalBadges: number;
  };
  badges: DashboardBadge[];
  recentAttempts: AttemptSummary[];
}

export type QuizAccent = 'red' | 'gold' | 'violet';

export interface QuizListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  accent: QuizAccent;
  timeLimitSec: number;
  questionCount: number;
  maxXp: number;
  progress: {
    completed: boolean;
    attempts: number;
    bestPercentage: number | null;
  };
}

/** A question as the student sees it while taking a quiz: no answer included. */
export interface QuizQuestion {
  key: string;
  prompt: string;
  options: string[];
}

export interface QuizSession {
  resumed: boolean;
  attemptId: string;
  startedAt: string;
  endsAt: string;
  timeLimitSec: number;
  isPractice: boolean;
  quiz: { id: string; title: string; description: string };
  questions: QuizQuestion[];
}

export interface SubmittedAnswer {
  questionKey: string;
  selectedIndex: number;
}

export interface QuestionReview {
  questionKey: string;
  prompt: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
}

export interface AttemptResult {
  attemptId: string;
  quiz: { id: string; title: string };
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  durationSec: number;
  xpAwarded: number;
  isPractice: boolean;
  submittedAt: string;
  review: QuestionReview[];
}

/** Returned only straight after a submit: what changed, so it can be celebrated. */
export interface SubmitResult extends AttemptResult {
  newBadges: Badge[];
  leveledUp: boolean;
  student: { xp: number; quizzesCompleted: number; level: LevelInfo };
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  xp: number;
  level: number;
  levelTitle: string;
  quizzesCompleted: number;
  badgeCount: number;
  isMe: boolean;
}

export interface Leaderboard {
  top: LeaderboardEntry[];
  me: LeaderboardEntry;
  totalStudents: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
}
