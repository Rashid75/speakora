import { buildTheme, resolveScheme, THEMES, THEME_LIST } from '@/theme';
import { THEME_IDS, type ThemeId } from '@/types';

describe('buildTheme', () => {
  it('resolves light and dark for a normal theme', () => {
    expect(buildTheme('ocean', 'light', 'dark').isDark).toBe(false);
    expect(buildTheme('ocean', 'dark', 'light').isDark).toBe(true);
  });

  it('follows the system scheme when the preference is "system"', () => {
    expect(buildTheme('ocean', 'system', 'dark').isDark).toBe(true);
    expect(buildTheme('ocean', 'system', 'light').isDark).toBe(false);
  });

  it('keeps midnight dark no matter what the user or system asks for', () => {
    expect(buildTheme('midnight', 'light', 'light').isDark).toBe(true);
    expect(buildTheme('midnight', 'system', 'light').isDark).toBe(true);
  });

  it('falls back to the default theme for an unknown id', () => {
    const theme = buildTheme('does-not-exist' as ThemeId, 'light', 'light');
    expect(theme.id).toBe('default');
  });

  it('exposes shared tokens on every theme', () => {
    const theme = buildTheme('forest', 'light', 'light');
    expect(theme.spacing.gutter).toBe(20);
    expect(theme.radius.pill).toBe(9999);
    expect(theme.typography.body.fontSize).toBe(16);
    // Space Grotesk must be wired up, not the system fallback.
    expect(theme.typography.body.fontFamily).toBe('SpaceGrotesk_400Regular');
  });
});

describe('resolveScheme', () => {
  it('honours a forced scheme above every other signal', () => {
    expect(resolveScheme(THEMES.midnight, 'light', 'light')).toBe('dark');
  });

  it('honours an explicit user preference over the system', () => {
    expect(resolveScheme(THEMES.default, 'dark', 'light')).toBe('dark');
  });
});

describe('theme catalogue', () => {
  it('defines every advertised theme id', () => {
    for (const id of THEME_IDS) {
      expect(THEMES[id]).toBeDefined();
      expect(THEMES[id].id).toBe(id);
    }
  });

  it('lists every theme exactly once', () => {
    expect(THEME_LIST).toHaveLength(THEME_IDS.length);
    expect(new Set(THEME_LIST.map((item) => item.id)).size).toBe(THEME_IDS.length);
  });

  it('defines every semantic colour token in both schemes', () => {
    // Guards against a new theme being added with a missing token, which would
    // render as `undefined` and crash a style at runtime.
    const required = Object.keys(THEMES.default.light);

    for (const definition of THEME_LIST) {
      for (const scheme of ['light', 'dark'] as const) {
        for (const token of required) {
          const value = definition[scheme][token as keyof typeof definition.light];
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives every theme a distinct name and a swatch colour', () => {
    const names = new Set(THEME_LIST.map((item) => item.name));
    expect(names.size).toBe(THEME_LIST.length);
    for (const definition of THEME_LIST) {
      expect(definition.swatch).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
