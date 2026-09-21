import type { AppSettings } from '@/types';

/** Storage schema version. Bump when a migration is needed. */
export const STORAGE_SCHEMA_VERSION = 1;

export const APP_NAME = 'Speakora';

export const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    name: '',
    gender: 'unspecified',
    ageBand: 'unspecified',
    selfReportedLevel: 'unknown',
    learningGoal: '',
  },
  themeId: 'default',
  colorScheme: 'system',
  personalityId: 'warm',
  accent: 'american',
  speakingSpeed: 1.0,
  difficulty: 'intermediate',
  autoSpeak: true,
  handsFreeMode: true,
  liveFeedback: true,
  showInterimTranscript: true,
  topicRotationMinutes: 60,
  dailyReminder: true,
  hasOnboarded: false,
  accentChallengeMode: false,
  schemaVersion: STORAGE_SCHEMA_VERSION,
};

export const CONVERSATION_LIMITS = {
  /** Turns of history sent to the model. Keeps latency and cost predictable. */
  maxHistoryTurns: 24,
  /** Below this word count we skip the feedback pass - nothing to analyse. */
  minWordsForAnalysis: 4,
  /** Guard against a stuck recognizer holding the mic forever. */
  maxSingleUtteranceMs: 60_000,
  /** Silence after which we auto-stop listening in hands-free mode. */
  silenceTimeoutMs: 2_500,
  /** Analyses kept in memory for the rolling level estimate. */
  levelEvidenceWindow: 12,
  /** Conversations retained on device. Oldest are pruned beyond this. */
  maxStoredConversations: 200,
} as const;

export const AI_LIMITS = {
  maxOutputTokensConversation: 400,
  maxOutputTokensAnalysis: 900,
  maxOutputTokensAssessment: 900,
  maxOutputTokensTopic: 900,
  // One word, one meaning, a few synonyms and three short sentences.
  maxOutputTokensWord: 500,
  retryAttempts: 2,
  retryBaseDelayMs: 700,
} as const;
