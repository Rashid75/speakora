import { getDifficulty } from '@/data/difficulty';
import type { EvaluateConversationRequest } from '@/types';
import { JSON_ONLY_INSTRUCTION, PRONUNCIATION_HONESTY_RULE, joinLines, section } from './shared';

export const CONVERSATION_SUMMARY_PROMPT_VERSION = 1;

/** Cap the transcript so a long session cannot blow the context window. */
const MAX_TRANSCRIPT_TURNS = 40;

/**
 * End-of-conversation rollup, shown on the History detail screen and folded
 * into the learner's long-term progress.
 */
export const buildConversationSummaryPrompt = (request: EvaluateConversationRequest): string => {
  const { conversation } = request;
  const difficulty = getDifficulty(conversation.config.difficulty);

  const transcript = conversation.messages
    .slice(-MAX_TRANSCRIPT_TURNS)
    .map((message) => `${message.role === 'user' ? 'LEARNER' : 'PARTNER'}: ${message.text}`)
    .join('\n');

  const voiceTurns = conversation.messages.filter(
    (message) => message.role === 'user' && message.inputMode === 'voice',
  ).length;

  return joinLines([
    section(
      'Task',
      joinLines([
        'Review a complete English speaking practice conversation and write an honest end-of-session assessment.',
        '',
        'Assess only the LEARNER turns. The PARTNER turns are the AI and are not being evaluated.',
        'Judge the conversation as a whole: consistency matters more than the single best or worst sentence.',
        'Be specific and evidence-based. Quote or paraphrase what they actually said.',
        'Be honest. Inflated praise is useless to someone trying to improve.',
      ]),
    ),
    '',
    section('Rules', PRONUNCIATION_HONESTY_RULE),
    '',
    section(
      'Session facts',
      joinLines([
        `Topic: ${conversation.topicTitle}`,
        `Practice difficulty: ${difficulty.label} (${difficulty.shortLabel})`,
        `Duration: ${Math.round(conversation.durationMs / 60_000)} minutes`,
        `Learner speaking turns: ${conversation.stats.userTurns}`,
        `Learner words spoken: ${conversation.stats.userWords}`,
        `Filler words counted on device: ${conversation.stats.fillerWordCount}`,
        `Turns delivered by voice: ${voiceTurns} of ${conversation.stats.userTurns}`,
      ]),
    ),
    '',
    section('Transcript', transcript),
    '',
    section(
      'Output schema',
      `{
  "level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "levelConfidence": number,
  "overallScore": number,
  "strengths": string[],
  "improvements": string[],
  "summary": string,
  "skills": {
    "grammar": number,
    "fluency": number,
    "vocabulary": number,
    "pronunciation": number,
    "naturalness": number,
    "confidence": number
  }
}`,
    ),
    '',
    section(
      'Field rules',
      joinLines([
        '- level: CEFR level demonstrated across this whole conversation.',
        '- levelConfidence: 0.0-1.0. A short conversation of two or three turns cannot support high confidence.',
        '- overallScore: 0-100 for the session.',
        '- strengths: 2-3 specific things they did well, addressed as "you", each referencing something they actually said.',
        '- improvements: 2-3 specific, actionable things to work on. No generic advice like "practise more".',
        '- summary: 2-3 sentences summarising how the conversation went, written warmly and directly to the learner.',
        `- skills.pronunciation: if the turns were typed rather than spoken, or you have no intelligibility signal, set this to 0 and say in "summary" that pronunciation was not assessed. Do NOT guess a plausible-looking number. (${voiceTurns} of ${conversation.stats.userTurns} turns were spoken.)`,
        '- all other skills: 0-100.',
      ]),
    ),
    '',
    JSON_ONLY_INSTRUCTION,
  ]);
};
