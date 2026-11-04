import nextEnv from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';
import { loadSnapshot } from '../src/lib/db';
import { answerChat } from '../src/lib/chat-service';
import { createChatProvider, resolveChatConfig } from '../src/lib/chat-provider';
import { extractFacts } from '../src/lib/session';
import { resolveTurn } from '../src/lib/conversation';
nextEnv.loadEnvConfig(process.cwd());
const config = resolveChatConfig(process.env);
if (!config) throw Error('Enable the free provider in server-local configuration first.');
const provider = createChatProvider({ ...config, dailyLimit: 15 });
const snapshot = await loadSnapshot();
const allSamples = [
  { message: 'con dấu', want: {} },
  { message: 'con dấu kim loại', want: { material_unknown: 'kim loại' } },
  { message: 'vỏ nhựa, mặt cao su', want: { body: 'nhựa', face: 'cao su' } },
  { message: 'à không, vỏ kim loại', want: { body: 'kim loại', face: 'cao su' } },
  { message: 'thuế VAT bao nhiêu?', want: { body: 'kim loại', face: 'cao su' }, noCall: true },
  { message: 'giờ tra máy in laser', want: {}, newItem: true },
  { message: 'cái này có phải 9611 không', want: {}, question: true },
];
const focused = process.argv.includes('--ambiguous');
const printer = process.argv.includes('--printer');
const samples = focused ? [allSamples[1]] : printer ? [allSamples[5], allSamples[6]] : allSamples;
let query = focused ? 'con dấu' : '',
  core: string | undefined = focused ? 'con dấu' : undefined,
  facts: Record<string, string> = {},
  history: { role: string; content: string }[] = [];
const calls: { elapsed_ms: number; ok: boolean; reason?: string; data?: unknown }[] = [];
const results = [];
for (const [index, sample] of samples.entries()) {
  const before = query;
  const rule = resolveTurn(sample.message, query);
  const newItem = rule.newProduct;
  if (newItem) {
    facts = {};
    history = [];
    core = undefined;
  }
  if (rule.query !== query) core = undefined;
  query = rule.query;
  const patch = extractFacts(sample.message, facts);
  for (const [k, v] of Object.entries(patch)) {
    if (v) facts[k] = v;
    else delete facts[k];
  }
  const previousCalls = calls.length,
    start = Date.now();
  const out = await answerChat(
    snapshot,
    {
      message: sample.message,
      query,
      core_query: core,
      facts,
      history,
      filters: {},
      use_ai: true,
      product_id: `sample-${newItem ? index : 0}`,
      revision: index + 1,
      previous_query: newItem ? '' : before,
      client_new: newItem || index === 0,
    },
    {
      model: async (input) => {
        const t = Date.now(),
          result = await provider.request(input);
        calls.push({
          elapsed_ms: Date.now() - t,
          ok: result.ok,
          ...(result.ok ? { data: result.data } : {}),
          ...(!result.ok ? { reason: result.reason } : {}),
        });
        return result;
      },
    },
  );
  if (out.profile_update) {
    facts = out.profile_update.facts;
    core = out.profile_update.core_query;
    if (out.profile_update.new_product) {
      query = out.profile_update.query || core;
      history = [];
    }
  }
  const factChecks = Object.entries(sample.want).every(([k, v]) => facts[k] === v);
  const retrievalOK =
    !(sample.newItem || sample.question) || out.candidate_codes.some((c) => c.startsWith('8443'));
  const noLeak =
    (!sample.newItem || !['body', 'face', 'material_unknown'].some((k) => k in facts)) &&
    (index !== 1 || facts.body === undefined);
  const used = calls.length - previousCalls;
  const result = {
    message: sample.message,
    core_query: core,
    query,
    facts: { ...facts },
    elapsed_ms: Date.now() - start,
    calls: used,
    mode: out.mode,
    interpretation: out.interpretation_mode,
    candidate_codes: out.candidate_codes,
    pass: factChecks && noLeak && retrievalOK && (!sample.noCall || used === 0),
    references: out.references.map((r) => r.code),
    reply: out.content,
    notice: out.notice,
  };
  results.push(result);
  console.log(
    JSON.stringify({
      sample: index + 1,
      pass: result.pass,
      facts: result.facts,
      calls: used,
      elapsed_ms: result.elapsed_ms,
      mode: result.mode,
    }),
  );
  history = [
    ...history,
    { role: 'user', content: sample.message },
    { role: 'assistant', content: out.content },
  ].slice(-6);
}
const latencies = calls.map((x) => x.elapsed_ms).sort((a, b) => a - b);
const report = {
  date: new Date().toISOString(),
  model: config.model,
  snapshot: snapshot.version,
  synthetic_only: true,
  results,
  calls,
  summary: {
    passed: results.filter((x) => x.pass).length,
    total: results.length,
    valid_json_calls: calls.filter((x) => x.ok).length,
    total_calls: calls.length,
    p50_model_ms: latencies[Math.floor(latencies.length * 0.5)],
    p95_model_ms: latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))],
    calls_per_turn: calls.length / results.length,
  },
};
await mkdir('.cache/eval', { recursive: true });
await writeFile(
  focused
    ? '.cache/eval/openrouter-ambiguous.json'
    : printer
      ? '.cache/eval/openrouter-printer.json'
      : '.cache/eval/openrouter-live.json',
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report.summary));
if (report.summary.passed !== report.summary.total) process.exitCode = 1;
