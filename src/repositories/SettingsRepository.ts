import { DEFAULT_SETTINGS, STORAGE_SCHEMA_VERSION } from '@/config/appConfig';
import {
  ACCENTS,
  AGE_BANDS,
  DIFFICULTY_LEVELS,
  GENDERS,
  PERSONALITIES,
  SPEAKING_SPEEDS,
  THEME_IDS,
  type AccentId,
  type AgeBand,
  type AppFailure,
  type AppSettings,
  type ColorSchemePreference,
  type Difficulty,
  type Gender,
  type PersonalityId,
  type Result,
  type SpeakingSpeed,
  type ThemeId,
} from '@/types';
import { isCefrLevel } from '@/utils/cefr';
import { getStorage, STORAGE_KEYS } from './storage/StorageAdapter';

/**
 * Settings persistence.
 *
 * Everything read back off disk is re-validated against the current unions. A
 * user who downgrades the app, or a theme we later remove, must not leave the
 * UI rendering `undefined` - unknown values silently fall back to the default.
 */
export interface SettingsRepository {
  load(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<Result<void, AppFailure>>;
  reset(): Promise<Result<void, AppFailure>>;
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

const asBool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asText = (value: unknown, fallback: string, max: number): string =>
  typeof value === 'string' ? value.slice(0, max) : fallback;

/** Exported for tests - this is where a bad payload gets made safe. */
export const normaliseSettings = (raw: unknown): AppSettings => {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const input = raw as Record<string, unknown>;
  const profileRaw =
    typeof input.profile === 'object' && input.profile !== null
      ? (input.profile as Record<string, unknown>)
      : {};

  const selfReported = profileRaw.selfReportedLevel;

  return {
    profile: {
      name: asText(profileRaw.name, DEFAULT_SETTINGS.profile.name, 40).trim(),
      gender: oneOf<Gender>(profileRaw.gender, GENDERS, DEFAULT_SETTINGS.profile.gender),
      ageBand: oneOf<AgeBand>(profileRaw.ageBand, AGE_BANDS, DEFAULT_SETTINGS.profile.ageBand),
      selfReportedLevel: isCefrLevel(selfReported) ? selfReported : 'unknown',
      learningGoal: asText(profileRaw.learningGoal, DEFAULT_SETTINGS.profile.learningGoal, 200),
    },
    themeId: oneOf<ThemeId>(input.themeId, THEME_IDS, DEFAULT_SETTINGS.themeId),
    colorScheme: oneOf<ColorSchemePreference>(
      input.colorScheme,
      ['system', 'light', 'dark'],
      DEFAULT_SETTINGS.colorScheme,
    ),
    personalityId: oneOf<PersonalityId>(
      input.personalityId,
      PERSONALITIES,
      DEFAULT_SETTINGS.personalityId,
    ),
    accent: oneOf<AccentId>(input.accent, ACCENTS, DEFAULT_SETTINGS.accent),
    speakingSpeed: (SPEAKING_SPEEDS as readonly number[]).includes(Number(input.speakingSpeed))
      ? (Number(input.speakingSpeed) as SpeakingSpeed)
      : DEFAULT_SETTINGS.speakingSpeed,
    difficulty: oneOf<Difficulty>(input.difficulty, DIFFICULTY_LEVELS, DEFAULT_SETTINGS.difficulty),
    autoSpeak: asBool(input.autoSpeak, DEFAULT_SETTINGS.autoSpeak),
    handsFreeMode: asBool(input.handsFreeMode, DEFAULT_SETTINGS.handsFreeMode),
    liveFeedback: asBool(input.liveFeedback, DEFAULT_SETTINGS.liveFeedback),
    showInterimTranscript: asBool(
      input.showInterimTranscript,
      DEFAULT_SETTINGS.showInterimTranscript,
    ),
    topicRotationMinutes: clampMinutes(input.topicRotationMinutes),
    dailyReminder: asBool(input.dailyReminder, DEFAULT_SETTINGS.dailyReminder),
    hasOnboarded: asBool(input.hasOnboarded, DEFAULT_SETTINGS.hasOnboarded),
    accentChallengeMode: asBool(input.accentChallengeMode, DEFAULT_SETTINGS.accentChallengeMode),
    schemaVersion: STORAGE_SCHEMA_VERSION,
  };
};

const clampMinutes = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.topicRotationMinutes;
  return Math.min(180, Math.max(5, Math.round(parsed)));
};

class LocalSettingsRepository implements SettingsRepository {
  async load(): Promise<AppSettings> {
    const result = await getStorage().read<unknown>(STORAGE_KEYS.settings);
    if (!result.ok || result.value === undefined) return DEFAULT_SETTINGS;
    return normaliseSettings(result.value);
  }

  async save(settings: AppSettings): Promise<Result<void, AppFailure>> {
    return getStorage().write(STORAGE_KEYS.settings, settings);
  }

  async reset(): Promise<Result<void, AppFailure>> {
    return getStorage().remove(STORAGE_KEYS.settings);
  }
}

export const settingsRepository: SettingsRepository = new LocalSettingsRepository();
