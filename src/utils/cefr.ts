import { STORAGE_SCHEMA_VERSION } from '@/config/appConfig';
import {
  CEFR_LEVELS,
  cefrFromIndex,
  cefrIndex,
  SKILL_KEYS,
  type CefrLevel,
  type ProgressState,
  type SkillKey,
  type SkillScores,
  type TurnAnalysis,
} from '@/types';
import { nowIso } from './time';

/**
 * Rolling CEFR estimation.
 *
 * The product requirement is explicit: the badge must not swing on a single
 * sentence. So we keep a continuous `levelScore` (0 = A1 … 5 = C2) and move it
 * with an exponential moving average whose weight *shrinks* as evidence
 * accumulates. Early turns move the needle quickly (we know nothing yet); by
 * turn 20 a single outlier moves it by a few hundredths of a level.
 */

const MIN_ALPHA = 0.06;
const MAX_ALPHA = 0.35;
/** Turns of evidence after which the estimate is considered well-supported. */
const CONFIDENCE_SATURATION_TURNS = 14;

export const INITIAL_SKILLS: SkillScores = {
  grammar: 0,
  fluency: 0,
  vocabulary: 0,
  pronunciation: 0,
  naturalness: 0,
  confidence: 0,
};

export const INITIAL_PROGRESS: ProgressState = {
  level: 'A2',
  confidence: 0,
  levelScore: cefrIndex('A2'),
  evidenceTurns: 0,
  rationale: [],
  skills: INITIAL_SKILLS,
  updatedAt: nowIso(),
  schemaVersion: STORAGE_SCHEMA_VERSION,
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const clamp100 = (value: number): number => Math.min(100, Math.max(0, value));

/** Learning rate for turn `n`: fast at first, conservative once established. */
export const alphaForTurn = (evidenceTurns: number): number => {
  const decayed = MAX_ALPHA / (1 + evidenceTurns / 5);
  return Math.max(MIN_ALPHA, Math.min(MAX_ALPHA, decayed));
};

/**
 * Confidence blends *how much* evidence we have with *how consistent* it is.
 * A learner who is solidly B1 every turn gets high confidence; one whose turns
 * scatter across A2-C1 stays uncertain no matter how many turns they record.
 */
export const computeConfidence = (
  evidenceTurns: number,
  recentLevels: readonly number[],
): number => {
  if (evidenceTurns === 0) return 0;
  const volume = clamp01(evidenceTurns / CONFIDENCE_SATURATION_TURNS);
  if (recentLevels.length < 2) return clamp01(volume * 0.55);

  const mean = recentLevels.reduce((sum, value) => sum + value, 0) / recentLevels.length;
  const variance =
    recentLevels.reduce((sum, value) => sum + (value - mean) ** 2, 0) / recentLevels.length;
  // A standard deviation of one full CEFR band halves consistency.
  const consistency = clamp01(1 - Math.sqrt(variance) / 1.5);
  return clamp01(0.35 * volume + 0.65 * volume * consistency);
};

/** Merges a new per-turn skill reading into the running average. */
const blendSkills = (
  previous: SkillScores,
  incoming: MutableSkills,
  alpha: number,
): SkillScores => {
  const next: Record<SkillKey, number> = { ...previous };
  for (const key of SKILL_KEYS) {
    const value = incoming[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const current = previous[key];
    // The first real reading seeds the axis instead of averaging against zero.
    next[key] = current === 0 ? clamp100(value) : clamp100(current + alpha * (value - current));
  }
  return next;
};

/**
 * A writable view of the skill axes.
 *
 * `SkillScores` is deliberately readonly everywhere it is stored or rendered;
 * this alias exists only for the two places that assemble one.
 */
type MutableSkills = Partial<Record<SkillKey, number>>;

/** Extracts the six skill axes from a single analysed turn. */
export const skillsFromAnalysis = (analysis: TurnAnalysis): MutableSkills => {
  const grammarPenalty = analysis.grammar.reduce(
    (sum, issue) => sum + (issue.severity === 'major' ? 16 : issue.severity === 'moderate' ? 9 : 4),
    0,
  );
  const vocabPenalty = analysis.vocabulary.length * 7;
  const naturalPenalty = analysis.expressions.length * 8;

  const skills: MutableSkills = {
    grammar: clamp100(100 - grammarPenalty),
    fluency: clamp100(analysis.fluency.score),
    vocabulary: clamp100(100 - vocabPenalty),
    naturalness: clamp100(100 - naturalPenalty),
    confidence: clamp100(analysis.confidence.score),
  };

  // Pronunciation is only recorded when the speech layer actually measured it.
  if (analysis.pronunciation.available) {
    skills.pronunciation = clamp100(analysis.pronunciation.score);
  }
  return skills;
};

export interface ProgressUpdate {
  readonly state: ProgressState;
  readonly levelChanged: boolean;
}

/**
 * Folds one analysed turn into the rolling estimate.
 * `recentLevels` is the caller-maintained window used for the variance term.
 */
export const applyTurnToProgress = (
  previous: ProgressState,
  analysis: TurnAnalysis,
  recentLevels: readonly number[],
): ProgressUpdate => {
  const alpha = alphaForTurn(previous.evidenceTurns);
  const observed = cefrIndex(analysis.levelEstimate);
  const seeded = previous.evidenceTurns === 0;
  const levelScore = seeded
    ? observed
    : previous.levelScore + alpha * (observed - previous.levelScore);

  const evidenceTurns = previous.evidenceTurns + 1;
  const window = [...recentLevels, observed].slice(-CONFIDENCE_SATURATION_TURNS);
  const level = cefrFromIndex(levelScore);

  return {
    state: {
      level,
      levelScore,
      evidenceTurns,
      confidence: computeConfidence(evidenceTurns, window),
      rationale: previous.rationale,
      skills: blendSkills(previous.skills, skillsFromAnalysis(analysis), alpha),
      updatedAt: nowIso(),
      schemaVersion: STORAGE_SCHEMA_VERSION,
    },
    levelChanged: level !== previous.level,
  };
};

/**
 * Applies an end-of-conversation assessment. It carries more weight than a
 * single turn because the model saw the whole transcript, but it is still
 * damped so one bad session cannot demote a learner two bands.
 */
export const applyAssessmentToProgress = (
  previous: ProgressState,
  level: CefrLevel,
  rationale: readonly string[],
  skills: SkillScores,
  pronunciationMeasured: boolean,
): ProgressState => {
  const observed = cefrIndex(level);
  const alpha = previous.evidenceTurns === 0 ? 1 : 0.3;
  const levelScore = previous.levelScore + alpha * (observed - previous.levelScore);
  const evidenceTurns = previous.evidenceTurns + 2;

  const incoming: MutableSkills = { ...skills };
  if (!pronunciationMeasured) {
    // Leave the axis untouched rather than blending in a fabricated number.
    delete incoming.pronunciation;
  }

  return {
    level: cefrFromIndex(levelScore),
    levelScore,
    evidenceTurns,
    confidence: Math.max(
      previous.confidence,
      clamp01(evidenceTurns / CONFIDENCE_SATURATION_TURNS) * 0.8,
    ),
    rationale: rationale.length > 0 ? rationale.slice(0, 4) : previous.rationale,
    skills: blendSkills(previous.skills, incoming, 0.35),
    updatedAt: nowIso(),
    schemaVersion: STORAGE_SCHEMA_VERSION,
  };
};

export const describeLevel = (level: CefrLevel): string => LEVEL_BLURB[level];

const LEVEL_BLURB: Readonly<Record<CefrLevel, string>> = {
  A1: 'You can handle simple, familiar phrases and very basic exchanges.',
  A2: 'You can manage short everyday conversations on familiar subjects.',
  B1: 'You can keep a conversation going and explain your opinions simply.',
  B2: 'You can talk fluently on a wide range of topics and argue a viewpoint.',
  C1: 'You express yourself flexibly and precisely, including on complex topics.',
  C2: 'You communicate effortlessly with fine shades of meaning.',
};

export const isCefrLevel = (value: unknown): value is CefrLevel =>
  typeof value === 'string' && (CEFR_LEVELS as readonly string[]).includes(value);
