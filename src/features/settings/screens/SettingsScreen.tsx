import React, { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { APP_NAME } from '@/config/appConfig';
import { env, isAiConfigured } from '@/config/env';
import { getAccent } from '@/data/accents';
import { getDifficulty } from '@/data/difficulty';
import { getPersonality } from '@/data/personalities';
import type { RootStackParamList } from '@/navigation/types';
import { conversationRepository, progressRepository } from '@/repositories';
import { useSettings } from '@/state/SettingsContext';
import { THEME_LIST, useTheme } from '@/theme';
import { SPEAKING_SPEEDS, type SpeakingSpeed } from '@/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Settings (artboard 1j): a profile card, then grouped rows under quiet
 * overline headings. Anything with more than a handful of options gets its own
 * screen; toggles and the speed control live inline.
 */
export function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const theme = useTheme();
  const { settings, update, reset } = useSettings();

  const personality = getPersonality(settings.personalityId);
  const accent = getAccent(settings.accent);
  const difficulty = getDifficulty(settings.difficulty);

  const confirmClearHistory = useCallback(() => {
    Alert.alert(
      'Delete all conversations?',
      'Every transcript, all your notes and your progress will be permanently removed from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            void Promise.all([conversationRepository.clear(), progressRepository.reset()]);
          },
        },
      ],
    );
  }, []);

  const confirmReset = useCallback(() => {
    Alert.alert('Reset settings?', 'Your conversations will be kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: reset },
    ]);
  }, [reset]);

  return (
    <Screen scroll>
      <AppText variant="title2" accessibilityRole="header" style={styles.pageTitle}>
        Settings
      </AppText>

      {/* Profile */}
      <Pressable
        onPress={() => navigation.navigate('ProfileSettings')}
        accessibilityRole="button"
        accessibilityLabel="Edit your profile"
        style={({ pressed }) => [
          styles.profile,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            opacity: pressed ? theme.opacity.pressed : 1,
          },
        ]}
      >
        <UserAvatar profile={settings.profile} size={52} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{settings.profile.name.trim() || 'Add your name'}</AppText>
          <AppText variant="callout" color="neutral" numberOfLines={1}>
            {settings.profile.selfReportedLevel !== 'unknown'
              ? `${settings.profile.selfReportedLevel} · `
              : ''}
            {settings.profile.learningGoal || 'Set a learning goal'}
          </AppText>
        </View>
        <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
      </Pressable>

      {/* Who you talk to */}
      <Group title="Who you talk to">
        <Row onPress={() => navigation.navigate('PersonalitySettings')} label={personality.name}>
          <Avatar
            initial={personality.initial}
            portrait={personality.portrait}
            size={32}
            backgroundColor={personality.avatarColor}
            textColor={personality.avatarTextColor}
          />
          <View style={styles.flex}>
            <AppText variant="subhead">{personality.name}</AppText>
            <AppText variant="footnote" color="neutral">
              {personality.description}
            </AppText>
          </View>
          <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
        </Row>

        <Row onPress={() => navigation.navigate('AccentSettings')} label="Accent">
          <AppText variant="subhead" color="textSecondary" style={styles.flex}>
            Accent
          </AppText>
          <AppText variant="callout" color="neutral">
            {accent.label}
          </AppText>
          <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
        </Row>

        <Row label="Throw in a harder accent" last>
          <View style={styles.flex}>
            <AppText variant="subhead" color="textSecondary">
              Throw in a harder accent
            </AppText>
            <AppText variant="footnote" color="neutral">
              Occasionally, for listening practice
            </AppText>
          </View>
          <Switch
            value={settings.accentChallengeMode}
            onValueChange={(accentChallengeMode) => update({ accentChallengeMode })}
            accessibilityLabel="Throw in a harder accent"
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </Row>
      </Group>

      {/* How they speak */}
      <View style={styles.group}>
        <AppText variant="overline" color="textTertiary">
          How they speak
        </AppText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <View style={styles.cardRow}>
            <AppText variant="subhead" color="textSecondary">
              Speed
            </AppText>
            <AppText variant="calloutStrong" color="primary">
              {settings.speakingSpeed}x
            </AppText>
          </View>

          <SegmentedControl
            accessibilityLabel="Speaking speed"
            options={SPEAKING_SPEEDS.map((speed) => ({ value: speed, label: String(speed) }))}
            value={settings.speakingSpeed}
            onChange={(speakingSpeed: SpeakingSpeed) => update({ speakingSpeed })}
          />

          <Pressable
            onPress={() => navigation.navigate('DifficultySettings')}
            accessibilityRole="button"
            accessibilityLabel="Difficulty"
            accessibilityValue={{ text: difficulty.label }}
            style={[
              styles.cardRow,
              styles.cardRowDivided,
              { borderTopColor: theme.colors.surfaceMuted },
            ]}
          >
            <AppText variant="subhead" color="textSecondary">
              Difficulty
            </AppText>
            <View style={styles.value}>
              <AppText variant="callout" color="neutral">
                {difficulty.label}
              </AppText>
              <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Look */}
      <View style={styles.group}>
        <AppText variant="overline" color="textTertiary">
          Look
        </AppText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <View style={styles.cardRow}>
            <AppText variant="subhead" color="textSecondary">
              Theme
            </AppText>
            <AppText variant="callout" color="neutral">
              {THEME_LIST.find((item) => item.id === settings.themeId)?.name ?? 'Violet'}
            </AppText>
          </View>

          <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Theme">
            {THEME_LIST.map((definition) => {
              const selected = definition.id === settings.themeId;
              return (
                <Pressable
                  key={definition.id}
                  onPress={() => update({ themeId: definition.id })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={definition.name}
                  accessibilityHint={definition.description}
                  testID={`theme-${definition.id}`}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: definition.swatch,
                      borderRadius: theme.radius.md,
                      borderColor: selected ? theme.colors.primary : theme.colors.borderStrong,
                      borderWidth: selected ? 3 : 1,
                    },
                  ]}
                />
              );
            })}
          </View>

          <Pressable
            onPress={() => navigation.navigate('ThemeSettings')}
            accessibilityRole="button"
            accessibilityLabel="Light or dark"
            style={[
              styles.cardRow,
              styles.cardRowDivided,
              { borderTopColor: theme.colors.surfaceMuted },
            ]}
          >
            <AppText variant="subhead" color="textSecondary">
              Light or dark
            </AppText>
            <View style={styles.value}>
              <AppText variant="callout" color="neutral">
                {settings.colorScheme === 'system'
                  ? 'Match device'
                  : settings.colorScheme === 'dark'
                    ? 'Dark'
                    : 'Light'}
              </AppText>
              <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Conversation behaviour */}
      <Group title="During a conversation">
        <Row label="Speak replies out loud">
          <View style={styles.flex}>
            <AppText variant="subhead" color="textSecondary">
              Speak replies out loud
            </AppText>
            <AppText variant="footnote" color="neutral">
              Turn off to read replies instead
            </AppText>
          </View>
          <Switch
            value={settings.autoSpeak}
            onValueChange={(autoSpeak) => update({ autoSpeak })}
            accessibilityLabel="Speak replies out loud"
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </Row>

        <Row label="Hands-free mode">
          <View style={styles.flex}>
            <AppText variant="subhead" color="textSecondary">
              Hands-free mode
            </AppText>
            <AppText variant="footnote" color="neutral">
              Reopen the mic after your partner finishes
            </AppText>
          </View>
          <Switch
            value={settings.handsFreeMode}
            onValueChange={(handsFreeMode) => update({ handsFreeMode })}
            disabled={!settings.autoSpeak}
            accessibilityLabel="Hands-free mode"
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </Row>

        <Row label="Take notes as I speak">
          <View style={styles.flex}>
            <AppText variant="subhead" color="textSecondary">
              Take notes as I speak
            </AppText>
            <AppText variant="footnote" color="neutral">
              Never interrupts. Read them when you want.
            </AppText>
          </View>
          <Switch
            value={settings.liveFeedback}
            onValueChange={(liveFeedback) => update({ liveFeedback })}
            accessibilityLabel="Take notes as I speak"
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </Row>
      </Group>

      {/* Reminders */}
      <Group title="Reminders">
        <Row label="Daily practice reminder" last>
          <View style={styles.flex}>
            <AppText variant="subhead" color="textSecondary">
              Daily practice reminder
            </AppText>
            <AppText variant="footnote" color="neutral">
              One nudge a morning with a topic to try
            </AppText>
          </View>
          <Switch
            value={settings.dailyReminder}
            onValueChange={(dailyReminder) => update({ dailyReminder })}
            accessibilityLabel="Daily practice reminder"
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </Row>
      </Group>

      {/* Data */}
      <Group title="Data">
        <Row onPress={confirmClearHistory} label="Delete all conversations" last>
          <AppText variant="subhead" style={{ color: theme.colors.danger }}>
            Delete all conversations
          </AppText>
        </Row>
      </Group>

      <View style={styles.about}>
        <AppText variant="footnote" color="textTertiary">
          Version 1.0 · everything is stored on this device
        </AppText>
        <AppText variant="footnote" color="textTertiary">
          {isAiConfigured()
            ? env.aiGatewayUrl
              ? 'AI requests go through your configured gateway.'
              : `${APP_NAME} · ${env.geminiModel}`
            : '⚠️ No AI key configured — add GEMINI_API_KEY to your .env'}
        </AppText>
      </View>

      <Button
        label="Reset settings"
        variant="secondary"
        fullWidth
        onPress={confirmReset}
        style={styles.resetButton}
      />
    </Screen>
  );
}

function Group({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <AppText variant="overline" color="textTertiary">
        {title}
      </AppText>
      <View
        style={[
          styles.card,
          styles.cardFlush,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  children,
  onPress,
  label,
  last = false,
}: {
  readonly children: React.ReactNode;
  readonly onPress?: () => void;
  readonly label: string;
  readonly last?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        !last
          ? {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.surfaceMuted,
            }
          : undefined,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => (pressed ? { backgroundColor: theme.colors.surfaceAlt } : undefined)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pageTitle: { marginBottom: 20 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  group: { gap: 10, marginBottom: 24 },
  card: { borderWidth: 1, padding: 16, gap: 14 },
  cardFlush: { padding: 0, gap: 0, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardRowDivided: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  value: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 40, height: 40 },
  about: { gap: 4, marginBottom: 16 },
  resetButton: { marginBottom: 8 },
});
