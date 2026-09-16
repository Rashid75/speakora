import * as Crypto from 'expo-crypto';

/**
 * Collision-resistant identifier.
 *
 * `expo-crypto` gives us a real UUID v4 backed by the platform CSPRNG. We keep
 * a tiny fallback because `randomUUID` throws on a handful of old Android
 * builds, and an ID failure must never take down a conversation.
 */
export const createId = (prefix?: string): string => {
  let id: string;
  try {
    id = Crypto.randomUUID();
  } catch {
    id = fallbackId();
  }
  return prefix ? `${prefix}_${id}` : id;
};

const fallbackId = (): string => {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const rand2 = Math.random().toString(36).slice(2, 10);
  return `${time}-${rand}${rand2}`;
};
