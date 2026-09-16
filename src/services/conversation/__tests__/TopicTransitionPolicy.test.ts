import {
  INITIAL_TRANSITION_STATE,
  recordTransition,
  shouldIntroduceNewTopic,
} from '@/services/conversation/TopicTransitionPolicy';
import type { ConversationMessage } from '@/types';

const userTurn = (text: string): ConversationMessage => ({
  id: Math.random().toString(36),
  role: 'user',
  text,
  createdAt: new Date().toISOString(),
});

const aiTurn = (text: string): ConversationMessage => ({
  id: Math.random().toString(36),
  role: 'assistant',
  text,
  createdAt: new Date().toISOString(),
});

const longTurns = (count: number): ConversationMessage[] =>
  Array.from({ length: count }, () =>
    userTurn('That is a really interesting point and I think there is a lot more to say about it'),
  );

const shortTurns = (count: number): ConversationMessage[] =>
  Array.from({ length: count }, () => userTurn('yeah true'));

describe('shouldIntroduceNewTopic', () => {
  it('does not transition early in a conversation', () => {
    const result = shouldIntroduceNewTopic(3, 60, INITIAL_TRANSITION_STATE, longTurns(4));
    expect(result.shouldTransition).toBe(false);
  });

  it('transitions once the rotation interval has elapsed', () => {
    const result = shouldIntroduceNewTopic(61, 60, INITIAL_TRANSITION_STATE, longTurns(4));
    expect(result).toEqual({ shouldTransition: true, reason: 'interval' });
  });

  it('respects a configurable rotation interval', () => {
    const result = shouldIntroduceNewTopic(21, 20, INITIAL_TRANSITION_STATE, longTurns(4));
    expect(result.shouldTransition).toBe(true);
  });

  it('transitions early when the conversation has visibly stalled', () => {
    const result = shouldIntroduceNewTopic(15, 60, INITIAL_TRANSITION_STATE, shortTurns(4));
    expect(result).toEqual({ shouldTransition: true, reason: 'stalled' });
  });

  it('does not call a slow start a stall', () => {
    const result = shouldIntroduceNewTopic(5, 60, INITIAL_TRANSITION_STATE, shortTurns(4));
    expect(result.shouldTransition).toBe(false);
  });

  it('does not treat engaged long answers as a stall', () => {
    const result = shouldIntroduceNewTopic(30, 60, INITIAL_TRANSITION_STATE, longTurns(4));
    expect(result.shouldTransition).toBe(false);
  });

  it('needs a full window of turns before declaring a stall', () => {
    const result = shouldIntroduceNewTopic(20, 60, INITIAL_TRANSITION_STATE, shortTurns(2));
    expect(result.shouldTransition).toBe(false);
  });

  it('enforces a cooldown so transitions cannot fire back to back', () => {
    const justTransitioned = recordTransition(INITIAL_TRANSITION_STATE, 60);
    const result = shouldIntroduceNewTopic(62, 60, justTransitioned, shortTurns(4));
    expect(result.shouldTransition).toBe(false);
  });

  it('allows another transition once the cooldown expires', () => {
    const earlier = recordTransition(INITIAL_TRANSITION_STATE, 20);
    const result = shouldIntroduceNewTopic(40, 60, earlier, shortTurns(4));
    expect(result.shouldTransition).toBe(true);
  });

  it('ignores AI turns when measuring a stall', () => {
    const messages = [...shortTurns(4), aiTurn('a very long assistant message '.repeat(20))];
    const result = shouldIntroduceNewTopic(20, 60, INITIAL_TRANSITION_STATE, messages);
    expect(result.shouldTransition).toBe(true);
  });
});

describe('recordTransition', () => {
  it('advances the marker and the count', () => {
    const next = recordTransition(INITIAL_TRANSITION_STATE, 61);
    expect(next).toEqual({ lastTransitionAtMinutes: 61, transitionCount: 1 });
  });
});
