import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface ScreenProps {
  readonly children?: React.ReactNode;
  /** Wraps content in a ScrollView. Off for screens with their own list. */
  readonly scroll?: boolean;
  readonly padded?: boolean;
  /** Lifts content above the keyboard. On for any screen with a text input. */
  readonly keyboardAware?: boolean;
  /** Extra bottom padding so content clears the tab bar / a floating control. */
  readonly bottomInset?: number;
  /**
   * Pad the top by the safe-area inset. On by default: most screens here run
   * headerless, and without it their first line sits inside the notch / status
   * bar. Turn it off for a screen rendered under a navigator header, which
   * already clears the top edge.
   */
  readonly topInset?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

/**
 * Screen shell: safe areas, background colour, optional scrolling and keyboard
 * handling in one place.
 *
 * Both edges are inset by default. Screens pushed under a native stack header
 * pass `topInset={false}`, because that header has already cleared the notch
 * and applying both would double-pad them.
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  keyboardAware = false,
  bottomInset = 0,
  topInset = true,
  style,
  contentStyle,
  testID,
}: ScreenProps): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const paddingBottom = Math.max(insets.bottom, theme.spacing.md) + bottomInset;
  // Added to the padded value rather than replacing it, so a padded screen
  // keeps its design gutter below the notch instead of losing it.
  const paddingTop = (topInset ? insets.top : 0) + (padded ? theme.spacing.lg : 0);

  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        padded ? { padding: theme.spacing.lg } : undefined,
        { paddingBottom, paddingTop },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        padded ? { padding: theme.spacing.lg } : undefined,
        { paddingBottom, paddingTop },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = keyboardAware ? (
    <KeyboardAvoidingView
      style={styles.flex}
      // iOS needs `padding`; Android's windowSoftInputMode already resizes,
      // and using `padding` there double-counts the keyboard height.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  );

  return (
    <View
      testID={testID}
      style={[styles.flex, { backgroundColor: theme.colors.background }, style]}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
