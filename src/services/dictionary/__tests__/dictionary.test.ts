import { dictionaryRepository, MemoryStorageAdapter, setStorageAdapter } from '@/repositories';
import { tokenise } from '@/features/dictionary/components/TappableWords';
import { isLookupWorthy, isSingleWord, normaliseWord } from '@/services/dictionary';
import type { SavedWord, WordEntry } from '@/types';

describe('normaliseWord', () => {
  it('lifts a word out of the punctuation it was sitting in', () => {
    expect(normaliseWord('"Weekend,')).toBe('weekend');
    expect(normaliseWord('really?')).toBe('really');
    expect(normaliseWord('  Hello!  ')).toBe('hello');
  });

  it('keeps the marks that belong to the word itself', () => {
    expect(normaliseWord('well-known')).toBe('well-known');
    expect(normaliseWord("don't")).toBe("don't");
  });

  it('treats a curly apostrophe as the same word as a straight one', () => {
    expect(normaliseWord('don’t')).toBe(normaliseWord("don't"));
  });

  it('folds case, so one word is not saved twice', () => {
    expect(normaliseWord('Weekend')).toBe(normaliseWord('weekend'));
  });
});

describe('isLookupWorthy', () => {
  it('accepts a word worth explaining', () => {
    expect(isLookupWorthy('procrastinate')).toBe(true);
    expect(isLookupWorthy('put')).toBe(true);
  });

  it('rejects what a tap on it could not usefully explain', () => {
    expect(isLookupWorthy('a')).toBe(false);
    expect(isLookupWorthy('I')).toBe(false);
    expect(isLookupWorthy('2019')).toBe(false);
    expect(isLookupWorthy('...')).toBe(false);
  });
});

describe('tokenise', () => {
  const text = 'I do not "really" know - well-known, isn’t it?';

  it('loses nothing: the pieces put back together are the original line', () => {
    expect(
      tokenise(text)
        .map((token) => token.text)
        .join(''),
    ).toBe(text);
  });

  it('keeps a hyphenated or contracted word as one tap, not three', () => {
    const words = tokenise(text)
      .filter((token) => token.isWord)
      .map((token) => token.text);
    expect(words).toContain('well-known');
    expect(words).toContain('isn’t');
  });

  it('leaves a single letter as plain text but keeps short real words', () => {
    const tappable = tokenise('I am here').filter((token) => token.isWord);
    // "am" stays tappable on purpose: a beginner asking what it is deserves
    // an answer, and the floor is only there to stop a stray tap on "I" or a
    // stray comma opening a sheet with nothing to say.
    expect(tappable.map((token) => token.text)).toEqual(['am', 'here']);
  });
});

describe('dictionaryRepository', () => {
  const entry: WordEntry = {
    word: 'procrastinate',
    meaning: 'To keep putting something off.',
    synonyms: ['delay'],
    examples: ['I procrastinate every Sunday evening.'],
    lookedUpAt: '2026-09-21T10:00:00.000Z',
  };

  const word = (id: string, savedAt: string): SavedWord => ({
    id,
    word: id,
    savedAt,
  });

  beforeEach(() => {
    setStorageAdapter(new MemoryStorageAdapter());
  });

  it('starts empty and reads back what was saved', async () => {
    await expect(dictionaryRepository.list()).resolves.toEqual([]);

    await dictionaryRepository.save(word('weekend', '2026-09-20T10:00:00.000Z'));
    await expect(dictionaryRepository.get('weekend')).resolves.toMatchObject({ word: 'weekend' });
  });

  it('lists the newest first, so the last word saved is the one on top', async () => {
    await dictionaryRepository.save(word('older', '2026-09-01T10:00:00.000Z'));
    await dictionaryRepository.save(word('newer', '2026-09-20T10:00:00.000Z'));

    const all = await dictionaryRepository.list();
    expect(all.map((saved) => saved.word)).toEqual(['newer', 'older']);
  });

  it('keeps the first context when the same word is saved again', async () => {
    await dictionaryRepository.save({
      ...word('charge', '2026-09-01T10:00:00.000Z'),
      context: 'Can I charge my phone here?',
    });
    await dictionaryRepository.save({
      ...word('charge', '2026-09-20T10:00:00.000Z'),
      context: 'What do you charge for that?',
    });

    const all = await dictionaryRepository.list();
    expect(all).toHaveLength(1);
    // The sentence they first met it in is the one worth remembering.
    expect(all[0]?.context).toBe('Can I charge my phone here?');
  });

  it('attaches a looked-up entry to a word already on the list', async () => {
    await dictionaryRepository.save(word('procrastinate', '2026-09-20T10:00:00.000Z'));
    await dictionaryRepository.cacheEntry('procrastinate', entry);

    await expect(dictionaryRepository.get('procrastinate')).resolves.toMatchObject({ entry });
  });

  it('does not invent a row for a word that was never saved', async () => {
    await dictionaryRepository.cacheEntry('ghost', entry);
    await expect(dictionaryRepository.list()).resolves.toEqual([]);
  });

  it('removes a word', async () => {
    await dictionaryRepository.save(word('weekend', '2026-09-20T10:00:00.000Z'));
    await dictionaryRepository.remove('weekend');

    await expect(dictionaryRepository.list()).resolves.toEqual([]);
  });

  it('drops a corrupt row instead of rendering it', async () => {
    await new MemoryStorageAdapter().write('speakora:dictionary:v1', 'not an array');
    await expect(dictionaryRepository.list()).resolves.toEqual([]);
  });
});

describe('isSingleWord', () => {
  it('accepts an ordinary word', () => {
    expect(isSingleWord('reluctant')).toBe(true);
  });

  it('accepts the punctuation that lives inside real words', () => {
    expect(isSingleWord('well-known')).toBe(true);
    expect(isSingleWord("don't")).toBe(true);
    // Curly apostrophes are the same character to a learner.
    expect(isSingleWord('don’t')).toBe(true);
  });

  it('refuses anything with a space, however short', () => {
    // A phrase looked up as if it were a word comes back as nonsense.
    expect(isSingleWord('put off')).toBe(false);
    expect(isSingleWord('by the way')).toBe(false);
    expect(isSingleWord('I went to the shop yesterday.')).toBe(false);
  });

  it('refuses digits', () => {
    expect(isSingleWord('covid19')).toBe(false);
    expect(isSingleWord('2024')).toBe(false);
  });

  it('refuses a single letter or nothing at all', () => {
    expect(isSingleWord('a')).toBe(false);
    expect(isSingleWord('')).toBe(false);
    expect(isSingleWord('   ')).toBe(false);
  });

  it('tolerates surrounding punctuation the normaliser strips', () => {
    expect(isSingleWord('  "reluctant",  ')).toBe(true);
  });

  it('refuses punctuation at the edge of the word itself', () => {
    expect(isSingleWord('re--luctant')).toBe(false);
  });
});
