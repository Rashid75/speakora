import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { createAudioPlayer } from 'expo-audio';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Portrait } from '@/components/ui/Portrait';
import type { Personality } from '@/data/personalities';
import { HIT_SLOP, MIN_TOUCH_TARGET } from '@/theme';
import type { AppFailure, ConversationMessage, VoicePhase } from '@/types';
import { darken, fadeOut, withAlpha } from '@/utils/color';
import { copyFor } from '@/utils/errors';
import { formatTimer } from '@/utils/time';
import { micGlyph, micHint, micLabel } from './MicControls';
import ringbackTone from '../../../../assets/audio/ringback.wav';

export interface AudioCallOverlayProps {
  /** `off` never reaches here - the caller unmounts the overlay instead. */
  readonly phase: 'ringing' | 'connected';
  readonly partner: Personality;
  /** The engine's voice state, which drives the middle button. */
  readonly voicePhase: VoicePhase;
  readonly messages: readonly ConversationMessage[];
  /** The learner's live, not-yet-committed speech. */
  readonly interimTranscript: string;
  readonly subtitlesOn: boolean;
  /** Milliseconds since the partner picked up. */
  readonly elapsedMs: number;
  /** Surfaced on the call itself; the chat's banner is behind this modal. */
  readonly failure: AppFailure | undefined;
  readonly onDismissError: () => void;
  readonly onToggleSubtitles: () => void;
  /** Opens the mic, or closes it and sends what was said. */
  readonly onToggleMic: () => void;
  /** Lifts a pause. The mic button becomes a play control while paused. */
  readonly onResume: () => void;
  readonly onHangUp: () => void;
}

/** Roughly the height the control dock needs, used to size the portrait. */
const DOCK_HEIGHT = 124;
/** The subtitle panel, plus the gap above it. */
const SUBTITLE_BLOCK = 214;
/** Turns beyond this scroll out of the way rather than being dropped. */
const SUBTITLE_TURNS = 8;

/** Pure white and pure black, mixed at runtime for the on-scrim palette. */
const WHITE = '#FFFFFF';
const BLACK = '#000000';

/**
 * The call.
 *
 * A voice call with the partner's picture on it, which is what it has always
 * actually been: there is no camera and no second person, and nothing here is
 * live except the microphone. What the learner gets is the nerve of speaking
 * to a face in real time, which a chat transcript cannot rehearse. The picture
 * is a drawing, and the screen reader says so.
 *
 * It is a modal over the chat, not a route. The chat screen - and with it the
 * engine, the transcript and the running timer - stays mounted underneath, so
 * hanging up puts the learner back exactly where they were with nothing
 * reloaded and nothing lost.
 *
 * Painted on the partner's own portrait background rather than a theme colour,
 * because the portrait fills the screen and any other backdrop would show as a
 * seam behind their shoulders. Controls therefore sit on a dark scrim with
 * white glyphs in both schemes - that contrast is a property of this screen,
 * not of the theme.
 */
