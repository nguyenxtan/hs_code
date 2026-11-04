import { expect, it, vi } from 'vitest';
import { createChatProvider, resolveChatConfig } from '../src/lib/chat-provider';

const config = {
  key: 'test-only-secret',
  model: 'nvidia/nemotron-3.5-super-vl:free',
  dailyLimit: 100,
};
const input = {
  name: 'test',
  schema: { type: 'object' },
  messages: [{ role: 'user' as const, content: 'con dấu' }],
};
const quota = () => Response.json({ data: { free_model_daily_requests: { remaining: 1000 } } });

it('finds the OpenRouter key without requiring the legacy model settings', () => {
  expect(resolveChatConfig({ OPENROUTER_API_KEY: 'abc', HS_CHAT_ENABLED: 'true' })).toEqual({
    ...config,
    key: 'abc',
    dailyLimit: 200,
  });
  expect(resolveChatConfig({ OPENROUTER_API_KEY: 'abc', HS_CHAT_ENABLED: 'false' })).toBeNull();
  expect(
    resolveChatConfig({
      OPENROUTER_API_KEY: 'abc',
      HS_CHAT_ENABLED: 'true',
      HS_CHAT_MODEL: 'paid/model',
    }),
  ).toBeNull();
});

it('requests strict JSON with no paid routing and never exposes the key in status', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(quota())
    .mockResolvedValueOnce(
      Response.json({
        model: config.model,
        usage: { cost: 0 },
        choices: [{ finish_reason: 'stop', message: { content: '{"part":"unknown"}' } }],
      }),
    );
  const provider = createChatProvider(config, { fetch: fetcher });
  expect(await provider.request(input)).toEqual({ ok: true, data: { part: 'unknown' } });
  const [url, options] = fetcher.mock.calls[1];
  expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
  const body = JSON.parse(options.body);
  expect(body.model).toBe('nvidia/nemotron-3.5-super-vl:free');
  expect(body.provider).toEqual({
    require_parameters: true,
    allow_fallbacks: false,
    max_price: { prompt: 0, completion: 0 },
  });
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(JSON.stringify(provider.status())).not.toContain('test-only-secret');
});

it('opens the breaker on quota errors and does not retry or spend a second request', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(quota())
    .mockResolvedValueOnce(
      Response.json(
        { error: { message: 'private provider error' } },
        { status: 429, headers: { 'retry-after': '60' } },
      ),
    );
  const provider = createChatProvider(config, { fetch: fetcher, now: () => 1000 });
  expect(await provider.request(input)).toEqual({ ok: false, reason: 'quota' });
  expect(await provider.request(input)).toEqual({ ok: false, reason: 'cooldown' });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('refuses calls when upstream free quota is exhausted', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ data: { free_model_daily_requests: { remaining: 0 } } }));
  const provider = createChatProvider(config, { fetch: fetcher });
  expect(await provider.request(input)).toEqual({ ok: false, reason: 'quota' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('counts failed and successful attempts against the local daily budget', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(quota())
    .mockResolvedValueOnce(
      Response.json({
        model: config.model,
        usage: { cost: 0 },
        choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
      }),
    );
  const provider = createChatProvider({ ...config, dailyLimit: 1 }, { fetch: fetcher });
  expect((await provider.request(input)).ok).toBe(true);
  expect(await provider.request(input)).toEqual({ ok: false, reason: 'budget' });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it.each(['not json', '', '{"broken":'])(
  'rejects unusable completion %s without retrying',
  async (content) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(quota())
      .mockResolvedValueOnce(
        Response.json({
          model: config.model,
          usage: { cost: 0 },
          choices: [{ finish_reason: 'stop', message: { content } }],
        }),
      );
    const provider = createChatProvider(config, { fetch: fetcher });
    expect(await provider.request(input)).toEqual({ ok: false, reason: 'invalid_output' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  },
);

it('does not activate from a key alone', () => {
  expect(resolveChatConfig({ OPENROUTER_API_KEY: 'abc' })).toBeNull();
});
it.each([
  { model: 'paid/model', usage: { cost: 0 } },
  { model: config.model, usage: { cost: 1 } },
])('disables on unexpected model or billed output', async (extra) => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(quota())
    .mockResolvedValueOnce(
      Response.json({ ...extra, choices: [{ finish_reason: 'stop', message: { content: '{}' } }] }),
    );
  const p = createChatProvider(config, { fetch: f });
  expect(await p.request(input)).toEqual({ ok: false, reason: 'invalid_output' });
  expect(await p.request(input)).toEqual({ ok: false, reason: 'disabled' });
  expect(f).toHaveBeenCalledTimes(2);
});
it.each([400, 401, 403, 404])(
  'does not repeatedly call an invalid endpoint (%s)',
  async (status) => {
    let time = 1000;
    const f = vi
      .fn()
      .mockResolvedValueOnce(quota())
      .mockResolvedValueOnce(new Response('', { status }));
    const p = createChatProvider(config, { fetch: f, now: () => time });
    await p.request(input);
    time += 30000;
    await p.request(input);
    expect(f).toHaveBeenCalledTimes(2);
  },
);
it('fails closed with an unavailable notice if quota cannot be checked', async () => {
  const p = createChatProvider(config, { fetch: vi.fn().mockRejectedValue(Error('network')) });
  expect(await p.request(input)).toEqual({ ok: false, reason: 'unavailable' });
});
it('reserves the last upstream request only once for concurrent calls', async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ data: { free_model_daily_requests: { remaining: 1 } } }))
    .mockResolvedValue(
      Response.json({
        model: config.model,
        usage: { cost: 0 },
        choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
      }),
    );
  const p = createChatProvider(config, { fetch: f });
  const r = await Promise.all([p.request(input), p.request(input)]);
  expect(r.filter((x) => x.ok)).toHaveLength(1);
  expect(f).toHaveBeenCalledTimes(2);
});
it('opens a breaker after repeated unusable model output', async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(quota())
    .mockImplementation(async () =>
      Response.json({
        model: config.model,
        usage: { cost: 0 },
        choices: [{ finish_reason: 'length', message: { content: null, reasoning: 'hidden' } }],
      }),
    );
  const p = createChatProvider(config, { fetch: f });
  for (let i = 0; i < 3; i++)
    expect(await p.request(input)).toEqual({ ok: false, reason: 'invalid_output' });
  expect(await p.request(input)).toEqual({ ok: false, reason: 'cooldown' });
  expect(f).toHaveBeenCalledTimes(4);
});
