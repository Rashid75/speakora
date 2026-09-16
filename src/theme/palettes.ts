import type { ThemeId } from '@/types';

/**
 * Semantic colour tokens.
 *
 * The ramps below are taken verbatim from the Claude Design handoff
 * (`Speaking Coach.dc.html`). Components consume names like `colors.surface`,
 * never a hex literal, so adding a theme is one entry in `THEMES` and no
 * component changes at all.
 */
export interface ColorTokens {
  readonly background: string;
  readonly backgroundAlt: string;
  readonly surface: string;
  readonly surfaceAlt: string;
  readonly surfaceMuted: string;
  readonly border: string;
  readonly borderStrong: string;

  readonly text: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly onPrimary: string;

  readonly primary: string;
  readonly primaryStrong: string;
  readonly primarySoft: string;
  /** One step above `primarySoft` - used for selected chips and borders. */
  readonly primarySoftStrong: string;

  readonly success: string;
  readonly successSoft: string;
  readonly successText: string;
  readonly warning: string;
  readonly warningSoft: string;
  readonly warningText: string;
  readonly danger: string;
  readonly dangerSoft: string;
  readonly info: string;
  readonly infoSoft: string;
  readonly infoText: string;
  readonly neutral: string;
  readonly neutralSoft: string;

  /** The near-black used for the hero cards, mic screen and primary dark CTA. */
  readonly ink: string;
  readonly onInk: string;
  readonly onInkMuted: string;
  readonly onInkFaint: string;

  readonly userBubble: string;
  readonly userBubbleText: string;
  readonly userBubbleBorder: string;
  readonly aiBubble: string;
  readonly aiBubbleText: string;

  /** Voice state colours. Always paired with an icon + label, never alone. */
  readonly listening: string;
  readonly speaking: string;
  readonly processing: string;

  readonly overlay: string;
  readonly tabBar: string;
  readonly shadow: string;
}

export interface ThemeDefinition {
  readonly id: ThemeId;
  readonly name: string;
  readonly description: string;
  /** Swatch shown in the Settings theme picker. */
  readonly swatch: string;
  /** Themes that only make sense in one scheme pin it here. */
  readonly forcedScheme?: 'dark';
  readonly light: ColorTokens;
  readonly dark: ColorTokens;
}

/** Shared light ramp, straight from the handoff. */
const light = {
  background: '#FFFFFF',
  backgroundAlt: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  surfaceMuted: '#EEF2F6',
  border: '#E3E8EF',
  borderStrong: '#CDD5DF',

  text: '#121926',
  textSecondary: '#4B5565',
  textTertiary: '#9AA4B2',
  onPrimary: '#FFFFFF',

  success: '#16C98D',
  successSoft: 'rgba(22,201,141,0.12)',
  successText: '#0B7D58',
  warning: '#FCAF17',
  warningSoft: 'rgba(252,175,23,0.12)',
  warningText: '#B77B00',
  danger: '#FA5E5B',
  dangerSoft: 'rgba(250,94,91,0.12)',
  info: '#088BE3',
  infoSoft: 'rgba(8,139,227,0.12)',
  infoText: '#0A6FB3',
  neutral: '#697586',
  neutralSoft: '#EEF2F6',

  ink: '#02081E',
  onInk: '#FFFFFF',
  onInkMuted: 'rgba(255,255,255,0.64)',
  onInkFaint: 'rgba(255,255,255,0.40)',

  aiBubble: '#FFFFFF',
  aiBubbleText: '#364152',

  overlay: 'rgba(2,8,30,0.45)',
  tabBar: 'rgba(255,255,255,0.92)',
  shadow: '#0A0D12',
} as const;

/** Shared dark ramp, built on the handoff's #02081E ink. */
const dark = {
  background: '#02081E',
  backgroundAlt: '#070E28',
  surface: '#0C142F',
  surfaceAlt: '#111A38',
  surfaceMuted: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.24)',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.64)',
  textTertiary: 'rgba(255,255,255,0.40)',
  onPrimary: '#FFFFFF',

  success: '#69F7C3',
  successSoft: 'rgba(105,247,195,0.14)',
  successText: '#69F7C3',
  warning: '#FCAF17',
  warningSoft: 'rgba(252,175,23,0.16)',
  warningText: '#FCAF17',
  danger: '#FA5E5B',
  dangerSoft: 'rgba(250,94,91,0.16)',
  info: '#57B6F5',
  infoSoft: 'rgba(8,139,227,0.18)',
  infoText: '#57B6F5',
  neutral: 'rgba(255,255,255,0.56)',
  neutralSoft: 'rgba(255,255,255,0.08)',

  ink: '#02081E',
  onInk: '#FFFFFF',
  onInkMuted: 'rgba(255,255,255,0.64)',
  onInkFaint: 'rgba(255,255,255,0.40)',

  aiBubble: 'rgba(255,255,255,0.06)',
  aiBubbleText: 'rgba(255,255,255,0.86)',

  overlay: 'rgba(2,8,30,0.66)',
  tabBar: 'rgba(2,8,30,0.92)',
  shadow: '#000000',
} as const;

