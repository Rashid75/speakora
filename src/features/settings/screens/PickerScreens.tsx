import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { OptionRow } from '@/components/ui/OptionRow';
import { Screen } from '@/components/ui/Screen';
import { Section } from '@/components/ui/Section';
import { DIFFICULTY_LIST } from '@/data/difficulty';
import { PERSONALITY_LIST } from '@/data/personalities';
import { TextToSpeech } from '@/services/speech';
import { useSettings } from '@/state/SettingsContext';
import { THEME_LIST, useTheme } from '@/theme';
import { SPEAKING_SPEEDS, type ColorSchemePreference } from '@/types';

/**
 * The single-choice settings screens.
 *
 * Grouped in one file because each is a list of `OptionRow`s over a different
 * catalogue - four separate ~40-line files would be ceremony, not structure.
 */

export function PersonalitySettingsScreen(): React.JSX.Element {
  const { settings, update } = useSettings();

  return (
    <Screen scroll topInset={false}>
      <Section
        title="Conversation partner"
        subtitle="Each one has a different personality, voice and way of speaking"
      >
        <View style={styles.list}>
          {PERSONALITY_LIST.map((personality) => (
            <OptionRow
              key={personality.id}
              leading={
                <Avatar
                  initial={personality.initial}
                  portrait={personality.portrait}
                  size={40}
                  backgroundColor={personality.avatarColor}
                  textColor={personality.avatarTextColor}
                />
              }
              title={`${personality.name} · ${personality.tagline}`}
              description={personality.description}
              selected={settings.personalityId === personality.id}
              onPress={() => {
                update({ personalityId: personality.id });
                void TextToSpeech.speak({
                  text: `Hi, I am ${personality.name}. ${personality.description}`,
                  accent: settings.accent,
                  personalityId: personality.id,
                  speed: settings.speakingSpeed,
                });
              }}
              testID={`personality-${personality.id}`}
            />
          ))}
        </View>
      </Section>
    </Screen>
  );
}

export function SpeedSettingsScreen(): React.JSX.Element {
  const { settings, update } = useSettings();

  return (
    <Screen scroll topInset={false}>
      <Section
        title="Speaking speed"
        subtitle="How fast your partner talks. Tap to hear the difference."
      >
        <View style={styles.list}>
          {SPEAKING_SPEEDS.map((speed) => (
            <OptionRow
              key={speed}
              title={`${speed}×`}
              description={describeSpeed(speed)}
              selected={settings.speakingSpeed === speed}
              onPress={() => {
                update({ speakingSpeed: speed });
                void TextToSpeech.speak({
                  text: 'This is how fast I will speak from now on.',
                  accent: settings.accent,
                  personalityId: settings.personalityId,
                  speed,
                });
              }}
            />
          ))}
        </View>
      </Section>

      <Card>
        <AppText variant="footnote" color="textSecondary">
          Speeds above 1.25× are genuinely hard to follow at first — that is the point. Listening to
          fast speech is one of the quickest ways to improve comprehension.
        </AppText>
      </Card>
    </Screen>
  );
}

const describeSpeed = (speed: number): string => {
  if (speed <= 0.75) return 'Slow and clear — good when you are starting out';
  if (speed === 1) return 'Normal conversational pace';
  if (speed <= 1.25) return 'Slightly brisk, like a confident native speaker';
  if (speed <= 1.5) return 'Fast — real-world pace in a busy room';
  return 'Very fast — serious listening practice';
};

export function DifficultySettingsScreen(): React.JSX.Element {
  const { settings, update } = useSettings();

  return (
    <Screen scroll topInset={false}>
      <Section
        title="Default difficulty"
        subtitle="Controls vocabulary, sentence complexity, idioms and how much your partner accommodates you"
      >
        <View style={styles.list}>
          {DIFFICULTY_LIST.map((difficulty) => (
            <OptionRow
              key={difficulty.id}
              title={`${difficulty.label} · ${difficulty.shortLabel}`}
              description={difficulty.description}
              selected={settings.difficulty === difficulty.id}
              onPress={() => update({ difficulty: difficulty.id })}
              testID={`difficulty-${difficulty.id}`}
            />
          ))}
        </View>
      </Section>

      <Card>
        <AppText variant="footnote" color="textSecondary">
          You can still change difficulty for a single conversation when you start it. This is just
          the default.
        </AppText>
      </Card>
    </Screen>
  );
}

export function ThemeSettingsScreen(): React.JSX.Element {
  const { settings, update } = useSettings();
  const theme = useTheme();

  const schemes: readonly { id: ColorSchemePreference; label: string; description: string }[] = [
    {
      id: 'system',
      label: 'Match my device',
      description: 'Follows your system light/dark setting',
    },
    { id: 'light', label: 'Always light', description: '' },
    { id: 'dark', label: 'Always dark', description: '' },
  ];

  return (
    <Screen scroll topInset={false}>
      <Section title="Theme">
        <View style={styles.list}>
          {THEME_LIST.map((definition) => (
            <OptionRow
              key={definition.id}
              title={definition.name}
              description={definition.description}
              selected={settings.themeId === definition.id}
              onPress={() => update({ themeId: definition.id })}
              testID={`theme-${definition.id}`}
              // A real swatch in the theme's own colour, in a View. The bare
              // string this used to pass crashed the row: `leading` is a
              // ReactNode rendered straight into a View, and React Native will
              // not render a loose string outside a <Text>.
              leading={
                <View
                  style={[
                    styles.themeSwatch,
                    { backgroundColor: definition.swatch, borderColor: theme.colors.border },
                  ]}
                />
              }
            />
          ))}
        </View>
      </Section>

      <Section title="Light or dark">
        <View style={styles.list}>
          {schemes.map((scheme) => (
            <OptionRow
              key={scheme.id}
              title={scheme.label}
              description={scheme.description}
              selected={settings.colorScheme === scheme.id}
              onPress={() => update({ colorScheme: scheme.id })}
            />
          ))}
        </View>
        {THEME_LIST.find((item) => item.id === settings.themeId)?.forcedScheme ? (
          <AppText variant="footnote" color="textSecondary" style={styles.note}>
            {THEMES_NOTE}
          </AppText>
        ) : null}
      </Section>

      <Card>
        <AppText variant="subhead">Preview</AppText>
        <View style={styles.preview}>
          <View
            style={[
              styles.swatch,
              { backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm },
            ]}
          />
          <View
            style={[
              styles.swatch,
              { backgroundColor: theme.colors.success, borderRadius: theme.radius.sm },
            ]}
          />
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radius.sm,
                borderWidth: 1,
                borderColor: theme.colors.border,
              },
            ]}
          />
        </View>
        <AppText variant="footnote" color="textSecondary" style={styles.note}>
          Every screen updates immediately — no restart needed.
        </AppText>
      </Card>
    </Screen>
  );
}

const THEMES_NOTE =
  'Midnight is a dark-only theme, so this setting has no effect while it is selected.';

const styles = StyleSheet.create({
  themeSwatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  list: { gap: 8 },
  note: { marginTop: 10 },
  preview: { flexDirection: 'row', gap: 8, marginTop: 12 },
  swatch: { width: 44, height: 32 },
});
