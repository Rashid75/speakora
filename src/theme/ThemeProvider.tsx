import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Platform, useColorScheme, type ViewStyle } from 'react-native';

import { useSettings } from '@/state/SettingsContext';
import type { ColorSchemePreference, ThemeId } from '@/types';
import { THEMES, type ColorTokens, type ThemeDefinition } from './palettes';
import { durations, opacity, radius, spacing, typography } from './tokens';

export interface Elevation {
  readonly card: ViewStyle;
  readonly raised: ViewStyle;
  readonly floating: ViewStyle;
}

export interface Theme {
  readonly id: ThemeId;
  readonly name: string;
  readonly scheme: 'light' | 'dark';
  readonly isDark: boolean;
  readonly colors: ColorTokens;
  readonly spacing: typeof spacing;
  readonly radius: typeof radius;
  readonly typography: typeof typography;
  readonly durations: typeof durations;
  readonly opacity: typeof opacity;
  readonly elevation: Elevation;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

const buildElevation = (shadow: string, isDark: boolean): Elevation => {
  // Android renders `elevation`; iOS renders the shadow*. Both are set so cards
  // look the same on each platform. Dark themes need a stronger, tighter shadow.
  const shadowOpacity = isDark ? 0.5 : 0.09;
  const make = (height: number, blur: number, elevationValue: number): ViewStyle => ({
    shadowColor: shadow,
    shadowOffset: { width: 0, height },
    shadowOpacity,
    shadowRadius: blur,
    elevation: Platform.OS === 'android' ? elevationValue : 0,
  });
  return {
    card: make(2, 8, 2),
    raised: make(6, 16, 6),
    floating: make(10, 24, 12),
  };
};

export const resolveScheme = (
  definition: ThemeDefinition,
  preference: ColorSchemePreference,
  systemScheme: 'light' | 'dark',
): 'light' | 'dark' => {
  if (definition.forcedScheme) return definition.forcedScheme;
  if (preference === 'system') return systemScheme;
  return preference;
};

export const buildTheme = (
  themeId: ThemeId,
  preference: ColorSchemePreference,
  systemScheme: 'light' | 'dark',
): Theme => {
  const definition = THEMES[themeId] ?? THEMES.default;
  const scheme = resolveScheme(definition, preference, systemScheme);
  const colors = scheme === 'dark' ? definition.dark : definition.light;
  return {
    id: definition.id,
    name: definition.name,
    scheme,
    isDark: scheme === 'dark',
    colors,
    spacing,
    radius,
    typography,
    durations,
    opacity,
    elevation: buildElevation(colors.shadow, scheme === 'dark'),
  };
};

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { settings } = useSettings();
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const theme = useMemo(
    () => buildTheme(settings.themeId, settings.colorScheme, systemScheme),
    [settings.themeId, settings.colorScheme, systemScheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return theme;
}

/**
 * Builds themed styles once per theme change instead of on every render.
 *
 * Usage: `const styles = useThemedStyles(createStyles);` where `createStyles`
 * is a module-level function - that keeps the reference stable.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
