import { AI_LIMITS, CONVERSATION_LIMITS } from '@/config/appConfig';
import { env, isAiConfigured } from '@/config/env';
import {
  buildConversationSummaryPrompt,
  buildConversationSystemPrompt,
  buildFeedbackPrompt,
  buildLevelAssessmentPrompt,
  buildTopicOptimizationPrompt,
  buildWordLookupPrompt,
} from '@/prompts';
import {
  failure,
  type AIProvider,
  type AnalyzeTurnRequest,
  type AppFailure,
  type ConversationAssessment,
  type ConversationTurnRequest,
  type ConversationTurnResult,
  type EstimateLevelRequest,
  type EvaluateConversationRequest,
  type LevelEstimateResult,
  type OptimizeTopicRequest,
  type OptimizedTopicDraft,
  type Result,
  type TurnAnalysis,
  type WordEntry,
  type WordLookupRequest,
} from '@/types';
import { sleep } from '@/utils/time';
import { createLogger } from '@/services/logging/logger';
import {
  parseConversationAssessment,
  parseConversationReply,
  parseLevelEstimate,
  parseOptimizedTopic,
  parseTurnAnalysis,
  parseWordEntry,
} from '../parsers';
import { generateContent, type GeminiContent } from './geminiClient';

const log = createLogger('GeminiProvider');

/**
 * Gemini implementation of `AIProvider`.
 *
 * Everything vendor-specific stops here: prompt assembly, temperature choices,
 * retry policy and response repair. Swapping in an OpenAI or Anthropic provider
 * means writing one more file in this folder and changing `AI_PROVIDER`.
 */
