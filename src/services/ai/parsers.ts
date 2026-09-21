import type {
  ConversationAssessment,
  ConversationTurnResult,
  Difficulty,
  ExpressionSuggestion,
  GrammarIssue,
  IssueSeverity,
  LevelEstimateResult,
  OptimizedTopicDraft,
  PronunciationAssessment,
  TurnAnalysis,
  VocabularySuggestion,
  CefrLevel,
  WordEntry,
} from '@/types';
import { PERSONALITY_LIST } from '@/data/personalities';
import { escapeRegExp, stripMarkdown } from '@/utils/text';
import { nowIso } from '@/utils/time';
import type { JsonObject } from './json';
import { parseJsonObject } from './json';
import {
  asBoolean,
  asCefrLevel,
  asDifficulty,
  asEmoji,
  asEnum,
  asObject,
  asObjectArray,
  asScore,
  asString,
  asStringArray,
  asUnitInterval,
} from './validation';

/**
 * Raw model output -> validated domain objects.
 *
 * Every parser returns `undefined` only when the payload is unusable; anything
 * that is merely *imperfect* is repaired. That distinction matters: a missing
 * `polishedResponse` should not throw away three good grammar corrections.
 */

const SEVERITIES: readonly IssueSeverity[] = ['minor', 'moderate', 'major'];

export const parseConversationReply = (
  raw: string,
  introducedNewTopic: boolean,
): ConversationTurnResult | undefined => {
  const reply = sanitiseSpokenText(raw);
  if (!reply) return undefined;
  return { reply, introducedNewTopic };
};

/**
 * The conversation reply is plain prose, not JSON - JSON mode measurably
 * stiffens conversational output, and naturalness is the product's whole point.
 * We only need to strip artefacts that would be read aloud by the TTS engine.
 */
/**
 * Built from the personality catalogue so renaming a partner cannot silently
 * leave a stale name behind in the label stripper.
 */
const SPEAKER_LABEL = new RegExp(
  // Note the doubled backslashes: this is a template literal, so `\s` would
  // collapse to a literal "s" and quietly match the wrong thing.
  `^\\s*(?:${[...PERSONALITY_LIST.map((p) => p.name), 'assistant', 'ai', 'partner']
    .map((name) => escapeRegExp(name.toLowerCase()))
    .join('|')})\\s*:\\s*`,
  'i',
);

export const sanitiseSpokenText = (raw: string): string => {
  // Order matters here.
  //
  // 1. Unwrap **bold** first, so its inner text survives step 2.
  // 2. Drop *stage directions*. This must happen BEFORE stripMarkdown, which
  //    treats *x* as italics and would leave the bare word behind - turning
  //    "*laughs*" into the literal word "laughs" for the TTS engine to read
  //    out loud. The conversation prompt forbids markdown outright, so
  //    surviving single-asterisk spans are overwhelmingly stage directions.
  let text = raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*[^*\n]{1,40}\*/g, ' ')
    .replace(/\((?:laughs|laughing|smiling|smiles|pauses|sighs|chuckles)[^)]*\)/gi, ' ');

  text = stripMarkdown(text);
  // Some models prefix a speaker label despite being told not to.
  text = text.replace(SPEAKER_LABEL, '');
  return text.replace(/\s+/g, ' ').trim();
};

