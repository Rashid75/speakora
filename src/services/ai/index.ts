import { env } from '@/config/env';
import type { AIProvider } from '@/types';
import { GeminiProvider } from './gemini/GeminiProvider';

/**
 * Provider registry.
 *
 * The rest of the app asks for `getAIProvider()` and never names a vendor.
 * Adding OpenAI or Anthropic means writing a class in this folder and adding
 * one line to the switch below.
 */

let cached: AIProvider | undefined;

const create = (): AIProvider => {
  switch (env.aiProvider) {
    case 'gemini':
    default:
      return new GeminiProvider();
  }
};

export const getAIProvider = (): AIProvider => {
  cached ??= create();
  return cached;
};

/** Test seam: lets a suite substitute a fake provider. */
export const setAIProviderForTesting = (provider: AIProvider | undefined): void => {
  cached = provider;
};

export { GeminiProvider };
export * from './parsers';
export * from './json';
export * from './validation';
