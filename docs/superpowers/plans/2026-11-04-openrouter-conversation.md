# OpenRouter conversation implementation plan

> Execute inline with superpowers:executing-plans. User explicitly delegates implementation/testing and requests Claude advisory review only. Preserve existing dedicated checkout and ignored data/model/secrets; branch feat/openrouter-conversation.

**Goal:** Activate the owner's valid OpenRouter key for grounded Vietnamese multi-turn assistance with validated profile updates and reliable local fallback.
**Architecture:** Server owns interpretation and validates schema/state patches. Rules remain deterministic fallback; retrieval remains local. Use a fixed free model with strict output, no paid fallback, limited calls. A first interpretation call is allowed where context is ambiguous; use source extraction/clarification without a second call when sufficient. Grounded explanations can use a second structured call after retrieval. Authoritative profile updates are applied on client only for matching productId/revision.
**Stack:** Existing Next/TS, Vitest, Playwright, local embeddings/data.

## Verified state

- main72b544e baseline49 unit pass; key exists only as OPENROUTER_API_KEY in ignored .env.local. Read-only key check200, free_model_daily_requests limit1000 remaining1000. No model/base URL set so old adapter ignores it.
- One synthetic request to nvidia/nemotron-3.5-super-vl:free returned200, JSON with unknown material part, cost0, latency1499ms. Catalogue reports zero prompt/completion pricing and structured_outputs. Not a quality benchmark.
- Claude prior advisory recommends field-aware facts, bounded structured output, revision guard, no paid fallback, quota breaker, exact-code fast path; true cross-encoder is optional and current cosine/RRF isn't one.

## Constraints

- Never print/commit keys, .env.local, prompts containing user secrets, or raw provider errors. No billing/account changes or paid auto-fallback.
- Only free allowlisted model with provider require_parameters/max_price=0; timeout/no automatic retries, upstream quota check and breaker.
- App owns sessions; no provider memory/opaque state. Preserve historical sessions, undo and explicit code context. Read old stored data with missing revision as0.
- Explicit chapter/dataset/snapshot are hard scope; facts keep field names and are soft evidence; ambiguous material must not become body/face.
- Codes and references are rendered by server from known source rows. Model references indices only. Clarification needs no fake citation. No unsupported tax conclusions.
- AI use visible with local-only option. Exact numeric lookup, browse/filter, greetings and tax fallback do not consume remote calls.
- Test suites deterministic with remote AI disabled; live synthetic evaluation separate and bounded. No browser UI run may consume owner's quota inadvertently.

## Tasks

- [ ] Provider foundation (src/lib/chat-provider.ts, tests/chat-provider.test.ts): env discovery, fixed free model, schema transport, remote quota cache, local call budget/rate cap, timeout, breaker, safe status. Test real transport boundary using controlled HTTP responses; verify failing tests before implementation.
- [ ] Conversation contract (src/lib/chat-contract.ts, src/lib/session.ts/types.ts, tests/chat-contract.test.ts/session.test.ts): bounded intent/set-clear facts/ambiguity JSON and response validator; product revision and guarded apply; historical-storage migration; server-rendered code refs and clarification support. Use literal multi-turn gold cases.
- [ ] Server pipeline (src/lib/chat-service.ts and assistant route): context validated before model, deterministic fast paths, local retrieval from core query + field-aware facts, optional contextual model interpretation then source-grounded reply. If model changes product/query, retrieve again and discard earlier explanations. User facts are proposals, never trusted tax data.
- [ ] Client (workspace.tsx, CSS/status): send prior context and revision; preserve optimistic deterministic behavior without accepting stale model patches; new-product isolation; show provider/fallback/local-only modes without clutter. Keep stable panel, query/filter/compare flows.
- [ ] Field-aware ranking/search contract: keep legacy array compatibility, accept named facts, avoid boosting any random occurrence of material as body/face match. Preserve query count/scope; don't introduce unconditional vector suggestions or cross-encoder without gold evidence.
- [ ] Eval/QA: offline fixtures for con dấu -> kim loại ambiguous -> vỏ nhựa/mặt cao su -> correction, new machine/ink, tax/greetings, nonaccent/typo, code question, stale state, outage/quota/bad JSON. Live synthetic sample bounded <=15 calls initially; record actual results without invented quality targets. Build/type/unit/data/e2e; headed desktop/mobile with isolated storage and explicit remote use.
- [ ] Claude read-only design + final code cross-review; resolve important findings with regressions, update docs/config example, merge/push per delegated workflow, keep local app running. No raw key in artifacts.

## Review focus

Stale responses after user edits/undo/switch; ambiguous or negated facts; parser output changing product after retrieval; model JSON valid but fact unsupported; provider schema/429/empty reasoning response; matching model citations to sources; filters restricting retrieval; budget leaks in tests.

## Ledger

- 2026-11-04: provider/env investigation complete, no production code altered yet. Baseline49/49 unit green. Existing architecture and prototype flow already independently reviewed by Claude. Current user authorizes key use and implementation; no additional permission gate.

## Implementation ledger / review checkpoint

- Provider, contract, session revision/guard, service, API/client, field-aware ranking and remote-disabled browser fixtures implemented. Legacy generation fetch removed. Explicit local enable flag added to owner's ignored file; secret unchanged.
- Provider blocker regressions observed failing then passing: key alone opt-in, model/cost mismatch disables, config error breaker, quota check failure reason. Tests cover concurrent final quota slot and repeated invalid/length output.
- Contract regressions observed failing then passing: ambiguous parts, negation/confirmation questions, unaccented facts, wrong-value clearing, meta-instructions as notes, soft attributes left in core_query, redundant clarification. New-product isolation and stale patches have pure and UI tests.
- Source/quote rendering uses server-owned references; clarification-only output has no invented citations. Deterministic fact extraction refuses confirmation questions; explicit ambiguous material stored without part assumption.
- Quota script live samples exposed real semantic failures despite valid JSON: missing unknown material, excessive keyword specificity for printer laser, meta-instruction 'giờ tra' stored as notes, redundant operation question. Added literal captured-output regressions and controller checks rather than treating schema compliance as accuracy.
- Headed real AI walkthrough: con dấu -> con dấu kim loại updates full display query, core_query con dấu, unknown material. Panel y83 unchanged at1440x960. Declared body/face/operation persist; manual field edit+undo works. Mobile390x844 recovers at latest message, composer in viewport, no JS errors. Local-only toggle and VAT fallback work. First model question assumed metal and later repeated known operation; normalizeClarification now standardizes operation questions and drops questions for known fields; post-fix headed turn verified no repeat. Generic factual correctness still not guaranteed.
- Current unit92/data6 pass; latest completed browser41 passed on separate3131 with remote guard. Build passed before last core-query compaction-only change; typecheck afterwards passed. Final rebuild/browser checks remain after Claude code review. A typecheck/build run concurrently had transient missing .next/types files; rerun serially passed, so keep these checks sequential.
- Ruling: extend bounded synthetic evaluation beyond the original single15-call target after live defects and UI checks; each evaluator invocation still hard-capped15 calls and only fixed free model. No paid fallback; record actual outcomes and don't treat the small sample as a benchmark.

- Final review checkpoint:92 unit +6 data +41 browser=139 passing; current production build/typecheck/format/diff checks pass. Latest full live replay7/7 checks,6/6 usable JSON calls; observed p50=1795ms,p95=2029ms. Local production rebuilt on3100 with explicit free AI enabled; final code review/integration pending.
