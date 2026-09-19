import type { AccentId, SpeakingSpeed } from './settings';

/** A concrete voice offered by the device TTS engine. */
/** How a voice reads to a listener. Not every device voice declares one. */
export type VoiceGender = 'male' | 'female';

export interface DeviceVoice {
  readonly identifier: string;
  readonly name: string;
  /** BCP-47 tag, e.g. en-GB. */
  readonly language: string;
  readonly quality: 'default' | 'enhanced';
}

export interface AccentDefinition {
  readonly id: AccentId;
  readonly label: string;
  readonly description: string;
  readonly flag: string;
  /**
   * Ordered BCP-47 preferences. The TTS service walks this list and uses the
   * first tag the device actually has a voice for, so we never advertise an
   * accent the engine cannot produce.
   */
  readonly languageTags: readonly string[];
  /** Extra guidance injected into the prompt (idioms, spelling, vocabulary). */
  readonly promptHint: string;
  /** True for the deliberately harder listening-practice option. */
  readonly isChallenge: boolean;
}

export interface SpeakOptions {
  readonly text: string;
  readonly accent: AccentId;
  readonly speed: SpeakingSpeed;
  /** Personality-driven pitch offset, 1.0 is neutral. */
  readonly pitch: number;
}

export type SpeechRecognitionErrorCode =
  'permission_denied' | 'unavailable' | 'no_match' | 'network' | 'busy' | 'aborted' | 'unknown';

export interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly isFinal: boolean;
  /** 0-1, only when the platform reported it. */
  readonly confidence?: number;
}

export interface SpeechRecognitionCallbacks {
  onResult(result: SpeechRecognitionResult): void;
  onError(code: SpeechRecognitionErrorCode, detail?: string): void;
  onStart(): void;
  onEnd(): void;
  /** Normalised 0-1 input level for the waveform, when the platform reports it. */
  onVolume?(level: number): void;
}

/** What the current device can actually do, probed once at startup. */
export interface SpeechCapabilities {
  readonly recognitionAvailable: boolean;
  readonly onDeviceRecognition: boolean;
  readonly reportsConfidence: boolean;
  readonly reportsVolume: boolean;
  readonly availableAccents: readonly AccentId[];
}
