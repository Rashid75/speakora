import React, { useMemo } from 'react';
import { Text } from 'react-native';

import { AppText, type TextColorKey } from '@/components/ui/AppText';
import { isLookupWorthy } from '@/services/dictionary';
import type { TypographyKey } from '@/theme';

export interface TappableWordsProps {
  readonly text: string;
  /** Given the word exactly as it appears, punctuation already trimmed off. */
  readonly onWordPress: (word: string) => void;
  readonly variant?: TypographyKey;
  readonly color?: TextColorKey;
}

/**
 * A line of transcript whose words can each be tapped.
 *
 * Tap rather than select-then-look-up, which is what this started as: React
 * Native gives no way to read what a `Text` has selected - there is no
 * `onSelectionChange` outside `TextInput` - so a "select a word and add it"
 * flow cannot be built without dropping to native on both platforms. Tapping
 * turns out to be the better interaction anyway, and it is what every reading
 * app does: one tap beats a long press, a drag and a menu.
 *
 * Long-press selection still works. The spans take presses, not long presses,
 * so copying a whole message is untouched.
 *
 * Words are not styled as links. Underlining every word in the transcript
 * would turn a conversation into a page of hyperlinks, and the affordance is
 * carried by the hint and by the first tap instead.
 */
export function TappableWords({
  text,
  onWordPress,
  variant = 'body',
  color,
}: TappableWordsProps): React.JSX.Element {
  const tokens = useMemo(() => tokenise(text), [text]);

  return (
    <AppText
      variant={variant}
      {...(color ? { color } : {})}
      selectable
      accessibilityHint="Tap a word to look it up"
    >
      {tokens.map((token, index) =>
        token.isWord ? (
          <Text
            // Positional: the same word can appear twice in one sentence.
            key={index}
            onPress={() => onWordPress(token.text)}
            // Without this the whole paragraph flashes on iOS when one word
            // inside it is tapped.
            suppressHighlighting
          >
            {token.text}
          </Text>
        ) : (
          token.text
        ),
      )}
    </AppText>
  );
}

interface Token {
  readonly text: string;
  readonly isWord: boolean;
}

/**
 * Splits a line into words and the punctuation between them, losing nothing -
 * the pieces joined back together are the original string.
 *
 * Apostrophes and hyphens are part of a word: "don't" and "well-known" are one
 * tap each rather than three. Anything too short to look up ("a", "I", a bare
 * number) is left as plain text, so a stray tap on it does nothing rather than
 * opening a sheet with nothing to say.
 */
export const tokenise = (text: string): readonly Token[] => {
  const pattern = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
  const tokens: Token[] = [];
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (start > cursor) tokens.push({ text: text.slice(cursor, start), isWord: false });
    tokens.push({ text: match[0], isWord: isLookupWorthy(match[0]) });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) tokens.push({ text: text.slice(cursor), isWord: false });
  return tokens;
};
