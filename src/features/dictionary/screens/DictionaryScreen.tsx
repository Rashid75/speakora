import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { useAsyncData } from '@/hooks/useAsyncData';
import { dictionaryRepository, statisticsRepository } from '@/repositories';
import { normaliseWord, saveWord } from '@/services/dictionary';
import { HIT_SLOP, useTheme } from '@/theme';
import type { SavedWord } from '@/types';
import { formatRelativeDay } from '@/utils/time';
import { AddWordSheet } from '../components/AddWordSheet';
import { WordSheet } from '../components/WordSheet';

interface DictionaryData {
  readonly words: readonly SavedWord[];
  /** Words the coach offered mid-conversation that are not on the list yet. */
  readonly suggestions: readonly string[];
}

/** How many suggestions are worth showing before the list becomes a wall. */
const MAX_SUGGESTIONS = 12;

const loadWords = async (): Promise<DictionaryData> => {
  const [words, stats] = await Promise.all([
    dictionaryRepository.list(),
    statisticsRepository.snapshot(),
  ]);

  // Anything already saved is not a suggestion any more, it is a row further
  // down the same screen.
  const saved = new Set(words.map((word) => word.id));
  return {
    words,
    suggestions: stats.newVocabulary
      .filter((word) => !saved.has(normaliseWord(word)))
      .slice(0, MAX_SUGGESTIONS),
  };
};

/** What the sheet needs, from either a saved row or a word typed by hand. */
interface OpenWord {
  readonly word: string;
  readonly context?: string;
  readonly topicTitle?: string;
}

/**
 * My words.
 *
 * A word list the learner built themselves, out of conversations they actually
 * had - which is the whole reason it is worth revising. Each row keeps the
 * sentence the word was met in, because "the thing my partner said about
 * weekend plans" is a far better handle on a word than a definition is.
 *
 * Tapping a row opens the same sheet as tapping the word in the chat did, with
 * the meaning, the close synonyms and three sentences using it.
 */
