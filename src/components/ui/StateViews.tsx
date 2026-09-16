import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import type { AppFailure } from '@/types';
import { copyFor } from '@/utils/errors';
import { AppText } from './AppText';
import { Button } from './Button';

/**
 * The three non-happy states every async screen needs.
 *
 * Grouped in one file because they are one family with one layout - splitting
 * them would mean three near-identical files and a shared style module.
 */

export interface LoadingStateProps {
  readonly message?: string;
}

export function LoadingState({ message = 'Loading…' }: LoadingStateProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <AppText variant="callout" color="textSecondary" align="center" style={styles.body}>
        {message}
      </AppText>
    </View>
  );
}

export interface EmptyStateProps {
  readonly emoji: string;
  readonly title: string;
  readonly message: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

export function EmptyState({
  emoji,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <AppText variant="display" align="center" accessibilityElementsHidden>
        {emoji}
      </AppText>
      <AppText variant="title3" align="center" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="callout" color="textSecondary" align="center" style={styles.body}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

export interface ErrorStateProps {
  readonly failure: AppFailure;
  readonly onRetry?: () => void;
}

/**
 * Renders the *mapped* copy for a failure code. `failure.detail` is never shown
 * - that is the rule that keeps raw API errors off the screen.
 */
export function ErrorState({ failure, onRetry }: ErrorStateProps): React.JSX.Element {
  const copy = copyFor(failure);
  return (
    <View style={styles.container} accessibilityRole="alert">
      <AppText variant="display" align="center" accessibilityElementsHidden>
        ⚠️
      </AppText>
      <AppText variant="title3" align="center" style={styles.title}>
        {copy.title}
      </AppText>
      <AppText variant="callout" color="textSecondary" align="center" style={styles.body}>
        {copy.message}
      </AppText>
      {onRetry && copy.action ? (
        <Button label={copy.action} onPress={onRetry} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: { marginTop: 12 },
  body: { marginTop: 6, maxWidth: 320 },
  action: { marginTop: 20, alignSelf: 'center' },
});
