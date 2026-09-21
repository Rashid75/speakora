import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '@/components/ui/AppText';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/StateViews';
import { getDifficulty } from '@/data/difficulty';
import { BROWSABLE_CATEGORIES } from '@/data/topics';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { RootStackParamList } from '@/navigation/types';
import {
  conversationRepository,
  dictionaryRepository,
  progressRepository,
  topicRepository,
} from '@/repositories';
import { useSettings } from '@/state/SettingsContext';
import { useTheme } from '@/theme';
import type { ConversationSummary, ProgressState, Topic, TopicCategoryId } from '@/types';
import { firstName } from '@/utils/text';
import { formatDuration, greetingForHour } from '@/utils/time';
import { TopicCard } from '../components/TopicCard';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface HomeData {
  readonly all: readonly Topic[];
  readonly custom: readonly Topic[];
  readonly progress: ProgressState;
  readonly recent: readonly ConversationSummary[];
  readonly savedWords: number;
}

const loadHome = async (): Promise<HomeData> => {
  const [all, custom, progress, recent, words] = await Promise.all([
    topicRepository.listAll(),
    topicRepository.listCustom(),
    progressRepository.load(),
    conversationRepository.list(),
    dictionaryRepository.list(),
  ]);
  return { all, custom, progress, recent, savedWords: words.length };
};

/** Category icons from the handoff. */
const CATEGORY_ICONS: Readonly<Record<TopicCategoryId, IconName>> = {
  tech_talk: 'code',
  daily_conversation: 'chat',
  professional_english: 'user',
  travel_and_life: 'sparkle',
  exams_and_interviews: 'bars',
  custom: 'plus',
};

/**
 * Home (artboard 1b): greeting, an unfinished-conversation card, then the
 * catalogue. Tech talk scrolls horizontally; everything else is a two-up grid.
 *
 * Entirely data-driven - it renders whatever `BROWSABLE_CATEGORIES` and the
 * topic repository return, so adding a category requires no change here.
 */
