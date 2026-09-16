import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '@/components/ui/Screen';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { getCategory } from '@/data/topics';
import { useAsyncData } from '@/hooks/useAsyncData';
import type { RootStackParamList } from '@/navigation/types';
import { topicRepository } from '@/repositories';
import type { Topic } from '@/types';
import { TopicCard } from '../components/TopicCard';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryTopics'>;

/** Full, scrollable list of one category's topics. */
export function CategoryTopicsScreen({ navigation, route }: Props): React.JSX.Element {
  const { categoryId } = route.params;
  const category = getCategory(categoryId);

  const loadTopics = useCallback(async () => {
    const all = await topicRepository.listAll();
    return all.filter((topic) => topic.categoryId === categoryId);
  }, [categoryId]);

  const topics = useAsyncData(loadTopics);

  const openTopic = useCallback(
    (topic: Topic) => navigation.navigate('ConversationSetup', { topic }),
    [navigation],
  );

  if (topics.state === 'loading' && !topics.data) {
    return (
      <Screen topInset={false}>
        <LoadingState message="Loading topics…" />
      </Screen>
    );
  }

  const list = topics.data ?? [];

  if (list.length === 0) {
    return (
      <Screen topInset={false}>
        <EmptyState
          emoji={category?.emoji ?? '📚'}
          title="Nothing here yet"
          message="This category has no topics at the moment."
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false} topInset={false}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TopicCard topic={item} onPress={openTopic} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 40 },
  gap: { height: 12 },
});
