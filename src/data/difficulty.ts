import type { CefrLevel, Difficulty, SpeakingSpeed } from '@/types';

export interface DifficultyDefinition {
  readonly id: Difficulty;
  readonly label: string;
  readonly shortLabel: string;
  /** Roughly the CEFR band this difficulty targets. */
  readonly cefrRange: readonly [CefrLevel, CefrLevel];
  readonly description: string;
  /** Suggested TTS speed. The user's explicit setting still wins. */
  readonly suggestedSpeed: SpeakingSpeed;
  /** Rough cap on AI reply length, in words. Steers the prompt, not a hard trim. */
  readonly targetReplyWords: readonly [number, number];
  /** Injected into the conversation system prompt. */
  readonly prompt: string;
}

export const DIFFICULTY_LIST: readonly DifficultyDefinition[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    shortLabel: 'A1',
    cefrRange: ['A1', 'A1'],
    description: 'Very short sentences, the most common 500 words, lots of repetition.',
    suggestedSpeed: 0.75,
    targetReplyWords: [10, 25],
    prompt: [
      'Speak in very short, simple sentences (5-10 words).',
      'Use only high-frequency everyday vocabulary. No idioms, no phrasal verbs, no slang.',
      'Use the present simple and past simple almost exclusively.',
      'Rephrase your own sentence in simpler words if the learner seems lost, without pointing out that you are simplifying.',
    ].join(' '),
  },
  {
    id: 'elementary',
    label: 'Elementary',
    shortLabel: 'A2',
    cefrRange: ['A2', 'A2'],
    description: 'Everyday vocabulary, simple past and future, short natural replies.',
    suggestedSpeed: 0.75,
    targetReplyWords: [15, 35],
    prompt: [
      'Speak in short, clear sentences.',
      'Use common everyday vocabulary and only the most frequent phrasal verbs (get up, look for, find out).',
      'Mix present, past and simple future. Avoid conditionals and the perfect tenses.',
    ].join(' '),
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    shortLabel: 'B1',
    cefrRange: ['B1', 'B1'],
    description: 'Natural everyday speech with occasional idioms and opinions.',
    suggestedSpeed: 1.0,
    targetReplyWords: [25, 50],
    prompt: [
      'Speak naturally at a normal everyday register.',
      'Use common idioms and phrasal verbs, but explain nothing unless asked.',
      'Give real opinions and back them up with a short reason or an example from your own life.',
    ].join(' '),
  },
  {
    id: 'upper_intermediate',
    label: 'Upper Intermediate',
    shortLabel: 'B2',
    cefrRange: ['B2', 'B2'],
    description: 'Fuller answers, hypotheticals, nuance and light disagreement.',
    suggestedSpeed: 1.0,
    targetReplyWords: [35, 65],
    prompt: [
      'Speak at a natural native pace with full, flowing sentences.',
      'Use idioms, hedging ("I suppose", "to be fair") and conditionals freely.',
      'Disagree when you disagree, and defend your position with an argument rather than just restating it.',
    ].join(' '),
  },
  {
    id: 'advanced',
    label: 'Advanced',
    shortLabel: 'C1',
    cefrRange: ['C1', 'C1'],
    description: 'Abstract topics, dense vocabulary, real argumentation.',
    suggestedSpeed: 1.25,
    targetReplyWords: [45, 80],
    prompt: [
      'Speak exactly as you would to another fluent adult. Do not simplify anything.',
      'Use precise, less common vocabulary, cultural references, irony and understatement.',
      'Move between the concrete and the abstract, and challenge weak reasoning directly.',
    ].join(' '),
  },
  {
    id: 'expert',
    label: 'Expert',
    shortLabel: 'C2',
    cefrRange: ['C2', 'C2'],
    description: 'Fast, idiom-dense, culturally loaded. No accommodation at all.',
    suggestedSpeed: 1.25,
    targetReplyWords: [50, 95],
    prompt: [
      'Make zero accommodation for a non-native speaker.',
      'Use dense idiomatic language, regional expressions, rapid topic shifts, sarcasm and wordplay.',
      'Interrupt your own sentences and self-correct the way people genuinely do in fast speech.',
    ].join(' '),
  },
];

const BY_ID = new Map<Difficulty, DifficultyDefinition>(DIFFICULTY_LIST.map((d) => [d.id, d]));

export const getDifficulty = (id: Difficulty): DifficultyDefinition =>
  BY_ID.get(id) ?? (DIFFICULTY_LIST[2] as DifficultyDefinition);

/** Suggests a difficulty from the measured level, used to seed a new profile. */
export const difficultyForLevel = (level: CefrLevel): Difficulty => {
  switch (level) {
    case 'A1':
      return 'beginner';
    case 'A2':
      return 'elementary';
    case 'B1':
      return 'intermediate';
    case 'B2':
      return 'upper_intermediate';
    case 'C1':
      return 'advanced';
    case 'C2':
      return 'expert';
  }
};
