import { useCallback, useEffect, useRef, useState } from 'react';

import { topicRepository } from '@/repositories';
import { getAIProvider } from '@/services/ai';
import { isOnline } from '@/services/network/NetworkService';
import {
  failure,
  type AppFailure,
  type AppSettings,
  type OptimizedTopicDraft,
  type Topic,
} from '@/types';
import { createId } from '@/utils/id';
import { nowIso } from '@/utils/time';

export type BuilderStage = 'editing' | 'refining' | 'optimizing' | 'review' | 'saving';

export interface CustomTopicBuilder {
  readonly stage: BuilderStage;
  readonly draft: OptimizedTopicDraft | undefined;
  readonly error: AppFailure | undefined;
  optimize(rawPrompt: string, settings: AppSettings): void;
  /**
   * Rewrites the learner's rough description into a fuller one and hands it
   * back for them to edit. Resolves `undefined` when nothing usable came back,
   * in which case `error` explains why.
   */
  refine(rawPrompt: string, settings: AppSettings): Promise<string | undefined>;
  /** Discards the draft and returns to editing so the user can rewrite. */
  backToEditing(): void;
  save(rawPrompt: string): Promise<Topic | undefined>;
  cancel(): void;
}

const MIN_PROMPT_LENGTH = 20;

/**
 * Owns the custom-topic flow: raw text -> AI-structured scenario -> saved topic.
 *
 * The learner always sees the optimised scenario before it is used, and can go
 * back and rewrite. We never silently replace what they asked for.
 */
export function useCustomTopicBuilder(): CustomTopicBuilder {
  const [stage, setStage] = useState<BuilderStage>('editing');
  const [draft, setDraft] = useState<OptimizedTopicDraft | undefined>(undefined);
  const [error, setError] = useState<AppFailure | undefined>(undefined);

  const abortRef = useRef<AbortController | undefined>(undefined);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const optimize = useCallback((rawPrompt: string, settings: AppSettings) => {
    const trimmed = rawPrompt.trim();

    if (trimmed.length < MIN_PROMPT_LENGTH) {
      setError(failure('cancelled', 'Prompt too short', false));
      return;
    }
    if (!isOnline()) {
      setError(failure('offline', 'Offline while optimising topic'));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStage('optimizing');
    setError(undefined);

    void getAIProvider()
      .optimizeTopic({ rawPrompt: trimmed, settings }, controller.signal)
      .then((result) => {
        if (!isMounted.current || controller.signal.aborted) return;
        if (!result.ok) {
          setError(result.error);
          setStage('editing');
          return;
        }
        setDraft(result.value);
        setStage('review');
      });
  }, []);

  /**
   * The same model pass as `optimize`, but it stops one step earlier: instead
   * of moving on to the structured review, it returns just the scenario prose
   * so the learner can read it, change it, and only then build from it.
   *
   * Deliberately not applied on their behalf - the screen writes it into the
   * field and offers an undo, because a rewrite that silently replaces what
   * someone typed is the fastest way to lose the detail they cared about.
   */
  const refine = useCallback(
    async (rawPrompt: string, settings: AppSettings): Promise<string | undefined> => {
      const trimmed = rawPrompt.trim();

      if (trimmed.length < MIN_PROMPT_LENGTH) {
        setError(failure('cancelled', 'Prompt too short', false));
        return undefined;
      }
      if (!isOnline()) {
        setError(failure('offline', 'Offline while improving description'));
        return undefined;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStage('refining');
      setError(undefined);

      const result = await getAIProvider().optimizeTopic(
        { rawPrompt: trimmed, settings },
        controller.signal,
      );

      if (!isMounted.current || controller.signal.aborted) return undefined;
      setStage('editing');

      if (!result.ok) {
        setError(result.error);
        return undefined;
      }

      const scenario = result.value.scenario.trim();
      if (!scenario) {
        setError(failure('ai_invalid_response', 'Empty scenario returned', true));
        return undefined;
      }
      return scenario;
    },
    [],
  );

  const backToEditing = useCallback(() => {
    abortRef.current?.abort();
    setDraft(undefined);
    setError(undefined);
    setStage('editing');
  }, []);

  const save = useCallback(
    async (rawPrompt: string): Promise<Topic | undefined> => {
      if (!draft) return undefined;
      setStage('saving');

      const topic: Topic = {
        id: createId('custom'),
        categoryId: 'custom',
        title: draft.title,
        summary: draft.summary,
        emoji: draft.emoji,
        suggestedDifficulty: draft.suggestedDifficulty,
        scenario: draft.scenario,
        talkingPoints: draft.talkingPoints,
        usefulPhrases: draft.usefulPhrases,
        openingLine: draft.openingLine,
        source: 'custom',
        createdAt: nowIso(),
        originalPrompt: rawPrompt.trim(),
        estimatedMinutes: 15,
      };

      const result = await topicRepository.saveCustom(topic);
      if (!isMounted.current) return topic;

      if (!result.ok) {
        setError(result.error);
        setStage('review');
        return undefined;
      }
      return topic;
    },
    [draft],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStage('editing');
  }, []);

  return { stage, draft, error, optimize, refine, backToEditing, save, cancel };
}

export { MIN_PROMPT_LENGTH };
