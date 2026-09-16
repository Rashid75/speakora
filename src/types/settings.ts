import type { CefrLevel } from './assessment';

export const DIFFICULTY_LEVELS = [
  'beginner',
  'elementary',
  'intermediate',
  'upper_intermediate',
  'advanced',
  'expert',
] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export const ACCENTS = [
  'american',
  'british',
  'australian',
  'canadian',
  'indian',
  'challenging',
] as const;
export type AccentId = (typeof ACCENTS)[number];

export const SPEAKING_SPEEDS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;
export type SpeakingSpeed = (typeof SPEAKING_SPEEDS)[number];

export const PERSONALITIES = ['warm', 'elegant', 'youthful'] as const;
export type PersonalityId = (typeof PERSONALITIES)[number];

export const THEME_IDS = ['default', 'ocean', 'forest', 'midnight', 'minimal'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type ColorSchemePreference = 'system' | 'light' | 'dark';

/**
 * Both are optional by design and default to `unspecified`. They only ever
 * choose a default cartoon avatar - nothing about the coaching changes - so
 * there is no reason to press anyone for them.
 */
export const GENDERS = ['female', 'male', 'unspecified'] as const;
export type Gender = (typeof GENDERS)[number];

export const AGE_BANDS = ['under_18', '18_29', '30_44', '45_plus', 'unspecified'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

/** The goal chips offered during onboarding. */
export const LEARNING_GOALS = ['Work & meetings', 'Interviews', 'Everyday chat', 'Travel'] as const;
export type LearningGoal = (typeof LEARNING_GOALS)[number];

export interface UserProfile {
  /** Empty string means "not set" — the UI falls back to a neutral greeting. */
  readonly name: string;
  /**
   * The avatar is derived from these two, never chosen: one less thing to keep
   * in sync, and nothing stored that could disagree with them.
   */
  readonly gender: Gender;
  readonly ageBand: AgeBand;
  /** What the learner self-reports. The measured level lives in ProgressState. */
  readonly selfReportedLevel: CefrLevel | 'unknown';
  readonly learningGoal: string;
}

export interface AppSettings {
  readonly profile: UserProfile;
  readonly themeId: ThemeId;
  readonly colorScheme: ColorSchemePreference;
  readonly personalityId: PersonalityId;
  readonly accent: AccentId;
  readonly speakingSpeed: SpeakingSpeed;
  readonly difficulty: Difficulty;
  /** Auto-play the AI reply through TTS as soon as it arrives. */
  readonly autoSpeak: boolean;
  /** Re-open the mic automatically after the AI finishes speaking. */
  readonly handsFreeMode: boolean;
  /** Analyse each user turn in the background and surface a feedback badge. */
  readonly liveFeedback: boolean;
  /** Show interim (partial) speech recognition results while speaking. */
  readonly showInterimTranscript: boolean;
  /** Minutes of conversation before the AI is nudged to change topic. */
  readonly topicRotationMinutes: number;
  /**
   * A local, once-a-day nudge with a topic to try. Off is honoured instantly;
   * on is still subject to the OS permission, which can say no.
   */
  readonly dailyReminder: boolean;
  /** False until the learner completes the first-run flow. */
  readonly hasOnboarded: boolean;
  /**
   * Occasionally swap in a harder regional accent for listening practice,
   * regardless of the chosen accent. Surfaced in Settings as a toggle.
   */
  readonly accentChallengeMode: boolean;
  readonly schemaVersion: number;
}
