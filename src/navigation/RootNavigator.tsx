import React, { useMemo } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { getCategory } from '@/data/topics';
import { ConversationScreen } from '@/features/conversation/screens/ConversationScreen';
import { ConversationSetupScreen } from '@/features/conversation/screens/ConversationSetupScreen';
import { CustomTopicScreen } from '@/features/custom-topics/screens/CustomTopicScreen';
import { DictionaryScreen } from '@/features/dictionary/screens/DictionaryScreen';
import { ConversationDetailScreen } from '@/features/history/screens/ConversationDetailScreen';
import { CategoryTopicsScreen } from '@/features/home/screens/CategoryTopicsScreen';
import { OnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';
import { AccentSettingsScreen } from '@/features/settings/screens/AccentSettingsScreen';
import {
  DifficultySettingsScreen,
  PersonalitySettingsScreen,
  SpeedSettingsScreen,
  ThemeSettingsScreen,
} from '@/features/settings/screens/PickerScreens';
import { ProfileSettingsScreen } from '@/features/settings/screens/ProfileSettingsScreen';
import { useSettings } from '@/state/SettingsContext';
import { useTheme, type Theme } from '@/theme';
import { flushPendingNavigation, navigationRef } from './navigationRef';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root stack over the tab navigator.
 *
 * The navigation container's own theme is derived from ours so the flash of
 * background colour during a screen transition matches the active theme - one
 * of those details that makes a custom theme feel real rather than painted on.
 */
export function RootNavigator(): React.JSX.Element {
  const theme = useTheme();
  const { settings } = useSettings();
  const navigationTheme = useMemo(() => toNavigationTheme(theme), [theme]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      // A notification tapped from a cold start resolves before this exists,
      // so anything that arrived early is replayed here.
      onReady={flushPendingNavigation}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.text,
          headerTitleStyle: { ...theme.typography.headline, color: theme.colors.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {!settings.hasOnboarded ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false, gestureEnabled: false }}
          />
        ) : null}

        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />

        <Stack.Screen
          name="Dictionary"
          component={DictionaryScreen}
          options={{ title: 'My words' }}
        />

        <Stack.Screen
          name="CategoryTopics"
          component={CategoryTopicsScreen}
          options={({ route }) => ({
            title: getCategory(route.params.categoryId)?.title ?? 'Topics',
          })}
        />

        <Stack.Screen
          name="CustomTopic"
          component={CustomTopicScreen}
          options={{ title: 'Your own topic' }}
        />

        <Stack.Screen
          name="ConversationSetup"
          component={ConversationSetupScreen}
          options={{
            // Artboard 1c is a bottom sheet over a dimmed backdrop.
            presentation: 'modal',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Conversation"
          component={ConversationScreen}
          options={{
            headerShown: false,
            // The screen has its own end-conversation confirmation, so the
            // swipe-back shortcut must not bypass it.
            gestureEnabled: false,
            animation: 'slide_from_bottom',
          }}
        />

        <Stack.Screen
          name="ConversationDetail"
          component={ConversationDetailScreen}
          options={({ route }) => ({
            headerShown: false,
            gestureEnabled: !route.params.fromConversation,
          })}
        />

        <Stack.Screen
          name="ProfileSettings"
          component={ProfileSettingsScreen}
          options={{ title: 'Profile' }}
        />
        <Stack.Screen
          name="PersonalitySettings"
          component={PersonalitySettingsScreen}
          options={{ title: 'Who you talk to' }}
        />
        <Stack.Screen
          name="AccentSettings"
          component={AccentSettingsScreen}
          options={{ title: 'Accent' }}
        />
        <Stack.Screen
          name="SpeedSettings"
          component={SpeedSettingsScreen}
          options={{ title: 'Speaking speed' }}
        />
        <Stack.Screen
          name="DifficultySettings"
          component={DifficultySettingsScreen}
          options={{ title: 'Difficulty' }}
        />
        <Stack.Screen
          name="ThemeSettings"
          component={ThemeSettingsScreen}
          options={{ title: 'Appearance' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const toNavigationTheme = (theme: Theme): NavTheme => {
  const base = theme.isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: theme.isDark,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
    fonts: base.fonts,
  };
};
