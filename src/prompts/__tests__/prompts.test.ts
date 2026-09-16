import { DEFAULT_SETTINGS, STORAGE_SCHEMA_VERSION } from '@/config/appConfig';
import { BUILTIN_TOPICS } from '@/data/topics';
import {
  buildConversationSummaryPrompt,
  buildConversationSystemPrompt,
  buildFeedbackPrompt,
  buildLevelAssessmentPrompt,
  buildOpeningLine,
  buildTopicOptimizationPrompt,
} from '@/prompts';
import type { Conversation, Topic, TurnAnalysis } from '@/types';
import { INITIAL_PROGRESS } from '@/utils/cefr';

const topic = BUILTIN_TOPICS[0] as Topic;

const baseRequest = {
  topic,
  settings: DEFAULT_SETTINGS,
  history: [],
  userText: 'Hello there',
  elapsedMinutes: 5,
  shouldTransitionTopic: false,
  progress: INITIAL_PROGRESS,
};

describe('buildConversationSystemPrompt', () => {
  const prompt = buildConversationSystemPrompt(baseRequest);

  it('establishes the partner, not teacher, framing', () => {
    expect(prompt).toContain('You are NOT an English teacher');
    expect(prompt).toContain('You are the other person in the conversation');
  });

  it('forbids the interview pattern the brief rules out', () => {
    expect(prompt).toContain('Never ask two questions in one reply');
    expect(prompt).toContain('react before you ask');
  });

  describe('turn-taking', () => {
    // The learner is here to practise, so the ball has to come back to them -
    // but only when they were answering. If they asked something, answering and
    // stopping is what lets them lead.
    it('hands the turn back with a question when the learner was answering', () => {
      expect(prompt).toContain('did NOT ask you anything');
      expect(prompt).toContain('end with exactly one question');
      expect(prompt).toContain('Never leave them with nothing to reply to');
    });

    it('just answers, without volleying back, when the learner asked something', () => {
      expect(prompt).toContain('DID ask you something');
      expect(prompt).toContain('Do not bounce a question straight back');
    });

    it('still requires a reaction before the question', () => {
      expect(prompt).toContain('react before you ask');
    });
  });

  it('forbids in-conversation correction', () => {
    expect(prompt).toContain('DO NOT correct their English during the conversation');
  });

  it('forbids the "great job!" register', () => {
    expect(prompt).toContain('DO NOT praise their English');
  });

  it('forbids formatting, since the reply is spoken aloud', () => {
    expect(prompt).toContain('DO NOT use markdown');
  });

  it('includes the chosen persona', () => {
    expect(prompt).toContain('Aya');
  });

  it('includes the topic scenario and talking points', () => {
    expect(prompt).toContain(topic.scenario);
    expect(prompt).toContain(topic.talkingPoints[0] as string);
  });

  it('warns against working through talking points like a checklist', () => {
    expect(prompt).toContain('must not work through them like a checklist');
  });

  it('switches persona when the setting changes', () => {
    const kai = buildConversationSystemPrompt({
      ...baseRequest,
      settings: { ...DEFAULT_SETTINGS, personalityId: 'youthful' },
    });
    expect(kai).toContain('Kai');
    expect(kai).not.toContain('Your name is Aya');
  });

  it('applies difficulty calibration', () => {
    const beginner = buildConversationSystemPrompt({
      ...baseRequest,
      settings: { ...DEFAULT_SETTINGS, difficulty: 'beginner' },
    });
    expect(beginner).toContain('very short, simple sentences');
  });

  it('applies the accent hint', () => {
    const british = buildConversationSystemPrompt({
      ...baseRequest,
      settings: { ...DEFAULT_SETTINGS, accent: 'british' },
    });
    expect(british).toContain('British English spelling');
  });

  it('tells the challenge accent not to flatten itself', () => {
    const challenging = buildConversationSystemPrompt({
      ...baseRequest,
      settings: { ...DEFAULT_SETTINGS, accent: 'challenging' },
    });
    expect(challenging).toContain('Do not flatten it to neutral English');
  });

  it('uses the learner name sparingly rather than constantly', () => {
    const named = buildConversationSystemPrompt({
      ...baseRequest,
      settings: {
        ...DEFAULT_SETTINGS,
        profile: { ...DEFAULT_SETTINGS.profile, name: 'Rashid' },
      },
    });
    expect(named).toContain('Rashid');
    expect(named).toContain('Do not start every reply with it');
  });

  it('omits name guidance entirely when no name is set', () => {
    expect(prompt).not.toContain('The person you are talking to is called');
  });

  it('says nothing about topic changes when none is due', () => {
    expect(prompt).not.toContain('move it somewhere new');
  });

  it('instructs a natural, unannounced transition when one is due', () => {
    const transitioning = buildConversationSystemPrompt({
      ...baseRequest,
      shouldTransitionTopic: true,
      elapsedMinutes: 61,
    });
    expect(transitioning).toContain('move it somewhere new');
    expect(transitioning).toContain('That reminds me of something');
    expect(transitioning).toContain('Never say anything like "we have been talking for an hour"');
    expect(transitioning).toContain('The transition must feel accidental');
  });

  it('withholds the level hint until there is real evidence', () => {
    expect(prompt).not.toContain('level. Pitch your language');

    const experienced = buildConversationSystemPrompt({
      ...baseRequest,
      progress: { ...INITIAL_PROGRESS, evidenceTurns: 8, level: 'B2' },
    });
    expect(experienced).toContain('B2 level');
    expect(experienced).toContain('Never mention their level');
  });
});

