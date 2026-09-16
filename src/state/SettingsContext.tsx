import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_SETTINGS } from '@/config/appConfig';
import { settingsRepository } from '@/repositories';
import { createLogger } from '@/services/logging/logger';
import type { AppSettings } from '@/types';

const log = createLogger('settings');

interface SettingsContextValue {
  readonly settings: AppSettings;
  /** False until the stored settings have been read, so we never flash a theme. */
  readonly isHydrated: boolean;
  update(patch: Partial<AppSettings>): void;
  updateProfile(patch: Partial<AppSettings['profile']>): void;
  reset(): void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

/**
 * Settings are the one piece of genuinely global state - the theme, the AI
 * voice and the difficulty are read by nearly every screen. Everything else
 * (conversation state, history, statistics) stays local to its feature, which
 * is why there is no app-wide store in this project.
 *
 * Writes are optimistic and debounced: the UI updates immediately, and the
 * repository write is coalesced so dragging a speed slider does not produce
 * twenty storage writes.
 */
export function SettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<AppSettings | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void settingsRepository.load().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(() => {
    const next = pending.current;
    if (!next) return;
    pending.current = undefined;
    void settingsRepository.save(next).then((result) => {
      if (!result.ok) log.error('Failed to persist settings', { code: result.error.code });
    });
  }, []);

  const scheduleSave = useCallback(
    (next: AppSettings) => {
      pending.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  // Never lose a pending write on unmount.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flush();
    },
    [flush],
  );

  const update = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings((current) => {
        const next = { ...current, ...patch };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const updateProfile = useCallback(
    (patch: Partial<AppSettings['profile']>) => {
      setSettings((current) => {
        const next = { ...current, profile: { ...current.profile, ...patch } };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    scheduleSave(DEFAULT_SETTINGS);
  }, [scheduleSave]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, isHydrated, update, updateProfile, reset }),
    [settings, isHydrated, update, updateProfile, reset],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return context;
}
