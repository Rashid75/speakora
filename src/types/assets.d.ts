/**
 * Bundled media.
 *
 * Metro turns an asset import into an opaque module id that `require`-style
 * APIs (`useAudioPlayer`, `<Image source>`) understand. TypeScript has no idea
 * that happens, so it is declared once here rather than with a cast at every
 * call site.
 */
declare module '*.wav' {
  const source: number;
  export default source;
}
