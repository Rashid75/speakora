import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { isSingleWord, normaliseWord } from '@/services/dictionary';

export interface AddWordSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  /** Receives the normalised word, so the caller never has to tidy it again. */
  readonly onSubmit: (word: string) => void;
}

/**
 * Type a word straight into the list.
 *
 * Most words arrive by tapping one mid-conversation, which is the better way
 * in - it comes with the sentence it was met in. This is for the rest: a word
 * heard on the bus, read in an email, or half-remembered from yesterday, which
 * would otherwise be lost because it did not happen inside the app.
 *
 * Those words have no context sentence, and that is fine. The lookup already
 * handles a bare word by explaining its most common sense.
 *
 * One word only. A pasted sentence would be looked up as if it were a word,
 * and the entry that came back would be nonsense - so it is refused here,
 * where the learner can still see what they typed and fix it.
 */
export function AddWordSheet({ visible, onClose, onSubmit }: AddWordSheetProps): React.JSX.Element {
  const [draft, setDraft] = useState('');

  // Reset during render rather than in an effect: an effect would show the
  // previous word for one frame as the sheet opens. React documents adjusting
  // state during render for exactly this.
  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (visible) setDraft('');
  }

  const normalised = normaliseWord(draft);
  const typed = draft.trim();
  const canAdd = isSingleWord(draft);

  const submit = (): void => {
    if (!canAdd) return;
    onSubmit(normalised);
  };

  return (
    <BottomSheet
      visible={visible}
      title="Add a word"
      subtitle="Anything you want to keep. It goes straight into your list."
      onClose={onClose}
      footer={
        <Button
          label="Add to my words"
          size="lg"
          fullWidth
          disabled={!canAdd}
          onPress={submit}
          accessibilityHint="Saves the word and opens what it means"
        />
      }
    >
      <TextField
        value={draft}
        onChangeText={setDraft}
        placeholder="e.g. reluctant"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={60}
        returnKeyType="done"
        onSubmitEditing={submit}
        label="Word"
        helper="One word at a time. Hyphens and apostrophes are fine."
        {...(typed.length > 0 && !canAdd ? { error: problemWith(typed) } : {})}
      />

      {canAdd && normalised !== draft.trim().toLowerCase() ? (
        <View style={styles.note}>
          <AppText variant="footnote" color="textTertiary">
            Saved as “{normalised}”.
          </AppText>
        </View>
      ) : null}
    </BottomSheet>
  );
}

/**
 * Why this input was refused, in the terms the learner typed it in.
 *
 * Named cases rather than one catch-all message: "that is not valid" tells
 * someone who pasted a sentence nothing about what to do next.
 */
const problemWith = (typed: string): string => {
  if (/\s/.test(typed)) return 'Just one word, please — add the others separately.';
  if (/\d/.test(typed)) return 'Words only, no numbers.';
  if (normaliseWord(typed).length < 2) return 'A little short — try two letters or more.';
  return 'Letters only, apart from a hyphen or apostrophe inside the word.';
};

const styles = StyleSheet.create({
  note: { paddingTop: 2 },
});
