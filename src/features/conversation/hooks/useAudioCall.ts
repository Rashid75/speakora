import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * How long the ringing screen is held before the partner picks up.
 *
 * Nothing is actually being connected - there is no server and no second
 * person - so this is a deliberate piece of theatre: long enough that placing
 * a call feels like placing a call, short enough that nobody waits.
 */
export const CALL_CONNECT_MS = 5000;

/**
 * `off` is a real state rather than a separate boolean, so "is a call up" and
 * "which half of it are we in" cannot disagree with each other.
 */
export type CallPhase = 'off' | 'ringing' | 'connected';

export interface AudioCallSession {
  readonly phase: CallPhase;
  /** True once the partner has answered. */
  readonly isConnected: boolean;
  /** Whether the live transcript is drawn over the call. */
  readonly subtitlesOn: boolean;
  /**
   * How many turns the transcript already held when this call was placed.
   * Everything before it belongs to the chat and is not shown on the call.
   */
  readonly fromTurn: number;
  /**
   * Milliseconds since the partner picked up. Zero until they do: ringing is
   * not time spent talking, and a call that counted it would be claiming
   * practice the learner never did.
   */
  readonly elapsedMs: number;
  /** `fromTurn` is the caller's transcript length at the moment of dialling. */
  start(fromTurn: number): void;
  hangUp(): void;
  toggleSubtitles(): void;
}

/**
 * The video-call session: ringing, answered, hung up.
 *
 * Kept out of the call screen itself so the screen stays a pure rendering of
 * whatever state it is handed, and so the two-second pickup can be tested
 * without mounting a modal, a portrait and an audio player.
 *
 * Subtitles start off, and the call starts on an empty one. A call is a thing
 * happening now: opening it onto a wall of text from the chat would make it the
 * same screen with a bigger picture, and the learner is here to listen rather
 * than read. One tap brings the words back when a sentence does not land.
 */
export function useAudioCall(connectDelayMs: number = CALL_CONNECT_MS): AudioCallSession {
  const [phase, setPhase] = useState<CallPhase>('off');
  const [subtitlesOn, setSubtitlesOn] = useState(false);
  const [fromTurn, setFromTurn] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (phase !== 'ringing') return;
    const id = setTimeout(() => setPhase('connected'), connectDelayMs);
    return () => clearTimeout(id);
  }, [connectDelayMs, phase]);

  // Counted from the pickup, and from wall-clock deltas rather than by adding
  // a second per tick - a dropped interval (common while the JS thread is busy
  // handling speech) would otherwise quietly lose time off the total.
  useEffect(() => {
    if (phase !== 'connected') return;
    const connectedAt = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - connectedAt), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const start = useCallback(
    (turn: number) => {
      // A second tap on a call that is already up is a no-op, and must not
      // move the starting point or reset the clock underneath it.
      if (phase !== 'off') return;
      setPhase('ringing');
      setFromTurn(turn);
      setElapsedMs(0);
    },
    [phase],
  );

  const hangUp = useCallback(() => {
    setPhase('off');
    setElapsedMs(0);
  }, []);

  const toggleSubtitles = useCallback(() => setSubtitlesOn((on) => !on), []);

  return useMemo(
    () => ({
      phase,
      isConnected: phase === 'connected',
      subtitlesOn,
      fromTurn,
      elapsedMs,
      start,
      hangUp,
      toggleSubtitles,
    }),
    [elapsedMs, fromTurn, hangUp, phase, start, subtitlesOn, toggleSubtitles],
  );
}
