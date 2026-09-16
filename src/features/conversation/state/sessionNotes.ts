import type { ConversationMessage } from '@/types';
import { countWords } from '@/utils/text';

/**
 * Turns a transcript into the aggregated "Notes" list from artboard 1e.
 *
 * The design replaces per-message feedback popups with one session-level
 * drawer, so this collapses every analysed turn into a short, ranked list
 * instead of surfacing each analysis separately. Pure and synchronous, so the
 * ranking rules are testable without rendering anything.
 */

export type SessionNote = GrammarNote | WordChoiceNote | ExpressionNote | FlowNote;

interface NoteBase {
  readonly id: string;
  /** 1-based index of the user turn this came from. */
  readonly turn: number;
}

export interface GrammarNote extends NoteBase {
  readonly kind: 'grammar';
  readonly original: string;
  readonly correction: string;
  readonly explanation: string;
  readonly severityRank: number;
}

export interface WordChoiceNote extends NoteBase {
  readonly kind: 'wordChoice';
  readonly original: string;
  readonly suggestions: readonly string[];
  /** How many times the learner used the original across the session. */
  readonly occurrences: number;
}

export interface ExpressionNote extends NoteBase {
  readonly kind: 'expression';
  readonly original: string;
  readonly natural: string;
  readonly reason: string;
}

export interface FlowNote extends NoteBase {
  readonly kind: 'flow';
  readonly userTurns: number;
  readonly fillerWords: number;
  /** Seconds. `undefined` when no turn was spoken (everything was typed). */
  readonly longestTurnSeconds: number | undefined;
  readonly observation: string;
  /** True when at least one turn was spoken, so timings are real. */
  readonly hasVoiceTurns: boolean;
}

const SEVERITY_RANK: Record<string, number> = { major: 0, moderate: 1, minor: 2 };

/** Notes worth showing, most important first. Flow always goes last. */
export const buildSessionNotes = (messages: readonly ConversationMessage[]): SessionNote[] => {
  const userMessages = messages.filter((message) => message.role === 'user');

  const grammar: GrammarNote[] = [];
  const expressions: ExpressionNote[] = [];
  // Keyed by the lowercased original so a repeated word becomes one note.
  const wordChoice = new Map<string, { note: WordChoiceNote; suggestions: Set<string> }>();

  userMessages.forEach((message, index) => {
    const turn = index + 1;
    const analysis = message.analysis;
    if (!analysis) return;

    for (const issue of analysis.grammar) {
      grammar.push({
        kind: 'grammar',
        id: `${message.id}-g-${issue.original}`,
        turn,
        original: issue.original,
        correction: issue.correction,
        explanation: issue.explanation,
        severityRank: SEVERITY_RANK[issue.severity] ?? 2,
      });
    }

    for (const item of analysis.vocabulary) {
      const key = item.original.toLowerCase();
      const existing = wordChoice.get(key);
      if (existing) {
        existing.suggestions.add(item.suggestion);
        wordChoice.set(key, {
          suggestions: existing.suggestions,
          note: { ...existing.note, occurrences: existing.note.occurrences + 1 },
        });
        continue;
      }
      wordChoice.set(key, {
        suggestions: new Set([item.suggestion]),
        note: {
          kind: 'wordChoice',
          id: `${message.id}-v-${key}`,
          turn,
          original: item.original,
          suggestions: [],
          occurrences: 1,
        },
      });
    }

    for (const item of analysis.expressions) {
      expressions.push({
        kind: 'expression',
        id: `${message.id}-e-${item.original}`,
        turn,
        original: item.original,
        natural: item.natural,
        reason: item.reason,
      });
    }
  });

  grammar.sort((a, b) => a.severityRank - b.severityRank || b.turn - a.turn);

  const words: WordChoiceNote[] = [...wordChoice.values()]
    .map(({ note, suggestions }) => ({ ...note, suggestions: [...suggestions] }))
    .sort((a, b) => b.occurrences - a.occurrences);

  return [
    ...grammar.slice(0, 4),
    ...words.slice(0, 2),
    ...expressions.slice(0, 2),
    buildFlowNote(userMessages),
  ];
};

const buildFlowNote = (userMessages: readonly ConversationMessage[]): FlowNote => {
  const spoken = userMessages.filter((message) => typeof message.speakingMs === 'number');
  const longestMs = spoken.reduce((max, message) => Math.max(max, message.speakingMs ?? 0), 0);

  const fillerWords = userMessages.reduce(
    (sum, message) => sum + (message.analysis?.fluency.fillerWords.length ?? 0),
    0,
  );

  const totalWords = userMessages.reduce((sum, message) => sum + countWords(message.text), 0);
  const averageWords = userMessages.length > 0 ? totalWords / userMessages.length : 0;

  return {
    kind: 'flow',
    id: 'flow',
    turn: userMessages.length,
    userTurns: userMessages.length,
    fillerWords,
    longestTurnSeconds: spoken.length > 0 ? Math.round(longestMs / 1000) : undefined,
    hasVoiceTurns: spoken.length > 0,
    observation: describeFlow(averageWords, fillerWords, userMessages.length),
  };
};

const describeFlow = (averageWords: number, fillerWords: number, turns: number): string => {
  if (turns === 0) return 'Say something and your notes will start appearing here.';
  if (averageWords < 8) {
    return 'Your answers are quite short. Try adding a reason or an example to each one — it gives your partner more to work with.';
  }
  if (fillerWords > turns) {
    return 'You are keeping the conversation going, but fillers are creeping in. A silent pause sounds more confident than "actually".';
  }
  return 'You are keeping the conversation going without long pauses.';
};

/** Notes that represent something to fix, excluding the always-present flow card. */
export const countActionableNotes = (notes: readonly SessionNote[]): number =>
  notes.filter((note) => note.kind !== 'flow').length;
