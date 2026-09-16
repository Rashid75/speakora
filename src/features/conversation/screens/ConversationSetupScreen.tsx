import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { getAccent } from '@/data/accents';
import { DIFFICULTY_LIST, getDifficulty } from '@/data/difficulty';
import { PERSONALITY_LIST } from '@/data/personalities';
import { getCategory } from '@/data/topics';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { RootStackParamList } from '@/navigation/types';
import { useSettings } from '@/state/SettingsContext';
import { HIT_SLOP, useTheme } from '@/theme';
import { SPEAKING_SPEEDS, type Difficulty, type PersonalityId, type SpeakingSpeed } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ConversationSetup'>;

/**
 * "Before you start" (artboard 1c), presented as a bottom sheet.
 *
 * Choices here write straight through to global settings rather than living as
 * a per-conversation override: two places to change difficulty is a bug
 * factory, and people expect the choice they just made to stick for next time.
 */
export function ConversationSetupScreen({ navigation, route }: Props): React.JSX.Element {
  const { topic } = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { isOnline } = useNetworkStatus();

  const [difficulty, setDifficulty] = useState<Difficulty>(
    topic.suggestedDifficulty ?? settings.difficulty,
  );
  const [personalityId, setPersonalityId] = useState<PersonalityId>(settings.personalityId);
  const [speed, setSpeed] = useState<SpeakingSpeed>(settings.speakingSpeed);

  const accent = useMemo(() => getAccent(settings.accent), [settings.accent]);
  const category = getCategory(topic.categoryId);

  const start = useCallback(() => {
    update({ difficulty, personalityId, speakingSpeed: speed });
    navigation.replace('Conversation', { topic });
  }, [difficulty, navigation, personalityId, speed, topic, update]);

  // Nothing to undo: the choices above are held locally and only written to
  // settings by `start`, so backing out here leaves them exactly as they were.
  const cancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handleRow}>
          <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />

          {/* The sheet had only a grabber to dismiss it, which is a gesture on
              iOS and nothing at all on Android. */}
          <Pressable
            onPress={cancel}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Close without starting"
            style={({ pressed }) => [
              styles.close,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: theme.radius.pill,
                opacity: pressed ? theme.opacity.pressed : 1,
              },
            ]}
          >
            <Icon name="close" size={14} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.intro}>
          <AppText variant="overline" color="primary">
            {category?.title ?? 'Topic'}
          </AppText>
          <AppText variant="title2" accessibilityRole="header">
            {topic.title}
          </AppText>
          <AppText variant="callout" color="neutral">
            {topic.scenario}
          </AppText>
        </View>

        <View style={styles.group}>
          <AppText variant="subhead" color="textSecondary">
            Who you’re talking to
          </AppText>
          <View style={styles.partners}>
            {PERSONALITY_LIST.map((personality) => {
              const selected = personality.id === personalityId;
              return (
                <Pressable
                  key={personality.id}
                  onPress={() => setPersonalityId(personality.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${personality.name}, ${personality.tagline}`}
                  accessibilityHint={personality.description}
                  style={[
                    styles.partner,
                    {
                      borderRadius: theme.radius.lg,
                      backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                >
                  <Avatar
                    initial={personality.initial}
                    portrait={personality.portrait}
                    size={44}
                    backgroundColor={personality.avatarColor}
                    textColor={personality.avatarTextColor}
                  />
                  <AppText variant="calloutStrong">{personality.name}</AppText>
                  <AppText
                    variant="footnote"
                    color={selected ? 'primaryStrong' : 'neutral'}
                    align="center"
                  >
                    {personality.tagline}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.group}>
          <AppText variant="subhead" color="textSecondary">
            How hard should it be?
          </AppText>
          <SegmentedControl
            accessibilityLabel="Difficulty"
            options={DIFFICULTY_LIST.map((item) => ({ value: item.id, label: item.shortLabel }))}
            value={difficulty}
            onChange={setDifficulty}
          />
          <AppText variant="footnote" color="neutral">
            {getDifficulty(difficulty).label} — {getDifficulty(difficulty).description}
          </AppText>
        </View>

        <View
          style={[styles.rows, { borderColor: theme.colors.border, borderRadius: theme.radius.lg }]}
        >
          <Pressable
            onPress={() => navigation.navigate('AccentSettings')}
            accessibilityRole="button"
            accessibilityLabel="Accent"
            accessibilityValue={{ text: accent.label }}
            style={[styles.row, { borderBottomColor: theme.colors.surfaceMuted }]}
          >
            <AppText variant="subhead" color="textSecondary">
              Accent
            </AppText>
            <View style={styles.rowValue}>
              <AppText variant="callout" color="neutral">
                {accent.label}
              </AppText>
              <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
            </View>
          </Pressable>

          <View style={styles.row}>
            <AppText variant="subhead" color="textSecondary">
              Speaking speed
            </AppText>
            <View style={styles.speeds}>
              {SPEAKING_SPEEDS.slice(0, 3).map((option) => {
                const selected = option === speed;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setSpeed(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${option} times speed`}
                    style={[
                      styles.speedPill,
                      {
                        borderRadius: theme.radius.pill,
                        backgroundColor: selected
                          ? theme.colors.primary
                          : theme.colors.surfaceMuted,
                      },
                    ]}
                  >
                    <AppText
                      variant={selected ? 'footnoteStrong' : 'caption'}
                      style={{ color: selected ? theme.colors.onPrimary : theme.colors.neutral }}
                    >
                      {option}x
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {!isOnline ? (
          <View
            style={[
              styles.offline,
              { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
            ]}
          >
            <AppText variant="subhead" style={{ color: theme.colors.warningText }}>
              You are offline — connect to start a conversation.
            </AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="Start talking"
            size="lg"
            fullWidth
            disabled={!isOnline}
            onPress={start}
            icon={<Icon name="mic" size={20} color={theme.colors.onPrimary} />}
            accessibilityHint="Begins a live voice conversation on this topic"
          />
          <Button
            label="Cancel"
            variant="ghost"
            size="lg"
            fullWidth
            onPress={cancel}
            accessibilityHint="Goes back without starting. Your choices here are not saved."
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 24 },
  handleRow: { alignItems: 'center', justifyContent: 'center', minHeight: 32 },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  close: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: 4 },
  intro: { gap: 4 },
  group: { gap: 10 },
  partners: { flexDirection: 'row', gap: 10 },
  partner: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 8 },
  rows: { borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speeds: { flexDirection: 'row', gap: 4 },
  speedPill: { height: 28, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  offline: { padding: 12 },
});