describe('buildOpeningLine', () => {
  it('leaves the line alone when there is no name', () => {
    expect(buildOpeningLine('Hey! How are you?', '')).toBe('Hey! How are you?');
  });

  it('slots the name into a natural greeting', () => {
    expect(buildOpeningLine('Hey! How are you?', 'Rashid')).toBe('Hey Rashid! How are you?');
  });

  it('does not force a name where there is no greeting slot', () => {
    const line = 'So. Walk me through what happened.';
    expect(buildOpeningLine(line, 'Rashid')).toBe(line);
  });
});

describe('buildFeedbackPrompt', () => {
  const prompt = buildFeedbackPrompt({
    userText: 'I am working in this company since three years',
    assistantPrompt: 'How long have you been there?',
    settings: DEFAULT_SETTINGS,
    topic,
    wordCount: 9,
  });

  it('includes the learner turn and its context', () => {
    expect(prompt).toContain('I am working in this company since three years');
    expect(prompt).toContain('How long have you been there?');
  });

  it('tells the model not to treat speech-to-text artefacts as mistakes', () => {
    expect(prompt).toContain('NEVER report these as learner mistakes');
  });

  it('tells the model that spoken English is not written English', () => {
    expect(prompt).toContain('Spoken English is not written English');
  });

  it('permits an honest "nothing to fix"', () => {
    expect(prompt).toContain('An honest "nothing to fix" is more useful');
  });

  it('forbids fabricated pronunciation assessment', () => {
    expect(prompt).toContain('You cannot hear audio');
    expect(prompt).toContain('Set pronunciation.available to false');
  });

  it('protects the learner meaning in the polished version', () => {
    expect(prompt).toContain('preserve the speaker original meaning');
    expect(prompt).toContain('Do NOT make a simple correct sentence more elaborate');
  });

  it('reports no speech confidence when none was supplied', () => {
    expect(prompt).toContain('Speech recogniser confidence: not available');
  });

  describe('alternativeAnswers', () => {
    // The whole value of this field is that it answers the question a second
    // way instead of rewording the learner. That instruction lives in prose,
    // where nothing else can catch it going missing.
    it('asks for different answers, not a reworded version of the turn', () => {
      expect(prompt).toContain('DIFFERENT ANSWERS to the question');
      expect(prompt).toContain('NOT the learner turn reworded');
    });

    it('exempts the field from the preserve-meaning rule it would otherwise obey', () => {
      expect(prompt).toContain('It does NOT cover alternativeAnswers');
    });

    it('still pins the language to beginner level whatever the difficulty', () => {
      const advanced = buildFeedbackPrompt({
        userText: 'I am working in this company since three years',
        assistantPrompt: 'How long have you been there?',
        settings: { ...DEFAULT_SETTINGS, difficulty: 'advanced' },
        topic,
        wordCount: 9,
      });
      expect(advanced).toContain('CEFR A1-A2');
      expect(advanced).toContain('NO MATTER what level');
    });

    it('gives the model the question to answer', () => {
      expect(prompt).toContain('How long have you been there?');
    });
  });

  it('passes a supplied confidence through with a caveat', () => {
    const withConfidence = buildFeedbackPrompt({
      userText: 'A spoken answer here',
      assistantPrompt: 'Go on',
      settings: DEFAULT_SETTINGS,
      topic,
      wordCount: 4,
      speechConfidence: 0.82,
      speakingMs: 4000,
    });
    expect(withConfidence).toContain('82%');
    expect(withConfidence).toContain('it is NOT a pronunciation score');
    expect(withConfidence).toContain('words per minute');
  });
});

