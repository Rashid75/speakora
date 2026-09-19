import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/**
 * The icon set from the design handoff, transcribed path-for-path.
 *
 * Inline SVG rather than an icon font: it is a dozen glyphs, they are already
 * specified exactly in the design source, and a font would mean shipping an
 * asset and losing per-icon stroke control.
 *
 * Every icon is drawn on a 24x24 grid with a 2px stroke unless noted.
 */
export type IconName =
  | 'mic'
  | 'micOff'
  | 'arrowLeft'
  | 'chevronRight'
  | 'home'
  | 'clock'
  | 'bars'
  | 'sliders'
  | 'plus'
  | 'keyboard'
  | 'stop'
  | 'close'
  | 'sparkle'
  | 'chat'
  | 'code'
  | 'user'
  | 'woman'
  | 'man'
  | 'info'
  | 'trash'
  | 'skip'
  | 'speaker'
  | 'play'
  | 'phone'
  | 'phoneDown'
  | 'headset'
  | 'captions'
  | 'captionsOff'
  | 'logo';

export interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly color: string;
  readonly strokeWidth?: number;
}

export function Icon({ name, size = 24, color, strokeWidth = 2 }: IconProps): React.JSX.Element {
  // The chevron is authored on an 8x14 grid in the design; everything else 24x24.
  const viewBox = name === 'chevronRight' ? '0 0 8 14' : '0 0 24 24';
  const common: CommonProps = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox={viewBox} accessibilityElementsHidden>
      {renderPaths(name, color, common)}
    </Svg>
  );
}

type CommonProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};

/** Drawn once and used twice: upright for `phone`, turned over for `phoneDown`. */
const HANDSET =
  'M7.2 3.4a1.8 1.8 0 011.7 1.1l1 2.4a1.8 1.8 0 01-.5 2.1l-1.1.9a12 12 0 005.8 5.8l.9-1.1a1.8 1.8 0 012.1-.5l2.4 1a1.8 1.8 0 011.1 1.7v2.3a2 2 0 01-2.2 2A17 17 0 013.1 5.6a2 2 0 012-2.2z';

