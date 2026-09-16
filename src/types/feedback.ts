import type { CefrLevel } from './assessment';

export type IssueSeverity = 'minor' | 'moderate' | 'major';

export interface GrammarIssue {
  readonly original: string;
  readonly correction: string;
  /** Why it is wrong, in one learner-friendly sentence. */
  readonly explanation: string;
  readonly severity: IssueSeverity;
}

export interface VocabularySuggestion {
  readonly original: string;
  readonly suggestion: string;
  readonly reason: string;
}

export interface ExpressionSuggestion {
  readonly original: string;
  readonly natural: string;
  readonly reason: string;
}

export interface FluencyAssessment {
  /** 0–100 */
  readonly score: number;
  readonly fillerWords: readonly string[];
  readonly repeatedWords: readonly string[];
  readonly observations: readonly string[];
}

/**
 * Pronunciation is only populated when the speech layer gave us a usable
 * confidence signal. `available: false` is an honest "we cannot measure this",
 * not a zero score. See docs/ARCHITECTURE.md → "Pronunciation honesty".
 */
export type PronunciationAssessment =
  | {
      readonly available: true;
      readonly score: number;
      /** Words the recognizer was least sure about. */
      readonly unclearWords: readonly string[];
      readonly note: string;
    }
  | {
      readonly available: false;
      readonly reason: string;
    };

export interface ConfidenceAssessment {
  readonly score: number;
  readonly observations: readonly string[];
}

/** The validated analysis of one user speaking turn. */
export interface TurnAnalysis {
  readonly grammar: readonly GrammarIssue[];
  readonly vocabulary: readonly VocabularySuggestion[];
  readonly expressions: readonly ExpressionSuggestion[];
  readonly fluency: FluencyAssessment;
  readonly pronunciation: PronunciationAssessment;
  readonly confidence: ConfidenceAssessment;
  /** The learner's sentence rewritten naturally, meaning preserved. */
  readonly polishedResponse: string;
  /**
   * Two *different answers* the learner could have given to the same question -
   * not their own answer reworded. `polishedResponse` fixes what they said;
   * these show what else they could have said, which is the thing that actually
   * unsticks someone who could only think of one reply.
   *
   * Always beginner (A1-A2) English, whatever level they are practising at, so
   * they are sentences the learner could realistically produce today.
   *
   * Empty when the model returned nothing usable - the UI must handle that
   * rather than showing a blank slot.
   */
  readonly alternativeAnswers: readonly string[];
  readonly levelEstimate: CefrLevel;
  /** 0–100 overall quality of this specific turn. */
  readonly overallScore: number;
  /** Empty when the turn was clean enough not to warrant feedback. */
  readonly headline: string;
}

/** End-of-conversation rollup. */
export interface ConversationAssessment {
  readonly level: CefrLevel;
  readonly levelConfidence: number;
  readonly overallScore: number;
  readonly strengths: readonly string[];
  readonly improvements: readonly string[];
  readonly summary: string;
  readonly skills: {
    readonly grammar: number;
    readonly fluency: number;
    readonly vocabulary: number;
    readonly pronunciation: number;
    readonly naturalness: number;
    readonly confidence: number;
  };
}
