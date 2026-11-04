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

Pending: Claude will inspect the complete branch, including contract/service/client, test isolation and latest real-model findings. This document does not claim that final review has passed.
