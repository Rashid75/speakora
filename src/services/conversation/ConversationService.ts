import { CONVERSATION_LIMITS, STORAGE_SCHEMA_VERSION } from '@/config/appConfig';
import { openingLinesFor } from '@/data/topics';
import { buildOpeningLine, pickOpeningLine } from '@/prompts';
import { conversationRepository, progressRepository } from '@/repositories';
import { getAIProvider } from '@/services/ai';
import { createLogger } from '@/services/logging/logger';
import { isOnline } from '@/services/network/NetworkService';
import {
  cefrIndex,
  failure,
  type AiChatTurn,
  type AppFailure,
  type AppSettings,
  type Conversation,
  type ConversationAssessment,
  type ConversationMessage,
  type InputMode,
  type ProgressState,
  type Result,
  type Topic,
  type TurnAnalysis,
} from '@/types';
import { applyAssessmentToProgress, applyTurnToProgress } from '@/utils/cefr';
import { createId } from '@/utils/id';
import { analyzeFillers, countWords } from '@/utils/text';
import { nowIso } from '@/utils/time';

const log = createLogger('ConversationService');

/**
 * Orchestrates a conversation: prompts the AI, keeps the transcript, runs the
 * out-of-band feedback pass and folds results into long-term progress.
 *
 * Screens talk to a hook, the hook talks to this service, and only this service
 * knows that an AI provider and three repositories exist.
 */

export const createConversation = (topic: Topic, settings: AppSettings): Conversation => {
  const openingText = buildOpeningLine(
    pickOpeningLine(openingLinesFor(topic)),
    settings.profile.name,
  );

  const opening: ConversationMessage = {
    id: createId('msg'),
    role: 'assistant',
    text: openingText,
    createdAt: nowIso(),
  };

  return {
    id: createId('conv'),
    topicId: topic.id,
    topicTitle: topic.title,
    topicEmoji: topic.emoji,
    categoryId: topic.categoryId,
    topicSnapshot: topic,
    config: {
      difficulty: settings.difficulty,
      personalityId: settings.personalityId,
      accent: settings.accent,
      speakingSpeed: settings.speakingSpeed,
    },
    messages: [opening],
    startedAt: nowIso(),
    durationMs: 0,
    status: 'active',
    stats: { userTurns: 0, assistantTurns: 1, userWords: 0, fillerWordCount: 0 },
    schemaVersion: STORAGE_SCHEMA_VERSION,
  };
};

export interface UserTurnInput {
  readonly text: string;
  readonly inputMode: InputMode;
  readonly speechConfidence?: number;
  readonly speakingMs?: number;
}

export const buildUserMessage = (input: UserTurnInput): ConversationMessage => ({
  id: createId('msg'),
  role: 'user',
  text: input.text.trim(),
  createdAt: nowIso(),
  inputMode: input.inputMode,
  speechConfidence: input.speechConfidence,
  speakingMs: input.speakingMs,
  analysisState: 'pending',
});

export const buildAssistantMessage = (text: string): ConversationMessage => ({
  id: createId('msg'),
  role: 'assistant',
  text,
  createdAt: nowIso(),
});

/** Recomputes the denormalised counters from the transcript. */
export const recomputeCounters = (
  messages: readonly ConversationMessage[],
): Conversation['stats'] => {
  let userTurns = 0;
  let assistantTurns = 0;
  let userWords = 0;
  let fillerWordCount = 0;

  for (const message of messages) {
    if (message.role === 'assistant') {
      assistantTurns += 1;
      continue;
    }
    userTurns += 1;
    userWords += countWords(message.text);
    // Filler counting is local and deterministic; the LLM is not asked for it.
    fillerWordCount += analyzeFillers(message.text).total;
  }

  return { userTurns, assistantTurns, userWords, fillerWordCount };
};

/** Transcript -> provider-neutral chat history. */
export const toChatHistory = (messages: readonly ConversationMessage[]): AiChatTurn[] =>
  messages.slice(-CONVERSATION_LIMITS.maxHistoryTurns).map((message) => ({
    role: message.role === 'user' ? 'user' : 'model',
    text: message.text,
  }));

export interface RequestReplyParams {
  readonly conversation: Conversation;
  readonly settings: AppSettings;
  readonly progress: ProgressState;
  readonly userText: string;
  readonly elapsedMinutes: number;
  readonly shouldTransitionTopic: boolean;
  readonly signal?: AbortSignal;
}

export const requestReply = async (
  params: RequestReplyParams,
): Promise<Result<string, AppFailure>> => {
  if (!isOnline()) {
    return { ok: false, error: failure('offline', 'No connectivity before AI request') };
  }

  const provider = getAIProvider();
  if (!provider.isConfigured) {
    return {
      ok: false,
      error: failure('ai_not_configured', 'Provider missing credentials', false),
    };
  }

  // History excludes the turn we are sending, which the provider appends.
  const history = toChatHistory(params.conversation.messages);

  const result = await provider.generateResponse(
    {
      topic: params.conversation.topicSnapshot,
      settings: params.settings,
      history,
      userText: params.userText,
      elapsedMinutes: params.elapsedMinutes,
      shouldTransitionTopic: params.shouldTransitionTopic,
      progress: params.progress,
    },
    params.signal,
  );

  if (!result.ok) return result;
  return { ok: true, value: result.value.reply };
};