export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';

  get isConfigured(): boolean {
    return isAiConfigured(env);
  }

  async generateResponse(
    request: ConversationTurnRequest,
    signal?: AbortSignal,
  ): Promise<Result<ConversationTurnResult, AppFailure>> {
    const contents: GeminiContent[] = request.history
      .slice(-CONVERSATION_LIMITS.maxHistoryTurns)
      .map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }));

    contents.push({ role: 'user', parts: [{ text: request.userText }] });

    const result = await this.withRetry(
      () =>
        generateContent({
          operation: 'conversation',
          systemInstruction: buildConversationSystemPrompt(request),
          contents,
          // High enough to avoid the flat, repetitive register that makes an
          // LLM read as a chatbot rather than a person.
          temperature: 1.0,
          maxOutputTokens: AI_LIMITS.maxOutputTokensConversation,
          json: false,
          signal,
        }),
      signal,
    );

    if (!result.ok) return result;

    const parsed = parseConversationReply(result.value, request.shouldTransitionTopic);
    if (!parsed) {
      log.warn('Conversation reply was empty after sanitising');
      return { ok: false, error: failure('ai_invalid_response', 'Empty reply after sanitising') };
    }
    return { ok: true, value: parsed };
  }

  async analyzeSpeech(
    request: AnalyzeTurnRequest,
    signal?: AbortSignal,
  ): Promise<Result<TurnAnalysis, AppFailure>> {
    const result = await this.withRetry(
      () =>
        generateContent({
          operation: 'analysis',
          contents: [{ role: 'user', parts: [{ text: buildFeedbackPrompt(request) }] }],
          // Analysis should be repeatable; conversation should not.
          temperature: 0.2,
          maxOutputTokens: AI_LIMITS.maxOutputTokensAnalysis,
          json: true,
          signal,
        }),
      signal,
    );

    if (!result.ok) return result;

    const parsed = parseTurnAnalysis(
      result.value,
      request.settings.profile.selfReportedLevel === 'unknown'
        ? 'B1'
        : request.settings.profile.selfReportedLevel,
      typeof request.speechConfidence === 'number',
    );
    if (!parsed) {
      return { ok: false, error: failure('ai_invalid_response', 'Analysis JSON unusable') };
    }
    return { ok: true, value: parsed };
  }

  async optimizeTopic(
    request: OptimizeTopicRequest,
    signal?: AbortSignal,
  ): Promise<Result<OptimizedTopicDraft, AppFailure>> {
    const result = await this.withRetry(
      () =>
        generateContent({
          operation: 'topic',
          contents: [{ role: 'user', parts: [{ text: buildTopicOptimizationPrompt(request) }] }],
          temperature: 0.7,
          maxOutputTokens: AI_LIMITS.maxOutputTokensTopic,
          json: true,
          signal,
        }),
      signal,
    );

    if (!result.ok) return result;

    const parsed = parseOptimizedTopic(result.value, request.settings.difficulty);
    if (!parsed) {
      return { ok: false, error: failure('ai_invalid_response', 'Topic JSON unusable') };
    }
    return { ok: true, value: parsed };
  }

  async lookUpWord(
    request: WordLookupRequest,
    signal?: AbortSignal,
  ): Promise<Result<WordEntry, AppFailure>> {
    const result = await this.withRetry(
      () =>
        generateContent({
          operation: 'word',
          contents: [{ role: 'user', parts: [{ text: buildWordLookupPrompt(request) }] }],
          // A definition should not change between two people looking up the
          // same word, so this runs colder than the conversation does.
          temperature: 0.2,
          maxOutputTokens: AI_LIMITS.maxOutputTokensWord,
          json: true,
          signal,
        }),
      signal,
    );

    if (!result.ok) return result;

    const parsed = parseWordEntry(result.value, request.word);
    if (!parsed) {
      return { ok: false, error: failure('ai_invalid_response', 'Word JSON unusable') };
    }
    return { ok: true, value: parsed };
  }

  async evaluateConversation(
    request: EvaluateConversationRequest,
    signal?: AbortSignal,
  ): Promise<Result<ConversationAssessment, AppFailure>> {
    const result = await this.withRetry(
      () =>
        generateContent({
          operation: 'assessment',
          contents: [{ role: 'user', parts: [{ text: buildConversationSummaryPrompt(request) }] }],
          temperature: 0.3,
          maxOutputTokens: AI_LIMITS.maxOutputTokensAssessment,
          json: true,
          signal,
        }),
      signal,
    );

    if (!result.ok) return result;

    // Pronunciation is only meaningful if at least one turn was actually spoken.
    const hasVoiceTurn = request.conversation.messages.some(
      (message) => message.role === 'user' && message.inputMode === 'voice',
    );

    const parsed = parseConversationAssessment(result.value, 'B1', hasVoiceTurn);
    if (!parsed) {
      return { ok: false, error: failure('ai_invalid_response', 'Assessment JSON unusable') };
    }
    return { ok: true, value: parsed };
  }

  async estimateEnglishLevel(
    request: EstimateLevelRequest,
    signal?: AbortSignal,
  ): Promise<Result<LevelEstimateResult, AppFailure>> {
    if (request.recentAnalyses.length === 0) {
      return { ok: false, error: failure('not_found', 'No analyses to assess', false) };
    }

    const result = await this.withRetry(
      () =>
        generateContent({
          operation: 'level',
          contents: [{ role: 'user', parts: [{ text: buildLevelAssessmentPrompt(request) }] }],
          temperature: 0.2,
          maxOutputTokens: 500,
          json: true,
          signal,
        }),
      signal,
    );

    if (!result.ok) return result;

    const parsed = parseLevelEstimate(result.value, request.previous.level);
    if (!parsed) {
      return { ok: false, error: failure('ai_invalid_response', 'Level JSON unusable') };
    }
    return { ok: true, value: parsed };
  }

  /**
   * Retries only failures that could plausibly succeed on a second attempt.
   * A missing API key or blocked content is retried zero times.
   */
  private async withRetry(
    operation: () => Promise<Result<string, AppFailure>>,
    signal?: AbortSignal,
  ): Promise<Result<string, AppFailure>> {
    let lastError: AppFailure = failure('unknown');

    for (let attempt = 0; attempt <= AI_LIMITS.retryAttempts; attempt += 1) {
      if (signal?.aborted) return { ok: false, error: failure('cancelled', 'Aborted', false) };

      const result = await operation();
      if (result.ok) return result;

      lastError = result.error;
      if (!result.error.retryable || attempt === AI_LIMITS.retryAttempts) break;

      // Exponential backoff. Rate limiting gets a longer first pause.
      const multiplier = result.error.code === 'ai_rate_limited' ? 3 : 1;
      const delay = AI_LIMITS.retryBaseDelayMs * multiplier * 2 ** attempt;
      log.debug('Retrying AI request', { attempt: attempt + 1, code: result.error.code, delay });

      try {
        await sleep(delay, signal);
      } catch {
        return { ok: false, error: failure('cancelled', 'Aborted during backoff', false) };
      }
    }

    return { ok: false, error: lastError };
  }
}
