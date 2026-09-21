/**
 * The learner's own word list.
 *
 * Words are collected where they are met - in the middle of a conversation,
 * in a sentence someone actually said - rather than from a list somebody else
 * wrote. That context is stored with the word, because "where I first saw it"
 * is most of what makes a word stick.
 */

/** The three principal parts, as a learner is taught them: go, went, gone. */
export interface VerbForms {
  /** 1st form: go */
  readonly base: string;
  /** 2nd form: went */
  readonly past: string;
  /** 3rd form: gone */
  readonly pastParticiple: string;
}

/** What we can tell the learner about a word. */
export interface WordEntry {
  /** Normalised, so the entry and the saved word can never disagree. */
  readonly word: string;
  /** "noun", "phrasal verb", and so on. Absent when it does not apply. */
  readonly partOfSpeech?: string;
  /**
   * Which form of the word they actually tapped - "past simple", "plural",
   * "comparative". Absent when the word has only one form worth naming.
   *
   * The tapped word is often inflected: someone taps "went" and the entry is
   * headed "go", which is confusing unless something says why.
   */
  readonly formUsed?: string;
  /**
   * Verbs only, and absent for every other part of speech. A noun does not
   * have three principal parts, and inventing them teaches a false pattern.
   */
  readonly verbForms?: VerbForms;
  /** Plain-language meaning, in the sense the word was actually used in. */
  readonly meaning: string;
  /**
   * Genuinely close alternatives. Empty is a real answer - a word with no
   * near-synonym gets none rather than three loose ones to fill the space.
   */
  readonly synonyms: readonly string[];
  /** Fresh sentences using the word, not the one it was taken from. */
  readonly examples: readonly string[];
  readonly lookedUpAt: string;
}

export interface SavedWord {
  /** The normalised word itself: a word is in the list once or not at all. */
  readonly id: string;
  /** As normalised. The original casing lives in `context`. */
  readonly word: string;
  readonly savedAt: string;
  /** The sentence it was taken from, verbatim. */
  readonly context?: string;
  /** What the conversation was about, for the list row. */
  readonly topicTitle?: string;
  /**
   * The looked-up entry, cached on the word.
   *
   * So the list works on a train with no signal, and so a word the learner
   * opens ten times is looked up once. Absent until the first successful
   * lookup - never a placeholder, because an invented entry is worse than a
   * missing one.
   */
  readonly entry?: WordEntry;
}
