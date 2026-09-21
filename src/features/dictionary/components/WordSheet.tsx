import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/StateViews';
import { useToast } from '@/components/ui/Toast';
import { dictionaryRepository } from '@/repositories';
import { forgetWord, lookUpWord, normaliseWord, saveWord } from '@/services/dictionary';
import { TextToSpeech } from '@/services/speech';
import { useSettings } from '@/state/SettingsContext';
import { useTheme, type Theme } from '@/theme';
import type { AppFailure, WordEntry } from '@/types';
import { copyFor } from '@/utils/errors';
import { isMatch, splitOnWord } from '../highlight';

export interface WordSheetProps {
  /** The word to show. `undefined` closes the sheet. */
  readonly word: string | undefined;
  /** The sentence it was met in, if it came from a conversation. */
  readonly context?: string;
  readonly topicTitle?: string;
  readonly onClose: () => void;
  /** Fired whenever the word list changed, so a list behind this can refresh. */
  readonly onChanged?: () => void;
}

/**
 * Slower than the conversation runs, whatever pace the learner has set for it.
 *
 * A word on its own is being said so it can be copied, not followed - the
 * gap between syllables is the whole point, and at 1.75x there is not one.
 */
const PRONUNCIATION_SPEED = 0.75;

/** Everything the sheet knows about one word. */
interface LookupState {
  readonly word: string;
  readonly isLoading: boolean;
  readonly isSaved: boolean;
  readonly entry?: WordEntry;
  readonly failure?: AppFailure;
}

const blank = (word: string): LookupState => ({
  word,
  isLoading: word.length > 0,
  isSaved: false,
});

/**
 * One word, explained.
 *
 * Opened by tapping a word in the transcript, or a row in the Dictionary. The
 * same sheet both times on purpose: a word means the same thing wherever the
 * learner happens to be looking at it, and two screens that drifted apart
 * would end up teaching two slightly different things.
 *
 * The explanation is written by the same model the learner is talking to, and
 * the sheet says so. That is not a disclaimer for its own sake - a model can
 * be confidently wrong about a word, and someone about to use it in a meeting
 * deserves to know where it came from.
 */
