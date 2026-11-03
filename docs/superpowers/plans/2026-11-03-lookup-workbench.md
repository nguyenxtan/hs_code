# Lookup workbench refactor

Owner requested full UI/UX refactor with Claude advisory only. Design source: docs/consultations/claude-filter-ux-review.md, Parts I–II. Routine implementation decisions remain delegated; implement inline.

## Design and constraints

Minimal landing; one persistent search input becomes sticky in results state without remount/IME loss. Dense results rows, visible chapter chips with a searchable chapter picker; rank-only lenses live in a separate “Xếp trước” picker. Remove redundant dataset UI, keep API dataset all and chapter98 explicit. Native dialog pickers use desktop compact modal/mobile bottom sheet rather than custom anchored popovers (coordinator choice for reliable focus/keyboard behavior). Assistant is a nonmodal desktop panel >=1280 and modal drawer/sheet below, preserving scroll and product state. Initial empty product can inherit current query; existing product facts never overwritten by a different search. Details gain compare/previous/next. No changes to raw data, embeddings, search scoring, LLM configuration or session retention.

## Implementation

- [x] Write behavioral browser checks for result density/IME, chapter toggles/search/empty scope, priority count invariance, assistant context+mobile focus/scroll and details navigation/compare. Observe new tests fail before implementation.
- [x] Extract shared dialog and responsive assistant shell; replace filters; reorganize workspace and simplify profile controls. Rewrite cascading legacy CSS into one responsive system.
- [x] Run unit/type/build/browser verification; inspect landing/results/assistant screenshots on desktop/mobile; fix observed failures.
- [x] Review final changes, commit/push and leave local production server available.

## Acceptance

1440x960: first result <=200px and >=5 full rows for “máy in”; 390x844: first result <=260px, >=2 full rows and no horizontal overflow. Search input retains focus/value through state transitions and stays in viewport after scroll. Chapter98 accessible from picker; selected zero-result chapter removable without clearing query or priority. All dialogs trap modal focus, support Escape and restore opener. Assistant opens from current empty profile and preserves per-product history/undo/export/delete. Citation/VAT wording, compare/share/privacy retained. Text >=12px and mobile editable inputs >=16px.

## Verification and review outcome

- Claude inspected screenshots/current source and supplied the design recommendation, with explicitly no live browser interaction and no product-code edits. Coordinator implemented; do not treat that advisory as approval of the final code.
- Independent read-only code review found radio arrow navigation closed the ranking picker prematurely and saved conversations would auto-open a blocking modal. Both were reproduced failing before fixes and pass afterward: ranking remains open until “Xong”; saved history is restored with assistant closed.
- Additional review observations addressed: resizing while a detail dialog is open no longer promotes the assistant above it (reproduced RED, then GREEN); a composition-event characterization check preserves the same search element through layout changes. This simulates DOM composition events, not a certification across native OS IMEs.
- Final suite: 29 TypeScript unit, 6 Python data, 21 browser tests; typecheck and production build passed. Includes query/scope, chapter98, priority membership, detail navigation/compare, share privacy, chat corrections/undo/persistence, keyboard/scroll/focus, saved sessions and responsive modal nesting.
- Six screenshots inspected locally: `.cache/workbench-{desktop,mobile}-{home,results,assistant}.png`. After fonts loaded, “máy in” metrics: desktop 1440x960 first result y=198.19px, 8 complete rows; mobile 390x844 y=255.38px, 3 complete rows. Neither overflowed horizontally; visible-text scan found no font smaller than 12px. These are functional/visual checks, not user-study/WCAG certification.
- Ruling: native dialog pickers replace custom anchored popovers; desktop compact modal and mobile bottom sheet. Priority applies on change, closes with explicit “Xong” so radio arrow navigation works. Single-chapter scope replaces redundant dataset form; the API dataset contract remains.
- Deferred: master-detail side pane, curated official hierarchy/names, full per-chapter examples beyond loaded result samples, user study. Existing extractive/optional configured LLM modes and 50-message local history bound remain unchanged.
