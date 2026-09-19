import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigation requests that arrived before the navigator existed.
 *
 * A notification tapped from a cold start resolves well before the container
 * mounts, so the request has to wait somewhere. Only the most recent one is
 * kept - if two arrive before the app is up, the second is the one the learner
 * actually chose.
 */
let pending: (() => void) | undefined;

/** Runs now if the navigator is ready, otherwise as soon as it is. */
export const navigateWhenReady = (action: () => void): void => {
  if (navigationRef.isReady()) {
    action();
    return;
  }
  pending = action;
};

/** Called by the container's `onReady`; flushes anything that arrived early. */
export const flushPendingNavigation = (): void => {
  const action = pending;
  pending = undefined;
  action?.();
};
