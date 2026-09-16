import type { CefrLevel } from './assessment';
import type { ConversationAssessment, TurnAnalysis } from './feedback';
import type { AccentId, Difficulty, PersonalityId, SpeakingSpeed } from './settings';
import type { Topic } from './topic';

export type MessageRole = 'user' | 'assistant';

/** How a user message arrived. Analysis quality depends on this. */
export type InputMode = 'voice' | 'text';

export interface ConversationMessage {
  readonly id: string;
  readonly role: MessageRole;
  readonly text: string;
  readonly createdAt: string;
  readonly inputMode?: InputMode;
  /**
   * Speech recognizer confidence, 0-1, when the platform reported one.
   * `undefined` means "not reported" - we never invent a value.
   */
  readonly speechConfidence?: number;
  /** Wall-clock milliseconds the user spent speaking this turn. */
  readonly speakingMs?: number;
  /** Populated asynchronously once the feedback pass completes. */
  readonly analysis?: TurnAnalysis;
  readonly analysisState?: 'pending' | 'ready' | 'failed' | 'skipped';
}

export interface ConversationConfig {
  readonly difficulty: Difficulty;
  readonly personalityId: PersonalityId;
  readonly accent: AccentId;
  readonly speakingSpeed: SpeakingSpeed;
}

export type ConversationStatus = 'active' | 'completed' | 'abandoned';

/** Cheap denormalised counters so the History list never re-scans messages. */
export interface ConversationCounters {
  readonly userTurns: number;
  readonly assistantTurns: number;
  readonly userWords: number;
  readonly fillerWordCount: number;
}

export interface Conversation {
  readonly id: string;
  readonly topicId: string;
  readonly topicTitle: string;
  readonly topicEmoji: string;
  readonly categoryId: string;
  /** Snapshot of the topic, so history survives a topic being edited or deleted. */
  readonly topicSnapshot: Topic;
  readonly config: ConversationConfig;
  readonly messages: readonly ConversationMessage[];
  readonly startedAt: string;
  readonly endedAt?: string;
  /** Accumulated active duration, excluding paused time. */
  readonly durationMs: number;
  readonly status: ConversationStatus;
  readonly assessment?: ConversationAssessment;
  readonly stats: ConversationCounters;
  readonly schemaVersion: number;
}

/** Lightweight row used by the History list. */
export interface ConversationSummary {
  readonly id: string;
  readonly topicTitle: string;
  readonly topicEmoji: string;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly userTurns: number;
  readonly status: ConversationStatus;
  readonly level?: CefrLevel;
  readonly overallScore?: number;
  readonly headline?: string;
}

/** Finite state machine for the live conversation screen. */
export type VoicePhase =
  'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'paused' | 'ended' | 'error';
