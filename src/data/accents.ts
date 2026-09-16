import type { AccentDefinition, AccentId } from '@/types';

/**
 * Accent catalogue.
 *
 * `languageTags` are *preferences*, not promises. `TextToSpeechService` probes
 * the device voice list and falls back down the list, so we never claim an
 * accent the installed TTS engine cannot actually produce. The Settings screen
 * marks unavailable accents explicitly rather than silently substituting one.
 */
export const ACCENT_LIST: readonly AccentDefinition[] = [
  {
    id: 'american',
    label: 'American',
    description: 'General American. The most widely available voice on both platforms.',
    flag: '🇺🇸',
    languageTags: ['en-US'],
    promptHint:
      'Use American English spelling, vocabulary and idioms (elevator, apartment, "I guess", "sure thing").',
    isChallenge: false,
  },
  {
    id: 'british',
    label: 'British',
    description: 'Received Pronunciation. Clear and widely understood.',
    flag: '🇬🇧',
    languageTags: ['en-GB'],
    promptHint:
      'Use British English spelling, vocabulary and idioms (lift, flat, "I reckon", "fair enough").',
    isChallenge: false,
  },
  {
    id: 'australian',
    label: 'Australian',
    description: 'Australian English. Relaxed and informal.',
    flag: '🇦🇺',
    languageTags: ['en-AU', 'en-GB'],
    promptHint:
      'Use Australian English vocabulary and a relaxed register ("no worries", "heaps", "arvo" occasionally).',
    isChallenge: false,
  },
  {
    id: 'canadian',
    label: 'Canadian',
    description: 'Canadian English. Close to American with British spelling touches.',
    flag: '🇨🇦',
    languageTags: ['en-CA', 'en-US'],
    promptHint:
      'Use Canadian English: mostly North American vocabulary with British-leaning spellings.',
    isChallenge: false,
  },
  {
    id: 'indian',
    label: 'Indian',
    description: 'Indian English. Very common in global tech workplaces.',
    flag: '🇮🇳',
    languageTags: ['en-IN', 'en-GB'],
    promptHint:
      'Use Indian English conventions where natural ("do the needful" sparingly, "prepone", "kindly").',
    isChallenge: false,
  },
  {
    id: 'challenging',
    label: 'Challenging',
    description:
      'A deliberately harder accent for listening practice. Rotates between Irish, Scottish and South African voices where your device has them.',
    flag: '🎧',
    languageTags: ['en-IE', 'en-ZA', 'en-GB-SCT', 'en-NZ', 'en-GB'],
    promptHint:
      'Use a strongly regional register with some dialect vocabulary. Keep sentences clear enough to follow, but do not simplify the accent.',
    isChallenge: true,
  },
];

const BY_ID = new Map<AccentId, AccentDefinition>(ACCENT_LIST.map((a) => [a.id, a]));

export const getAccent = (id: AccentId): AccentDefinition =>
  BY_ID.get(id) ?? (ACCENT_LIST[0] as AccentDefinition);

/** BCP-47 tag used for *speech recognition* (input), independent of the TTS voice. */
export const recognitionLocaleFor = (id: AccentId): string => {
  switch (id) {
    case 'british':
    case 'challenging':
      return 'en-GB';
    case 'australian':
      return 'en-AU';
    case 'canadian':
      return 'en-CA';
    case 'indian':
      return 'en-IN';
    case 'american':
    default:
      return 'en-US';
  }
};
