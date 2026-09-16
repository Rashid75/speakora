import { STORAGE_SCHEMA_VERSION } from '@/config/appConfig';
import { BUILTIN_TOPICS } from '@/data/topics';
import {
  aggregateStatistics,
  average,
  computeCommonMistakes,
  computeStreak,
} from '@/services/statistics/aggregate';
import type {
  Conversation,
  ConversationMessage,
  ProgressState,
  Topic,
  TurnAnalysis,
} from '@/types';
import { INITIAL_PROGRESS } from '@/utils/cefr';

const topic = BUILTIN_TOPICS[0] as Topic;

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

const message = (overrides: Partial<ConversationMessage> = {}): ConversationMessage => ({
  id: Math.random().toString(36),
  role: 'user',
  text: 'A reasonably long spoken answer with several words in it',
  createdAt: new Date().toISOString(),
  inputMode: 'voice',
  ...overrides,
});

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: Math.random().toString(36),
  topicId: topic.id,
  topicTitle: topic.title,
  topicEmoji: topic.emoji,
  categoryId: topic.categoryId,
  topicSnapshot: topic,
  config: {
    difficulty: 'intermediate',
    personalityId: 'warm',
    accent: 'british',
    speakingSpeed: 1,
  },
  messages: [message()],
  startedAt: new Date().toISOString(),
  durationMs: 600_000,
  status: 'completed',
  stats: { userTurns: 4, assistantTurns: 4, userWords: 200, fillerWordCount: 6 },
  schemaVersion: STORAGE_SCHEMA_VERSION,
  ...overrides,
});

const progressWith = (overrides: Partial<ProgressState> = {}): ProgressState => ({
  ...INITIAL_PROGRESS,
  ...overrides,
});

describe('aggregateStatistics', () => {
  it('reports no data for an empty history', () => {
    const snapshot = aggregateStatistics([], INITIAL_PROGRESS);
    expect(snapshot.hasData).toBe(false);
    expect(snapshot.totalConversations).toBe(0);
    expect(snapshot.averageConversationMs).toBe(0);
  });

  it('never divides by zero', () => {
    const snapshot = aggregateStatistics(
      [
        conversation({
          stats: { userTurns: 0, assistantTurns: 1, userWords: 0, fillerWordCount: 0 },
        }),
      ],
      INITIAL_PROGRESS,
    );
    expect(Number.isFinite(snapshot.averageWordsPerTurn)).toBe(true);
    expect(snapshot.fillerWordsPer100Words).toBe(0);
  });

  it('totals speaking time and words across conversations', () => {
    const snapshot = aggregateStatistics(
      [conversation(), conversation()],
      progressWith({ evidenceTurns: 8 }),
    );
    expect(snapshot.totalConversations).toBe(2);
    expect(snapshot.totalSpeakingMs).toBe(1_200_000);
    expect(snapshot.totalUserWords).toBe(400);
    expect(snapshot.averageWordsPerTurn).toBe(50);
  });

  it('computes filler rate per 100 words', () => {
    const snapshot = aggregateStatistics([conversation()], INITIAL_PROGRESS);
    expect(snapshot.fillerWordsPer100Words).toBeCloseTo(3);
  });

  it('marks a skill unavailable when there is no measurement behind it', () => {
    const snapshot = aggregateStatistics([conversation()], INITIAL_PROGRESS);
    expect(snapshot.skillAvailability.grammar).toBe(false);
    expect(snapshot.skillAvailability.pronunciation).toBe(false);
  });

  it('marks pronunciation unavailable even with a score when every turn was typed', () => {
    const snapshot = aggregateStatistics(
      [conversation({ messages: [message({ inputMode: 'text' })] })],
      progressWith({
        skills: {
          grammar: 80,
          fluency: 75,
          vocabulary: 70,
          pronunciation: 88,
          naturalness: 72,
          confidence: 81,
        },
      }),
    );
    expect(snapshot.skillAvailability.grammar).toBe(true);
    expect(snapshot.skillAvailability.pronunciation).toBe(false);
  });

  it('marks pronunciation available once a voice turn exists', () => {
    const snapshot = aggregateStatistics(
      [conversation({ messages: [message({ inputMode: 'voice' })] })],
      progressWith({
        skills: {
          grammar: 80,
          fluency: 75,
          vocabulary: 70,
          pronunciation: 88,
          naturalness: 72,
          confidence: 81,
        },
      }),
    );
    expect(snapshot.skillAvailability.pronunciation).toBe(true);
  });

  it('groups performance by topic and difficulty', () => {
    const withAssessment = conversation({
      assessment: {
        level: 'B2',
        levelConfidence: 0.7,
        overallScore: 80,
        strengths: [],
        improvements: [],
        summary: 'Good',
        skills: {
          grammar: 80,
          fluency: 75,
          vocabulary: 78,
          pronunciation: 0,
          naturalness: 70,
          confidence: 82,
        },
      },
    });
    const snapshot = aggregateStatistics([withAssessment], INITIAL_PROGRESS);
    expect(snapshot.topicPerformance[0]?.averageScore).toBe(80);
    expect(snapshot.difficultyPerformance[0]?.label).toBe('Intermediate');
  });

  it('collects vocabulary suggested to the learner', () => {
    const snapshot = aggregateStatistics(
      [
        conversation({
          messages: [
            message({
              analysis: analysis({
                vocabulary: [{ original: 'good', suggestion: 'compelling', reason: '' }],
              }),
            }),
          ],
        }),
      ],
      INITIAL_PROGRESS,
    );
    expect(snapshot.newVocabulary).toContain('compelling');
  });
});

