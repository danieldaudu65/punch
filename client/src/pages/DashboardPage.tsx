import { motion, useReducedMotion } from 'framer-motion';
import { Medallion } from '../components/Medallion';
import { LoadError, Skeleton } from '../components/QueryState';
import { BadgeList } from '../features/dashboard/BadgeList';
import { LevelProgress } from '../features/dashboard/LevelProgress';
import { QuizCard } from '../features/dashboard/QuizCard';
import { RecentAttempts } from '../features/dashboard/RecentAttempts';
import { useDashboard, useQuizzes } from '../features/quiz/quiz.api';
import { useCountUp } from '../hooks/useCountUp';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { firstName } from '../lib/format';
import { revealContainer, revealItem } from '../lib/motion';
import type { Dashboard } from '../lib/types';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const dashboard = useDashboard();

  if (dashboard.isError) {
    return <LoadError error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  }

  if (dashboard.isPending) {
    return (
      <div className="dash" aria-busy="true">
        <Skeleton height={220} />
        <div className="dash-stats">
          <Skeleton height={104} />
          <Skeleton height={104} />
          <Skeleton height={104} />
        </div>
        <Skeleton height={300} />
      </div>
    );
  }

  return <DashboardView data={dashboard.data} />;
}

function DashboardView({ data }: { data: Dashboard }) {
  const quizzes = useQuizzes();
  const reduceMotion = useReducedMotion();
  const isNarrow = useMediaQuery('(max-width: 640px)');
  const { student, stats, badges, recentAttempts } = data;

  const animate = !reduceMotion;
  const xpShown = useCountUp(stats.xp, { enabled: animate, delay: 0.35, duration: 1.2 });

  return (
    // The whole screen arrives as one staggered sequence, top to bottom.
    <motion.div
      className="dash"
      variants={revealContainer}
      initial={animate ? 'hidden' : false}
      animate="show"
    >
      <motion.section className="dash-hero" aria-labelledby="dash-greeting" variants={revealItem}>
        <div className="dash-hero__text">
          <h1 id="dash-greeting" className="dash-hero__greeting">
            Hi, {firstName(student.name)}
          </h1>
          <p className="dash-hero__xp">
            <span className="dash-hero__xp-number">{xpShown.toLocaleString()}</span> XP earned
          </p>
          <LevelProgress xp={stats.xp} level={stats.level} />
        </div>
        <div className="dash-hero__coin">
          <Medallion size={isNarrow ? 110 : 170} caption={`Lv ${stats.level.level}`} />
        </div>
      </motion.section>

      <motion.section className="dash-stats" aria-label="Your stats" variants={revealContainer}>
        <motion.div className="stat" variants={revealItem}>
          <p className="stat__label">Quizzes completed</p>
          <p className="stat__value">
            {stats.quizzesCompleted}
            <span className="stat__of"> of {stats.totalQuizzes}</span>
          </p>
        </motion.div>
        <motion.div className="stat" variants={revealItem}>
          <p className="stat__label">Average score</p>
          <p className="stat__value">{stats.averageScore === null ? 'None yet' : `${stats.averageScore}%`}</p>
          <p className="stat__note">First attempts only</p>
        </motion.div>
        <motion.div className="stat" variants={revealItem}>
          <p className="stat__label">Leaderboard rank</p>
          <p className="stat__value">
            #{stats.rank}
            <span className="stat__of"> of {stats.totalStudents}</span>
          </p>
        </motion.div>
      </motion.section>

      <motion.section className="dash-section" aria-labelledby="quizzes-heading" variants={revealItem}>
        <div className="dash-section__head">
          <h2 id="quizzes-heading">Quizzes</h2>
          <p>XP is paid on your first go. Retakes are for practice.</p>
        </div>
        {quizzes.isError ? (
          <LoadError error={quizzes.error} onRetry={() => void quizzes.refetch()} />
        ) : quizzes.isPending ? (
          <div className="quiz-grid">
            <Skeleton height={300} />
            <Skeleton height={300} />
            <Skeleton height={300} />
          </div>
        ) : (
          <motion.div
            className="quiz-grid"
            variants={revealContainer}
            initial={animate ? 'hidden' : false}
            animate="show"
          >
            {quizzes.data.map((quiz) => (
              <motion.div key={quiz.id} variants={revealItem} className="quiz-grid__item">
                <QuizCard quiz={quiz} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      <motion.div className="dash-columns" variants={revealItem}>
        <section className="dash-section panel" aria-labelledby="badges-heading">
          <div className="dash-section__head">
            <h2 id="badges-heading">Badges</h2>
            <p>
              {stats.badgesEarned} of {stats.totalBadges} earned
            </p>
          </div>
          <BadgeList badges={badges} />
        </section>

        <section className="dash-section panel" aria-labelledby="recent-heading">
          <div className="dash-section__head">
            <h2 id="recent-heading">Recent quizzes</h2>
          </div>
          <RecentAttempts attempts={recentAttempts} />
        </section>
      </motion.div>
    </motion.div>
  );
}