export interface AnalyzeTurnParams {
  readonly conversation: Conversation;
  readonly settings: AppSettings;
  readonly userMessage: ConversationMessage;
  readonly assistantPrompt: string;
  readonly signal?: AbortSignal;
}

/**
 * Feedback pass. Runs *after* the reply is already on screen so it never delays
 * the conversation, and is skipped entirely for turns too short to analyse -
 * "yeah, totally" does not need a grammar report.
 */
export const analyzeTurn = async (
  params: AnalyzeTurnParams,
): Promise<Result<TurnAnalysis, AppFailure>> => {
  const wordCount = countWords(params.userMessage.text);
  if (wordCount < CONVERSATION_LIMITS.minWordsForAnalysis) {
    return { ok: false, error: failure('cancelled', 'Turn too short to analyse', false) };
  }
  if (!isOnline()) {
    return { ok: false, error: failure('offline', 'No connectivity for analysis') };
  }

  return getAIProvider().analyzeSpeech(
    {
      userText: params.userMessage.text,
      assistantPrompt: params.assistantPrompt,
      settings: params.settings,
      topic: params.conversation.topicSnapshot,
      speechConfidence: params.userMessage.speechConfidence,
      speakingMs: params.userMessage.speakingMs,
      wordCount,
    },
    params.signal,
  );
};

/**
 * Folds one analysed turn into the persisted progress state.
 * Returns the new state so the UI can react without re-reading storage.
 */
export const recordAnalysis = async (analysis: TurnAnalysis): Promise<ProgressState> => {
  const [previous, evidence] = await Promise.all([
    progressRepository.load(),
    progressRepository.loadEvidence(),
  ]);

  const { state } = applyTurnToProgress(previous, analysis, evidence);

  await Promise.all([
    progressRepository.save(state),
    progressRepository.pushEvidence(cefrIndex(analysis.levelEstimate)),
    progressRepository.pushAnalysis(analysis),
  ]);

  return state;
};

export interface FinalizeParams {
  readonly conversation: Conversation;
  readonly signal?: AbortSignal;
}

export interface FinalizeResult {
  readonly conversation: Conversation;
  readonly progress: ProgressState;
  /** Present only when the end-of-session assessment succeeded. */
  readonly assessment?: ConversationAssessment;
  /** Set when the assessment could not be produced; the session is still saved. */
  readonly assessmentError?: AppFailure;
}

/**
 * Ends a conversation: stamps it completed, requests the rollup assessment and
 * persists everything.
 *
 * A failed assessment is explicitly *not* a failed finalisation - losing a
 * ten-minute transcript because the network dropped at the end would be the
 * worst possible outcome, so the conversation is saved either way.
 */
export const finalizeConversation = async (params: FinalizeParams): Promise<FinalizeResult> => {
  const ended: Conversation = {
    ...params.conversation,
    status: 'completed',
    endedAt: nowIso(),
    stats: recomputeCounters(params.conversation.messages),
  };

  const hasEnoughToAssess = ended.stats.userTurns >= 2;

  if (!hasEnoughToAssess || !isOnline()) {
    await conversationRepository.save(ended);
    const progress = await progressRepository.load();
    return {
      conversation: ended,
      progress,
      assessmentError: hasEnoughToAssess
        ? failure('offline', 'Offline at end of conversation')
        : failure('cancelled', 'Too few turns to assess', false),
    };
  }

  const result = await getAIProvider().evaluateConversation({ conversation: ended }, params.signal);

  if (!result.ok) {
    log.warn('Assessment failed; saving conversation anyway', {
      code: result.error.code,
      detail: result.error.detail ?? '',
    });
    await conversationRepository.save(ended);
    return {
      conversation: ended,
      progress: await progressRepository.load(),
      assessmentError: result.error,
    };
  }

  const assessed: Conversation = { ...ended, assessment: result.value };
  const pronunciationMeasured = ended.messages.some(
    (message) => message.role === 'user' && typeof message.speechConfidence === 'number',
  );

  const previous = await progressRepository.load();
  const progress = applyAssessmentToProgress(
    previous,
    result.value.level,
    [...result.value.improvements, ...result.value.strengths].slice(0, 4),
    result.value.skills,
    pronunciationMeasured,
  );

  await Promise.all([conversationRepository.save(assessed), progressRepository.save(progress)]);

  return { conversation: assessed, progress, assessment: result.value };
};

/** Saves an in-progress conversation so a crash or force-quit loses nothing. */
export const persistDraft = async (conversation: Conversation): Promise<void> => {
  await conversationRepository.save({
    ...conversation,
    stats: recomputeCounters(conversation.messages),
  });
};
