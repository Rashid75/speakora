import { DEFAULT_SETTINGS } from '@/config/appConfig';
import { BUILTIN_TOPICS } from '@/data/topics';
import { GeminiProvider } from '@/services/ai/gemini/GeminiProvider';
import { INITIAL_PROGRESS } from '@/utils/cefr';
import type { Topic } from '@/types';

const topic = BUILTIN_TOPICS[0] as Topic;

/**
 * The provider is tested entirely against a mocked `fetch`. No test in this
 * repository ever calls the real Gemini API - that would be slow, costly and
 * non-deterministic.
 */

const mockFetch = (body: unknown, init: { status?: number; ok?: boolean } = {}): jest.Mock =>
  jest.fn(async () => ({
    ok: init.ok ?? (init.status ?? 200) < 400,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })) as unknown as jest.Mock;

const geminiText = (text: string): unknown => ({
  candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
});

const turnRequest = {
  topic,
  settings: DEFAULT_SETTINGS,
  history: [{ role: 'model' as const, text: 'Hey, how are you?' }],
  userText: 'I am doing well thanks, just finished work',
  elapsedMinutes: 2,
  shouldTransitionTopic: false,
  progress: INITIAL_PROGRESS,
};

describe('GeminiProvider.generateResponse', () => {
  it('returns a sanitised reply on success', async () => {
    global.fetch = mockFetch(geminiText('**Oh nice!** What do you do?')) as unknown as typeof fetch;

    const result = await new GeminiProvider().generateResponse(turnRequest);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.reply).toBe('Oh nice! What do you do?');
  });

  it('sends the system instruction and the history', async () => {
    const fetchMock = mockFetch(geminiText('Sure.'));
    global.fetch = fetchMock as unknown as typeof fetch;

    await new GeminiProvider().generateResponse(turnRequest);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.systemInstruction.parts[0].text).toContain('You are NOT an English teacher');
    expect(body.contents).toHaveLength(2);
    expect(body.contents[1]).toEqual({
      role: 'user',
      parts: [{ text: turnRequest.userText }],
    });
  });

  it('does not request JSON mode for conversation, to keep replies natural', async () => {
    const fetchMock = mockFetch(geminiText('Sure.'));
    global.fetch = fetchMock as unknown as typeof fetch;

    await new GeminiProvider().generateResponse(turnRequest);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.generationConfig.responseMimeType).toBeUndefined();
  });

  it('instructs a natural transition when one is due', async () => {
    const fetchMock = mockFetch(geminiText('Anyway...'));
    global.fetch = fetchMock as unknown as typeof fetch;

    await new GeminiProvider().generateResponse({ ...turnRequest, shouldTransitionTopic: true });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const instruction = String(body.systemInstruction.parts[0].text);
    expect(instruction).toContain('move it somewhere new');
    expect(instruction).toContain('Never say anything like');
  });

  it('maps a 429 to a retryable rate-limit failure', async () => {
    global.fetch = mockFetch(
      { error: { message: 'quota' } },
      { status: 429 },
    ) as unknown as typeof fetch;

    const result = await new GeminiProvider().generateResponse(turnRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('ai_rate_limited');
      expect(result.error.retryable).toBe(true);
    }
    // Rate limiting uses a 3x longer backoff, so this test outlives the
    // default 5s Jest timeout by design.
  }, 20_000);

  it('maps a 403 to a non-retryable configuration failure', async () => {
    global.fetch = mockFetch(
      { error: { message: 'bad key' } },
      { status: 403 },
    ) as unknown as typeof fetch;

    const result = await new GeminiProvider().generateResponse(turnRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('ai_not_configured');
      expect(result.error.retryable).toBe(false);
    }
  });

  it('reports blocked content rather than a generic error', async () => {
    global.fetch = mockFetch({
      promptFeedback: { blockReason: 'SAFETY' },
    }) as unknown as typeof fetch;

    const result = await new GeminiProvider().generateResponse(turnRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ai_blocked_content');
  });

  it('surfaces a network rejection as ai_unavailable, never as a thrown error', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    const result = await new GeminiProvider().generateResponse(turnRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ai_unavailable');
  });

  it('retries a retryable failure and succeeds on a later attempt', async () => {
    let call = 0;
    global.fetch = jest.fn(async () => {
      call += 1;
      if (call === 1) {
        return {
          ok: false,
          status: 503,
          json: async () => ({}),
          text: async () => 'unavailable',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => geminiText('Back online.'),
        text: async () => '',
      };
    }) as unknown as typeof fetch;

    const result = await new GeminiProvider().generateResponse(turnRequest);

    expect(call).toBeGreaterThan(1);
    expect(result.ok).toBe(true);
  }, 20_000);

  it('does not retry a non-retryable failure', async () => {
    const fetchMock = mockFetch({ error: { message: 'bad request' } }, { status: 400 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await new GeminiProvider().generateResponse(turnRequest);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honours an abort signal', async () => {
    const controller = new AbortController();
    controller.abort();
    global.fetch = mockFetch(geminiText('never')) as unknown as typeof fetch;

    const result = await new GeminiProvider().generateResponse(turnRequest, controller.signal);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('cancelled');
  });
});

describe('GeminiProvider.analyzeSpeech', () => {
  const analysisRequest = {
    userText: 'I am working in this company since three years',
    assistantPrompt: 'How long have you been there?',
    settings: DEFAULT_SETTINGS,
    topic,
    wordCount: 9,
  };

  it('requests JSON mode for analysis', async () => {
    const fetchMock = mockFetch(
      geminiText(
        JSON.stringify({
          grammar: [],
          vocabulary: [],
          expressions: [],
          fluency: { score: 70, fillerWords: [], repeatedWords: [], observations: [] },
          pronunciation: { available: false, reason: 'typed' },
          confidence: { score: 70, observations: [] },
          polishedResponse: "I've been working at this company for three years.",
          levelEstimate: 'B1',
          overallScore: 70,
          headline: 'Watch the present perfect.',
        }),
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await new GeminiProvider().analyzeSpeech(analysisRequest);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(result.ok).toBe(true);
  });

  it('returns ai_invalid_response for unparseable output', async () => {
    global.fetch = mockFetch(geminiText('I cannot do that')) as unknown as typeof fetch;

    const result = await new GeminiProvider().analyzeSpeech(analysisRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ai_invalid_response');
  });
});

describe('GeminiProvider.estimateEnglishLevel', () => {
  it('refuses without evidence rather than guessing', async () => {
    const result = await new GeminiProvider().estimateEnglishLevel({
      recentAnalyses: [],
      previous: INITIAL_PROGRESS,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_found');
  });
});
