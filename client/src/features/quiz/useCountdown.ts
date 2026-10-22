import { useEffect, useRef, useState } from 'react';

/**
 * Seconds left until `endsAt` (an ISO time from the server), ticking once a
 * second. Calls `onExpire` once when it reaches zero. The server keeps the
 * real clock and allows a short grace period, so small clock differences
 * between phone and server do not matter.
 */
export function useCountdown(endsAt: string | undefined, onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!endsAt) return;
    const deadline = new Date(endsAt).getTime();
    let fired = false;

    function tick() {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !fired) {
        fired = true;
        expireRef.current();
      }
    }

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return secondsLeft;
}

export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
