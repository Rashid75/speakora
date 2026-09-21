import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/Toast';
import { RootNavigator } from '@/navigation/RootNavigator';
import {
  configureNotificationHandler,
  syncDailyReminders,
} from '@/services/notifications/NotificationService';
import { useNotificationRouting } from '@/services/notifications/useNotificationRouting';
import { SettingsProvider, useSettings } from '@/state/SettingsContext';
import { ThemeProvider, useTheme } from '@/theme';
import { ErrorBoundary } from './ErrorBoundary';
import { SPLASH_CANVAS, SplashView } from './SplashView';

// Hold the splash screen until settings AND fonts are ready, so the app never
// appears in the default theme or a fallback font and then snaps.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Must be set before any notification can arrive, so it runs at module scope
// rather than in an effect that has not mounted yet.
configureNotificationHandler();

/** How long the branded splash stays up once it takes over from the native one. */
const SPLASH_MINIMUM_MS = 1100;

/**
 * App root.
 *
 * This folder is `bootstrap/` rather than `app/` on purpose: Expo treats a
 * `src/app` directory as an Expo Router route tree and will try to take over
 * routing from it. We use React Navigation with an explicit entry point, so the
 * name is avoided entirely.
 *
 * Provider stack, outermost first:
 *
 *   ErrorBoundary          catches anything below, including provider crashes
 *   GestureHandlerRootView required by React Navigation's gesture handling
 *   SafeAreaProvider       supplies insets to Screen and the navigators
 *   SettingsProvider       must precede ThemeProvider - the theme reads settings
 *   ThemeProvider          supplies tokens to every component
 *   ToastProvider          draws over every screen, so it goes last
 */
export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <SettingsProvider>
            <ThemeProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </ThemeProvider>
          </SettingsProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function AppContent(): React.JSX.Element {
  const { settings, isHydrated } = useSettings();
  const theme = useTheme();

  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // A font that fails to load must not block the app forever - React Native
  // falls back to the system face, which is ugly but usable.
  const fontsSettled = fontsLoaded || fontError !== null;
  const ready = isHydrated && fontsSettled;

  // The branded splash is shown for at least this long once it appears, so a
  // fast launch reads as a deliberate moment rather than a flicker.
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  // Handed over as soon as the fonts settle, not when everything is ready:
  // `SplashView` draws the wordmark, so it has to wait for Space Grotesk, but
  // it should not also wait on storage. Hiding here is what makes the designed
  // splash visible at all - hiding at `ready` would skip straight to the app.
  useEffect(() => {
    if (!fontsSettled) return;
    void SplashScreen.hideAsync().catch(() => undefined);
    const id = setTimeout(() => setMinimumElapsed(true), SPLASH_MINIMUM_MS);
    return () => clearTimeout(id);
  }, [fontsSettled]);

  useNotificationRouting();

  // Rebuilt on every launch rather than scheduled once: the queue is a finite
  // run of dated alarms, so it has to be topped up, and this is also how the
  // setting being switched off actually clears them.
  useEffect(() => {
    if (!isHydrated) return;
    void syncDailyReminders(settings.dailyReminder);
  }, [isHydrated, settings.dailyReminder]);

  if (!fontsSettled) {
    // The native splash still covers this. It paints `SPLASH_CANVAS`, not the
    // theme background, so this has to as well or the handover flashes.
    return <View style={[styles.root, { backgroundColor: SPLASH_CANVAS }]} />;
  }

  if (!ready || !minimumElapsed) return <SplashView />;

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
