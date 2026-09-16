import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { WeekBars } from '@/components/charts/WeekBars';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Section } from '@/components/ui/Section';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { useAsyncData } from '@/hooks/useAsyncData';
import type { RootStackParamList } from '@/navigation/types';
import { statisticsRepository } from '@/repositories';
import { useTheme, type Theme } from '@/theme';
import { SKILL_KEYS, type SkillKey, type StatisticsSnapshot } from '@/types';
import { formatDuration } from '@/utils/time';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const loadStatistics = (): Promise<StatisticsSnapshot> => statisticsRepository.snapshot();

const SKILL_LABELS: Readonly<Record<SkillKey, string>> = {
  grammar: 'Grammar',
  fluency: 'Fluency',
  vocabulary: 'Vocabulary',
  pronunciation: 'Pronunciation',
  naturalness: 'Natural phrasing',
  confidence: 'Confidence',
};

/**
 * Progress (artboard 1i).
 *
 * This is the only place the CEFR level is ever shown - the design is explicit
 * that a level estimate must never appear over a live conversation. Anything we
 * cannot actually measure is labelled "Not measured" rather than given a
 * plausible-looking number.
 */
export function StatisticsScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useTheme();

  const stats = useAsyncData(loadStatistics);
  const reload = stats.reload;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (stats.state === 'loading' && !stats.data) {
    return (
      <Screen>
        <LoadingState message="Crunching your numbers…" />
      </Screen>
    );
  }

  const snapshot = stats.data;

  if (!snapshot || !snapshot.hasData) {
    return (
      <Screen>
        <EmptyState
          emoji="📊"
          title="Nothing to measure yet"
          message="Finish your first conversation and your level, skills and progress will show up here."
          actionLabel="Start practising"
          onAction={() => navigation.navigate('Tabs', { screen: 'Speak' })}
        />
      </Screen>
    );
  }

  const confidencePct = Math.round(snapshot.levelConfidence * 100);

  return (
    <Screen scroll>
      <AppText variant="title2" accessibilityRole="header" style={styles.pageTitle}>
        Your progress
      </AppText>

      {/* Level card */}
      <View
        style={[
          styles.levelCard,
          { backgroundColor: theme.colors.ink, borderRadius: theme.radius.lg },
        ]}
      >
        <View style={styles.levelHead}>
          <View>
            <AppText variant="overline" color="onInkMuted">
              Estimated level
            </AppText>
            <AppText variant="hero" color="onInk">
              {snapshot.level}
            </AppText>
          </View>
          <View style={styles.levelMeta}>
            <AppText variant="subhead" style={{ color: '#69F7C3' }}>
              {confidencePct}% confident
            </AppText>
            <AppText variant="footnote" color="onInkFaint">
              from {snapshot.totalConversations}{' '}
              {snapshot.totalConversations === 1 ? 'conversation' : 'conversations'}
            </AppText>
          </View>
        </View>

        <View style={[styles.levelTrack, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
          <View
            style={[styles.levelFill, { width: `${confidencePct}%`, backgroundColor: '#69F7C3' }]}
          />
        </View>

        <AppText variant="callout" color="onInkMuted">
          {snapshot.levelRationale.length > 0
            ? snapshot.levelRationale.join(' ')
            : 'Keep practising — after a few more conversations we will explain exactly what is driving this estimate.'}
        </AppText>
      </View>

      {/* Breakdown */}
      <Section title="Breakdown">
        <View style={styles.breakdown}>
          {SKILL_KEYS.map((key) => (
            <SkillRow
              key={key}
              label={SKILL_LABELS[key]}
              value={snapshot.skills[key]}
              available={snapshot.skillAvailability[key]}
              theme={theme}
              highlight={key === 'confidence'}
            />
          ))}

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Icon name="info" size={18} color={theme.colors.textTertiary} />
            <AppText variant="callout" color="textSecondary" style={styles.flex}>
              Pronunciation isn’t scored yet. On-device transcription isn’t accurate enough to judge
              it fairly.
            </AppText>
          </View>
        </View>
      </Section>

      {/* Speaking time */}
      <Section
        title="Speaking time"
        action={
          <AppText variant="subhead" color="neutral">
            Last 7 days
          </AppText>
        }
      >
        <WeekBars trend={snapshot.trend} />
        <View style={styles.statRow}>
          <StatCard value={formatDuration(snapshot.totalSpeakingMs)} label="Total spoken" />
          <StatCard value={formatDuration(snapshot.averageConversationMs)} label="Average chat" />
        </View>
      </Section>

      {snapshot.commonMistakes.length > 0 ? (
        <Section title="Comes up most often">
          <View style={styles.mistakes}>
            {snapshot.commonMistakes.map((mistake) => (
              <View
                key={mistake.pattern}
                style={[
                  styles.mistakeRow,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                  },
                ]}
                accessible
                accessibilityLabel={`${mistake.pattern}, ${mistake.count} times`}
              >
                <AppText variant="callout" color="textSecondary" style={styles.flex}>
                  {mistake.pattern}
                </AppText>
                <AppText
                  variant="calloutStrong"
                  style={{
                    color: mistake.count >= 8 ? theme.colors.danger : theme.colors.warning,
                  }}
                >
                  {mistake.count}x
                </AppText>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {snapshot.newVocabulary.length > 0 ? (
        <Section title="Words suggested to you">
          <Card>
            <View style={styles.words}>
              {snapshot.newVocabulary.slice(0, 20).map((word) => (
                <View
                  key={word}
                  style={[
                    styles.wordChip,
                    {
                      backgroundColor: theme.colors.primarySoft,
                      borderRadius: theme.radius.pill,
                    },
                  ]}
                >
                  <AppText variant="caption" color="primaryStrong">
                    {word}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}

function SkillRow({
  label,
  value,
  available,
  theme,
  highlight,
}: {
  readonly label: string;
  readonly value: number;
  readonly available: boolean;
  readonly theme: Theme;
  readonly highlight: boolean;
}): React.JSX.Element {
  const pct = Math.round(Math.min(100, Math.max(0, value)));

  return (
    <View
      style={styles.skill}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={available ? { min: 0, max: 100, now: pct } : { text: 'Not measured' }}
    >
      <View style={styles.skillHead}>
        <AppText variant="subhead" color={available ? 'textSecondary' : 'textTertiary'}>
          {label}
        </AppText>
        <AppText variant="calloutStrong" color={available ? 'text' : 'textTertiary'}>
          {available ? `${pct}%` : 'Not measured'}
        </AppText>
      </View>
      <View style={[styles.skillTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
        {available && pct > 0 ? (
          <View
            style={[
              styles.skillFill,
              {
                width: `${pct}%`,
                backgroundColor: highlight ? theme.colors.success : theme.colors.primary,
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

function StatCard({
  value,
  label,
}: {
  readonly value: string;
  readonly label: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <AppText variant="title3">{value}</AppText>
      <AppText variant="footnote" color="neutral">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pageTitle: { marginBottom: 20 },
  levelCard: { padding: 20, gap: 16, marginBottom: 24 },
  levelHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  levelMeta: { alignItems: 'flex-end', gap: 6 },
  levelTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  levelFill: { height: 6, borderRadius: 3 },
  breakdown: { gap: 14 },
  skill: { gap: 6 },
  skillHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skillTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  skillFill: { height: 8, borderRadius: 4 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statCard: { flex: 1, borderWidth: 1, padding: 14, gap: 2 },
  mistakes: { gap: 10 },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wordChip: { paddingHorizontal: 10, paddingVertical: 4 },
});
