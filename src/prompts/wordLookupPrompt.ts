import { getDifficulty } from '@/data/difficulty';
import type { WordLookupRequest } from '@/types';
import { joinLines } from './shared';

export const WORD_LOOKUP_PROMPT_VERSION = 1;

/**
 * Explains one word, in the sense it was actually used in.
 *
 * The sentence it came from is the whole point of doing this with a model
 * rather than a dictionary API: "charge" in *charge your phone* and "charge"
 * in *what do you charge* are different words to a learner, and a static entry
 * hands them both and leaves them to guess. With the sentence in front of it
 * the model can answer the question the learner actually has.
 *
 * Two instructions are load-bearing and should not be softened:
 *
 * - synonyms may be empty. A model asked for three will always produce three,
 *   and the third will be wrong. A learner who trusts a bad synonym and uses
 *   it in a meeting is worse off than one who was told there is not a close
 *   one - so the prompt says so explicitly.
 * - examples must not reuse the sentence it came from, and must not all be
 *   about its topic. Seeing the same sentence back teaches nothing, and a word
 *   only ever seen in one setting stays stuck to that setting.
 * - verb forms are for verbs only. A model asked loosely will supply
 *   "book, booked, booked" on an entry about the noun, which teaches a
 *   pattern that is not there.
 */
export const buildWordLookupPrompt = (request: WordLookupRequest): string => {
  const lines: string[] = [
    'You explain one English word or phrase to someone learning English. You are their conversation partner, not a dictionary - write the way you would say it out loud.',
    '',
    `The word: "${request.word}"`,
  ];

  if (request.context) {
    lines.push(
      `They met it in this sentence: "${request.context}"`,
      'Explain the sense used in that sentence. If the word has other common senses, you may mention one briefly, but lead with this one.',
    );
  } else {
    lines.push('There is no surrounding sentence, so explain the most common everyday sense.');
  }

  const difficulty = getDifficulty(request.settings.difficulty);

  lines.push(
    '',
    `Pitch the explanation at this level - ${difficulty.label}: ${difficulty.prompt}`,
    '',
    'Return JSON only, with this exact shape:',
    '{',
    '  "word": string,',
    '  "partOfSpeech": string,',
    '  "formUsed": string,',
    '  "verbForms": { "base": string, "past": string, "pastParticiple": string },',
    '  "meaning": string,',
    '  "synonyms": string[],',
    '  "examples": string[]',
    '}',
    '',
    '- word: the word in its normal dictionary form, lower case.',
    '- partOfSpeech: noun, verb, phrasal verb, adjective, adverb, idiom, or similar. Empty string if none of those fit.',
    `- formUsed: which form of the word they actually tapped, named the way a learner is taught - "past simple", "past participle", "third person singular", "plural", "comparative", "-ing form". They tapped "${request.word}", which may be an inflected form of the dictionary word above. Use an empty string when the word has only one form worth naming.`,
    '- verbForms: the three principal parts a learner calls 1st, 2nd and 3rd form - base, past simple, past participle (go, went, gone / walk, walked, walked). Include this ONLY when partOfSpeech is a verb or phrasal verb. Omit the key entirely for every other part of speech: a noun has no principal parts, and inventing them teaches a false pattern.',
    '- meaning: one or two sentences, in plain English, no jargon and no circular definitions. Do not use the word itself to define it.',
    '- synonyms: words or short phrases that could genuinely replace it in that sentence. Between 0 and 4. Return an empty array if there is no close one - never pad the list, and never include a word that only sort of fits, because they will use it.',
    `- examples: 3 or 4 new sentences, each in a different everyday situation. Every one must contain "${request.word}" spelled exactly like that - the form they actually tapped. Do NOT swap in another form of it: no base form, no past, no participle, no plural. A learner who tapped "went" is trying to learn "went", and a sentence about "gone" is a different lesson.`,
    '- examples (context): do NOT reuse the sentence they met it in, and do not write them all about that topic - the point is to show the word away from the one place they have seen it. Keep each short enough to say out loud.',
  );

  return joinLines(lines);
};
