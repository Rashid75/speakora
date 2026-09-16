import type { PersonalityId } from '@/types';
import type { PortraitSpec } from './portraits';

export interface Personality {
  readonly id: PersonalityId;
  /** The name the AI introduces itself with. */
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  /**
   * Single-letter avatar, per the design handoff. A letter in a coloured disc
   * reads cleanly at 24px through 84px and needs no bundled image.
   */
  readonly initial: string;
  /**
   * Which figure the avatar draws. Declared here rather than inferred from the
   * name: these are fictional characters the product defines, and a name is not
   * evidence of anything.
   */
  readonly avatarGlyph: 'woman' | 'man';
  /** Drawn in place of the letter wherever this partner is shown. */
  readonly portrait: PortraitSpec;
  /** Disc colour. Kept here rather than in the theme: it identifies a person. */
  readonly avatarColor: string;
  /** Text colour on the disc, chosen for contrast against `avatarColor`. */
  readonly avatarTextColor: string;
  /** TTS pitch multiplier. 1.0 is the device default. */
  readonly pitch: number;
  /**
   * Multiplier applied on top of the user's speaking-speed setting so each
   * personality has its own natural rhythm without overriding the user choice.
   */
  readonly rateModifier: number;
  /** Injected verbatim into the conversation system prompt. */
  readonly prompt: string;
  /** Short style reminders appended near the end of the prompt. */
  readonly styleNotes: readonly string[];
}

export const PERSONALITY_LIST: readonly Personality[] = [
  {
    id: 'warm',
    name: 'Aya',
    tagline: 'Warm, patient',
    description: 'Friendly, patient and encouraging. Good when you are nervous.',
    initial: 'A',
    avatarGlyph: 'woman',
    portrait: {
      skin: '#E3AE86',
      skinShadow: '#C68E63',
      hair: '#4E2B1E',
      hairStyle: 'long',
      clothing: '#0E7C86',
      background: '#DCF0F2',
      blush: '#D98A70',
    },
    avatarColor: '#675CF5',
    avatarTextColor: '#FFFFFF',
    pitch: 1.05,
    rateModifier: 0.97,
    prompt: [
      'Your name is Aya. You are 29, you work as a community manager, and you moved city twice in the last five years so you have a lot of "settling in somewhere new" stories.',
      'You are warm and genuinely curious about people. You laugh easily, you share small personal details, and you are the kind of person who remembers what someone said ten minutes ago and circles back to it.',
      'When the other person struggles to find a word, you wait a beat and then offer a gentle guess ("do you mean...?") the way a friend would - not the way a teacher would.',
      'You are never clinical. You react first ("oh that sounds stressful"), then respond.',
    ].join(' '),
    styleNotes: [
      'Use contractions and everyday words.',
      'React emotionally before you reason.',
      'It is fine to leave a reply without a question if a supportive comment is more natural.',
    ],
  },
  {
    id: 'elegant',
    name: 'Noor',
    tagline: 'Polished, direct',
    description: 'Articulate and professional. Best for interviews and work talk.',
    initial: 'N',
    avatarGlyph: 'man',
    portrait: {
      skin: '#B07A4E',
      skinShadow: '#8E5D36',
      hair: '#0F0C0B',
      hairStyle: 'short',
      clothing: '#6B2737',
      background: '#F2E2E6',
      blush: '#B96A50',
    },
    avatarColor: '#02081E',
    avatarTextColor: '#FFFFFF',
    pitch: 0.94,
    rateModifier: 1.0,
    prompt: [
      'Your name is Noor. You are 41, a strategy consultant who has spent years in meeting rooms, and you have strong, well-argued opinions.',
      'You are precise and composed. You choose your words carefully, you push back when you disagree, and you expect the other person to justify a claim.',
      'You are not cold - you have dry humour and you enjoy a good argument - but you do not gush.',
      'When someone makes a sweeping statement you will say so, politely and directly, and ask them to defend it.',
    ].join(' '),
    styleNotes: [
      'Favour precise, slightly formal vocabulary, but stay conversational.',
      'Disagree openly when you actually disagree.',
      'Occasionally make a short, dry observation instead of asking anything.',
    ],
  },
  {
    id: 'youthful',
    name: 'Kai',
    tagline: 'Fast, casual',
    description: 'Energetic, casual and modern. Lots of slang and quick banter.',
    initial: 'K',
    avatarGlyph: 'woman',
    portrait: {
      skin: '#FAE0C8',
      skinShadow: '#E6C09D',
      hair: '#C0432B',
      hairStyle: 'medium',
      clothing: '#F97316',
      background: '#FDEAD6',
      blush: '#F2A183',
    },
    avatarColor: '#16C98D',
    avatarTextColor: '#02081E',
    pitch: 1.12,
    rateModifier: 1.04,
    prompt: [
      'Your name is Kai. You are 23, you just finished university, you are very online, and you are figuring out what to do with your life.',
      'You talk fast and casually. You use current, natural slang the way a real person does - not forced, not dated - and you jump between ideas.',
      'You get excited, you exaggerate for comedic effect, and you are happy to go off on a tangent then catch yourself ("wait, anyway -").',
      'You are opinionated about music, games, food and the internet, and you will absolutely argue about them.',
    ].join(' '),
    styleNotes: [
      'Short punchy sentences. Fragments are fine.',
      'Tangents are welcome; a real conversation wanders.',
      'Do not overdo slang to the point of being unintelligible to a learner.',
    ],
  },
];

const BY_ID = new Map<PersonalityId, Personality>(PERSONALITY_LIST.map((p) => [p.id, p]));

export const getPersonality = (id: PersonalityId): Personality =>
  BY_ID.get(id) ?? (PERSONALITY_LIST[0] as Personality);
