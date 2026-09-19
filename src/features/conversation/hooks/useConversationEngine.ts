import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { CONVERSATION_LIMITS } from '@/config/appConfig';
import { conversationRepository, progressRepository } from '@/repositories';
import {
  analyzeTurn,
  buildAssistantMessage,
  buildUserMessage,
  createConversation,
  finalizeConversation,
  persistDraft,
  recordAnalysis,
  requestReply,
  type UserTurnInput,
} from '@/services/conversation/ConversationService';
import { shouldIntroduceNewTopic } from '@/services/conversation/TopicTransitionPolicy';
import { createLogger } from '@/services/logging/logger';
import {
  beginConversationAudio,
  endConversationAudio,
  handoverDelayMs,
  SpeechRecognition,
  TextToSpeech,
} from '@/services/speech';
import {
  failure,
  type AppSettings,
  type Conversation,
  type ConversationMessage,
  type ProgressState,
  type SpeechRecognitionErrorCode,
} from '@/types';
import { INITIAL_PROGRESS } from '@/utils/cefr';
import { countWords } from '@/utils/text';
import {
  canStartListening,
  conversationReducer,
  createInitialState,
  isBusy,
  type ConversationState,
} from '../state/conversationReducer';

const log = createLogger('conversation-engine');

const TICK_MS = 1000;

/**
 * Phrased as the learner speaking, not as an instruction to the model: the
 * conversation prompt casts the partner as a person, and a bare directive
 * ("ask a different question") makes them break character to obey it.
 */
const SKIP_REQUEST =
  'Sorry, I would rather not answer that one. Could you ask me something else about this topic instead?';

/**
 * What the learner "says" on answering a call.
 *
 * Phrased as them picking up the phone, for the same reason as `SKIP_REQUEST`:
 * the partner is written as a person, and a bare instruction ("greet them,
 * then resume") makes them step out of character to follow it. Answering a
 * call with a hello and a "where were we" is just what people do, and it gets
 * the greeting and the returned question without asking for either.
 */
const CALL_GREETING =
  "Hi! I've picked up - we're talking out loud now instead of messaging. Good to hear you. So, where were we? Carry on from what you were asking me.";

export interface ConversationEngine {
  readonly state: ConversationState;
  readonly canListen: boolean;
  /** Toggles the microphone. */
  toggleListening(): void;
  /** Sends a typed message - the text fallback path. */
  sendText(text: string): void;
  /** Stops the AI mid-sentence so the user can jump in. */
  interrupt(): void;
  /**
   * Closes the microphone and silences the partner, without pausing or ending
   * anything. For handing the voice channel between two screens that share
   * one engine - whatever was being said is discarded, not committed.
   */
  releaseVoice(): void;
  /**
   * Asks the partner for a different question, without answering this one.
   *
   * Sent as speech, because that is what it is - a learner declining a question
   * is a normal conversational move, and the partner should handle it in
   * character rather than being reset.
   */
  skipQuestion(): void;
  /**
   * Answers a call: the partner says hello and picks the thread back up
   * where the chat left it, the way anyone would on being called.
   */
  openCall(): void;
  /** Throws away this conversation and starts the same topic again, clean. */
  restart(): void;
  pause(): void;
  resume(): void;
  /**
   * Switches the engine into (or out of) call behaviour: the partner is
   * audible whatever `autoSpeak` says, for as long as the call is up. The
   * microphone is untouched - it stays the learner's to open and close.
   */
  setCallMode(active: boolean): void;
  end(): Promise<Conversation>;
  openFeedback(messageId: string | undefined): void;
  dismissError(): void;
  replay(message: ConversationMessage): void;
}

export interface UseConversationEngineParams {
  /** Fresh or restored - the engine does not care which, beyond `isResumed`. */
  readonly conversation: Conversation;
  readonly settings: AppSettings;
  /**
   * True when `conversation` came back from storage. Suppresses the opening
   * line, which has already been said and would otherwise be read out again
   * every time the learner picks the conversation back up.
   */
  readonly isResumed: boolean;
}

