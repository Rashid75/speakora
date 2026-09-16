import type { Difficulty } from './settings';

export type TopicCategoryId =
  | 'tech_talk'
  | 'daily_conversation'
  | 'professional_english'
  | 'travel_and_life'
  | 'exams_and_interviews'
  | 'custom';

export interface TopicCategory {
  readonly id: TopicCategoryId;
  readonly title: string;
  readonly subtitle: string;
  readonly emoji: string;
  /** Semantic accent key resolved against the active theme, never a raw hex. */
  readonly accent: 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  readonly order: number;
}

export type TopicSource = 'builtin' | 'custom';

export interface Topic {
  readonly id: string;
  readonly categoryId: TopicCategoryId;
  readonly title: string;
  /** One-line description shown on the card. */
  readonly summary: string;
  readonly emoji: string;
  /** Difficulty the topic is authored for; the user can still override it. */
  readonly suggestedDifficulty: Difficulty;
  /**
   * The scenario handed to the AI: who the partner is, what the setting is and
   * what should happen. Injected into the conversation system prompt.
   */
  readonly scenario: string;
  /** Concrete conversational beats the AI can steer towards. */
  readonly talkingPoints: readonly string[];
  /** Vocabulary the learner is likely to need. Surfaced in the setup sheet. */
  readonly usefulPhrases: readonly string[];
  /** First line the AI says, so a conversation never starts with silence. */
  readonly openingLine: string;
  readonly source: TopicSource;
  readonly createdAt?: string;
  /** Only present for custom topics: what the learner originally typed. */
  readonly originalPrompt?: string;
  readonly estimatedMinutes: number;
}

/** Shape returned by the AI when it optimises a user-written custom topic. */
export interface OptimizedTopicDraft {
  readonly title: string;
  readonly summary: string;
  readonly emoji: string;
  readonly scenario: string;
  readonly talkingPoints: readonly string[];
  readonly usefulPhrases: readonly string[];
  readonly openingLine: string;
  readonly suggestedDifficulty: Difficulty;
}
