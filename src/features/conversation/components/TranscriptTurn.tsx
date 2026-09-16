import React, { memo, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Personality } from '@/data/personalities';
import { HIT_SLOP, durations, useTheme } from '@/theme';
import type { ConversationMessage, UserProfile } from '@/types';

export interface TranscriptTurnProps {
  readonly message: ConversationMessage;
  /** Drives the name and the avatar shown beside it. */
  readonly partner: Personality;
  /** Drives the learner's own avatar on their turns. */
  readonly userProfile: UserProfile;
  readonly onReplay: (message: ConversationMessage) => void;
  /** Opens the grammar sheet for this turn. */
  readonly onShowGrammar: (message: ConversationMessage) => void;
  /** Opens the polished-rewrite sheet for this turn. */
  readonly onShowPolished: (message: ConversationMessage) => void;
  /**
   * True only for the partner's latest message while it is still the question
   * on the table. Anything older has already been answered or skipped past.
   */
  readonly showSkip: boolean;
  readonly onSkipQuestion: () => void;
  /** True while this exact message is being read aloud. */
  readonly isSpeaking: boolean;
}

/**
 * One turn in the live transcript (artboard 1d).
 *
 * The two roles are deliberately asymmetric: the partner's words are plain
 * prose so they read like speech, while the learner's are boxed so they can see
 * their own contribution at a glance.
 *
 * Each of the learner's turns carries two buttons once its analysis lands -
 * grammar and polished. They are only ever buttons: the correction itself stays
 * behind a tap, so the conversation is never interrupted by feedback.
 *
 * Memoised because a long conversation re-renders on every timer tick and every
 * interim transcript update.
 */
