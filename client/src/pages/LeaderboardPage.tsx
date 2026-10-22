import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, Crown } from 'lucide-react';
import { LoadError, Skeleton } from '../components/QueryState';
import { useLeaderboard } from '../features/leaderboard/leaderboard.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { revealContainer, revealItem } from '../lib/motion';
import type { LeaderboardEntry } from '../lib/types';

// Waits for the podium to rise, then cascades the rows.
const boardReveal = { hidden: {}, show: { transition: { delayChildren: 0.6, staggerChildren: 0.06 } } };

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <ol className="podium" aria-label="Top three">
      {entries.map((entry, i) => (
        <li key={entry.id} className={clsx('podium__place', `podium__place--${i + 1}`, entry.isMe && 'podium__place--me')}>
          <div className="podium__avatar-wrap">
            {i === 0 && (
              // A crown that bobs gently above the leader.
              <motion.span
                className="podium__crown"
                aria-hidden="true"
                animate={reduceMotion ? undefined : { y: [0, -5, 0], rotate: [-6, 6, -6] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Crown size={26} fill="currentColor" strokeWidth={1.5} />
              </motion.span>
            )}
            <motion.span
              className="avatar podium__avatar"
              aria-hidden="true"
              initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: ([0.45, 0.1, 0.25][i] ?? 0) + 0.35, type: 'spring', stiffness: 300, damping: 16 }}
            >
              {initial(entry.name)}
            </motion.span>
          </div>
          <p className="podium__name">
            {entry.name}
            {entry.isMe && <span className="you-tag">You</span>}
          </p>
          <p className="podium__xp">{entry.xp.toLocaleString()} XP</p>
          {/* The blocks rise from the floor: second, then third, then first, for a small drumroll. */}
          <motion.div
            className="podium__block"
            initial={reduceMotion ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: [0.45, 0.1, 0.25][i] ?? 0, type: 'spring', stiffness: 140, damping: 18 }}
          >
            <span className="podium__rank">
              <span className="visually-hidden">Rank </span>
              {entry.rank}
            </span>
          </motion.div>
        </li>
      ))}
    </ol>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  return (
    <motion.li className={clsx('board-row', entry.isMe && 'board-row--me')} variants={revealItem}>
      <span className="board-row__rank">
        <span className="visually-hidden">Rank </span>
        {entry.rank}
      </span>
      <span className="avatar board-row__avatar" aria-hidden="true">
        {initial(entry.name)}
      </span>
      <span className="board-row__who">
        <span className="board-row__name">
          {entry.name}
          {entry.isMe && <span className="you-tag">You</span>}
        </span>
        <span className="board-row__level">
          Level {entry.level} {entry.levelTitle}
        </span>
      </span>
      <span className="board-row__badges" title={`${entry.badgeCount} badges`}>
        <Award size={15} aria-hidden="true" />
        {entry.badgeCount}
        <span className="visually-hidden"> badges</span>
      </span>
      <span className="board-row__xp">{entry.xp.toLocaleString()} XP</span>
    </motion.li>
  );
}

export function LeaderboardPage() {
  useDocumentTitle('Leaderboard');
  const board = useLeaderboard(10);
  const reduceMotion = useReducedMotion();

  if (board.isError) return <LoadError error={board.error} onRetry={() => void board.refetch()} />;
  if (board.isPending) {
    return (
      <div className="leaderboard">
        <Skeleton height={260} />
        <Skeleton height={320} />
      </div>
    );
  }

  const { top, me, totalStudents } = board.data;
  // The podium needs three students; with fewer, everyone goes in the list.
  const podium = top.length >= 3 ? top.slice(0, 3) : [];
  const rest = top.length >= 3 ? top.slice(3) : top;
  const meOutsideTop = !top.some((entry) => entry.isMe);
  const hasTies = new Set(top.map((e) => e.rank)).size < top.length;

  return (
    <div className="leaderboard">
      <div className="leaderboard__head">
        <h1>Leaderboard</h1>
        <p>
          {totalStudents} students, ranked by XP. You’re number {me.rank}.
        </p>
      </div>

      {podium.length > 0 && <Podium entries={podium} />}

      {rest.length > 0 && (
        // Rows cascade in after the podium has risen.
        <motion.ol
          className="board"
          aria-label={podium.length ? 'Ranks 4 and below' : 'Rankings'}
          variants={boardReveal}
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
        >
          {rest.map((entry) => (
            <Row key={entry.id} entry={entry} />
          ))}
        </motion.ol>
      )}

      {meOutsideTop && (
        <div className="board-me">
          <p className="board-me__label">Your position</p>
          <motion.ol className="board" variants={revealContainer} initial={reduceMotion ? false : 'hidden'} animate="show">
            <Row entry={me} />
          </motion.ol>
        </div>
      )}

      {hasTies && <p className="leaderboard__note">Students with the same XP share a rank.</p>}
    </div>
  );
}
