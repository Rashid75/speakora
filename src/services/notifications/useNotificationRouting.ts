import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { getBuiltinTopic } from '@/data/topics';
import { navigateWhenReady, navigationRef } from '@/navigation/navigationRef';
import { createLogger } from '@/services/logging/logger';

const log = createLogger('notification-routing');

/** Reads the topic id we attached when the reminder was scheduled. */
const topicIdFrom = (response: Notifications.NotificationResponse | null): string | undefined => {
  const raw = response?.notification.request.content.data?.topicId;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
};

/**
 * Opens the reminder's topic when its notification is tapped.
 *
 * It lands on the setup sheet rather than starting a conversation outright.
 * Tapping a reminder means "I'm willing", not "start talking now" - the learner
 * still needs to see who they will be speaking to and to be somewhere they can
 * speak out loud before the microphone opens.
 */
export function useNotificationRouting(): void {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null): void => {
      const topicId = topicIdFrom(response);
      if (!topicId) return;

      const topic = getBuiltinTopic(topicId);
      if (!topic) {
        // A reminder queued against a topic this build no longer has. Opening
        // the app is still the right outcome; silently doing nothing is fine.
        log.warn('Reminder referenced an unknown topic', { topicId });
        return;
      }

      navigateWhenReady(() => navigationRef.navigate('ConversationSetup', { topic }));
    };

    // The cold-start case: the app was launched *by* the tap, so there is no
    // listener to fire - the response is waiting to be collected instead.
    void Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch((error: unknown) => {
        log.warn('Could not read the launching notification', { error: String(error) });
      });

    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
