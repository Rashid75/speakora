import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * How much of the screen the keyboard is currently covering, in points.
 *
 * Needed because a React Native `Modal` opens its own window, and that window
 * does not inherit the activity's `adjustResize` - so a bottom sheet with a
 * text field in it sits exactly where it was while the keyboard covers it.
 * Outside a modal this is unnecessary; the activity handles it.
 *
 * iOS listens for `will` so the sheet travels with the keyboard rather than
 * after it; Android only reports `did`.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const isIos = Platform.OS === 'ios';
    const show = Keyboard.addListener(isIos ? 'keyboardWillShow' : 'keyboardDidShow', (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(isIos ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
