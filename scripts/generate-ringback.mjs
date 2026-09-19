/**
 * Generates `assets/audio/ringback.wav` - the tone the video-call screen plays
 * while it is "ringing".
 *
 * Synthesised rather than downloaded: a ringback tone is a pair of sine waves
 * on a fixed cadence, so there is nothing to license, nothing to attribute and
 * nothing that can turn out to have been someone's copyrighted recording. The
 * file is committed so a normal `npm install` does not need this script; run it
 * only when the cadence or the tone itself has to change.
 *
 *   node scripts/generate-ringback.mjs
 *
 * UK cadence (double burst, then a long gap) rather than the US single 2s
 * burst: the call connects after two seconds, and the double burst is
 * unmistakably "ringing" inside that window where a single long tone is not.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 16_000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

/** UK ringing tone: 400 Hz + 450 Hz. */
const TONES = [400, 450];
/** Peak amplitude, well under full scale so the summed pair cannot clip. */
const AMPLITUDE = 0.42;
/** Raised-cosine edge, long enough to kill the click, short enough to not hear. */
const RAMP_SECONDS = 0.008;

/** One loop: burst, short gap, burst, long gap. */
const PERIOD_SECONDS = 3.0;
const BURSTS = [
  { start: 0.0, end: 0.4 },
  { start: 0.6, end: 1.0 },
];

const envelopeAt = (time) => {
  for (const burst of BURSTS) {
    if (time < burst.start || time >= burst.end) continue;
    const intoBurst = time - burst.start;
    const untilEnd = burst.end - time;
    const edge = Math.min(intoBurst, untilEnd);
    if (edge >= RAMP_SECONDS) return 1;
    // Raised cosine: 0 at the very edge, 1 once the ramp is complete.
    return 0.5 - 0.5 * Math.cos((Math.PI * edge) / RAMP_SECONDS);
  }
  return 0;
};

const frameCount = Math.round(PERIOD_SECONDS * SAMPLE_RATE);
const bytesPerFrame = CHANNELS * (BITS_PER_SAMPLE / 8);
const dataBytes = frameCount * bytesPerFrame;

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataBytes, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // PCM chunk size
header.writeUInt16LE(1, 20); // format: PCM
header.writeUInt16LE(CHANNELS, 22);
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * bytesPerFrame, 28);
header.writeUInt16LE(bytesPerFrame, 32);
header.writeUInt16LE(BITS_PER_SAMPLE, 34);
header.write('data', 36);
header.writeUInt32LE(dataBytes, 40);

const data = Buffer.alloc(dataBytes);
for (let frame = 0; frame < frameCount; frame += 1) {
  const time = frame / SAMPLE_RATE;
  const envelope = envelopeAt(time);
  let sample = 0;
  if (envelope > 0) {
    for (const frequency of TONES) {
      sample += Math.sin(2 * Math.PI * frequency * time);
    }
    sample = (sample / TONES.length) * AMPLITUDE * envelope;
  }
  data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), frame * 2);
}

const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio', 'ringback.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, data]));
process.stdout.write(`Wrote ${out} (${(header.length + data.length) / 1024} KiB)\n`);
