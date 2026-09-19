import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { useSlowResponse } from '../useSlowResponse';

const THRESHOLD = 6000;

/**
 * Driven through `react-test-renderer` rather than `@testing-library/react-native`:
 * RTL 14.0.1 does not work under React 19 here - `renderHook` returns an empty
 * object - and swapping the test stack out is a bigger change than this hook
 * warrants.
 */
function Probe({
  active,
  onValue,
}: {
  readonly active: boolean;
  readonly onValue: (value: boolean) => void;
}): null {
  onValue(useSlowResponse(active, THRESHOLD));
  return null;
}

const mount = (active: boolean) => {
  let latest = false;
  let tree: TestRenderer.ReactTestRenderer | undefined;
  const capture = (value: boolean): void => {
    latest = value;
  };
  act(() => {
    tree = TestRenderer.create(<Probe active={active} onValue={capture} />);
  });
  return {
    get value(): boolean {
      return latest;
    },
    setActive(next: boolean): void {
      act(() => {
        tree?.update(<Probe active={next} onValue={capture} />);
      });
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

describe('useSlowResponse', () => {
  it('stays quiet while the wait is still normal', () => {
    const probe = mount(true);
    probe.advance(THRESHOLD - 1);
    expect(probe.value).toBe(false);
  });

  it('speaks up once the wait passes the threshold', () => {
    const probe = mount(true);
    probe.advance(THRESHOLD);
    expect(probe.value).toBe(true);
  });

  it('never fires when nothing is pending', () => {
    const probe = mount(false);
    probe.advance(THRESHOLD * 3);
    expect(probe.value).toBe(false);
  });

  it('clears the moment the reply lands', () => {
    const probe = mount(true);
    probe.advance(THRESHOLD);
    expect(probe.value).toBe(true);

    probe.setActive(false);
    expect(probe.value).toBe(false);
  });

  it('does not carry a previous warning into the next turn', () => {
    const probe = mount(true);
    probe.advance(THRESHOLD);
    probe.setActive(false);

    // A new request gets the full threshold again, not the last turn's verdict.
    probe.setActive(true);
    expect(probe.value).toBe(false);
    probe.advance(THRESHOLD - 1);
    expect(probe.value).toBe(false);
    probe.advance(1);
    expect(probe.value).toBe(true);
  });
});
