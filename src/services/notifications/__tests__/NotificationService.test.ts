import * as Notifications from 'expo-notifications';

import { BUILTIN_TOPICS } from '@/data/topics';
import { buildReminder, syncDailyReminders } from '../NotificationService';

const scheduled = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelled = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const permission = Notifications.getPermissionsAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  permission.mockResolvedValue({ granted: true, canAskAgain: true });
});

describe('buildReminder', () => {
  it('names a real topic', () => {
    const reminder = buildReminder(0);
    expect(BUILTIN_TOPICS.some((topic) => topic.id === reminder.topicId)).toBe(true);
  });

  it('never leaks "undefined" into the notification text', () => {
    // Well past the end of both lists, to prove the wrap-around holds.
    for (const day of [0, 3, 97, BUILTIN_TOPICS.length + 1]) {
      const reminder = buildReminder(day);
      expect(reminder.title).not.toMatch(/undefined/);
      expect(reminder.body).not.toMatch(/undefined/);
      expect(reminder.body.length).toBeGreaterThan(0);
    }
  });

  it('suggests a different topic on consecutive days', () => {
    expect(buildReminder(0).topicId).not.toBe(buildReminder(1).topicId);
  });

  it('varies the motivation line between consecutive days', () => {
    expect(buildReminder(0).body).not.toBe(buildReminder(1).body);
  });
});

describe('syncDailyReminders', () => {
  it('clears the queue before rebuilding it, so reminders cannot stack up', async () => {
    await syncDailyReminders(true);
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('schedules nothing when the setting is off', async () => {
    const armed = await syncDailyReminders(false);
    expect(armed).toBe(false);
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(scheduled).not.toHaveBeenCalled();
  });

  it('schedules nothing when the OS refuses permission', async () => {
    permission.mockResolvedValue({ granted: false, canAskAgain: false });
    const armed = await syncDailyReminders(true);
    expect(armed).toBe(false);
    expect(scheduled).not.toHaveBeenCalled();
  });

  it('reports failure rather than throwing when scheduling breaks', async () => {
    scheduled.mockRejectedValueOnce(new Error('no slots'));
    await expect(syncDailyReminders(true)).resolves.toBe(false);
  });
});
