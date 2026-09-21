/**
 * What counts as a word.
 *
 * Pure string work, kept apart from `DictionaryService` so that asking the
 * question costs nothing: the service reaches for storage, the network and an
 * AI provider, and a caller that only wants to know whether "Agentic AI" is
 * one word should not load any of that.
 */

/**
 * The form a word is stored and looked up under.
 *
 * Strips the punctuation a word arrives wearing when it is lifted out of a
 * sentence - quotes, commas, the full stop that ended the line - but keeps
 * what belongs to the word itself: the hyphen in "well-known", the apostrophe
 * in "don't". Lower case, so tapping a word at the start of a sentence and the
 * same word mid-sentence do not fill the list twice.
 */
export const normaliseWord = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    // Marks that can only be punctuation at the edges of a word.
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}]+$/u, '')
    // Curly apostrophes and straight ones are the same character to a learner.
    .replace(/’/g, "'");

/** Whether tapping this is worth a lookup at all. */
export const isLookupWorthy = (word: string): boolean =>
  normaliseWord(word).replace(/[^\p{L}]/gu, '').length >= 2;

/**
 * One word, not a sentence.
 *
 * Applies to words typed in by hand, not to ones tapped in a conversation -
 * a tap already guarantees a single token. Hyphens and apostrophes are part of
 * plenty of ordinary words ("well-known", "don't") so they are allowed inside,
 * but never at the edges, and digits never are.
 */
export const isSingleWord = (raw: string): boolean => {
  const normalised = normaliseWord(raw);
  if (normalised.length < 2) return false;
  return /^\p{L}+(?:['-]\p{L}+)*$/u.test(normalised);
};
