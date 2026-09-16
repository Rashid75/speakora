import { env } from '@/config/env';
import { failure, type AppFailure, type Result } from '@/types';
import { describeError, isAbortError } from '@/utils/errors';
import { createLogger } from '@/services/logging/logger';

const log = createLogger('gemini');

/**
 * Thin REST client for the Gemini generateContent endpoint.
 *
 * Deliberately *not* the official SDK: the REST surface we need is one POST,
 * the SDK pulls in Node-oriented dependencies that need polyfilling under
 * Hermes, and going direct keeps the gateway swap (below) to a single URL
 * change rather than a second transport implementation.
 */

export interface GeminiPart {
  readonly text: string;
}

export interface GeminiContent {
  readonly role: 'user' | 'model';
  readonly parts: readonly GeminiPart[];
}

export interface GenerateContentOptions {
  readonly systemInstruction?: string;
  readonly contents: readonly GeminiContent[];
  readonly temperature: number;
  readonly maxOutputTokens: number;
  readonly json: boolean;
  readonly signal?: AbortSignal;
  /** Identifies the call in logs and gateway routing. */
  readonly operation: string;
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
  finishReason?: string;
}

interface GeminiResponseBody {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

/**
 * When `AI_GATEWAY_URL` is set every request goes to your own backend and no
 * vendor key is embedded in the binary. The request body is identical, so the
 * gateway can forward it to Google verbatim. This is the production shape; the
 * direct-to-Google path is the MVP convenience.
 */
const endpointFor = (operation: string): { url: string; headers: Record<string, string> } => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (env.aiGatewayUrl) {
    return { url: `${env.aiGatewayUrl}/generate/${operation}`, headers };
  }

  headers['x-goog-api-key'] = env.geminiApiKey;
  return {
    url: `${env.geminiBaseUrl}/models/${env.geminiModel}:generateContent`,
    headers,
  };
};

export const generateContent = async (
  options: GenerateContentOptions,
): Promise<Result<string, AppFailure>> => {
  if (!env.aiGatewayUrl && !env.geminiApiKey) {
    return {
      ok: false,
      error: failure('ai_not_configured', 'No API key and no gateway URL', false),
    };
  }

  const { url, headers } = endpointFor(options.operation);

  const body = {
    contents: options.contents,
    ...(options.systemInstruction
      ? { systemInstruction: { parts: [{ text: options.systemInstruction }] } }
      : {}),
    generationConfig: {
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      ...(options.json ? { responseMimeType: 'application/json' } : {}),
    },
    safetySettings: SAFETY_SETTINGS,
  };

  // Two independent abort sources: our own timeout, and the caller's signal
  // (used when the user ends a conversation mid-request).
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.aiRequestTimeoutMs);
  const onCallerAbort = (): void => controller.abort();
  options.signal?.addEventListener('abort', onCallerAbort, { once: true });

  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const mapped = mapHttpStatus(response.status, await safeText(response));
      // Logged at warn, not debug: a non-2xx is the single most useful thing to
      // see when diagnosing a failure in the field, and `detail` carries the
      // status plus the API's own message. `redact` strips any key first.
      log.warn('generateContent HTTP error', {
        operation: options.operation,
        status: response.status,
        code: mapped.code,
        detail: mapped.detail ?? '',
      });
      return { ok: false, error: mapped };
    }

    const payload = (await response.json()) as GeminiResponseBody;
    log.debug('generateContent complete', {
      operation: options.operation,
      ms: Date.now() - startedAt,
    });

    const extracted = extractText(payload);
    if (!extracted.ok) {
      log.warn('generateContent unusable response', {
        operation: options.operation,
        code: extracted.error.code,
        detail: extracted.error.detail ?? '',
      });
    }
    return extracted;
  } catch (error) {
    if (options.signal?.aborted) {
      return { ok: false, error: failure('cancelled', 'Caller aborted', false) };
    }
    if (isAbortError(error)) {
      return {
        ok: false,
        error: failure('timeout', `Timed out after ${env.aiRequestTimeoutMs}ms`),
      };
    }
    // fetch rejects with a TypeError for DNS/connectivity problems.
    log.warn('generateContent failed', {
      operation: options.operation,
      error: describeError(error),
    });
    return { ok: false, error: failure('ai_unavailable', describeError(error)) };
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', onCallerAbort);
  }
};

const extractText = (payload: GeminiResponseBody): Result<string, AppFailure> => {
  if (payload.error) {
    return {
      ok: false,
      error: failure('ai_unavailable', payload.error.message ?? 'Unknown API error'),
    };
  }

  const blockReason = payload.promptFeedback?.blockReason;
  if (blockReason) {
    return {
      ok: false,
      error: failure('ai_blocked_content', `Prompt blocked: ${blockReason}`, false),
    };
  }

  const candidate = payload.candidates?.[0];
  if (!candidate) {
    return { ok: false, error: failure('ai_invalid_response', 'No candidates returned') };
  }
  if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'PROHIBITED_CONTENT') {
    return {
      ok: false,
      error: failure('ai_blocked_content', `Response blocked: ${candidate.finishReason}`, false),
    };
  }

  const text = (candidate.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    // MAX_TOKENS with no text means our token budget was too small to say anything.
    return {
      ok: false,
      error: failure(
        'ai_invalid_response',
        `Empty text (finishReason=${candidate.finishReason ?? 'none'})`,
      ),
    };
  }
  return { ok: true, value: text };
};

const mapHttpStatus = (status: number, detail: string): AppFailure => {
  if (status === 400) return failure('ai_invalid_response', `400: ${detail}`, false);
  if (status === 401 || status === 403)
    return failure('ai_not_configured', `${status}: ${detail}`, false);
  if (status === 429) return failure('ai_rate_limited', `429: ${detail}`);
  if (status >= 500) return failure('ai_unavailable', `${status}: ${detail}`);
  return failure('ai_unavailable', `${status}: ${detail}`);
};

const safeText = async (response: Response): Promise<string> => {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return 'unreadable body';
  }
};

/**
 * Language practice legitimately covers conflict, health, money and bad news.
 * The default thresholds block too much of that, so we relax to the documented
 * minimum while leaving the high-severity categories enforced.
 */
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
] as const;
