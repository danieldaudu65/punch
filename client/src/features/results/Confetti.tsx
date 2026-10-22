import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLOURS = ['var(--gold)', 'var(--gold-light)', 'var(--punch)', 'var(--violet)', 'var(--mint)'];
const PIECES = 30;

/** A one-off burst from behind the coin. Pure DOM, no library, no canvas. */
export function Confetti() {
  // Fixed per mount, so re-renders do not reshuffle the pieces mid-flight.
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 110 + Math.random() * 110;
        return {
          x: Math.cos(angle) * distance,
          // Pieces drift down after the burst, as if falling.
          y: Math.sin(angle) * distance * 0.75 + 90,
          rotate: (Math.random() - 0.5) * 540,
          colour: COLOURS[i % COLOURS.length],
          width: 6 + Math.random() * 6,
          delay: 0.55 + Math.random() * 0.15,
        };
      }),
    [],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, i) => (
        <motion.span
          key={i}
          className="confetti__piece"
          style={{ background: piece.colour, width: piece.width, height: piece.width * 0.45 }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
          animate={{ x: piece.x, y: piece.y, opacity: [0, 1, 1, 0], rotate: piece.rotate, scale: 1 }}
          transition={{ delay: piece.delay, duration: 1.7, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.1, 0.75, 1] }}
        />
      ))}
    </div>
  );
}
