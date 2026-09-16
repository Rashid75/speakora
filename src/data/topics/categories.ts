import type { TopicCategory, TopicCategoryId } from '@/types';

/**
 * Category metadata only - topics live in sibling files and reference a
 * category by id. Adding a category is a two-line change here plus a new
 * topic file; no screen knows any category by name.
 */
export const TOPIC_CATEGORIES: readonly TopicCategory[] = [
  {
    id: 'daily_conversation',
    title: 'Daily Conversation',
    subtitle: 'The everyday small talk that fluency is actually made of',
    emoji: '☕',
    accent: 'primary',
    order: 1,
  },
  {
    id: 'tech_talk',
    title: 'Tech Talk',
    subtitle: 'Standups, reviews, system design and the rest of engineering life',
    emoji: '💻',
    accent: 'info',
    order: 2,
  },
  {
    id: 'professional_english',
    title: 'Professional English',
    subtitle: 'Meetings, opinions, feedback and difficult conversations at work',
    emoji: '💼',
    accent: 'success',
    order: 3,
  },
  {
    id: 'travel_and_life',
    title: 'Travel & Real Life',
    subtitle: 'Situations where you have to speak whether you feel ready or not',
    emoji: '🧳',
    accent: 'warning',
    order: 4,
  },
  {
    id: 'exams_and_interviews',
    title: 'Exams & Interviews',
    subtitle: 'High-pressure speaking with a clear format to practise',
    emoji: '🎯',
    accent: 'danger',
    order: 5,
  },
  {
    id: 'custom',
    title: 'Your Topics',
    subtitle: 'Scenarios you wrote yourself',
    emoji: '✨',
    accent: 'neutral',
    order: 6,
  },
];

const BY_ID = new Map<TopicCategoryId, TopicCategory>(TOPIC_CATEGORIES.map((c) => [c.id, c]));

export const getCategory = (id: TopicCategoryId): TopicCategory | undefined => BY_ID.get(id);

/** Categories shown on Home, in display order, excluding the custom bucket. */
export const BROWSABLE_CATEGORIES: readonly TopicCategory[] = TOPIC_CATEGORIES.filter(
  (c) => c.id !== 'custom',
).sort((a, b) => a.order - b.order);
