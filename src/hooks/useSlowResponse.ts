import { useEffect, useState } from 'react';

/**
 * True once something has been pending for longer than it usually takes.
 *
 * Measured from our own request, not from a network speed reading. A phone can
 * report four bars and still sit behind a captive portal or a throttled link,
 * so the only honest signal for "this is slow" is that the thing we asked for
 * has not arrived yet.
 */
export function useSlowResponse(active: boolean, thresholdMs: number): boolean {
  const [isSlow, setIsSlow] = useState(false);
  const [wasActive, setWasActive] = useState(active);

  // Adjusting state during render rather than in an effect, which is React's
  // documented way to reset state when an input changes: an effect would render
  // once with the stale `true` first, leaving the warning on screen for a frame
  // after the reply had already landed.
  if (wasActive !== active) {
    setWasActive(active);
    setIsSlow(false);
  }

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setIsSlow(true), thresholdMs);
    return () => clearTimeout(id);
  }, [active, thresholdMs]);

  return isSlow;
}
