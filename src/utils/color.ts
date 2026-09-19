/**
 * Runtime colour maths.
 *
 * Almost every colour in the app comes straight out of the palette, but a few
 * surfaces are painted from a colour the palette does not own - a partner's
 * portrait background, for instance, which identifies a person rather than a
 * theme. Those need a transparent edge for a gradient and a darker step for a
 * scrim, and computing them beats adding a second hard-coded hex that has to be
 * kept in sync by hand.
 */

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

const channels = (color: string): readonly [number, number, number] | undefined => {
  const match = HEX.exec(color);
  if (!match) return undefined;
  const [, r, g, b] = match;
  return [parseInt(r as string, 16), parseInt(g as string, 16), parseInt(b as string, 16)];
};

/**
 * The same colour at a given opacity.
 *
 * Only `#RRGGBB` can be converted. Anything else (a token that is already
 * `rgba(...)`, or `transparent`) is returned untouched at full opacity and as
 * `'transparent'` at zero - which is the honest answer for a colour we cannot
 * take apart, and keeps gradients from silently rendering the wrong thing.
 */
export const withAlpha = (color: string, alpha: number): string => {
  const rgb = channels(color);
  if (!rgb) return alpha <= 0 ? 'transparent' : color;
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamped})`;
};

/**
 * A fully transparent version of a colour, for the far end of a gradient.
 *
 * Fading to plain `transparent` interpolates through black on iOS, which shows
 * up as a grey smear over a light background; fading to the same colour at zero
 * opacity does not.
 */
export const fadeOut = (color: string): string => withAlpha(color, 0);

/**
 * Mixes a colour towards black. `amount` is how much black to add, 0-1.
 *
 * Used for the bottom of the call screen, where white controls have to stay
 * legible over whatever pastel the partner's portrait is painted on.
 */
export const darken = (color: string, amount: number): string => {
  const rgb = channels(color);
  if (!rgb) return color;
  const keep = 1 - Math.max(0, Math.min(1, amount));
  const scale = (value: number): number => Math.round(value * keep);
  return `#${[scale(rgb[0]), scale(rgb[1]), scale(rgb[2])]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
};
