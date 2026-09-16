import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Icon, type IconName } from '@/components/ui/Icon';
import { HistoryScreen } from '@/features/history/screens/HistoryScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { PracticeScreen } from '@/features/home/screens/PracticeScreen';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { StatisticsScreen } from '@/features/statistics/screens/StatisticsScreen';
import { useTheme } from '@/theme';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/** Tab icons, matching the handoff's glyphs. */
const TAB_ICONS: Readonly<Record<keyof TabParamList, IconName>> = {
  Home: 'home',
  Speak: 'mic',
  History: 'clock',
  Progress: 'bars',
  Settings: 'sliders',
};

/** Icon pill + label + breathing room, excluding the bottom safe-area inset. */
const TAB_BAR_CONTENT_HEIGHT = 62;

/**
 * Bottom tabs (artboard 1b).
 *
 * Headers are hidden: every screen draws its own title inside the scroll area,
 * which is what gives the design its full-bleed feel. Each tab keeps a visible
 * text label so the icon is never the only signal.
 *
 * Height is computed from the safe-area inset rather than hard-coded. Android
 * runs edge-to-edge here, so a fixed height puts the labels underneath the
 * system navigation bar - the bar has to grow by `insets.bottom` and pad the
 * same amount, otherwise the row is drawn off the bottom of the screen.
 */
export function TabNavigator(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Gesture-navigation devices report a small inset; button navigation reports
  // a large one. Either way we want a little air under the labels.
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarItemStyle: styles.item,
        tabBarLabelStyle: { ...theme.typography.caption },
        // The selected tab gets a filled pill behind its glyph as well as the
        // accent tint, so "which tab am I on" survives a glance and does not
        // depend on colour alone.
        tabBarIcon: ({ focused, color }) => (
          <View
            style={[
              styles.iconPill,
              {
                borderRadius: theme.radius.pill,
                backgroundColor: focused ? theme.colors.primarySoft : 'transparent',
              },
            ]}
          >
            <Icon
              name={TAB_ICONS[route.name]}
              size={22}
              color={color}
              strokeWidth={focused ? 2.4 : 2}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Speak" component={PracticeScreen} options={{ title: 'Speak' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Progress" component={StatisticsScreen} options={{ title: 'Progress' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 0 },
  iconPill: {
    width: 54,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
