import { getDifficulty } from '@/data/difficulty';
import type { AnalyzeTurnRequest } from '@/types';
import {
  JSON_ONLY_INSTRUCTION,
  PRESERVE_MEANING_RULE,
  PRONUNCIATION_HONESTY_RULE,
  joinLines,
  section,
} from './shared';

export const FEEDBACK_PROMPT_VERSION = 1;

/**
 * Per-turn analysis.
 *
 * Runs *out of band*, after the conversational reply has already been sent, so
 * it never adds latency to the conversation itself. The output is validated
 * against `TurnAnalysis` before anything reaches the UI.
 */
export const buildFeedbackPrompt = (request: AnalyzeTurnRequest): string => {
  const difficulty = getDifficulty(request.settings.difficulty);

  return joinLines([
    section(
      'Task',
      joinLines([
        'You are an experienced, warm English speaking coach reviewing ONE spoken turn from a learner.',
        'Your job is to find the few things that would most improve their spoken English - not to list everything.',
        '',
        'Be strict about what counts as a mistake:',
        '- Report a grammar issue only if a fluent speaker would notice it. Ignore anything that is simply informal speech.',
        '- Spoken English is not written English. Contractions, fragments, false starts, "and" at the start of a sentence and trailing "you know" are all normal speech, not errors.',
        '- Speech-to-text introduces its own artefacts: missing punctuation, missing capitals, and homophones (there/their, to/too). NEVER report these as learner mistakes.',
        '- If the turn is genuinely fine, return empty arrays and say so in the headline. An honest "nothing to fix" is more useful than an invented correction.',
      ]),
    ),
    '',
    section(
      'Calibration',
      `The learner is practising at ${difficulty.label} level (${difficulty.shortLabel}). Judge them against a fluent speaker, but prioritise the issues that matter most at their level.`,
    ),
    '',
    section(
      'Rules',
      joinLines([
        PRESERVE_MEANING_RULE,
        'That rule covers corrections and the polished rewrite. It does NOT cover alternativeAnswers, which are meant to say something different.',
        '',
        PRONUNCIATION_HONESTY_RULE,
      ]),
    ),
    '',
    section('Context', buildContextBlock(request)),
    '',
    section('Output schema', SCHEMA),
    '',
    section('Field rules', FIELD_RULES),
    '',
    JSON_ONLY_INSTRUCTION,
  ]);
};

const buildContextBlock = (request: AnalyzeTurnRequest): string =>
  joinLines([
    `Conversation topic: ${request.topic.title}`,
    '',
    'What the other person had just said:',
    `"""${request.assistantPrompt}"""`,
    '',
    'What the learner said (this is what you are analysing):',
    `"""${request.userText}"""`,
    '',
    `Word count (measured on device): ${request.wordCount}`,
    typeof request.speakingMs === 'number'
      ? `Time spent speaking: ${(request.speakingMs / 1000).toFixed(1)} seconds (measured, reliable). Speaking rate: ${speakingRate(request)} words per minute.`
      : 'Time spent speaking: not measured (this was typed, not spoken).',
    typeof request.speechConfidence === 'number'
      ? `Speech recogniser confidence: ${(request.speechConfidence * 100).toFixed(0)}%. This is a weak proxy for how intelligible the speech was - it is NOT a pronunciation score. Low confidence can equally mean background noise or an unusual word.`
      : 'Speech recogniser confidence: not available.',
  ]);

const speakingRate = (request: AnalyzeTurnRequest): string => {
  if (!request.speakingMs || request.speakingMs <= 0) return 'n/a';
  return Math.round((request.wordCount / request.speakingMs) * 60_000).toString();
};

const SCHEMA = `{
  "grammar": [
    { "original": string, "correction": string, "explanation": string, "severity": "minor" | "moderate" | "major" }
  ],
  "vocabulary": [
    { "original": string, "suggestion": string, "reason": string }
  ],
  "expressions": [
    { "original": string, "natural": string, "reason": string }
  ],
  "fluency": {
    "score": number,
    "fillerWords": string[],
    "repeatedWords": string[],
    "observations": string[]
  },
  "pronunciation": { "available": false, "reason": string }
    | { "available": true, "score": number, "unclearWords": string[], "note": string },
  "confidence": { "score": number, "observations": string[] },
  "polishedResponse": string,
  "alternativeAnswers": [string, string],
  "levelEstimate": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "overallScore": number,
  "headline": string
}`;

const FIELD_RULES = joinLines([
  '- grammar: at most 3 items, most important first. Empty array if the turn was clean.',
  '- vocabulary: at most 3 items. Only suggest a word the learner would realistically use; do not push obscure vocabulary.',
  '- expressions: at most 2 items. Things a fluent speaker would phrase differently, even though the grammar is correct.',
  '- fluency.score: 0-100, based on sentence flow, hesitation, repetition and length relative to what the question invited.',
  '- fluency.observations: at most 2 short sentences, addressed to the learner as "you".',
  '- pronunciation: set available=false with a one-sentence reason whenever you were not given a recogniser confidence. If you were, you may set available=true, but score intelligibility only, and say plainly in "note" that this is not a phonetic assessment.',
  '- confidence.score: 0-100, inferred from observable behaviour only - length of the answer, willingness to give an opinion, whether they extended the conversation or gave a minimal reply.',
  '- polishedResponse: the learner turn rewritten as a fluent speaker would say it, same meaning, same length, same register. If nothing needed changing, return their original text unchanged.',
  '- alternativeAnswers: EXACTLY 2 DIFFERENT ANSWERS to the question the other person asked - NOT the learner turn reworded. This is the one field where you must NOT preserve their meaning: the point is to show what else somebody could have replied, so each one should say something genuinely different. A different opinion, a different reason, a different example, or a different angle on the same question all count. Rewording what the learner already said is a failure here, even into simpler words.',
  '- alternativeAnswers (language): both must be beginner English (CEFR A1-A2) NO MATTER what level the learner is practising at, so they are sentences the learner could actually produce today. Only the most common everyday words. Under 15 words each. No idioms, no phrasal verbs, no formal or academic words. Write them in the first person, as the learner would say them out loud. The two must differ from each other.',
  '- levelEstimate: your best CEFR estimate FOR THIS TURN ALONE. The app smooths this over many turns, so do not try to be conservative - just report what this turn shows.',
  '- overallScore: 0-100 for this turn overall.',
  '- headline: one short sentence (max 12 words) the learner sees first. If there is nothing to fix, say that warmly, e.g. "That was clear and natural - nothing to change."',
]);
