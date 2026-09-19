import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Section } from '@/components/ui/Section';
import { LoadingState } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { getDifficulty } from '@/data/difficulty';
import type { RootStackParamList } from '@/navigation/types';
import { useSettings } from '@/state/SettingsContext';
import { useTheme } from '@/theme';
import { copyFor } from '@/utils/errors';
import { MIN_PROMPT_LENGTH, useCustomTopicBuilder } from '../hooks/useCustomTopicBuilder';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomTopic'>;

const EXAMPLE = `I am a senior frontend developer and I need to explain a production outage to our CTO. He should challenge my explanation, ask why we did not catch it in testing, and push me on what I will change. Make him sceptical but fair.`;

/**
 * Two-step custom topic creation: write freely, then review what the AI made
 * of it. Nothing is saved until the learner approves the scenario.
 */
export function CustomTopicScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const { settings } = useSettings();
  const builder = useCustomTopicBuilder();
  const [prompt, setPrompt] = useState('');
  // Held so "Improve my description" is reversible - the learner's own wording
  // is the thing most worth being able to get back.
  const [previousPrompt, setPreviousPrompt] = useState<string | undefined>(undefined);

  const trimmedLength = prompt.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < MIN_PROMPT_LENGTH;

  const handleSave = useCallback(async () => {
    const topic = await builder.save(prompt);
    if (!topic) return;
    navigation.replace('ConversationSetup', { topic });
  }, [builder, navigation, prompt]);

  if (builder.stage === 'optimizing') {
    return (
      <Screen topInset={false}>
        <LoadingState message="Turning your idea into a scenario…" />
      </Screen>
    );
  }

  if (builder.stage === 'review' || builder.stage === 'saving') {
    const draft = builder.draft;
    if (!draft) return <Screen topInset={false} />;

    return (
      <Screen scroll topInset={false}>
        <AppText variant="title2">Here is your scenario</AppText>
        <AppText variant="callout" color="textSecondary" style={styles.intro}>
          Check it reads the way you intended. You can go back and rewrite it.
        </AppText>

        <Card style={styles.card}>
          <AppText variant="display" accessibilityElementsHidden>
            {draft.emoji}
          </AppText>
          <AppText variant="title3" style={styles.cardTitle}>
            {draft.title}
          </AppText>
          <AppText variant="callout" color="textSecondary">
            {draft.summary}
          </AppText>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <AppText variant="caption" color="textTertiary">
            YOUR PARTNER WILL BE
          </AppText>
          <AppText variant="body" style={styles.scenario}>
            {draft.scenario}
          </AppText>

          {/* All of them, not just the first: the learner is about to see one
              of these at random, and showing a single line would promise an
              opening the conversation may well not use. */}
          <AppText variant="caption" color="textTertiary" style={styles.label}>
            {draft.openingLines.length > 1 ? 'THEY MIGHT OPEN WITH' : 'THEY WILL OPEN WITH'}
          </AppText>
          {draft.openingLines.map((line) => (
            <AppText key={line} variant="body" color="textSecondary" style={styles.opening}>
              “{line}”
            </AppText>
          ))}

          {draft.talkingPoints.length > 0 ? (
            <>
              <AppText variant="caption" color="textTertiary" style={styles.label}>
                LIKELY DIRECTIONS
              </AppText>
              {draft.talkingPoints.map((point) => (
                <AppText key={point} variant="footnote" color="textSecondary">
                  • {point}
                </AppText>
              ))}
            </>
          ) : null}

          <AppText variant="caption" color="textTertiary" style={styles.label}>
            SUGGESTED LEVEL
          </AppText>
          <AppText variant="footnote" color="textSecondary">
            {getDifficulty(draft.suggestedDifficulty).label}
          </AppText>
        </Card>

        {builder.error ? (
          <AppText variant="footnote" color="danger" style={styles.error}>
            {copyFor(builder.error).message}
          </AppText>
        ) : null}

        <Button
          label="Save & start"
          size="lg"
          fullWidth
          loading={builder.stage === 'saving'}
          onPress={() => void handleSave()}
          style={styles.primaryAction}
        />
        <Button
          label="Rewrite my description"
          variant="ghost"
          fullWidth
          onPress={builder.backToEditing}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAware topInset={false}>
      <AppText variant="title2">Describe what you want to practise</AppText>
      <AppText variant="callout" color="textSecondary" style={styles.intro}>
        Write it however you like. Say who the other person is, what the situation is, and what
        should make it challenging.
      </AppText>

      <TextField
        value={prompt}
        onChangeText={setPrompt}
        placeholder={EXAMPLE}
        multiline
        rows={9}
        counterMax={1500}
        maxLength={1500}
        autoCapitalize="sentences"
        label="Your scenario"
        helper={
          tooShort
            ? `A little more detail helps — at least ${MIN_PROMPT_LENGTH} characters.`
            : 'The more specific you are, the better the role-play.'
        }
        error={
          builder.error && builder.error.code !== 'cancelled'
            ? copyFor(builder.error).message
            : undefined
        }
        style={styles.field}
      />

      {/* One step before building: the rough description is rewritten into a
          fuller one and put back in the field, so the learner reads and edits
          it rather than having it swapped in behind the "Create" button. */}
      <View style={styles.refineRow}>
        <Button
          label={previousPrompt ? 'Improve it again' : 'Improve my description'}
          variant="secondary"
          size="md"
          fullWidth
          loading={builder.stage === 'refining'}
          disabled={trimmedLength < MIN_PROMPT_LENGTH || builder.stage === 'refining'}
          onPress={() => {
            const before = prompt;
            void builder.refine(prompt, settings).then((better) => {
              if (!better) return;
              setPreviousPrompt(before);
              setPrompt(better);
            });
          }}
          accessibilityHint="Rewrites what you wrote into a fuller scenario you can still edit"
        />

        {previousPrompt ? (
          <Button
            label="Undo — put my own words back"
            variant="ghost"
            size="sm"
            fullWidth
            onPress={() => {
              setPrompt(previousPrompt);
              setPreviousPrompt(undefined);
            }}
          />
        ) : null}
      </View>

      <Section title="Not sure where to start?">
        <Card onPress={() => setPrompt(EXAMPLE)} accessibilityLabel="Use the example scenario">
          <AppText variant="footnote" color="textSecondary">
            {EXAMPLE}
          </AppText>
          <AppText variant="caption" color="primary" style={styles.useExample}>
            Tap to use this example
          </AppText>
        </Card>
      </Section>

      <Button
        label="Create scenario"
        size="lg"
        fullWidth
        disabled={trimmedLength < MIN_PROMPT_LENGTH || builder.stage === 'refining'}
        onPress={() => builder.optimize(prompt, settings)}
        accessibilityHint="Sends your description to be turned into a role-play"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 6, marginBottom: 20 },
  refineRow: { gap: 6, marginBottom: 20 },
  field: { marginBottom: 12 },
  card: { marginBottom: 20 },
  cardTitle: { marginTop: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  scenario: { marginTop: 6 },
  opening: { marginTop: 4, fontStyle: 'italic' },
  label: { marginTop: 16, marginBottom: 4 },
  useExample: { marginTop: 10 },
  error: { marginBottom: 12 },
  primaryAction: { marginBottom: 8 },
});
