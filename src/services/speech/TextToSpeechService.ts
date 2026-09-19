import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { getAccent } from '@/data/accents';
import { getPersonality } from '@/data/personalities';
import { createLogger } from '@/services/logging/logger';
import type { AccentId, DeviceVoice, PersonalityId, SpeakingSpeed, VoiceGender } from '@/types';
import { describeError } from '@/utils/errors';
import { voiceGender } from './voiceGender';

const log = createLogger('tts');

/**
 * Text-to-speech built on `expo-speech`, which wraps AVSpeechSynthesizer on
 * iOS and android.speech.tts.TextToSpeech on Android.
 *
 * The hard part is accent honesty. Neither platform guarantees a voice for a
 * given locale: iOS ships en-GB/en-AU/en-IE and downloads others on demand;
 * Android depends entirely on which TTS engine and language packs the user has.
 * So we probe the device voice list once, cache it, and resolve the requested
 * accent against what actually exists. `isAccentAvailable` drives the Settings
 * screen so we never advertise something the device cannot produce.
 */

let voiceCache: DeviceVoice[] | undefined;
let voiceProbe: Promise<DeviceVoice[]> | undefined;

interface ExpoVoice {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
}

const loadVoices = async (): Promise<DeviceVoice[]> => {
  try {
    const voices = (await Speech.getAvailableVoicesAsync()) as ExpoVoice[];
    return voices
      .filter(
        (voice) =>
          typeof voice.language === 'string' && voice.language.toLowerCase().startsWith('en'),
      )
      .map((voice) => ({
        identifier: voice.identifier,
        name: voice.name,
        language: normaliseTag(voice.language),
        quality: voice.quality === 'Enhanced' ? 'enhanced' : 'default',
      }));
  } catch (error) {
    log.warn('Could not list device voices', { error: describeError(error) });
    return [];
  }
};

/**
 * Logged once, because it is the only way to find out what a given handset
 * actually has. "The male partner sounds female" is almost always "this device
 * ships one English voice", and without this there is no way to tell that from
 * a bug in the matching.
 */
const logVoices = (voices: readonly DeviceVoice[]): void => {
  log.info('Device English voices', {
    count: voices.length,
    voices: voices
      .map((voice) => `${voice.language}:${voice.identifier}:${voiceGender(voice) ?? 'unknown'}`)
      .join(', '),
  });
};

/** Android reports `en_GB`, iOS reports `en-GB`. Normalise to hyphens. */
const normaliseTag = (tag: string): string => tag.replace('_', '-');

export const getVoices = async (): Promise<DeviceVoice[]> => {
  if (voiceCache) return voiceCache;
  voiceProbe ??= loadVoices().then((voices) => {
    voiceCache = voices;
    voiceProbe = undefined;
    logVoices(voices);
    return voices;
  });
  return voiceProbe;
};

export interface ResolvedVoice {
  /** The exact device voice, when one matched. */
  readonly identifier?: string;
  /** The BCP-47 tag we will ask the engine for. */
  readonly language: string;
  /** True when we got the accent the user actually chose. */
  readonly exact: boolean;
  /**
   * What the chosen voice sounds like, as far as the device will say.
   * `undefined` means it would not say - not that it has no gender.
   */
  readonly gender?: VoiceGender;
}

/**
 * Walks the accent's ordered preference list and returns the first tag the
 * device has a voice for. Falls back to plain `en` rather than failing.
 *
 * `gender` is a preference applied *within* an accent, never across them: a
 * male partner on a British accent gets a British male voice if the device has
 * one and a British voice either way. The accent is what the learner chose and
 * what they are training their ear on, so it is never traded away.
 */
export const resolveVoice = async (
  accentId: AccentId,
  gender?: VoiceGender,
): Promise<ResolvedVoice> => {
  const accent = getAccent(accentId);
  const voices = await getVoices();

  for (const [index, tag] of accent.languageTags.entries()) {
    const match = pickBestVoice(voices, tag, gender);
    if (match) {
      return {
        identifier: match.identifier,
        language: match.language,
        exact: index === 0,
        gender: voiceGender(match),
      };
    }
  }

  const anyEnglish = voices[0];
  return anyEnglish
    ? {
        identifier: anyEnglish.identifier,
        language: anyEnglish.language,
        exact: false,
        gender: voiceGender(anyEnglish),
      }
    : { language: accent.languageTags[0] ?? 'en-US', exact: false };
};

