import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Section } from '@/components/ui/Section';
import { LoadingState } from '@/components/ui/StateViews';
import { getAccent } from '@/data/accents';
import { getDifficulty } from '@/data/difficulty';
import { getPersonality } from '@/data/personalities';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { RootStackParamList } from '@/navigation/types';
import { conversationRepository, topicRepository } from '@/repositories';
import { useSettings } from '@/state/SettingsContext';
import { useTheme } from '@/theme';
import type { ConversationSummary, Topic } from '@/types';
import { TopicCard } from '../components/TopicCard';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface PracticeData {
  readonly topics: readonly Topic[];
  readonly recent: readonly ConversationSummary[];
}

const loadPractice = async (): Promise<PracticeData> => {
  const [topics, recent] = await Promise.all([
    topicRepository.listAll(),
    conversationRepository.list(),
  ]);
  return { topics, recent };
};

const EMPTY_TOPICS: readonly Topic[] = [];

/**
 * The "Speak" tab: one screen whose only job is to remove every decision
 * between opening the app and talking. Home is for browsing; this is for
 * starting.
 */
export function PracticeScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useTheme();
  const { settings } = useSettings();
  const { isOnline } = useNetworkStatus();

  const data = useAsyncData(loadPractice);
  const reload = data.reload;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const start = useCallback(
    (topic: Topic) => navigation.navigate('ConversationSetup', { topic }),
    [navigation],
  );

  const topics = useMemo(() => data.data?.topics ?? EMPTY_TOPICS, [data.data]);
  const lastSummary = data.data?.recent[0];

  const lastTopic = useMemo(() => {
    if (!lastSummary) return undefined;
    return topics.find((topic) => topic.title === lastSummary.topicTitle);
  }, [lastSummary, topics]);

  // Stable for the whole day so the card does not change mid-scroll.
  const suggestion = useMemo(() => {
    if (topics.length === 0) return undefined;
    const seed = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return topics[hash % topics.length];
  }, [topics]);

  if (data.state === 'loading' && !data.data) {
    return (
      <Screen>
        <LoadingState message="Getting things ready…" />
      </Screen>
    );
  }

  const personality = getPersonality(settings.personalityId);
  const accent = getAccent(settings.accent);
  const difficulty = getDifficulty(settings.difficulty);

  return (
    <Screen scroll>
      <Card style={styles.setupCard}>
        <AppText variant="overline" color="textTertiary">
          Your current setup
        </AppText>

        <View style={styles.setupRow}>
          <Avatar
            initial={personality.initial}
            portrait={personality.portrait}
            size={52}
            backgroundColor={personality.avatarColor}
            textColor={personality.avatarTextColor}
          />
          <View style={styles.flex}>
            <AppText variant="title3">{personality.name}</AppText>
            <AppText variant="callout" color="neutral">
              {accent.label} · {settings.speakingSpeed}x · {difficulty.label}
            </AppText>
          </View>
        </View>

        <Button
          label="Change setup"
          variant="secondary"
          size="sm"
          onPress={() => navigation.navigate('PersonalitySettings')}
          style={styles.changeSetup}
        />
      </Card>

      {!isOnline ? (
        <View
          style={[
            styles.offline,
            { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
          ]}
        >
          <AppText variant="subhead" style={{ color: theme.colors.warningText }}>
            You are offline — you need a connection to talk.
          </AppText>
        </View>
      ) : null}

      {lastTopic ? (
        <Section title="Pick up where you left off">
          <Card
            onPress={() => start(lastTopic)}
            accessibilityLabel={`Practise ${lastTopic.title} again`}
          >
            <View style={styles.resumeRow}>
              <View
                style={[
                  styles.iconTile,
                  { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
                ]}
              >
                <Icon name="chat" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{lastTopic.title}</AppText>
                <AppText variant="callout" color="neutral" numberOfLines={2}>
                  {lastTopic.summary}
                </AppText>
              </View>
            </View>
          </Card>
        </Section>
      ) : null}

      {suggestion ? (
        <Section title="Today’s suggestion" subtitle="A new one every day">
          <TopicCard topic={suggestion} onPress={start} />
        </Section>
      ) : null}

      <Section title="Or make your own">
        <Card
          onPress={() => navigation.navigate('CustomTopic')}
          accessibilityLabel="Create a custom scenario"
        >
          <View
            style={[
              styles.iconTile,
              { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
            ]}
          >
            <Icon name="sparkle" size={20} color={theme.colors.primary} />
          </View>
          <AppText variant="bodyStrong" style={styles.customTitle}>
            Describe any situation
          </AppText>
          <AppText variant="callout" color="neutral" style={styles.customBody}>
            An interview, a difficult client, a conversation you are dreading. We will build the
            role-play around it.
          </AppText>
        </Card>
      </Section>

      <Button
        label="Browse all topics"
        variant="ghost"
        fullWidth
        onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  setupCard: { marginBottom: 24, gap: 12 },
  setupRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  changeSetup: { alignSelf: 'flex-start' },
  offline: { padding: 12, marginBottom: 20 },
  resumeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconTile: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  customTitle: { marginTop: 8 },
  customBody: { marginTop: 4 },
});
