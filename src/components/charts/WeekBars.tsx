import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme';
import type { TrendPoint } from '@/types';
import { dayKey, formatDuration } from '@/utils/time';

export interface WeekBarsProps {
  readonly trend: readonly TrendPoint[];
  readonly height?: number;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const MS_PER_DAY = 86_400_000;

/**
 * Speaking time over the last seven days (artboard 1i).
 *
 * Bars are scaled against the busiest day rather than a fixed ceiling, because
 * the useful comparison here is "which day did I practise most", not an
 * absolute target the app has no business inventing. A day with no practice
 * still renders a stub so the week reads as seven slots, not five.
 */
export function WeekBars({ trend, height = 88 }: WeekBarsProps): React.JSX.Element {
  const theme = useTheme();

  const days = useMemo(() => {
    const byDay = new Map(trend.map((point) => [point.date, point.speakingMs]));
    const today = new Date();
    const todayKey = dayKey(today.toISOString());

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getTime() - (6 - index) * MS_PER_DAY);
      const key = dayKey(date.toISOString());
      // getDay(): 0 = Sunday. The design's row starts on Monday.
      const labelIndex = (date.getDay() + 6) % 7;
      return {
        key,
        label: DAY_LABELS[labelIndex] ?? '',
        speakingMs: byDay.get(key) ?? 0,
        isToday: key === todayKey,
      };
    });
  }, [trend]);

  const max = Math.max(...days.map((day) => day.speakingMs), 1);
  const total = days.reduce((sum, day) => sum + day.speakingMs, 0);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Speaking time over the last seven days, ${formatDuration(total)} in total.`}
    >
      <View style={[styles.row, { height }]}>
        {days.map((day) => {
          const ratio = day.speakingMs / max;
          // A floor of 12px keeps empty days visible as a track.
          const barHeight = day.speakingMs === 0 ? 12 : Math.max(16, ratio * (height - 22));
          return (
            <View key={day.key} style={styles.column}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: day.isToday
                      ? theme.colors.primary
                      : day.speakingMs === 0
                        ? theme.colors.surfaceMuted
                        : theme.colors.primarySoftStrong,
                  },
                ]}
              />
              <AppText
                variant={day.isToday ? 'footnoteStrong' : 'footnote'}
                color={day.isToday ? 'textSecondary' : 'textTertiary'}
              >
                {day.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  column: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
});
