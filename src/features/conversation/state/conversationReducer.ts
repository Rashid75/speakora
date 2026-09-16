import type {
  AppFailure,
  Conversation,
  ConversationMessage,
  TurnAnalysis,
  VoicePhase,
} from '@/types';
import { recomputeCounters } from '@/services/conversation/ConversationService';
import {
  INITIAL_TRANSITION_STATE,
  recordTransition,
  type TransitionState,
} from '@/services/conversation/TopicTransitionPolicy';

/**
 * The conversation screen's state machine.
 *
 * A reducer rather than a dozen `useState` calls, because the voice flow has
 * real invariants: you cannot be listening and speaking at once, an interim
 * transcript must be cleared when a turn commits, and the timer must not run
 * while paused. Expressing those as transitions makes them testable without
 * mounting a component or touching a microphone.
 *
 *   idle -> listening -> processing -> speaking -> listening
 *                \-> paused -> (resume)
 */

export interface ConversationState {
  readonly conversation: Conversation;
  readonly phase: VoicePhase;
  /** Live partial transcript while the user speaks. */
  readonly interimTranscript: string;
  /** 0-1 microphone level for the waveform, when the platform reports it. */
  readonly inputLevel: number;
  /**
   * Which message is being read aloud right now, so the transcript can mark
   * that one turn rather than the whole screen. Undefined when nothing is.
   */
  readonly speakingMessageId: string | undefined;
  /** Active (unpaused) milliseconds. */
  readonly elapsedMs: number;
  readonly isPaused: boolean;
  readonly failure: AppFailure | undefined;
  /** Non-blocking notice, e.g. "I did not catch that". */
  readonly notice: string | undefined;
  readonly transition: TransitionState;
  /** Message id whose feedback sheet is open. */
  readonly openFeedbackFor: string | undefined;
  readonly isFinishing: boolean;
}

export type ConversationAction =
  | { type: 'listening_started' }
  | { type: 'interim_transcript'; text: string }
  | { type: 'input_level'; level: number }
  | { type: 'listening_ended' }
  | { type: 'user_turn_committed'; message: ConversationMessage }
  | { type: 'question_skipped' }
  | { type: 'restarted'; conversation: Conversation }
  | {
      type: 'assistant_replied';
      message: ConversationMessage;
      elapsedMinutes: number;
      transitioned: boolean;
    }
  | { type: 'speaking_started'; messageId: string | undefined }
  | { type: 'speaking_finished' }
  | { type: 'analysis_ready'; messageId: string; analysis: TurnAnalysis }
  | { type: 'analysis_failed'; messageId: string }
  | { type: 'analysis_skipped'; messageId: string }
  | { type: 'tick'; deltaMs: number }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'failed'; failure: AppFailure }
  | { type: 'notice'; message: string | undefined }
  | { type: 'dismiss_error' }
  | { type: 'open_feedback'; messageId: string | undefined }
  | { type: 'finishing' }
  | { type: 'finished'; conversation: Conversation }
  | { type: 'reset_phase' };

export const createInitialState = (conversation: Conversation): ConversationState => ({
  conversation,
  phase: 'idle',
  interimTranscript: '',
  inputLevel: 0,
  speakingMessageId: undefined,
  // Seeded from the record rather than zeroed, so resuming continues the timer
  // instead of restarting it. `withMessages` writes `elapsedMs` back into
  // `durationMs` on every turn, so a zero here would erase the stored duration
  // the moment the learner said anything.
  elapsedMs: conversation.durationMs,
  isPaused: false,
  failure: undefined,
  notice: undefined,
  transition: INITIAL_TRANSITION_STATE,
  openFeedbackFor: undefined,
  isFinishing: false,
});

const withMessages = (
  state: ConversationState,
  messages: readonly ConversationMessage[],
): ConversationState => ({
  ...state,
  conversation: {
    ...state.conversation,
    messages,
    durationMs: state.elapsedMs,
    stats: recomputeCounters(messages),
  },
});

const patchMessage = (
  state: ConversationState,
  messageId: string,
  patch: Partial<ConversationMessage>,
): ConversationState => {
  const messages = state.conversation.messages.map((message) =>
    message.id === messageId ? { ...message, ...patch } : message,
  );
  return { ...state, conversation: { ...state.conversation, messages } };
};

