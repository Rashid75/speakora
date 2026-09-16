import type { AppFailure, FailureCode } from '@/types';

/**
 * The one place raw errors become user-facing copy.
 *
 * Rule: a screen may render `messageFor(failure)`; it may never render
 * `failure.detail`, which exists purely for the logger.
 */
interface FailureCopy {
  readonly title: string;
  readonly message: string;
  readonly action?: string;
}

const COPY: Readonly<Record<FailureCode, FailureCopy>> = {
  offline: {
    title: 'You are offline',
    message:
      'Speakora needs an internet connection to talk with you. Reconnect and your conversation will carry on from here.',
    action: 'Try again',
  },
  timeout: {
    title: 'That took too long',
    message: 'Your partner did not reply in time. This is usually a slow connection.',
    action: 'Try again',
  },
  ai_unavailable: {
    title: 'Your partner is unavailable',
    message: 'We could not reach the conversation service just now. Please try again in a moment.',
    action: 'Try again',
  },
  ai_rate_limited: {
    title: 'Too many requests',
    message:
      'The conversation service is busy. Wait a few seconds before sending your next message.',
    action: 'Try again',
  },
  ai_invalid_response: {
    title: 'Something got garbled',
    message: 'We received a reply we could not read. Please try that again.',
    action: 'Try again',
  },
  ai_not_configured: {
    title: 'AI key missing',
    message:
      'No API key is configured for this build. Add GEMINI_API_KEY to your .env file and restart the app.',
  },
  ai_blocked_content: {
    title: 'Let us change direction',
    message:
      'Your partner could not respond to that. Try rephrasing, or pick a different talking point.',
  },
  permission_denied: {
    title: 'Microphone access needed',
    message:
      'Speakora needs the microphone to hear you speak. Grant access in your device settings to carry on.',
    action: 'Open settings',
  },
  speech_unavailable: {
    title: 'Speech recognition unavailable',
    message:
      'This device cannot convert speech to text right now. Check that a speech service is installed and try again.',
  },
  speech_no_match: {
    title: 'I did not catch that',
    message: 'Nothing was recognised. Try speaking a little louder, or move somewhere quieter.',
    action: 'Try again',
  },
  tts_failed: {
    title: 'Could not play the reply',
    message:
      'Your device could not speak that out loud. The text is still shown in the transcript.',
  },
  storage_failed: {
    title: 'Could not save',
    message: 'Something went wrong writing to this device. Your latest changes may not be kept.',
    action: 'Try again',
  },
  not_found: {
    title: 'Not found',
    message: 'We could not find what you were looking for. It may have been deleted.',
  },
  cancelled: {
    title: 'Cancelled',
    message: 'That action was cancelled.',
  },
  unknown: {
    title: 'Something went wrong',
    message: 'An unexpected problem occurred. Please try again.',
    action: 'Try again',
  },
};

export const copyFor = (failure: AppFailure): FailureCopy => COPY[failure.code] ?? COPY.unknown;

export const messageFor = (failure: AppFailure): string => copyFor(failure).message;

export const titleFor = (failure: AppFailure): string => copyFor(failure).title;

/** Narrows an unknown thrown value into something loggable. */
export const describeError = (error: unknown): string => {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unserialisable error';
  }
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