describe('computeCommonMistakes', () => {
  it('only reports a pattern that recurred', () => {
    const issue = {
      original: 'I am working here since 2019',
      correction: 'I have been working here since 2019',
      explanation: 'Use the present perfect continuous with since',
      severity: 'moderate' as const,
    };

    const once = computeCommonMistakes([
      conversation({ messages: [message({ analysis: analysis({ grammar: [issue] }) })] }),
    ]);
    expect(once).toHaveLength(0);

    const twice = computeCommonMistakes([
      conversation({ messages: [message({ analysis: analysis({ grammar: [issue] }) })] }),
      conversation({ messages: [message({ analysis: analysis({ grammar: [issue] }) })] }),
    ]);
    expect(twice).toHaveLength(1);
    expect(twice[0]?.count).toBe(2);
  });

  it('groups different sentences with the same underlying mistake', () => {
    const a = {
      original: 'I am working here since 2019',
      correction: 'x',
      explanation: 'Use the present perfect continuous with since',
      severity: 'moderate' as const,
    };
    const b = {
      original: 'I am living in Dubai since 2021',
      correction: 'y',
      explanation: 'Use the present perfect continuous with since.',
      severity: 'moderate' as const,
    };
    const result = computeCommonMistakes([
      conversation({
        messages: [
          message({ analysis: analysis({ grammar: [a] }) }),
          message({ analysis: analysis({ grammar: [b] }) }),
        ],
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.count).toBe(2);
  });
});

describe('computeStreak', () => {
  const daysAgo = (n: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - n);
    return date.toISOString();
  };

  it('is zero with no conversations', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const streak = computeStreak([
      conversation({ startedAt: daysAgo(0) }),
      conversation({ startedAt: daysAgo(1) }),
      conversation({ startedAt: daysAgo(2) }),
    ]);
    expect(streak).toBe(3);
  });

  it('survives the last session being yesterday', () => {
    expect(computeStreak([conversation({ startedAt: daysAgo(1) })])).toBe(1);
  });

  it('breaks when a day was missed', () => {
    expect(computeStreak([conversation({ startedAt: daysAgo(5) })])).toBe(0);
  });

  it('does not double-count two sessions on the same day', () => {
    const streak = computeStreak([
      conversation({ startedAt: daysAgo(0) }),
      conversation({ startedAt: daysAgo(0) }),
    ]);
    expect(streak).toBe(1);
  });
});

describe('average', () => {
  it('returns 0 for an empty list rather than NaN', () => {
    expect(average([])).toBe(0);
  });

  it('averages values', () => {
    expect(average([10, 20, 30])).toBe(20);
  });
});
