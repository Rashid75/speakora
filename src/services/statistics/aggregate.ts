import { getDifficulty } from '@/data/difficulty';
import {
  SKILL_KEYS,
  type Conversation,
  type GroupPerformance,
  type MistakePattern,
  type ProgressState,
  type SkillKey,
  type StatisticsSnapshot,
  type TrendPoint,
  type Difficulty,
} from '@/types';
import { dayKey, daysBetweenKeys } from '@/utils/time';
import { isSingleWord } from '@/services/dictionary/word';

/**
 * Derives every number on the Statistics screen from stored conversations.
 *
 * Pure and synchronous so it can be unit-tested exhaustively and recomputed
 * cheaply whenever history changes - there is no separate statistics store to
 * fall out of sync with the conversations it summarises.
 *
 * Guiding rule from the spec: never show a metric the data cannot support.
 * `skillAvailability` is how that is enforced - an axis with no measurement
 * behind it is reported as unavailable rather than as a plausible-looking zero.
 */

const MAX_TREND_DAYS = 30;

export const aggregateStatistics = (
  conversations: readonly Conversation[],
  progress: ProgressState,
): StatisticsSnapshot => {
  const assessed = conversations.filter((conversation) => conversation.assessment !== undefined);
  const hasData = conversations.length > 0;

  const totalSpeakingMs = conversations.reduce((sum, item) => sum + item.durationMs, 0);
  const totalUserWords = conversations.reduce((sum, item) => sum + item.stats.userWords, 0);
  const totalUserTurns = conversations.reduce((sum, item) => sum + item.stats.userTurns, 0);
  const fillerWordCount = conversations.reduce((sum, item) => sum + item.stats.fillerWordCount, 0);

  return {
    hasData,
    level: progress.level,
    levelConfidence: progress.confidence,
    levelRationale: progress.rationale,
    skills: progress.skills,
    skillAvailability: computeAvailability(progress, conversations),
    totalConversations: conversations.length,
    completedConversations: conversations.filter((item) => item.status === 'completed').length,
    totalSpeakingMs,
    averageConversationMs: conversations.length > 0 ? totalSpeakingMs / conversations.length : 0,
    totalUserWords,
    averageWordsPerTurn: totalUserTurns > 0 ? totalUserWords / totalUserTurns : 0,
    fillerWordCount,
    fillerWordsPer100Words: totalUserWords > 0 ? (fillerWordCount / totalUserWords) * 100 : 0,
    currentStreakDays: computeStreak(conversations),
    trend: computeTrend(conversations),
    topicPerformance: computeTopicPerformance(assessed),
    difficultyPerformance: computeDifficultyPerformance(assessed),
    commonMistakes: computeCommonMistakes(conversations),
    newVocabulary: computeVocabulary(conversations),
    lastPracticedAt: conversations[0]?.startedAt,
    practicedDifficulties: uniqueDifficulties(conversations),
  };
};

/**
 * A skill axis counts as "available" when we have a real reading for it.
 * Pronunciation additionally requires at least one voice turn - it is the one
 * axis we cannot infer from text at all.
 */
const computeAvailability = (
  progress: ProgressState,
  conversations: readonly Conversation[],
): Readonly<Record<SkillKey, boolean>> => {
  const hasVoiceTurn = conversations.some((conversation) =>
    conversation.messages.some(
      (message) => message.role === 'user' && message.inputMode === 'voice',
    ),
  );

  const availability = {} as Record<SkillKey, boolean>;
  for (const key of SKILL_KEYS) {
    availability[key] = progress.skills[key] > 0;
  }
  availability.pronunciation = availability.pronunciation && hasVoiceTurn;
  return availability;
};

/** Consecutive days, counting back from the most recent practice day. */
export const computeStreak = (conversations: readonly Conversation[]): number => {
  if (conversations.length === 0) return 0;

  const days = [...new Set(conversations.map((item) => dayKey(item.startedAt)))].sort((a, b) =>
    b.localeCompare(a),
  );

  const today = dayKey(new Date().toISOString());
  const mostRecent = days[0];
  if (!mostRecent) return 0;

  // A streak stays alive if the last session was today or yesterday.
  const gapToToday = daysBetweenKeys(mostRecent, today);
  if (gapToToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i += 1) {
    const previous = days[i - 1];
    const current = days[i];
    if (!previous || !current) break;
    if (daysBetweenKeys(previous, current) !== 1) break;
    streak += 1;
  }
  return streak;
};

