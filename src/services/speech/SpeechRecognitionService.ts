import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
import { Platform } from 'react-native';

import { CONVERSATION_LIMITS } from '@/config/appConfig';
import { recognitionLocaleFor } from '@/data/accents';
import { createLogger } from '@/services/logging/logger';
import type { AccentId, SpeechRecognitionCallbacks, SpeechRecognitionErrorCode } from '@/types';
import { describeError } from '@/utils/errors';

const log = createLogger('stt');

/**
 * Speech recognition wrapper.
 *
 * `expo-speech-recognition` binds SFSpeechRecognizer (iOS) and
 * android.speech.SpeechRecognizer (Android). Both are free, on-device where
 * supported, and need no extra API key - which matters because the alternative
 * (streaming audio to a cloud STT service) would mean a second vendor key in
 * the client and a much larger privacy surface.
 *
 * This module owns three things the raw library does not give us:
 *   1. a single active session, so a double-tap cannot start two recognisers;
 *   2. a hard utterance cap, so a stuck recogniser cannot hold the mic forever;
 *   3. normalisation of platform error codes into our own union.
 */

type Subscription = { remove: () => void };

interface ActiveSession {
  readonly callbacks: SpeechRecognitionCallbacks;
  readonly subscriptions: Subscription[];
  readonly maxDurationTimer: ReturnType<typeof setTimeout>;
  /** Highest-confidence final transcript seen so far in this session. */
  bestTranscript: string;
  bestConfidence?: number;
  ended: boolean;
}

let session: ActiveSession | undefined;

export const isRecognitionAvailable = (): boolean => {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch (error) {
    log.warn('Availability check failed', { error: describeError(error) });
    return false;
  }
};

export interface PermissionState {
  readonly granted: boolean;
  /** False when the OS will no longer show a prompt - we must deep-link. */
  readonly canAskAgain: boolean;
}

export const getPermissions = async (): Promise<PermissionState> => {
  try {
    const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    return { granted: result.granted, canAskAgain: result.canAskAgain ?? true };
  } catch (error) {
    log.warn('getPermissions failed', { error: describeError(error) });
    return { granted: false, canAskAgain: true };
  }
};

export const requestPermissions = async (): Promise<PermissionState> => {
  try {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return { granted: result.granted, canAskAgain: result.canAskAgain ?? true };
  } catch (error) {
    log.warn('requestPermissions failed', { error: describeError(error) });
    return { granted: false, canAskAgain: false };
  }
};

export interface StartOptions {
  readonly accent: AccentId;
  readonly interimResults: boolean;
  readonly callbacks: SpeechRecognitionCallbacks;
}

