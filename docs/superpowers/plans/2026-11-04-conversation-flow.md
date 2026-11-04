# Coherent lookup and conversation flow

> Execute inline using superpowers:executing-plans; user has delegated implementation and testing without further design gates.

Goal: latest product descriptions control retrieval, old product sessions stay separate, and the assistant stays in view.

Architecture: keep existing local product sessions and responsive panel. Add a small deterministic turn resolver, synchronize lookup-to-chat handoff, and make home input modes mutually exclusive. RAG remains the default entry. No new dependencies or provider changes.

## Findings / design
- Reproduced in headed Chromium: `tìm con dấu kim loại` posts query `con dấu`; clearing lookup changes to landing and panel y=677, height=850 at 1440x960.
- Current code always prefers nonempty saved query; openHelp only seeds an empty profile; landing/workbench depends only on search filters.
- Choose explicit home modes over two simultaneous inputs. Keep separate lookup and conversation controls inside the working view, where their purposes are visible.
- Keep chat layout active while panel is open even if lookup is cleared. Do not reopen saved sessions automatically on mobile.
- Explicit lookup / restated product updates query. Attribute-only answers and questions retain the product query. An explicit unrelated lookup gets a separate profile. Ambiguous material must not be assigned to body/face.

## Tasks
- [x] Add failing real UI tests: single home input; latest query request; stable panel after clear; lookup handoff preserves old session.
- [x] Add and exercise pure turn-resolution cases for restatement, questions, fact corrections, explicit new products, and code discussions.
- [x] Implement resolver, context handoff and mutually exclusive entry modes in existing workspace/CSS. Preserve focus, IME, filters, comparison, code discussion and local history.
- [x] Update direct-lookup tests to select their mode explicitly; update obsolete expectation that help opens unrelated saved session.
- [x] Build and run unit/data/type/e2e checks, then use headed desktop/mobile to replay the reported sequence, session switch, reload, filters and code handoff.
- [x] Fresh read-only branch review, resolve material findings, document evidence, integrate and keep local app available.

Review focus: lookup edited while chat open, explicit product switch, empty lookup with open chat, mobile dialog focus/scroll, code-focused follow-up questions.

Ruling: use a dedicated feature branch in the existing dedicated checkout, preserving ignored DB/model/data files and the user's Safari storage.

## Review / execution ledger
- Initial three UI regressions failed on main, then passed after first implementation. Full suite: 43 unit + 6 data + 36 browser cases passed before follow-up findings.
- Headed UI exposed material-only contamination (con dấu kim loại yielded 688 items including radioactive isotopes). Ruling: tighten lexical fallback to the longest leading product phrase when no complete query match exists; preserve chapter/dataset scope and attribute ranking semantics. Add source-shaped unit fixture and real API/UI regression.
- Read-only reviewer found contained-but-different product names, stale explicit facts on handoff, unpunctuated tax questions, hidden focus in catalog mode. Added failing regressions; apply one focused correction pass and rerun checks.

- Final verification: 49 unit + 6 data + 38 browser; typecheck/build/format/diff checks pass. Headed desktop/mobile replay confirms latest query, one relevant source in the stamp case, stable panel and retained independent sessions. Generic-prefix recall regression also passes. See docs/qa/2026-11-04-conversation-flow.md.
