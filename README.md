# Speakora

An AI English speaking coach for iOS and Android. Pick a topic, press the
microphone, and have a real conversation with a partner who has opinions,
disagrees with you, tells you about their weekend and occasionally changes the
subject — then get honest feedback on how you spoke.

Built with React Native, Expo and Gemini. No account, no server, no telemetry.

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Android setup](#android-setup)
- [iOS setup](#ios-setup)
- [Running the app](#running-the-app)
- [Testing & verification](#testing--verification)
- [Production builds](#production-builds)
- [Project structure](#project-structure)
- [Dependencies and why each one is here](#dependencies-and-why-each-one-is-here)
- [Security: the API key](#security-the-api-key)
- [Known limitations](#known-limitations)

---

## What it does

**Talk, don't drill.** The AI is a person, not a teacher. It has a name, a job,
opinions and a life. It disagrees, gets curious, tells short stories, and does
not end every sentence with a question. It never corrects your English mid-
conversation — that would break the thing the app is for.

**Feedback when you want it.** Each turn is analysed in the background. A small
badge appears on your message; tap it to see grammar corrections, vocabulary
suggestions, more natural phrasings and a polished version of what you said with
your meaning intact.

**An honest level.** Your CEFR level (A1–C2) is estimated from accumulated
evidence with a smoothed average, so it does not swing on a single sentence, and
the Statistics screen explains _why_ you are at that level.

**Five sections.** Home (browse topics), Speak (start instantly), History
(transcripts + notes), Progress (charts and metrics), Settings.

**43 built-in topics** across Daily Conversation, Tech Talk, Professional
English, Travel & Real Life, and Exams & Interviews — plus custom topics: write
any scenario in plain English and Gemini turns it into a full role-play.

**Three partners** — Aya (warm, patient), Noor (polished, direct) and Kai
(fast, casual) — six accents, six speeds, six difficulty levels, seven themes
with light and dark variants.

**Built from a design handoff.** The UI implements a Claude Design bundle
(`Speaking Coach.dc.html`, 10 artboards) rather than being invented in code: the
`#675CF5` / `#02081E` palette, the Space Grotesk type scale, the pull-up notes
drawer and the first-run flow all come from that source. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it maps onto the token
system.

---

## Tech stack

| Layer          | Choice                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| Runtime        | React Native 0.86 (New Architecture) via Expo SDK 57                      |
| Language       | TypeScript 6, `strict`, `noUncheckedIndexedAccess`, zero `any`            |
| Navigation     | React Navigation 7 (native stack + bottom tabs)                           |
| LLM            | Gemini via REST, behind an `AIProvider` interface                         |
| Speech → text  | `expo-speech-recognition` (SFSpeechRecognizer / Android SpeechRecognizer) |
| Text → speech  | `expo-speech` (AVSpeechSynthesizer / Android TTS)                         |
| Storage        | AsyncStorage behind a `StorageAdapter` seam                               |
| Icons + charts | Inline SVG via `react-native-svg`, transcribed from the design            |
| Type           | Space Grotesk via `@expo-google-fonts/space-grotesk`                      |
| Testing        | Jest (`jest-expo`) + React Native Testing Library                         |
| Quality        | ESLint 9 flat config + Prettier                                           |

Architecture rationale lives in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Quick start

```bash
git clone <your-repo> speakora && cd speakora
npm install
cp .env.example .env        # then paste your Gemini API key into .env
npx expo prebuild           # generates android/ and ios/
npm run android             # or: npm run ios   (macOS only)
```

> **Expo Go will not work.** Speech recognition is a native module, so the app
> needs a development build. `npm run android` / `npm run ios` produce one.

Get a free Gemini API key at <https://aistudio.google.com/apikey>.

---

## Environment variables

Copy `.env.example` to `.env`. It is git-ignored.

| Variable                | Required | Default            | Purpose                                                                                                 |
| ----------------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`        | yes¹     | —                  | Google AI Studio key                                                                                    |
| `AI_PROVIDER`           | no       | `gemini`           | Which provider implementation to use                                                                    |
| `GEMINI_MODEL`          | no       | `gemini-2.5-flash` | Model for conversation and analysis                                                                     |
| `GEMINI_BASE_URL`       | no       | Google's endpoint  | Override only if proxying                                                                               |
| `AI_GATEWAY_URL`        | no       | empty              | **Recommended for production.** Routes all AI calls through your own backend; no vendor key is embedded |
| `AI_REQUEST_TIMEOUT_MS` | no       | `30000`            | Per-request network timeout                                                                             |
| `LOG_LEVEL`             | no       | `info`             | `debug` \| `info` \| `warn` \| `error` \| `silent`                                                      |

¹ Not required if `AI_GATEWAY_URL` is set.

Values are read in `app.config.ts` at **build time** and reach the app through
`expo-constants`. Only `src/config/env.ts` reads them; nothing else touches
`process.env` or `Constants`.

**After changing `.env`, restart with a cleared cache:**

```bash
npm run start:clear
```

---

## Android setup

**Requirements:** JDK 17, Android SDK 36, an emulator or a device with USB
debugging.

```bash
npx expo prebuild --platform android
npm run android
```

Handled for you by `app.config.ts` and the config plugin:

- `RECORD_AUDIO` and `INTERNET` permissions in the manifest
- `minSdkVersion 24`, `compileSdk`/`targetSdk 36`
- A `<queries>` entry for `com.google.android.googlequicksearchbox`, without
  which `SpeechRecognizer` silently finds no service on Android 11+
- Edge-to-edge display
- Runtime microphone permission is requested on first use, with a clear
  in-app explanation and a deep link to system settings if permanently denied

**If speech recognition does not start on a device:** confirm Google app is
installed and enabled, and that _Settings → System → Languages & input →
On-device recognition_ has an English pack. Emulators need a working host
microphone; voice is best verified on real hardware.

To add more TTS accents: _Settings → System → Languages → Text-to-speech
output → install voice data_.

---

## iOS setup

**Requirements:** macOS, Xcode 16+, CocoaPods.

```bash
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npm run ios
```

Handled for you:

- `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription`
- `UIBackgroundModes: [audio]` so playback is not cut off during a handover
- Deployment target 16.4 (the SDK 57 minimum)
- `playsInSilentMode` on the audio session — without it, an iPhone with the ring
  switch flipped plays nothing and the app looks broken

**Simulator caveat:** the iOS Simulator has no useful microphone input. Test
voice on a physical device.

To add accents: _Settings → Accessibility → Spoken Content → Voices_.

---

## Running the app

```bash
npm run start          # Metro, dev-client mode
npm run start:clear    # Metro with a cleared cache (after .env changes)
npm run android        # build + install + run on Android
npm run ios            # build + install + run on iOS (macOS only)
```

### First-run walkthrough

1. **Settings → Profile** — add your name. The app uses it sparingly.
2. **Settings → Accent** — tap an accent to hear it. Unavailable ones are
   labelled rather than silently substituted.
3. **Home** — pick _Introducing Yourself_.
4. **Before you start** — choose difficulty and partner, then **Start**.
5. Your partner speaks first. Tap the microphone, reply, tap again.
6. A badge appears on your message once analysis completes — tap it.
7. End the conversation to get the full assessment.
8. **Progress** — your level, skills, trend and recurring mistakes.

---

## Testing & verification

```bash
npm run verify          # typecheck + lint + format check + tests with coverage
```

or individually:

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # eslint, zero warnings tolerated
npm run format:check    # prettier
npm test                # jest
npm run test:watch
```

Tests cover CEFR smoothing, AI response parsing and repair, the Gemini provider's
error mapping and retry policy, statistics aggregation, the topic-transition
policy, the conversation state machine, repositories, and text metrics. The
Gemini service is tested against a mocked `fetch` — `jest.setup.ts` makes any
unmocked network call fail, so no test can reach the real API.

---

## Production builds

Local release builds:

```bash
npx expo prebuild --clean
cd android && ./gradlew assembleRelease      # APK
cd android && ./gradlew bundleRelease        # AAB for Play
```

iOS: open `ios/Speakora.xcworkspace` in Xcode, set your team, then
_Product → Archive_.

With EAS (recommended — keeps the key server-side):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas secret:create --scope project --name GEMINI_API_KEY --value "your-key"
eas build --platform android --profile production
eas build --platform ios --profile production
```

**Before submitting to a store, read [Security: the API key](#security-the-api-key).**

---

## Project structure

```
src/
  bootstrap/        App root, provider stack, ErrorBoundary
  components/
    ui/             AppText, Button, Card, Screen, ProgressBar, …
    charts/         TrendChart, ScoreRing (react-native-svg)
  config/           env.ts (the only reader of build config), appConfig.ts
  data/             Topic catalogue, personalities, accents, difficulty
  features/
    home/           Home, Practice, CategoryTopics
    conversation/   The core: screens, components, hooks, state machine
    custom-topics/  AI-optimised scenario builder
    history/        List + conversation detail
    statistics/     Aggregated progress
    settings/       Settings hub and pickers
  hooks/            useAsyncData, useNetworkStatus
  navigation/       RootNavigator, TabNavigator, typed params
  prompts/          Five versioned prompt builders
  repositories/     Conversation, Settings, Topic, Progress, Statistics
    storage/        StorageAdapter — the only AsyncStorage consumer
  services/
    ai/             AIProvider seam, Gemini provider, JSON repair, parsers
    speech/         STT, TTS, audio session
    conversation/   ConversationService, TopicTransitionPolicy
    statistics/     Pure aggregation
    logging/        Levelled logger with secret redaction
    network/        Connectivity
  state/            SettingsContext
  theme/            Tokens, 7 palettes, ThemeProvider
  types/            All domain types
  utils/            cefr, text metrics, time, errors, ids
```

---

## Dependencies and why each one is here

Every runtime dependency earns its place; anything we could write in fifty lines,
we wrote.

| Package                                                  | Why                                                                                                                | Alternative rejected                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `expo` + `expo-dev-client`                               | Managed native builds, config plugins, OTA-capable                                                                 | Bare RN — far more native maintenance                             |
| `expo-speech-recognition`                                | The only maintained Expo-compatible binding to both platforms' native recognisers; free, on-device where supported | Cloud STT (second vendor key, audio leaves device, cost)          |
| `expo-speech`                                            | Native TTS with rate, pitch and voice selection                                                                    | Cloud TTS (cost, latency, offline break)                          |
| `expo-audio`                                             | Audio session config; without it iOS plays nothing on silent mode                                                  | Manual native modules                                             |
| `expo-keep-awake`                                        | A hands-free session must not sleep mid-conversation                                                               | —                                                                 |
| `expo-crypto`                                            | Platform CSPRNG for UUIDs                                                                                          | `uuid` (needs `getRandomValues` polyfill)                         |
| `expo-haptics`                                           | Tactile confirmation for the mic — matters when you are looking away                                               | —                                                                 |
| `expo-splash-screen`                                     | Hold splash until settings hydrate, avoiding a theme flash                                                         | —                                                                 |
| `@react-navigation/*`                                    | The RN navigation standard; native stack uses platform primitives                                                  | Expo Router — file routing adds indirection for a fixed 5-tab app |
| `react-native-screens`, `react-native-safe-area-context` | Required by React Navigation                                                                                       | —                                                                 |
| `react-native-gesture-handler`                           | Required for navigation gestures                                                                                   | —                                                                 |
| `@react-native-async-storage/async-storage`              | Simple KV, fits a read-all/write-all pattern, no extra native setup                                                | MMKV (heavier), SQLite (overkill)                                 |
| `@react-native-community/netinfo`                        | Distinguishes "connected" from "internet reachable" — captive portals                                              | Naive fetch probing                                               |
| `react-native-svg`                                       | Two hand-drawn charts that consume theme tokens                                                                    | A charting library, heavier than our whole UI layer               |

**Deliberately not installed:** Reanimated (the two animations we need run fine
on `Animated` with `useNativeDriver`), Redux/Zustand (Context + `useReducer`
covers it), Zod (five fixed shapes validated by ~120 lines in
`services/ai/validation.ts`), an icon font (emoji render identically on both
platforms with no asset), the Gemini SDK (see ARCHITECTURE §3).

### Install notes

`.npmrc` contains two non-obvious settings, both documented inline:

- `legacy-peer-deps=true` — Expo SDK 57 pins React 19.2.3 while `jest-expo`
  peer-requires `react-server-dom-webpack@~19.2.4`, which peer-requires React
  `^19.2.4`. That contradiction sends npm's peer resolver into an exponential
  backtrack that never terminates.
- Generous `fetch-timeout` / retry values — large RN tarballs on a slow link
  otherwise trip npm's idle timeout and roll the whole install back.

---

## Security: the API key

**Shipping a Gemini API key inside a mobile binary is not secure.** An `.ipa` or
`.apk` is a zip; strings can be extracted in minutes. Obfuscation and pinning
slow an attacker down, they do not stop one. Anyone who extracts the key can
spend your quota.

For a learning build or an internal MVP that is an accepted, informed risk. It
is **not** acceptable for a public store release.

**The mitigation is already wired in.** Set `AI_GATEWAY_URL` and every AI call
goes to your backend instead of Google, with no vendor key in the app:

```
React Native App  →  Your AI Gateway  →  Gemini
                     • holds the key server-side
                     • authenticates the user
                     • rate-limits per account
                     • logs and bills per user
```

`src/services/ai/gemini/geminiClient.ts` already branches on that variable and
posts an identical body, so your gateway can forward it verbatim. No other file
changes.

Other properties today: no account, no server, no analytics; transcripts stay on
device and leave only as prompt content to the configured provider; `.env` is
git-ignored; the logger redacts key-shaped strings; _Settings → Delete all
conversations_ genuinely erases local data.

---

## Known limitations

These are documented rather than hidden, because pretending otherwise would make
the app dishonest about what it measures.

1. **Pronunciation is intelligibility, not phonetics.** Real phonetic scoring
   needs forced alignment against an acoustic model, which neither platform's
   free recogniser exposes. Where the recogniser reports a confidence we use it
   as a weak proxy and label it as such; otherwise the app says **"Not
   measured"** rather than inventing a number.
2. **Accent availability depends on the device.** Neither platform guarantees a
   voice per locale. Settings probes the installed voice list and marks
   unavailable accents explicitly. Vocabulary and idiom still adapt via the
   prompt even when the voice falls back.
3. **Expo Go cannot run this app.** Speech recognition is a native module; use a
   development build.
4. **Speech recognition usually needs a connection** unless an on-device
   language pack is installed.
5. **Backgrounding pauses the conversation and releases the microphone**, by
   design.
6. **Topic rotation is time- and stall-based**, not semantic — the app does not
   model whether a subject is genuinely exhausted.
7. **Voice cannot be meaningfully tested on a simulator.** Use a real device.
8. **Analysis costs one extra model call per substantial turn.** Turn off
   _Settings → Live feedback_ to halve API usage.

---

## Licence

MIT — see [LICENSE](LICENSE).
