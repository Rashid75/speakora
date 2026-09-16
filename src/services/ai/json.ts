/**
 * Tolerant JSON extraction for LLM output.
 *
 * We ask for `responseMimeType: application/json` and the model almost always
 * complies - but "almost always" is not a contract you can ship. These helpers
 * recover the common failure shapes (code fences, a sentence of preamble, a
 * trailing comma) without ever resorting to regex-scraping individual fields.
 */

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

const stripCodeFence = (raw: string): string => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1] ?? raw;
};

/** Finds the outermost balanced `{...}`, ignoring braces inside strings. */
const sliceBalancedObject = (text: string): string | undefined => {
  const start = text.indexOf('{');
  if (start === -1) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return undefined;
};

/** Removes trailing commas before a closing brace or bracket. */
const removeTrailingCommas = (text: string): string => text.replace(/,(\s*[}\]])/g, '$1');

/**
 * Best-effort parse. Returns `undefined` rather than throwing, so callers can
 * turn it into a typed failure.
 */
export const parseJsonObject = (raw: string): JsonObject | undefined => {
  const candidates = [raw, stripCodeFence(raw)];

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    const attempts = [trimmed, sliceBalancedObject(trimmed)].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );

    for (const attempt of attempts) {
      for (const text of [attempt, removeTrailingCommas(attempt)]) {
        try {
          const parsed: unknown = JSON.parse(text);
          if (isJsonObject(parsed)) return parsed;
        } catch {
          // Try the next repair strategy.
        }
      }
    }
  }
  return undefined;
};

export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
