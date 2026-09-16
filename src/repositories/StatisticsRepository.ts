import { aggregateStatistics } from '@/services/statistics/aggregate';
import type { StatisticsSnapshot } from '@/types';
import { conversationRepository, type ConversationRepository } from './ConversationRepository';
import { progressRepository, type ProgressRepository } from './ProgressRepository';

/**
 * Statistics are *derived*, never stored.
 *
 * Keeping a materialised statistics blob would mean two sources of truth that
 * drift the first time a conversation is deleted. Aggregation over a couple of
 * hundred local records is sub-millisecond, so we recompute on demand.
 *
 * The interface still exists because a backend version of this would be a
 * single aggregated endpoint rather than a client-side fold.
 */
export interface StatisticsRepository {
  snapshot(): Promise<StatisticsSnapshot>;
}

class LocalStatisticsRepository implements StatisticsRepository {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly progress: ProgressRepository,
  ) {}

  async snapshot(): Promise<StatisticsSnapshot> {
    const [conversations, progress] = await Promise.all([
      this.conversations.all(),
      this.progress.load(),
    ]);
    return aggregateStatistics(conversations, progress);
  }
}

export const statisticsRepository: StatisticsRepository = new LocalStatisticsRepository(
  conversationRepository,
  progressRepository,
);
