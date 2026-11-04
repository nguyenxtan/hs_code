# Claude advisory: OpenRouter and RAG pipeline

Claude was asked to advise and review only, not code. All implementation was done by coordinator. Reports arrived through Orca run_11eb4ac84833.

## Completed architecture review — main72b544e

Claude approved a conditional prototype using fixed free models, preserving local fallback and explicit hard scope. Main findings: current embedding stage is lexical-gated cosine/RRF, not an independent cross-encoder; facts lost field identity; old generation validator rejected clarification-only replies; session needed revision guards; provider errors/quota needed dedicated handling. Recommended server-owned reference rendering and measured Vietnamese multi-turn cases. Initial budget recommendation favored one call because assumed free quota50/day; after checking the owner's actual1000/day tier, conditional1–2 calls were accepted.

## Completed provider/plan review — initial feature branch

Required fixes: explicit opt-in so key presence does not consume test quota; separate remote-off browser server; remove old generation fetch to prevent bypass; allowlist free model and verify returned model/reported cost rather than claiming max_price=0 alone is proof. These corrections are implemented and covered by regressions.

Other advice applied: longer config-error breakers, repeated invalid-output breaker, correct quota-unavailable reason, global process singleton, deadline across calls, named fact fields, current-message evidence, unknown-part treatment, and product/revision guards. Model text cites source indices; application renders actual codes. Hard/soft filter semantics and source-data limitations remain documented.

## Coordinator implementation choices

- Fixed nvidia/nemotron-3.5-super-vl:free; server-local key and explicit enable. No paid fallback. Prior public catalogue and a real strict-JSON cost0 probe established connectivity, not Vietnamese/domain accuracy.
- Combined first-turn analysis with candidate context. If parsed core query/facts change, retrieve again and discard earlier explanations. A second explanation call is optional, capped at two calls; exact lookups/browse/tax/greetings use local paths.
- Request revision is the already-optimistic profile revision; server echoes base_revision, client requires equality. This is simpler than sending the earlier revision and comparing +1. Stale patches are discarded and the old reply is labeled; no automatic application of stale suggestions.
- Field-aware rank hints support legacy string arrays. No new semantic-only candidate union or cross-encoder without gold evaluation.
- Real model checks exposed semantic errors despite valid schema. Added recorded-output regressions, conservative ambiguous-material handling, note/core-query normalization and redundant-question checks; limits are explicit in QA.

## Final code review

Claude reviewed dcabdfd and reported no Critical issue, four verified Important defects, and one UX decision. The coordinator reproduced and fixed the defects with regressions:

1. Broad evidence could swap body/face materials. Named-part association now must match the declared value, including clauses without commas.
2. Folding “bộ” to “bo” could activate clear. Explicit removal uses the original accented command, while negation still checks the current value.
3. References5–10 were lost during storage. Persistence now keeps the same ten-reference ceiling as server generation; unit and browser reload/source-open cases cover the highest citation.
4. A question mark discarded all rule facts. Parsing now distinguishes declared clauses from confirmation/uncertainty clauses, preserving “vỏ nhựa, mặt cao su thì mã nào?”.

UX ruling under the owner's delegated scope: clarification remains short but includes a candidate count and source buttons. The question itself does not require a fabricated citation. A real AI/browser replay confirmed sources remain openable after reload.

Additional local fixes: compare fact dictionaries independent of key order to avoid a redundant second call; track search pending state by full request/core/facts/scope while retaining stable chapter controls; display the shorter retrieval query explicitly; migrate legacy custom fields into bounded notes so API validation does not lock a saved session.

No additional Claude re-review of the coordinator fixes is claimed. Targeted regressions were observed failing then passing, followed by full verification:106 unit +6 data +43 browser=155 passing, build/typecheck/format/diff checks passing. Latest synthetic live replay7/7 checked steps,7 usable JSON calls. Details in QA.

Minor items left scoped as limitations: a theoretical same-tick workspaceRef/non-functional state-write window was not reproduced; tested edit/undo/switch/delete flows are guarded by product revision. Filters remain shared explicit UI state across products and show no-result scope notices. Unknown-part material can remain unresolved until clarified/edited. Local opt-in defaults follow the owner's explicit server configuration; per-process budgets and lexical-gated embeddings remain prototype constraints.