export const start = async (options: StartOptions): Promise<boolean> => {
  if (session) {
    log.debug('Recognition already running; ignoring duplicate start');
    return false;
  }

  if (!isRecognitionAvailable()) {
    options.callbacks.onError('unavailable', 'Recognition not available on this device');
    return false;
  }

  const permission = await getPermissions();
  if (!permission.granted) {
    const requested = await requestPermissions();
    if (!requested.granted) {
      options.callbacks.onError('permission_denied', 'Microphone permission not granted');
      return false;
    }
  }

  const subscriptions: Subscription[] = [];
  const active: ActiveSession = {
    callbacks: options.callbacks,
    subscriptions,
    maxDurationTimer: setTimeout(() => {
      log.warn('Utterance cap reached; stopping recogniser');
      void stop();
    }, CONVERSATION_LIMITS.maxSingleUtteranceMs),
    bestTranscript: '',
    ended: false,
  };
  session = active;

  subscriptions.push(
    ExpoSpeechRecognitionModule.addListener('start', () => {
      options.callbacks.onStart();
    }),
  );

  subscriptions.push(
    ExpoSpeechRecognitionModule.addListener('result', (event) => {
      const result = event.results?.[0];
      if (!result) return;

      const transcript = (result.transcript ?? '').trim();
      // Android streams a growing partial; iOS can emit a shorter correction.
      // Keeping the longest final transcript avoids losing the end of a
      // sentence when the platform revises itself at the last moment.
      if (event.isFinal && transcript.length >= active.bestTranscript.length) {
        active.bestTranscript = transcript;
        active.bestConfidence = normaliseConfidence(result.confidence);
      }

      options.callbacks.onResult({
        transcript,
        isFinal: Boolean(event.isFinal),
        confidence: normaliseConfidence(result.confidence),
      });
    }),
  );

  subscriptions.push(
    ExpoSpeechRecognitionModule.addListener('error', (event) => {
      const code = mapErrorCode(event.error);
      // "no-speech" arrives as an error but is a normal outcome of a silent
      // tap, so it is surfaced distinctly and handled without an alert.
      log.debug('Recognition error', { code, message: event.message });
      options.callbacks.onError(code, event.message);
      cleanup();
    }),
  );

  subscriptions.push(
    ExpoSpeechRecognitionModule.addListener('end', () => {
      if (active.ended) return;
      active.ended = true;
      options.callbacks.onEnd();
      cleanup();
    }),
  );

  if (options.callbacks.onVolume) {
    subscriptions.push(
      ExpoSpeechRecognitionModule.addListener('volumechange', (event) => {
        options.callbacks.onVolume?.(normaliseVolume(event.value));
      }),
    );
  }

  try {
    ExpoSpeechRecognitionModule.start({
      lang: recognitionLocaleFor(options.accent),
      interimResults: options.interimResults,
      // Continuous keeps the session open across natural pauses so a learner
      // who hesitates mid-sentence is not cut off.
      continuous: true,
      // Prefer on-device where available: lower latency and no audio leaves
      // the handset. The platform silently falls back to network recognition
      // when no on-device model is installed for the locale.
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
      volumeChangeEventOptions: options.callbacks.onVolume
        ? { enabled: true, intervalMillis: 100 }
        : undefined,
      // Android only: how long of a silence ends the utterance.
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: CONVERSATION_LIMITS.silenceTimeoutMs,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS:
          CONVERSATION_LIMITS.silenceTimeoutMs,
      },
    });
    return true;
  } catch (error) {
    log.warn('start threw', { error: describeError(error) });
    options.callbacks.onError('unknown', describeError(error));
    cleanup();
    return false;
  }
};

/** Asks the recogniser to finalise. The `end` event still fires afterwards. */
export const stop = async (): Promise<void> => {
  if (!session) return;
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (error) {
    log.debug('stop threw', { error: describeError(error) });
    cleanup();
  }
};

/** Discards the session without waiting for a result. */
export const abort = async (): Promise<void> => {
  if (!session) return;
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch (error) {
    log.debug('abort threw', { error: describeError(error) });
  } finally {
    cleanup();
  }
};

export const isListening = (): boolean => session !== undefined;

/** The best final transcript of the session that just ended. */
export const lastResult = (): { transcript: string; confidence?: number } => ({
  transcript: session?.bestTranscript ?? '',
  confidence: session?.bestConfidence,
});

const cleanup = (): void => {
  if (!session) return;
  clearTimeout(session.maxDurationTimer);
  for (const subscription of session.subscriptions) {
    try {
      subscription.remove();
    } catch {
      // A listener removed twice is harmless.
    }
  }
  session = undefined;
};

/**
 * iOS reports a real 0-1 confidence. Android's SpeechRecognizer frequently
 * reports 0 even for a perfect result, which would look like terrible
 * pronunciation - so a zero is treated as "not reported" rather than "bad".
 */
const normaliseConfidence = (value: number | undefined): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value <= 0) return undefined;
  return Math.min(1, value);
};

/** Platforms report loudness on different scales; map both to 0-1. */
const normaliseVolume = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (Platform.OS === 'android') {
    // Android RMS dB, roughly -2 (silence) to 10 (loud).
    return Math.min(1, Math.max(0, (value + 2) / 12));
  }
  // iOS reports a negative dB value, roughly -60 (silence) to 0 (loud).
  return Math.min(1, Math.max(0, (value + 60) / 60));
};

const ERROR_MAP: Readonly<Record<string, SpeechRecognitionErrorCode>> = {
  'not-allowed': 'permission_denied',
  'service-not-allowed': 'permission_denied',
  'no-speech': 'no_match',
  'speech-timeout': 'no_match',
  network: 'network',
  busy: 'busy',
  aborted: 'aborted',
  'audio-capture': 'unavailable',
  'language-not-supported': 'unavailable',
  'recognizer-busy': 'busy',
  client: 'unknown',
};

const mapErrorCode = (code: ExpoSpeechRecognitionErrorCode | string): SpeechRecognitionErrorCode =>
  ERROR_MAP[String(code)] ?? 'unknown';
