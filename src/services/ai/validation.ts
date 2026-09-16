import { DIFFICULTY_LEVELS, type Difficulty } from '@/types';
import { isCefrLevel } from '@/utils/cefr';
import type { JsonObject, JsonValue } from './json';
import { isJsonObject } from './json';

/**
 * Hand-written runtime validators.
 *
 * A schema library (zod, valibot) would do this too, but it would add ~40kB to
 * the bundle to validate five fixed shapes that only this folder produces. The
 * rule these helpers follow is *coerce, then clamp, then default*: an LLM
 * returning `"85"` instead of `85`, or a score of `120`, should degrade into
 * something sensible rather than blanking a screen.
 */

export const asString = (value: JsonValue | undefined, fallback = ''): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
};

export const asNumber = (value: JsonValue | undefined, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace('%', '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export const asScore = (value: JsonValue | undefined, fallback = 0): number => {
  const raw = asNumber(value, fallback);
  // Models sometimes answer 0-1 for a field documented as 0-100.
  const scaled = raw > 0 && raw <= 1 ? raw * 100 : raw;
  return Math.round(Math.min(100, Math.max(0, scaled)));
};

export const asUnitInterval = (value: JsonValue | undefined, fallback = 0): number => {
  const raw = asNumber(value, fallback);
  // ...and vice versa: 78 where 0.78 was documented.
  const scaled = raw > 1 ? raw / 100 : raw;
  return Math.min(1, Math.max(0, scaled));
};

export const asBoolean = (value: JsonValue | undefined, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return fallback;
};

export const asArray = (value: JsonValue | undefined): JsonValue[] =>
  Array.isArray(value) ? value : [];

/** Array of non-empty strings, deduplicated and length-capped. */
export const asStringArray = (value: JsonValue | undefined, max = 10): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of asArray(value)) {
    const text = typeof item === 'string' ? item.trim() : '';
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
};

export const asObjectArray = (value: JsonValue | undefined, max = 10): JsonObject[] => {
  const out: JsonObject[] = [];
  for (const item of asArray(value)) {
    if (!isJsonObject(item)) continue;
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
};

export const asObject = (value: JsonValue | undefined): JsonObject =>
  isJsonObject(value) ? value : {};

export const asEnum = <T extends string>(
  value: JsonValue | undefined,
  allowed: readonly T[],
  fallback: T,
): T => {
  if (typeof value !== 'string') return fallback;
  const normalised = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const match = allowed.find((option) => option.toLowerCase() === normalised);
  return match ?? fallback;
};

export const asCefrLevel = (value: JsonValue | undefined, fallback: string): string => {
  const text = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return isCefrLevel(text) ? text : fallback;
};

export const asDifficulty = (value: JsonValue | undefined, fallback: Difficulty): Difficulty =>
  asEnum(value, DIFFICULTY_LEVELS, fallback);

/** Keeps a single emoji, discarding whatever else the model sent. */
export const asEmoji = (value: JsonValue | undefined, fallback: string): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return fallback;
  const chars = [...text];
  const first = chars[0];
  if (!first) return fallback;
  // Reject plain ASCII - the model returned a word, not an emoji.
  return /[A-Za-z0-9]/.test(first) ? fallback : text.slice(0, 8);
};
