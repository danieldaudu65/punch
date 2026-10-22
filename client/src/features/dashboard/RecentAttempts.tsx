import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { timeAgo } from '../../lib/format';
import type { AttemptSummary } from '../../lib/types';

export function RecentAttempts({ attempts }: { attempts: AttemptSummary[] }) {
  if (attempts.length === 0) {
    return (
      <div className="empty-note">
        <p>No quizzes yet. Each one takes about 5 minutes, and every right answer is worth 10 XP.</p>
      </div>
    );
  }

  return (
    <ul className="attempt-list">
      {attempts.map((attempt) => (
        <li key={attempt.attemptId}>
          <Link to={`/results/${attempt.attemptId}`} className="attempt-row">
            <span className="attempt-row__title">{attempt.quiz?.title ?? 'Quiz removed'}</span>
            <span className="attempt-row__score">
              {attempt.correctCount}/{attempt.totalQuestions}
            </span>
            <span className={clsx('attempt-row__xp', attempt.isPractice && 'attempt-row__xp--practice')}>
              {attempt.isPractice ? 'Practice' : `+${attempt.xpAwarded} XP`}
            </span>
            <ChevronRight className="attempt-row__arrow" size={18} aria-hidden="true" />
            <span className="attempt-row__when">{timeAgo(attempt.submittedAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
