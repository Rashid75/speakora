import { escapeRegExp } from '@/utils/text';

/**
 * Splits a sentence around every whole-word occurrence of `word`.
 *
 * Returns the pieces in order, with the matches kept in, so a caller can
 * rebuild the sentence and restyle only those pieces. Matching is
 * case-insensitive and boundaried: "Went" at the start of a sentence is a
 * match, "wenton" is not.
 *
 * A plain function rather than logic inside the component, because the
 * escaping here is the sort that silently half-works - a regex built in a
 * template literal will happily accept a backspace character where a word
 * boundary was meant and simply never match.
 */
export const splitOnWord = (sentence: string, word: string): readonly string[] => {
  if (!word) return [sentence];
  const pattern = new RegExp(`(\\b${escapeRegExp(word)}\\b)`, 'gi');
  return sentence.split(pattern).filter((piece) => piece.length > 0);
};

/** True when this piece is one of the matches rather than the text around it. */
export const isMatch = (piece: string, word: string): boolean =>
  piece.toLowerCase() === word.toLowerCase();
