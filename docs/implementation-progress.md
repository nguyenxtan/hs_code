# Implementation progress — 2026-11-03 HS Code MVP

Plan: docs/superpowers/plans/2026-11-03-hs-code-mvp.md

- Owner delegated execution A–Z after reviews; normal decisions proceed without repeated approval.
- All three advisory reviews (cleaning, VAT, UX) received. Claude has not implemented code.
- Ruling: use feature branch in the dedicated requested hs_code checkout rather than another physical worktree; preserve raw path and reviewer files. Cost: branch isolation only, not a separate working directory.
- Workbook inspected read-only: HS_2022 11,414 records; CH98_BoSung 457 records, README source notes and upstream blob SHA. No additional parent hierarchy in statistics sheet.
- Runtime available: Node 22.23.4 and Docker. No OPENAI_API_KEY or configured model endpoint in environment.
- Ruling: no API key extraction or Codex quota workaround; optional local embeddings and ordinary configured API adapters. ChatGPT API credits are separate benefits requiring activation/eligibility.
- Task 1: complete. Python tests 4/4; JSON/CSV/XLSX reconcile; 11,871 accepted, 0 quarantine; 531 derived description changes; repeated runs byte-identical; original main rows preserved. See docs/data-audit.md.
- Task 2: complete. PostgreSQL import idempotent with 11,871 active records; 11,871 local multilingual-e5-small vectors (384 dimensions), matching snapshot, no API calls; lexical and hybrid sample checks passed. Backup restored into a separate database and active count matched.
- Task 3: complete. Search-first UI; filters/help hidden until requested; mobile checked; profile corrections, undo, supplementary facts, persistence, comparison/sharing and API input checks covered by 4 browser tests.
- Task 4: implementation and independent review complete. Claude reviewed commit `197628e`; coordinator fixed all critical/important findings and high-impact minor findings. Latest Python 6/6, TypeScript unit 29/29, browser 10/10, typecheck and production build passed. Review response records the fixes and remaining source-curation/public-production limits. Integration into main follows the checked release commit.

## Additional rulings

- Ruling: 12 utility mappings stay proposed and rank only; explicit chapter/dataset filters can exclude rows. Cost: utility groups do not yet give authoritative category filtering.
- Ruling: keep missing hierarchy visible as incomplete instead of fabricating names. Cost: some “Loại khác” rows still need external context.
- Ruling: default assistant is extractive; compatible LLM generation is configuration-only until an ordinary API key/local endpoint is provided. Cost: unconfigured demo does not provide general LLM dialogue.
- User asked for simpler UI: replaced persistent navigation/chat with search-first view, optional filters, optional help and clearer result cards.
- Root-cause regressions fixed: malformed Origin and JSON null returned 500; short “in” matched inside English words; partial keywords overwhelmed full matches. Tests observed failing before the fixes.
- Local embeddings completed and verified; timing samples are smoke checks, not retrieval accuracy benchmarks. No paid AI usage was made.
- Public application hosting remains outside this local release; deployment requires auth/budget controls and source curation documented in runbook.

- Final local verification before independent review: Python 4/4, TypeScript unit 16/16, browser 4/4; clean-generated typecheck and production build passed. Screenshots reviewed at desktop 1280px and mobile 390px. Supplementary product notes persist; conversation requests include only the active product's last six bounded messages and current facts.

## Final review corrections and verification

- See `docs/consultations/implementation-review-response.md`; Claude remained advisory and did not implement. No claim that Claude re-reviewed coordinator fixes.
- Retrieval abstains without lexical/fuzzy candidates, preserves phrase/lexical priority, and honors explicit chat filters. Added regression for the longer “con dấu bằng tay” query so generic “đầu … bằng tay” goods do not outrank the intended product.
- Browser-origin integration regression found NextURL canonicalizes 127.0.0.1 to localhost. Origin checks now compare the real HTTP Host; same-browser requests work and unrelated hosts remain rejected. Browser tests open an actual conversation reference, not just profile fields.
- References persist only code/version; historic records resolve separately. Session corrections/undo/storage failures and share-version warnings have regression coverage.
- Snapshot identity includes derived content and only pinned source files; conflicting same-version imports are rejected before active data changes.
- Full release verification: 29 TypeScript tests, 6 Python tests, 10 browser tests; type generation/typecheck and production build passed. Desktop/mobile screenshots inspected.
- Local runtime artifacts remain ignored: 4 raw source files, prepared snapshot, 11,871 complete local 384-dimensional vectors, model cache, credentials and database backups.
