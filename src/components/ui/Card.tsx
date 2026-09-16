import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface CardProps {
  readonly children: React.ReactNode;
  readonly onPress?: () => void;
  readonly padded?: boolean;
  readonly elevated?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly testID?: string;
}

/** Surface container. Becomes a button automatically when given `onPress`. */
export function Card({
  children,
  onPress,
  padded = true,
  elevated = true,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: CardProps): React.JSX.Element {
  const theme = useTheme();

  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: padded ? theme.spacing.lg : 0,
      overflow: 'hidden',
    },
    elevated ? theme.elevation.card : undefined,
    style,
  ];

  if (!onPress) {
    return (
      <View style={base} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, pressed ? { opacity: theme.opacity.pressed } : undefined]}
    >
      {children}
    </Pressable>
  );
}
