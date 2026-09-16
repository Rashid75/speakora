# Speakora — Architecture

This document explains _why_ the code is shaped the way it is. For setup and
commands, see the [README](../README.md).

---

## 1. The one product principle everything serves

> The natural conversation is more important than the feedback.

Almost every non-obvious decision below follows from that sentence. Feedback is
computed **out of band** and surfaced only when asked for; the conversation
prompt is optimised for naturalness even where that costs us structure; the
microphone is the largest control on the most important screen.

---

## 2. Layering

```
        Screens  (features/*/screens)
            │        render state, dispatch intent — no I/O
            ▼
         Hooks   (features/*/hooks, hooks/)
            │        orchestration, lifecycle, abort handling
            ▼
       Services  (services/ai, services/speech, services/conversation)
            │        business rules, vendor seams
            ▼
   Repositories  (repositories/)
            │        persistence interface — swappable for HTTP
            ▼
        Storage  (repositories/storage/StorageAdapter.ts)
```

Two rules are enforced by review and by the import graph:

1. **A screen never imports a repository's storage layer or an AI client.** It
   may import a repository (for a simple read) or a hook.
2. **Only `StorageAdapter.ts` imports AsyncStorage; only `geminiClient.ts`
   calls `fetch` against a vendor.** Both are single-file seams.

### Why feature folders rather than type folders

`components/`, `hooks/`, `screens/` at the top level scales badly: adding one
feature touches five directories and every folder becomes a dumping ground. Here
a feature owns its screens, its components, its hooks and its state, and only
genuinely shared primitives live in `src/components/ui`.

The exception is `types/`, `theme/`, `utils/` and `data/`, which are shared by
definition and have no feature to belong to.

---

## 3. The AI seam

```
 ConversationScreen
        │
 useConversationEngine            ← lifecycle, abort, audio handover
        │
 ConversationService              ← turn assembly, analysis policy, persistence
        │
 AIProvider (interface)           ← types/ai.ts
        │
 GeminiProvider                   ← prompts, temperature, retries, parsing
        │
 geminiClient.generateContent     ← one POST; the only vendor-aware transport
        │
 Gemini REST API   ─or─   your AI gateway
```

`AIProvider` has five methods (`generateResponse`, `analyzeSpeech`,
`optimizeTopic`, `evaluateConversation`, `estimateEnglishLevel`). Adding OpenAI
or Anthropic means writing one class in `services/ai/` and adding a branch to
the switch in `services/ai/index.ts`. Nothing above that line changes.

### Why raw REST instead of the official SDK

- We need exactly one endpoint (`:generateContent`). The SDK is a large
  dependency for one POST.
- Vendor SDKs assume Node primitives that need polyfilling under Hermes.
- Going direct makes the **gateway swap a single URL change** rather than a
  second transport implementation. `AI_GATEWAY_URL` sends the identical request
  body to your own backend, which can forward it to Google verbatim.

### Why providers return `Result`, never throw

Every method returns `Result<T, AppFailure>`. A network blip during a
conversation must render a friendly banner, not unwind the React tree. The
`AppFailure.code` union is small and closed, and `utils/errors.ts` is the single
place a code becomes user-facing copy — which is how the "never show raw API
errors" requirement is actually enforced rather than merely intended.

### Prompts are source files, not strings in components

`src/prompts/` holds five builders, each exporting a `*_VERSION` constant. They
are pure functions of typed request objects, so they can be unit-tested and
diffed like any other code. The conversation prompt is assembled from four
independent layers — role rules, persona, calibration, situation — so changing
a personality cannot accidentally weaken the "do not act like a teacher" rules.

### Structured output, defensively parsed

Analysis, assessment, level and topic-optimisation calls request
`responseMimeType: application/json`. The conversation call deliberately does
**not**: JSON mode measurably stiffens conversational prose, and naturalness is
the product.

`services/ai/json.ts` recovers the realistic failure modes (code fences, a line
of preamble, a trailing comma, braces inside strings). `parsers.ts` then
_coerces, clamps and defaults_ rather than rejecting: a model returning `"85"`
or `0.85` where `85` was documented degrades into something sensible, and a
missing `polishedResponse` does not throw away three good grammar corrections. A
payload with no usable signal at all returns `undefined` — a genuine failure.

No `any` anywhere; `JsonValue` models unknown input honestly.

---

## 4. Pronunciation honesty

This deserves its own section because it is the easiest requirement to fake.

We read a **text transcript**. We cannot hear audio. A model asked to score
pronunciation from text will happily produce a confident-looking number, and it
will be meaningless.

So:

- `PronunciationAssessment` is a **discriminated union**, not a number with a
  flag. `{ available: false, reason }` is a distinct shape from a score, so the
  UI cannot accidentally render a missing measurement as `0`.
- `parsers.ts` **forces `available: false`** when the speech layer gave us no
  recogniser confidence, regardless of what the model claimed.
