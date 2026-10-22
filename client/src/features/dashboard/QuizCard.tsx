import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Cpu, Landmark, ListChecks, Timer, Wallet, type LucideIcon } from 'lucide-react';
import { TiltCard } from '../../components/TiltCard';
import { minutesLabel } from '../../lib/format';
import type { QuizListItem } from '../../lib/types';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'General Knowledge': Landmark,
  Technology: Cpu,
  'Financial Literacy': Wallet,
};

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

export function QuizCard({ quiz }: { quiz: QuizListItem }) {
  const Icon = CATEGORY_ICONS[quiz.category] ?? BookOpen;
  const { completed, bestPercentage } = quiz.progress;

  return (
    <TiltCard className="quiz-card-tilt">
      {/* Children sit at different depths (see dashboard.css), so the tilt reads as layers. */}
      <article className={`quiz-card quiz-card--${quiz.accent}`} aria-labelledby={`quiz-${quiz.id}`}>
        <div className="quiz-card__top">
          <span className="quiz-card__icon" aria-hidden="true">
            <Icon size={22} strokeWidth={2.25} />
          </span>
          <span className="quiz-card__category">
            {quiz.category}, {DIFFICULTY_LABEL[quiz.difficulty].toLowerCase()}
          </span>
        </div>

        <h3 id={`quiz-${quiz.id}`} className="quiz-card__title">
          {quiz.title}
        </h3>
        <p className="quiz-card__description">{quiz.description}</p>

        <ul className="quiz-card__meta">
          <li>
            <ListChecks size={15} aria-hidden="true" />
            {quiz.questionCount} questions
          </li>
          <li>
            <Timer size={15} aria-hidden="true" />
            {minutesLabel(quiz.timeLimitSec)}
          </li>
          <li className="quiz-card__xp">
            <span className="xp-pill__coin" aria-hidden="true" />
            Up to {quiz.maxXp} XP
          </li>
        </ul>

        <div className="quiz-card__footer">
          {completed ? (
            <>
              <p className="quiz-card__status">
                <CheckCircle2 size={16} aria-hidden="true" />
                Best score {bestPercentage}%
              </p>
              <Link to={`/quiz/${quiz.id}`} className="btn btn--quiet btn--small">
                Practise again
              </Link>
            </>
          ) : (
            <Link to={`/quiz/${quiz.id}`} className="btn btn--primary btn--block">
              Start quiz
            </Link>
          )}
        </div>
      </article>
    </TiltCard>
  );
}
