import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { getDifficulty } from '@/data/difficulty';
import { useTheme } from '@/theme';
import type { Topic, TopicCategoryId } from '@/types';

export interface TopicCardProps {
  readonly topic: Topic;
  readonly onPress: (topic: Topic) => void;
  /** Narrow 190px card for the horizontal carousel on Home. */
  readonly compact?: boolean;
}

const CATEGORY_ICONS: Readonly<Record<TopicCategoryId, IconName>> = {
  tech_talk: 'code',
  daily_conversation: 'chat',
  professional_english: 'user',
  travel_and_life: 'sparkle',
  exams_and_interviews: 'bars',
  custom: 'sparkle',
};

export const TopicCard = memo(function TopicCard({
  topic,
  onPress,
  compact = false,
}: TopicCardProps): React.JSX.Element {
  const theme = useTheme();
  const difficulty = getDifficulty(topic.suggestedDifficulty);

  return (
    <Pressable
      onPress={() => onPress(topic)}
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}. ${topic.summary}`}
      accessibilityHint={`${difficulty.label} level, about ${topic.estimatedMinutes} minutes`}
      testID={`topic-${topic.id}`}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.compact : undefined,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          opacity: pressed ? theme.opacity.pressed : 1,
        },
      ]}
    >
      {/* The topic's own emoji, so a row of cards from one category is not six
          copies of the same glyph. The category icon stays as the fallback for
          a custom topic saved without one. */}
      <View
        style={[
          styles.iconTile,
          { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
        ]}
      >
        {topic.emoji ? (
          <AppText variant="body" style={styles.emoji}>
            {topic.emoji}
          </AppText>
        ) : (
          <Icon name={CATEGORY_ICONS[topic.categoryId]} size={20} color={theme.colors.primary} />
        )}
      </View>

      <AppText variant="bodyStrong" numberOfLines={2}>
        {topic.title}
      </AppText>

      <AppText
        variant="callout"
        color="neutral"
        numberOfLines={compact ? 2 : 3}
        style={styles.summary}
      >
        {topic.summary}
      </AppText>

      <View
        style={[
          styles.pill,
          { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.pill },
        ]}
      >
        <AppText variant="caption" color="textSecondary">
          {difficulty.label}
        </AppText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 8 },
  compact: { width: 190 },
  iconTile: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  // Emoji ignore the font family but not the metrics; a fixed line height keeps
  // them centred in the tile across platforms.
  emoji: { fontSize: 18, lineHeight: 22 },
  summary: { flexGrow: 1 },
  pill: {
    height: 24,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
