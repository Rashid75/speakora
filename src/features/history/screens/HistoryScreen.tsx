import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { useAsyncData } from '@/hooks/useAsyncData';
import type { RootStackParamList } from '@/navigation/types';
import { conversationRepository } from '@/repositories';
import { HIT_SLOP, useTheme } from '@/theme';
import type { ConversationSummary } from '@/types';
import { dayKey, formatDuration, formatRelativeDay } from '@/utils/time';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface HistoryData {
  readonly items: readonly ConversationSummary[];
  /**
   * Captured when the data loads rather than read during render: the clock is
   * an impure input, and a render-time read makes filtering non-deterministic.
   */
  readonly loadedAt: number;
}

const loadHistory = async (): Promise<HistoryData> => ({
  items: await conversationRepository.list(),
  loadedAt: Date.now(),
});

type Filter = 'all' | 'week';

/**
 * History (artboard 1g): filter chips, then conversations grouped by recency.
 *
 * Each row carries a score bar, which is the only place in the app outside
 * Progress where a number is shown - deliberately kept off the conversation
 * screen itself.
 */
export function HistoryScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>('all');

  const history = useAsyncData(loadHistory);
  const reload = history.reload;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const confirmDelete = useCallback(
    (summary: ConversationSummary) => {
      Alert.alert('Delete this conversation?', 'The transcript and notes will be removed.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void conversationRepository.remove(summary.id).then(() => reload());
          },
        },
      ]);
    },
    [reload],
  );

  const confirmClearAll = useCallback(() => {
    Alert.alert(
      'Delete every conversation?',
      // Statistics are aggregated from the transcripts, so they go with them.
      // Progress (streak, measured level) is stored separately and survives -
      // say so rather than letting the learner guess.
      'Every transcript and its notes are removed from this device, and your statistics are rebuilt from them, so those go too. Your streak and measured level are kept. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => {
            void conversationRepository.clear().then(() => reload());
          },
        },
      ],
    );
  }, [reload]);

  const items = useMemo(() => history.data?.items ?? [], [history.data]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    const cutoff = (history.data?.loadedAt ?? 0) - 7 * 86_400_000;
    return items.filter((item) => Date.parse(item.startedAt) >= cutoff);
  }, [filter, history.data, items]);

  const groups = useMemo(
    () => groupByRecency(filtered, history.data?.loadedAt ?? 0),
    [filtered, history.data],
  );

  if (history.state === 'loading' && !history.data) {
    return (
      <Screen>
        <LoadingState message="Loading your conversations…" />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen>
        <EmptyState
          emoji="💬"
          title="No conversations yet"
          message="Once you finish a conversation it will appear here, with the full transcript and your notes."
          actionLabel="Find a topic"
          onAction={() => navigation.navigate('Tabs', { screen: 'Home' })}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <AppText variant="title2" accessibilityRole="header" style={styles.flex}>
              Conversations
            </AppText>
            <Pressable
              onPress={confirmClearAll}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Delete every conversation"
              accessibilityHint="Asks you to confirm first"
              style={({ pressed }) => [
                styles.clearAll,
                {
                  borderRadius: theme.radius.pill,
                  borderColor: theme.colors.border,
                  opacity: pressed ? theme.opacity.pressed : 1,
                },
              ]}
            >
              <Icon name="trash" size={14} color={theme.colors.danger} />
              <AppText variant="caption" style={{ color: theme.colors.danger }}>
                Clear all
              </AppText>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {(['all', 'week'] as const).map((option) => {
              const selected = filter === option;
              const label = option === 'all' ? 'All' : 'This week';
              return (
                <Pressable
                  key={option}
                  onPress={() => setFilter(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                  style={[
                    styles.chip,
                    {
                      borderRadius: theme.radius.pill,
                      backgroundColor: selected ? theme.colors.ink : theme.colors.surface,
                      borderColor: selected ? theme.colors.ink : theme.colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="subhead"
                    style={{ color: selected ? theme.colors.onInk : theme.colors.textSecondary }}
                  >
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.padded}>
            <AppText variant="callout" color="neutral">
              Nothing in the last seven days.
            </AppText>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <AppText variant="overline" color="textTertiary" style={styles.padded}>
              {group.label}
            </AppText>
            <View style={[styles.padded, styles.rows]}>
              {group.items.map((item) => (
                <HistoryRow
                  key={item.id}
                  summary={item}
                  detailed={group.detailed}
                  onPress={() =>
                    navigation.navigate('ConversationDetail', {
                      conversationId: item.id,
                      fromConversation: false,
                    })
                  }
                  onDelete={() => confirmDelete(item)}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.padded}>
          <AppText variant="callout" color="textTertiary">
            Everything stays on this device.
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

function HistoryRow({
  summary,
  detailed,
  onPress,
  onDelete,
}: {
  readonly summary: ConversationSummary;
  readonly detailed: boolean;
  readonly onPress: () => void;
  /** Confirms before anything is removed. */
  readonly onDelete: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const score = summary.overallScore;

  const scoreTone =
    score === undefined
      ? undefined
      : score >= 80
        ? { bg: theme.colors.successSoft, fg: theme.colors.successText, bar: theme.colors.success }
        : score >= 65
          ? {
              bg: theme.colors.warningSoft,
              fg: theme.colors.warningText,
              bar: theme.colors.warning,
            }
          : { bg: theme.colors.dangerSoft, fg: theme.colors.danger, bar: theme.colors.danger };

  const meta = `${formatDuration(summary.durationMs)} · ${summary.userTurns} turns`;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onDelete}
      delayLongPress={500}
      accessibilityRole="button"
      accessibilityLabel={`${summary.topicTitle}, ${formatRelativeDay(summary.startedAt)}, ${meta}`}
      accessibilityHint="Opens the transcript and notes"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          opacity: pressed ? theme.opacity.pressed : 1,
        },
      ]}
    >
      <View style={styles.cardHead}>
        <View style={styles.cardTitle}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {summary.topicTitle}
          </AppText>
          <AppText variant="callout" color="neutral">
            {meta}
          </AppText>
        </View>

        <View style={styles.cardActions}>
          {scoreTone && score !== undefined ? (
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: scoreTone.bg, borderRadius: theme.radius.pill },
              ]}
            >
              <AppText variant="footnoteStrong" style={{ color: scoreTone.fg }}>
                {score}
              </AppText>
            </View>
          ) : (
            <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
          )}

          {/* Its own Pressable, so tapping delete never opens the transcript. */}
          <Pressable
            onPress={onDelete}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Delete the conversation about ${summary.topicTitle}`}
            accessibilityHint="Asks you to confirm first"
            style={({ pressed }) => [styles.rowDelete, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Icon name="trash" size={16} color={theme.colors.textTertiary} />
          </Pressable>
        </View>
      </View>

      {detailed && scoreTone && score !== undefined ? (
        <>
          <View
            style={[styles.track, { backgroundColor: theme.colors.surfaceMuted, borderRadius: 3 }]}
          >
            <View
              style={[
                styles.fill,
                { width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: scoreTone.bar },
              ]}
            />
          </View>
          {summary.headline ? (
            <AppText variant="callout" color="textSecondary" numberOfLines={2}>
              {summary.headline}
            </AppText>
          ) : null}
        </>
      ) : null}

      {score === undefined && summary.status === 'abandoned' ? (
        <AppText variant="callout" color="textTertiary">
          Ended early — no assessment was generated.
        </AppText>
      ) : null}
    </Pressable>
  );
}

interface Group {
  readonly label: string;
  readonly items: readonly ConversationSummary[];
  /** Today's rows get the full score bar; older ones stay compact. */
  readonly detailed: boolean;
}

const groupByRecency = (items: readonly ConversationSummary[], loadedAt: number): Group[] => {
  const today = dayKey(new Date(loadedAt).toISOString());
  const todayItems = items.filter((item) => dayKey(item.startedAt) === today);
  const earlier = items.filter((item) => dayKey(item.startedAt) !== today);

  const groups: Group[] = [];
  if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems, detailed: true });
  if (earlier.length > 0) groups.push({ label: 'Earlier', items: earlier, detailed: false });
  return groups;
};

const styles = StyleSheet.create({
  content: { paddingVertical: 8, gap: 20, paddingBottom: 40 },
  padded: { paddingHorizontal: 20 },
  headerBlock: { paddingHorizontal: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  clearAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { gap: 12 },
  rows: { gap: 12 },
  card: { borderWidth: 1, padding: 16, gap: 12 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: { flex: 1, gap: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowDelete: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  scoreBadge: { height: 24, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
