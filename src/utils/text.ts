/**
 * Text metrics computed locally, on device.
 *
 * These are deliberately *not* asked of the LLM: word counts and filler-word
 * tallies are deterministic, free and instant, and keeping them local means the
 * Statistics screen still works when the network is down.
 */

/** Hedges and hesitation markers that speech recognizers reliably transcribe. */
export const FILLER_WORDS: readonly string[] = [
  'um',
  'uh',
  'erm',
  'ah',
  'eh',
  'hmm',
  'like',
  'actually',
  'basically',
  'literally',
  'you know',
  'i mean',
  'sort of',
  'kind of',
  'stuff like that',
  'or something',
  'well',
  'so yeah',
];

/**
 * Words that are only fillers in certain positions; counting every "like" or
 * "well" would punish correct usage, so these need a looser threshold.
 */
const AMBIGUOUS_FILLERS: ReadonlySet<string> = new Set([
  'like',
  'actually',
  'basically',
  'literally',
  'well',
]);

const WORD_RE = /[\p{L}\p{N}']+/gu;

export const words = (text: string): string[] => text.toLowerCase().match(WORD_RE) ?? [];

export const countWords = (text: string): number => words(text).length;

export interface FillerAnalysis {
  readonly total: number;
  readonly found: readonly string[];
}

export const analyzeFillers = (text: string): FillerAnalysis => {
  const lower = ` ${text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/\s+/g, ' ')} `;
  const found: string[] = [];
  let total = 0;

  for (const filler of FILLER_WORDS) {
    const pattern = new RegExp(`\\s${escapeRegExp(filler)}\\s`, 'g');
    const matches = lower.match(pattern);
    if (!matches) continue;
    // Ambiguous fillers only count as a habit once they repeat in a single turn.
    const threshold = AMBIGUOUS_FILLERS.has(filler) ? 2 : 1;
    if (matches.length >= threshold) {
      total += matches.length;
      found.push(filler);
    }
  }

  return { total, found };
};

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Words repeated more than `threshold` times, ignoring function words. */
export const repeatedWords = (text: string, threshold = 3): string[] => {
  const counts = new Map<string, number>();
  for (const word of words(text)) {
    if (word.length < 4 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
};

const STOP_WORDS: ReadonlySet<string> = new Set([
  'that',
  'this',
  'with',
  'have',
  'just',
  'they',
  'from',
  'been',
  'were',
  'what',
  'when',
  'then',
  'them',
  'there',
  'their',
  'about',
  'would',
  'could',
  'should',
  'because',
  'really',
  'think',
  'going',
]);

/** Ratio of unique to total words - a rough lexical-variety signal. */
export const typeTokenRatio = (text: string): number => {
  const all = words(text);
  if (all.length === 0) return 0;
  return new Set(all).size / all.length;
};

export const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;

export const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
};

/** First name only, so greetings read naturally. */
export const firstName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? '';
};

/** Strips markdown the TTS engine would otherwise read out loud. */
export const stripMarkdown = (text: string): string =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/_([^_]*)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

export const sentenceCase = (value: string): string =>
  value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
