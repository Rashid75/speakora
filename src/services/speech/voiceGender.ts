import type { DeviceVoice, VoiceGender } from '@/types';

/**
 * Working out whether a device voice sounds male or female.
 *
 * Neither platform will tell us. `AVSpeechSynthesisVoice` has a gender field
 * that `expo-speech` does not surface, and Android exposes nothing at all - so
 * the only evidence is the name, and this is a guess dressed up as a lookup.
 * It is treated as exactly that: an unmatched voice returns `undefined` rather
 * than a coin flip, and the caller keeps the accent-correct voice instead of
 * substituting a wrong-accent one to satisfy a hunch about the gender.
 *
 * Two shapes of evidence:
 *
 *  - Android engines label the voice in the identifier itself, as
 *    `en-us-x-sfg#male_1-local` or `en-gb-x-gba#female_2-local`. That is
 *    explicit and is trusted.
 *  - Apple names its voices after people (Daniel, Samantha). There is no rule
 *    to apply, so the English voices Apple actually ships are listed below.
 */

/** Apple's English voices, by the gender each one is published as. */
const APPLE_MALE = [
  'aaron',
  'albert',
  'alex',
  'arthur',
  'bruce',
  'daniel',
  'eddy',
  'fred',
  'gordon',
  'junior',
  'lee',
  'nathan',
  'oliver',
  'ralph',
  'reed',
  'rishi',
  'rocko',
  'tom',
] as const;

const APPLE_FEMALE = [
  'allison',
  'ava',
  'catherine',
  'fiona',
  'flo',
  'isha',
  'karen',
  'kate',
  'kathy',
  'martha',
  'moira',
  'nicky',
  'samantha',
  'sandy',
  'serena',
  'shelley',
  'stephanie',
  'susan',
  'tessa',
  'veena',
  'victoria',
  'zoe',
] as const;

/**
 * `female` contains `male`, so the explicit labels are matched on their
 * delimiters rather than as bare substrings - otherwise every Android female
 * voice reads as male.
 */
const LABELLED_FEMALE = /(^|[^a-z])female([^a-z]|$)/;
const LABELLED_MALE = /(^|[^a-z])male([^a-z]|$)/;

/** A name, as its own word - so "Alexandra" is never read as "Alex". */
const namedIn = (haystack: string, names: readonly string[]): boolean =>
  names.some((name) => new RegExp(`(^|[^a-z])${name}([^a-z]|$)`).test(haystack));

/** `undefined` means "no idea", and callers must treat it that way. */
export const voiceGender = (voice: DeviceVoice): VoiceGender | undefined => {
  const haystack = `${voice.identifier} ${voice.name}`.toLowerCase();

  if (LABELLED_FEMALE.test(haystack)) return 'female';
  if (LABELLED_MALE.test(haystack)) return 'male';
  if (namedIn(haystack, APPLE_FEMALE)) return 'female';
  if (namedIn(haystack, APPLE_MALE)) return 'male';
  return undefined;
};
