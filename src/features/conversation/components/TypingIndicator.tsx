import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Avatar } from '@/components/ui/Avatar';
import type { Personality } from '@/data/personalities';
import { durations, useTheme } from '@/theme';

export interface TypingIndicatorProps {
  readonly partner: Personality;
}

const DOT_COUNT = 3;

/**
 * The "your partner is composing a reply" indicator, rendered at the tail of
 * the transcript in the exact spot the reply will appear.
 *
 * It sits here rather than under the mic on purpose: waiting is easier when the
 * wait is anchored to where the answer is coming from, and the transcript is
 * already the thing the learner is looking at.
 *
 * One driver for all three dots, each reading it with its own phase offset -
 * far cheaper than three independent animations. Under reduce-motion the dots
 * hold still and the label carries the whole message.
 */
export function TypingIndicator({ partner }: TypingIndicatorProps): React.JSX.Element {
  const theme = useTheme();
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
        toValue: DOT_COUNT,
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
      style={styles.container}
      accessible
      accessibilityRole="text"
      // Announced on Android without stealing focus from whatever the learner
      // is doing; the phase change is worth hearing, not worth interrupting.
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${partner.name} is thinking`}
    >
      <View style={styles.speaker}>
        <Avatar
          initial={partner.initial}
          portrait={partner.portrait}
          size={22}
          backgroundColor={partner.avatarColor}
          textColor={partner.avatarTextColor}
        />
        <AppText variant="footnote" color="textTertiary">
          {partner.name}
        </AppText>
      </View>

      <View
        style={[
          styles.bubble,
          {
            borderRadius: theme.radius.xl,
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {Array.from({ length: DOT_COUNT }, (_, index) => {
          // Peaks as the driver passes this dot's index, flat either side.
          const lift = driver.interpolate({
            inputRange: [index - 1, index, index + 1, DOT_COUNT + index],
            outputRange: [0, 1, 0, 0],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              // Dots are positional and never reordered.
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: theme.colors.textSecondary,
                  opacity: reduceMotion
                    ? 0.6
                    : lift.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                  transform: [
                    {
                      translateY: reduceMotion
                        ? 0
                        : lift.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }),
                    },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, alignItems: 'flex-start', marginTop: 14 },
  speaker: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 14,
    // Matches the height of a one-line turn, so the reply replaces it in place.
    height: 36,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
