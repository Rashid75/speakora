import { cefrFromIndex, cefrIndex, type TurnAnalysis } from '@/types';
import {
  INITIAL_PROGRESS,
  alphaForTurn,
  applyAssessmentToProgress,
  applyTurnToProgress,
  computeConfidence,
  skillsFromAnalysis,
} from '@/utils/cefr';

const analysis = (overrides: Partial<TurnAnalysis> = {}): TurnAnalysis => ({
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
  ...overrides,
});

describe('cefrIndex / cefrFromIndex', () => {
  it('round-trips every level', () => {
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const) {
      expect(cefrFromIndex(cefrIndex(level))).toBe(level);
    }
  });

  it('clamps out-of-range indices instead of returning undefined', () => {
    expect(cefrFromIndex(-5)).toBe('A1');
    expect(cefrFromIndex(99)).toBe('C2');
  });
});

describe('alphaForTurn', () => {
  it('decays as evidence accumulates', () => {
    expect(alphaForTurn(0)).toBeGreaterThan(alphaForTurn(10));
    expect(alphaForTurn(10)).toBeGreaterThan(alphaForTurn(50));
  });

  it('never drops below the floor, so the estimate can still move', () => {
    expect(alphaForTurn(10_000)).toBeGreaterThanOrEqual(0.06);
  });
});

describe('applyTurnToProgress', () => {
  it('seeds directly from the first turn rather than averaging against a default', () => {
    const result = applyTurnToProgress(INITIAL_PROGRESS, analysis({ levelEstimate: 'C1' }), []);
    expect(result.state.level).toBe('C1');
    expect(result.state.evidenceTurns).toBe(1);
  });

  it('does not let a single outlier turn move an established level', () => {
    // Build up a stable B1 history.
    let state = INITIAL_PROGRESS;
    let levels: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      const result = applyTurnToProgress(state, analysis({ levelEstimate: 'B1' }), levels);
      state = result.state;
      levels = [...levels, cefrIndex('B1')];
    }
    expect(state.level).toBe('B1');

    // One wildly different turn must not jump the badge.
    const outlier = applyTurnToProgress(state, analysis({ levelEstimate: 'C2' }), levels);
    expect(outlier.state.level).toBe('B1');
    expect(outlier.levelChanged).toBe(false);
  });

  it('does move the level when evidence is consistent', () => {
    let state = applyTurnToProgress(INITIAL_PROGRESS, analysis({ levelEstimate: 'B1' }), []).state;
    let levels = [cefrIndex('B1')];

    for (let i = 0; i < 25; i += 1) {
      const result = applyTurnToProgress(state, analysis({ levelEstimate: 'C1' }), levels);
      state = result.state;
      levels = [...levels, cefrIndex('C1')];
    }
    expect(['B2', 'C1']).toContain(state.level);
  });
});

describe('computeConfidence', () => {
  it('is zero with no evidence', () => {
    expect(computeConfidence(0, [])).toBe(0);
  });

  it('rises with consistent evidence', () => {
    const consistent = computeConfidence(14, new Array(14).fill(cefrIndex('B2')));
    const sparse = computeConfidence(2, [cefrIndex('B2'), cefrIndex('B2')]);
    expect(consistent).toBeGreaterThan(sparse);
  });

  it('stays low when turns scatter across bands', () => {
    const scattered = computeConfidence(14, [0, 5, 1, 4, 0, 5, 2, 3, 0, 5, 1, 4, 2, 3]);
    const consistent = computeConfidence(14, new Array(14).fill(3));
    expect(scattered).toBeLessThan(consistent);
  });

  it('never exceeds 1', () => {
    expect(computeConfidence(1000, new Array(20).fill(3))).toBeLessThanOrEqual(1);
  });
});

describe('skillsFromAnalysis', () => {
  it('omits pronunciation when it was not measured', () => {
    const skills = skillsFromAnalysis(analysis());
    expect(skills.pronunciation).toBeUndefined();
  });

  it('includes pronunciation when the speech layer measured it', () => {
    const skills = skillsFromAnalysis(
      analysis({
        pronunciation: { available: true, score: 81, unclearWords: [], note: 'n/a' },
      }),
    );
    expect(skills.pronunciation).toBe(81);
  });

  it('penalises grammar by severity', () => {
    const minor = skillsFromAnalysis(
      analysis({
        grammar: [{ original: 'a', correction: 'b', explanation: '', severity: 'minor' }],
      }),
    );
    const major = skillsFromAnalysis(
      analysis({
        grammar: [{ original: 'a', correction: 'b', explanation: '', severity: 'major' }],
      }),
    );
    expect(major.grammar).toBeLessThan(minor.grammar ?? 100);
  });

  it('clamps to 0-100 even with many issues', () => {
    const skills = skillsFromAnalysis(
      analysis({
        grammar: new Array(3).fill({
          original: 'a',
          correction: 'b',
          explanation: '',
          severity: 'major' as const,
        }),
      }),
    );
    expect(skills.grammar).toBeGreaterThanOrEqual(0);
  });
});

describe('applyAssessmentToProgress', () => {
  it('ignores an unmeasured pronunciation score', () => {
    const state = applyAssessmentToProgress(
      INITIAL_PROGRESS,
      'B2',
      ['Good range'],
      {
        grammar: 80,
        fluency: 75,
        vocabulary: 78,
        pronunciation: 90,
        naturalness: 70,
        confidence: 82,
      },
      false,
    );
    expect(state.skills.pronunciation).toBe(0);
    expect(state.skills.grammar).toBeGreaterThan(0);
  });

  it('records pronunciation when it was measured', () => {
    const state = applyAssessmentToProgress(
      INITIAL_PROGRESS,
      'B2',
      [],
      {
        grammar: 80,
        fluency: 75,
        vocabulary: 78,
        pronunciation: 90,
        naturalness: 70,
        confidence: 82,
      },
      true,
    );
    expect(state.skills.pronunciation).toBe(90);
  });
});
