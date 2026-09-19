import { darken, fadeOut, withAlpha } from '@/utils/color';

describe('withAlpha', () => {
  it('rewrites a hex colour as rgba at the requested opacity', () => {
    expect(withAlpha('#DCF0F2', 0.5)).toBe('rgba(220, 240, 242, 0.5)');
  });

  it('is case-insensitive about the hex digits', () => {
    expect(withAlpha('#dcf0f2', 1)).toBe('rgba(220, 240, 242, 1)');
  });

  it('clamps opacity into range rather than emitting an invalid colour', () => {
    expect(withAlpha('#000000', 4)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('#000000', -1)).toBe('rgba(0, 0, 0, 0)');
  });

  it('leaves a colour it cannot take apart alone', () => {
    expect(withAlpha('rgba(255,255,255,0.4)', 0.2)).toBe('rgba(255,255,255,0.4)');
    expect(withAlpha('papayawhip', 0.2)).toBe('papayawhip');
  });

  it('falls back to transparent when an unparseable colour has to vanish', () => {
    expect(withAlpha('rgba(255,255,255,0.4)', 0)).toBe('transparent');
  });
});

describe('fadeOut', () => {
  it('keeps the hue so a gradient does not interpolate through black', () => {
    expect(fadeOut('#FFFFFF')).toBe('rgba(255, 255, 255, 0)');
  });

  it('gives up honestly on a colour it cannot parse', () => {
    expect(fadeOut('transparent')).toBe('transparent');
  });
});

describe('darken', () => {
  it('mixes towards black by the given amount', () => {
    expect(darken('#FFFFFF', 0.5)).toBe('#808080');
    expect(darken('#DCF0F2', 0)).toBe('#dcf0f2');
  });

  it('reaches black at full strength and pads single-digit channels', () => {
    expect(darken('#FFFFFF', 1)).toBe('#000000');
    expect(darken('#1E2814', 0.5)).toBe('#0f140a');
  });

  it('returns anything it cannot parse untouched', () => {
    expect(darken('rgba(0,0,0,0.5)', 0.5)).toBe('rgba(0,0,0,0.5)');
  });
});
