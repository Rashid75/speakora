import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { getPersonality } from '@/data/personalities';
import type { RootStackParamList } from '@/navigation/types';
import { conversationRepository } from '@/repositories';
import { createConversation } from '@/services/conversation/ConversationService';
import { useSettings } from '@/state/SettingsContext';
import { HIT_SLOP, useTheme } from '@/theme';
import type { AppFailure, Conversation, ConversationMessage } from '@/types';
import { copyFor } from '@/utils/errors';
import { formatTimer } from '@/utils/time';
import { ChatSettingsSheet } from '../components/ChatSettingsSheet';
import { InterimTurn } from '../components/InterimTurn';
import { MicControls } from '../components/MicControls';
import { TranscriptTurn } from '../components/TranscriptTurn';
import { TurnFeedbackSheet, type TurnFeedbackMode } from '../components/TurnFeedbackSheet';
import { TypingIndicator } from '../components/TypingIndicator';
import { useConversationEngine } from '../hooks/useConversationEngine';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

/**
 * A fully transparent version of a palette colour, for the top of the scrim.
 * Fading to plain `transparent` interpolates through black on iOS, which shows
 * up as a grey smear over a light background.
 */
const fadeOut = (color: string): string =>
  /^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : 'transparent';

/** Which turn's feedback sheet is open, and which face of it. */
interface FeedbackTarget {
  readonly messageId: string;
  readonly mode: TurnFeedbackMode;
}

/**
 * The core screen (artboard 1d).
 *
 * The transcript owns the screen and the mic owns the bottom - there is no
 * voice-state block above the conversation any more, because the mic itself
 * now carries that state. Feedback stays where the product rule puts it:
 * behind a button under each of the learner's own turns, never pushed into
 * the conversation.
 *
 * It follows the active theme like every other screen. The artboard painted
 * this one on the near-black `ink` regardless of scheme, which made sense when
 * a glowing voice stage owned the top half; as a plain transcript it was just
 * one screen that ignored the user's light theme.
 */
