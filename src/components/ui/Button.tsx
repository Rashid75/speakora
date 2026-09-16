import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { MIN_TOUCH_TARGET, useTheme, type Theme } from '@/theme';
import { AppText } from './AppText';

/**
 * Button variants, matching the handoff:
 *   primary   filled accent - the single main action on a screen
 *   ink       filled near-black - secondary emphasis on light surfaces
 *   secondary white with a hairline border
 *   muted     filled grey, no border
 *   ghost     text only
 *   danger    destructive
 */
export type ButtonVariant = 'primary' | 'ink' | 'secondary' | 'muted' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly fullWidth?: boolean;
  /** Rendered before the label. */
  readonly icon?: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly accessibilityHint?: string;
  readonly haptic?: boolean;
  readonly testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  accessibilityHint,
  haptic = true,
  testID,
}: ButtonProps): React.JSX.Element {
  const theme = useTheme();
  const isInactive = disabled || loading;

  const handlePress = useCallback(() => {
    if (isInactive) return;
    if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [haptic, isInactive, onPress]);

  const palette = paletteFor(theme, variant);
  const metrics = METRICS[size];

  return (
    <Pressable
      onPress={handlePress}
      disabled={isInactive}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          borderRadius: theme.radius.md,
          paddingHorizontal: metrics.paddingHorizontal,
          height: metrics.height,
          opacity: isInactive ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.label} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <AppText variant={metrics.variant} style={{ color: palette.label }}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

interface ButtonPalette {
  readonly background: string;
  readonly label: string;
  readonly border: string;
}

const paletteFor = (theme: Theme, variant: ButtonVariant): ButtonPalette => {
  switch (variant) {
    case 'ink':
      return { background: theme.colors.ink, label: theme.colors.onInk, border: 'transparent' };
    case 'secondary':
      return {
        background: theme.colors.surface,
        label: theme.colors.text,
        border: theme.colors.borderStrong,
      };
    case 'muted':
      return {
        background: theme.colors.surfaceMuted,
        label: theme.colors.text,
        border: 'transparent',
      };
    case 'ghost':
      return { background: 'transparent', label: theme.colors.primary, border: 'transparent' };
    case 'danger':
      return {
        background: theme.colors.dangerSoft,
        label: theme.colors.danger,
        border: 'transparent',
      };
    case 'primary':
    default:
      return {
        background: theme.colors.primary,
        label: theme.colors.onPrimary,
        border: 'transparent',
      };
  }
};

/** Heights from the handoff: 40 / 48 / 56, with 44 as the accessible floor. */
const METRICS = {
  sm: { height: MIN_TOUCH_TARGET, paddingHorizontal: 14, variant: 'calloutStrong' },
  md: { height: 48, paddingHorizontal: 18, variant: 'calloutStrong' },
  lg: { height: 56, paddingHorizontal: 24, variant: 'bodyStrong' },
} as const;

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
