import { env, type LogLevel } from '@/config/env';

/**
 * Minimal levelled logger.
 *
 * Two rules that matter for a shipping app:
 *  1. Nothing is logged below the configured level, so release builds are quiet.
 *  2. `redact` strips anything that looks like a key before it reaches a sink.
 *
 * `setSink` is the seam for Sentry/Crashlytics later - no call site changes.
 */

const ORDER: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

export interface LogEvent {
  readonly level: Exclude<LogLevel, 'silent'>;
  readonly scope: string;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}

export type LogSink = (event: LogEvent) => void;

const SECRET_PATTERN = /(AIza[0-9A-Za-z_-]{10,}|Bearer\s+[A-Za-z0-9._-]{10,}|key=[^&\s]+)/g;

export const redact = (value: string): string => value.replace(SECRET_PATTERN, '[redacted]');

const redactData = (
  data: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined => {
  if (!data) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = typeof value === 'string' ? redact(value) : value;
  }
  return out;
};

const consoleSink: LogSink = (event) => {
  const prefix = `[${event.scope}]`;
  /* eslint-disable no-console */
  switch (event.level) {
    case 'error':
      console.error(prefix, event.message, event.data ?? '');
      break;
    case 'warn':
      console.warn(prefix, event.message, event.data ?? '');
      break;
    default:
      console.log(prefix, event.message, event.data ?? '');
  }
  /* eslint-enable no-console */
};

let sink: LogSink = consoleSink;
let threshold = ORDER[env.logLevel];

export const setSink = (next: LogSink): void => {
  sink = next;
};

export const setLogLevel = (level: LogLevel): void => {
  threshold = ORDER[level];
};

const emit = (
  level: Exclude<LogLevel, 'silent'>,
  scope: string,
  message: string,
  data?: Readonly<Record<string, unknown>>,
): void => {
  if (ORDER[level] < threshold) return;
  sink({
    level,
    scope,
    message: redact(message),
    data: redactData(data),
    timestamp: new Date().toISOString(),
  });
};

export interface Logger {
  debug(message: string, data?: Readonly<Record<string, unknown>>): void;
  info(message: string, data?: Readonly<Record<string, unknown>>): void;
  warn(message: string, data?: Readonly<Record<string, unknown>>): void;
  error(message: string, data?: Readonly<Record<string, unknown>>): void;
}

export const createLogger = (scope: string): Logger => ({
  debug: (message, data) => emit('debug', scope, message, data),
  info: (message, data) => emit('info', scope, message, data),
  warn: (message, data) => emit('warn', scope, message, data),
  error: (message, data) => emit('error', scope, message, data),
});
