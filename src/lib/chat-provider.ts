const FREE_MODEL = 'nvidia/nemotron-3.5-super-vl:free';
type Config = { key: string; model: string; dailyLimit: number };
type Input = {
  name: string;
  schema: Record<string, unknown>;
  messages: { role: 'system' | 'user'; content: string }[];
  deadline?: number;
};
type Failure =
  'disabled' | 'quota' | 'cooldown' | 'budget' | 'rate_limit' | 'unavailable' | 'invalid_output';
export type ModelResult = { ok: true; data: unknown } | { ok: false; reason: Failure };

export function resolveChatConfig(env: Record<string, string | undefined>): Config | null {
  if (env.HS_CHAT_ENABLED !== 'true') return null;
  if (env.HS_CHAT_BASE_URL && env.HS_CHAT_BASE_URL !== 'https://openrouter.ai/api/v1') return null;
  const key =
    env.OPENROUTER_API_KEY ||
    (env.HS_CHAT_BASE_URL === 'https://openrouter.ai/api/v1' ? env.HS_CHAT_API_KEY : undefined);
  const model = env.HS_CHAT_MODEL || FREE_MODEL;
  // An explicit allowlist prevents a typo or fallback from selecting a paid model.
  if (!key || model !== FREE_MODEL) return null;
  const requested = Number(env.HS_CHAT_DAILY_LIMIT || 200);
  return {
    key,
    model,
    dailyLimit: Number.isFinite(requested)
      ? Math.max(1, Math.min(1000, Math.floor(requested)))
      : 200,
  };
}

export function createChatProvider(
  config: Config | null,
  dependencies: { fetch?: typeof fetch; now?: () => number } = {},
) {
  const fetcher = dependencies.fetch || fetch;
  const now = dependencies.now || Date.now;
  let day = -1,
    calls = 0,
    blockedUntil = 0;
  let timestamps: number[] = [];
  let quotaRemaining = 0,
    quotaExpires = 0;
  let quotaCheck: Promise<boolean> | undefined;
  let disabled = false,
    invalidCount = 0,
    quotaUnavailable = false;
  function invalid(): ModelResult {
    if (++invalidCount >= 3) blockedUntil = now() + 60000;
    return { ok: false, reason: 'invalid_output' };
  }
  function resetDay() {
    const today = Math.floor(now() / 86400000);
    if (today !== day) {
      day = today;
      calls = 0;
      quotaExpires = 0;
    }
  }
  async function checkQuota(): Promise<boolean> {
    if (now() < quotaExpires) return quotaRemaining > 0;
    if (!quotaCheck)
      quotaCheck = (async () => {
        try {
          const r = await fetcher('https://openrouter.ai/api/v1/key', {
            headers: { Authorization: `Bearer ${config!.key}` },
            signal: AbortSignal.timeout(4000),
          });
          if (!r.ok) throw Error('quota_unavailable');
          const body = await r.json();
          const value = body?.data?.free_model_daily_requests?.remaining;
          if (!Number.isFinite(value) || value < 0) throw Error('quota_unavailable');
          quotaRemaining = value;
          quotaUnavailable = false;
          quotaExpires = now() + 60000;
          return value > 0;
        } catch {
          quotaUnavailable = true;
          blockedUntil = now() + 15000;
          return false;
        } finally {
          quotaCheck = undefined;
        }
      })();
    return quotaCheck;
  }
  return {
    status() {
      resetDay();
      return {
        enabled: !!config && !disabled,
        provider: config ? 'openrouter' : null,
        model: config?.model || null,
        calls_remaining: config ? Math.max(0, config.dailyLimit - calls) : 0,
        cooling_down: now() < blockedUntil,
      };
    },
    async request(input: Input): Promise<ModelResult> {
      if (!config || disabled) return { ok: false, reason: 'disabled' };
      if (input.deadline && input.deadline - now() < 1000)
        return { ok: false, reason: 'unavailable' };
      resetDay();
      if (now() < blockedUntil) return { ok: false, reason: 'cooldown' };
      if (calls >= config.dailyLimit) return { ok: false, reason: 'budget' };
      if (!(await checkQuota()))
        return { ok: false, reason: quotaUnavailable ? 'unavailable' : 'quota' };
      // Recheck after the async quota lookup; concurrent requests share this budget.
      resetDay();
      if (now() < blockedUntil) return { ok: false, reason: 'cooldown' };
      if (calls >= config.dailyLimit) return { ok: false, reason: 'budget' };
      timestamps = timestamps.filter((t) => t > now() - 60000);
      if (timestamps.length >= 15) return { ok: false, reason: 'rate_limit' };
      if (quotaRemaining <= 0) return { ok: false, reason: 'quota' };
      calls++;
      timestamps.push(now());
      quotaRemaining--;
      try {
        const r = await fetcher('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(
            Math.max(1, Math.min(12000, input.deadline ? input.deadline - now() : 12000)),
          ),
          body: JSON.stringify({
            model: config.model,
            provider: {
              require_parameters: true,
              allow_fallbacks: false,
              max_price: { prompt: 0, completion: 0 },
            },
            reasoning: { enabled: false },
            max_tokens: 1500,
            messages: input.messages,
            response_format: {
              type: 'json_schema',
              json_schema: { name: input.name, strict: true, schema: input.schema },
            },
          }),
        });
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) disabled = true;
          const quota = r.status === 429 || r.status === 402;
          const retry = Number(r.headers.get('retry-after'));
          blockedUntil =
            now() +
            (quota
              ? Math.min(300, Math.max(60, Number.isFinite(retry) ? retry : 60)) * 1000
              : r.status === 400 || r.status === 404
                ? 1800000
                : 15000);
          return { ok: false, reason: quota ? 'quota' : 'unavailable' };
        }
        const raw = await r.text();
        if (raw.length > 64000) return invalid();
        const data = JSON.parse(raw);
        if (
          data.model !== config.model ||
          (data.usage?.cost !== undefined && data.usage.cost !== 0)
        ) {
          disabled = true;
          return invalid();
        }
        const choice = data.choices?.[0];
        const content = choice?.message?.content;
        if (
          choice?.finish_reason !== 'stop' ||
          typeof content !== 'string' ||
          !content.trim() ||
          content.length > 16000
        )
          return invalid();
        try {
          const parsed: unknown = JSON.parse(content);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
          invalidCount = 0;
          return { ok: true, data: parsed };
        } catch {
          return invalid();
        }
      } catch {
        blockedUntil = now() + 15000;
        return { ok: false, reason: 'unavailable' };
      }
    },
  };
}

const runtime = globalThis as typeof globalThis & {
  hsChatProvider?: ReturnType<typeof createChatProvider>;
};
export function chatProvider() {
  return (runtime.hsChatProvider ||= createChatProvider(resolveChatConfig(process.env)));
}
