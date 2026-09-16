import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme } from '@/theme';
import { AppText } from './AppText';

export interface OptionRowProps {
  readonly title: string;
  readonly description?: string;
  /** Rendered on the left: an avatar, a flag, an icon. */
  readonly leading?: React.ReactNode;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  /** Shown in place of the description when the option cannot be used. */
  readonly unavailableNote?: string;
  readonly testID?: string;
}

/**
 * A selectable row in a settings list.
 *
 * Selection is announced through `accessibilityState.selected` and a tick
 * glyph, not by colour alone, so it survives both a colour-blind user and a
 * theme where primary and text are close in luminance.
 */
export function OptionRow({
  title,
  description,
  leading,
  selected,
  onPress,
  disabled = false,
  unavailableNote,
  testID,
}: OptionRowProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={title}
      accessibilityHint={unavailableNote ?? description}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.md,
          padding: theme.spacing.lg,
          opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1,
        },
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      <View style={styles.body}>
        <AppText variant="bodyStrong" color={selected ? 'primary' : 'text'}>
          {title}
        </AppText>
        {unavailableNote ? (
          <AppText variant="footnote" color="warning" style={styles.description}>
            {unavailableNote}
          </AppText>
        ) : description ? (
          <AppText variant="footnote" color="textSecondary" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>

      <AppText
        variant="headline"
        color={selected ? 'primary' : 'textTertiary'}
        accessibilityElementsHidden
      >
        {selected ? '✓' : ''}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
    gap: 12,
  },
  leading: { width: 44, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  description: { marginTop: 2 },
});
