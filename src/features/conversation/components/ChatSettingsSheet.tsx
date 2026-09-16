import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ACCENT_LIST } from '@/data/accents';
import { DIFFICULTY_LIST } from '@/data/difficulty';
import { PERSONALITY_LIST } from '@/data/personalities';
import { useSettings } from '@/state/SettingsContext';
import { useTheme } from '@/theme';
import { SPEAKING_SPEEDS } from '@/types';

export interface ChatSettingsSheetProps {
  readonly visible: boolean;
  readonly isPaused: boolean;
  readonly onClose: () => void;
  readonly onTogglePause: () => void;
  readonly onEnd: () => void;
  /** Clears the transcript and begins the topic again. Confirms first. */
  readonly onStartOver: () => void;
}

/** How often the partner is nudged onto a new angle, in minutes. */
const ROTATION_CHOICES = [3, 5, 8, 12] as const;

/**
 * The in-chat settings sheet, opened from the ⋯ button in the header.
 *
 * Everything here writes straight to the global settings. The engine reads
 * settings through a ref on every turn, so a change lands on the partner's
 * next reply rather than needing the conversation restarted - which is the
 * whole point of putting these controls inside the chat.
 *
 * Pause, Start over and End live here too: the mic row is a single button, so
 * this is the only place left to reach them besides the back arrow.
 */
export function ChatSettingsSheet({
  visible,
  isPaused,
  onClose,
  onTogglePause,
  onEnd,
  onStartOver,
}: ChatSettingsSheetProps): React.JSX.Element {
  const { settings, update } = useSettings();

  return (
    <BottomSheet
      visible={visible}
      title="Conversation settings"
      subtitle="Changes apply from your partner's next reply."
      onClose={onClose}
      footer={<Button label="Done" fullWidth size="lg" variant="ink" onPress={onClose} />}
    >
      <Group title="Who you talk to">
        <View style={styles.chips}>
          {PERSONALITY_LIST.map((personality) => (
            <Chip
              key={personality.id}
              label={personality.name}
              description={personality.tagline}
              selected={settings.personalityId === personality.id}
              onPress={() => update({ personalityId: personality.id })}
              leading={
                <Avatar
                  initial={personality.initial}
                  portrait={personality.portrait}
                  size={28}
                  backgroundColor={personality.avatarColor}
                  textColor={personality.avatarTextColor}
                />
              }
            />
          ))}
        </View>
      </Group>

      <Group title="Accent">
        <View style={styles.chips}>
          {ACCENT_LIST.map((accent) => (
            <Chip
              key={accent.id}
              label={`${accent.flag} ${accent.label}`}
              selected={settings.accent === accent.id}
              onPress={() => update({ accent: accent.id })}
            />
          ))}
        </View>
      </Group>

      <Group title={`Speaking speed · ${settings.speakingSpeed}x`}>
        <SegmentedControl
          accessibilityLabel="Speaking speed"
          options={SPEAKING_SPEEDS.map((speed) => ({ value: speed, label: String(speed) }))}
          value={settings.speakingSpeed}
          onChange={(speakingSpeed) => update({ speakingSpeed })}
        />
      </Group>

      <Group title="Difficulty">
        <View style={styles.chips}>
          {DIFFICULTY_LIST.map((difficulty) => (
            <Chip
              key={difficulty.id}
              label={difficulty.label}
              description={difficulty.shortLabel}
              selected={settings.difficulty === difficulty.id}
              onPress={() => update({ difficulty: difficulty.id })}
            />
          ))}
        </View>
      </Group>

      <Group title="How often the topic moves on">
        <SegmentedControl
          accessibilityLabel="Minutes before the topic moves on"
          options={ROTATION_CHOICES.map((minutes) => ({
            value: minutes,
            label: `${minutes} min`,
          }))}
          value={nearestRotation(settings.topicRotationMinutes)}
          onChange={(topicRotationMinutes) => update({ topicRotationMinutes })}
        />
      </Group>

      <Group title="Behaviour">
        <Toggle
          label="Read replies out loud"
          value={settings.autoSpeak}
          onChange={(autoSpeak) => update({ autoSpeak })}
        />
        <Toggle
          label="Hands-free"
          description="Re-opens the mic after your partner finishes"
          value={settings.handsFreeMode}
          onChange={(handsFreeMode) => update({ handsFreeMode })}
        />
        <Toggle
          label="Collect notes on my replies"
          description="Powers the grammar and polished buttons under each reply"
          value={settings.liveFeedback}
          onChange={(liveFeedback) => update({ liveFeedback })}
        />
        <Toggle
          label="Show words as I speak"
          value={settings.showInterimTranscript}
          onChange={(showInterimTranscript) => update({ showInterimTranscript })}
          last
        />
      </Group>

      <View style={styles.actions}>
        <Button
          label={isPaused ? 'Resume conversation' : 'Pause conversation'}
          variant="secondary"
          fullWidth
          onPress={() => {
            onTogglePause();
            onClose();
          }}
        />
        <Button
          label="Clear messages & start over"
          variant="secondary"
          fullWidth
          accessibilityHint="Deletes this transcript and begins the same topic again"
          onPress={() => {
            onClose();
            onStartOver();
          }}
        />
        <Button
          label="End & review"
          variant="danger"
          fullWidth
          onPress={() => {
            onClose();
            onEnd();
          }}
        />
      </View>
    </BottomSheet>
  );
}

/** Snaps a stored value onto the offered choices so a segment is always lit. */
const nearestRotation = (minutes: number): number =>
  ROTATION_CHOICES.reduce((best, choice) =>
    Math.abs(choice - minutes) < Math.abs(best - minutes) ? choice : best,
  );

function Group({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.group}>
      <AppText variant="overline" color="textTertiary">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Chip({
  label,
  description,
  selected,
  onPress,
  leading,
}: {
  readonly label: string;
  readonly description?: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly leading?: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      style={({ pressed }) => [
        styles.chip,
        {
          opacity: pressed ? theme.opacity.pressed : 1,
          borderRadius: theme.radius.pill,
          // Selected is carried by the border weight and the tick as well as
          // the fill, so it never rests on colour alone.
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
        },
      ]}
    >
      {leading}
      <AppText variant={selected ? 'calloutStrong' : 'callout'}>
        {selected ? '✓ ' : ''}
        {label}
      </AppText>
      {description ? (
        <AppText variant="footnote" color="textTertiary">
          {description}
        </AppText>
      ) : null}
    </Pressable>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
  last = false,
}: {
  readonly label: string;
  readonly description?: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
  readonly last?: boolean;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.toggleRow,
        last ? undefined : { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
      ]}
    >
      <View style={styles.toggleText}>
        <AppText variant="subhead" color="textSecondary">
          {label}
        </AppText>
        {description ? (
          <AppText variant="footnote" color="neutral">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  toggleText: { flex: 1, gap: 2 },
  actions: { gap: 10, paddingTop: 4 },
});
