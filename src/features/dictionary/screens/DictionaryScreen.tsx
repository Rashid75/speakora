import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { useAsyncData } from '@/hooks/useAsyncData';
import { dictionaryRepository } from '@/repositories';
import { saveWord } from '@/services/dictionary';
import { HIT_SLOP, useTheme } from '@/theme';
import type { SavedWord } from '@/types';
import { formatRelativeDay } from '@/utils/time';
import { AddWordSheet } from '../components/AddWordSheet';
import { WordSheet } from '../components/WordSheet';

const loadWords = (): Promise<readonly SavedWord[]> => dictionaryRepository.list();

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

  const words = data ?? [];

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
          {words.length === 0
            ? 'Words you save while talking end up here — or add your own.'
            : `${words.length} ${words.length === 1 ? 'word' : 'words'} saved`}
        </AppText>
      </View>

      {words.length === 0 ? (
        <EmptyState
          emoji="📒"
          title="No words yet"
          message="Tap any word in a conversation to see what it means, then save it. They collect here for later."
          actionLabel="Add a word"
          onAction={() => setIsAdding(true)}
        />
      ) : (
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
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                  opacity: pressed ? theme.opacity.pressed : 1,
                },
              ]}
            >
              <View style={styles.rowText}>
                <View style={styles.rowTitle}>
                  <AppText variant="bodyStrong">{saved.word}</AppText>
                  {/* Only claimed when there really is one stored: a row that
                      says "ready" and then spins is worse than one that says
                      nothing. */}
                  {saved.entry ? (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: theme.colors.successSoft,
                          borderRadius: theme.radius.pill,
                        },
                      ]}
                    >
                      <AppText variant="footnote" color="successText">
                        Saved offline
                      </AppText>
                    </View>
                  ) : null}
                </View>

                {saved.entry ? (
                  <AppText variant="callout" color="textSecondary" numberOfLines={2}>
                    {saved.entry.meaning}
                  </AppText>
                ) : saved.context ? (
                  <AppText variant="callout" color="textTertiary" numberOfLines={2}>
                    {saved.context}
                  </AppText>
                ) : null}

                <AppText variant="footnote" color="textTertiary">
                  {saved.topicTitle ? `${saved.topicTitle} · ` : ''}
                  {formatRelativeDay(saved.savedAt)}
                </AppText>
              </View>

              <Icon name="chevronRight" size={12} color={theme.colors.textTertiary} />
            </Pressable>
          ))}
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
  content: { gap: 16 },
  header: { gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  add: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 1 },
});