/**
 * The pitch to speak at, once we know what voice we actually got.
 *
 * Most handsets ship one or two English voices and they are usually female, so
 * a male partner routinely ends up on a female voice with no way to swap it.
 * Pitch is the only lever left, and it is a real one: shifted a fifth down, a
 * female voice reads as male to most listeners.
 *
 * Applied only on a mismatch, so a device that does have a male voice is not
 * dragged into a comedy baritone on top of it. An unknown gender counts as a
 * mismatch: the shift is modest enough that being wrong costs a slightly deep
 * voice, while not shifting costs the partner their character entirely.
 */
export const adjustPitch = (
  base: number,
  wanted: VoiceGender,
  got: VoiceGender | undefined,
): number => {
  if (got === wanted) return base;
  const shifted = base * (wanted === 'male' ? 0.75 : 1.2);
  // Both platforms clamp outside this band, and past it the voice stops
  // sounding like a person at all.
  return Math.min(1.8, Math.max(0.55, Number(shifted.toFixed(3))));
};

/**
 * The best voice for a locale: the requested gender where the device offers
 * one, and an enhanced/neural voice over a default within whatever is left.
 *
 * A locale with no voice of that gender falls back to the whole set rather
 * than returning nothing - a partner with a slightly wrong-sounding voice is
 * recoverable; one that cannot speak at all is not.
 */
const pickBestVoice = (
  voices: readonly DeviceVoice[],
  tag: string,
  gender?: VoiceGender,
): DeviceVoice | undefined => {
  const matches = voices.filter((voice) => voice.language.toLowerCase() === tag.toLowerCase());
  const sameGender = gender
    ? matches.filter((voice) => voiceGender(voice) === gender)
    : ([] as DeviceVoice[]);
  const pool = sameGender.length > 0 ? sameGender : matches;
  return pool.find((voice) => voice.quality === 'enhanced') ?? pool[0];
};

export const isAccentAvailable = async (accentId: AccentId): Promise<boolean> => {
  const resolved = await resolveVoice(accentId);
  return resolved.exact;
};

export interface SpeakRequest {
  readonly text: string;
  readonly accent: AccentId;
  readonly personalityId: PersonalityId;
  readonly speed: SpeakingSpeed;
  readonly onStart?: () => void;
  readonly onDone?: () => void;
  readonly onError?: (detail: string) => void;
}

/**
 * iOS treats `rate` as an absolute 0-1 value where ~0.5 is normal speech, while
 * Android treats it as a multiplier where 1.0 is normal. Passing the user's
 * "1.5x" straight through would be near-unintelligible on iOS and correct on
 * Android, so each platform is mapped separately.
 */
export const mapRate = (speed: SpeakingSpeed, personalityModifier: number): number => {
  const requested = speed * personalityModifier;
  if (Platform.OS === 'ios') {
    // AVSpeechUtteranceDefaultSpeechRate is 0.5.
    return Math.min(1, Math.max(0.1, 0.5 * requested));
  }
  return Math.min(2, Math.max(0.1, requested));
};

export const speak = async (request: SpeakRequest): Promise<void> => {
  const personality = getPersonality(request.personalityId);
  const voice = await resolveVoice(request.accent, personality.gender);
  const pitch = adjustPitch(personality.pitch, personality.gender, voice.gender);

  if (voice.gender !== personality.gender) {
    log.info('No matching voice for this partner; shifting pitch instead', {
      partner: personality.name,
      wanted: personality.gender,
      got: voice.gender ?? 'unknown',
      voice: voice.identifier ?? voice.language,
      pitch,
    });
  }

  // Never let two utterances overlap; the user pressing the mic mid-reply must
  // silence the AI immediately.
  await stop();

  try {
    Speech.speak(request.text, {
      language: voice.language,
      ...(voice.identifier ? { voice: voice.identifier } : {}),
      rate: mapRate(request.speed, personality.rateModifier),
      pitch,
      onStart: request.onStart,
      onDone: request.onDone,
      onStopped: request.onDone,
      onError: (error: Error) => {
        log.warn('TTS error', { error: describeError(error) });
        request.onError?.(describeError(error));
      },
    });
  } catch (error) {
    log.warn('TTS speak threw', { error: describeError(error) });
    request.onError?.(describeError(error));
  }
};

export const stop = async (): Promise<void> => {
  try {
    if (await Speech.isSpeakingAsync()) {
      await Speech.stop();
    }
  } catch (error) {
    log.debug('TTS stop failed (usually harmless)', { error: describeError(error) });
  }
};

export const isSpeaking = async (): Promise<boolean> => {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
};

/** Test seam so suites do not depend on a real device voice list. */
export const __setVoiceCacheForTesting = (voices: DeviceVoice[] | undefined): void => {
  voiceCache = voices;
  voiceProbe = undefined;
};
