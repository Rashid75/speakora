import { dictionaryRepository } from '@/repositories';
import { getAIProvider } from '@/services/ai';
import { isOnline } from '@/services/network/NetworkService';
import { failure, type AppFailure, type AppSettings, type Result, type WordEntry } from '@/types';
import { nowIso } from '@/utils/time';

/**
 * Looking words up, and keeping them.
 *
 * The explanation comes from the same model the conversation does, rather than
 * from a dictionary API, for two reasons. It can read the sentence the word
 * was met in and explain *that* sense - which is the entire difficulty with
 * words like "charge" or "put off" - and it adds no third party to the app: a
 * lookup travels the path every other request already travels.
 *
 * Every successful lookup is cached onto the saved word. A word the learner
 * opens ten times is fetched once, and the list keeps working with no signal.
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

export interface LookUpWordParams {
  readonly word: string;
  /** The sentence it was met in. Decides which sense gets explained. */
  readonly context?: string;
  readonly settings: AppSettings;
  readonly signal?: AbortSignal;
}

/**
 * The entry for a word: from the cache if it has one, otherwise from the model.
 *
 * Offline is reported as offline rather than as a failed lookup, because the
 * two need different things from the learner - one is "try again", the other
 * is "try again somewhere with signal".
 */
export const lookUpWord = async ({
  word,
  context,
  settings,
  signal,
}: LookUpWordParams): Promise<Result<WordEntry, AppFailure>> => {
  const normalised = normaliseWord(word);
  if (!normalised) return { ok: false, error: failure('ai_invalid_response', 'Empty word') };

  const saved = await dictionaryRepository.get(normalised);
  if (saved?.entry) return { ok: true, value: saved.entry };

  if (!isOnline()) {
    return { ok: false, error: failure('offline', 'Word lookup needs a connection') };
  }

  const result = await getAIProvider().lookUpWord(
    { word: normalised, ...(context ? { context } : {}), settings },
    signal,
  );
  if (!result.ok) return result;

  // Fire and forget: a word that is not saved has nothing to cache onto, and
  // a failed write must not turn a successful lookup into an error.
  void dictionaryRepository.cacheEntry(normalised, result.value);
  return result;
};

export interface SaveWordParams {
  readonly word: string;
  readonly context?: string;
  readonly topicTitle?: string;
  readonly entry?: WordEntry;
}

/** Adds a word to the list. Saving one that is already there changes nothing. */
export const saveWord = async ({
  word,
  context,
  topicTitle,
  entry,
}: SaveWordParams): Promise<Result<void, AppFailure>> => {
  const normalised = normaliseWord(word);
  if (!normalised) return { ok: false, error: failure('unknown', 'Empty word') };

  return dictionaryRepository.save({
    id: normalised,
    word: normalised,
    savedAt: nowIso(),
    ...(context ? { context } : {}),
    ...(topicTitle ? { topicTitle } : {}),
    ...(entry ? { entry } : {}),
  });
};

export const forgetWord = async (word: string): Promise<Result<void, AppFailure>> =>
  dictionaryRepository.remove(normaliseWord(word));
