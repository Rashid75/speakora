import { CONVERSATION_LIMITS } from '@/config/appConfig';
import type { AppFailure, Conversation, ConversationSummary, Result } from '@/types';
import { getStorage, STORAGE_KEYS } from './storage/StorageAdapter';

/**
 * Conversation history.
 *
 * The interface is deliberately API-shaped (list / get / save / remove, all
 * async, all returning `Result`) so the local implementation can be replaced by
 * an HTTP one without a single call site changing. `list` returns lightweight
 * summaries rather than full conversations so the History screen never has to
 * deserialise every transcript just to render a list.
 */
export interface ConversationRepository {
  list(): Promise<readonly ConversationSummary[]>;
  get(id: string): Promise<Result<Conversation, AppFailure>>;
  save(conversation: Conversation): Promise<Result<void, AppFailure>>;
  remove(id: string): Promise<Result<void, AppFailure>>;
  /**
   * The most recent unfinished conversation on a topic, if there is one.
   * `undefined` means there is nothing to pick up and a fresh one should start.
   */
  findResumable(topicId: string): Promise<Conversation | undefined>;
  clear(): Promise<Result<void, AppFailure>>;
  /** Full records, needed by the statistics aggregator. */
  all(): Promise<readonly Conversation[]>;
}

export const toSummary = (conversation: Conversation): ConversationSummary => ({
  id: conversation.id,
  topicTitle: conversation.topicTitle,
  topicEmoji: conversation.topicEmoji,
  startedAt: conversation.startedAt,
  durationMs: conversation.durationMs,
  userTurns: conversation.stats.userTurns,
  status: conversation.status,
  level: conversation.assessment?.level,
  overallScore: conversation.assessment?.overallScore,
  headline: conversation.assessment?.summary,
});

const isConversation = (value: unknown): value is Conversation => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Conversation>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.topicId === 'string' &&
    Array.isArray(candidate.messages) &&
    typeof candidate.startedAt === 'string'
  );
};

class LocalConversationRepository implements ConversationRepository {
  /**
   * Reads are serialised through a single in-flight promise. Without this, the
   * conversation screen autosaving while the History screen loads can produce a
   * lost update, because both would read the same array and write it back.
   */
  private queue: Promise<unknown> = Promise.resolve();

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async readAll(): Promise<Conversation[]> {
    const result = await getStorage().read<unknown>(STORAGE_KEYS.conversations);
    if (!result.ok || !Array.isArray(result.value)) return [];
    return result.value.filter(isConversation);
  }

  private async writeAll(
    conversations: readonly Conversation[],
  ): Promise<Result<void, AppFailure>> {
    // Newest first, pruned to the retention cap.
    const ordered = [...conversations]
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .slice(0, CONVERSATION_LIMITS.maxStoredConversations);
    return getStorage().write(STORAGE_KEYS.conversations, ordered);
  }

  async all(): Promise<readonly Conversation[]> {
    return this.enqueue(() => this.readAll());
  }

  async list(): Promise<readonly ConversationSummary[]> {
    const conversations = await this.enqueue(() => this.readAll());
    return conversations.map(toSummary);
  }

  async get(id: string): Promise<Result<Conversation, AppFailure>> {
    const conversations = await this.enqueue(() => this.readAll());
    const found = conversations.find((conversation) => conversation.id === id);
    if (!found) {
      return { ok: false, error: { code: 'not_found', retryable: false, detail: id } };
    }
    return { ok: true, value: found };
  }

  async save(conversation: Conversation): Promise<Result<void, AppFailure>> {
    return this.enqueue(async () => {
      const conversations = await this.readAll();
      const index = conversations.findIndex((item) => item.id === conversation.id);
      if (index >= 0) conversations[index] = conversation;
      else conversations.unshift(conversation);
      return this.writeAll(conversations);
    });
  }

  async findResumable(topicId: string): Promise<Conversation | undefined> {
    const conversations = await this.enqueue(() => this.readAll());
    // `writeAll` stores newest first, so the first match is the latest.
    // `active` is included as well as `abandoned`: a conversation the app was
    // killed during never got its closing write and is still unfinished.
    return conversations.find(
      (conversation) =>
        conversation.topicId === topicId &&
        (conversation.status === 'abandoned' || conversation.status === 'active'),
    );
  }

  async remove(id: string): Promise<Result<void, AppFailure>> {
    return this.enqueue(async () => {
      const conversations = await this.readAll();
      return this.writeAll(conversations.filter((conversation) => conversation.id !== id));
    });
  }

  async clear(): Promise<Result<void, AppFailure>> {
    return this.enqueue(() => getStorage().remove(STORAGE_KEYS.conversations));
  }
}

export const conversationRepository: ConversationRepository = new LocalConversationRepository();

/** Test seam: build an isolated repository over a test adapter. */
export const createConversationRepository = (): ConversationRepository =>
  new LocalConversationRepository();
