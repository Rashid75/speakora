import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { avatarFor } from '@/data/portraits';
import { useTheme } from '@/theme';
import type { AgeBand, Gender, UserProfile } from '@/types';

export interface ProfileIdentityFieldsProps {
  readonly profile: UserProfile;
  readonly onChange: (patch: Partial<UserProfile>) => void;
}

const GENDER_CHOICES: readonly { readonly value: Gender; readonly label: string }[] = [
  { value: 'female', label: 'Woman' },
  { value: 'male', label: 'Man' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

const AGE_CHOICES: readonly { readonly value: AgeBand; readonly label: string }[] = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_29', label: '18–29' },
  { value: '30_44', label: '30–44' },
  { value: '45_plus', label: '45+' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

/**
 * Age and gender, with a live preview of the face they produce.
 *
 * There is no avatar picker: the two answers choose it, so a third control
 * could only ever contradict them. Both are optional, and "Prefer not to say"
 * is a real answer with its own neutral face rather than a dead end.
 *
 * Nothing else in the app reads either field - not the prompts, not the
 * difficulty, not the feedback. They pick a cartoon face and stop there.
 */
export function ProfileIdentityFields({
  profile,
  onChange,
}: ProfileIdentityFieldsProps): React.JSX.Element {
  const theme = useTheme();
  const avatar = avatarFor(profile.gender, profile.ageBand);

  return (
    <View style={styles.wrap}>
      <View style={styles.preview}>
        <Avatar
          initial={profile.name.trim().charAt(0) || 'Y'}
          portrait={avatar.spec}
          size={64}
          backgroundColor={theme.colors.primarySoftStrong}
          textColor={theme.colors.primaryStrong}
          label={`Your avatar: ${avatar.label}`}
        />
        <View style={styles.previewText}>
          <AppText variant="calloutStrong">Your avatar</AppText>
          <AppText variant="footnote" color="neutral">
            Chosen from your answers below. It changes as you change them.
          </AppText>
        </View>
      </View>

      <ChipRow
        label="Gender"
        choices={GENDER_CHOICES}
        value={profile.gender}
        onSelect={(gender) => onChange({ gender })}
      />

      <ChipRow
        label="Age"
        choices={AGE_CHOICES}
        value={profile.ageBand}
        onSelect={(ageBand) => onChange({ ageBand })}
      />
    </View>
  );
}

function ChipRow<T extends string>({
  label,
  choices,
  value,
  onSelect,
}: {
  readonly label: string;
  readonly choices: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onSelect: (value: T) => void;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      <AppText variant="subhead" color="textSecondary">
        {label}
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Pressable
              key={choice.value}
              onPress={() => onSelect(choice.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={choice.label}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderRadius: theme.radius.pill,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                  opacity: pressed ? theme.opacity.pressed : 1,
                },
              ]}
            >
              <AppText variant={selected ? 'calloutStrong' : 'callout'}>
                {selected ? '✓ ' : ''}
                {choice.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  previewText: { flex: 1, gap: 2 },
  group: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
});
