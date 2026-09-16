import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config.
 *
 * Expo CLI loads `.env` (and `.env.local`) into `process.env` before evaluating
 * this file, so secrets stay out of source control and out of `app.json`.
 *
 * IMPORTANT: values placed in `extra` are embedded in the app bundle. See
 * docs/ARCHITECTURE.md ("API key exposure") for the threat model and the
 * backend-gateway migration path.
 */
const APP_NAME = 'Speakora';
const BUNDLE_ID = 'com.speakora.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'speakora',
  scheme: 'speakora',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    buildNumber: '1',
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Speakora uses your microphone so you can practise speaking English out loud with your AI conversation partner.',
      NSSpeechRecognitionUsageDescription:
        'Speakora converts your speech to text so it can understand you and give you feedback on your English.',
      UIBackgroundModes: ['audio'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: BUNDLE_ID,
    versionCode: 1,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      // Matches the mint the background layer is filled with, so the launcher
      // has the right colour to bleed into during its mask and parallax.
      backgroundColor: '#16C98D',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['android.permission.RECORD_AUDIO', 'android.permission.INTERNET'],
  },
  plugins: [
    'expo-dev-client',
    [
      'expo-notifications',
      {
        // Local reminders only - there is no push server, so nothing here
        // configures remote delivery.
        defaultChannel: 'daily-practice',
        color: '#675CF5',
        enableBackgroundRemoteNotifications: false,
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'Speakora uses your microphone so you can practise speaking English out loud.',
        speechRecognitionPermission:
          'Speakora converts your speech to text so it can understand you and give you feedback.',
        androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
      },
    ],
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '16.4' },
        android: { minSdkVersion: 24, compileSdkVersion: 36, targetSdkVersion: 36 },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        // Matches `SplashView`'s canvas in both schemes - that view is painted
        // on ink regardless of theme, so this must be too or the handover
        // between the two layers flashes.
        backgroundColor: '#080B2A',
        dark: { backgroundColor: '#080B2A' },
      },
    ],
  ],
  extra: {
    ...config.extra,
    aiProvider: process.env.AI_PROVIDER ?? 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    geminiBaseUrl:
      process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta',
    aiGatewayUrl: process.env.AI_GATEWAY_URL ?? '',
    aiRequestTimeoutMs: process.env.AI_REQUEST_TIMEOUT_MS ?? '30000',
    logLevel: process.env.LOG_LEVEL ?? 'info',
  },
});