describe('buildTopicOptimizationPrompt', () => {
  const raw = 'I want to practise talking to a CTO about an outage. Make him challenge me.';
  const prompt = buildTopicOptimizationPrompt({ rawPrompt: raw, settings: DEFAULT_SETTINGS });

  it('includes what the learner actually wrote', () => {
    expect(prompt).toContain(raw);
  });

  it('insists the learner intent survives', () => {
    expect(prompt).toContain('Preserve their intent exactly');
    expect(prompt).toContain('Do not substitute a different scenario');
  });

  it('refuses to soften a deliberately hard scenario', () => {
    expect(prompt).toContain('Do not make the character nicer than requested');
  });
});

describe('buildLevelAssessmentPrompt', () => {
  const analysis: TurnAnalysis = {
    grammar: [],
    vocabulary: [],
    expressions: [],
    fluency: { score: 75, fillerWords: [], repeatedWords: [], observations: [] },
    pronunciation: { available: false, reason: 'typed' },
    confidence: { score: 70, observations: [] },
    polishedResponse: '',
    alternativeAnswers: [],
    levelEstimate: 'B1',
    overallScore: 72,
    headline: '',
  };

  const prompt = buildLevelAssessmentPrompt({
    recentAnalyses: [analysis, analysis],
    previous: INITIAL_PROGRESS,
  });

  it('supplies the accumulated evidence', () => {
    expect(prompt).toContain('Turn 1');
    expect(prompt).toContain('Turn 2');
  });

  it('demands conservatism so the badge does not swing', () => {
    expect(prompt).toContain('Be conservative');
    expect(prompt).toContain('Do not move more than one band');
  });

  it('requires evidence-based rationale rather than praise', () => {
    expect(prompt).toContain('Never vague praise');
  });
});

describe('buildConversationSummaryPrompt', () => {
  const conversation: Conversation = {
    id: 'c1',
    topicId: topic.id,
    topicTitle: topic.title,
    topicEmoji: topic.emoji,
    categoryId: topic.categoryId,
    topicSnapshot: topic,
    config: {
      difficulty: 'intermediate',
      personalityId: 'warm',
      accent: 'british',
      speakingSpeed: 1,
    },
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        text: 'How was your week?',
        createdAt: '2026-01-01T10:00:00Z',
      },
      {
        id: 'm2',
        role: 'user',
        text: 'It was quite busy actually',
        createdAt: '2026-01-01T10:00:30Z',
        inputMode: 'text',
      },
    ],
    startedAt: '2026-01-01T10:00:00Z',
    durationMs: 600_000,
    status: 'completed',
    stats: { userTurns: 1, assistantTurns: 1, userWords: 5, fillerWordCount: 0 },
    schemaVersion: STORAGE_SCHEMA_VERSION,
  };

  const prompt = buildConversationSummaryPrompt({ conversation });

  it('labels the transcript so only learner turns are graded', () => {
    expect(prompt).toContain('LEARNER: It was quite busy actually');
    expect(prompt).toContain('Assess only the LEARNER turns');
  });

  it('states how many turns were actually spoken', () => {
    expect(prompt).toContain('Turns delivered by voice: 0 of 1');
  });

  it('forbids guessing a pronunciation score for a typed conversation', () => {
    expect(prompt).toContain('Do NOT guess a plausible-looking number');
  });

  it('asks for honesty over flattery', () => {
    expect(prompt).toContain('Inflated praise is useless');
  });
});