export function DictionaryScreen(): React.JSX.Element {
  const theme = useTheme();
  const { data, state, reload } = useAsyncData(loadWords);
  const [isAdding, setIsAdding] = useState(false);
  // One open word, whether it came from a row or was typed in. A hand-typed
  // one simply has no context sentence behind it.
  const [openWord, setOpenWord] = useState<OpenWord | undefined>(undefined);

  // A word saved in a conversation should be here by the time the learner
  // arrives, without them having to pull to refresh.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const words = data?.words ?? [];
  const suggestions = data?.suggestions ?? [];

  /**
   * Saved first, then explained.
   *
   * The learner typed the word deliberately, so the list should have it
   * whether or not the lookup succeeds - and it has to be on the list before
   * the sheet reads its saved state, or the sheet opens offering to save a
   * word that is already there.
   */
  const addWord = useCallback(
    (word: string) => {
      setIsAdding(false);
      void saveWord({ word }).then(() => {
        reload();
        setOpenWord({ word });
      });
    },
    [reload],
  );

  if (state === 'loading' && data === undefined) {
    return (
      <Screen>
        <LoadingState message="Getting your words…" />
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AppText variant="title2" accessibilityRole="header" style={styles.flex}>
            My words
          </AppText>
          {/* Icon only, so the heading keeps the row. A labelled button here
              competed with "My words" for the eye; the accent disc reads as
              the one action on the screen without shouting. The label lives
              in `accessibilityLabel`, which is where it has to be anyway. */}
          <Pressable
            onPress={() => setIsAdding(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a word"
            accessibilityHint="Type a word to save to your list"
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [
              styles.add,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.pill,
                opacity: pressed ? theme.opacity.pressed : 1,
              },
            ]}
          >
            <Icon name="plus" size={20} color={theme.colors.onPrimary} strokeWidth={2.4} />
          </Pressable>
        </View>
        <AppText variant="callout" color="textSecondary">
          Words you picked up in your own conversations.
        </AppText>
      </View>

      {/* Moved here from Progress, where it was a row of chips nobody could
          do anything with. On this screen a suggestion is one tap from being
          explained and one more from being kept, which is the only reason to
          show it at all. */}
      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          <AppText variant="overline" color="textTertiary" style={styles.sectionLabel}>
            Suggested for you
          </AppText>
          {/* One line tall however many there are. Wrapped chips grew to four
              rows on a good week and pushed the learner's own words off the
              screen, which is the wrong way round on a screen called My
              words. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {suggestions.map((word) => (
              <Pressable
                key={word}
                onPress={() => setOpenWord({ word })}
                accessibilityRole="button"
                accessibilityLabel={`${word}, suggested`}
                accessibilityHint="Opens the meaning, and lets you save it"
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primarySoft,
                    borderColor: theme.colors.primarySoftStrong,
                    borderRadius: theme.radius.pill,
                    opacity: pressed ? theme.opacity.pressed : 1,
                  },
                ]}
              >
                <Icon name="plus" size={13} color={theme.colors.primaryStrong} strokeWidth={2.6} />
                <AppText variant="calloutStrong" color="primaryStrong">
                  {word}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {words.length === 0 ? (
        <EmptyState
          emoji="📒"
          title="No words yet"
          message={
            "Tap any word in a chat - yours or your partner's - to see what it means in that " +
            'sentence, with similar words and examples. Save the ones worth keeping and they ' +
            'collect here.'
          }
          actionLabel="Add a word"
          onAction={() => setIsAdding(true)}
        />
      ) : (
        <View style={styles.listSection}>
          <AppText variant="overline" color="textTertiary" style={styles.sectionLabel}>
            Saved · {words.length}
          </AppText>
          <View style={styles.list}>
            {words.map((saved) => (
              <Pressable
                key={saved.id}
                onPress={() =>
                  setOpenWord({
                    word: saved.word,
                    ...(saved.context ? { context: saved.context } : {}),
                    ...(saved.topicTitle ? { topicTitle: saved.topicTitle } : {}),
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={saved.word}
                accessibilityHint="Opens the meaning, similar words and example sentences"
                style={({ pressed }) => [
                  styles.row,
                  theme.elevation.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.lg,
                    opacity: pressed ? theme.opacity.pressed : 1,
                  },
                ]}
              >
                {/* The initial gives a long list some rhythm to scan down, and
                  it is the thing people actually search a word list by. */}
                <View
                  style={[
                    styles.initial,
                    {
                      backgroundColor: theme.colors.primarySoft,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <AppText variant="bodyStrong" color="primaryStrong" accessibilityElementsHidden>
                    {saved.word.charAt(0).toUpperCase()}
                  </AppText>
                </View>

                <View style={styles.rowText}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {saved.word}
                  </AppText>

                  {saved.entry ? (
                    <AppText variant="callout" color="textSecondary" numberOfLines={2}>
                      {saved.entry.meaning}
                    </AppText>
                  ) : saved.context ? (
                    <AppText variant="callout" color="textTertiary" numberOfLines={2}>
                      {saved.context}
                    </AppText>
                  ) : (
                    // Said as the next step rather than as a missing field: a
                    // word added by hand has no meaning stored until it is
                    // opened once.
                    <AppText variant="callout" color="textTertiary">
                      Tap to look it up
                    </AppText>
                  )}

                  <AppText variant="footnote" color="textTertiary" numberOfLines={1}>
                    {saved.topicTitle ? `${saved.topicTitle} · ` : ''}
                    {formatRelativeDay(saved.savedAt)}
                  </AppText>
                </View>

                <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <AddWordSheet visible={isAdding} onClose={() => setIsAdding(false)} onSubmit={addWord} />

      <WordSheet
        word={openWord?.word}
        {...(openWord?.context ? { context: openWord.context } : {})}
        {...(openWord?.topicTitle ? { topicTitle: openWord.topicTitle } : {})}
        onClose={() => setOpenWord(undefined)}
        onChanged={reload}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  header: { gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  add: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },

  sectionLabel: { marginBottom: 2 },
  suggestions: { gap: 8 },
  // On the horizontal scroller rather than the row, so the last chip is not
  // jammed against the edge of the screen.
  chips: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },

  listSection: { gap: 8 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  initial: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 3 },
});
