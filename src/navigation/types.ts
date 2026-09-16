import type { NavigatorScreenParams } from '@react-navigation/native';

import type { Topic, TopicCategoryId } from '@/types';

/**
 * Navigation types.
 *
 * Declaring these centrally (and registering `RootParamList` below) is what
 * gives `navigation.navigate(...)` full autocomplete and compile-time checking
 * of route params across the whole app.
 */

export type TabParamList = {
  Home: undefined;
  Speak: undefined;
  History: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  CategoryTopics: { categoryId: TopicCategoryId };
  CustomTopic: undefined;
  ConversationSetup: { topic: Topic };
  /**
   * Either start a fresh conversation on a topic, or pick an unfinished one
   * back up by id - the stored record carries its own topic snapshot.
   */
  Conversation: { topic: Topic } | { resumeId: string };
  ConversationDetail: { conversationId: string; fromConversation: boolean };
  ProfileSettings: undefined;
  PersonalitySettings: undefined;
  AccentSettings: undefined;
  SpeedSettings: undefined;
  DifficultySettings: undefined;
  ThemeSettings: undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
