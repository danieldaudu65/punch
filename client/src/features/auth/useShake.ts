import { useAnimationControls, useReducedMotion } from 'framer-motion';

/** A short side-to-side shake that answers a failed submit. */
export function useShake() {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();

  function shake() {
    if (reduceMotion) return;
    void controls.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.42, ease: 'easeOut' } });
  }

  return { controls, shake };
}