interface Brand {
  readonly primary: string;
  readonly primaryStrong: string;
  readonly primarySoft: string;
  readonly primarySoftStrong: string;
  readonly listening?: string;
  readonly onPrimary?: string;
}

const makeLight = (brand: Brand): ColorTokens => ({
  ...light,
  primary: brand.primary,
  primaryStrong: brand.primaryStrong,
  primarySoft: brand.primarySoft,
  primarySoftStrong: brand.primarySoftStrong,
  onPrimary: brand.onPrimary ?? light.onPrimary,
  listening: brand.listening ?? '#0B7D58',
  speaking: brand.primary,
  processing: '#B77B00',
  userBubble: brand.primarySoft,
  userBubbleText: light.text,
  userBubbleBorder: brand.primarySoftStrong,
});

const makeDark = (brand: Brand): ColorTokens => ({
  ...dark,
  primary: brand.primary,
  primaryStrong: brand.primaryStrong,
  primarySoft: brand.primarySoft,
  primarySoftStrong: brand.primarySoftStrong,
  onPrimary: brand.onPrimary ?? dark.onPrimary,
  listening: brand.listening ?? '#69F7C3',
  speaking: brand.primary,
  processing: '#FCAF17',
  // The conversation bubble from artboard 1d: a translucent wash of the accent
  // so it reads against #02081E without competing with the transcript text.
  userBubble: brand.primarySoft,
  userBubbleText: '#FFFFFF',
  userBubbleBorder: brand.primarySoftStrong,
});

/** The signature accent from the handoff. */
const VIOLET: Brand = {
  primary: '#675CF5',
  primaryStrong: '#4E42AF',
  primarySoft: '#F4F3FE',
  primarySoftStrong: '#E0DCF8',
};

/** Same accent, with soft fills that work against the #02081E ink. */
const VIOLET_DARK: Brand = {
  primary: '#675CF5',
  primaryStrong: '#8B82F8',
  primarySoft: 'rgba(103,92,245,0.22)',
  primarySoftStrong: 'rgba(103,92,245,0.40)',
};

export const THEMES: Readonly<Record<ThemeId, ThemeDefinition>> = {
  default: {
    id: 'default',
    name: 'Violet',
    description: 'The signature Speakora accent.',
    swatch: '#675CF5',
    light: makeLight(VIOLET),
    dark: makeDark(VIOLET_DARK),
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Always dark, built for late practice.',
    swatch: '#02081E',
    forcedScheme: 'dark',
    light: makeDark(VIOLET_DARK),
    dark: makeDark(VIOLET_DARK),
  },
  minimal: {
    id: 'minimal',
    name: 'Paper',
    description: 'Monochrome and quiet. Nothing competes with the words.',
    swatch: '#FFFFFF',
    light: makeLight({
      primary: '#18181B',
      primaryStrong: '#000000',
      primarySoft: '#F4F4F5',
      primarySoftStrong: '#E4E4E7',
    }),
    dark: makeDark({
      primary: '#E4E4E7',
      primaryStrong: '#FAFAFA',
      primarySoft: 'rgba(255,255,255,0.10)',
      primarySoftStrong: 'rgba(255,255,255,0.20)',
      onPrimary: '#09090B',
    }),
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue. Focused and calm.',
    swatch: '#088BE3',
    light: makeLight({
      primary: '#088BE3',
      primaryStrong: '#0A6FB3',
      primarySoft: '#E8F4FD',
      primarySoftStrong: '#C9E5FA',
    }),
    dark: makeDark({
      primary: '#57B6F5',
      primaryStrong: '#8CCDF8',
      primarySoft: 'rgba(8,139,227,0.22)',
      primarySoftStrong: 'rgba(8,139,227,0.40)',
    }),
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Grounded green. Easy on the eyes for long sessions.',
    swatch: '#16C98D',
    light: makeLight({
      primary: '#0B9E6E',
      primaryStrong: '#0B7D58',
      primarySoft: '#E4F8F0',
      primarySoftStrong: '#C2EFDF',
      listening: '#0B7D58',
    }),
    dark: makeDark({
      primary: '#16C98D',
      primaryStrong: '#69F7C3',
      primarySoft: 'rgba(22,201,141,0.22)',
      primarySoftStrong: 'rgba(22,201,141,0.40)',
      onPrimary: '#02081E',
    }),
  },
};

export const THEME_LIST: readonly ThemeDefinition[] = [
  THEMES.default,
  THEMES.minimal,
  THEMES.midnight,
  THEMES.ocean,
  THEMES.forest,
];
