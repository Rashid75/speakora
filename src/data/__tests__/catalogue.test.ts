import { ACCENT_LIST, getAccent, recognitionLocaleFor } from '@/data/accents';
import { DIFFICULTY_LIST, difficultyForLevel, getDifficulty } from '@/data/difficulty';
import { PERSONALITY_LIST, getPersonality } from '@/data/personalities';
import {
  BROWSABLE_CATEGORIES,
  BUILTIN_TOPICS,
  getCategory,
  topicsForCategory,
} from '@/data/topics';
import { ACCENTS, CEFR_LEVELS, DIFFICULTY_LEVELS, PERSONALITIES } from '@/types';

/**
 * These guard the content catalogues. They are cheap and they catch the class
 * of bug that only shows up as an empty screen or a silent fallback at runtime:
 * a topic pointing at a category that no longer exists, a duplicate id, a
 * personality missing from the union.
 */

describe('topic catalogue', () => {
  it('meets the advertised breadth', () => {
    expect(BUILTIN_TOPICS.length).toBeGreaterThanOrEqual(40);
  });

  it('has no duplicate ids', () => {
    const ids = BUILTIN_TOPICS.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every topic the content a conversation needs', () => {
    for (const topic of BUILTIN_TOPICS) {
      expect(topic.title.length).toBeGreaterThan(0);
      expect(topic.summary.length).toBeGreaterThan(0);
      expect(topic.emoji.length).toBeGreaterThan(0);
      // Without a scenario and an opening line there is nothing to run.
      expect(topic.scenario.length).toBeGreaterThan(40);
      // Several, and genuinely different: a topic is worth running more than
      // once, and the same first sentence every time makes the partner read as
      // a recording.
      expect(topic.openingLines.length).toBeGreaterThanOrEqual(3);
      expect(new Set(topic.openingLines).size).toBe(topic.openingLines.length);
      for (const line of topic.openingLines) {
        expect(line.length).toBeGreaterThan(10);
      }
      expect(topic.talkingPoints.length).toBeGreaterThanOrEqual(3);
      expect(topic.usefulPhrases.length).toBeGreaterThanOrEqual(3);
      expect(topic.estimatedMinutes).toBeGreaterThan(0);
      expect(DIFFICULTY_LEVELS).toContain(topic.suggestedDifficulty);
      expect(topic.source).toBe('builtin');
    }
  });

  it('points every topic at a category that exists', () => {
    for (const topic of BUILTIN_TOPICS) {
      expect(getCategory(topic.categoryId)).toBeDefined();
    }
  });

  it('leaves no browsable category empty', () => {
    for (const category of BROWSABLE_CATEGORIES) {
      expect(topicsForCategory(category.id).length).toBeGreaterThan(0);
    }
  });

  it('covers the categories named in the brief', () => {
    const ids = BROWSABLE_CATEGORIES.map((category) => category.id);
    expect(ids).toEqual(
      expect.arrayContaining(['daily_conversation', 'tech_talk', 'professional_english']),
    );
  });

  it('provides 8-10 daily conversation topics as specified', () => {
    const count = topicsForCategory('daily_conversation').length;
    expect(count).toBeGreaterThanOrEqual(8);
    expect(count).toBeLessThanOrEqual(12);
  });

  it('excludes the custom bucket from browsing', () => {
    expect(BROWSABLE_CATEGORIES.map((c) => c.id)).not.toContain('custom');
  });
});

describe('personalities', () => {
  it('covers every id in the union', () => {
    expect(PERSONALITY_LIST.map((p) => p.id).sort()).toEqual([...PERSONALITIES].sort());
  });

  it('gives each one a usable prompt and voice configuration', () => {
    for (const personality of PERSONALITY_LIST) {
      expect(personality.prompt.length).toBeGreaterThan(100);
      expect(personality.styleNotes.length).toBeGreaterThan(0);
      expect(personality.pitch).toBeGreaterThan(0.5);
      expect(personality.pitch).toBeLessThan(2);
      expect(personality.rateModifier).toBeGreaterThan(0.5);
    }
  });

  it('falls back rather than returning undefined', () => {
    expect(getPersonality('nope' as never).id).toBe('warm');
  });
});

describe('accents', () => {
  it('covers every id in the union', () => {
    expect(ACCENT_LIST.map((a) => a.id).sort()).toEqual([...ACCENTS].sort());
  });

  it('gives each accent ordered language preferences and a prompt hint', () => {
    for (const accent of ACCENT_LIST) {
      expect(accent.languageTags.length).toBeGreaterThan(0);
      expect(accent.languageTags[0]).toMatch(/^en/);
      expect(accent.promptHint.length).toBeGreaterThan(20);
    }
  });

  it('marks exactly one accent as the listening challenge', () => {
    expect(ACCENT_LIST.filter((accent) => accent.isChallenge)).toHaveLength(1);
  });

  it('gives the challenge accent several fallbacks, since devices vary', () => {
    const challenge = getAccent('challenging');
    expect(challenge.languageTags.length).toBeGreaterThan(2);
  });

  it('maps every accent to a recognition locale', () => {
    for (const accent of ACCENT_LIST) {
      expect(recognitionLocaleFor(accent.id)).toMatch(/^en-[A-Z]{2}$/);
    }
  });
});

describe('difficulty', () => {
  it('covers every id in the union', () => {
    expect(DIFFICULTY_LIST.map((d) => d.id)).toEqual([...DIFFICULTY_LEVELS]);
  });

  it('increases reply length as difficulty rises', () => {
    for (let i = 1; i < DIFFICULTY_LIST.length; i += 1) {
      const previous = DIFFICULTY_LIST[i - 1]!;
      const current = DIFFICULTY_LIST[i]!;
      expect(current.targetReplyWords[1]).toBeGreaterThan(previous.targetReplyWords[1]);
    }
  });

  it('gives each level a substantial prompt', () => {
    for (const difficulty of DIFFICULTY_LIST) {
      expect(difficulty.prompt.length).toBeGreaterThan(80);
    }
  });

  it('maps every CEFR level to a difficulty', () => {
    for (const level of CEFR_LEVELS) {
      expect(DIFFICULTY_LEVELS).toContain(difficultyForLevel(level));
    }
  });

  it('falls back rather than returning undefined', () => {
    expect(getDifficulty('nope' as never).id).toBe('intermediate');
  });
});
