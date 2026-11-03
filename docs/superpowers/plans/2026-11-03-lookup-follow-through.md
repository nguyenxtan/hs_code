# Lookup follow-through and recoverable errors

Owner screenshot showed the earlier filter form, “Load failed”, and unrelated references after “chào”; asks what follows filtering. The live current API returned 200 for the same chapter/category scope (395 records), so the exact screenshot network failure was not reproduced. Do not claim its original cause is proven.

## Delivered flow

- [x] Filter -> open code details/source -> compare 2–4 candidates or choose “Hỏi trợ lý về mã này”.
- [x] Code handoff opens/reuses a separate code profile, closes detail/comparison and preserves existing result query/chapter. If no lookup was open, starts lookup at the selected code.
- [x] Persist optional focus_code with profile, revisions and undo. Explicit code discussions retrieve that code from the active snapshot; the UI explains chapter filters still apply to the lookup list. Normal product conversations continue respecting lookup filters. Editing the product query clears code focus.
- [x] Network errors show localized feedback/retry; stale result rows/pagination hidden and unknown count shown as a dash. Retry keeps query/scope and calls the real endpoint again.
- [x] Greeting-only chat asks for a product; primary composer does not launch a search for a greeting. Keep accent-sensitive distinction between “chào” and “chảo”; product queries such as “tra chao” remain valid.

## Verification and review

Independent read-only review found comparison modal blocking handoff, and unrelated chapter incorrectly restricting explicit-code discussion. Both reproduced RED before fixing; comparison now closes and code scope is separately declared/persisted. A separate no-query comparison handoff was then found below the landing header and corrected to start lookup at the code. Final 31 unit tests, typecheck, build and 28 browser tests pass. Browser checks include aborted lookup -> real retry, filtered handoff, comparison handoff and a citation code outside the visible chapter. Session test covers persisted focus, edit/clear and undo. The CSS edit was briefly overwritten with the wrong text, restored from the checked Git baseline plus intended styles, and the final build/suite passed afterward.

No automatic HS conclusion or tax decision added; generation mode remains extractive unless a model endpoint is configured. Actual OS/browser-specific network incidents beyond the reproduced abort case remain outside these checks.
