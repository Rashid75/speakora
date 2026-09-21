import type { AppFailure, Result, SavedWord, WordEntry } from '@/types';
import { getStorage, STORAGE_KEYS } from './storage/StorageAdapter';

/**
 * The learner's word list.
 *
 * One blob rather than a row per word: this is a few hundred short records at
 * most, it is read whole on the Dictionary screen, and a single write keeps
 * "saved" instant from inside a conversation - which is the only place the
 * timing matters.
 *
 * Keyed by the normalised word, so saving the same word twice updates the one
 * entry instead of quietly filling the list with duplicates the learner then
 * has to tidy up.
 */
export interface DictionaryRepository {
  /** Newest first. */
  list(): Promise<readonly SavedWord[]>;
  get(word: string): Promise<SavedWord | undefined>;
  /** Adds the word, or leaves an existing one exactly as it is. */
  save(word: SavedWord): Promise<Result<void, AppFailure>>;
  remove(word: string): Promise<Result<void, AppFailure>>;
  /** Attaches a looked-up entry to a word already in the list. */
  cacheEntry(word: string, entry: WordEntry): Promise<void>;
  clear(): Promise<Result<void, AppFailure>>;
}

/** Exported for tests: this is where a bad payload gets made safe. */
export const isSavedWord = (value: unknown): value is SavedWord => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SavedWord>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.word === 'string' &&
    candidate.word.length > 0 &&
    typeof candidate.savedAt === 'string'
  );
};

const byNewest = (a: SavedWord, b: SavedWord): number =>
  Date.parse(b.savedAt) - Date.parse(a.savedAt);

class LocalDictionaryRepository implements DictionaryRepository {
  async list(): Promise<readonly SavedWord[]> {
    const result = await getStorage().read<unknown>(STORAGE_KEYS.dictionary);
    if (!result.ok || !Array.isArray(result.value)) return [];
    return result.value.filter(isSavedWord).sort(byNewest);
  }

  async get(word: string): Promise<SavedWord | undefined> {
    const all = await this.list();
    return all.find((saved) => saved.id === word);
  }

  async save(word: SavedWord): Promise<Result<void, AppFailure>> {
    const all = await this.list();
    // Deliberately not an overwrite: the first context is the one the learner
    // actually met the word in, and re-saving it from a later conversation
    // should not replace that memory with a worse one.
    if (all.some((saved) => saved.id === word.id)) return { ok: true, value: undefined };
    return this.write([word, ...all]);
  }

  async remove(word: string): Promise<Result<void, AppFailure>> {
    const all = await this.list();
    return this.write(all.filter((saved) => saved.id !== word));
  }

  async cacheEntry(word: string, entry: WordEntry): Promise<void> {
    const all = await this.list();
    if (!all.some((saved) => saved.id === word)) return;
    await this.write(all.map((saved) => (saved.id === word ? { ...saved, entry } : saved)));
  }

  async clear(): Promise<Result<void, AppFailure>> {
    return getStorage().remove(STORAGE_KEYS.dictionary);
  }

  private async write(words: readonly SavedWord[]): Promise<Result<void, AppFailure>> {
    return getStorage().write(STORAGE_KEYS.dictionary, words);
  }
}

export const dictionaryRepository: DictionaryRepository = new LocalDictionaryRepository();
