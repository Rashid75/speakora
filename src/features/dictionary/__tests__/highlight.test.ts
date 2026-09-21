import { isMatch, splitOnWord } from '../highlight';

describe('splitOnWord', () => {
  it('pulls the word out of the sentence around it', () => {
    expect(splitOnWord('I went home early.', 'went')).toEqual(['I ', 'went', ' home early.']);
  });

  it('matches whatever the casing', () => {
    expect(splitOnWord('Went again yesterday.', 'went')).toEqual(['Went', ' again yesterday.']);
  });

  it('finds every occurrence, not just the first', () => {
    expect(splitOnWord('went there, then went home', 'went')).toEqual([
      'went',
      ' there, then ',
      'went',
      ' home',
    ]);
  });

  /**
   * The regression this helper exists for. Built inside a template literal, a
   * single-escaped word boundary becomes a backspace character, the pattern
   * matches nothing, and the sentence renders as one unhighlighted piece -
   * which looks like a styling choice rather than a bug.
   */
  it('really does apply a word boundary', () => {
    expect(splitOnWord('Wenton is not a word.', 'went')).toEqual(['Wenton is not a word.']);
    expect(splitOnWord('I rewent nowhere.', 'went')).toEqual(['I rewent nowhere.']);
  });

  it('survives a word with regex punctuation in it', () => {
    expect(splitOnWord("I don't think so.", "don't")).toEqual(['I ', "don't", ' think so.']);
    expect(splitOnWord('It is well-known.', 'well-known')).toEqual(['It is ', 'well-known', '.']);
  });

  it('returns the sentence untouched when there is no word to find', () => {
    expect(splitOnWord('Nothing to mark.', '')).toEqual(['Nothing to mark.']);
  });

  it('drops the empty pieces a split leaves at the edges', () => {
    // A sentence that is only the word would otherwise come back as
    // ['', 'went', ''] and render two blank spans.
    expect(splitOnWord('went', 'went')).toEqual(['went']);
  });
});

describe('isMatch', () => {
  it('ignores casing, like the split that produced the pieces', () => {
    expect(isMatch('Went', 'went')).toBe(true);
    expect(isMatch('went', 'went')).toBe(true);
  });

  it('rejects the text around the match', () => {
    expect(isMatch(' home early.', 'went')).toBe(false);
  });
});
