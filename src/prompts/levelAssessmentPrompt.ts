import type { EstimateLevelRequest } from '@/types';
import { JSON_ONLY_INSTRUCTION, joinLines, section } from './shared';

export const LEVEL_ASSESSMENT_PROMPT_VERSION = 1;

/**
 * Explains *why* the learner is at their current level.
 *
 * The level number itself is computed on device (see `utils/cefr.ts`) from a
 * smoothed average of per-turn estimates - we do not let the model re-decide it
 * from scratch each time, because that is exactly how a badge ends up flapping
 * between B1 and C1. The model's job here is the narrative justification and a
 * sanity check on the arithmetic.
 */
export const buildLevelAssessmentPrompt = (request: EstimateLevelRequest): string => {
  const { previous, recentAnalyses } = request;

  const evidence = recentAnalyses
    .slice(-10)
    .map((analysis, index) =>
      joinLines([
        `Turn ${index + 1}:`,
        `  per-turn level estimate: ${analysis.levelEstimate}`,
        `  overall score: ${analysis.overallScore}`,
        `  grammar issues: ${analysis.grammar.length === 0 ? 'none' : analysis.grammar.map((g) => g.original).join(' | ')}`,
        `  vocabulary suggestions: ${analysis.vocabulary.length === 0 ? 'none' : analysis.vocabulary.map((v) => `${v.original} -> ${v.suggestion}`).join(' | ')}`,
        `  unnatural expressions: ${analysis.expressions.length === 0 ? 'none' : analysis.expressions.map((e) => e.original).join(' | ')}`,
        `  fluency: ${analysis.fluency.score}`,
        `  confidence: ${analysis.confidence.score}`,
      ]),
    );

  return joinLines([
    section(
      'Task',
      joinLines([
        'You are assessing a learner CEFR speaking level from accumulated evidence across several turns of real conversation.',
        '',
        'Weigh all of the following, not any single one:',
        '- grammatical range and accuracy',
        '- vocabulary range and precision',
        '- sentence complexity',
        '- fluency and hesitation',
        '- how naturally they express ideas',
        '- whether they can explain, justify and develop a point',
        '- consistency across turns',
        '',
        'Be conservative. A learner is at a level when they can perform there RELIABLY, not at their single best moment.',
        'Do not move more than one band away from the current estimate unless the evidence is overwhelming and consistent.',
      ]),
    ),
    '',
    section(
      'Current estimate',
      joinLines([
        `Level: ${previous.level}`,
        `Confidence: ${Math.round(previous.confidence * 100)}%`,
        `Turns of evidence so far: ${previous.evidenceTurns}`,
      ]),
    ),
    '',
    section('Recent evidence', evidence.join('\n\n')),
    '',
    section(
      'Output schema',
      `{
  "level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "confidence": number,
  "rationale": string[]
}`,
    ),
    '',
    section(
      'Field rules',
      joinLines([
        '- level: your assessment given ALL the evidence above.',
        '- confidence: 0.0 to 1.0. Low when there are few turns or the evidence is inconsistent.',
        '- rationale: 2-4 short sentences addressed to the learner as "you", each naming concrete evidence. For example: "You handle past and present tenses accurately, but conditionals are still inconsistent." Never vague praise.',
      ]),
    ),
    '',
    JSON_ONLY_INSTRUCTION,
  ]);
};
