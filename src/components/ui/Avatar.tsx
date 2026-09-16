import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { PortraitSpec } from '@/data/portraits';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { Portrait } from './Portrait';

export interface AvatarProps {
  /** Single letter. Longer strings are truncated to keep the disc legible. */
  readonly initial: string;
  /**
   * An illustrated face, drawn instead of the initial. Takes priority over
   * `glyph`, which in turn takes priority over the letter.
   */
  readonly portrait?: PortraitSpec;
  /** Drawn instead of the initial. Falls back to the letter when omitted. */
  readonly glyph?: IconName;
  readonly size: number;
  readonly backgroundColor: string;
  readonly textColor: string;
  readonly style?: StyleProp<ViewStyle>;
  /** Accessible name, e.g. the partner's full name. */
  readonly label?: string;
}

/**
 * The letter-in-a-disc avatar from the design handoff, used at 24, 32, 44, 52,
 * 64 and 84px across the app.
 *
 * Font size is derived from the disc size rather than hard-coded per call site,
 * so a new size slots in without anyone picking a mismatched type scale. The
 * 0.38 ratio reproduces the handoff's pairs (84->30, 52->20, 44->16, 32->14).
 */
export function Avatar({
  initial,
  portrait,
  glyph,
  size,
  backgroundColor,
  textColor,
  style,
  label,
}: AvatarProps): React.JSX.Element {
  const theme = useTheme();
  const fontSize = Math.round(size * 0.38);

  return (
    <View
      accessible={label !== undefined}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: theme.radius.pill,
          backgroundColor,
          // The portrait is a square that the disc clips into a circle.
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {portrait ? (
        <Portrait spec={portrait} size={size} />
      ) : glyph ? (
        <Icon name={glyph} size={Math.round(size * 0.62)} color={textColor} />
      ) : (
        <AppText
          // The letter is decorative once `label` names the person.
          accessibilityElementsHidden
          style={[
            theme.typography.bodyStrong,
            { fontSize, lineHeight: Math.round(fontSize * 1.28), color: textColor },
          ]}
        >
          {initial.slice(0, 1).toUpperCase()}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
