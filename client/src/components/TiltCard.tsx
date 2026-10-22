import { useRef, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import clsx from 'clsx';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees. */
  max?: number;
}

/**
 * Tilts its content toward the pointer, with a soft glare that follows it.
 * Children can sit at different depths with `transform: translateZ(...)`
 * to get a layered, 3D feel. Only on devices with a mouse, and never when
 * "reduce motion" is on: touch screens get the plain card.
 */
export function TiltCard({ children, className, max = 8 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const hasMouse = useMediaQuery('(hover: hover) and (pointer: fine)');
  const enabled = hasMouse && !reduceMotion;

  // Pointer position inside the card, 0 to 1 on each axis; 0.5 is the centre.
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);

  const spring = { stiffness: 220, damping: 20, mass: 0.5 };
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-max, max]), spring);

  const glareX = useTransform(pointerX, (v) => `${v * 100}%`);
  const glareY = useTransform(pointerY, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.13), transparent 55%)`;

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
  }

  function handleLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      className={clsx('tilt', className)}
      style={enabled ? { rotateX, rotateY, transformPerspective: 1000 } : undefined}
      onPointerMove={enabled ? handleMove : undefined}
      onPointerLeave={enabled ? handleLeave : undefined}
      whileHover={enabled ? { y: -6 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {children}
      {enabled && <motion.span className="tilt__glare" style={{ background: glare }} aria-hidden="true" />}
    </motion.div>
  );
}
