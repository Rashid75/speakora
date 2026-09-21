import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { durations, useTheme } from '@/theme';
import { AppText } from './AppText';

/** How long a message stays up before it fades on its own. */
const VISIBLE_MS = 2400;

interface ToastContextValue {
  /** Says something happened, briefly. Replaces any message already up. */
  show(message: string): void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Brief confirmations.
 *
 * For the things that happen somewhere the learner can no longer see the
 * result - removing a word closes the sheet it was removed from, so without
 * this the tap produces a sheet disappearing and nothing else, which reads as
 * a misfire rather than as a deletion.
 *
 * Deliberately not `ToastAndroid`: it exists on one platform, ignores the
 * theme, and is invisible to the app's own accessibility rules. This is a few
 * dozen lines and behaves the same on both.
 *
 * It is not a notification system. There is no queue, no actions and no undo -
 * a second message replaces the first, because two stacked toasts is already a
 * sign that something should have been a sheet instead.
 *
 * The whole lifecycle lives here rather than in the view, so every state
 * change happens in a timer or an animation callback. A fade-out driven from
 * an effect would have to clear the text the moment it starts, which is the
 * one frame the animation exists to show.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: durations.base,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Only once it has actually faded; an interrupted fade means a new
      // message took over and is mid-animation of its own.
      if (finished) setMessage(undefined);
    });
  }, [opacity]);

  const show = useCallback(
    (next: string) => {
      setMessage(next);
      Animated.timing(opacity, {
        toValue: 1,
        duration: durations.base,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(hide, VISIBLE_MS);
    },
    [hide, opacity],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastView message={message} opacity={opacity} />
    </ToastContext.Provider>
  );
}

/**
 * Safe to call from anywhere under the provider - and from outside it, where
 * it does nothing rather than throwing. A missing confirmation is not worth
 * crashing a screen over.
 */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? { show: () => undefined };
}

function ToastView({
  message,
  opacity,
}: {
  readonly message: string | undefined;
  readonly opacity: Animated.Value;
}): React.JSX.Element | null {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!message) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.host, { bottom: Math.max(insets.bottom, 16) + 24 }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Animated.View
        style={[
          styles.pill,
          {
            opacity,
            backgroundColor: theme.colors.ink,
            borderRadius: theme.radius.pill,
            transform: [
              { translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            ],
          },
        ]}
      >
        <AppText variant="subhead" color="onInk" align="center">
          {message}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  pill: { paddingHorizontal: 18, paddingVertical: 10, maxWidth: '100%' },
});