export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useTheme();
  const { settings } = useSettings();
  const { isOnline } = useNetworkStatus();

  const home = useAsyncData(loadHome);
  const reload = home.reload;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const openTopic = useCallback(
    (topic: Topic) => navigation.navigate('ConversationSetup', { topic }),
    [navigation],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, Topic[]>();
    for (const topic of home.data?.all ?? []) {
      const list = map.get(topic.categoryId) ?? [];
      list.push(topic);
      map.set(topic.categoryId, list);
    }
    return map;
  }, [home.data]);

  const greeting = useMemo(() => {
    const name = firstName(settings.profile.name);
    const base = greetingForHour(new Date().getHours()).replace('Good ', '');
    const capitalised = base.charAt(0).toUpperCase() + base.slice(1);
    return name ? `${capitalised}, ${name}` : capitalised;
  }, [settings.profile.name]);

  if (home.state === 'loading' && !home.data) {
    return (
      <Screen>
        <LoadingState message="Loading your topics…" />
      </Screen>
    );
  }

  const custom = home.data?.custom ?? [];
  const savedWords = home.data?.savedWords ?? 0;
  const unfinished = home.data?.recent.find((item) => item.status === 'abandoned');

  return (
    <Screen padded={false} bottomInset={8}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={home.state === 'loading'}
            onRefresh={reload}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="subhead" color="neutral">
              {greeting}
            </AppText>
            <AppText variant="title2" accessibilityRole="header">
              What do you feel like talking about?
            </AppText>
          </View>
          <Pressable
            onPress={() => navigation.navigate('ProfileSettings')}
            accessibilityRole="button"
            accessibilityLabel="Your profile"
          >
            <UserAvatar profile={settings.profile} size={44} />
          </Pressable>
        </View>

        {!isOnline ? (
          <View style={styles.padded}>
            <View
              style={[
                styles.offline,
                { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
              ]}
            >
              <AppText variant="subhead" style={{ color: theme.colors.warningText }}>
                You are offline — conversations need a connection.
              </AppText>
            </View>
          </View>
        ) : null}

        {unfinished ? (
          <View style={styles.padded}>
            <View
              style={[
                styles.resume,
                { backgroundColor: theme.colors.ink, borderRadius: theme.radius.lg },
              ]}
            >
              <View style={styles.resumeStatus}>
                <View style={[styles.dot, { backgroundColor: '#69F7C3' }]} />
                <AppText variant="overline" style={{ color: '#69F7C3' }}>
                  Still going
                </AppText>
              </View>
              <View style={styles.resumeRow}>
                <View style={styles.resumeText}>
                  <AppText variant="headline" color="onInk" numberOfLines={1}>
                    {unfinished.topicTitle}
                  </AppText>
                  <AppText variant="callout" color="onInkMuted">
                    {formatDuration(unfinished.durationMs)} in · {unfinished.userTurns} turns
                  </AppText>
                </View>
                <Button
                  label="Continue"
                  size="sm"
                  accessibilityHint="Reopens this conversation where you left off"
                  onPress={() => navigation.navigate('Conversation', { resumeId: unfinished.id })}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Above the catalogue rather than inside it: these are the
            learner's own words, collected from conversations they have already
            had, which makes them a different kind of thing from a topic
            somebody else wrote. Shown from the first launch, empty or not - a
            feature nobody can see is a feature nobody uses, and the row is
            where the explanation of how to fill it lives. */}
        <View style={styles.padded}>
          <Pressable
            onPress={() => navigation.navigate('Dictionary')}
            accessibilityRole="button"
            accessibilityLabel={
              savedWords > 0 ? `My words, ${savedWords} saved` : 'My words, nothing saved yet'
            }
            accessibilityHint="Opens the words you have saved, and explains how to save more"
            style={({ pressed }) => [
              styles.words,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                opacity: pressed ? theme.opacity.pressed : 1,
              },
            ]}
          >
            <AppText variant="title2" accessibilityElementsHidden>
              📒
            </AppText>
            <View style={styles.wordsText}>
              <AppText variant="bodyStrong">My words</AppText>
              <AppText variant="callout" color="textSecondary">
                {savedWords > 0
                  ? `${savedWords} saved from your conversations`
                  : 'Tap a word while you talk to keep it here'}
              </AppText>
            </View>
            <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
          </Pressable>
        </View>

        {BROWSABLE_CATEGORIES.map((category) => {
          const list = byCategory.get(category.id) ?? [];
          if (list.length === 0) return null;
          const horizontal = category.id === 'tech_talk';

          return (
            <View key={category.id} style={styles.section}>
              <View style={[styles.sectionHeader, styles.padded]}>
                <View style={styles.sectionTitle}>
                  <Icon name={CATEGORY_ICONS[category.id]} size={18} color={theme.colors.primary} />
                  <AppText variant="bodyStrong">{category.title}</AppText>
                </View>
                <Pressable
                  onPress={() => navigation.navigate('CategoryTopics', { categoryId: category.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`See all ${category.title} topics`}
                >
                  <AppText variant="subhead" color="primary">
                    {list.length} topics
                  </AppText>
                </Pressable>
              </View>

              {horizontal ? (
                <FlatList
                  horizontal
                  data={list.slice(0, 8)}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <TopicCard topic={item} onPress={openTopic} compact />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carousel}
                  ItemSeparatorComponent={() => <View style={styles.gap} />}
                />
              ) : (
                <View style={[styles.grid, styles.padded]}>
                  {list.slice(0, 6).map((topic) => (
                    <Pressable
                      key={topic.id}
                      onPress={() => openTopic(topic)}
                      accessibilityRole="button"
                      accessibilityLabel={topic.title}
                      accessibilityHint={topic.summary}
                      style={({ pressed }) => [
                        styles.gridCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radius.lg,
                          opacity: pressed ? theme.opacity.pressed : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.topicChip,
                          {
                            backgroundColor: theme.colors.primarySoft,
                            borderRadius: theme.radius.sm,
                          },
                        ]}
                      >
                        <AppText variant="body" style={styles.topicEmoji}>
                          {topic.emoji}
                        </AppText>
                      </View>
                      <AppText variant="calloutStrong" numberOfLines={2}>
                        {topic.title}
                      </AppText>
                      <AppText variant="footnote" color="neutral">
                        {getDifficulty(topic.suggestedDifficulty).label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={[styles.section, styles.padded]}>
          <View style={styles.sectionHeader}>
            <AppText variant="bodyStrong">Your own topics</AppText>
            <AppText variant="subhead" color="primary">
              {custom.length} saved
            </AppText>
          </View>

          {/* Cards sit two-up like the topic grid above, and the add button is
              a full-width row of its own. It used to share a flex row with the
              card stack, where `align-items: stretch` grew it to the height of
              every card put together. */}
          <View style={styles.customSection}>
            {custom.length === 0 ? (
              <Pressable
                onPress={() => navigation.navigate('CustomTopic')}
                accessibilityRole="button"
                accessibilityLabel="Create your own scenario"
                style={({ pressed }) => [
                  styles.customEmpty,
                  {
                    backgroundColor: theme.colors.primarySoft,
                    borderColor: theme.colors.primarySoftStrong,
                    borderRadius: theme.radius.lg,
                    opacity: pressed ? theme.opacity.pressed : 1,
                  },
                ]}
              >
                <View style={styles.customEmptyHead}>
                  <View
                    style={[
                      styles.topicChip,
                      { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm },
                    ]}
                  >
                    <Icon name="plus" size={15} color={theme.colors.primary} />
                  </View>
                  <AppText variant="calloutStrong">Describe any situation</AppText>
                </View>
                <AppText variant="footnote" color="neutral">
                  An interview, a difficult client, a conversation you are dreading.
                </AppText>
              </Pressable>
            ) : (
              <View style={styles.customGrid}>
                {custom.slice(0, 2).map((topic) => (
                  <Pressable
                    key={topic.id}
                    onPress={() => openTopic(topic)}
                    accessibilityRole="button"
                    accessibilityLabel={topic.title}
                    style={({ pressed }) => [
                      styles.customCard,
                      {
                        backgroundColor: theme.colors.primarySoft,
                        borderColor: theme.colors.primarySoftStrong,
                        borderRadius: theme.radius.lg,
                        opacity: pressed ? theme.opacity.pressed : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.topicChip,
                        {
                          backgroundColor: theme.colors.surface,
                          borderRadius: theme.radius.sm,
                        },
                      ]}
                    >
                      <AppText variant="body" style={styles.topicEmoji}>
                        {topic.emoji}
                      </AppText>
                    </View>
                    <AppText variant="calloutStrong" numberOfLines={2}>
                      {topic.title}
                    </AppText>
                    <AppText variant="footnote" color="primaryStrong">
                      Custom · {getDifficulty(topic.suggestedDifficulty).label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}

            {custom.length > 0 ? (
              <Pressable
                onPress={() => navigation.navigate('CustomTopic')}
                accessibilityRole="button"
                accessibilityLabel="New custom topic"
                style={({ pressed }) => [
                  styles.addButton,
                  {
                    backgroundColor: theme.colors.ink,
                    borderRadius: theme.radius.lg,
                    opacity: pressed ? theme.opacity.pressed : 1,
                  },
                ]}
              >
                <Icon name="plus" size={18} color={theme.colors.onInk} />
                <AppText variant="calloutStrong" color="onInk">
                  New topic
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24, gap: 28 },
  words: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  wordsText: { flex: 1, gap: 2 },
  padded: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerText: { flex: 1, gap: 2 },
  offline: { padding: 12 },
  resume: { padding: 18, gap: 14 },
  resumeStatus: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  resumeText: { flex: 1, gap: 4 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  carousel: { paddingHorizontal: 20, paddingVertical: 2 },
  gap: { width: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: { width: '48%', flexGrow: 1, borderWidth: 1, padding: 14, gap: 4 },
  topicChip: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  // Emoji ignore the font family but not the metrics; a fixed line height keeps
  // them centred in the chip across platforms.
  topicEmoji: { fontSize: 15, lineHeight: 19 },
  customSection: { gap: 10 },
  customGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Matches `gridCard` so the two sections read as one system. `flexGrow` lets
  // a single card fill the row instead of leaving a gap beside it.
  customCard: { width: '48%', flexGrow: 1, borderWidth: 1, padding: 14, gap: 4 },
  customEmpty: { borderWidth: 1, padding: 16, gap: 6 },
  customEmptyHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // An explicit height, so nothing can stretch it to fill a taller sibling.
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
  },
});