export function ConversationScreen({ navigation, route }: Props): React.JSX.Element {
  const { settings } = useSettings();
  const params = route.params;
  const resumeId = 'resumeId' in params ? params.resumeId : undefined;

  // A fresh conversation is built once, synchronously; a resumed one has to be
  // read back off disk first. Either way the session below is only mounted with
  // a conversation already in hand, so the engine never has to swap the record
  // out from under itself mid-session.
  const topic = 'resumeId' in params ? undefined : params.topic;

  const [start, setStart] = useState<Conversation | undefined>(undefined);
  const [isResumed, setIsResumed] = useState(false);
  const [loadError, setLoadError] = useState<AppFailure | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    // Opening a topic that already has an unfinished conversation picks that one
    // up rather than starting a second: two half-finished conversations on the
    // same topic is not something anyone asked for, and the old one would just
    // sit in History. Clearing it is an explicit choice inside the chat.
    const load = async (): Promise<void> => {
      if (resumeId !== undefined) {
        const result = await conversationRepository.get(resumeId);
        if (cancelled) return;
        if (!result.ok) {
          setLoadError(result.error);
          return;
        }
        // Reopening makes it live again; otherwise the autosave on the way out
        // would write it straight back as finished.
        setStart({ ...result.value, status: 'active' });
        setIsResumed(true);
        return;
      }

      if (!topic) return;
      const existing = await conversationRepository.findResumable(topic.id);
      if (cancelled) return;

      if (existing) {
        setStart({ ...existing, status: 'active' });
        setIsResumed(true);
        return;
      }
      setStart(createConversation(topic, settings));
      setIsResumed(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
    // Settings are read once, at the moment the conversation is created; the
    // engine picks up later changes through its own ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, topic]);

  if (loadError) {
    return (
      <Screen>
        <ErrorState failure={loadError} onRetry={() => navigation.goBack()} />
      </Screen>
    );
  }

  if (!start) {
    return (
      <Screen>
        <LoadingState message="Picking up where you left off…" />
      </Screen>
    );
  }

  return <ConversationSession navigation={navigation} conversation={start} isResumed={isResumed} />;
}

function ConversationSession({
  navigation,
  conversation: startingConversation,
  isResumed,
}: {
  readonly navigation: Props['navigation'];
  readonly conversation: Conversation;
  readonly isResumed: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  const engine = useConversationEngine({
    conversation: startingConversation,
    settings,
    isResumed,
  });
  const { state } = engine;

  const personality = useMemo(
    () => getPersonality(settings.personalityId),
    [settings.personalityId],
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackTarget | undefined>(undefined);
  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const isEnding = useRef(false);

  const messages = state.conversation.messages;
  const thinking = state.phase === 'processing' || state.phase === 'connecting';

  // Skip is offered only on the question actually waiting for an answer: the
  // partner's message, when it is the last thing said and the engine is free to
  // ask another. Anything earlier has already been answered or skipped past.
  const last = messages[messages.length - 1];
  const skippableId =
    last?.role === 'assistant' &&
    !thinking &&
    !state.isPaused &&
    !state.isFinishing &&
    state.phase !== 'ended'
      ? last.id
      : undefined;

  // Resolved on every render so the sheet always shows the latest analysis for
  // that turn, not the snapshot taken when it was opened.
  const feedbackMessage = useMemo(
    () => (feedback ? messages.find((message) => message.id === feedback.messageId) : undefined),
    [feedback, messages],
  );

  useEffect(() => {
    if (messages.length === 0) return;
    const id = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [messages.length]);

  // The list footer - the typing dots, then the live transcript - appears and
  // grows without `messages` changing, so the effect above never fires for it,
  // and `onContentSizeChange` runs before the footer has finished laying out.
  // Re-pinning on the next frame is what keeps the tail on screen instead of
  // leaving it just below the fold.
  useEffect(() => {
    const frame = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [thinking, state.interimTranscript]);

  const finishConversation = useCallback(async () => {
    if (isEnding.current) return;
    isEnding.current = true;
    const conversation = await engine.end();
    navigation.replace('ConversationDetail', {
      conversationId: conversation.id,
      fromConversation: true,
    });
  }, [engine, navigation]);

  const confirmEnd = useCallback(() => {
    if (state.conversation.stats.userTurns === 0) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'End this conversation?',
      'We will save the transcript and put your notes together.',
      [
        { text: 'Keep talking', style: 'cancel' },
        { text: 'End & review', style: 'destructive', onPress: () => void finishConversation() },
      ],
    );
  }, [finishConversation, navigation, state.conversation.stats.userTurns]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.phase === 'ended' || state.conversation.stats.userTurns === 0) return false;
      confirmEnd();
      return true;
    });
    return () => subscription.remove();
  }, [confirmEnd, state.conversation.stats.userTurns, state.phase]);

  const showGrammar = useCallback((message: ConversationMessage) => {
    setFeedback({ messageId: message.id, mode: 'grammar' });
  }, []);

  const showPolished = useCallback((message: ConversationMessage) => {
    setFeedback({ messageId: message.id, mode: 'polished' });
  }, []);

  const confirmStartOver = useCallback(() => {
    if (state.conversation.stats.userTurns === 0) {
      engine.restart();
      return;
    }
    Alert.alert(
      'Clear these messages?',
      'The transcript and its notes are deleted, and the topic starts again from the beginning. This cannot be undone.',
      [
        { text: 'Keep them', style: 'cancel' },
        { text: 'Clear & restart', style: 'destructive', onPress: engine.restart },
      ],
    );
  }, [engine, state.conversation.stats.userTurns]);

  const togglePause = useCallback(() => {
    if (state.isPaused) engine.resume();
    else engine.pause();
  }, [engine, state.isPaused]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ConversationMessage>) => (
      <TranscriptTurn
        message={item}
        partner={personality}
        userProfile={settings.profile}
        onReplay={engine.replay}
        onShowGrammar={showGrammar}
        onShowPolished={showPolished}
        showSkip={item.id === skippableId}
        onSkipQuestion={engine.skipQuestion}
        isSpeaking={item.id === state.speakingMessageId}
      />
    ),
    [
      engine.replay,
      engine.skipQuestion,
      personality,
      settings.profile,
      showGrammar,
      showPolished,
      skippableId,
      state.speakingMessageId,
    ],
  );

  const failureCopy = state.failure ? copyFor(state.failure) : undefined;
  const permissionBlocked = state.failure?.code === 'permission_denied';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={confirmEnd}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Leave conversation"
          style={[styles.headerButton, { backgroundColor: theme.colors.surfaceMuted }]}
        >
          <Icon name="arrowLeft" size={18} color={theme.colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <AppText variant="calloutStrong" numberOfLines={1}>
            {state.conversation.topicTitle}
          </AppText>
          <AppText variant="footnote" color="textTertiary">
            {formatTimer(state.elapsedMs)} · turn {state.conversation.stats.userTurns}
          </AppText>
        </View>

        <Pressable
          onPress={() => setSettingsOpen(true)}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Conversation settings"
          accessibilityHint="Change the voice, accent, speed and difficulty without leaving the chat"
          style={[styles.headerButton, { backgroundColor: theme.colors.surfaceMuted }]}
        >
          <Icon name="dots" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.flex}>
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={
            thinking ? (
              <TypingIndicator partner={personality} />
            ) : state.interimTranscript ? (
              <InterimTurn text={state.interimTranscript} userProfile={settings.profile} />
            ) : null
          }
        />

        {/* The transcript dissolves into the dock instead of stopping at a
            hard line - without it the two surfaces read as unrelated slabs. */}
        <LinearGradient
          pointerEvents="none"
          colors={[fadeOut(theme.colors.background), theme.colors.background]}
          style={styles.scrim}
        />
      </View>

      {failureCopy ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: theme.colors.dangerSoft, borderRadius: theme.radius.md },
          ]}
          accessibilityRole="alert"
        >
          <AppText variant="subhead" color="danger">
            {failureCopy.title}
          </AppText>
          <AppText variant="footnote" color="textSecondary" style={styles.bannerBody}>
            {failureCopy.message}
          </AppText>
          <View style={styles.bannerActions}>
            {permissionBlocked ? (
              <Button
                label="Open settings"
                size="sm"
                variant="muted"
                onPress={() => void Linking.openSettings()}
              />
            ) : null}
            <Button label="Dismiss" size="sm" variant="ghost" onPress={engine.dismissError} />
          </View>
        </View>
      ) : state.notice ? (
        <View style={styles.notice} accessibilityRole="alert">
          <AppText variant="footnote" color="textSecondary" align="center">
            {state.notice}
          </AppText>
        </View>
      ) : null}

      {/* The mic sits on its own raised dock so the transcript reads as a
          separate surface that scrolls underneath it, rather than as one
          column that happens to end in a button. */}
      <View
        style={[
          styles.dock,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderTopColor: theme.colors.border,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingBottom: Math.max(insets.bottom, 14) + 8,
            shadowColor: theme.colors.shadow,
            shadowOpacity: theme.isDark ? 0.5 : 0.1,
          },
        ]}
      >
        <MicControls
          phase={state.phase}
          disabled={state.isFinishing || state.phase === 'ended'}
          inputLevel={state.inputLevel}
          onToggleMic={engine.toggleListening}
          onResume={engine.resume}
        />
      </View>

      <TurnFeedbackSheet
        visible={feedback !== undefined}
        mode={feedback?.mode ?? 'grammar'}
        message={feedbackMessage}
        onClose={() => setFeedback(undefined)}
      />

      <ChatSettingsSheet
        visible={settingsOpen}
        isPaused={state.isPaused}
        onClose={() => setSettingsOpen(false)}
        onTogglePause={togglePause}
        onEnd={confirmEnd}
        onStartOver={confirmStartOver}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 14, flexGrow: 1 },
  banner: { marginHorizontal: 20, marginBottom: 8, padding: 12 },
  bannerBody: { marginTop: 2 },
  bannerActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  notice: { paddingHorizontal: 24, paddingBottom: 6 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 },
  dock: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Cast upwards, onto the transcript - the opposite of every card in the
    // app, because this surface sits in front of the scrolling content.
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 12 : 0,
  },
});
