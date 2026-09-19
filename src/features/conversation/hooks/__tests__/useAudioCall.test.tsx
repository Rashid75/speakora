import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { micGlyph, micHint, micLabel } from '../../components/MicControls';
import { micCaption } from '../../components/AudioCallOverlay';
import { CALL_CONNECT_MS, useAudioCall, type AudioCallSession } from '../useAudioCall';

/**
 * Driven through `react-test-renderer` for the same reason as
 * `useSlowResponse`: RTL 14.0.1's `renderHook` returns an empty object under
 * React 19 here.
 */
function Probe({ onRender }: { readonly onRender: (session: AudioCallSession) => void }): null {
  onRender(useAudioCall());
  return null;
}

const mount = () => {
  let latest: AudioCallSession | undefined;
  act(() => {
    TestRenderer.create(
      <Probe
        onRender={(session) => {
          latest = session;
        }}
      />,
    );
  });

  const session = (): AudioCallSession => {
    if (!latest) throw new Error('Probe never rendered');
    return latest;
  };

  return {
    session,
    run(action: (session: AudioCallSession) => void): void {
      act(() => action(session()));
    },
    advance(ms: number): void {
      act(() => {
        jest.advanceTimersByTime(ms);
      });
    },
  };
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useAudioCall', () => {
  it('starts with no call up', () => {
    const probe = mount();
    expect(probe.session().phase).toBe('off');
    expect(probe.session().isConnected).toBe(false);
  });

  it('rings before it connects', () => {
    const probe = mount();
    probe.run((session) => session.start(0));

    expect(probe.session().phase).toBe('ringing');
    probe.advance(CALL_CONNECT_MS - 1);
    expect(probe.session().phase).toBe('ringing');
  });

  it('connects once the ring has run its course', () => {
    const probe = mount();
    probe.run((session) => session.start(0));
    probe.advance(CALL_CONNECT_MS);

    expect(probe.session().phase).toBe('connected');
    expect(probe.session().isConnected).toBe(true);
  });

  it('does not restart a call that is already up', () => {
    const probe = mount();
    probe.run((session) => session.start(4));
    probe.advance(CALL_CONNECT_MS);

    probe.run((session) => session.start(9));
    expect(probe.session().phase).toBe('connected');
    // The second tap is a no-op, so it must not move the call's starting point
    // either - that would erase what has been said on the call so far.
    expect(probe.session().fromTurn).toBe(4);
  });

  it('opens onto an empty transcript, whatever the chat already holds', () => {
    const probe = mount();
    expect(probe.session().fromTurn).toBe(0);

    probe.run((session) => session.start(12));
    expect(probe.session().fromTurn).toBe(12);
  });

  it('hangs up from ringing without ever connecting', () => {
    const probe = mount();
    probe.run((session) => session.start(0));
    probe.run((session) => session.hangUp());

    expect(probe.session().phase).toBe('off');
    // The pending pickup must not answer a call that was cancelled.
    probe.advance(CALL_CONNECT_MS * 2);
    expect(probe.session().phase).toBe('off');
  });

  it('hangs up from a connected call', () => {
    const probe = mount();
    probe.run((session) => session.start(0));
    probe.advance(CALL_CONNECT_MS);
    probe.run((session) => session.hangUp());

    expect(probe.session().phase).toBe('off');
  });

  it('counts no time while the phone is still ringing', () => {
    const probe = mount();
    probe.run((session) => session.start(0));
    probe.advance(CALL_CONNECT_MS - 1);

    // Ringing is not time spent talking, and counting it would credit the
    // learner with practice they have not done.
    expect(probe.session().elapsedMs).toBe(0);
  });

  it('counts from the moment the partner picks up', () => {
    const probe = mount();
    probe.run((session) => session.start(0));
    probe.advance(CALL_CONNECT_MS);
    expect(probe.session().elapsedMs).toBe(0);

    probe.advance(60_000);
    expect(probe.session().elapsedMs).toBe(60_000);
  });

  it('starts the next call from zero rather than from the last one', () => {
    const probe = mount();
    // Advanced in two steps on purpose: the clock only exists once the pickup
    // has been committed, so rolling past both in one go would be testing the
    // test harness rather than the hook.
    probe.run((session) => session.start(0));
    probe.advance(CALL_CONNECT_MS);
    probe.advance(30_000);
    expect(probe.session().elapsedMs).toBe(30_000);

    probe.run((session) => session.hangUp());
    expect(probe.session().elapsedMs).toBe(0);

    probe.run((session) => session.start(0));
    probe.advance(CALL_CONNECT_MS);
    probe.advance(5_000);
    expect(probe.session().elapsedMs).toBe(5_000);
  });

  it('hides subtitles by default and toggles them', () => {
    const probe = mount();
    expect(probe.session().subtitlesOn).toBe(false);

    probe.run((session) => session.toggleSubtitles());
    expect(probe.session().subtitlesOn).toBe(true);

    probe.run((session) => session.toggleSubtitles());
    expect(probe.session().subtitlesOn).toBe(false);
  });
});

/**
 * The call dock draws the chat's mic button rather than one of its own, so
 * these cover the mapping both docks share.
 */
describe('micGlyph', () => {
  it('shows the mic open only while it actually is', () => {
    expect(micGlyph('listening')).toBe('mic');
  });

  it('becomes a play control while paused', () => {
    expect(micGlyph('paused')).toBe('play');
  });

  it('shows a shut mic for every state where nothing is being recorded', () => {
    for (const phase of [
      'idle',
      'connecting',
      'processing',
      'speaking',
      'error',
      'ended',
    ] as const) {
      expect(micGlyph(phase)).toBe('micOff');
    }
  });
});

describe('micCaption', () => {
  it('names the way out while the call is on hold', () => {
    // "On hold" is said in the status line above the dock; the button is the
    // only thing that gets the learner out of it, so it says so.
    expect(micCaption('paused')).toBe('Resume');
  });

  it('reports the microphone state the rest of the time', () => {
    expect(micCaption('listening')).toBe('Listening…');
    for (const phase of ['idle', 'processing', 'speaking', 'error', 'ended'] as const) {
      expect(micCaption(phase)).toBe('Muted');
    }
  });
});

describe('micLabel', () => {
  it('never claims the microphone is on when it is not', () => {
    expect(micLabel('listening')).toMatch(/^Microphone on/);
    for (const phase of ['idle', 'processing', 'speaking'] as const) {
      expect(micLabel(phase)).toMatch(/^Microphone off/);
    }
  });

  it('says what a tap does in every state', () => {
    for (const phase of ['idle', 'listening', 'speaking', 'paused'] as const) {
      expect(micHint(phase).length).toBeGreaterThan(0);
    }
  });
});
