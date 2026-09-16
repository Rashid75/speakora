import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from './AppText';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  readonly label?: string;
  readonly helper?: string;
  readonly error?: string;
  readonly multiline?: boolean;
  /** Rows of visible height when multiline. */
  readonly rows?: number;
  readonly counterMax?: number;
  /**
   * Style for the field's wrapper, not the input itself - the input's own
   * appearance comes from theme tokens and is deliberately not overridable.
   */
  readonly style?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  helper,
  error,
  multiline = false,
  rows = 4,
  counterMax,
  value,
  onFocus,
  onBlur,
  style,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  const length = typeof value === 'string' ? value.length : 0;

  return (
    <View style={style}>
      {label ? (
        <AppText variant="subhead" color="textSecondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <TextInput
        {...rest}
        value={value}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        accessibilityLabel={label}
        accessibilityHint={helper}
        placeholderTextColor={theme.colors.textTertiary}
        // Android otherwise vertically centres multiline text.
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          theme.typography.body,
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.md,
            minHeight: multiline ? rows * 24 + 24 : 48,
          },
        ]}
      />

      <View style={styles.footer}>
        <View style={styles.footerText}>
          {error ? (
            <AppText variant="footnote" color="danger">
              {error}
            </AppText>
          ) : helper ? (
            <AppText variant="footnote" color="textTertiary">
              {helper}
            </AppText>
          ) : null}
        </View>
        {counterMax ? (
          <AppText variant="footnote" color={length > counterMax ? 'danger' : 'textTertiary'}>
            {length}/{counterMax}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    minHeight: 16,
  },
  footerText: { flex: 1, paddingRight: 8 },
});
