import { setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

import { createLogger } from '@/services/logging/logger';
import { describeError } from '@/utils/errors';

const log = createLogger('audio-session');

/**
 * Audio session management.
 *
 * A voice conversation alternates between recording and playback, and each
 * platform wants a different session configuration for each. Getting this wrong
 * produces the two classic bugs:
 *
 *  - iOS: TTS plays through the quiet earpiece instead of the speaker, or is
 *    silenced entirely because the hardware mute switch applies to the default
 *    "ambient" category.
 *  - Android: the recogniser fights the media stream and audio ducks or cuts.
 *
 * Bluetooth headsets are handled by the OS once the category is right; we do
 * not enumerate routes ourselves.
 */

let configuredMode: 'conversation' | 'inactive' | undefined;

/**
 * Enters a session that can both record and play back.
 *
 * `playsInSilentMode` is the important flag: without it an iPhone with the ring
 * switch flipped plays nothing at all, which reads as "the app is broken".
 */
export const beginConversationAudio = async (): Promise<void> => {
  if (configuredMode === 'conversation') return;
  try {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      // Let the user hear a phone call / navigation prompt over us rather than
      // continuing to talk into an interruption.
      interruptionMode: 'duckOthers',
      interruptionModeAndroid: 'duckOthers',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    configuredMode = 'conversation';
    log.debug('Conversation audio session active');
  } catch (error) {
    // Non-fatal: TTS and STT will usually still work with the default session.
    log.warn('Could not configure audio session', { error: describeError(error) });
  }
};

/** Releases the recording session so other apps regain full audio control. */
export const endConversationAudio = async (): Promise<void> => {
  if (configuredMode === 'inactive') return;
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: false,
      shouldPlayInBackground: false,
    });
    configuredMode = 'inactive';
    log.debug('Conversation audio session released');
  } catch (error) {
    log.warn('Could not release audio session', { error: describeError(error) });
  }
};

/**
 * Android's SpeechRecognizer and the TTS engine both want the audio focus, and
 * on some devices starting the recogniser while TTS is still finishing causes
 * the first word to be swallowed. A short gap fixes it and is imperceptible.
 */
export const handoverDelayMs = Platform.select({ android: 250, ios: 120, default: 150 });