export const conversationReducer = (
  state: ConversationState,
  action: ConversationAction,
): ConversationState => {
  switch (action.type) {
    case 'listening_started':
      return {
        ...state,
        phase: 'listening',
        interimTranscript: '',
        inputLevel: 0,
        failure: undefined,
        notice: undefined,
      };

    case 'interim_transcript':
      // Ignore late events that arrive after the turn already committed.
      return state.phase === 'listening' ? { ...state, interimTranscript: action.text } : state;

    case 'input_level':
      return state.phase === 'listening' ? { ...state, inputLevel: action.level } : state;

    case 'listening_ended':
      return state.phase === 'listening'
        ? { ...state, phase: 'idle', interimTranscript: '', inputLevel: 0 }
        : state;

    case 'user_turn_committed': {
      const next = withMessages(state, [...state.conversation.messages, action.message]);
      return {
        ...next,
        phase: 'processing',
        interimTranscript: '',
        inputLevel: 0,
        notice: undefined,
      };
    }

    // Everything resets, including the timer and the transition bookkeeping -
    // this is a different conversation on the same topic, not a continuation.
    case 'restarted':
      return createInitialState(action.conversation);

    // No message is appended: the learner said nothing, so nothing should land
    // in the transcript or in the turn counters. Only the phase moves.
    case 'question_skipped':
      return {
        ...state,
        phase: 'processing',
        interimTranscript: '',
        inputLevel: 0,
        notice: undefined,
      };

    case 'assistant_replied': {
      const next = withMessages(state, [...state.conversation.messages, action.message]);
      return {
        ...next,
        phase: 'idle',
        transition: action.transitioned
          ? recordTransition(state.transition, action.elapsedMinutes)
          : state.transition,
      };
    }

    case 'speaking_started':
      return { ...state, phase: 'speaking', speakingMessageId: action.messageId };

    case 'speaking_finished': {
      const quiet = { ...state, speakingMessageId: undefined };
      // A pause requested mid-utterance takes effect once speech ends.
      return state.isPaused
        ? { ...quiet, phase: 'paused' }
        : state.phase === 'speaking'
          ? { ...quiet, phase: 'idle' }
          : quiet;
    }

    case 'analysis_ready':
      return patchMessage(state, action.messageId, {
        analysis: action.analysis,
        analysisState: 'ready',
      });

    case 'analysis_failed':
      return patchMessage(state, action.messageId, { analysisState: 'failed' });

    case 'analysis_skipped':
      return patchMessage(state, action.messageId, { analysisState: 'skipped' });

    case 'tick': {
      if (state.isPaused || state.phase === 'ended') return state;
      const elapsedMs = state.elapsedMs + action.deltaMs;
      return {
        ...state,
        elapsedMs,
        conversation: { ...state.conversation, durationMs: elapsedMs },
      };
    }

    case 'paused':
      return { ...state, isPaused: true, phase: 'paused', interimTranscript: '', inputLevel: 0 };

    case 'resumed':
      return { ...state, isPaused: false, phase: 'idle', failure: undefined };

    case 'failed':
      return {
        ...state,
        phase: 'error',
        failure: action.failure,
        interimTranscript: '',
        inputLevel: 0,
      };

    case 'notice':
      return { ...state, notice: action.message };

    case 'dismiss_error':
      return { ...state, phase: state.isPaused ? 'paused' : 'idle', failure: undefined };

    case 'open_feedback':
      return { ...state, openFeedbackFor: action.messageId };

    case 'finishing':
      return { ...state, isFinishing: true };

    case 'finished':
      return { ...state, conversation: action.conversation, phase: 'ended', isFinishing: false };

    case 'reset_phase':
      return state.phase === 'error' ? state : { ...state, phase: 'idle' };

    default:
      return state;
  }
};

/** True when the mic may be opened. */
export const canStartListening = (state: ConversationState): boolean =>
  !state.isPaused &&
  (state.phase === 'idle' || state.phase === 'speaking' || state.phase === 'error');

/** True when the AI is working and the user should wait. */
export const isBusy = (state: ConversationState): boolean =>
  state.phase === 'processing' || state.phase === 'connecting';
