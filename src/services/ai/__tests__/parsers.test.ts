import {
  parseConversationAssessment,
  parseConversationReply,
  parseLevelEstimate,
  parseOptimizedTopic,
  parseTurnAnalysis,
  sanitiseSpokenText,
} from '@/services/ai/parsers';
import { parseJsonObject } from '@/services/ai/json';

describe('parseJsonObject', () => {
  it('parses clean JSON', () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('recovers JSON wrapped in a markdown code fence', () => {
    expect(parseJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('recovers JSON with a sentence of preamble', () => {
    expect(parseJsonObject('Sure! Here you go:\n{"a":1}\nHope that helps.')).toEqual({ a: 1 });
  });

  it('repairs a trailing comma', () => {
    expect(parseJsonObject('{"a":1,}')).toEqual({ a: 1 });
  });

  it('is not confused by braces inside strings', () => {
    expect(parseJsonObject('{"a":"} not the end {"}')).toEqual({ a: '} not the end {' });
  });

  it('returns undefined for unusable input rather than throwing', () => {
    expect(parseJsonObject('not json at all')).toBeUndefined();
    expect(parseJsonObject('')).toBeUndefined();
    expect(parseJsonObject('[1,2,3]')).toBeUndefined();
  });
});

describe('sanitiseSpokenText', () => {
  it('strips markdown that TTS would read aloud', () => {
    expect(sanitiseSpokenText('**Really?** That is _wild_.')).toBe('Really? That is wild.');
  });

  it('removes a speaker label the model added', () => {
    expect(sanitiseSpokenText('Aya: Oh, nice one.')).toBe('Oh, nice one.');
    expect(sanitiseSpokenText('Noor: Go on.')).toBe('Go on.');
    // Leading whitespace and a gap before the colon must both be handled. This
    // fails if the \s escapes in the pattern collapse to a literal "s".
    expect(sanitiseSpokenText('  Kai : yeah exactly')).toBe('yeah exactly');
  });

  it('does not strip a sentence that merely starts with a name', () => {
    expect(sanitiseSpokenText('Aya said the same thing.')).toBe('Aya said the same thing.');
  });

  it('removes stage directions', () => {
    expect(sanitiseSpokenText('*laughs* No way!')).toBe('No way!');
  });

  it('collapses whitespace', () => {
    expect(sanitiseSpokenText('Hi   there\n\nfriend')).toBe('Hi there friend');
  });
});

describe('parseConversationReply', () => {
  it('returns undefined for an empty reply', () => {
    expect(parseConversationReply('   ', false)).toBeUndefined();
  });

  it('carries the transition flag through', () => {
    expect(parseConversationReply('Hello there', true)).toEqual({
      reply: 'Hello there',
      introducedNewTopic: true,
    });
  });
});

describe('parseTurnAnalysis', () => {
  const valid = JSON.stringify({
    grammar: [
      {
        original: 'I am working here since 2019',
        correction: 'I have been working here since 2019',
        explanation: 'Use the present perfect continuous with "since".',
        severity: 'moderate',
      },
    ],
    vocabulary: [{ original: 'good', suggestion: 'solid', reason: 'More precise.' }],
    expressions: [],
    fluency: { score: 78, fillerWords: ['um'], repeatedWords: [], observations: ['Nice pace.'] },
    pronunciation: { available: true, score: 80, unclearWords: [], note: 'Intelligibility only.' },
    confidence: { score: 74, observations: [] },
    polishedResponse: 'I have been working here since 2019.',
    alternativeAnswers: ['I work in a small team.', 'I moved here for this job.'],
    levelEstimate: 'B2',
    overallScore: 76,
    headline: 'Watch the present perfect.',
  });

  it('parses a well-formed payload', () => {
    const result = parseTurnAnalysis(valid, 'B1', true);
    expect(result?.levelEstimate).toBe('B2');
    expect(result?.grammar).toHaveLength(1);
    expect(result?.overallScore).toBe(76);
  });

  it('keeps both alternative answers', () => {
    expect(parseTurnAnalysis(valid, 'B1', true)?.alternativeAnswers).toEqual([
      'I work in a small team.',
      'I moved here for this job.',
    ]);
  });

  it('caps alternative answers at two and drops blanks and duplicates', () => {
    const payload = JSON.stringify({
      ...JSON.parse(valid),
      alternativeAnswers: ['One.', '  ', 'one.', 'Two.', 'Three.'],
    });
    expect(parseTurnAnalysis(payload, 'B1', false)?.alternativeAnswers).toEqual(['One.', 'Two.']);
  });

  it('survives a payload with no alternative answers at all', () => {
    const payload = JSON.stringify({ ...JSON.parse(valid), alternativeAnswers: undefined });
    expect(parseTurnAnalysis(payload, 'B1', false)?.alternativeAnswers).toEqual([]);
  });

  it('forces pronunciation unavailable when no speech confidence was supplied', () => {
    const result = parseTurnAnalysis(valid, 'B1', false);
    expect(result?.pronunciation.available).toBe(false);
  });

  it('drops a grammar item whose correction equals the original', () => {
    const payload = JSON.stringify({
      ...JSON.parse(valid),
      grammar: [{ original: 'same', correction: 'same', explanation: 'x', severity: 'minor' }],
    });
    expect(parseTurnAnalysis(payload, 'B1', false)?.grammar).toHaveLength(0);
  });

  it('falls back to the supplied level for an invalid CEFR value', () => {
    const payload = JSON.stringify({ ...JSON.parse(valid), levelEstimate: 'Z9' });
    expect(parseTurnAnalysis(payload, 'A2', false)?.levelEstimate).toBe('A2');
  });

  it('rescales a 0-1 score that should have been 0-100', () => {
    const payload = JSON.stringify({
      ...JSON.parse(valid),
      fluency: { score: 0.8, fillerWords: [], repeatedWords: [], observations: [] },
    });
    expect(parseTurnAnalysis(payload, 'B1', false)?.fluency.score).toBe(80);
  });

  it('clamps an out-of-range score', () => {
    const payload = JSON.stringify({ ...JSON.parse(valid), overallScore: 420 });
    expect(parseTurnAnalysis(payload, 'B1', false)?.overallScore).toBe(100);
  });

  it('returns undefined when the payload carries no usable signal', () => {
    expect(parseTurnAnalysis('{}', 'B1', false)).toBeUndefined();
  });

  it('returns undefined for malformed JSON', () => {
    expect(parseTurnAnalysis('total nonsense', 'B1', false)).toBeUndefined();
  });
});

describe('parseOptimizedTopic', () => {
  const valid = JSON.stringify({
    title: 'Outage Postmortem',
    summary: 'Explain a production incident to a sceptical CTO.',
    emoji: '🔥',
    scenario: 'You are a CTO who challenges every claim.',
    talkingPoints: ['Root cause', 'Prevention'],
    usefulPhrases: ['The root cause was...'],
    openingLine: 'So. Walk me through what happened.',
    suggestedDifficulty: 'advanced',
  });

  it('parses a well-formed draft', () => {
    const result = parseOptimizedTopic(valid, 'intermediate');
    expect(result?.title).toBe('Outage Postmortem');
    expect(result?.suggestedDifficulty).toBe('advanced');
  });

  it('rejects a draft missing the fields a conversation needs', () => {
    expect(parseOptimizedTopic('{"title":"Only a title"}', 'intermediate')).toBeUndefined();
  });

  it('substitutes a default emoji when the model returned a word', () => {
    const payload = JSON.stringify({ ...JSON.parse(valid), emoji: 'fire' });
    expect(parseOptimizedTopic(payload, 'intermediate')?.emoji).toBe('✨');
  });

  it('falls back to the supplied difficulty for an unknown value', () => {
    const payload = JSON.stringify({ ...JSON.parse(valid), suggestedDifficulty: 'impossible' });
    expect(parseOptimizedTopic(payload, 'elementary')?.suggestedDifficulty).toBe('elementary');
  });
});

describe('parseConversationAssessment', () => {
  const valid = JSON.stringify({
    level: 'B2',
    levelConfidence: 0.72,
    overallScore: 78,
    strengths: ['You gave clear examples.'],
    improvements: ['Work on conditionals.'],
    summary: 'A solid conversation.',
    skills: {
      grammar: 80,
      fluency: 76,
      vocabulary: 79,
      pronunciation: 74,
      naturalness: 72,
      confidence: 85,
    },
  });

  it('parses a well-formed assessment', () => {
    const result = parseConversationAssessment(valid, 'B1', true);
    expect(result?.level).toBe('B2');
    expect(result?.skills.pronunciation).toBe(74);
  });

  it('zeroes pronunciation when no turn was spoken', () => {
    const result = parseConversationAssessment(valid, 'B1', false);
    expect(result?.skills.pronunciation).toBe(0);
  });

  it('rescales a percentage confidence into 0-1', () => {
    const payload = JSON.stringify({ ...JSON.parse(valid), levelConfidence: 72 });
    expect(parseConversationAssessment(payload, 'B1', true)?.levelConfidence).toBeCloseTo(0.72);
  });

  it('returns undefined when there is nothing to show', () => {
    expect(parseConversationAssessment('{}', 'B1', true)).toBeUndefined();
  });
});

describe('parseLevelEstimate', () => {
  it('parses a valid estimate', () => {
    const payload = JSON.stringify({
      level: 'C1',
      confidence: 0.8,
      rationale: ['You handle abstract topics well.'],
    });
    expect(parseLevelEstimate(payload, 'B1')?.level).toBe('C1');
  });

  it('requires a rationale', () => {
    const payload = JSON.stringify({ level: 'C1', confidence: 0.8, rationale: [] });
    expect(parseLevelEstimate(payload, 'B1')).toBeUndefined();
  });
});
