import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PERSONALITY_LIST } from '@/data/personalities';
import { useSettings } from '@/state/SettingsContext';
import { useTheme } from '@/theme';
import { LEARNING_GOALS, type AgeBand, type Gender, type PersonalityId } from '@/types';

/**
 * First run (artboard 1a).
 *
 * Three steps on one dark canvas, with a pager at the bottom: name, what they
 * are practising for, and who they will talk to. Everything here is optional -
 * "Skip for now" writes `hasOnboarded` and drops straight into the app, because
 * a speaking app should never gate speaking behind a form.
 */
export function OnboardingScreen(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update, updateProfile } = useSettings();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.profile.name);
  const [gender, setGender] = useState<Gender>(settings.profile.gender);
  const [ageBand, setAgeBand] = useState<AgeBand>(settings.profile.ageBand);
  const [goal, setGoal] = useState(settings.profile.learningGoal);
  const [personalityId, setPersonalityId] = useState<PersonalityId>(settings.personalityId);

  const finish = useCallback(() => {
    updateProfile({ name: name.trim(), learningGoal: goal, gender, ageBand });
    update({ personalityId, hasOnboarded: true });
  }, [ageBand, gender, goal, name, personalityId, update, updateProfile]);

  const next = useCallback(() => {
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }
    finish();
  }, [finish, step]);

  const ctaLabel = useMemo(() => {
    if (step === 0) return "Pick who you'll talk to";
    if (step === 1) return 'Nearly there';
    return 'Start talking';
  }, [step]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.ink }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={[styles.mark, { backgroundColor: theme.colors.primary }]}>
              <AppText variant="calloutStrong" style={{ color: theme.colors.onPrimary }}>
                S
              </AppText>
            </View>
            <AppText variant="subhead" color="onInk">
              Speakora
            </AppText>
          </View>

          <View style={styles.spacerLarge} />

          <AppText variant="display" color="onInk" accessibilityRole="header">
            {step === 2
              ? 'Who should you talk to?'
              : "Let's just talk.\nYou'll get better as we go."}
          </AppText>

          <AppText variant="body" color="onInkMuted" style={styles.intro}>
            {step === 2
              ? 'You can change this any time, and switch mid-way if you want a different energy.'
              : 'No lessons, no quizzes. Pick something to chat about and speak. I will keep notes on the side and you can read them whenever you like.'}
          </AppText>

          <View style={styles.spacer} />

          {step === 0 ? (
            <View style={styles.field}>
              <AppText variant="subhead" color="onInkMuted">
                What should I call you?
              </AppText>
              <View
                style={[
                  styles.input,
                  { borderRadius: theme.radius.md, borderColor: theme.colors.borderStrong },
                ]}
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={theme.colors.onInkFaint}
                  autoCapitalize="words"
                  maxLength={40}
                  returnKeyType="next"
                  onSubmitEditing={next}
                  accessibilityLabel="Your name"
                  style={[theme.typography.body, styles.inputText, { color: theme.colors.onInk }]}
                />
              </View>

              {/* Optional, and it shows: both rows carry a real "rather not
                  say" choice, and nothing downstream reads either answer -
                  they only pick which cartoon face the profile shows. */}
              <AppText variant="footnote" color="onInkFaint">
                These two are optional. They only choose your avatar.
              </AppText>

              <DarkChips
                label="You are"
                choices={GENDER_CHOICES}
                value={gender}
                onSelect={setGender}
              />
              <DarkChips label="Age" choices={AGE_CHOICES} value={ageBand} onSelect={setAgeBand} />
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.field}>
              <AppText variant="subhead" color="onInkMuted">
                What are you practising for?
              </AppText>
              <View style={styles.chips}>
                {LEARNING_GOALS.map((option) => {
                  const selected = goal === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setGoal(selected ? '' : option)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option}
                      style={[
                        styles.chip,
                        {
                          borderRadius: theme.radius.pill,
                          backgroundColor: selected
                            ? theme.colors.primary
                            : 'rgba(255,255,255,0.06)',
                          borderColor: selected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <AppText variant="subhead" style={{ color: theme.colors.onInk }}>
                        {option}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {step === 2 ? (
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
                    // White overlays, not palette tokens: this canvas is `ink`
                    // in every theme, but `primarySoft` and `border` follow the
                    // light/dark scheme - so the selected card was drawing a
                    // near-white fill under the fixed white `onInk` text. The
                    // accent still rides along as the border where it reads.
                    style={[
                      styles.partner,
                      {
                        borderRadius: theme.radius.lg,
                        backgroundColor: selected
                          ? 'rgba(255,255,255,0.16)'
                          : 'rgba(255,255,255,0.06)',
                        borderColor: selected ? theme.colors.primary : 'rgba(255,255,255,0.18)',
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
                    <AppText variant="calloutStrong" color="onInk" align="center">
                      {/* Selection is fill, border weight, a tick and
                          `accessibilityState` - never colour on its own. */}
                      {selected ? '✓ ' : ''}
                      {personality.name}
                    </AppText>
                    <AppText variant="footnote" color="onInkMuted" align="center">
                      {personality.tagline}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.grow} />

          <View style={styles.footer}>
            <Button label={ctaLabel} size="lg" fullWidth onPress={next} />

            <View
              style={styles.pager}
              accessibilityRole="progressbar"
              accessibilityLabel={`Step ${step + 1} of 3`}
            >
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      width: index === step ? 20 : 6,
                      borderRadius: theme.radius.pill,
                      backgroundColor:
                        index === step ? theme.colors.primary : 'rgba(255,255,255,0.24)',
                    },
                  ]}
                />
              ))}
            </View>

            <Button
              label={step === 2 ? 'Skip and explore' : 'Skip for now'}
              variant="ghost"
              fullWidth
              haptic={false}
              onPress={finish}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const GENDER_CHOICES: readonly { readonly value: Gender; readonly label: string }[] = [
  { value: 'female', label: 'Woman' },
  { value: 'male', label: 'Man' },
  { value: 'unspecified', label: 'Rather not say' },
];

const AGE_CHOICES: readonly { readonly value: AgeBand; readonly label: string }[] = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_29', label: '18–29' },
  { value: '30_44', label: '30–44' },
  { value: '45_plus', label: '45+' },
  { value: 'unspecified', label: 'Rather not say' },
];

/**
 * Chips for the onboarding canvas, which is painted on `ink` regardless of
 * theme - the shared profile chips read off `surface` and would vanish here.
 */
function DarkChips<T extends string>({
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
    <View style={styles.chipGroup}>
      <AppText variant="footnote" color="onInkFaint">
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
                  borderColor: selected ? theme.colors.primary : 'rgba(255,255,255,0.24)',
                  backgroundColor: selected ? theme.colors.primary : 'rgba(255,255,255,0.06)',
                  opacity: pressed ? theme.opacity.pressed : 1,
                },
              ]}
            >
              <AppText
                variant={selected ? 'calloutStrong' : 'callout'}
                style={{ color: selected ? theme.colors.onPrimary : theme.colors.onInkMuted }}
              >
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
  chipGroup: { gap: 8 },
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  spacerLarge: { height: 48 },
  spacer: { height: 40 },
  intro: { marginTop: 16 },
  field: { gap: 8 },
  input: {
    height: 52,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
  },
  inputText: { paddingHorizontal: 16, paddingVertical: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partners: { flexDirection: 'row', gap: 10 },
  partner: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 8 },
  grow: { flex: 1, minHeight: 32 },
  footer: { gap: 16 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { height: 6 },
});