- Where a confidence _is_ available, it is treated as a weak proxy for
  intelligibility and labelled as such — never as a phonetic assessment.
- Android's `SpeechRecognizer` frequently reports `0` even for a perfect result,
  so `SpeechRecognitionService` maps a zero to **"not reported"**, not "bad".
- `ProgressBar` has an `unavailable` prop that renders a dimmed, empty track
  reading "Not measured".

The same rule shapes `StatisticsSnapshot.skillAvailability`: every axis declares
whether real evidence backs it.

---

## 5. CEFR estimation

The requirement is that the badge must not swing on one sentence.

`utils/cefr.ts` keeps a continuous `levelScore` (A1 = 0 … C2 = 5) and moves it
with an exponential moving average whose learning rate **shrinks as evidence
accumulates** (`alphaForTurn`). Early turns move the estimate quickly — we know
nothing yet; by turn twenty a single outlier moves it by hundredths of a level.

`computeConfidence` multiplies two independent things:

- **volume** — how many analysed turns we have, saturating at 14;
- **consistency** — `1 − σ/1.5` over the recent window.

A learner who is solidly B1 every turn reaches high confidence. One whose turns
scatter across A2–C1 stays uncertain no matter how much they practise. That is
the honest answer.

The **level is computed on device**; the model is asked only for per-turn
estimates and for the _narrative justification_ shown on Statistics. Letting the
model re-decide the level from scratch each time is exactly how a badge ends up
flapping between B1 and C1.

---

## 6. The voice pipeline

```
  tap  →  TextToSpeech.stop()
       →  handover delay (250 ms Android / 120 ms iOS)
       →  SpeechRecognition.start()
       →  interim results stream to the UI
       →  'end' event → best final transcript
       →  commit user turn  ─┬─→  requestReply()  →  TTS  →  (hands-free) reopen mic
                             └─→  analyzeTurn()   →  feedback badge   [fire and forget]
```

Points worth knowing:

- **The analysis branch never gates the conversation.** It is dispatched after
  the reply is already rendered.
- **The handover delay is not superstition.** Android's `SpeechRecognizer` and
  the TTS engine contend for audio focus; starting the recogniser while TTS is
  finishing swallows the first word on several devices.
- **`startListening` and `commitUserTurn` are mutually recursive** (hands-free
  restarts the mic after a reply; a reply is triggered by the mic). The cycle is
  broken with a ref rather than by merging them into one untestable function.
- **Settings are read through a ref** inside async callbacks. A user changing
  accent mid-conversation must take effect on the next turn; a closure captured
  at conversation start would silently keep the old value.
- **The longest final transcript wins.** Android streams a growing partial; iOS
  can emit a shorter correction. Keeping the longest avoids losing the end of a
  sentence to a last-moment revision.
- **One `AbortController` per conversation**, aborted on unmount and on `end`,
  so leaving the screen mid-request cannot resolve into a dead component.

### State machine

`conversationReducer.ts` is a reducer, not a pile of `useState`, because the
voice flow has real invariants: you cannot listen and speak simultaneously, an
interim transcript must clear when a turn commits, the timer must not run while
paused, and a pause requested mid-utterance must take effect only when speech
ends. Expressed as transitions, all of that is testable without mounting a
component or touching a microphone.

---

## 7. Persistence

`AsyncStorage` — not MMKV, not SQLite — because the data is small, the access
pattern is read-all/write-all, and it adds no native module beyond what Expo
already supports. If conversation volume ever makes that untrue, **only
`StorageAdapter.ts` changes**.

`ConversationRepository` serialises its operations through a single in-flight
promise chain. Without it, the conversation screen autosaving while the History
screen loads produces a lost update, because both read the same array and write
it back.

**Statistics are derived, never stored.** A materialised statistics blob would
be a second source of truth that drifts the first time a conversation is
deleted. Folding a couple of hundred local records is sub-millisecond.

Everything read back off disk is re-validated (`normaliseSettings`,
`normaliseProgress`, `isConversation`). A downgraded app, a removed theme or a
corrupt value must not leave the UI rendering `undefined`.

---

## 8. Theming

The palette, type scale, radii and spacing are taken from the Claude Design
handoff (`Speaking Coach.dc.html`) rather than invented here. The handoff is
HTML/CSS, so the port is a translation: each artboard's inline styles were read
off and folded into the token set, which is why `ColorTokens` grew names like
`ink`, `onInkMuted` and `primarySoftStrong` - they are the roles the design
actually uses, not a generic palette.

Two consequences of that translation worth knowing:

- **`ink` is not `background`.** The design uses a near-black `#02081E` for the
  conversation screen, the level card and the resume card _regardless of light
  or dark mode_. It is a brand surface, not a scheme surface, so it is its own
  token with its own `onInk*` text ramp.
