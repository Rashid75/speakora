import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLogger } from '@/services/logging/logger';
import { failure, type AppFailure, type Result } from '@/types';
import { describeError } from '@/utils/errors';

const log = createLogger('storage');

/**
 * The only module in the app that touches AsyncStorage.
 *
 * Repositories depend on this interface rather than the library, which is what
 * makes the "swap local storage for a REST API later" requirement a real
 * possibility instead of a comment: a `HttpStorageAdapter` implementing the
 * same three methods drops straight in.
 *
 * AsyncStorage (rather than MMKV or SQLite) because the data is small, the
 * access pattern is read-all-then-write-all, and it needs no native module
 * beyond the one Expo already supports. If conversation volume ever makes that
 * untrue, only this file changes.
 */
export interface StorageAdapter {
  read<T>(key: string): Promise<Result<T | undefined, AppFailure>>;
  write<T>(key: string, value: T): Promise<Result<void, AppFailure>>;
  remove(key: string): Promise<Result<void, AppFailure>>;
}

export const STORAGE_KEYS = {
  settings: 'speakora:settings:v1',
  progress: 'speakora:progress:v1',
  conversations: 'speakora:conversations:v1',
  customTopics: 'speakora:custom-topics:v1',
  levelEvidence: 'speakora:level-evidence:v1',
  dictionary: 'speakora:dictionary:v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

class AsyncStorageAdapter implements StorageAdapter {
  async read<T>(key: string): Promise<Result<T | undefined, AppFailure>> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return { ok: true, value: undefined };
      return { ok: true, value: JSON.parse(raw) as T };
    } catch (error) {
      // A corrupt value must not brick the app on every launch, so we drop it
      // and carry on with defaults.
      log.error('Read failed; discarding value', { key, error: describeError(error) });
      void AsyncStorage.removeItem(key).catch(() => undefined);
      return { ok: true, value: undefined };
    }
  }

  async write<T>(key: string, value: T): Promise<Result<void, AppFailure>> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return { ok: true, value: undefined };
    } catch (error) {
      log.error('Write failed', { key, error: describeError(error) });
      return { ok: false, error: failure('storage_failed', describeError(error)) };
    }
  }

  async remove(key: string): Promise<Result<void, AppFailure>> {
    try {
      await AsyncStorage.removeItem(key);
      return { ok: true, value: undefined };
    } catch (error) {
      log.error('Remove failed', { key, error: describeError(error) });
      return { ok: false, error: failure('storage_failed', describeError(error)) };
    }
  }
}

/** In-memory adapter used by tests and as a fallback if storage is unusable. */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly map = new Map<string, string>();

  async read<T>(key: string): Promise<Result<T | undefined, AppFailure>> {
    const raw = this.map.get(key);
    if (raw === undefined) return { ok: true, value: undefined };
    try {
      return { ok: true, value: JSON.parse(raw) as T };
    } catch {
      return { ok: true, value: undefined };
    }
  }

  async write<T>(key: string, value: T): Promise<Result<void, AppFailure>> {
    this.map.set(key, JSON.stringify(value));
    return { ok: true, value: undefined };
  }

  async remove(key: string): Promise<Result<void, AppFailure>> {
    this.map.delete(key);
    return { ok: true, value: undefined };
  }
}

let adapter: StorageAdapter = new AsyncStorageAdapter();

export const getStorage = (): StorageAdapter => adapter;

/** Test seam. Production code never calls this. */
export const setStorageAdapter = (next: StorageAdapter): void => {
  adapter = next;
};