const computeTrend = (conversations: readonly Conversation[]): TrendPoint[] => {
  const buckets = new Map<string, { scores: number[]; count: number; speakingMs: number }>();

  for (const conversation of conversations) {
    const key = dayKey(conversation.startedAt);
    const bucket = buckets.get(key) ?? { scores: [], count: 0, speakingMs: 0 };
    if (conversation.assessment) bucket.scores.push(conversation.assessment.overallScore);
    bucket.count += 1;
    bucket.speakingMs += conversation.durationMs;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-MAX_TREND_DAYS)
    .map(([date, bucket]) => ({
      date,
      overallScore: average(bucket.scores),
      conversations: bucket.count,
      speakingMs: bucket.speakingMs,
    }));
};

const computeTopicPerformance = (assessed: readonly Conversation[]): GroupPerformance[] =>
  groupBy(
    assessed,
    (conversation) => conversation.topicId,
    (conversation) => conversation.topicTitle,
  );

const computeDifficultyPerformance = (assessed: readonly Conversation[]): GroupPerformance[] =>
  groupBy(
    assessed,
    (conversation) => conversation.config.difficulty,
    (conversation) => getDifficulty(conversation.config.difficulty).label,
  );

const groupBy = (
  conversations: readonly Conversation[],
  keyOf: (conversation: Conversation) => string,
  labelOf: (conversation: Conversation) => string,
): GroupPerformance[] => {
  const buckets = new Map<string, { label: string; scores: number[] }>();

  for (const conversation of conversations) {
    const score = conversation.assessment?.overallScore;
    if (typeof score !== 'number') continue;
    const key = keyOf(conversation);
    const bucket = buckets.get(key) ?? { label: labelOf(conversation), scores: [] };
    bucket.scores.push(score);
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      conversations: bucket.scores.length,
      averageScore: average(bucket.scores),
    }))
    .sort((a, b) => b.averageScore - a.averageScore);
};

/**
 * Groups grammar corrections by the *explanation* rather than the sentence, so
 * "I am working since three years" and "I am living here since 2019" collapse
 * into one recurring pattern instead of two one-off mistakes.
 */
export const computeCommonMistakes = (conversations: readonly Conversation[]): MistakePattern[] => {
  const buckets = new Map<string, { pattern: string; example: string; count: number }>();

  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      for (const issue of message.analysis?.grammar ?? []) {
        const key = normalisePattern(issue.explanation);
        if (!key) continue;
        const existing = buckets.get(key);
        if (existing) existing.count += 1;
        else buckets.set(key, { pattern: issue.explanation, example: issue.original, count: 1 });
      }
    }
  }

  return [...buckets.values()]
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
};

const normalisePattern = (explanation: string): string =>
  explanation
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 6)
    .join(' ');

/**
 * Words the coach actually suggested, most recent first.
 *
 * Single words only. The analysis pass happily suggests a phrase - "agentic
 * AI", "put off" - and a phrase is a fine thing to say but a poor thing to
 * collect: the word list looks them up one at a time, so a two-word entry
 * comes back as a definition of neither half.
 */
const computeVocabulary = (conversations: readonly Conversation[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      for (const suggestion of message.analysis?.vocabulary ?? []) {
        const word = suggestion.suggestion.trim();
        const key = word.toLowerCase();
        if (!word || seen.has(key) || !isSingleWord(word)) continue;
        seen.add(key);
        out.push(word);
        if (out.length >= 40) return out;
      }
    }
  }
  return out;
};

const uniqueDifficulties = (conversations: readonly Conversation[]): Difficulty[] => [
  ...new Set(conversations.map((conversation) => conversation.config.difficulty)),
];

export const average = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
