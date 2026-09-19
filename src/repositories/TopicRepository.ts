import { BUILTIN_TOPICS, getBuiltinTopic, openingLinesFor } from '@/data/topics';
import type { AppFailure, Result, Topic } from '@/types';
import { getStorage, STORAGE_KEYS } from './storage/StorageAdapter';

/**
 * Topics = the built-in catalogue (compiled in, read-only) plus the user's own
 * custom topics (on device, mutable).
 *
 * The union is deliberately hidden behind this interface: screens ask for "all
 * topics" and do not care where each one came from. When a backend arrives,
 * `listCustom` becomes a network call and nothing above this layer changes.
 */
export interface TopicRepository {
  listAll(): Promise<readonly Topic[]>;
  listBuiltin(): readonly Topic[];
  listCustom(): Promise<readonly Topic[]>;
  get(id: string): Promise<Topic | undefined>;
  saveCustom(topic: Topic): Promise<Result<void, AppFailure>>;
  removeCustom(id: string): Promise<Result<void, AppFailure>>;
}

const isTopic = (value: unknown): value is Topic => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Topic>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.scenario === 'string' &&
    openingLinesFor(candidate as Topic).length > 0
  );
};

/**
 * Brings a stored topic up to the current shape.
 *
 * Custom topics saved before openings became a list carry a single one;
 * folding it into the list here means nothing downstream has to know that, and
 * the learner's own topics keep the opener they were written with.
 */
const normaliseTopic = (topic: Topic): Topic => ({
  ...topic,
  openingLines: openingLinesFor(topic),
});

class LocalTopicRepository implements TopicRepository {
  listBuiltin(): readonly Topic[] {
    return BUILTIN_TOPICS;
  }

  async listCustom(): Promise<readonly Topic[]> {
    const result = await getStorage().read<unknown>(STORAGE_KEYS.customTopics);
    if (!result.ok || !Array.isArray(result.value)) return [];
    return result.value
      .filter(isTopic)
      .map(normaliseTopic)
      .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));
  }

  async listAll(): Promise<readonly Topic[]> {
    const custom = await this.listCustom();
    return [...custom, ...BUILTIN_TOPICS];
  }

  async get(id: string): Promise<Topic | undefined> {
    const builtin = getBuiltinTopic(id);
    if (builtin) return builtin;
    const custom = await this.listCustom();
    return custom.find((topic) => topic.id === id);
  }

  async saveCustom(topic: Topic): Promise<Result<void, AppFailure>> {
    const custom = await this.listCustom();
    const next = [topic, ...custom.filter((item) => item.id !== topic.id)];
    return getStorage().write(STORAGE_KEYS.customTopics, next);
  }

  async removeCustom(id: string): Promise<Result<void, AppFailure>> {
    const custom = await this.listCustom();
    return getStorage().write(
      STORAGE_KEYS.customTopics,
      custom.filter((topic) => topic.id !== id),
    );
  }
}

export const topicRepository: TopicRepository = new LocalTopicRepository();
