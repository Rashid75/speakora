import { DEFAULT_SETTINGS, STORAGE_SCHEMA_VERSION } from '@/config/appConfig';
import { BUILTIN_TOPICS } from '@/data/topics';
import {
  MemoryStorageAdapter,
  createConversationRepository,
  normaliseProgress,
  normaliseSettings,
  setStorageAdapter,
  settingsRepository,
  topicRepository,
} from '@/repositories';
import type { Conversation, Topic } from '@/types';

const topic = BUILTIN_TOPICS[0] as Topic;

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
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
  messages: [],
  startedAt: '2026-01-01T10:00:00.000Z',
  durationMs: 60_000,
  status: 'completed',
  stats: { userTurns: 2, assistantTurns: 2, userWords: 40, fillerWordCount: 1 },
  schemaVersion: STORAGE_SCHEMA_VERSION,
  ...overrides,
});

beforeEach(() => {
  setStorageAdapter(new MemoryStorageAdapter());
});

describe('normaliseSettings', () => {
  it('returns defaults for a non-object', () => {
    expect(normaliseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normaliseSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
  });

  it('replaces an unknown theme with the default', () => {
    const result = normaliseSettings({ ...DEFAULT_SETTINGS, themeId: 'neon-vaporwave' });
    expect(result.themeId).toBe(DEFAULT_SETTINGS.themeId);
  });

  it('replaces an unsupported speaking speed', () => {
    const result = normaliseSettings({ ...DEFAULT_SETTINGS, speakingSpeed: 3.5 });
    expect(result.speakingSpeed).toBe(DEFAULT_SETTINGS.speakingSpeed);
  });

  it('keeps a valid speaking speed', () => {
    const result = normaliseSettings({ ...DEFAULT_SETTINGS, speakingSpeed: 1.5 });
    expect(result.speakingSpeed).toBe(1.5);
  });

  it('clamps the topic rotation interval into a sane range', () => {
    expect(normaliseSettings({ topicRotationMinutes: 0 }).topicRotationMinutes).toBe(5);
    expect(normaliseSettings({ topicRotationMinutes: 9999 }).topicRotationMinutes).toBe(180);
  });

  it('rejects an invalid self-reported level', () => {
    const result = normaliseSettings({ profile: { selfReportedLevel: 'Z9' } });
    expect(result.profile.selfReportedLevel).toBe('unknown');
  });

  it('truncates an absurdly long name', () => {
    const result = normaliseSettings({ profile: { name: 'x'.repeat(500) } });
    expect(result.profile.name.length).toBeLessThanOrEqual(40);
  });

  it('always stamps the current schema version', () => {
    const result = normaliseSettings({ ...DEFAULT_SETTINGS, schemaVersion: 0 });
    expect(result.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
  });
});

describe('normaliseProgress', () => {
  it('falls back to the initial state for garbage', () => {
    expect(normaliseProgress(undefined).level).toBe('A2');
  });

  it('clamps confidence into 0-1', () => {
    expect(normaliseProgress({ confidence: 5 }).confidence).toBe(1);
    expect(normaliseProgress({ confidence: -1 }).confidence).toBe(0);
  });

  it('clamps the level score into the CEFR range', () => {
    expect(normaliseProgress({ levelScore: 99 }).levelScore).toBe(5);
  });

  it('drops non-string rationale entries', () => {
    const result = normaliseProgress({ rationale: ['good', 42, null] });
    expect(result.rationale).toEqual(['good']);
  });
});

describe('SettingsRepository', () => {
  it('returns defaults when nothing is stored', async () => {
    await expect(settingsRepository.load()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const next = { ...DEFAULT_SETTINGS, themeId: 'ocean' as const, speakingSpeed: 1.25 as const };
    await settingsRepository.save(next);
    const loaded = await settingsRepository.load();
    expect(loaded.themeId).toBe('ocean');
    expect(loaded.speakingSpeed).toBe(1.25);
  });

  it('sanitises corrupt stored settings instead of crashing', async () => {
    const storage = new MemoryStorageAdapter();
    setStorageAdapter(storage);
    await storage.write('speakora:settings:v1', { themeId: 'does-not-exist' });
    const loaded = await settingsRepository.load();
    expect(loaded.themeId).toBe(DEFAULT_SETTINGS.themeId);
  });
});

describe('ConversationRepository', () => {
  it('starts empty', async () => {
    const repo = createConversationRepository();
    await expect(repo.list()).resolves.toEqual([]);
  });

  it('saves and retrieves a conversation', async () => {
    const repo = createConversationRepository();
    await repo.save(conversation());
    const found = await repo.get('conv-1');
    expect(found.ok).toBe(true);
  });

  describe('findResumable', () => {
    it('finds nothing when the only conversation on the topic is finished', async () => {
      const repo = createConversationRepository();
      await repo.save(conversation({ status: 'completed' }));
      await expect(repo.findResumable(topic.id)).resolves.toBeUndefined();
    });

    it('picks up an abandoned conversation on the same topic', async () => {
      const repo = createConversationRepository();
      await repo.save(conversation({ id: 'conv-open', status: 'abandoned' }));
      const found = await repo.findResumable(topic.id);
      expect(found?.id).toBe('conv-open');
    });

    it('treats an active conversation as resumable, not lost', async () => {
      const repo = createConversationRepository();
      await repo.save(conversation({ id: 'conv-active', status: 'active' }));
      const found = await repo.findResumable(topic.id);
      expect(found?.id).toBe('conv-active');
    });

    it('returns the most recent when a topic has more than one open', async () => {
      const repo = createConversationRepository();
      await repo.save(
        conversation({
          id: 'conv-older',
          status: 'abandoned',
          startedAt: '2026-01-01T09:00:00.000Z',
        }),
      );
      await repo.save(
        conversation({
          id: 'conv-newer',
          status: 'abandoned',
          startedAt: '2026-01-02T09:00:00.000Z',
        }),
      );
      const found = await repo.findResumable(topic.id);
      expect(found?.id).toBe('conv-newer');
    });

    it('does not cross topics', async () => {
      const repo = createConversationRepository();
      await repo.save(conversation({ id: 'conv-other', status: 'abandoned', topicId: 'other' }));
      await expect(repo.findResumable(topic.id)).resolves.toBeUndefined();
    });
  });

  it('returns a typed not_found rather than throwing', async () => {
    const repo = createConversationRepository();
    const result = await repo.get('missing');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
  });

  it('updates in place rather than duplicating', async () => {
    const repo = createConversationRepository();
    await repo.save(conversation());
    await repo.save(conversation({ durationMs: 120_000 }));
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0]?.durationMs).toBe(120_000);
  });

  it('lists newest first', async () => {
    const repo = createConversationRepository();
    await repo.save(conversation({ id: 'old', startedAt: '2026-01-01T10:00:00.000Z' }));
    await repo.save(conversation({ id: 'new', startedAt: '2026-06-01T10:00:00.000Z' }));
    const all = await repo.list();
    expect(all[0]?.id).toBe('new');
  });

  it('removes a conversation', async () => {
    const repo = createConversationRepository();
    await repo.save(conversation());
    await repo.remove('conv-1');
    await expect(repo.list()).resolves.toEqual([]);
  });

  it('serialises concurrent saves without losing one', async () => {
    const repo = createConversationRepository();
    await Promise.all([
      repo.save(conversation({ id: 'a' })),
      repo.save(conversation({ id: 'b' })),
      repo.save(conversation({ id: 'c' })),
    ]);
    const all = await repo.list();
    expect(all.map((item) => item.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('ignores malformed stored records', async () => {
    const storage = new MemoryStorageAdapter();
    setStorageAdapter(storage);
    await storage.write('speakora:conversations:v1', [{ nope: true }, conversation()]);
    const repo = createConversationRepository();
    const all = await repo.list();
    expect(all).toHaveLength(1);
  });
});

describe('TopicRepository', () => {
  it('exposes the built-in catalogue', () => {
    expect(topicRepository.listBuiltin().length).toBeGreaterThan(30);
  });

  it('finds a built-in topic by id', async () => {
    await expect(topicRepository.get(topic.id)).resolves.toBeDefined();
  });

  it('returns undefined for an unknown id', async () => {
    await expect(topicRepository.get('nope')).resolves.toBeUndefined();
  });

  it('saves and lists a custom topic ahead of built-ins', async () => {
    const custom: Topic = {
      ...topic,
      id: 'custom-1',
      categoryId: 'custom',
      source: 'custom',
      createdAt: new Date().toISOString(),
    };
    await topicRepository.saveCustom(custom);

    const all = await topicRepository.listAll();
    expect(all[0]?.id).toBe('custom-1');
    await expect(topicRepository.get('custom-1')).resolves.toBeDefined();
  });

  it('removes a custom topic', async () => {
    const custom: Topic = { ...topic, id: 'custom-1', source: 'custom' };
    await topicRepository.saveCustom(custom);
    await topicRepository.removeCustom('custom-1');
    await expect(topicRepository.listCustom()).resolves.toEqual([]);
  });
});
