# HS Code MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement inline. Claude remains advisory/review-only.

**Goal:** Ship a reproducible data preparation pipeline and a locally running HS lookup/filter/comparison/session retrieval application.

**Architecture:** Next.js/TypeScript with a PostgreSQL backend and an offline Python standard-library pipeline. Search works without AI credentials; local multilingual embedding and an OpenAI-compatible generation adapter are optional upgrades. The default assistant is explicitly extractive, with references to snapshot rows, not a simulated LLM.

**Tech Stack:** Node 22, Next.js 16, React 19, PostgreSQL 17, pgvector, Python 3, Vitest and Playwright.

**Spec:** docs/requirements.md, docs/data-strategy.md, docs/conversation-ux.md, docs/vat-design.md, docs/consultations/review-status.md and claude-ux-review.md.

## Authorization and scope

The owner requested execution A–Z and delegated routine decisions on 2026-11-03 after the review phase. No further design approval is required for this scope. Work stays in the requested dedicated hs_code directory on feature branch feat/hs-code-mvp. Claude only reviews. No paid cloud resources, public application deployment or redistribution of the full source dataset is needed to deliver the local app.

## Global Constraints

- Raw files never overwritten; byte hashes checked, codes stay text.
- Technical normalization is derived; original fields, tax strings, markers, newlines remain intact.
- EN is reference text, not an asserted translation of eight-digit VI.
- Missing parent descriptions remain marked incomplete; no invented legal hierarchy.
- Only explicit user filters exclude rows. Product facts/AI suggestions do not.
- Tax/VAT shown as raw, not applicable rates. No tax-rate filters or automatic VAT outcomes.
- Sessions persist locally on the browser; users can export/delete them, no account or cross-device promise.
- Secrets stay server-side. Never reuse Codex OAuth credentials as an API key.
- Prepared dataset, vectors, backups and browser state stay gitignored. Code MIT, source-derived data retains upstream license/attribution.

## Review Focus

- CSV multiline fields and XLSX strings must preserve leading-zero codes and raw values.
- Empty fields, MT?, SEN and literal versus actual newline must survive preparation.
- No-result search, accent ambiguity, numeric prefixes with punctuation and empty input must remain usable.
- Fact correction, undo, product switching and resumed browser state must not leak attributes between products.
- Unconfigured/unreachable AI and embeddings must leave lexical search usable; no fabricated citations.

### Task 1: Reproducible preparation and audit

Files: scripts/prepare_data.py, tests/test_prepare_data.py, data/processed/* (ignored), docs/data-audit.md.
Consumes raw JSON/CSV/XLSX/SQL and manifest. Produces snapshot.json (records with raw + normalized search fields + provenance), audit.json, transform-diff.json, quarantine.json, reconciliation.json. XLSX HS_2022 must equal JSON; chapter98 extracted separately with source sheet/row.

- [x] Write failing unittest fixtures for Unicode/NBSP/dash handling, exact raw preservation, duplicates, CSV multiline and deterministic serialization.
- [x] Run tests RED, implement pure preparation helpers/CLI, run GREEN.
- [x] Run real preparation twice, compare output hashes and verify raw hashes unchanged.
- [x] Record counts, changes, gaps and extracted chapter98 mapping without legal interpretation; commit code/report only.

### Task 2: PostgreSQL and retrieval

Files: package.json, tsconfig.json, compose.yaml, db/schema.sql, scripts/import.ts, src/lib/{types,db,search,assistant,session}.ts, tests/*.test.ts.
Consumes prepared snapshot. Produces parameterized repository/search and deterministic assistant responses with snapshot row evidence; optional embedding adapter compatible with saved model ID/dimensions.

- [x] Write failing tests for numeric query parsing, accent search, hard versus soft constraints, raw tax preservation in responses and session correction/undo.
- [x] Implement search and assistant domain; run GREEN.
- [x] Create local Docker database with persistent volume; import snapshot idempotently; compare row counts and run integration tests.
- [x] Add optional local embedding generation and verify retrieval on a multilingual sample; retain lexical fallback if absent.

### Task 3: Product UI and APIs

Files: src/app/*, src/components/*, tests/e2e/*.
Consumes repository/search, assistant and browser session reducer. Produces searchable responsive web app with data status, filters, result cards, code details, comparison (2–4), local project/session chat and references.

- [x] Write route/domain and user-flow tests covering search/prefix/filter, compare, fact revision, undo and persistence.
- [x] Implement UI/API with input validation, IME-safe search, keyboard focus, request cancellation, clear raw tax labels and empty/error states.
- [x] Implement local export/delete, explicit sharing preview excluding queries/facts by default; no unreviewed data learning.
- [x] Verify desktop/mobile with browser, fix observed defects, run production build.

### Task 4: Release readiness and independent review

Files: README, .env.example, CONTRIBUTING, docs/runbook.md, .github/workflows/ci.yml.

- [x] Document exact local setup, dataset licensing, source import, modes, backup/restore and limitations.
- [x] Run full test suite, real-data audit, build and end-to-end tests.
- [x] Ask Claude to review code/architecture only; coordinator fixes significant findings with regression tests.
- [x] Commit and push implementation, integrate locally without losing review docs, leave local app accessible and provide concrete results with limitations.

## Decisions for this implementation

- Keep taxonomy labels proposed until reviewed; count/group by real code prefixes immediately. No invented parent names.
- Include chapter98 now that the supplied workbook was inspected; provenance distinguishes it from the 11,414 main codes.
- Store optional private session state in browser localStorage, not a public unauthenticated server session table.
- Local embedding is optional; no subscription credential extraction. API mode needs an ordinary project key and explicit model config.
- A standalone AI-free retrieval assistant is shipped as a useful baseline, visibly distinct from configured LLM generation.
