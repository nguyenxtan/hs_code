# OpenRouter conversation QA — 04/11/2026

## Scope and configuration

Implementation branch: feat/openrouter-conversation, starting main72b544e. Owner explicitly authorized use of the existing server-local OpenRouter key and implementation. Key checked via GET /key without printing it; valid, upstream free tier1000/day at start. Real key and local enable flag remain in ignored .env.local. Fixed model nvidia/nemotron-3.5-super-vl:free only; first strict-JSON connectivity probe returned cost0. No paid routing/account changes. Subsequent transport validates response model and refuses nonzero reported cost.

Tests and live checks are separate. Browser suite runs its own3131 server with HS_CHAT_ENABLED=false and a fixture verifies actual remote-off status before every case. Live evaluator imports the real service with synthetic public product descriptions and a hard15-call budget per invocation; no saved user conversations or Safari data used. Targeted reruns/UI checks extended the initial proposed single15-call sample, because live model defects needed investigation. This is a small smoke evaluation, not an HS classification accuracy benchmark.

## Functional changes verified

- Key alone does not activate AI; explicit local enable required. One guarded provider path replaces the old unbounded compatible adapter.
- Fixed free allowlist, no model list/fallback, zero-price routing preference, response model/cost postcheck, cached upstream quota, local UTC budget200/day, rate15/min, timeouts and breakers. No automatic inference retries.
- JSON/schema is not treated as semantic proof. Fact operations require current-message evidence; negation, questions, unknown parts, field identity, unsupported values and meta-instruction words are checked. Ref indices/quotes resolve against source rows; codes are server-rendered.
- App retains its session state. Every profile mutation increments revision; model patches only apply to their matching product/revision. Undo remains one logical turn when the rule/model updates coalesce. A missed new-product turn is moved into an independent profile, preserving earlier history/facts.
- Full latest description remains visible in lookup/chat; short core_query plus named facts drive retrieval. Facts rank rather than filter. Current vector phase still only reranks lexical candidates; there is no new cross-encoder or claim of unrestricted semantic recall.
- AI/local-only choice is visible before first submission and in chat, persisted locally. External processing/logging notice is visible. Model-only clarification is concise and needs no invented citation; repeated questions about known fields are suppressed.

## Failures found in real inference and corrections

1. Model omitted ambiguous material despite valid JSON. Explicit generic material extraction now preserves the declaration without assigning body/face; prompt and contract distinguish user intent from response type.
2. Model asked about an undeclared material and repeated an operation question after 'bằng tay'. Operation questions are normalized to a neutral source-oriented question, and questions for already-known fields are removed. This is a guard for observed cases, not a general semantic verifier.
3. 'máy in laser' returned material/laser matches instead of printer candidates. Technology is treated as a soft note; attributes declared as soft facts are removed from a trailing core_query position where a substantive product phrase remains.
4. Model emitted notes='giờ tra', overwriting notes='laser'. Instruction-only notes are rejected; the recorded JSON is replayed in a regression.
5. Confirmation questions and unaccented negation initially passed as positive facts; added failing fixtures then fixed evidence/clause checks. Negating a different value must not clear the current fact.

## Latest bounded live replay

Last full seven-step run after the controller corrections: **7/7 checks passed**, **6/6 provider calls returned usable JSON**, six calls across seven user messages. Observed model-call p50=1795ms, p95=2029ms in this tiny sample; not a performance guarantee. Other targeted printer rerun used two calls for one turn, demonstrating conditional1–2-call behavior.

| User turn | Checked state/result |
|---|---|
| con dấu | Product query retained; no invented body/face. |
| con dấu kim loại | material_unknown=kim loại; no invented body; core query con dấu. |
| vỏ nhựa, mặt cao su | Named body/face fields stored correctly. |
| à không, vỏ kim loại | Body overrides plastic; face preserved. |
| thuế VAT bao nhiêu? | Zero remote calls; no applied VAT rate. |
| giờ tra máy in laser | Old body/face facts absent; current laser note allowed; core máy in; printer-group candidates retained. |
| cái này có phải9611 không | Current product retained; no fact mutation from the code question. |

Local ignored reports contain synthetic model outputs for debugging: .cache/eval/openrouter-live.json, openrouter-printer.json, openrouter-ambiguous.json. Failed earlier runs are described above rather than hidden behind the last green run.

## Headed UI walkthrough

Chromium desktop1440x960, mobile emulation390x844 with touch; not actual Safari or physical phone keyboard. Separate browser contexts with synthetic localStorage only.

- Primary home composer exposed AI/local choice before sending.
- con dấu -> con dấu kim loại: query/header updated; core_query con dấu, material_unknown persisted; desktop panel x1038,y83,width370,height850 before and after.
- Declared operation/body/face persisted; manual body edit then Undo restored plastic.
- Mobile restored the same synthetic session at the latest reply (distance to bottom approximately0), composer y693.5,height90 within844px viewport; no observed JS errors.
- Disabled AI locally and asked VAT: extractive response, known source references, no rate asserted.
- Post-normalization desktop correction did not repeat the already-known operation question. A subsequent synthetic HTTP trace confirmed obsolete unknown-material field removal in the server patch.

Screenshots ignored locally: .cache/openrouter-desktop.png, openrouter-mobile.png, openrouter-desktop-final.png.

## Verification at code-review checkpoint

92 unit +6 preparation/data +41 browser =139 checks passed. Final production build, serial typecheck, formatting and diff checks passed after the controller corrections. Browser41/41 passed with remote disabled. Final Claude code review and integration remain pending. One concurrently run typecheck/build briefly lost generated .next/types files; serial rerun passed. Keep those commands sequential.

## Limits

Free model can still misunderstand, omit information, ask poor questions or return unsupported content. Current guards reject known failure classes; they do not prove arbitrary claims true. Parent descriptions/legal sources remain incomplete, VAT stays separate from raw source strings, and retrieval needs a larger independent gold set before claiming improved recall/precision across sectors. Local budget is per process, not a distributed production limiter; upstream quota is authoritative.


## Post-review release verification

Claude found no Critical defect in dcabdfd, and four Important issues were reproduced then fixed: body/face evidence pairing, removal-command accent collision, citations5–10 after reload, and declared facts in questions. Clarification now keeps a compact source/candidate footer. Extra guards cover short confirmation questions, irrelevant key order changes, legacy custom facts and stale core-query result rows.

Latest release checks: **106 unit +6 data +43 browser=155 passing**. Production build, sequential typecheck, Prettier and git diff checks passed. Separate browser server remained remote-disabled throughout. Full latest synthetic live replay passed7/7,7/7 usable JSON calls (one turn used two; VAT used zero); observed model-call p50=1518ms,p95=2184ms, calls/turn1.0 in this sample. This supersedes earlier checkpoint counts without erasing the documented failures.

Headed desktop/mobile source test: one reference retained before/after reload, source detail opened on both viewports, mobile composer y693.5,height90; no overflow or observed JS errors. First driver attempt pressed Escape before the async source load completed; rerun waited for actual dialog visibility before closing and restoring the assistant. This was a driver-ordering correction, not a claimed app fix. High citation10 reload/source opening is separately covered by browser regression. Final ignored screenshots: .cache/openrouter-reviewed-desktop.png, .cache/openrouter-reviewed-mobile.png.
