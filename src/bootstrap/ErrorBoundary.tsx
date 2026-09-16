import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { createLogger } from '@/services/logging/logger';
import { describeError } from '@/utils/errors';

const log = createLogger('error-boundary');

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly error: Error | undefined;
}

/**
 * Last line of defence against a white screen.
 *
 * Deliberately styled with literal colours rather than theme tokens: if the
 * crash happened inside the theme provider, `useTheme` would throw again here
 * and the user would see nothing at all.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: undefined };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // The hook for Sentry/Crashlytics when one is added.
    log.error('Unhandled render error', {
      error: describeError(error),
      componentStack: info.componentStack ?? 'unavailable',
    });
  }

  private readonly reset = (): void => {
    this.setState({ error: undefined });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.emoji}>😞</Text>
          <Text style={styles.title}>Speakora ran into a problem</Text>
          <Text style={styles.body}>
            Something unexpected happened. Your conversations and settings are safe on this device.
          </Text>

          <TouchableOpacity
            onPress={this.reset}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonLabel}>Try again</Text>
          </TouchableOpacity>

          {__DEV__ ? (
            <View style={styles.debug}>
              <Text style={styles.debugTitle}>Development detail</Text>
              <Text style={styles.debugText}>{describeError(error)}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E1A' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#F2F4FB', textAlign: 'center' },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#A9B2CC',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  button: {
    marginTop: 28,
    backgroundColor: '#8B8BF0',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonLabel: { color: '#08111F', fontSize: 16, fontWeight: '600' },
  debug: {
    marginTop: 32,
    padding: 14,
    backgroundColor: '#151A2E',
    borderRadius: 10,
    width: '100%',
  },
  debugTitle: { color: '#7E88A6', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  debugText: { color: '#FF6B6B', fontSize: 12, fontFamily: 'monospace' },
});
