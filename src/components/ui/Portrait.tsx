import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import type { PortraitSpec } from '@/data/portraits';

export interface PortraitProps {
  readonly spec: PortraitSpec;
  readonly size: number;
}

/**
 * An illustrated face, drawn rather than shipped.
 *
 * Vector, not a photograph: these are invented people, so a stock photo of a
 * real one would be both a licensing problem and a quiet lie about who is on
 * screen. Authored on a 100x100 grid and clipped to a circle by the avatar
 * disc, so one recipe covers the 22px name badge in the transcript and the
 * 84px card in the picker without a second set of artwork.
 *
 * `age` moves proportions only - a younger face is rounder, sits lower, has
 * bigger eyes and narrower shoulders. Colour carries none of it, so a child
 * avatar and an adult one differ in shape as well as palette.
 */
export function Portrait({ spec, size }: PortraitProps): React.JSX.Element {
  const young = spec.age === 'young';
  const longHair = spec.hairStyle === 'long';
  // Medium sits between the two: a little mass behind the head, but a short
  // fringe - which is what makes the neutral face read as neither.
  const mediumHair = spec.hairStyle === 'medium';

  // Younger: bigger head, lower on the canvas, and a shorter neck.
  const faceY = young ? 47 : 45;
  const faceRx = young ? 23 : 21;
  const faceRy = young ? 24 : 24;
  const eyeY = young ? 48.5 : 45.5;
  const eyeR = young ? 3.2 : 2.7;
  const browY = young ? 41 : 38.8;
  const mouthY = young ? 59 : 56.5;
  const shoulders = young
    ? 'M18 100c0-15 14-23 32-23s32 8 32 23z'
    : 'M12 100c0-18 17-27 38-27s38 9 38 27z';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden>
      <Rect width={100} height={100} fill={spec.background} />

      {/* Hair mass behind everything, so long styles fall past the shoulders. */}
      {longHair || mediumHair ? (
        <Ellipse
          cx={50}
          cy={faceY + (longHair ? 9 : 4)}
          rx={faceRx + (longHair ? 10 : 5)}
          ry={faceRy + (longHair ? 13 : 5)}
          fill={spec.hair}
        />
      ) : null}

      <Rect
        x={41}
        y={faceY + 13}
        width={18}
        height={young ? 16 : 20}
        rx={9}
        fill={spec.skinShadow}
      />
      <Path d={shoulders} fill={spec.clothing} />

      <Circle cx={50 - faceRx - 1} cy={faceY + 2} r={4.2} fill={spec.skinShadow} />
      <Circle cx={50 + faceRx + 1} cy={faceY + 2} r={4.2} fill={spec.skinShadow} />
      <Ellipse cx={50} cy={faceY} rx={faceRx} ry={faceRy} fill={spec.skin} />

      {/* Fringe over the face, so the hairline sits where a hairline sits. */}
      {longHair ? (
        <Path
          d={`M50 ${faceY - 28}c-15.5 0-24 10.5-24 23 0-6.5 5.5-10.5 9.5-11.5 6.5 3.2 22.5 3.2 29 0 4 1 9.5 5 9.5 11.5 0-12.5-8.5-23-24-23z`}
          fill={spec.hair}
        />
      ) : (
        <Path
          d={`M50 ${faceY - 27}c-13.5 0-21.5 9.5-21.5 20.5 0-5 4-8.5 7-8.5 5.5 3 24.5 3 30 0 3 0 6.5 3.5 6.5 8.5C72 ${faceY - 17.5} 63.5 ${faceY - 27} 50 ${faceY - 27}z`}
          fill={spec.hair}
        />
      )}

      <Path
        d={`M37.5 ${browY}c2.6-1.8 5.6-1.8 8.2 0M54.3 ${browY}c2.6-1.8 5.6-1.8 8.2 0`}
        stroke={spec.hair}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />

      <Ellipse cx={41.8} cy={eyeY} rx={eyeR * 0.82} ry={eyeR} fill="#2B2B33" />
      <Ellipse cx={58.2} cy={eyeY} rx={eyeR * 0.82} ry={eyeR} fill="#2B2B33" />
      <Circle cx={42.7} cy={eyeY - 1.2} r={0.95} fill="#FFFFFF" />
      <Circle cx={59.1} cy={eyeY - 1.2} r={0.95} fill="#FFFFFF" />

      <Path
        d={`M50 ${eyeY + 3}v4.2`}
        stroke={spec.skinShadow}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />

      <Ellipse
        cx={36.5}
        cy={eyeY + 7}
        rx={4}
        ry={2.4}
        fill={spec.blush}
        opacity={young ? 0.7 : 0.55}
      />
      <Ellipse
        cx={63.5}
        cy={eyeY + 7}
        rx={4}
        ry={2.4}
        fill={spec.blush}
        opacity={young ? 0.7 : 0.55}
      />

      <Path
        d={`M44.8 ${mouthY}c3.2 3.6 7.2 3.6 10.4 0`}
        stroke="#A8545A"
        strokeWidth={2.1}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
