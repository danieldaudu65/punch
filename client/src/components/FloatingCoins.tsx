import { useEffect } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Each coin sits at a different "distance": far ones are small, blurred and
// move little; near ones are larger, sharp and move more. That difference in
// speed is what makes the scene read as 3D depth (parallax).
const COINS = [
  { top: '6%', left: '62%', size: 46, depth: 0.9, blur: 0, delay: 0 },
  { top: '58%', left: '74%', size: 30, depth: 0.5, blur: 1.5, delay: 1.2 },
  { top: '74%', left: '4%', size: 22, depth: 0.3, blur: 3, delay: 2.1 },
  { top: '14%', left: '2%', size: 18, depth: 0.2, blur: 4, delay: 0.6 },
];

function Coin({
  coin,
  pointerX,
  pointerY,
}: {
  coin: (typeof COINS)[number];
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}) {
  const x = useTransform(pointerX, (v) => v * 40 * coin.depth);
  const y = useTransform(pointerY, (v) => v * 30 * coin.depth);

  return (
    <motion.span
      className="floating-coin"
      style={{
        top: coin.top,
        left: coin.left,
        width: coin.size,
        height: coin.size,
        x,
        y,
        filter: coin.blur ? `blur(${coin.blur}px)` : undefined,
        opacity: 0.35 + coin.depth * 0.6,
      }}
    >
      <motion.span
        className="floating-coin__face"
        animate={{ y: [0, -10, 0], rotateY: [0, 180, 360] }}
        transition={{ duration: 7 + coin.delay, repeat: Infinity, ease: 'easeInOut', delay: coin.delay }}
      />
    </motion.span>
  );
}

/** Small gold coins drifting behind the hero, shifting with the pointer. Desktop only. */
export function FloatingCoins() {
  const reduceMotion = useReducedMotion();
  const hasMouse = useMediaQuery('(hover: hover) and (pointer: fine)');
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const pointerX = useSpring(rawX, { stiffness: 60, damping: 18 });
  const pointerY = useSpring(rawY, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduceMotion || !hasMouse) return;
    function handleMove(event: PointerEvent) {
      // -1 to 1 across the window. Coins move against the pointer, like distant objects.
      rawX.set(-((event.clientX / window.innerWidth) * 2 - 1));
      rawY.set(-((event.clientY / window.innerHeight) * 2 - 1));
    }
    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => window.removeEventListener('pointermove', handleMove);
  }, [reduceMotion, hasMouse, rawX, rawY]);

  if (reduceMotion || !hasMouse) return null;

  return (
    <div className="floating-coins" aria-hidden="true">
      {COINS.map((coin, i) => (
        <Coin key={i} coin={coin} pointerX={pointerX} pointerY={pointerY} />
      ))}
    </div>
  );
}
