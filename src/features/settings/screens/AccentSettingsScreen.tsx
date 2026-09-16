import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { OptionRow } from '@/components/ui/OptionRow';
import { Screen } from '@/components/ui/Screen';
import { Section } from '@/components/ui/Section';
import { ACCENT_LIST } from '@/data/accents';
import { TextToSpeech } from '@/services/speech';
import { useSettings } from '@/state/SettingsContext';
import type { AccentId } from '@/types';

const PREVIEW_SENTENCE =
  'This is what I sound like. Pick whichever accent you most want to get used to hearing.';

/**
 * Accent picker.
 *
 * Probes the device voice catalogue on mount and marks any accent the installed
 * TTS engine cannot actually produce. The spec is explicit that we must not
 * advertise an accent the provider does not support - so an unavailable option
 * stays selectable (the *prompt* still adapts vocabulary and idiom) but says
 * plainly that the voice will fall back.
 */
export function AccentSettingsScreen(): React.JSX.Element {
  const { settings, update } = useSettings();
  const [availability, setAvailability] = useState<Partial<Record<AccentId, boolean>>>({});
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const entries = await Promise.all(
        ACCENT_LIST.map(async (accent) => {
          const resolved = await TextToSpeech.resolveVoice(accent.id);
          return [accent.id, resolved.exact] as const;
        }),
      );
      if (!active) return;
      setAvailability(Object.fromEntries(entries) as Partial<Record<AccentId, boolean>>);
      setProbed(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const select = (accentId: AccentId): void => {
    update({ accent: accentId });
    void TextToSpeech.speak({
      text: PREVIEW_SENTENCE,
      accent: accentId,
      personalityId: settings.personalityId,
      speed: settings.speakingSpeed,
    });
  };

  return (
    <Screen scroll topInset={false}>
      <Section
        title="English accent"
        subtitle="Changes both how your partner sounds and the words they choose"
      >
        <View style={styles.list}>
          {ACCENT_LIST.map((accent) => {
            const available = availability[accent.id];
            const unavailable = probed && available === false;
            return (
              <OptionRow
                key={accent.id}
                leading={<AppText variant="title3">{accent.flag}</AppText>}
                title={accent.label}
                description={accent.description}
                unavailableNote={
                  unavailable
                    ? 'Your device has no voice for this accent — vocabulary will still adapt, but it will be spoken in the closest available voice.'
                    : undefined
                }
                selected={settings.accent === accent.id}
                onPress={() => select(accent.id)}
                testID={`accent-${accent.id}`}
              />
            );
          })}
        </View>
      </Section>

      <Card>
        <AppText variant="subhead">Tap an accent to hear it</AppText>
        <AppText variant="footnote" color="textSecondary" style={styles.note}>
          Available voices come from your device, not from this app. On Android you can install more
          under Settings → System → Languages → Text-to-speech output. On iOS they download under
          Accessibility → Spoken Content → Voices.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  note: { marginTop: 6 },
});