const renderPaths = (name: IconName, color: string, p: CommonProps): React.JSX.Element => {
  switch (name) {
    case 'mic':
      return (
        <Path
          d="M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3zM5 11a7 7 0 0014 0M12 18v3"
          {...p}
        />
      );
    case 'micOff':
      // The same mic, struck through. The capsule is split around the slash so
      // the stroke reads as cutting the mic rather than sitting on top of it.
      return (
        <>
          <Path d="M15 6a3 3 0 00-5.2-2.1M9 9.4V11a3 3 0 004.7 2.5" {...p} />
          <Path d="M15 9v2" {...p} />
          <Path d="M5 11a7 7 0 0010.3 6.2M19 11a6.9 6.9 0 01-.9 3.4" {...p} />
          <Path d="M12 18v3" {...p} />
          <Path d="M4 3l16 18" {...p} />
        </>
      );
    case 'arrowLeft':
      return <Path d="M19 12H5M11 6l-6 6 6 6" {...p} />;
    case 'chevronRight':
      return <Path d="M1 1l6 6-6 6" {...p} />;
    case 'home':
      return <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" {...p} />;
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 7.5V12l3.5 2" {...p} />
        </>
      );
    case 'bars':
      return <Path d="M5 20v-8M12 20V5M19 20v-6" {...p} />;
    case 'sliders':
      return (
        <>
          <Path d="M4 8h8M17 8h3M4 16h3M12 16h8" {...p} />
          <Circle cx={14.5} cy={8} r={2.5} {...p} />
          <Circle cx={9.5} cy={16} r={2.5} {...p} />
        </>
      );
    case 'plus':
      return <Path d="M12 5v14M5 12h14" {...p} />;
    case 'keyboard':
      return (
        <>
          <Rect x={3} y={7} width={18} height={10} rx={2} {...p} />
          <Path d="M8 14h8" {...p} />
        </>
      );
    case 'stop':
      return <Rect x={6} y={6} width={12} height={12} rx={2} {...p} />;
    case 'close':
      return <Path d="M6 6l12 12M18 6L6 18" {...p} />;
    case 'sparkle':
      return <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" {...p} />;
    case 'chat':
      return <Path d="M21 12a8 8 0 01-11.3 7.3L4 21l1.7-5.7A8 8 0 1121 12z" {...p} />;
    case 'code':
      return <Path d="M9 18l-6-6 6-6M15 6l6 6-6 6" {...p} />;
    case 'user':
      return <Path d="M17 20a5 5 0 00-10 0M12 12a4 4 0 100-8 4 4 0 000 8z" {...p} />;
    // Filled busts rather than stroked outlines: these render at 22px inside an
    // avatar disc, where a 2px outline turns to mush.
    case 'woman':
      return (
        <>
          {/* Hair first; the face sits on top of it. Same colour throughout, so
              the two shapes read as one silhouette with hair past the jaw. */}
          <Path
            d="M6.2 13.6V8.6a5.8 5.8 0 0111.6 0v5l-1.9-1.3V8.8a3.9 3.9 0 00-7.8 0v3.5z"
            fill={color}
          />
          <Circle cx={12} cy={8.4} r={3.9} fill={color} />
          <Path d="M4.6 20.6a7.4 7.4 0 0114.8 0z" fill={color} />
        </>
      );
    case 'man':
      return (
        <>
          <Circle cx={12} cy={8} r={3.9} fill={color} />
          <Path d="M4.6 20.6a7.4 7.4 0 0114.8 0z" fill={color} />
        </>
      );
    case 'info':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 11v5M12 8h.01" {...p} />
        </>
      );
    case 'play':
      // Filled, unlike the rest of the set: at mic size a stroked triangle
      // reads as an outline of a shape rather than as "play".
      return <Path d="M8 5.2L18.6 12 8 18.8z" {...p} fill={color} />;
    case 'speaker':
      return (
        <>
          <Path d="M11 5L6.5 9H3v6h3.5L11 19z" {...p} />
          <Path d="M15.5 9.5a3.5 3.5 0 010 5M18.5 7a7 7 0 010 10" {...p} />
        </>
      );
    case 'skip':
      // Skip-forward: a chevron pair running into a stop bar.
      return (
        <>
          <Path d="M5 6l6 6-6 6M12 6l6 6-6 6" {...p} />
          <Path d="M20 5v14" {...p} />
        </>
      );
    case 'phone':
      // The handset, upright. `phoneDown` is this exact shape turned over, so
      // placing a call and ending one read as the same object either way up.
      return <Path d={HANDSET} fill={color} />;
    case 'phoneDown':
      // The handset glyph, turned over. Hanging up is universally "the phone,
      // upside down" - drawing a second, different handset would only invite
      // the two to drift apart.
      return (
        <G transform="rotate(135 12 12)">
          <Path d={HANDSET} fill={color} />
        </G>
      );
    case 'headset':
      // Headphones with a level trace between the cups: "we are listening",
      // not "audio is playing".
      return (
        <>
          <Path d="M4 14v-2a8 8 0 0116 0v2" {...p} />
          <Rect x={2} y={13.5} width={4.4} height={6.5} rx={2.2} {...p} />
          <Rect x={17.6} y={13.5} width={4.4} height={6.5} rx={2.2} {...p} />
          <Path d="M9.4 15v3.5M12 12.8v8M14.6 15v3.5" {...p} />
        </>
      );
    case 'captions':
      return (
        <>
          <Rect x={2.5} y={5} width={19} height={14} rx={3.5} {...p} />
          <Path d="M10.2 10.4a2.7 2.7 0 100 3.2M17 10.4a2.7 2.7 0 100 3.2" {...p} />
        </>
      );
    case 'captionsOff':
      return (
        <>
          <Rect x={2.5} y={5} width={19} height={14} rx={3.5} {...p} />
          <Path d="M10.2 10.4a2.7 2.7 0 100 3.2M17 10.4a2.7 2.7 0 100 3.2" {...p} />
          <Path d="M4 3l16 18" {...p} />
        </>
      );
    case 'trash':
      return (
        <>
          <Path d="M4 7h16" {...p} />
          <Path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" {...p} />
          <Path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" {...p} />
          <Path d="M10 11v6M14 11v6" {...p} />
        </>
      );
    case 'logo':
    default:
      // The app icon's microphone, not a separate mark: the thing on the
      // launcher and the thing inside the app should be the same object.
      return (
        <Path
          d="M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3zM5 11a7 7 0 0014 0M12 18v3M8 21h8"
          {...p}
        />
      );
  }
};
