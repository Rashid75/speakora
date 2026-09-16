import { DEFAULT_SETTINGS } from '@/config/appConfig';
import { BUILTIN_TOPICS } from '@/data/topics';
import {
  buildAssistantMessage,
  buildUserMessage,
  createConversation,
} from '@/services/conversation/ConversationService';
import { failure, type Topic, type TurnAnalysis } from '@/types';
import {
  canStartListening,
  conversationReducer,
  createInitialState,
  isBusy,
  type ConversationState,
} from '../conversationReducer';

const topic = BUILTIN_TOPICS[0] as Topic;

const freshState = (): ConversationState =>
  createInitialState(createConversation(topic, DEFAULT_SETTINGS));

const analysis: TurnAnalysis = {
  grammar: [],
  vocabulary: [],
  expressions: [],
  fluency: { score: 80, fillerWords: [], repeatedWords: [], observations: [] },
  pronunciation: { available: false, reason: 'typed' },
  confidence: { score: 75, observations: [] },
  polishedResponse: 'Polished.',
  alternativeAnswers: ['I prefer the bus.', 'I usually walk to work.'],
  levelEstimate: 'B1',
  overallScore: 80,
  headline: 'Good.',
};

describe('createInitialState', () => {
  it('opens with the AI speaking first, so there is never silence', () => {
    const state = freshState();
    expect(state.conversation.messages).toHaveLength(1);
    expect(state.conversation.messages[0]?.role).toBe('assistant');
    expect(state.phase).toBe('idle');
  });

  it('starts a fresh conversation at zero elapsed time', () => {
    expect(freshState().elapsedMs).toBe(0);
  });

  it('resumes the timer from a stored conversation instead of restarting it', () => {
    const stored = { ...createConversation(topic, DEFAULT_SETTINGS), durationMs: 132_000 };
    expect(createInitialState(stored).elapsedMs).toBe(132_000);
  });

  it('does not wipe the stored duration when a resumed conversation continues', () => {
    const stored = { ...createConversation(topic, DEFAULT_SETTINGS), durationMs: 132_000 };
    const state = conversationReducer(createInitialState(stored), {
      type: 'user_turn_committed',
      message: {
        id: 'u1',
        role: 'user',
        text: 'Carrying on.',
        createdAt: new Date().toISOString(),
      },
    });
    expect(state.conversation.durationMs).toBe(132_000);
  });
});

describe('tracking which message is being read aloud', () => {
  it('marks the message that started speaking', () => {
    const state = conversationReducer(freshState(), {
      type: 'speaking_started',
      messageId: 'msg-7',
    });
    expect(state.speakingMessageId).toBe('msg-7');
    expect(state.phase).toBe('speaking');
  });

  it('clears the mark when speech ends', () => {
    let state = conversationReducer(freshState(), {
      type: 'speaking_started',
      messageId: 'msg-7',
    });
    state = conversationReducer(state, { type: 'speaking_finished' });
    expect(state.speakingMessageId).toBeUndefined();
  });

  it('clears the mark even when a pause was requested mid-utterance', () => {
    let state = conversationReducer(freshState(), {
      type: 'speaking_started',
      messageId: 'msg-7',
    });
    state = conversationReducer(state, { type: 'paused' });
    state = conversationReducer(state, { type: 'speaking_finished' });
    expect(state.speakingMessageId).toBeUndefined();
    expect(state.phase).toBe('paused');
  });
});

describe('the listening -> processing -> speaking cycle', () => {
  it('clears interim transcript and level when a turn commits', () => {
    let state = freshState();
    state = conversationReducer(state, { type: 'listening_started' });
    state = conversationReducer(state, { type: 'interim_transcript', text: 'I think that' });
    state = conversationReducer(state, { type: 'input_level', level: 0.6 });
    expect(state.interimTranscript).toBe('I think that');

    state = conversationReducer(state, {
      type: 'user_turn_committed',
      message: buildUserMessage({ text: 'I think that is right', inputMode: 'voice' }),
    });

    expect(state.phase).toBe('processing');
    expect(state.interimTranscript).toBe('');
    expect(state.inputLevel).toBe(0);
    expect(state.conversation.stats.userTurns).toBe(1);
  });

  it('returns to idle after the assistant replies', () => {
    let state = freshState();
    state = conversationReducer(state, {
      type: 'user_turn_committed',
      message: buildUserMessage({ text: 'Hello there friend', inputMode: 'voice' }),
    });
    state = conversationReducer(state, {
      type: 'assistant_replied',
      message: buildAssistantMessage('Good to hear from you'),
      elapsedMinutes: 1,
      transitioned: false,
    });
    expect(state.phase).toBe('idle');
    expect(state.conversation.messages).toHaveLength(3);
  });

  it('records a transition only when one actually happened', () => {
    let state = freshState();
    state = conversationReducer(state, {
      type: 'assistant_replied',
      message: buildAssistantMessage('Anyway, speaking of work...'),
      elapsedMinutes: 61,
      transitioned: true,
    });
    expect(state.transition.transitionCount).toBe(1);
    expect(state.transition.lastTransitionAtMinutes).toBe(61);
  });

  it('ignores interim results that arrive after the turn committed', () => {
    let state = freshState();
    state = conversationReducer(state, {
      type: 'user_turn_committed',
      message: buildUserMessage({ text: 'Committed already', inputMode: 'voice' }),
    });
    state = conversationReducer(state, { type: 'interim_transcript', text: 'late event' });
    expect(state.interimTranscript).toBe('');
  });
});

