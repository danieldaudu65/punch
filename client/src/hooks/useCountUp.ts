import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

interface CountUpOptions {
  enabled?: boolean;
  delay?: number;
  duration?: number;
}

/** Counts from 0 to `target`. When disabled it shows the final number at once. */
export function useCountUp(target: number, { enabled = true, delay = 0, duration = 1.2 }: CountUpOptions = {}) {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    const controls = animate(0, target, {
      delay,
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [target, enabled, delay, duration]);

  return value;
}
