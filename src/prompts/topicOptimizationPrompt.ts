import { getDifficulty } from '@/data/difficulty';
import type { OptimizeTopicRequest } from '@/types';
import { JSON_ONLY_INSTRUCTION, joinLines, section } from './shared';

export const TOPIC_OPTIMIZATION_PROMPT_VERSION = 1;

/**
 * Turns a free-text wish ("I want to practise talking to a CTO about an
 * outage") into a structured `Topic` the conversation engine can run.
 *
 * The critical constraint is fidelity: the learner's intent must survive. We
 * are clarifying and structuring what they asked for, never replacing it with
 * something we think is better.
 */
export const buildTopicOptimizationPrompt = (request: OptimizeTopicRequest): string => {
  const difficulty = getDifficulty(request.settings.difficulty);

  return joinLines([
    section(
      'Task',
      joinLines([
        'A learner has described a conversation they want to practise in English.',
        'Turn their description into a clear, playable role-play scenario for an AI conversation partner.',
        '',
        'Rules:',
        '- Preserve their intent exactly. Do not substitute a different scenario, soften it, or make it more generic.',
        '- Keep every specific detail they gave (roles, seniority, setting, emotional tone, what should be difficult).',
        '- Fill in only what is missing to make the scene playable: where it takes place, what the AI character wants, what tension exists.',
        '- The scenario is written in the second person, addressed to the AI, describing the character IT plays - not the learner.',
        '- If their description is vague, make one clear, reasonable choice rather than listing options.',
        '- If they asked for the partner to challenge or pressure them, keep that. Do not make the character nicer than requested.',
      ]),
    ),
    '',
    section(
      'Learner default level',
      `${difficulty.label} (${difficulty.shortLabel}). Use this only to set suggestedDifficulty sensibly; if the learner asked for something clearly harder or easier, follow what they asked for.`,
    ),
    '',
    section('What the learner wrote', `"""${request.rawPrompt.trim()}"""`),
    '',
    section('Output schema', SCHEMA),
    '',
    section('Field rules', FIELD_RULES),
    '',
    JSON_ONLY_INSTRUCTION,
  ]);
};

const SCHEMA = `{
  "title": string,
  "summary": string,
  "emoji": string,
  "scenario": string,
  "talkingPoints": string[],
  "usefulPhrases": string[],
  "openingLines": string[],
  "suggestedDifficulty": "beginner" | "elementary" | "intermediate" | "upper_intermediate" | "advanced" | "expert"
}`;

const FIELD_RULES = joinLines([
  '- title: 2-5 words, no quotation marks, title case. It appears on a card.',
  '- summary: one sentence, max 90 characters, describing what the learner will practise.',
  '- emoji: exactly one emoji that fits the scenario.',
  '- scenario: 2-4 sentences addressed to the AI ("You are a CTO who..."). Include who the AI is, what the setting is, what the AI wants from the conversation, and what should make it difficult.',
  '- talkingPoints: 3-5 short phrases describing directions the conversation could go. Not questions, not a script.',
  '- usefulPhrases: 3-5 complete phrases the learner is likely to need, written as they would actually be said.',
  '- openingLines: exactly 3 different things the AI character could open the conversation with, each 1-3 sentences of natural spoken English, in character, no greeting boilerplate unless it fits the scene. They must be genuinely different ways in - a different angle, mood or detail each time - not one sentence reworded, because the learner will run this topic more than once.',
  '- suggestedDifficulty: one of the listed values.',
]);