/**
 * Drives the whole voice loop.
 *
 * Design notes worth knowing before changing anything here:
 *
 * - Reads of `settings` inside async callbacks go through a ref. A user can
 *   change accent or speed mid-conversation, and a closure captured when the
 *   conversation started would silently keep using the old value.
 *
 * - `startListening` and `commitUserTurn` are mutually recursive (hands-free
 *   mode restarts the mic after a reply, and a reply is triggered by the mic).
 *   That cycle is broken with a ref rather than by merging them into one
 *   function, which would make both untestable.
 *
 * - The analysis pass is fired and forgotten *after* the reply is rendered. It
 *   must never gate the conversation - the product principle is that natural
 *   conversation beats feedback.
 *
 * - Every AI call shares one AbortController, aborted on unmount and on `end`,
 *   so leaving the screen mid-request cannot resolve into a dead component.
 */
export function useConversationEngine({
  conversation,
  settings,
  isResumed,
}: UseConversationEngineParams): ConversationEngine {
  const [state, dispatch] = useReducer(conversationReducer, undefined, () =>
    createInitialState(conversation),
  );

  const settingsRef = useRef(settings);
  const stateRef = useRef(state);

  // These refs exist so async callbacks (speech events, AI responses) always see
  // the latest values instead of a stale closure. Writing them during render is
  // a React anti-pattern, so they are synced in an effect that runs on commit -
  // long before any of those callbacks can fire.
  useEffect(() => {
    settingsRef.current = settings;
    stateRef.current = state;
  });

  const progressRef = useRef<ProgressState>(INITIAL_PROGRESS);
  const abortRef = useRef(new AbortController());
  const utteranceStartedAt = useRef<number | undefined>(undefined);
  const isMounted = useRef(true);

  /** A prompt the engine was too busy to send when it was asked for. */
  const pendingPrompt = useRef<string | undefined>(undefined);

  /** Breaks the startListening <-> commitUserTurn cycle. */
  const startListeningRef = useRef<() => void>(() => undefined);
  const commitUserTurnRef = useRef<(input: UserTurnInput) => void>(() => undefined);

  /**
   * True while the learner is on a call.
   *
   * The call screen is voice-first: there is no transcript to fall back on if
   * the partner stays silent, so they are audible there whatever `autoSpeak`
   * says. That is the whole of the override. The microphone is deliberately
   * not part of it - it is opened and closed by hand on the call exactly as it
   * is in the chat, and `handsFreeMode` alone still decides whether it reopens
   * by itself. A ref rather than a settings write, because a call must not
   * quietly rewrite a preference the learner would find changed afterwards.
   */
  const isCallMode = useRef(false);

  /**
   * Which "generation" of speech we are on.
   *
   * `TextToSpeech.stop()` fires the utterance's own completion callback - and
   * that callback is exactly where the hands-free loop reopens the microphone.
   * So silencing the partner to hand the screen over was immediately reopening
   * the mic behind the new screen. Every utterance captures the epoch it was
   * started in, and a callback whose epoch has moved on is ignored: the speech
   * was cancelled, so whatever was meant to happen after it is cancelled too.
   */
  const voiceEpoch = useRef(0);

  /** Whether the mic should reopen once the partner has finished talking. */
  const shouldAutoListen = useCallback(
    (): boolean => settingsRef.current.handsFreeMode && !stateRef.current.isPaused,
    [],
  );

  // --- lifecycle -----------------------------------------------------------

  useEffect(() => {
    isMounted.current = true;
    const controller = abortRef.current;

    void beginConversationAudio();
    // A speaking session is long and mostly hands-off; letting the screen sleep
    // would stop the mic and look like a crash.
    void activateKeepAwakeAsync('conversation');
    void progressRepository.load().then((loaded) => {
      progressRef.current = loaded;
    });

    return () => {
      isMounted.current = false;
      controller.abort();
      void SpeechRecognition.abort();
      void TextToSpeech.stop();
      void endConversationAudio();
      deactivateKeepAwake('conversation');
      // Persist whatever we have; an interrupted session still belongs in history.
      const current = stateRef.current.conversation;
      if (current.status === 'active' && current.stats.userTurns > 0) {
        void persistDraft({ ...current, status: 'abandoned' });
      }
    };
  }, []);

  // Conversation timer, driven by wall-clock deltas rather than a counter, so a
  // dropped interval (common when the JS thread is busy) does not lose time.
  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - last;
      last = now;
      dispatch({ type: 'tick', deltaMs: delta });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Backgrounding must release the mic: iOS suspends the recogniser anyway, and
  // Android would otherwise hold the recording indicator while the app is hidden.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') return;
      if (SpeechRecognition.isListening()) void SpeechRecognition.abort();
      void TextToSpeech.stop();
      if (!stateRef.current.isPaused && stateRef.current.phase !== 'ended') {
        dispatch({ type: 'paused' });
      }
    });
    return () => subscription.remove();
  }, []);

  // --- speaking ------------------------------------------------------------

  /**
   * Speaks, no questions asked.
   *
   * Separate from `speak` because `autoSpeak` is a preference about the app
   * talking on its own, not a mute switch - when the learner taps "play again"
   * they have asked for audio directly, and honouring the auto-play setting
   * there would just look broken.
   */
  const speakNow = useCallback(
    (text: string, messageId: string | undefined, onComplete?: () => void) => {
      const current = settingsRef.current;
      const epoch = voiceEpoch.current;
      /** False once this utterance has been cancelled by something else. */
      const isCurrent = (): boolean => isMounted.current && voiceEpoch.current === epoch;

      void TextToSpeech.speak({
        text,
        accent: current.accent,
        personalityId: current.personalityId,
        speed: current.speakingSpeed,
        onStart: () => {
          if (isMounted.current) dispatch({ type: 'speaking_started', messageId });
        },
        onDone: () => {
          if (!isMounted.current) return;
          dispatch({ type: 'speaking_finished' });
          if (isCurrent()) onComplete?.();
        },
        onError: () => {
          if (!isMounted.current) return;
          // TTS failure is non-fatal: the text is already in the transcript.
          dispatch({ type: 'speaking_finished' });
          dispatch({ type: 'notice', message: 'Could not play that out loud.' });
          if (isCurrent()) onComplete?.();
        },
      });
    },
    [],
  );

  /** Speaks only when the learner has asked for replies to be read aloud. */
  const speak = useCallback(
    (text: string, messageId: string | undefined, onComplete?: () => void) => {
      if (!isCallMode.current && !settingsRef.current.autoSpeak) {
        onComplete?.();
        return;
      }
      speakNow(text, messageId, onComplete);
    },
    [speakNow],
  );

  // --- errors --------------------------------------------------------------

  const handleSpeechError = useCallback((code: SpeechRecognitionErrorCode) => {
    dispatch({ type: 'listening_ended' });

    switch (code) {
      case 'no_match':
        // Not an error from the user's point of view - just silence.
        dispatch({ type: 'notice', message: 'I did not hear anything — tap and try again.' });
        return;
      case 'permission_denied':
        dispatch({ type: 'failed', failure: failure('permission_denied', code, false) });
        return;
      case 'unavailable':
        dispatch({ type: 'failed', failure: failure('speech_unavailable', code, false) });
        return;
      case 'aborted':
        return;
      case 'busy':
        dispatch({ type: 'notice', message: 'Still finishing the last recording — one moment.' });
        return;
      case 'network':
        dispatch({ type: 'failed', failure: failure('offline', code) });
        return;
      default:
        dispatch({ type: 'failed', failure: failure('speech_unavailable', code) });
    }
  }, []);

  // --- listening -----------------------------------------------------------

  const startListening = useCallback(() => {
    if (!canStartListening(stateRef.current)) return;

    void TextToSpeech.stop();
    utteranceStartedAt.current = Date.now();

    // Small gap so the TTS engine fully releases audio focus first.
    setTimeout(() => {
      if (!isMounted.current) return;

      void SpeechRecognition.start({
        accent: settingsRef.current.accent,
        interimResults: settingsRef.current.showInterimTranscript,
        callbacks: {
          onStart: () => {
            if (isMounted.current) dispatch({ type: 'listening_started' });
          },
          onResult: (result) => {
            if (!isMounted.current || result.isFinal) return;
            dispatch({ type: 'interim_transcript', text: result.transcript });
          },
          onVolume: (level) => {
            if (isMounted.current) dispatch({ type: 'input_level', level });
          },
          onError: (code) => {
            if (isMounted.current) handleSpeechError(code);
          },
          onEnd: () => {
            if (!isMounted.current) return;
            const { transcript, confidence } = SpeechRecognition.lastResult();
            dispatch({ type: 'listening_ended' });

            if (transcript.trim().length === 0) {
              dispatch({ type: 'notice', message: 'I did not catch that — try again.' });
              return;
            }

            commitUserTurnRef.current({
              text: transcript,
              inputMode: 'voice',
              speechConfidence: confidence,
              speakingMs: utteranceStartedAt.current
                ? Date.now() - utteranceStartedAt.current
                : undefined,
            });
          },
        },
      });
    }, handoverDelayMs);
  }, [handleSpeechError]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // --- turn handling -------------------------------------------------------

  const runAnalysis = useCallback((userMessage: ConversationMessage, assistantPrompt: string) => {
    if (!settingsRef.current.liveFeedback) {
      dispatch({ type: 'analysis_skipped', messageId: userMessage.id });
      return;
    }
    if (countWords(userMessage.text) < CONVERSATION_LIMITS.minWordsForAnalysis) {
      dispatch({ type: 'analysis_skipped', messageId: userMessage.id });
      return;
    }

    void analyzeTurn({
      conversation: stateRef.current.conversation,
      settings: settingsRef.current,
      userMessage,
      assistantPrompt,
      signal: abortRef.current.signal,
    }).then(async (result) => {
      if (!isMounted.current) return;
      if (!result.ok) {
        dispatch({ type: 'analysis_failed', messageId: userMessage.id });
        return;
      }
      dispatch({ type: 'analysis_ready', messageId: userMessage.id, analysis: result.value });
      // Folding into long-term progress is the slow part; do it after the UI
      // already has the feedback on screen.
      progressRef.current = await recordAnalysis(result.value);
    });
  }, []);

  const commitUserTurn = useCallback(
    (input: UserTurnInput) => {
      const text = input.text.trim();
      if (!text) return;

      const userMessage = buildUserMessage({ ...input, text });
      // The AI turn immediately before this one, used as analysis context.
      const previousAssistant = [...stateRef.current.conversation.messages]
        .reverse()
        .find((message) => message.role === 'assistant');

      dispatch({ type: 'user_turn_committed', message: userMessage });

      const elapsedMinutes = stateRef.current.elapsedMs / 60_000;
      const decision = shouldIntroduceNewTopic(
        elapsedMinutes,
        settingsRef.current.topicRotationMinutes,
        stateRef.current.transition,
        stateRef.current.conversation.messages,
      );

      void requestReply({
        conversation: stateRef.current.conversation,
        settings: settingsRef.current,
        progress: progressRef.current,
        userText: text,
        elapsedMinutes,
        shouldTransitionTopic: decision.shouldTransition,
        signal: abortRef.current.signal,
      }).then((result) => {
        if (!isMounted.current) return;

        if (!result.ok) {
          if (result.error.code === 'cancelled') return;
          dispatch({ type: 'failed', failure: result.error });
          return;
        }

        const assistantMessage = buildAssistantMessage(result.value);
        dispatch({
          type: 'assistant_replied',
          message: assistantMessage,
          elapsedMinutes,
          transitioned: decision.shouldTransition,
        });

        void persistDraft(stateRef.current.conversation);
        runAnalysis(userMessage, previousAssistant?.text ?? '');

        speak(result.value, assistantMessage.id, () => {
          // Hands-free: reopen the mic once the AI has finished its turn.
          if (shouldAutoListen()) {
            startListeningRef.current();
          }
        });
      });
    },
    [runAnalysis, shouldAutoListen, speak],
  );

  useEffect(() => {
    commitUserTurnRef.current = commitUserTurn;
  }, [commitUserTurn]);

  // The opening line is seeded straight into the initial state by
  // `createConversation`, so it never passes through the reply flow that speaks
  // every other assistant turn - it would sit there silently while the partner
  // waits to be spoken to. Speak it once, on the same terms as any other reply:
  // only when `autoSpeak` is on, and handing off to the mic when hands-free is.
  const openingSpoken = useRef(false);
  useEffect(() => {
    if (openingSpoken.current || isResumed) return;
    openingSpoken.current = true;

    const opening = stateRef.current.conversation.messages[0];
    if (!opening || opening.role !== 'assistant') return;

    // Chained off the audio session rather than fired alongside it: starting
    // TTS before the session is configured loses the first syllable, or the
    // whole utterance, depending on the platform.
    void beginConversationAudio().then(() => {
      if (!isMounted.current) return;
      speak(opening.text, opening.id, () => {
        if (shouldAutoListen()) {
          startListeningRef.current();
        }
      });
    });
  }, [isResumed, shouldAutoListen, speak]);

  // --- public API ----------------------------------------------------------

  const toggleListening = useCallback(() => {
    if (SpeechRecognition.isListening()) {
      void SpeechRecognition.stop();
      return;
    }
    startListening();
  }, [startListening]);

  const sendText = useCallback(
    (text: string) => {
      void TextToSpeech.stop();
      commitUserTurn({ text, inputMode: 'text' });
    },
    [commitUserTurn],
  );

  const interrupt = useCallback(() => {
    voiceEpoch.current += 1;
    void TextToSpeech.stop();
    dispatch({ type: 'speaking_finished' });
  }, []);

  const releaseVoice = useCallback(() => {
    // Ahead of the stop, so the cancelled utterance's completion callback -
    // which is where hands-free reopens the mic - is ignored when it lands.
    voiceEpoch.current += 1;
    // `abort`, not `stop`: stopping finalises the recogniser and commits a turn
    // the learner was in the middle of saying to a screen they have just left.
    if (SpeechRecognition.isListening()) void SpeechRecognition.abort();
    void TextToSpeech.stop();
    // Dispatched rather than left to the recogniser's own callbacks, which are
    // not guaranteed to fire on an abort on every platform.
    dispatch({ type: 'listening_ended' });
    dispatch({ type: 'speaking_finished' });
  }, []);

  const pause = useCallback(() => {
    void SpeechRecognition.abort();
    void TextToSpeech.stop();
    dispatch({ type: 'paused' });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: 'resumed' });
  }, []);

  const setCallMode = useCallback((active: boolean) => {
    isCallMode.current = active;
  }, []);

  const end = useCallback(async (): Promise<Conversation> => {
    dispatch({ type: 'finishing' });
    void SpeechRecognition.abort();
    void TextToSpeech.stop();

    // A fresh controller: the assessment request must survive the aborts above.
    abortRef.current.abort();
    abortRef.current = new AbortController();

    const result = await finalizeConversation({
      conversation: { ...stateRef.current.conversation, durationMs: stateRef.current.elapsedMs },
    });

    if (isMounted.current) {
      dispatch({ type: 'finished', conversation: result.conversation });
    }
    progressRef.current = result.progress;

    if (result.assessmentError && result.assessmentError.code !== 'cancelled') {
      log.info('Conversation saved without assessment', { code: result.assessmentError.code });
    }
    return result.conversation;
  }, []);

  const openFeedback = useCallback((messageId: string | undefined) => {
    dispatch({ type: 'open_feedback', messageId });
  }, []);

  const dismissError = useCallback(() => {
    dispatch({ type: 'dismiss_error' });
  }, []);

  /**
   * Prompts the partner with something the learner did not actually compose.
   *
   * Nothing is appended to the transcript on the learner's side and nothing is
   * analysed: they wrote no English here, so counting it as a turn or grading
   * it would be a lie. The partner's answer is a real thing they said, and is
   * kept like any other.
   */
  const promptPartner = useCallback(
    (text: string) => {
      const current = stateRef.current;
      if (current.phase === 'ended') return;

      // Busy or on hold is a "not yet", not a "no". Dropping it here is what
      // made a call connect to silence when the chat happened to have a reply
      // in flight: the greeting vanished and nothing said so.
      if (isBusy(current) || current.isPaused) {
        log.info('Partner prompt held until the engine is free', { phase: current.phase });
        pendingPrompt.current = text;
        return;
      }
      pendingPrompt.current = undefined;
      log.info('Prompting the partner', { words: countWords(text) });

      if (SpeechRecognition.isListening()) void SpeechRecognition.abort();
      void TextToSpeech.stop();
      dispatch({ type: 'question_skipped' });

      const elapsedMinutes = current.elapsedMs / 60_000;

      void requestReply({
        conversation: current.conversation,
        settings: settingsRef.current,
        progress: progressRef.current,
        userText: text,
        elapsedMinutes,
        shouldTransitionTopic: false,
        signal: abortRef.current.signal,
      }).then((result) => {
        if (!isMounted.current) return;

        if (!result.ok) {
          if (result.error.code === 'cancelled') return;
          log.warn('Partner prompt failed', { code: result.error.code });
          dispatch({ type: 'failed', failure: result.error });
          return;
        }

        const assistantMessage = buildAssistantMessage(result.value);
        dispatch({
          type: 'assistant_replied',
          message: assistantMessage,
          elapsedMinutes,
          transitioned: false,
        });

        void persistDraft(stateRef.current.conversation);

        speak(result.value, assistantMessage.id, () => {
          if (shouldAutoListen()) {
            startListeningRef.current();
          }
        });
      });
    },
    [shouldAutoListen, speak],
  );

  // Flushes a prompt that had to wait. Runs on every commit rather than on a
  // timer, so it goes the instant the engine frees up.
  useEffect(() => {
    const text = pendingPrompt.current;
    if (text === undefined) return;
    if (isBusy(state) || state.isPaused || state.phase === 'ended') return;
    promptPartner(text);
  }, [promptPartner, state]);

  const skipQuestion = useCallback(() => promptPartner(SKIP_REQUEST), [promptPartner]);

  const openCall = useCallback(() => promptPartner(CALL_GREETING), [promptPartner]);

  /**
   * Clears the transcript and begins the topic again.
   *
   * The old record is deleted rather than left behind: the learner asked for
   * these messages to be gone, and a stray abandoned copy turning up in History
   * afterwards would be the opposite of that. Destructive, so the caller is
   * expected to have confirmed first.
   */
  const restart = useCallback(() => {
    const previousId = stateRef.current.conversation.id;
    const topic = stateRef.current.conversation.topicSnapshot;

    if (SpeechRecognition.isListening()) void SpeechRecognition.abort();
    void TextToSpeech.stop();
    abortRef.current.abort();
    abortRef.current = new AbortController();

    void conversationRepository.remove(previousId);

    const fresh = createConversation(topic, settingsRef.current);
    dispatch({ type: 'restarted', conversation: fresh });

    const opening = fresh.messages[0];
    if (!opening) return;
    speak(opening.text, opening.id, () => {
      if (shouldAutoListen()) {
        startListeningRef.current();
      }
    });
  }, [shouldAutoListen, speak]);

  const replay = useCallback(
    (message: ConversationMessage) => {
      if (message.role !== 'assistant') return;
      // Deliberately `speakNow`: this is an explicit request, so it plays even
      // with "read replies out loud" switched off.
      speakNow(message.text, message.id);
    },
    [speakNow],
  );

  return useMemo(
    () => ({
      state,
      canListen: canStartListening(state),
      toggleListening,
      sendText,
      interrupt,
      releaseVoice,
      skipQuestion,
      openCall,
      restart,
      pause,
      resume,
      setCallMode,
      end,
      openFeedback,
      dismissError,
      replay,
    }),
    [
      state,
      toggleListening,
      sendText,
      interrupt,
      releaseVoice,
      skipQuestion,
      openCall,
      restart,
      pause,
      resume,
      setCallMode,
      end,
      openFeedback,
      dismissError,
      replay,
    ],
  );
}