export const parseTurnAnalysis = (
  raw: string,
  fallbackLevel: CefrLevel,
  hasSpeechConfidence: boolean,
): TurnAnalysis | undefined => {
  const json = parseJsonObject(raw);
  if (!json) return undefined;

  const fluencyRaw = asObject(json.fluency);
  const confidenceRaw = asObject(json.confidence);

  const analysis: TurnAnalysis = {
    grammar: parseGrammar(json),
    vocabulary: parseVocabulary(json),
    expressions: parseExpressions(json),
    fluency: {
      score: asScore(fluencyRaw.score, 70),
      fillerWords: asStringArray(fluencyRaw.fillerWords, 8),
      repeatedWords: asStringArray(fluencyRaw.repeatedWords, 8),
      observations: asStringArray(fluencyRaw.observations, 3),
    },
    pronunciation: parsePronunciation(json, hasSpeechConfidence),
    confidence: {
      score: asScore(confidenceRaw.score, 70),
      observations: asStringArray(confidenceRaw.observations, 3),
    },
    polishedResponse: asString(json.polishedResponse),
    // Capped at two, deduped and blank-stripped by the helper. A model that
    // returns one, or none, is repaired rather than rejected.
    alternativeAnswers: asStringArray(json.alternativeAnswers, 2),
    levelEstimate: asCefrLevel(json.levelEstimate, fallbackLevel) as CefrLevel,
    overallScore: asScore(json.overallScore, 70),
    headline: asString(json.headline),
  };

  // A payload with no usable signal at all is a genuine failure, not a repair.
  const hasSignal =
    analysis.grammar.length > 0 ||
    analysis.vocabulary.length > 0 ||
    analysis.expressions.length > 0 ||
    analysis.polishedResponse.length > 0 ||
    analysis.headline.length > 0;

  return hasSignal ? analysis : undefined;
};

const parseGrammar = (json: JsonObject): GrammarIssue[] =>
  asObjectArray(json.grammar, 3)
    .map((item) => ({
      original: asString(item.original),
      correction: asString(item.correction),
      explanation: asString(item.explanation),
      severity: asEnum(item.severity, SEVERITIES, 'minor'),
    }))
    .filter((item) => item.correction.length > 0 && item.original !== item.correction);

const parseVocabulary = (json: JsonObject): VocabularySuggestion[] =>
  asObjectArray(json.vocabulary, 3)
    .map((item) => ({
      original: asString(item.original),
      suggestion: asString(item.suggestion),
      reason: asString(item.reason),
    }))
    .filter((item) => item.suggestion.length > 0 && item.original !== item.suggestion);

const parseExpressions = (json: JsonObject): ExpressionSuggestion[] =>
  asObjectArray(json.expressions, 2)
    .map((item) => ({
      original: asString(item.original),
      natural: asString(item.natural),
      reason: asString(item.reason),
    }))
    .filter((item) => item.natural.length > 0 && item.original !== item.natural);

/**
 * Pronunciation is the one field we actively *distrust*.
 *
 * If the speech layer never gave us a confidence signal, we force
 * `available: false` regardless of what the model claims - otherwise the app
 * would be showing a phonetic score derived from reading a text transcript,
 * which is exactly the fabrication the spec forbids.
 */
const parsePronunciation = (
  json: JsonObject,
  hasSpeechConfidence: boolean,
): PronunciationAssessment => {
  if (!hasSpeechConfidence) {
    return {
      available: false,
      reason: 'Pronunciation needs spoken audio. Use the microphone to get this measured.',
    };
  }

  const raw = asObject(json.pronunciation);
  if (!asBoolean(raw.available, false)) {
    return {
      available: false,
      reason: asString(raw.reason, 'Not enough audio signal to assess this turn.'),
    };
  }

  return {
    available: true,
    score: asScore(raw.score, 70),
    unclearWords: asStringArray(raw.unclearWords, 6),
    note: asString(
      raw.note,
      'Based on how clearly speech recognition understood you, not a phonetic analysis.',
    ),
  };
};

/**
 * A word entry, or nothing.
 *
 * `synonyms` is allowed to come back empty and is left empty - the prompt
 * tells the model not to pad it, and quietly topping it up here would undo
 * that. `examples` is the other way round: an entry with no example sentence
 * is not worth showing, so it fails rather than rendering a blank section.
 */
