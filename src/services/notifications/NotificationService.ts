import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { BUILTIN_TOPICS } from '@/data/topics';
import { createLogger } from '@/services/logging/logger';
import { describeError } from '@/utils/errors';

const log = createLogger('notifications');

/**
 * Daily practice reminders.
 *
 * Entirely local. There is no push server, no device token and nothing leaves
 * the phone - these are `scheduleNotificationAsync` alarms the OS holds, which
 * is the only kind of reminder an app with no backend can honestly offer.
 */

/** Android channel id. Must exist before anything is posted on Android 8+. */
const CHANNEL_ID = 'daily-practice';

export type ReminderMode = 'test' | 'daily';

/**
 * TESTING: `test` fires one reminder a minute from now instead of tomorrow
 * morning. Change `mode` to 'daily' to ship - nothing else changes, because
 * both paths build the same notification from the same copy.
 *
 * Held on an object rather than as a bare `const` on purpose: TypeScript
 * narrows a const to its initialiser, so `const MODE: 'test' | 'daily' = 'test'`
 * makes the daily branch provably dead and `tsc` rejects the comparison the
 * moment you flip it. A property access is not narrowed, so the switch stays a
 * one-word edit that actually compiles.
 */
export const REMINDERS: { readonly mode: ReminderMode } = { mode: 'test' };

/** When the daily reminder fires, in device-local time. */
export const REMINDER_HOUR = 8;
export const REMINDER_MINUTE = 0;

/** Seconds ahead the test reminder fires. */
const TEST_DELAY_SECONDS = 60;

/**
 * How many days of reminders to queue up.
 *
 * A repeating DAILY trigger would only ever carry one fixed body, so the topic
 * could never change. Queueing a run of one-shot alarms - each with its own
 * topic - is how a backendless app gets a different suggestion each morning.
 * The run is rebuilt every time the app opens, so it never runs dry.
 */
const DAYS_AHEAD = 14;

/** Rotated so two consecutive mornings never open with the same sentence. */
const MOTIVATIONS: readonly string[] = [
  'Fifteen minutes a day is what turns practice into fluency.',
  'Fifteen focused minutes beats an hour you keep putting off.',
  'A quarter of an hour today, and tomorrow starts easier.',
  'Speaking a little every day is the whole trick. Fifteen minutes?',
  'You get better by talking, not by waiting until you feel ready.',
];

export interface DailyReminder {
  readonly title: string;
  readonly body: string;
  readonly topicId: string;
}

/** The notification for a given day, deterministic so it can be tested. */
export const buildReminder = (dayIndex: number): DailyReminder => {
  const topic = BUILTIN_TOPICS[dayIndex % BUILTIN_TOPICS.length];
  const motivation = MOTIVATIONS[dayIndex % MOTIVATIONS.length];

  // `BUILTIN_TOPICS` is never empty, but a missing topic must not produce
  // "undefined" in someone's notification shade.
  if (!topic) {
    return {
      title: 'Time to practise',
      body: motivation ?? MOTIVATIONS[0]!,
      topicId: '',
    };
  }

  return {
    title: `${topic.emoji} ${topic.title}`,
    body: `${motivation ?? MOTIVATIONS[0]!} Today's topic: ${topic.summary}`,
    topicId: topic.id,
  };
};

/**
 * Asks only when we are about to schedule something.
 *
 * Never on launch: a permission prompt before the learner has seen what the app
 * does is the fastest way to get a permanent "no".
 */
const ensurePermission = async (): Promise<boolean> => {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return requested.granted;
  } catch (error) {
    log.warn('Could not read notification permission', { error: describeError(error) });
    return false;
  }
};

const ensureChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily practice',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
};

/** The next `DAYS_AHEAD` mornings, starting with the next one still to come. */
const upcomingMornings = (from: Date): readonly Date[] => {
  const first = new Date(from);
  first.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  // Today's slot has already passed, so the run starts tomorrow.
  if (first.getTime() <= from.getTime()) first.setDate(first.getDate() + 1);

  return Array.from({ length: DAYS_AHEAD }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
};

/**
 * Clears any queued reminders and, when enabled, queues a fresh run.
 *
 * Safe to call on every launch: cancelling first is what stops the queue
 * doubling up, and it is also how switching the setting off takes effect.
 * Returns whether reminders are actually armed, which is not the same as what
 * the setting says - the OS can refuse.
 */
export const syncDailyReminders = async (enabled: boolean): Promise<boolean> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return false;

    if (!(await ensurePermission())) {
      log.info('Reminders enabled but not permitted by the OS');
      return false;
    }
    await ensureChannel();

    if (REMINDERS.mode === 'test') {
      const reminder = buildReminder(0);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          data: { topicId: reminder.topicId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: TEST_DELAY_SECONDS,
          repeats: false,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
      });
      log.info('Test reminder scheduled', { seconds: TEST_DELAY_SECONDS });
      return true;
    }

    const mornings = upcomingMornings(new Date());
    await Promise.all(
      mornings.map(async (date, index) => {
        const reminder = buildReminder(index);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body: reminder.body,
            data: { topicId: reminder.topicId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
        });
      }),
    );
    log.info('Daily reminders scheduled', { days: mornings.length });
    return true;
  } catch (error) {
    // A reminder that fails to schedule must never take the app down with it.
    log.warn('Could not schedule reminders', { error: describeError(error) });
    return false;
  }
};

/** Foreground presentation. Called once, from the app root. */
export const configureNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};
