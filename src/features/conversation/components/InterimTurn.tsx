import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { durations, useTheme } from '@/theme';
import type { UserProfile } from '@/types';

export interface InterimTurnProps {
  /** The recognizer's running guess. Never empty when this renders. */
  readonly text: string;
  readonly userProfile: UserProfile;
}

/**
 * The learner's words as they are still being spoken, at the tail of the
 * transcript in the place the finished turn will land.
 *
 * It has to read as provisional, because it is: the recognizer rewrites it
 * mid-sentence. So it takes the shape of a user turn but wears a dashed border
 * and muted text, and a live dot next to the label says it is still moving.
 * When it resolves, the solid bubble replaces it in the same spot.
 */
export function InterimTurn({ text, userProfile }: InterimTurnProps): React.JSX.Element {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: durations.wave / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: durations.wave / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <View style={styles.container} accessibilityElementsHidden importantForAccessibility="no">
      <View style={styles.label}>
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: theme.colors.listening,
              opacity: reduceMotion
                ? 1
                : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [
                {
                  scale: reduceMotion
                    ? 1
                    : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }),
                },
              ],
            },
          ]}
        />
        <AppText variant="caption" color="textTertiary">
          You, still speaking
        </AppText>
        <UserAvatar profile={userProfile} size={22} />
      </View>

      <View
        style={[
          styles.bubble,
          {
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radius.lg,
            // Same asymmetric corner as a finished turn, so the shape does not
            // jump when the real bubble takes its place.
            borderBottomRightRadius: theme.radius.xs - 2,
            backgroundColor: theme.colors.surfaceAlt,
          },
        ]}
      >
        <AppText variant="body" color="textSecondary">
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, alignItems: 'flex-end', marginTop: 14 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  bubble: {
    maxWidth: 300,
    borderWidth: 1,
    // Dashed, so "not final yet" is carried by the shape and not just a tint.
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
