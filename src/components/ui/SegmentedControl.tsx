import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from './AppText';

export interface SegmentedOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
}

export interface SegmentedControlProps<T extends string | number> {
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly accessibilityLabel: string;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * The segmented control from artboards 1c and 1j: a muted track with a raised
 * white thumb on the selected segment.
 *
 * Selection is announced through `accessibilityState.selected` as well as the
 * colour and elevation change, so it does not depend on colour alone.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={[
              styles.segment,
              {
                borderRadius: theme.radius.sm,
                backgroundColor: selected ? theme.colors.surface : 'transparent',
              },
            ]}
          >
            <AppText
              variant={selected ? 'calloutStrong' : 'subhead'}
              color={selected ? 'text' : 'neutral'}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, gap: 6 },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
});
