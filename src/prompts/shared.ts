/**
 * Prompt building blocks shared by every prompt in this folder.
 *
 * Prompts live here - never inside a component or a service - so they can be
 * diffed, versioned and tested like any other source file. Each builder exports
 * a `*_VERSION` constant; bump it whenever the wording changes materially so
 * stored analyses remain traceable to the prompt that produced them.
 */

export const joinLines = (lines: readonly (string | false | undefined | null)[]): string =>
  lines.filter((line): line is string => typeof line === 'string' && line.length > 0).join('\n');

export const section = (heading: string, body: string): string => `## ${heading}\n${body}`;

export const bulletList = (items: readonly string[]): string =>
  items.map((item) => `- ${item}`).join('\n');

/**
 * Appended to every prompt that must return JSON.
 *
 * We also set `responseMimeType: application/json` on the Gemini request, but
 * belt-and-braces: models occasionally wrap JSON in prose when a schema is
 * complex, and the parser then has to strip it.
 */
export const JSON_ONLY_INSTRUCTION = joinLines([
  'Return ONLY a single JSON object. No markdown, no code fences, no commentary before or after.',
  'Every field in the schema is required. Use an empty array or an empty string rather than omitting a field.',
  'Do not invent measurements you cannot support from the text you were given.',
]);

/** Keeps the learner's own words intact when we ask for a rewrite. */
export const PRESERVE_MEANING_RULE = joinLines([
  'When you produce a corrected or polished version, preserve the speaker original meaning, register and level of detail.',
  'Do NOT make a simple correct sentence more elaborate just to sound impressive. If a sentence is already natural, the polished version is identical to the original.',
]);

/** Used by every analysis prompt so pronunciation is never fabricated. */
export const PRONUNCIATION_HONESTY_RULE = joinLines([
  'You are reading a TEXT TRANSCRIPT. You cannot hear audio.',
  'Therefore you must NOT claim to assess pronunciation, accent, intonation or stress from the transcript alone.',
  'Set pronunciation.available to false unless you are explicitly given a speech-recognition confidence score, and even then treat it only as a weak proxy for intelligibility - never as a phonetic assessment.',
]);