export function WordSheet({
  word,
  context,
  topicTitle,
  onClose,
  onChanged,
}: WordSheetProps): React.JSX.Element {
  const theme = useTheme();
  const toast = useToast();
  const { settings } = useSettings();

  const normalised = word ? normaliseWord(word) : '';
  const [stored, setStored] = useState<LookupState>(() => blank(''));
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Derived rather than cleared in an effect: state for a different word
  // simply does not match, so a new word starts clean without a frame of the
  // last one's meaning showing under the new one's title.
  const view = stored.word === normalised ? stored : blank(normalised);

  // Read from inside async work that outlives the render that started it.
  const isSavedRef = useRef(false);
  useEffect(() => {
    isSavedRef.current = view.isSaved;
  });

  useEffect(() => {
    if (!normalised) return;

    let cancelled = false;
    const controller = new AbortController();

    const settle = (patch: Partial<LookupState>): void => {
      setStored((previous) => ({
        ...(previous.word === normalised ? previous : blank(normalised)),
        ...patch,
      }));
    };

    void (async () => {
      const saved = await dictionaryRepository.get(normalised);
      if (cancelled) return;
      settle({ isSaved: saved !== undefined });

      const result = await lookUpWord({
        word: normalised,
        ...(context ? { context } : {}),
        settings,
        signal: controller.signal,
      });
      if (cancelled) return;

      if (!result.ok) {
        if (result.error.code !== 'cancelled') {
          settle({ isLoading: false, failure: result.error });
        }
        return;
      }

      settle({ isLoading: false, entry: result.value });
      // The lookup can land after the learner has already tapped save, leaving
      // the stored word entry-less. Attach it now, so the Dictionary does not
      // fetch the same word a second time.
      if (isSavedRef.current) void dictionaryRepository.cacheEntry(normalised, result.value);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // `settings` is read once per opening; changing difficulty mid-lookup
    // should not restart the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, normalised]);

  // Only ever stops speech this sheet started. The conversation behind it
  // shares one speaker, and closing a word should not cut the partner off
  // mid-sentence.
  const isSpeakingRef = useRef(false);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  });

  useEffect(
    () => () => {
      if (isSpeakingRef.current) void TextToSpeech.stop();
    },
    [],
  );

  const speakWord = (): void => {
    if (!normalised) return;
    void TextToSpeech.speak({
      text: normalised,
      accent: settings.accent,
      personalityId: settings.personalityId,
      speed: PRONUNCIATION_SPEED,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  // A plain function, not a `useCallback`: `view` is derived on every render,
  // so there is nothing stable to memoise against and the only prop it feeds
  // is a button's `onPress`.
  const toggleSaved = (): void => {
    if (!normalised) return;
    const next = !view.isSaved;

    // Optimistic: the button is the whole interaction, and waiting on a disk
    // write to redraw it makes saving a word feel like submitting a form.
    setStored((previous) => ({
      ...(previous.word === normalised ? previous : blank(normalised)),
      isSaved: next,
    }));

    // Removing is the end of the learner's business with this word, so the
    // sheet gets out of the way at once and the toast carries the result -
    // otherwise the tap leaves them looking at a sheet offering to save back
    // the word they just deleted. Saving keeps the sheet up, because the
    // meaning underneath is the reason they opened it.
    if (!next) {
      onClose();
      toast.show(`Removed \u201c${normalised}\u201d from your words`);
    }

    void (async () => {
      if (next) {
        await saveWord({
          word: normalised,
          ...(context ? { context } : {}),
          ...(topicTitle ? { topicTitle } : {}),
          ...(view.entry ? { entry: view.entry } : {}),
        });
      } else {
        await forgetWord(normalised);
      }
      onChanged?.();
    })();
  };

  const failureCopy = view.failure ? copyFor(view.failure) : undefined;

  return (
    <BottomSheet
      visible={word !== undefined}
      title={normalised || 'Word'}
      subtitle={describeWord(view.entry)}
      onClose={onClose}
      footer={
        <Button
          label={view.isSaved ? 'Remove from my words' : 'Save to my words'}
          variant={view.isSaved ? 'secondary' : 'ink'}
          size="lg"
          fullWidth
          accessibilityHint={
            view.isSaved
              ? 'Takes this word off your list'
              : 'Keeps this word so you can come back to it'
          }
          onPress={toggleSaved}
        />
      }
    >
      {/* First in the sheet and outside the loading branch: hearing a word
          said does not depend on anything coming back from the model, and it
          is often the only thing the learner opened this for. */}
      <Pressable
        onPress={speakWord}
        accessibilityRole="button"
        accessibilityLabel={`Hear ${normalised} spoken`}
        accessibilityHint="Says the word out loud, slowly"
        accessibilityState={{ busy: isSpeaking }}
        style={({ pressed }) => [
          styles.hear,
          {
            backgroundColor: isSpeaking ? theme.colors.primary : theme.colors.primarySoft,
            borderRadius: theme.radius.pill,
            opacity: pressed ? theme.opacity.pressed : 1,
          },
        ]}
      >
        <Icon
          name="speaker"
          size={18}
          color={isSpeaking ? theme.colors.onPrimary : theme.colors.primaryStrong}
        />
        <AppText variant="calloutStrong" color={isSpeaking ? 'onPrimary' : 'primaryStrong'}>
          {isSpeaking ? 'Saying it…' : 'Hear it'}
        </AppText>
      </Pressable>

      {context ? (
        <Section title="Where you met it">
          <AppText variant="body" color="textSecondary" style={styles.quote}>
            {context}
          </AppText>
        </Section>
      ) : null}

      {view.isLoading ? (
        <LoadingState message={`Looking up ${normalised}…`} />
      ) : failureCopy ? (
        <View
          style={[
            styles.failure,
            { backgroundColor: theme.colors.dangerSoft, borderRadius: theme.radius.md },
          ]}
          accessibilityRole="alert"
        >
          <AppText variant="subhead" color="danger">
            {failureCopy.title}
          </AppText>
          <AppText variant="footnote" color="textSecondary">
            {failureCopy.message}
          </AppText>
          {/* Saving still works with no explanation attached: the word is
              worth keeping even when the meaning has to wait for signal. */}
          <AppText variant="footnote" color="textTertiary">
            You can still save it and look it up later.
          </AppText>
        </View>
      ) : view.entry ? (
        <>
          <Section title="What it means">
            <AppText variant="body">{view.entry.meaning}</AppText>
          </Section>

          {view.entry.verbForms ? (
            <Section title="Its three forms">
              <View style={styles.forms}>
                <VerbForm
                  ordinal="1st"
                  label="base"
                  value={view.entry.verbForms.base}
                  theme={theme}
                />
                <VerbForm
                  ordinal="2nd"
                  label="past"
                  value={view.entry.verbForms.past}
                  theme={theme}
                />
                <VerbForm
                  ordinal="3rd"
                  label="participle"
                  value={view.entry.verbForms.pastParticiple}
                  theme={theme}
                />
              </View>
            </Section>
          ) : null}

          <Section title="Similar words">
            {view.entry.synonyms.length > 0 ? (
              <View style={styles.chips}>
                {view.entry.synonyms.map((synonym) => (
                  <View
                    key={synonym}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.colors.primarySoft,
                        borderRadius: theme.radius.pill,
                      },
                    ]}
                  >
                    <AppText variant="callout" color="primaryStrong">
                      {synonym}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : (
              // Said plainly rather than padded out. A loose synonym the
              // learner then uses in earnest is worse than none at all.
              <AppText variant="callout" color="textTertiary">
                No close synonym - this one is worth learning on its own.
              </AppText>
            )}
          </Section>

          <Section title="Used in a sentence">
            {view.entry.examples.map((example) => (
              <View
                key={example}
                style={[
                  styles.example,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Highlighted sentence={example} word={normalised} theme={theme} />
              </View>
            ))}
          </Section>

          <AppText variant="footnote" color="textTertiary">
            Written by your AI partner rather than taken from a dictionary, so it is worth a second
            look before you rely on it.
          </AppText>
        </>
      ) : null}
    </BottomSheet>
  );
}

/**
 * The line under the title: what kind of word it is, and which form was
 * tapped. Both, when both are known - someone who taps "went" opens an entry
 * headed "go", and without "past simple" beside it that looks like a bug.
 */
const describeWord = (entry: WordEntry | undefined): string | undefined => {
  if (!entry) return undefined;
  const parts = [entry.partOfSpeech, entry.formUsed].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  return parts.length > 0 ? parts.join(' · ') : undefined;
};

/** One principal part, labelled the way a learner is taught to count them. */
function VerbForm({
  ordinal,
  label,
  value,
  theme,
}: {
  readonly ordinal: string;
  readonly label: string;
  readonly value: string;
  readonly theme: Theme;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.form,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <AppText variant="caption" color="textTertiary">
        {ordinal} · {label}
      </AppText>
      {/* A dash rather than a blank: the model returning nothing for one part
          is a gap in the answer, not a form that does not exist. */}
      <AppText variant="calloutStrong">{value || '—'}</AppText>
    </View>
  );
}

/**
 * A sentence with the word itself picked out.
 *
 * The examples are the part a learner actually reads, and in a wall of
 * same-weight prose the word they came for disappears into it.
 */
function Highlighted({
  sentence,
  word,
  theme,
}: {
  readonly sentence: string;
  readonly word: string;
  readonly theme: Theme;
}): React.JSX.Element {
  // A capturing split keeps the matches in the output, so the sentence can be
  // rebuilt piece by piece with only those pieces restyled.
  const pieces = splitOnWord(sentence, word);

  return (
    <AppText variant="body">
      {pieces.map((piece, index) =>
        isMatch(piece, word) ? (
          <AppText
            // Pieces are positional and never reordered.
            key={index}
            variant="bodyStrong"
            style={{ color: theme.colors.primaryStrong }}
          >
            {piece}
          </AppText>
        ) : (
          <AppText key={index} variant="body" color="textSecondary">
            {piece}
          </AppText>
        ),
      )}
    </AppText>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <AppText variant="overline" color="textTertiary">
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  hear: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  quote: { fontStyle: 'italic' },
  forms: { flexDirection: 'row', gap: 8 },
  form: { flex: 1, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6 },
  example: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  failure: { padding: 12, gap: 4 },
});
