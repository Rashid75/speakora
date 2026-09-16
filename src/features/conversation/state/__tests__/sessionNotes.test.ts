import type { ConversationMessage, TurnAnalysis } from '@/types';
import { buildSessionNotes, countActionableNotes } from '../sessionNotes';

const analysis = (overrides: Partial<TurnAnalysis> = {}): TurnAnalysis => ({
  grammar: [],
  vocabulary: [],
  expressions: [],
  fluency: { score: 75, fillerWords: [], repeatedWords: [], observations: [] },
  pronunciation: { available: false, reason: 'typed' },
  confidence: { score: 70, observations: [] },
  polishedResponse: '',
  alternativeAnswers: [],
  levelEstimate: 'B1',
  overallScore: 72,
  headline: '',
  ...overrides,
});

let seq = 0;
const userTurn = (
  text: string,
  overrides: Partial<ConversationMessage> = {},
): ConversationMessage => {
  seq += 1;
  return {
    id: `u${seq}`,
    role: 'user',
    text,
    createdAt: new Date().toISOString(),
    inputMode: 'voice',
    ...overrides,
  };
};

const aiTurn = (text: string): ConversationMessage => {
  seq += 1;
  return { id: `a${seq}`, role: 'assistant', text, createdAt: new Date().toISOString() };
};

describe('buildSessionNotes', () => {
  it('always ends with the flow card, even with no analyses', () => {
    const notes = buildSessionNotes([aiTurn('Hello'), userTurn('Hi there')]);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.kind).toBe('flow');
    expect(countActionableNotes(notes)).toBe(0);
  });

  it('numbers turns by user turn, ignoring AI turns in between', () => {
    const notes = buildSessionNotes([
      aiTurn('Hello'),
      userTurn('First'),
      aiTurn('Go on'),
      userTurn('Second', {
        analysis: analysis({
          grammar: [{ original: 'a', correction: 'b', explanation: 'why', severity: 'moderate' }],
        }),
      }),
    ]);
    const grammar = notes.find((note) => note.kind === 'grammar');
    expect(grammar?.turn).toBe(2);
  });

  it('ranks major grammar issues above minor ones', () => {
    const notes = buildSessionNotes([
      userTurn('one', {
        analysis: analysis({
          grammar: [{ original: 'm', correction: 'M', explanation: '', severity: 'minor' }],
        }),
      }),
      userTurn('two', {
        analysis: analysis({
          grammar: [{ original: 'x', correction: 'X', explanation: '', severity: 'major' }],
        }),
      }),
    ]);
    const grammar = notes.filter((note) => note.kind === 'grammar');
    expect(grammar[0]).toMatchObject({ original: 'x' });
  });

  it('collapses a repeated word into one note with a count', () => {
    const vocab = { original: "it's okay", suggestion: "it's manageable", reason: '' };
    const notes = buildSessionNotes([
      userTurn('a', { analysis: analysis({ vocabulary: [vocab] }) }),
      userTurn('b', { analysis: analysis({ vocabulary: [vocab] }) }),
      userTurn('c', {
        analysis: analysis({
          vocabulary: [{ ...vocab, suggestion: "it's not bad" }],
        }),
      }),
    ]);

    const words = notes.filter((note) => note.kind === 'wordChoice');
    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({ occurrences: 3 });
    // Every distinct suggestion is kept so the learner has options.
    expect(words[0]?.kind === 'wordChoice' ? words[0].suggestions : []).toEqual(
      expect.arrayContaining(["it's manageable", "it's not bad"]),
    );
  });

  it('caps the list so the drawer stays readable', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      userTurn(`turn ${i}`, {
        analysis: analysis({
          grammar: [{ original: `o${i}`, correction: `c${i}`, explanation: '', severity: 'major' }],
        }),
      }),
    );
    const notes = buildSessionNotes(many);
    expect(notes.filter((note) => note.kind === 'grammar')).toHaveLength(4);
  });

  it('reports the longest spoken turn in seconds', () => {
    const notes = buildSessionNotes([
      userTurn('short', { speakingMs: 4_000 }),
      userTurn('long', { speakingMs: 18_400 }),
    ]);
    const flow = notes.find((note) => note.kind === 'flow');
    expect(flow?.kind === 'flow' ? flow.longestTurnSeconds : undefined).toBe(18);
    expect(flow?.kind === 'flow' ? flow.hasVoiceTurns : undefined).toBe(true);
  });

  it('omits turn timing entirely when everything was typed', () => {
    const notes = buildSessionNotes([userTurn('typed', { inputMode: 'text' })]);
    const flow = notes.find((note) => note.kind === 'flow');
    expect(flow?.kind === 'flow' ? flow.longestTurnSeconds : 'x').toBeUndefined();
    expect(flow?.kind === 'flow' ? flow.hasVoiceTurns : undefined).toBe(false);
  });

  it('nudges the learner when their answers are consistently short', () => {
    const notes = buildSessionNotes([userTurn('yeah'), userTurn('true'), userTurn('ok sure')]);
    const flow = notes.find((note) => note.kind === 'flow');
    expect(flow?.kind === 'flow' ? flow.observation : '').toMatch(/quite short/i);
  });

  it('gives every note a unique key for rendering', () => {
    const notes = buildSessionNotes([
      userTurn('a', {
        analysis: analysis({
          grammar: [{ original: 'x', correction: 'y', explanation: '', severity: 'minor' }],
          vocabulary: [{ original: 'good', suggestion: 'solid', reason: '' }],
          expressions: [{ original: 'p', natural: 'q', reason: '' }],
        }),
      }),
    ]);
    const ids = notes.map((note) => note.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
