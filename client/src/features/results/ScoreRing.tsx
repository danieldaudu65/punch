import { motion } from 'framer-motion';
import { useCountUp } from '../../hooks/useCountUp';

const SIZE = 132;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringColour(percentage: number) {
  if (percentage >= 80) return 'var(--mint)';
  if (percentage >= 50) return 'var(--gold)';
  return 'var(--coral)';
}

export function ScoreRing({ percentage, animate }: { percentage: number; animate: boolean }) {
  const shown = useCountUp(percentage, { enabled: animate, delay: 0.9, duration: 1.1 });
  const offset = CIRCUMFERENCE * (1 - percentage / 100);

  return (
    <div className="score-ring" role="img" aria-label={`${percentage}% correct`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--ink-700)" strokeWidth={STROKE} />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={ringColour(percentage)}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: animate ? CIRCUMFERENCE : offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ delay: 0.9, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <span className="score-ring__value" aria-hidden="true">
        {shown}%
      </span>
    </div>
  );
}
