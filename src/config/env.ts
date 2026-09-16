import Constants from 'expo-constants';

/**
 * Typed, validated access to build-time configuration.
 *
 * Values originate in `.env`, are read by `app.config.ts` at build time and
 * land in `expoConfig.extra`. Nothing else in the app may touch `process.env`
 * or `Constants` directly - that keeps configuration in exactly one place and
 * makes it trivial to swap the source later (for example, a remote config).
 */

export type AiProviderId = 'gemini';

export interface AppEnv {
  readonly aiProvider: AiProviderId;
  readonly geminiApiKey: string;
  readonly geminiModel: string;
  readonly geminiBaseUrl: string;
  /**
   * When non-empty the AI layer talks to your own backend instead of Google,
   * and no vendor key is embedded in the binary.
   */
  readonly aiGatewayUrl: string;
  readonly aiRequestTimeoutMs: number;
  readonly logLevel: LogLevel;
  readonly isDev: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];

type RawExtra = Record<string, unknown>;

const readExtra = (): RawExtra => {
  const extra = Constants.expoConfig?.extra;
  return extra && typeof extra === 'object' ? (extra as RawExtra) : {};
};

const readString = (extra: RawExtra, key: string, fallback: string): string => {
  const value = extra[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

const readNumber = (extra: RawExtra, key: string, fallback: number): number => {
  const value = extra[key];
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readLogLevel = (extra: RawExtra): LogLevel => {
  const value = readExtraLogLevel(extra);
  return value ?? (__DEV__ ? 'debug' : 'warn');
};

const readExtraLogLevel = (extra: RawExtra): LogLevel | undefined => {
  const value = extra.logLevel;
  return typeof value === 'string' && (LOG_LEVELS as readonly string[]).includes(value)
    ? (value as LogLevel)
    : undefined;
};

const buildEnv = (): AppEnv => {
  const extra = readExtra();
  const provider = readString(extra, 'aiProvider', 'gemini');

  return {
    aiProvider: provider === 'gemini' ? 'gemini' : 'gemini',
    geminiApiKey: readString(extra, 'geminiApiKey', '').trim(),
    geminiModel: readString(extra, 'geminiModel', 'gemini-2.5-flash'),
    geminiBaseUrl: readString(
      extra,
      'geminiBaseUrl',
      'https://generativelanguage.googleapis.com/v1beta',
    ).replace(/\/+$/, ''),
    aiGatewayUrl: readString(extra, 'aiGatewayUrl', '').replace(/\/+$/, ''),
    aiRequestTimeoutMs: readNumber(extra, 'aiRequestTimeoutMs', 30_000),
    logLevel: readLogLevel(extra),
    isDev: __DEV__,
  };
};

export const env: AppEnv = buildEnv();

/** True when the app has *some* usable route to an LLM. */
export const isAiConfigured = (candidate: AppEnv = env): boolean =>
  candidate.aiGatewayUrl.length > 0 || candidate.geminiApiKey.length > 0;

/** Exposed for tests; production code should import `env`. */
export const __buildEnvForTest = buildEnv;
