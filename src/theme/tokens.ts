import type { TextStyle } from 'react-native';

/**
 * Scheme-independent design tokens, taken from the Claude Design handoff
 * (`Speaking Coach.dc.html`). Colours live in `palettes.ts` because they change
 * per theme; everything here is shared so spacing and type rhythm stay
 * consistent across every screen.
 */

/** Font family names registered by `expo-font` in the app root. */
export const fontFamilies = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  base: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  gutter: 20,
  section: 24,
  xxxl: 28,
  huge: 40,
} as const;

export type SpacingKey = keyof typeof spacing;

/** Radii used by the design: 6 / 8 / 10 / 12 / 20 sheets / pill. */
export const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 20,
  pill: 9999,
} as const;

/** Minimum comfortable hit area. Anything tappable must meet this. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH_TARGET = 44;

export type TypographyKey =
  | 'hero'
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'calloutStrong'
  | 'subhead'
  | 'footnote'
  | 'footnoteStrong'
  | 'caption'
  | 'overline';

/**
 * The exact type scale from the handoff. React Native cannot synthesise weights
 * for a custom family, so each weight maps to its own loaded font file and
 * `fontWeight` is deliberately omitted.
 */
export const typography: Readonly<Record<TypographyKey, TextStyle>> = {
  // 48/60 — the level number on Progress.
  hero: { fontFamily: fontFamilies.semibold, fontSize: 48, lineHeight: 60, letterSpacing: -0.96 },
  // 36/44 — onboarding headline.
  display: {
    fontFamily: fontFamilies.semibold,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.72,
  },
  // 30/38 — conversation avatar initial.
  title1: { fontFamily: fontFamilies.semibold, fontSize: 30, lineHeight: 38, letterSpacing: -0.3 },
  // 24/32 — screen titles.
  title2: { fontFamily: fontFamilies.semibold, fontSize: 24, lineHeight: 32, letterSpacing: -0.24 },
  // 20/30 — sheet titles, stat numbers.
  title3: { fontFamily: fontFamilies.semibold, fontSize: 20, lineHeight: 30 },
  // 18/28 — resume card title.
  headline: { fontFamily: fontFamilies.semibold, fontSize: 18, lineHeight: 28 },
  // 16/24 — body copy.
  body: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 24 },
  // 14/20 — secondary copy, list rows.
  callout: { fontFamily: fontFamilies.regular, fontSize: 14, lineHeight: 20 },
  calloutStrong: { fontFamily: fontFamilies.semibold, fontSize: 14, lineHeight: 20 },
  subhead: { fontFamily: fontFamilies.medium, fontSize: 14, lineHeight: 20 },
  // 12/18 — captions and meta.
  footnote: { fontFamily: fontFamilies.regular, fontSize: 12, lineHeight: 18 },
  footnoteStrong: { fontFamily: fontFamilies.semibold, fontSize: 12, lineHeight: 18 },
  caption: { fontFamily: fontFamilies.medium, fontSize: 12, lineHeight: 18 },
  // 12/18 uppercase with tracking — section labels.
  overline: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
  },
};

export const durations = {
  fast: 120,
  base: 200,
  slow: 320,
  /** Waveform bar cycle from the design. */
  wave: 1100,
  /** Avatar pulse ring from the design. */
  pulseRing: 2400,
} as const;

export const opacity = {
  disabled: 0.45,
  pressed: 0.7,
  muted: 0.6,
} as const;
