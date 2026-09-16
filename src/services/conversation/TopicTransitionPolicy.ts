import type { ConversationMessage } from '@/types';

/**
 * Decides when the AI should steer the conversation somewhere new.
 *
 * The spec asks for a natural topic change after roughly an hour. Time alone is
 * a blunt trigger though - a conversation that has genuinely stalled after
 * fifteen minutes needs a nudge, and one that is flowing at fifty-five minutes
 * does not. So two independent signals can fire it:
 *
 *   1. the configured rotation interval has elapsed since the last transition;
 *   2. the conversation has visibly gone in circles (short, repetitive turns).
 *
 * A cooldown prevents back-to-back transitions, which would feel erratic.
 */

export interface TransitionState {
  /** Minutes elapsed at the last transition. Starts at 0 (conversation start). */
  readonly lastTransitionAtMinutes: number;
  readonly transitionCount: number;
}

export const INITIAL_TRANSITION_STATE: TransitionState = {
  lastTransitionAtMinutes: 0,
  transitionCount: 0,
};

/** Minutes that must pass after any transition before another can fire. */
const COOLDOWN_MINUTES = 8;
/** Below this, a stall is more likely to be a slow start than a dead end. */
const MIN_MINUTES_BEFORE_STALL_TRANSITION = 12;
/** User turns inspected when looking for a stall. */
const STALL_WINDOW = 4;
/** Average words per user turn under which we consider the thread exhausted. */
const STALL_WORD_THRESHOLD = 6;

export interface TransitionDecision {
  readonly shouldTransition: boolean;
  readonly reason: 'interval' | 'stalled' | 'none';
}

export const shouldIntroduceNewTopic = (
  elapsedMinutes: number,
  rotationMinutes: number,
  state: TransitionState,
  recentMessages: readonly ConversationMessage[],
): TransitionDecision => {
  const sinceLast = elapsedMinutes - state.lastTransitionAtMinutes;

  if (sinceLast < COOLDOWN_MINUTES) return { shouldTransition: false, reason: 'none' };

  if (sinceLast >= rotationMinutes) {
    return { shouldTransition: true, reason: 'interval' };
  }

  if (elapsedMinutes >= MIN_MINUTES_BEFORE_STALL_TRANSITION && isStalled(recentMessages)) {
    return { shouldTransition: true, reason: 'stalled' };
  }

  return { shouldTransition: false, reason: 'none' };
};

/**
 * A stall looks like several consecutive very short user replies - the learner
 * has run out of things to say about this thread.
 */
const isStalled = (messages: readonly ConversationMessage[]): boolean => {
  const userTurns = messages.filter((message) => message.role === 'user').slice(-STALL_WINDOW);
  if (userTurns.length < STALL_WINDOW) return false;

  const totalWords = userTurns.reduce(
    (sum, message) => sum + message.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  return totalWords / userTurns.length < STALL_WORD_THRESHOLD;
};

export const recordTransition = (
  state: TransitionState,
  elapsedMinutes: number,
): TransitionState => ({
  lastTransitionAtMinutes: elapsedMinutes,
  transitionCount: state.transitionCount + 1,
});
