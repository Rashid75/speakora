import type { Topic, TopicCategoryId } from '@/types';
import { DAILY_CONVERSATION_TOPICS } from './dailyConversation';
import { EXAMS_AND_INTERVIEWS_TOPICS } from './examsAndInterviews';
import { PROFESSIONAL_ENGLISH_TOPICS } from './professionalEnglish';
import { TECH_TALK_TOPICS } from './techTalk';
import { TRAVEL_AND_LIFE_TOPICS } from './travelAndLife';

export { BROWSABLE_CATEGORIES, TOPIC_CATEGORIES, getCategory } from './categories';

/**
 * The built-in catalogue.
 *
 * A new category is added by creating a file here and appending it to this
 * array - no screen or component needs to change, because the UI renders
 * whatever `groupTopicsByCategory` returns.
 */
export const BUILTIN_TOPICS: readonly Topic[] = [
  ...DAILY_CONVERSATION_TOPICS,
  ...TECH_TALK_TOPICS,
  ...PROFESSIONAL_ENGLISH_TOPICS,
  ...TRAVEL_AND_LIFE_TOPICS,
  ...EXAMS_AND_INTERVIEWS_TOPICS,
];

const BY_ID = new Map<string, Topic>(BUILTIN_TOPICS.map((topic) => [topic.id, topic]));

export const getBuiltinTopic = (id: string): Topic | undefined => BY_ID.get(id);

export const topicsForCategory = (
  categoryId: TopicCategoryId,
  topics: readonly Topic[] = BUILTIN_TOPICS,
): readonly Topic[] => topics.filter((topic) => topic.categoryId === categoryId);
