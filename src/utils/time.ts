import type { Millis } from '@/types';

export const nowIso = (): string => new Date().toISOString();

/** `7:32` style clock used by the live conversation timer. */
export const formatTimer = (ms: Millis): string => {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** `12m 30s` / `1h 05m` style label used in History and Statistics. */
export const formatDuration = (ms: Millis): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${String(remMinutes).padStart(2, '0')}m`;
};

export const minutesBetween = (fromIso: string, toIso: string): number => {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, (to - from) / 60_000);
};

/** Local day bucket, `YYYY-MM-DD`, used to group trend data. */
export const dayKey = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '1970-01-01';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const daysBetweenKeys = (a: string, b: string): number => {
  const left = Date.parse(`${a}T00:00:00`);
  const right = Date.parse(`${b}T00:00:00`);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return Math.round(Math.abs(right - left) / 86_400_000);
};

/** `Today`, `Yesterday`, `Mon 4 Mar` - short and locale-friendly enough. */
export const formatRelativeDay = (iso: string, reference: Date = new Date()): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffDays = daysBetweenKeys(dayKey(iso), dayKey(reference.toISOString()));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === reference.getFullYear() ? undefined : 'numeric',
  });
};

export const formatClockTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/** Greeting window based on local time. */
export const greetingForHour = (hour: number): string => {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
