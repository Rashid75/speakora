import React, { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { getPersonality } from '@/data/personalities';
import { useAsyncData } from '@/hooks/useAsyncData';
import type { RootStackParamList } from '@/navigation/types';
import { conversationRepository } from '@/repositories';
import { HIT_SLOP, useTheme } from '@/theme';
import { failure, type ConversationMessage } from '@/types';
import { countWords } from '@/utils/text';
import { formatClockTime, formatDuration, formatRelativeDay } from '@/utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'ConversationDetail'>;

/**
 * A past conversation (artboard 1h): a four-up stat strip, then a
 * Transcript/Notes tab pair.
 *
 * Reached both from History and straight after a session ends
 * (`fromConversation`), which changes the primary action from "back" to "done".
 */
export function ConversationDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { conversationId, fromConversation } = route.params;
  const theme = useTheme();

  const loadConversation = useCallback(
    () => conversationRepository.get(conversationId),
    [conversationId],
  );
  const conversation = useAsyncData(loadConversation);

  const goBack = useCallback(() => {
    if (fromConversation) {
      navigation.navigate('Tabs', { screen: 'Home' });
      return;
    }
    navigation.goBack();
  }, [fromConversation, navigation]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete this conversation?',
      'The transcript, notes and assessment are removed from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Leave first: the screen reads this record, and staying on it
            // after the delete would flash the not-found state.
            goBack();
            void conversationRepository.remove(conversationId);
          },
        },
      ],
    );
  }, [conversationId, goBack]);

  const record = conversation.data?.ok ? conversation.data.value : undefined;

  if (conversation.state === 'loading' && !conversation.data) {
    return (
      <Screen>
        <LoadingState message="Loading conversation…" />
      </Screen>
    );
  }

  if (!record) {
    return (
      <Screen>
        <ErrorState failure={failure('not_found', conversationId, false)} onRetry={goBack} />
      </Screen>
    );
  }

  const personality = getPersonality(record.config.personalityId);
  const assessment = record.assessment;
  const words = record.messages
    .filter((message) => message.role === 'user')
    .reduce((sum, message) => sum + countWords(message.text), 0);

  return (
    <Screen scroll padded={false}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={fromConversation ? 'Done' : 'Back'}
          style={[
            styles.backButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.pill,
            },
          ]}
        >
          <Icon name="arrowLeft" size={18} color={theme.colors.textSecondary} />
        </Pressable>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {record.topicTitle}
          </AppText>
          <AppText variant="footnote" color="neutral">
            {formatRelativeDay(record.startedAt)}, {formatClockTime(record.startedAt)} ·{' '}
            {formatDuration(record.durationMs)} · {personality.name}
          </AppText>
        </View>

        <Pressable
          onPress={confirmDelete}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Delete this conversation"
          accessibilityHint="Asks you to confirm first"
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.pill,
              opacity: pressed ? theme.opacity.pressed : 1,
            },
          ]}
        >
          <Icon name="trash" size={18} color={theme.colors.danger} />
        </Pressable>
      </View>

      {/* Stat strip */}
      <View style={styles.padded}>
        <View
          style={[
            styles.stats,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Stat value={assessment ? String(assessment.overallScore) : '—'} label="Score" />
          <Stat value={String(record.stats.userTurns)} label="Turns" />
          <Stat value={String(words)} label="Words" />
        </View>
      </View>

      <View style={[styles.padded, styles.turns]}>
        <AppText variant="bodyStrong" accessibilityRole="header">
          Transcript
        </AppText>
        {record.messages.map((message) => (
          <TranscriptRow key={message.id} message={message} partnerName={personality.name} />
        ))}
      </View>

      <View style={[styles.padded, styles.footerActions]}>
        {/* An unfinished conversation is picked back up, not restarted - the
            transcript and the timer carry on from where they stopped. */}
        {!fromConversation && record.status === 'abandoned' ? (
          <Button
            label="Continue this conversation"
            fullWidth
            accessibilityHint="Reopens it where you left off"
            onPress={() => navigation.replace('Conversation', { resumeId: record.id })}
          />
        ) : null}

        <Button
          label={fromConversation ? 'Done' : 'Talk about this again'}
          variant={fromConversation ? 'primary' : 'secondary'}
          fullWidth
          onPress={
            fromConversation
              ? goBack
              : () => navigation.navigate('ConversationSetup', { topic: record.topicSnapshot })
          }
        />
      </View>
    </Screen>
  );
}

function TranscriptRow({
  message,
  partnerName,
}: {
  readonly message: ConversationMessage;
  readonly partnerName: string;
}): React.JSX.Element {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const polished = message.analysis?.polishedResponse;
  const showPolished = Boolean(polished) && polished !== message.text;

  if (!isUser) {
    return (
      <View style={styles.aiRow}>
        <AppText variant="footnote" color="textTertiary">
          {partnerName} · {formatClockTime(message.createdAt)}
        </AppText>
        <AppText variant="body" color="textSecondary" selectable>
          {message.text}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.userRow}>
      <AppText variant="footnote" color="textTertiary">
        You · {formatClockTime(message.createdAt)}
      </AppText>
      <View
        style={[
          styles.userBubble,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            borderBottomRightRadius: theme.radius.xs - 2,
          },
        ]}
      >
        <AppText variant="body" selectable>
          {message.text}
        </AppText>

        {showPolished ? (
          <View
            style={[
              styles.polished,
              { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.sm },
            ]}
          >
            <AppText variant="footnoteStrong" color="primaryStrong">
              Polished
            </AppText>
            <AppText variant="callout">{polished}</AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Stat({
  value,
  label,
}: {
  readonly value: string;
  readonly label: string;
}): React.JSX.Element {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="title3">{value}</AppText>
      <AppText variant="footnote" color="neutral">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 20 },
  footerActions: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', borderWidth: 1, padding: 16, gap: 12, marginBottom: 18 },
  stat: { flex: 1, gap: 2 },
  turns: { gap: 16, marginTop: 18, marginBottom: 24 },
  aiRow: { gap: 4 },
  userRow: { gap: 6, alignItems: 'flex-end' },
  userBubble: {
    maxWidth: 300,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  polished: { padding: 10, gap: 2 },
  notesPanel: { gap: 14, marginTop: 18, marginBottom: 24 },
  summaryCard: { padding: 16, gap: 6 },
  bullets: { gap: 8, marginTop: 4 },
  bullet: { flexDirection: 'row', gap: 8 },
});
