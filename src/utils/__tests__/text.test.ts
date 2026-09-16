import {
  analyzeFillers,
  countWords,
  firstName,
  initialsOf,
  repeatedWords,
  stripMarkdown,
  truncate,
  typeTokenRatio,
} from '@/utils/text';
import { formatDuration, formatTimer, greetingForHour } from '@/utils/time';

describe('countWords', () => {
  it('counts words, not characters or punctuation', () => {
    expect(countWords('I have been working here since 2019.')).toBe(7);
  });

  it('treats contractions as one word', () => {
    expect(countWords("I've been there")).toBe(3);
  });

  it('handles empty and whitespace-only input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('analyzeFillers', () => {
  it('counts unambiguous fillers on a single occurrence', () => {
    const result = analyzeFillers('um so I went to the shop uh yesterday');
    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.found).toContain('um');
  });

  it('does not punish a single correct use of an ambiguous word', () => {
    // "like" here is a normal verb, not a filler.
    expect(analyzeFillers('I like the new design').total).toBe(0);
  });

  it('flags an ambiguous word once it repeats as a habit', () => {
    const result = analyzeFillers('it was like really like good like yeah');
    expect(result.found).toContain('like');
  });

  it('returns zero for clean speech', () => {
    expect(analyzeFillers('I have been working at this company for three years.').total).toBe(0);
  });
});

describe('repeatedWords', () => {
  it('finds content words used repeatedly', () => {
    expect(repeatedWords('project project project deadline', 3)).toContain('project');
  });

  it('ignores common function words', () => {
    expect(repeatedWords('that that that this this this', 3)).toEqual([]);
  });

  it('ignores short words', () => {
    expect(repeatedWords('a a a it it it', 3)).toEqual([]);
  });
});

describe('typeTokenRatio', () => {
  it('is 1 when every word is unique', () => {
    expect(typeTokenRatio('one two three four')).toBe(1);
  });

  it('falls with repetition', () => {
    expect(typeTokenRatio('same same same same')).toBeCloseTo(0.25);
  });

  it('is 0 for empty input', () => {
    expect(typeTokenRatio('')).toBe(0);
  });
});

describe('stripMarkdown', () => {
  it('removes emphasis, headings and list markers', () => {
    expect(stripMarkdown('## Title\n- **bold** and _italic_')).toBe('Title bold and italic');
  });

  it('removes code fences entirely', () => {
    expect(stripMarkdown('before ```js\ncode()\n``` after')).toBe('before after');
  });
});

describe('firstName / initialsOf', () => {
  it('takes only the first name', () => {
    expect(firstName('Rashid Aslam')).toBe('Rashid');
  });

  it('returns empty for a blank name', () => {
    expect(firstName('   ')).toBe('');
    expect(initialsOf('')).toBe('');
  });

  it('builds initials from first and last name', () => {
    expect(initialsOf('Rashid Aslam')).toBe('RA');
  });

  it('handles a single name', () => {
    expect(initialsOf('Rashid')).toBe('R');
  });
});

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('short', 20)).toBe('short');
  });

  it('adds an ellipsis when cutting', () => {
    expect(truncate('a much longer sentence', 10)).toMatch(/…$/);
  });
});

describe('formatTimer', () => {
  it('formats under an hour as m:ss', () => {
    expect(formatTimer(7 * 60_000 + 32_000)).toBe('7:32');
  });

  it('formats over an hour as h:mm:ss', () => {
    expect(formatTimer(3_600_000 + 5 * 60_000 + 3_000)).toBe('1:05:03');
  });

  it('never renders a negative time', () => {
    expect(formatTimer(-500)).toBe('0:00');
  });
});

describe('formatDuration', () => {
  it('uses seconds under a minute', () => {
    expect(formatDuration(45_000)).toBe('45s');
  });

  it('uses minutes and seconds', () => {
    expect(formatDuration(90_000)).toBe('1m 30s');
  });

  it('uses hours past sixty minutes', () => {
    expect(formatDuration(3_900_000)).toBe('1h 05m');
  });
});

describe('greetingForHour', () => {
  it('picks the right window', () => {
    expect(greetingForHour(9)).toBe('Good morning');
    expect(greetingForHour(14)).toBe('Good afternoon');
    expect(greetingForHour(20)).toBe('Good evening');
    expect(greetingForHour(2)).toBe('Good evening');
  });
});
