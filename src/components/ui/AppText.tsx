import React, { useMemo } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme, type ColorTokens, type TypographyKey } from '@/theme';

/** Colour tokens that make sense for text. Fills and borders are excluded. */
export type TextColorKey = Extract<
  keyof ColorTokens,
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'primary'
  | 'primaryStrong'
  | 'onPrimary'
  | 'success'
  | 'successText'
  | 'warning'
  | 'warningText'
  | 'danger'
  | 'info'
  | 'infoText'
  | 'neutral'
  | 'listening'
  | 'speaking'
  | 'processing'
  | 'onInk'
  | 'onInkMuted'
  | 'onInkFaint'
  | 'aiBubbleText'
  | 'userBubbleText'
>;

export interface AppTextProps extends TextProps {
  readonly variant?: TypographyKey;
  readonly color?: TextColorKey;
  readonly align?: TextStyle['textAlign'];
  readonly children?: React.ReactNode;
}

/**
 * The only text primitive in the app.
 *
 * Forcing every string through here is what makes the theme switch total: no
 * component can accidentally hard-code `color: '#111'` or fall back to the
 * system font instead of Space Grotesk. `maxFontSizeMultiplier` keeps layouts
 * intact when a user turns system font scaling up.
 */
export function AppText({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...rest
}: AppTextProps): React.JSX.Element {
  const theme = useTheme();

  const composed = useMemo(
    () => [theme.typography[variant], { color: theme.colors[color], textAlign: align }, style],
    [theme, variant, color, align, style],
  );

  return <Text {...rest} maxFontSizeMultiplier={1.5} style={composed} />;
}