describe('pause and resume', () => {
  it('stops the timer while paused', () => {
    let state = freshState();
    state = conversationReducer(state, { type: 'tick', deltaMs: 1000 });
    expect(state.elapsedMs).toBe(1000);

    state = conversationReducer(state, { type: 'paused' });
    state = conversationReducer(state, { type: 'tick', deltaMs: 1000 });
    expect(state.elapsedMs).toBe(1000);

    state = conversationReducer(state, { type: 'resumed' });
    state = conversationReducer(state, { type: 'tick', deltaMs: 500 });
    expect(state.elapsedMs).toBe(1500);
  });

  it('holds a pause requested mid-utterance until speech finishes', () => {
    let state = freshState();
    state = conversationReducer(state, { type: 'speaking_started', messageId: undefined });
    state = conversationReducer(state, { type: 'paused' });
    state = conversationReducer(state, { type: 'speaking_finished' });
    expect(state.phase).toBe('paused');
  });

  it('blocks listening while paused', () => {
    let state = freshState();
    state = conversationReducer(state, { type: 'paused' });
    expect(canStartListening(state)).toBe(false);
  });
});

describe('analysis results', () => {
  it('attaches an analysis to the right message', () => {
    const message = buildUserMessage({ text: 'Something worth analysing', inputMode: 'voice' });
    let state = freshState();
    state = conversationReducer(state, { type: 'user_turn_committed', message });
    state = conversationReducer(state, {
      type: 'analysis_ready',
      messageId: message.id,
      analysis,
    });

    const stored = state.conversation.messages.find((item) => item.id === message.id);
    expect(stored?.analysisState).toBe('ready');
    expect(stored?.analysis?.polishedResponse).toBe('Polished.');
  });

  it('marks a failed analysis without losing the message', () => {
    const message = buildUserMessage({ text: 'Something to analyse', inputMode: 'voice' });
    let state = freshState();
    state = conversationReducer(state, { type: 'user_turn_committed', message });
    state = conversationReducer(state, { type: 'analysis_failed', messageId: message.id });

    const stored = state.conversation.messages.find((item) => item.id === message.id);
    expect(stored?.analysisState).toBe('failed');
    expect(stored?.text).toBe('Something to analyse');
  });
});

describe('error handling', () => {
  it('enters the error phase and can be dismissed back to idle', () => {
    let state = freshState();
    state = conversationReducer(state, { type: 'failed', failure: failure('offline') });
    expect(state.phase).toBe('error');
    expect(isBusy(state)).toBe(false);

    state = conversationReducer(state, { type: 'dismiss_error' });
    expect(state.phase).toBe('idle');
    expect(state.failure).toBeUndefined();
  });

  it('returns to paused, not idle, when dismissing an error while paused', () => {
    let state = freshState();
    state = conversationReducer(state, { type: 'paused' });
    state = conversationReducer(state, { type: 'failed', failure: failure('timeout') });
    state = conversationReducer(state, { type: 'dismiss_error' });
    expect(state.phase).toBe('paused');
  });

  it('allows retrying from an error state', () => {
    let state = freshState();
    state = conversationReducer(state, { type: 'failed', failure: failure('ai_unavailable') });
    expect(canStartListening(state)).toBe(true);
  });
});

describe('counters', () => {
  it('counts user words and fillers from the transcript', () => {
    let state = freshState();
    state = conversationReducer(state, {
      type: 'user_turn_committed',
      message: buildUserMessage({ text: 'um I went to the shop uh yesterday', inputMode: 'voice' }),
    });
    expect(state.conversation.stats.userTurns).toBe(1);
    expect(state.conversation.stats.userWords).toBe(8);
    expect(state.conversation.stats.fillerWordCount).toBeGreaterThan(0);
  });
});
