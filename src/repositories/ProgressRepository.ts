import { CONVERSATION_LIMITS, STORAGE_SCHEMA_VERSION } from '@/config/appConfig';
import {
  SKILL_KEYS,
  type AppFailure,
  type ProgressState,
  type Result,
  type SkillKey,
  type SkillScores,
  type TurnAnalysis,
} from '@/types';
import { INITIAL_PROGRESS, isCefrLevel } from '@/utils/cefr';
import { nowIso } from '@/utils/time';
import { getStorage, STORAGE_KEYS } from './storage/StorageAdapter';

/**
 * The learner's rolling CEFR estimate, plus the small window of recent
 * per-turn level readings that the confidence calculation needs.
 *
 * Kept separate from conversations because it is written far more often (every
 * analysed turn) and read on nearly every screen. Bundling it into the
 * conversation blob would mean rewriting the whole history on each turn.
 */
export interface ProgressRepository {
  load(): Promise<ProgressState>;
  save(progress: ProgressState): Promise<Result<void, AppFailure>>;
  /** Recent per-turn CEFR indices, oldest first. */
  loadEvidence(): Promise<readonly number[]>;
  pushEvidence(levelIndex: number): Promise<void>;
  /** Recent analyses used to justify the level. */
  loadRecentAnalyses(): Promise<readonly TurnAnalysis[]>;
  pushAnalysis(analysis: TurnAnalysis): Promise<void>;
  reset(): Promise<Result<void, AppFailure>>;
}

interface EvidenceBundle {
  readonly levels: readonly number[];
  readonly analyses: readonly TurnAnalysis[];
}

const EMPTY_EVIDENCE: EvidenceBundle = { levels: [], analyses: [] };

const normaliseSkills = (raw: unknown): SkillScores => {
  const input = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<SkillKey, number>;
  for (const key of SKILL_KEYS) {
    const value = Number(input[key]);
    out[key] = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  }
  return out;
};

export const normaliseProgress = (raw: unknown): ProgressState => {
  if (typeof raw !== 'object' || raw === null) return INITIAL_PROGRESS;
  const input = raw as Record<string, unknown>;

  const level = isCefrLevel(input.level) ? input.level : INITIAL_PROGRESS.level;
  const levelScore = Number(input.levelScore);
  const confidence = Number(input.confidence);
  const evidenceTurns = Number(input.evidenceTurns);

  return {
    level,
    levelScore: Number.isFinite(levelScore)
      ? Math.min(5, Math.max(0, levelScore))
      : INITIAL_PROGRESS.levelScore,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
    evidenceTurns: Number.isFinite(evidenceTurns) ? Math.max(0, Math.round(evidenceTurns)) : 0,
    rationale: Array.isArray(input.rationale)
      ? input.rationale.filter((item): item is string => typeof item === 'string').slice(0, 4)
      : [],
    skills: normaliseSkills(input.skills),
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : nowIso(),
    schemaVersion: STORAGE_SCHEMA_VERSION,
  };
};

class LocalProgressRepository implements ProgressRepository {
  async load(): Promise<ProgressState> {
    const result = await getStorage().read<unknown>(STORAGE_KEYS.progress);
    if (!result.ok || result.value === undefined) return INITIAL_PROGRESS;
    return normaliseProgress(result.value);
  }

  async save(progress: ProgressState): Promise<Result<void, AppFailure>> {
    return getStorage().write(STORAGE_KEYS.progress, progress);
  }

  private async readEvidence(): Promise<EvidenceBundle> {
    const result = await getStorage().read<unknown>(STORAGE_KEYS.levelEvidence);
    if (!result.ok || typeof result.value !== 'object' || result.value === null) {
      return EMPTY_EVIDENCE;
    }
    const input = result.value as Record<string, unknown>;
    return {
      levels: Array.isArray(input.levels)
        ? input.levels.filter((item): item is number => typeof item === 'number')
        : [],
      analyses: Array.isArray(input.analyses) ? (input.analyses as TurnAnalysis[]) : [],
    };
  }

  async loadEvidence(): Promise<readonly number[]> {
    return (await this.readEvidence()).levels;
  }

  async loadRecentAnalyses(): Promise<readonly TurnAnalysis[]> {
    return (await this.readEvidence()).analyses;
  }

  async pushEvidence(levelIndex: number): Promise<void> {
    const current = await this.readEvidence();
    await getStorage().write(STORAGE_KEYS.levelEvidence, {
      ...current,
      levels: [...current.levels, levelIndex].slice(-CONVERSATION_LIMITS.levelEvidenceWindow),
    });
  }

  async pushAnalysis(analysis: TurnAnalysis): Promise<void> {
    const current = await this.readEvidence();
    await getStorage().write(STORAGE_KEYS.levelEvidence, {
      ...current,
      analyses: [...current.analyses, analysis].slice(-CONVERSATION_LIMITS.levelEvidenceWindow),
    });
  }

  async reset(): Promise<Result<void, AppFailure>> {
    await getStorage().remove(STORAGE_KEYS.levelEvidence);
    return getStorage().remove(STORAGE_KEYS.progress);
  }
}

export const progressRepository: ProgressRepository = new LocalProgressRepository();
