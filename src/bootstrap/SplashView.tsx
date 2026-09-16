import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { durations } from '@/theme';

const LOGO_SIZE = 88;
const BAR_COUNT = 6;

/**
 * The splash is painted on ink in every theme, so its colours are fixed rather
 * than taken from the palette.
 *
 * Every other always-dark surface in this app got into trouble by mixing
 * scheme-dependent tokens with fixed on-dark text - `primarySoft` is near-white
 * in the light palette - so nothing here reads the theme at all.
 */
export const SPLASH_CANVAS = '#080B2A';
const CANVAS = SPLASH_CANVAS;
const BLOOM = '#675CF5';
const TITLE = '#FFFFFF';
const SUBTITLE = 'rgba(255,255,255,0.68)';
const FOOTNOTE = 'rgba(255,255,255,0.46)';

/**
 * The branded launch screen.
 *
 * This is a React view, not the native splash. The native splash can only be a
 * single image on a flat colour, which cannot hold a wordmark, a tagline, a
 * moving loader and a footer line - so the native layer's whole job is to paint
 * the same background underneath, and this takes over the moment the fonts are
 * ready. Handing off after the fonts settle is what keeps "Speakora" in Space
 * Grotesk rather than flashing the system face first.
 */
export function SplashView(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* A soft bloom behind the mark. SVG rather than a linear gradient: the
          glow radiates from the logo, and a linear ramp cannot do that. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="bloom" cx="50%" cy="40%" r="58%">
            <Stop offset="0" stopColor={BLOOM} stopOpacity={0.42} />
            <Stop offset="0.55" stopColor={BLOOM} stopOpacity={0.12} />
            <Stop offset="1" stopColor={BLOOM} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bloom)" />
      </Svg>

      <View style={styles.centre}>
        <View style={styles.logo}>
          <Icon name="logo" size={40} color={TITLE} strokeWidth={2.4} />
        </View>

        <AppText variant="title1" align="center" style={[styles.wordmark, { color: TITLE }]}>
          Speakora
        </AppText>

        <AppText variant="body" align="center" style={{ color: SUBTITLE }}>
          Talk your way fluent
        </AppText>

        <LoadingBars color={BLOOM} />
      </View>

      {/* The one promise worth making before the app has even opened. */}
      <AppText
        variant="footnote"
        align="center"
        style={[
          styles.footer,
          { color: FOOTNOTE, paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
      >
        Everything stays on this device
      </AppText>
    </View>
  );
}

/**
 * A short row of bars that rise and fall while the app finishes loading.
 *
 * One driver read at six offsets, the same approach as the mic meter. It says
 * "working", not "how far along" - there is no measurable progress here, and a
 * bar that pretends otherwise would be inventing a number.
 */
function LoadingBars({ color }: { readonly color: string }): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const [driver] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      driver.stopAnimation();
      driver.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(driver, {
        toValue: BAR_COUNT,
        duration: durations.wave,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [driver, reduceMotion]);

  return (
    <View
      style={styles.bars}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: BAR_COUNT }, (_, index) => {
        const scale = driver.interpolate({
          inputRange: [index - 1, index, index + 1, BAR_COUNT + index],
          outputRange: [0.45, 1, 0.45, 0.45],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            // Bars are positional and never reordered.
            key={index}
            style={[
              styles.bar,
              { backgroundColor: color, transform: [{ scaleY: reduceMotion ? 0.7 : scale }] },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CANVAS },
  centre: { alignItems: 'center', gap: 12 },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 24,
    backgroundColor: BLOOM,
    shadowColor: BLOOM,
    alignItems: 'center',
    justifyContent: 'center',
    // A lift off the page, in the brand colour rather than black, so the tile
    // glows into the bloom behind it instead of casting a grey shadow on it.
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  wordmark: { marginTop: 8 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, marginTop: 14 },
  bar: { width: 4, height: 22, borderRadius: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
