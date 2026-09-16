import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Icon } from '@/components/ui/Icon';
import { durations, useTheme, type Theme } from '@/theme';
import type { VoicePhase } from '@/types';

export interface MicControlsProps {
  readonly phase: VoicePhase;
  readonly disabled: boolean;
  /** 0-1 microphone level, when the platform reports one. */
  readonly inputLevel: number;
  readonly onToggleMic: () => void;
}

const MIC_SIZE = 68;
const BAR_COUNT = 7;

/**
 * The control dock: a status line with a live level meter, and the mic itself.
 *
 * The button is deliberately still. Animating the thing you are trying to press
 * makes it harder to hit and says nothing about whether you are actually being
 * heard - so "we can hear you" is carried by the meter, which moves with the
 * measured input level, and by a haptic tick when the mic opens and closes.
 * State is never colour-only: the glyph, the label and the meter all change.
 */
export function MicControls({
  phase,
  disabled,
  inputLevel,
  onToggleMic,
}: MicControlsProps): React.JSX.Element {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const listening = phase === 'listening';
  const thinking = phase === 'processing' || phase === 'connecting';

  const micBackground = listening ? theme.colors.listening : theme.colors.primary;
  // The listening fill is a bright mint in dark themes and a deep green in
  // light ones, so the glyph has to flip rather than always going dark.
  const micGlyph = listening && theme.isDark ? theme.colors.ink : theme.colors.onPrimary;

  // A tick as the mic opens and another as it closes, so the learner can start
  // and stop talking without watching the screen.
  const wasListening = useRef(listening);
  useEffect(() => {
    if (wasListening.current === listening) return;
    wasListening.current = listening;
    void Haptics.impactAsync(
      listening ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
  }, [listening]);

  const status = statusFor(phase);

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {listening ? (
          <View style={styles.listeningRow}>
            <LevelMeter
              level={inputLevel}
              reduceMotion={reduceMotion}
              color={theme.colors.listening}
            />
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              Tap the mic when you&apos;re done
            </AppText>
          </View>
        ) : status ? (
          <View style={styles.listeningRow}>
            <View style={[styles.dot, { backgroundColor: dotFor(phase, theme) }]} />
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {status}
            </AppText>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          if (disabled) return;
          onToggleMic();
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={micLabel(phase)}
        accessibilityHint={micHint(phase)}
        accessibilityState={{ disabled, busy: thinking }}
        style={({ pressed }) => [
          styles.mic,
          {
            backgroundColor: micBackground,
            borderColor: theme.colors.borderStrong,
            opacity: disabled ? theme.opacity.disabled : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Icon name={listening ? 'mic' : 'micOff'} size={26} color={micGlyph} />
      </Pressable>
    </View>
  );
}

/**
 * Bars that rise with the measured input level.
 *
 * One driver shared by every bar, each reading it with its own phase offset,
 * which is far cheaper than seven independent animations. The level sets the
 * ceiling, so a silent room gives flat bars rather than a convincing animation
 * of a microphone that is not picking anything up.
 */
function LevelMeter({
  level,
  reduceMotion,
  color,
}: {
  readonly level: number;
  readonly reduceMotion: boolean;
  readonly color: string;
}): React.JSX.Element {
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

  const ceiling = Math.max(0.3, Math.min(1, level || 0.7));

  return (
    <View
      style={styles.meter}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: BAR_COUNT }, (_, index) => {
        const scale = driver.interpolate({
          inputRange: [index - 1, index, index + 1, BAR_COUNT + index],
          outputRange: [0.3, ceiling, 0.3, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            // Bars are positional and never reordered.
            key={index}
            style={[
              styles.bar,
              { backgroundColor: color, transform: [{ scaleY: reduceMotion ? 0.55 : scale }] },
            ]}
          />
        );
      })}
    </View>
  );
}

/** Empty while thinking - the transcript's typing indicator says it instead. */
const statusFor = (phase: VoicePhase): string => {
  switch (phase) {
    case 'connecting':
    case 'processing':
      return '';
    case 'speaking':
      return 'Your partner is talking · tap to jump in';
    case 'paused':
      return 'Paused';
    case 'ended':
      return 'Conversation finished';
    case 'error':
      return 'Something went wrong';
    case 'listening':
    case 'idle':
    default:
      return 'Tap the mic to start talking';
  }
};

const dotFor = (phase: VoicePhase, theme: Theme): string => {
  switch (phase) {
    case 'listening':
      return theme.colors.listening;
    case 'connecting':
    case 'processing':
      return theme.colors.processing;
    case 'speaking':
      return theme.colors.speaking;
    case 'error':
      return theme.colors.danger;
    default:
      return theme.colors.textTertiary;
  }
};

/** Says what the button is and what tapping it does, never colour or icon. */
const micLabel = (phase: VoicePhase): string => {
  switch (phase) {
    case 'listening':
      return 'Microphone on. Tap to mute and send what you said.';
    case 'processing':
      return 'Microphone off. Your partner is thinking.';
    case 'speaking':
      return 'Microphone off. Your partner is talking. Tap to unmute and reply.';
    default:
      return 'Microphone off. Tap to unmute and start speaking.';
  }
};

const micHint = (phase: VoicePhase): string => {
  switch (phase) {
    case 'listening':
      return 'Stops recording and sends what you said';
    case 'speaking':
      return 'Interrupts and starts recording you';
    default:
      return 'Starts recording your voice';
  }
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 14, alignSelf: 'stretch' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minHeight: 28,
  },
  listeningRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 18 },
  bar: { width: 3, height: 18, borderRadius: 1.5 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  mic: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
