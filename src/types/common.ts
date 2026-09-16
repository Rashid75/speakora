/** Branded ISO-8601 timestamp, always UTC. */
export type IsoDateTime = string;

/** Milliseconds. Used everywhere a duration is stored. */
export type Millis = number;

/** A discriminated result type used by services that must not throw. */
export type Result<T, E = AppFailure> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Every failure the user can possibly see is reduced to one of these codes.
 * The UI maps a code to a friendly message; raw provider errors never surface.
 */
export type FailureCode =
  | 'offline'
  | 'timeout'
  | 'ai_unavailable'
  | 'ai_rate_limited'
  | 'ai_invalid_response'
  | 'ai_not_configured'
  | 'ai_blocked_content'
  | 'permission_denied'
  | 'speech_unavailable'
  | 'speech_no_match'
  | 'tts_failed'
  | 'storage_failed'
  | 'not_found'
  | 'cancelled'
  | 'unknown';

export interface AppFailure {
  readonly code: FailureCode;
  /** Developer-facing detail. Logged, never rendered verbatim. */
  readonly detail?: string;
  /** Whether retrying the same operation could plausibly succeed. */
  readonly retryable: boolean;
}

export const failure = (
  code: FailureCode,
  detail?: string,
  retryable = RETRYABLE_CODES.has(code),
): AppFailure => ({ code, detail, retryable });

const RETRYABLE_CODES: ReadonlySet<FailureCode> = new Set<FailureCode>([
  'offline',
  'timeout',
  'ai_unavailable',
  'ai_rate_limited',
  'ai_invalid_response',
  'storage_failed',
  'unknown',
]);

/** Async lifecycle for any screen-level data load. */
export type LoadState = 'idle' | 'loading' | 'ready' | 'error';
