# Filter refinement implementation plan

> Execute inline. Owner delegated routine UX decisions and requested a simpler filter; continue without another approval round.

**Goal:** Make scope, selected filters and optional result priorities readable on desktop/mobile.

**Design:** Replace scattered controls with one bordered panel, two visibly labelled scope controls and a separate collapsed priority section. Native selects retain keyboard/mobile support. Active removable chips remain visible when the panel closes; reset clears both scope and priority. Chapter options show matching counts, omit unavailable chapters and retain a selected zero-result chapter so it can be removed. Switching datasets removes incompatible chapter selection; chapter 98 has one fixed chapter. Search text and product facts remain unchanged.

**Alternatives:** A permanent sidebar consumes the current search layout; a custom multi-select popover adds keyboard/focus complexity. Use the compact inline panel with native controls, a coordinator decision within delegated scope.

**Files:** `src/components/search-filters.tsx` owns controlled filters and disclosure; `workspace.tsx` connects current search state; `globals.css` replaces obsolete filter/utility styles; `tests/e2e/filters.spec.ts` covers scope transitions, reset and mobile.

- [x] Reproduce incompatible dataset/chapter state and excessive irrelevant chapter options with browser regression tests.
- [x] Implement the panel and scope transitions; remove obsolete filter CSS instead of another override layer.
- [x] Check desktop/mobile visually, full browser/unit suite, typecheck and production build.
- [x] Commit/push, restart the local app and report actual results.

## Verification and review

- Observed RED: chapter 01 + switching to chapter98 returned no results; after fix the same browser test returns chapter98 rows.
- Static independent reviewer found no Critical/Important findings. Two minor accessibility findings were addressed: count description for screen readers, and focus preservation during refresh. Focus loss was reproduced RED before removing transient disabling; GREEN browser check keeps focus through refresh.
- Final verification: 29 unit tests, 14 browser flows, typecheck and production build passed. Desktop 1280px and mobile 390px screenshots inspected. No source data, embedding pipeline, retrieval ranking or LLM configuration changed.
- Ruling: keep chapter control enabled during refresh to retain keyboard focus; display loading in its helper and retain any selected zero-result chapter. Native controls and collapsible priority section preserve keyboard/mobile behavior.
