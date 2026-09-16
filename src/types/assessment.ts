export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Ordinal position of a level, used for smoothing and comparison. */
export const cefrIndex = (level: CefrLevel): number => CEFR_LEVELS.indexOf(level);

export const cefrFromIndex = (index: number): CefrLevel => {
  const clamped = Math.min(CEFR_LEVELS.length - 1, Math.max(0, Math.round(index)));
  // Safe: clamped is within bounds by construction.
  return CEFR_LEVELS[clamped] as CefrLevel;
};

/** The six skill axes shown on the Statistics screen. */
export const SKILL_KEYS = [
  'grammar',
  'fluency',
  'vocabulary',
  'pronunciation',
  'naturalness',
  'confidence',
] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];

/** 0–100 for each axis. */
export type SkillScores = Readonly<Record<SkillKey, number>>;

/**
 * Rolling estimate of the learner's level.
 *
 * `levelScore` is a continuous 0–5 value (A1=0 … C2=5) that we smooth with an
 * exponential moving average so a single weak turn cannot move the badge.
 */
export interface ProgressState {
  readonly level: CefrLevel;
  /** 0–1. How much evidence supports the current level. */
  readonly confidence: number;
  readonly levelScore: number;
  /** Number of analysed speaking turns that fed the estimate. */
  readonly evidenceTurns: number;
  /** Short, human-readable justifications shown on the Statistics screen. */
  readonly rationale: readonly string[];
  readonly skills: SkillScores;
  readonly updatedAt: string;
  readonly schemaVersion: number;
}