export const TranscriptTurn = memo(function TranscriptTurn({
  message,
  partner,
  userProfile,
  onReplay,
  onShowGrammar,
  onShowPolished,
  showSkip,
  onSkipQuestion,
  isSpeaking,
}: TranscriptTurnProps): React.JSX.Element {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const isUser = message.role === 'user';

  if (!isUser) {
    return (
      <View style={styles.aiTurn}>
        {/* Plain text, not a button. Replay is an explicit control below, so
            the words themselves can just be read as words. */}
        <View style={styles.aiBody}>
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
          <AppText variant="body" color="aiBubbleText">
            {message.text}
          </AppText>
        </View>

        <View style={styles.actions}>
          {/* The button becomes the indicator rather than sitting beside one:
              two controls where one was is a worse answer to "is it playing?"
              than the control itself saying so. */}
          {isSpeaking ? (
            <View
              style={styles.turnButton}
              accessible
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Playing what ${partner.name} said`}
            >
              <SpeakingBars color={theme.colors.primary} reduceMotion={reduceMotion} />
              <AppText variant="caption" style={{ color: theme.colors.primary }}>
                Speaking
              </AppText>
            </View>
          ) : (
            <TurnButton
              label="Play again"
              icon="speaker"
              accessibilityLabel={`Play again what ${partner.name} said`}
              accessibilityHint="Reads this message out loud"
              tone="quiet"
              onPress={() => onReplay(message)}
            />
          )}

          {/* Attached to the question it skips, not to the mic - so it is
              obvious which question is being passed on, and it disappears the
              moment that question stops being the live one. */}
          {showSkip ? (
            <>
              <View style={[styles.separator, { backgroundColor: theme.colors.textTertiary }]} />
              <TurnButton
                label="Ask me something else"
                icon="skip"
                accessibilityLabel="Skip this question"
                accessibilityHint="Asks your partner for a different question instead"
                tone="quiet"
                onPress={onSkipQuestion}
              />
            </>
          ) : null}
        </View>
      </View>
    );
  }

  const ready = message.analysisState === 'ready' && message.analysis !== undefined;
  const grammarCount = message.analysis?.grammar.length ?? 0;

  return (
    <View style={styles.userTurn}>
      {/* Mirrored: the partner reads avatar-then-name on the left, so the
          learner reads name-then-avatar on the right. */}
      <View style={styles.speaker}>
        <AppText variant="footnote" color="textTertiary">
          You
        </AppText>
        <UserAvatar profile={userProfile} size={22} />
      </View>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.colors.userBubble,
            borderColor: theme.colors.userBubbleBorder,
            borderRadius: theme.radius.lg,
            // The design's asymmetric corner: square-ish on the speaker's side.
            borderBottomRightRadius: theme.radius.xs - 2,
          },
        ]}
      >
        <AppText variant="body" color="userBubbleText">
          {message.text}
        </AppText>
      </View>

      {message.analysisState === 'pending' ? (
        <AppText variant="caption" color="textTertiary">
          Looking at this one…
        </AppText>
      ) : null}

      {ready ? (
        <View style={styles.actions}>
          <TurnButton
            label="Grammar"
            count={grammarCount}
            accessibilityLabel={
              grammarCount === 0
                ? 'Grammar in this reply. Nothing to fix.'
                : `Grammar in this reply. ${grammarCount} ${grammarCount === 1 ? 'mistake' : 'mistakes'}.`
            }
            tone={grammarCount === 0 ? 'quiet' : 'warning'}
            onPress={() => onShowGrammar(message)}
          />
          <View style={[styles.separator, { backgroundColor: theme.colors.textTertiary }]} />
          <TurnButton
            label="Polish"
            accessibilityLabel="See a more polished version of this reply"
            tone="quiet"
            onPress={() => onShowPolished(message)}
          />
        </View>
      ) : null}
    </View>
  );
});

const BAR_COUNT = 3;

/**
 * Three bars rising and falling while a message plays.
 *
 * One driver read at three offsets, the same trick the mic meter uses. There is
 * no level to track here - the audio is going out, not coming in - so this is
 * honestly decorative, and the word "Speaking" beside it carries the meaning.
 */
function SpeakingBars({
  color,
  reduceMotion,
}: {
  readonly color: string;
  readonly reduceMotion: boolean;
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

  return (
    <View
      style={styles.bars}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: BAR_COUNT }, (_, index) => {
        const scale = driver.interpolate({
          inputRange: [index - 1, index, index + 1, BAR_COUNT + index],
          outputRange: [0.35, 1, 0.35, 0.35],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            // Bars are positional and never reordered.
            key={index}
            style={[
              styles.bar,
              { backgroundColor: color, transform: [{ scaleY: reduceMotion ? 0.6 : scale }] },
            ]}
          />
        );
      })}
    </View>
  );
}

/**
 * A quiet text action under a turn, not a chip: the transcript belongs to the
 * conversation, and a pair of filled buttons under every reply turns it into a
 * feedback list. `HIT_SLOP` keeps the tap target comfortable at this size.
 */
function TurnButton({
  label,
  icon,
  count,
  accessibilityLabel,
  accessibilityHint = 'Opens it in a sheet you can close again',
  tone,
  onPress,
}: {
  readonly label: string;
  /** Small leading glyph. Omitted for the text-only feedback actions. */
  readonly icon?: 'speaker' | 'skip';
  /** Rendered as a small numeral beside the label. Omitted when zero. */
  readonly count?: number;
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
  readonly tone: 'quiet' | 'warning';
  readonly onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const color = tone === 'warning' ? theme.colors.warningText : theme.colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.turnButton, { opacity: pressed ? 0.55 : 1 }]}
    >
      {icon ? <Icon name={icon} size={13} color={color} strokeWidth={1.9} /> : null}
      <AppText variant="caption" style={{ color }}>
        {label}
      </AppText>
      {count !== undefined && count > 0 ? (
        <View style={[styles.count, { backgroundColor: theme.colors.warningSoft }]}>
          <AppText
            variant="caption"
            style={[styles.countText, { color: theme.colors.warningText }]}
          >
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aiTurn: { gap: 8, alignItems: 'flex-start' },
  aiBody: { gap: 6, alignSelf: 'stretch' },
  speaker: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  skip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  userTurn: { gap: 6, alignItems: 'flex-end' },
  bubble: { maxWidth: 300, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  separator: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.6 },
  turnButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 13 },
  bar: { width: 2.5, height: 13, borderRadius: 1.25 },
  count: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 10, lineHeight: 16 },
});
