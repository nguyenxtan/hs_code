# RAG primary entry — owner steering

Latest owner instruction: make RAG the focal point, not a hidden optional feature. This supersedes the earlier search-first landing recommendation in Claude's advisory. Keep the compact lookup workbench and chapter/ranking behavior once searching.

## Implementation

- [x] Primary landing description form and “Tra cùng trợ lý” submit start an actual sourced conversation, with examples and source count. Quick lookup moves below it. Header assistant action is prominent.
- [x] First description launches the existing conversation/retrieval flow. Opening the header assistant on a fresh landing focuses the primary description instead of creating two visible composers. Saved profiles can still be reopened explicitly.
- [x] A fresh landing description creates a separate product when the current profile has data. Existing facts/messages remain in their original profile; 99-profile guard does not overwrite them. Closing chat restores focus to visible search if the launch element is hidden after the layout transition.
- [x] Verify desktop/mobile screenshots, meaningful primary-send and profile-separation regressions, complete browser suite and build; integrate and leave local app running.

## Evidence

The primary-entry test failed before the form existed, then passed after implementation. Latest browser suite: 23/23. Unit suite: 29/29; production build passed. Additional read-only review found no Important/Critical findings in the entry/profile/focus changes. Screenshots `.cache/rag-primary-desktop.png` and `.cache/rag-primary-mobile.png` were viewed; submit button ends at y=454.69/475.38 respectively and is visible in both first viewports; no horizontal overflow.

This changes UI emphasis, not model capability: local embedding/retrieval remains enabled; chat defaults to source extraction until an ordinary LLM model/endpoint is configured. No source data, tax evaluation, paid provider, or session-retention changes.
