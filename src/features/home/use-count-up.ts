import { useEffect, useState } from 'react';

const DEFAULT_DURATION_MS = 1100;

/**
 * Anima um número de 0 até `target` com easing cúbico (ease-out),
 * usando requestAnimationFrame. Reinicia quando `target` ou a duração mudam.
 */
export function useCountUp(target: number, durationMs: number = DEFAULT_DURATION_MS): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let frame: number;

    const step = (now: number) => {
      if (startTime === null) startTime = now;
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