export function AudioCallOverlay({
  phase,
  partner,
  voicePhase,
  messages,
  interimTranscript,
  subtitlesOn,
  elapsedMs,
  failure,
  onDismissError,
  onToggleSubtitles,
  onToggleMic,
  onResume,
  onHangUp,
}: AudioCallOverlayProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const surface = partner.portrait.background;
  const ringing = phase === 'ringing';

  useRingback(ringing);

  // With the subtitles hidden there is nothing to make room for, so the face
  // takes that space instead of leaving a gap where the panel used to be - and
  // grows with it, because the portrait is sized off the stage rather than off
  // the screen. The floor stops a short screen (or a big system font) from
  // shrinking the face to a strip; the panel shrinks first.
  const available = Math.max(0, height - insets.top - insets.bottom - DOCK_HEIGHT);
  const stageHeight = subtitlesOn
    ? Math.max(available - SUBTITLE_BLOCK, available * 0.5)
    : available;
  const portraitSize = Math.max(width, stageHeight);

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onHangUp}
      accessibilityViewIsModal
    >
      <View style={[styles.root, { backgroundColor: surface }]}>
        {ringing ? (
          <RingingView
            partner={partner}
            surface={surface}
            portraitSize={Math.max(width, height) * 1.1}
            insets={insets}
            failure={failure}
            onHangUp={onHangUp}
          />
        ) : (
          <>
            <View style={[styles.stage, { height: stageHeight }]}>
              <View
                style={[styles.portrait, { left: (width - portraitSize) / 2 }]}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${partner.name}, an AI-generated illustration`}
              >
                <Portrait spec={partner.portrait} size={portraitSize} />
              </View>

              {/* Melts the bottom edge of the square portrait into the screen,
                  so it reads as a live feed rather than a pasted-in picture. */}
              <LinearGradient
                pointerEvents="none"
                colors={[fadeOut(surface), surface]}
                style={styles.stageFade}
              />
            </View>

            {/* Darkens the lower half so white controls and white subtitles
                hold their contrast over any partner's pastel. */}
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', withAlpha(darken(surface, 0.78), 0.86)]}
              style={[styles.scrim, { height: height * 0.52 }]}
            />

            <Pressable
              onPress={onHangUp}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Leave the call"
              accessibilityHint="Goes back to the chat. The conversation keeps going."
              style={[styles.back, { top: insets.top + 8 }]}
            >
              <Icon name="arrowLeft" size={22} color={WHITE} />
            </Pressable>

            {/* Who is on the line and how long for, the way every call has
                shown it. On its own dark chip rather than straight onto the
                portrait, because the top of the picture is a pale wall in some
                partners' artwork and white text would vanish into it. */}
            <View style={[styles.callBadge, { top: insets.top + 8 }]} pointerEvents="none">
              <View style={[styles.badgePill, { backgroundColor: withAlpha(BLACK, 0.38) }]}>
                <AppText variant="calloutStrong" align="center" style={styles.onScrim}>
                  {partner.name}
                </AppText>
                <AppText
                  variant="footnote"
                  align="center"
                  style={styles.onScrimMuted}
                  accessibilityLabel={`On the call for ${spokenDuration(elapsedMs)}`}
                >
                  {formatTimer(elapsedMs)}
                </AppText>
              </View>
            </View>

            <View
              style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}
              pointerEvents="box-none"
            >
              <CallStatus
                partnerName={partner.name}
                voicePhase={voicePhase}
                failure={failure}
                onDismissError={onDismissError}
              />

              {subtitlesOn ? (
                <Subtitles
                  partnerName={partner.name}
                  messages={messages}
                  interimTranscript={interimTranscript}
                  voicePhase={voicePhase}
                />
              ) : null}

              <CallDock
                voicePhase={voicePhase}
                subtitlesOn={subtitlesOn}
                onToggleSubtitles={onToggleSubtitles}
                onToggleMic={onToggleMic}
                onResume={onResume}
                onHangUp={onHangUp}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

/**
 * Plays the ringing tone for as long as the call is ringing.
 *
 * The tone is synthesised and committed rather than licensed (see
 * `scripts/generate-ringback.mjs`), and it loops because the file holds one
 * three-second cadence rather than a recording of a phone ringing for a minute.
 */
function useRingback(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    // Built here rather than through `useAudioPlayer` so the tone exists only
    // while the phone is actually ringing: two seconds of a twenty minute call.
    const player = createAudioPlayer(ringbackTone);
    player.loop = true;
    player.play();

    return () => {
      // Answering has to silence the tone in the same frame, so it is stopped
      // before the native object is handed back.
      player.pause();
      player.release();
    };
  }, [active]);
}

function RingingView({
  partner,
  surface,
  portraitSize,
  insets,
  failure,
  onHangUp,
}: {
  readonly partner: Personality;
  readonly surface: string;
  readonly portraitSize: number;
  readonly insets: { readonly top: number; readonly bottom: number };
  readonly failure: AppFailure | undefined;
  readonly onHangUp: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.flex}>
      {/* The same portrait, blown up and pushed back behind a heavy wash: a
          suggestion of who is being called, rather than a second picture of
          them competing with the one in the middle. */}
      <View style={styles.backdrop} pointerEvents="none">
        <Portrait spec={partner.portrait} size={portraitSize} />
      </View>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(surface, 0.82) }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', withAlpha(darken(surface, 0.72), 0.5)]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        onPress={onHangUp}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Cancel the call"
        accessibilityHint="Goes back to the chat"
        style={[styles.back, { top: insets.top + 8 }]}
      >
        <Icon name="arrowLeft" size={22} color={WHITE} />
      </Pressable>

      <View style={styles.ringingCentre}>
        <Avatar
          initial={partner.initial}
          portrait={partner.portrait}
          size={172}
          backgroundColor={partner.avatarColor}
          textColor={partner.avatarTextColor}
          style={styles.ringingAvatar}
          label={`${partner.name}, an AI-generated illustration`}
        />
        <AppText variant="title2" align="center" style={styles.onScrim}>
          {partner.name}
        </AppText>
        <AppText
          variant="body"
          align="center"
          style={styles.onScrimMuted}
          accessibilityLiveRegion="polite"
        >
          Connecting…
        </AppText>
      </View>

      {/* Same paddings as the connected dock, so the button does not jump
          down the screen the moment the partner picks up. */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {failure ? <FailureLine failure={failure} /> : null}
        <View style={styles.ringingDock}>
          <CallButton
            icon="phoneDown"
            label="End call"
            tone="danger"
            accessibilityLabel="Cancel the call"
            accessibilityHint="Goes back to the chat before the call connects"
            onPress={onHangUp}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * The live transcript, both sides of it.
 *
 * Deliberately not the whole history: a call is a thing happening now, and a
 * scrollback reaching twenty minutes back turns this into the chat screen it is
 * meant to be an alternative to.
 */
function Subtitles({
  partnerName,
  messages,
  interimTranscript,
  voicePhase,
}: {
  readonly partnerName: string;
  readonly messages: readonly ConversationMessage[];
  readonly interimTranscript: string;
  readonly voicePhase: VoicePhase;
}): React.JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const recent = messages.slice(-SUBTITLE_TURNS);
  const thinking = voicePhase === 'processing' || voicePhase === 'connecting';

  return (
    <View
      style={[styles.subtitles, { backgroundColor: withAlpha(BLACK, 0.46) }]}
      accessibilityLiveRegion="polite"
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.subtitleBody}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {recent.map((message) => (
          <View key={message.id} style={styles.subtitleTurn}>
            <AppText variant="overline" style={styles.subtitleSpeaker}>
              {message.role === 'assistant' ? partnerName : 'You'}
            </AppText>
            <AppText variant="body" style={styles.onScrim}>
              {message.text}
            </AppText>
          </View>
        ))}

        {interimTranscript ? (
          <View style={styles.subtitleTurn}>
            <AppText variant="overline" style={styles.subtitleSpeaker}>
              You
            </AppText>
            <AppText variant="body" style={styles.onScrimMuted}>
              {interimTranscript}
            </AppText>
          </View>
        ) : thinking ? (
          <AppText variant="body" style={styles.onScrimMuted}>
            {partnerName} is thinking…
          </AppText>
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * The one line on the call that says what the app is doing.
 *
 * The chat's error banner and typing dots are both behind this modal, so
 * without this a request that fails - or one that is simply taking a while -
 * shows as a face doing nothing at all, which is indistinguishable from a
 * broken call. It is drawn whether or not subtitles are on, because it is
 * about the app rather than about the conversation.
 */
function CallStatus({
  partnerName,
  voicePhase,
  failure,
  onDismissError,
}: {
  readonly partnerName: string;
  readonly voicePhase: VoicePhase;
  readonly failure: AppFailure | undefined;
  readonly onDismissError: () => void;
}): React.JSX.Element | null {
  if (failure) {
    return (
      <Pressable
        onPress={onDismissError}
        accessibilityRole="button"
        accessibilityLabel={`${copyFor(failure).title}. Tap to dismiss.`}
      >
        <FailureLine failure={failure} />
      </Pressable>
    );
  }

  // Leaving the app puts the conversation on hold, and coming back to a face
  // that has stopped responding needs saying out loud - otherwise the call
  // looks broken rather than parked.
  if (voicePhase === 'paused') {
    return (
      <AppText
        variant="footnote"
        align="center"
        style={styles.status}
        accessibilityLiveRegion="polite"
      >
        On hold
      </AppText>
    );
  }

  if (voicePhase !== 'processing' && voicePhase !== 'connecting') return null;

  return (
    <AppText
      variant="footnote"
      align="center"
      style={styles.status}
      accessibilityLiveRegion="polite"
    >
      {partnerName} is thinking…
    </AppText>
  );
}

function FailureLine({ failure }: { readonly failure: AppFailure }): React.JSX.Element {
  const copy = copyFor(failure);
  return (
    <View style={[styles.failure, { backgroundColor: withAlpha(DANGER, 0.92) }]}>
      <AppText variant="footnoteStrong" align="center" style={styles.onScrim}>
        {copy.title}
      </AppText>
      <AppText variant="footnote" align="center" style={styles.onScrimMuted}>
        {copy.message}
      </AppText>
    </View>
  );
}

function CallDock({
  voicePhase,
  subtitlesOn,
  onToggleSubtitles,
  onToggleMic,
  onResume,
  onHangUp,
}: {
  readonly voicePhase: VoicePhase;
  readonly subtitlesOn: boolean;
  readonly onToggleSubtitles: () => void;
  readonly onToggleMic: () => void;
  readonly onResume: () => void;
  readonly onHangUp: () => void;
}): React.JSX.Element {
  const paused = voicePhase === 'paused';

  return (
    <View style={[styles.dock, { backgroundColor: withAlpha(BLACK, 0.42) }]}>
      <CallButton
        icon="phoneDown"
        label="End call"
        tone="danger"
        accessibilityLabel="Leave the call"
        accessibilityHint="Goes back to the chat. The conversation keeps going."
        onPress={onHangUp}
      />
      {/* The chat's mic button, on the call's dock: same glyph, same spoken
          label, same tap. Nothing about a call makes the microphone the app's
          to open - the learner unmutes to speak and mutes when they are done,
          here exactly as they do in the chat. */}
      <CallButton
        icon={micGlyph(voicePhase)}
        label={micCaption(voicePhase)}
        accessibilityLabel={micLabel(voicePhase)}
        accessibilityHint={micHint(voicePhase)}
        active={voicePhase === 'listening'}
        onPress={paused ? onResume : onToggleMic}
      />
      <CallButton
        icon={subtitlesOn ? 'captions' : 'captionsOff'}
        label="Subtitles"
        active={subtitlesOn}
        accessibilityLabel={subtitlesOn ? 'Subtitles on' : 'Subtitles off'}
        accessibilityHint={
          subtitlesOn ? 'Hides the live transcript' : 'Shows the live transcript of both of you'
        }
        onPress={onToggleSubtitles}
      />
    </View>
  );
}

function CallButton({
  icon,
  label,
  tone,
  active,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: {
  readonly icon: IconName;
  readonly label: string;
  readonly tone?: 'danger';
  readonly active?: boolean;
  readonly accessibilityLabel: string;
  readonly accessibilityHint: string;
  readonly onPress: () => void;
}): React.JSX.Element {
  const background = tone === 'danger' ? DANGER : withAlpha(WHITE, active ? 0.26 : 0.14);

  return (
    <View style={styles.buttonSlot}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: background, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <Icon name={icon} size={26} color={WHITE} />
      </Pressable>
      <AppText variant="caption" align="center" numberOfLines={1} style={styles.buttonLabel}>
        {label}
      </AppText>
    </View>
  );
}

/**
 * The hang-up red, taken from the palette's `danger` but not read through the
 * theme: this button sits on the partner's portrait rather than on a themed
 * surface, and it has to be the same unmistakable red in every theme.
 */
const DANGER = '#FA5E5B';

/**
 * `03:07` is a clock face, and a screen reader says it as "three oh seven".
 * The badge keeps the digits and hands assistive tech the words.
 */
const spokenDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  return parts.join(' ');
};

/**
 * Two words under the mic button.
 *
 * `micLabel` is the full sentence a screen reader gets; this is what fits on a
 * dock. Neither claims the app is listening when the microphone is shut.
 *
 * On hold is the one state where the caption names the action rather than the
 * state: "On hold" is already said, larger, in the line above the dock, and
 * repeating it on a button the learner has to press to get out of it tells
 * them nothing they can act on.
 */
export const micCaption = (phase: VoicePhase): string => {
  switch (phase) {
    case 'paused':
      return 'Resume';
    case 'listening':
      return 'Listening…';
    default:
      return 'Muted';
  }
};

/** Shared so the ringing button lands at exactly the dock's button height. */
const DOCK_ROW = { flexDirection: 'row' as const, paddingVertical: 14, paddingHorizontal: 8 };

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  stage: { alignSelf: 'stretch', overflow: 'hidden' },
  portrait: { position: 'absolute', top: 0 },
  stageFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  callBadge: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  badgePill: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 6, gap: 1 },
  back: {
    position: 'absolute',
    left: 12,
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16 },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringingCentre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  ringingAvatar: { borderWidth: 4, borderColor: 'rgba(255,255,255,0.55)', marginBottom: 20 },
  ringingDock: { ...DOCK_ROW },

  subtitles: { maxHeight: 190, flexShrink: 1, borderRadius: 20, marginBottom: 14 },
  subtitleBody: { padding: 16, gap: 12 },
  subtitleTurn: { gap: 2 },
  subtitleSpeaker: { color: 'rgba(255,255,255,0.55)' },

  dock: { ...DOCK_ROW, borderRadius: 34 },
  buttonSlot: { flex: 1, alignItems: 'center', gap: 8 },
  button: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { color: 'rgba(255,255,255,0.88)' },

  // White on a scrim, in both schemes: the backdrop here is the partner's
  // portrait rather than a themed surface, so a theme text colour would be
  // unreadable half the time.
  onScrim: { color: '#FFFFFF' },
  onScrimMuted: { color: 'rgba(255,255,255,0.72)' },
  status: { color: 'rgba(255,255,255,0.75)', paddingBottom: 12 },
  failure: { borderRadius: 14, padding: 10, gap: 2, marginBottom: 12 },
});
