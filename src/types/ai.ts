import type { CefrLevel, ProgressState } from './assessment';
import type { AppFailure, Result } from './common';
import type { Conversation } from './conversation';
import type { ConversationAssessment, TurnAnalysis } from './feedback';
import type { AppSettings } from './settings';
import type { OptimizedTopicDraft, Topic } from './topic';

/** Provider-agnostic chat turn. */
export interface AiChatTurn {
  readonly role: 'user' | 'model';
  readonly text: string;
}

export interface ConversationTurnRequest {
  readonly topic: Topic;
  readonly settings: AppSettings;
  readonly history: readonly AiChatTurn[];
  readonly userText: string;
  /** Minutes elapsed, so the prompt can nudge a natural topic transition. */
  readonly elapsedMinutes: number;
  readonly shouldTransitionTopic: boolean;
  readonly progress: ProgressState;
}

export interface ConversationTurnResult {
  readonly reply: string;
  /** True when the model signalled that it steered the conversation somewhere new. */
  readonly introducedNewTopic: boolean;
}

export interface AnalyzeTurnRequest {
  readonly userText: string;
  /** What the AI had just said, so the analysis can judge relevance. */
  readonly assistantPrompt: string;
  readonly settings: AppSettings;
  readonly topic: Topic;
  /** Only supplied for voice turns where the recognizer reported a confidence. */
  readonly speechConfidence?: number;
  readonly speakingMs?: number;
  readonly wordCount: number;
}

export interface OptimizeTopicRequest {
  readonly rawPrompt: string;
  readonly settings: AppSettings;
}

export interface EvaluateConversationRequest {
  readonly conversation: Conversation;
}

export interface EstimateLevelRequest {
  readonly recentAnalyses: readonly TurnAnalysis[];
  readonly previous: ProgressState;
}

export interface LevelEstimateResult {
  readonly level: CefrLevel;
  readonly confidence: number;
  readonly rationale: readonly string[];
}

/**
 * The single seam between the app and any LLM vendor.
 *
 * Implementations must never throw: every method returns a Result so callers
 * can render a friendly state instead of crashing.
 */
export interface AIProvider {
  readonly id: string;
  readonly isConfigured: boolean;
  generateResponse(
    request: ConversationTurnRequest,
    signal?: AbortSignal,
  ): Promise<Result<ConversationTurnResult, AppFailure>>;
  analyzeSpeech(
    request: AnalyzeTurnRequest,
    signal?: AbortSignal,
  ): Promise<Result<TurnAnalysis, AppFailure>>;
  optimizeTopic(
    request: OptimizeTopicRequest,
    signal?: AbortSignal,
  ): Promise<Result<OptimizedTopicDraft, AppFailure>>;
  evaluateConversation(
    request: EvaluateConversationRequest,
    signal?: AbortSignal,
  ): Promise<Result<ConversationAssessment, AppFailure>>;
  estimateEnglishLevel(
    request: EstimateLevelRequest,
    signal?: AbortSignal,
  ): Promise<Result<LevelEstimateResult, AppFailure>>;
}
