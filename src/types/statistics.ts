import type { CefrLevel, SkillKey, SkillScores } from './assessment';
import type { Difficulty } from './settings';

export interface TrendPoint {
  /** Day bucket, formatted YYYY-MM-DD. */
  readonly date: string;
  readonly overallScore: number;
  readonly conversations: number;
  readonly speakingMs: number;
}

export interface GroupPerformance {
  readonly key: string;
  readonly label: string;
  readonly conversations: number;
  readonly averageScore: number;
}

export interface MistakePattern {
  readonly pattern: string;
  readonly example: string;
  readonly count: number;
}

export interface StatisticsSnapshot {
  readonly hasData: boolean;
  readonly level: CefrLevel;
  readonly levelConfidence: number;
  readonly levelRationale: readonly string[];
  readonly skills: SkillScores;
  /** Which skill axes are backed by real measurements rather than defaults. */
  readonly skillAvailability: Readonly<Record<SkillKey, boolean>>;
  readonly totalConversations: number;
  readonly completedConversations: number;
  readonly totalSpeakingMs: number;
  readonly averageConversationMs: number;
  readonly totalUserWords: number;
  readonly averageWordsPerTurn: number;
  readonly fillerWordCount: number;
  readonly fillerWordsPer100Words: number;
  readonly currentStreakDays: number;
  readonly trend: readonly TrendPoint[];
  readonly topicPerformance: readonly GroupPerformance[];
  readonly difficultyPerformance: readonly GroupPerformance[];
  readonly commonMistakes: readonly MistakePattern[];
  readonly newVocabulary: readonly string[];
  readonly lastPracticedAt?: string;
  readonly practicedDifficulties: readonly Difficulty[];
}
