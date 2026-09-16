import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from './AppText';

export interface SectionProps {
  readonly title?: string;
  readonly subtitle?: string;
  /** Rendered on the right of the header - usually a "See all" button. */
  readonly action?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

/** Titled block used to give every screen the same vertical rhythm. */
export function Section({
  title,
  subtitle,
  action,
  children,
  style,
}: SectionProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={[{ marginBottom: theme.spacing.xxl }, style]}>
      {title || action ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? (
              <AppText variant="title3" accessibilityRole="header">
                {title}
              </AppText>
            ) : null}
            {subtitle ? (
              <AppText variant="footnote" color="textSecondary" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Groups rows into a single bordered surface with dividers between them. */
export function SettingsGroup({
  children,
  style,
}: {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const theme = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {items.map((child, index) => (
        // Index keys are safe here: these lists are static and never reordered.
        <View key={index}>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          ) : null}
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  headerText: { flex: 1 },
  subtitle: { marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
});