- **Weights are separate font files.** React Native cannot synthesise weights
  for a custom family, so `typography` maps each step to a specific loaded face
  (`SpaceGrotesk_600SemiBold`) and never sets `fontWeight`.

`ColorTokens` is a flat set of **semantic** names — `surface`, `textSecondary`,
`listening` — with no raw hex outside `palettes.ts`. Adding a theme is one entry
in `THEMES`; no component changes.

Two consequences worth stating:

- `AppText` is the **only** text primitive. Forcing every string through it is
  what makes the theme switch total — no component can hard-code a colour.
- Voice state is **never** communicated by colour alone. Each phase changes the
  glyph, the caption, the `accessibilityLabel` and the ring colour together.

`ThemeProvider` sits _inside_ `SettingsProvider` because the theme is derived
from settings. `buildTheme` is a pure function, so theme resolution — including
the dark-only `midnight` override — is unit-testable.

---

## 9. State management

There is no global store, and that is deliberate.

- **Settings** are genuinely global (theme, voice, difficulty are read almost
  everywhere) → React Context, hydrated once, debounced writes.
- **Conversation state** belongs to one screen → `useReducer` in that feature.
- **History / statistics** are server-shaped reads → `useAsyncData` with a
  four-state lifecycle and a generation guard against out-of-order responses.

Redux or Zustand would add a dependency and a layer of indirection to solve a
problem this app does not have.

---

## 10. Security: the API key

**Shipping a Gemini API key inside a mobile binary is not secure.** An `.ipa` or
`.apk` can be unzipped and strings extracted in minutes. Certificate pinning,
obfuscation and native storage all slow an attacker down; none stop one. Anyone
who extracts the key can spend your quota.

For a learning build or an internal MVP that is an accepted, informed risk. It
is **not** acceptable for a public store release.

The mitigation is already wired in. Set `AI_GATEWAY_URL` and every request goes
to your backend instead of Google, with no vendor key in the binary:

```
React Native App  →  Your AI Gateway  →  Gemini
                     • holds the key server-side
                     • authenticates the user
                     • rate-limits per account
                     • logs and bills per user
```

`geminiClient.ts` already branches on that variable and posts an identical body,
so the gateway can forward it verbatim. Nothing above the client changes.

Other security properties today:

- No account, no server, no telemetry. Transcripts never leave the device except
  as prompt content sent to the configured AI provider.
- `.env` is git-ignored; `.env.example` documents the variables.
- The logger redacts anything matching an API-key or bearer-token pattern before
  it reaches a sink.
- `Settings → Delete all conversations` genuinely erases local data.

---

## 11. Testing strategy

Tests target the logic where a bug is silent and expensive:

| Suite                                                           | What it protects                                                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `utils/__tests__/cefr.test.ts`                                  | The badge cannot swing on one turn; confidence reflects consistency                |
| `services/ai/__tests__/parsers.test.ts`                         | Malformed model output degrades instead of crashing; pronunciation cannot be faked |
| `services/ai/__tests__/GeminiProvider.test.ts`                  | HTTP status → failure-code mapping, retry policy, abort, JSON-mode choices         |
| `services/statistics/__tests__/aggregate.test.ts`               | No divide-by-zero; unmeasured axes stay unmeasured; streak arithmetic              |
| `services/conversation/__tests__/TopicTransitionPolicy.test.ts` | Transitions fire on interval and on stall, never back-to-back                      |
| `features/conversation/state/__tests__/`                        | Voice state machine invariants                                                     |
| `repositories/__tests__/`                                       | Corrupt stored data is sanitised, not fatal; concurrent saves do not lose writes   |
| `utils/__tests__/text.test.ts`                                  | Filler detection does not punish correct usage                                     |

The Gemini service is tested against a mocked `fetch`; `jest.setup.ts` makes any
unmocked network call fail loudly, so no test can silently hit the real API.

---

## 12. Known limitations

1. **Pronunciation is intelligibility, not phonetics.** Real phonetic scoring
   needs forced alignment against an acoustic model, which neither platform's
   free recogniser exposes. We report what we can measure and say so.
2. **Accent availability is device-dependent.** Neither platform guarantees a
   voice for a locale. We probe the installed voice list and label unavailable
   accents rather than silently substituting one. The _prompt_ still adapts
   vocabulary and idiom even when the voice falls back.
3. **`expo-speech-recognition` needs a development build.** It is a native
   module; Expo Go cannot load it. `npx expo run:android` / `run:ios`.
4. **Speech recognition requires a connection on most devices**, unless the
   user has an on-device language pack installed.
5. **Background operation is limited by design.** Backgrounding releases the
   microphone and pauses the conversation — iOS suspends the recogniser anyway,
   and holding Android's recording indicator while hidden would be hostile.
6. **The one-hour topic rotation is time- and stall-based, not semantic.** We do
   not model whether a subject is genuinely exhausted.
7. **Simulators have no microphone input worth testing with.** Voice must be
   verified on a physical device.
