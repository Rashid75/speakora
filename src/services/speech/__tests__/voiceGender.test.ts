import { adjustPitch } from '../TextToSpeechService';
import { voiceGender } from '../voiceGender';
import type { DeviceVoice } from '@/types';

const voice = (identifier: string, name = ''): DeviceVoice => ({
  identifier,
  name,
  language: 'en-US',
  quality: 'default',
});

describe('voiceGender', () => {
  it('reads the label Android engines put in the identifier', () => {
    expect(voiceGender(voice('en-us-x-sfg#male_1-local'))).toBe('male');
    expect(voiceGender(voice('en-gb-x-gba#female_2-local'))).toBe('female');
  });

  it('does not read "female" as "male"', () => {
    // The bug this whole matcher exists to avoid: "female" contains "male".
    expect(voiceGender(voice('en-us-x-tpf#female_1-local'))).toBe('female');
  });

  it('recognises the English voices Apple ships, by name', () => {
    expect(voiceGender(voice('com.apple.voice.compact.en-GB.Daniel', 'Daniel'))).toBe('male');
    expect(voiceGender(voice('com.apple.ttsbundle.Samantha-compact', 'Samantha'))).toBe('female');
    expect(voiceGender(voice('com.apple.speech.synthesis.voice.Alex', 'Alex'))).toBe('male');
  });

  it('matches a name as a whole word, never as a fragment of a longer one', () => {
    expect(voiceGender(voice('com.example.voice.Alexandra', 'Alexandra'))).toBeUndefined();
  });

  it('admits when it has no idea rather than guessing', () => {
    expect(voiceGender(voice('en-US-language'))).toBeUndefined();
    expect(voiceGender(voice('com.example.voice.Zephyr', 'Zephyr'))).toBeUndefined();
  });
});

describe('adjustPitch', () => {
  it('leaves the partner’s own pitch alone when the voice already matches', () => {
    expect(adjustPitch(0.94, 'male', 'male')).toBe(0.94);
    expect(adjustPitch(1.05, 'female', 'female')).toBe(1.05);
  });

  it('drops the pitch when a male partner lands on a female voice', () => {
    expect(adjustPitch(0.94, 'male', 'female')).toBeLessThan(0.94);
  });

  it('treats an undeclared voice as a mismatch rather than a match', () => {
    // Most handsets ship a female English voice and say nothing about it.
    // Assuming it matches is how the male partner ends up sounding female.
    expect(adjustPitch(0.94, 'male', undefined)).toBeLessThan(0.94);
  });

  it('raises it the other way for a female partner on a male voice', () => {
    expect(adjustPitch(1.05, 'female', 'male')).toBeGreaterThan(1.05);
  });

  it('stays inside a band where the voice still sounds like a person', () => {
    expect(adjustPitch(0.5, 'male', 'female')).toBeGreaterThanOrEqual(0.55);
    expect(adjustPitch(2, 'female', 'male')).toBeLessThanOrEqual(1.8);
  });
});
