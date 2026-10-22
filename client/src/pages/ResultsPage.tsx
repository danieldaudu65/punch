import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { Medallion } from '../components/Medallion';
import { LoadError, Skeleton } from '../components/QueryState';
import { useAttemptResult } from '../features/quiz/quiz.api';
import { AnswerReview } from '../features/results/AnswerReview';
import { BadgeUnlocks } from '../features/results/BadgeUnlocks';
import { Confetti } from '../features/results/Confetti';
import { LevelUpBanner } from '../features/results/LevelUpBanner';
import { ScoreRing } from '../features/results/ScoreRing';
import { useCountUp } from '../hooks/useCountUp';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { playSound } from '../lib/sound';
import type { AttemptResult, SubmitResult } from '../lib/types';

// Attempts already celebrated in this tab. Going back to a result later
// shows it calmly instead of replaying the confetti.
const celebrated = new Set<string>();

function isFreshSubmit(result: AttemptResult): result is SubmitResult {
  return 'newBadges' in result;
}

function headlineFor(percentage: number) {
  if (percentage === 100) return 'Perfect score.';
  if (percentage >= 80) return 'Brilliant work.';
  if (percentage >= 50) return 'Solid effort.';
  return 'Keep going.';
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes === 0 ? `${seconds} seconds` : `${minutes} min ${seconds} s`;
}

export function ResultsPage() {
  const { attemptId = '' } = useParams();
  const result = useAttemptResult(attemptId);
  useDocumentTitle('Your result');

  if (result.isError) return <LoadError error={result.error} onRetry={() => void result.refetch()} />;
  if (result.isPending) return <Skeleton height={360} />;

  return <ResultView key={attemptId} result={result.data} />;
}

function ResultView({ result }: { result: AttemptResult }) {
  const reduceMotion = useReducedMotion();
  const isNarrow = useMediaQuery('(max-width: 640px)');

  // Decided once per mount: celebrate only straight after this attempt was submitted.
  // The initializer stays pure because React may call it twice in development.
  const [celebrate] = useState(() => isFreshSubmit(result) && !celebrated.has(result.attemptId));
  useEffect(() => {
    celebrated.add(result.attemptId);
  }, [result.attemptId]);
  const animate = celebrate && !reduceMotion;

  // Sounds follow the same timeline as the animation: coin as the XP counts up,
  // fanfare with the level-up banner, a sparkle as each badge flips in.
  useEffect(() => {
    if (!celebrate || !isFreshSubmit(result)) return;
    const timeline = reduceMotion ? { xp: 0, level: 0.3, badge: 0.6, gap: 0.25 } : { xp: 0.9, level: 1.7, badge: 2, gap: 0.35 };
    const timers: number[] = [];
    const at = (seconds: number, sound: Parameters<typeof playSound>[0]) =>
      timers.push(window.setTimeout(() => playSound(sound), seconds * 1000));

    at(timeline.xp, result.isPractice || result.xpAwarded === 0 ? 'success' : 'coin');
    if (result.leveledUp) at(timeline.level, 'levelUp');
    result.newBadges.forEach((_, i) => at(timeline.badge + i * timeline.gap, 'badge'));

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [celebrate, reduceMotion, result]);

  const fresh = isFreshSubmit(result) ? result : null;
  const xpShown = useCountUp(result.xpAwarded, { enabled: animate, delay: 0.9, duration: 1.1 });
  const { quiz, correctCount, totalQuestions, percentage, durationSec, isPractice, review } = result;

  return (
    <div className="results">
      <section className="celebrate" aria-labelledby="results-title">
        <div className="celebrate__coin">
          {animate && percentage >= 50 && <Confetti />}
          <Medallion
            size={isNarrow ? 132 : 200}
            caption={isPractice ? 'Practice' : `+${result.xpAwarded} XP`}
            entrance={celebrate}
          />
        </div>

        <div className="celebrate__text">
          <p className="celebrate__quiz">{quiz.title}</p>
          <h1 id="results-title" className="celebrate__headline">
            {headlineFor(percentage)}
          </h1>
          <p className="celebrate__line">
            You got {correctCount} out of {totalQuestions} in {formatDuration(durationSec)}.
            {percentage < 50 && ' The review below shows the right answers, so your next go will be better.'}
          </p>

          <div className="celebrate__stats">
            <ScoreRing percentage={percentage} animate={animate} />
            <div className="celebrate__xp">
              {isPractice ? (
                <>
                  <p className="celebrate__xp-value celebrate__xp-value--practice">0 XP</p>
                  <p className="celebrate__xp-label">Practice round. XP is paid on your first go only.</p>
                </>
              ) : (
                <>
                  <p className="celebrate__xp-value">+{xpShown} XP</p>
                  <p className="celebrate__xp-label">
                    {fresh ? `${fresh.student.xp.toLocaleString()} XP in total` : 'Added to your total'}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="celebrate__actions">
            <Link to="/dashboard" className="btn btn--primary">
              Back to dashboard
            </Link>
            <Link to="/leaderboard" className="btn btn--quiet">
              See the leaderboard
            </Link>
          </div>
        </div>
      </section>

      {fresh?.leveledUp && <LevelUpBanner level={fresh.student.level} xp={fresh.student.xp} />}
      {fresh && fresh.newBadges.length > 0 && <BadgeUnlocks badges={fresh.newBadges} />}

      <section className="dash-section" aria-labelledby="review-heading">
        <div className="dash-section__head">
          <h2 id="review-heading">Answer review</h2>
          <Link to={`/quiz/${quiz.id}`} className="results__retake">
            Practise this quiz again
          </Link>
        </div>
        <AnswerReview review={review} />
      </section>
    </div>
  );
}