export const parseWordEntry = (raw: string, word: string): WordEntry | undefined => {
  const json = parseJsonObject(raw);
  if (!json) return undefined;

  const meaning = asString(json.meaning);
  const examples = asStringArray(json.examples, 4);
  if (!meaning || examples.length === 0) return undefined;

  const partOfSpeech = asString(json.partOfSpeech);
  const formUsed = asString(json.formUsed);

  // Verb forms only survive on a verb, whatever the model returned. Asked
  // loosely, models hand back "book, booked, booked" on an entry about the
  // noun - a pattern that is not there, presented as if it were.
  const formsRaw = asObject(json.verbForms);
  const base = asString(formsRaw.base);
  // Word-boundaried on purpose: a bare /verb/ also matches "adverb", which
  // would hand three principal parts to a word that has none.
  const verbForms =
    /\bverb\b/i.test(partOfSpeech) && base
      ? {
          base,
          past: asString(formsRaw.past),
          pastParticiple: asString(formsRaw.pastParticiple),
        }
      : undefined;

  return {
    word: asString(json.word, word).toLowerCase() || word,
    ...(partOfSpeech ? { partOfSpeech } : {}),
    ...(formUsed ? { formUsed } : {}),
    ...(verbForms ? { verbForms } : {}),
    meaning,
    synonyms: asStringArray(json.synonyms, 4),
    examples,
    lookedUpAt: nowIso(),
  };
};

export const parseOptimizedTopic = (
  raw: string,
  fallbackDifficulty: Difficulty,
): OptimizedTopicDraft | undefined => {
  const json = parseJsonObject(raw);
  if (!json) return undefined;

  const scenario = asString(json.scenario);
  const title = asString(json.title);
  // A model that ignores the plural and sends one string still yields a usable
  // topic, rather than a rejected one.
  const openingLines = (
    Array.isArray(json.openingLines)
      ? asStringArray(json.openingLines, 5)
      : [asString(json.openingLine)]
  )
    .map((line) => sanitiseSpokenText(line))
    .filter((line) => line.length > 0);

  // Without these three there is nothing to run a conversation from.
  if (!scenario || openingLines.length === 0 || !title) return undefined;

  return {
    title: title.slice(0, 60),
    summary: asString(json.summary, 'A custom speaking scenario.').slice(0, 120),
    emoji: asEmoji(json.emoji, '✨'),
    scenario,
    talkingPoints: asStringArray(json.talkingPoints, 5),
    usefulPhrases: asStringArray(json.usefulPhrases, 5),
    openingLines,
    suggestedDifficulty: asDifficulty(json.suggestedDifficulty, fallbackDifficulty),
  };
};

export const parseConversationAssessment = (
  raw: string,
  fallbackLevel: CefrLevel,
  pronunciationMeasurable: boolean,
): ConversationAssessment | undefined => {
  const json = parseJsonObject(raw);
  if (!json) return undefined;

  const skillsRaw = asObject(json.skills);
  const summary = asString(json.summary);
  const strengths = asStringArray(json.strengths, 3);
  const improvements = asStringArray(json.improvements, 3);

  if (!summary && strengths.length === 0 && improvements.length === 0) return undefined;

  return {
    level: asCefrLevel(json.level, fallbackLevel) as CefrLevel,
    levelConfidence: asUnitInterval(json.levelConfidence, 0.4),
    overallScore: asScore(json.overallScore, 70),
    strengths,
    improvements,
    summary,
    skills: {
      grammar: asScore(skillsRaw.grammar, 70),
      fluency: asScore(skillsRaw.fluency, 70),
      vocabulary: asScore(skillsRaw.vocabulary, 70),
      // Zero here means "not measured" and the UI renders it as such.
      pronunciation: pronunciationMeasurable ? asScore(skillsRaw.pronunciation, 0) : 0,
      naturalness: asScore(skillsRaw.naturalness, 70),
      confidence: asScore(skillsRaw.confidence, 70),
    },
  };
};

export const parseLevelEstimate = (
  raw: string,
  fallbackLevel: CefrLevel,
): LevelEstimateResult | undefined => {
  const json = parseJsonObject(raw);
  if (!json) return undefined;

  const rationale = asStringArray(json.rationale, 4);
  if (rationale.length === 0) return undefined;

  return {
    level: asCefrLevel(json.level, fallbackLevel) as CefrLevel,
    confidence: asUnitInterval(json.confidence, 0.4),
    rationale,
  };
};
