import { useCallback, useEffect, useRef, useState } from 'react';

import type { LoadState } from '@/types';

interface AsyncDataResult<T> {
  readonly data: T | undefined;
  readonly state: LoadState;
  readonly error: string | undefined;
  reload(): void;
}

/**
 * Loads async data with a proper four-state lifecycle, so no screen has to
 * invent its own `loading` boolean and forget the error case.
 *
 * `loader` must be referentially stable - either a module-level function or one
 * wrapped in `useCallback` by the caller. Taking a dependency array instead
 * would force a non-literal dep list, which React's hook lint rules (rightly)
 * reject because it cannot be verified statically.
 *
 * Note the deliberate absence of a synchronous `setState` in the mount effect:
 * the initial state is already `'loading'`, and every transition happens inside
 * the promise callbacks. Marking "loading" up front is only needed for an
 * explicit `reload()`, which is always triggered from an event handler or a
 * focus callback rather than from render.
 *
 * The generation guard matters on this app's screens: History and Statistics
 * reload on focus, and a user tabbing quickly can start a second load before the
 * first resolves. Without it, the slower response could overwrite the newer one.
 */
export function useAsyncData<T>(loader: () => Promise<T>): AsyncDataResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | undefined>(undefined);

  const generation = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const start = useCallback(() => {
    generation.current += 1;
    const current = generation.current;

    loader().then(
      (value) => {
        if (!isMounted.current || generation.current !== current) return;
        setData(value);
        setError(undefined);
        setState('ready');
      },
      (cause: unknown) => {
        if (!isMounted.current || generation.current !== current) return;
        setError(cause instanceof Error ? cause.message : 'Unknown error');
        setState('error');
      },
    );
  }, [loader]);

  useEffect(() => {
    start();
  }, [start]);

  const reload = useCallback(() => {
    setState('loading');
    start();
  }, [start]);

  return { data, state, error, reload };
}
