import { useEffect, useRef, type CSSProperties } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Zap } from 'lucide-react';

// Discs stacked between the two faces. More layers = smoother rim, more DOM.
const EDGE_LAYERS = 14;
const MAX_TILT_DEG = 26;

interface MedallionProps {
  size?: number;
  caption?: string;
  /** Spin in when first shown. Off when the coin is re-rendered in place. */
  entrance?: boolean;
}

/**
 * A gold XP coin drawn with CSS 3D transforms: no canvas, no WebGL, no images.
 * It spins in once, floats, and tilts toward the pointer.
 * With "reduce motion" switched on it simply sits still.
 */
export function Medallion({ size = 260, caption = '+10 XP', entrance = true }: MedallionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Pointer position relative to the coin, from -1 to 1 on each axis.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const spring = { stiffness: 120, damping: 14, mass: 0.6 };
  const rotateY = useSpring(useTransform(pointerX, [-1, 1], [-MAX_TILT_DEG, MAX_TILT_DEG]), spring);
  const rotateX = useSpring(useTransform(pointerY, [-1, 1], [MAX_TILT_DEG * 0.8, -MAX_TILT_DEG * 0.8]), spring);
  // The light band moves across the face as the coin turns.
  const shinePosition = useTransform(rotateY, [-MAX_TILT_DEG, MAX_TILT_DEG], ['100%', '0%']);

  useEffect(() => {
    if (reduceMotion) return;

    // Window-level, so the coin reacts while the student moves toward the form.
    function handlePointerMove(event: PointerEvent) {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clamp = (n: number) => Math.max(-1, Math.min(1, n));
      pointerX.set(clamp((event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2)));
      pointerY.set(clamp((event.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2)));
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [reduceMotion, pointerX, pointerY]);

  const depth = Math.round(size * 0.09);
  const animate = !reduceMotion;

  return (
    <motion.div
      ref={rootRef}
      className="medallion"
      style={{ '--size': `${size}px`, '--depth': `${depth}px` } as CSSProperties}
      initial={animate && entrance ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    >
      <motion.div
        className="medallion__float"
        animate={animate ? { y: [0, -size * 0.04, 0] } : undefined}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="medallion__spin"
          initial={animate && entrance ? { rotateY: -720, y: -size * 0.25 } : false}
          animate={{ rotateY: 0, y: 0 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div className="medallion__coin" style={animate ? { rotateX, rotateY } : { rotateX: 10, rotateY: -20 }}>
            {Array.from({ length: EDGE_LAYERS }, (_, i) => (
              <span
                key={i}
                className="medallion__edge"
                style={{ transform: `translateZ(${(i / (EDGE_LAYERS - 1) - 0.5) * depth}px)` }}
              />
            ))}
            <div className="medallion__face medallion__face--back" />
            <div className="medallion__face medallion__face--front">
              <div className="medallion__ring">
                <Zap className="medallion__glyph" fill="currentColor" strokeWidth={1.5} />
                <span className="medallion__value">{caption}</span>
              </div>
              <motion.span className="medallion__shine" style={{ backgroundPositionX: shinePosition }} />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
      <motion.div
        className="medallion__shadow"
        animate={animate ? { scaleX: [1, 0.86, 1], opacity: [1, 0.7, 1] } : undefined}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
