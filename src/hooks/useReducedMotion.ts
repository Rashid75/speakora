import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the device is set to reduce motion.
 *
 * Read from the OS rather than from app settings. This used to be a switch in
 * Settings that nothing ever synced, which meant a learner who had turned
 * reduce-motion on system-wide still got every animation until they found and
 * flipped a second, app-only toggle. One source of truth, and it is the one the
 * platform already asks people about.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduced(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return reduced;
}
