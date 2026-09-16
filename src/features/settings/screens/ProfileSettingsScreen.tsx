import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { OptionRow } from '@/components/ui/OptionRow';
import { Screen } from '@/components/ui/Screen';
import { Section } from '@/components/ui/Section';
import { TextField } from '@/components/ui/TextField';
import { ProfileIdentityFields } from '../components/ProfileIdentityFields';
import { useSettings } from '@/state/SettingsContext';
import { CEFR_LEVELS, type CefrLevel } from '@/types';
import { describeLevel } from '@/utils/cefr';

const GOAL_SUGGESTIONS = [
  'Pass a job interview in English',
  'Speak confidently in work meetings',
  'Travel without switching to my own language',
  'Stop translating in my head',
];

/**
 * Profile.
 *
 * `selfReportedLevel` is stored separately from the measured level and is only
 * used to seed prompts before we have real evidence - the Statistics badge
 * always shows the measured value, never what the learner claimed.
 */
export function ProfileSettingsScreen(): React.JSX.Element {
  const { settings, updateProfile } = useSettings();
  const [name, setName] = useState(settings.profile.name);
  const [goal, setGoal] = useState(settings.profile.learningGoal);

  const commitName = (): void => updateProfile({ name: name.trim() });
  const commitGoal = (value: string): void => {
    setGoal(value);
    updateProfile({ learningGoal: value.trim() });
  };

  return (
    <Screen scroll keyboardAware topInset={false}>
      <Section
        title="About you"
        subtitle="Optional. Only used to suggest an avatar — nothing else reads it."
      >
        <ProfileIdentityFields profile={settings.profile} onChange={updateProfile} />
      </Section>

      <Section title="Your name" subtitle="Used occasionally, the way a friend would">
        <TextField
          value={name}
          onChangeText={setName}
          onBlur={commitName}
          placeholder="What should we call you?"
          autoCapitalize="words"
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={commitName}
          label="Name"
          helper="Leave empty if you would rather not be named."
        />
      </Section>

      <Section title="Learning goal" subtitle="Shown on your home screen to keep you focused">
        <TextField
          value={goal}
          onChangeText={setGoal}
          onBlur={() => commitGoal(goal)}
          placeholder="What are you working towards?"
          multiline
          rows={3}
          maxLength={200}
          counterMax={200}
          label="Goal"
        />
        <View style={styles.suggestions}>
          {GOAL_SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              label={suggestion}
              variant="secondary"
              size="sm"
              haptic={false}
              onPress={() => commitGoal(suggestion)}
            />
          ))}
        </View>
      </Section>

      <Section
        title="Your starting level"
        subtitle="Only used until we have measured you from real conversations"
      >
        <View style={styles.levels}>
          <OptionRow
            title="I am not sure"
            description="We will work it out from your first few conversations"
            selected={settings.profile.selfReportedLevel === 'unknown'}
            onPress={() => updateProfile({ selfReportedLevel: 'unknown' })}
          />
          {CEFR_LEVELS.map((level: CefrLevel) => (
            <OptionRow
              key={level}
              title={level}
              description={describeLevel(level)}
              selected={settings.profile.selfReportedLevel === level}
              onPress={() => updateProfile({ selfReportedLevel: level })}
            />
          ))}
        </View>
        <AppText variant="footnote" color="textTertiary" style={styles.note}>
          This never overrides the level shown in Statistics — that one is always measured from what
          you actually say.
        </AppText>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  levels: { gap: 8 },
  note: { marginTop: 12 },
});
