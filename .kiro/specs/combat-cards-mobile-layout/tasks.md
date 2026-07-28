# Implementation Plan: Combat Cards Mobile Layout

## Overview

Convert the fixed `.card{width:118px; height:168px;}` rule inside the existing `@media (max-width:520px)` block in `index.html` into a Flexbox-relative rule (`flex`/`max-width: calc((100% - 3*14px)/4)` + `aspect-ratio:118/168`) so that at most 4 cards fit per row on mobile, letting `flex-wrap:wrap` (already on `#cardsRow`) push the 5th+ card to a second row with no JavaScript changes. Verification combines jsdom DOM/unit tests (following the `screens.modal.open.test.js` pattern) with static text/regex checks against `index.html`, plus a manual QA note for real-viewport visual confirmation (jsdom cannot compute layout).

No Correctness Properties section exists in the design (explicitly justified as CSS-only, no pure functions/data transforms to formulate universal properties over), so no property-based test sub-tasks are included — only unit/DOM tests and static assertions.

## Tasks

- [x] 1. Update the mobile `.card` CSS rule in `index.html`
  - [x] 1.1 Replace the fixed-size `.card` rule inside `@media (max-width:520px)`
    - In `index.html`, replace `.card{width:118px; height:168px;}` (inside the existing `@media (max-width:520px)` block) with the rule from design.md's Components and Interfaces section: `flex: 0 1 calc((100% - 3 * 14px) / 4); max-width: calc((100% - 3 * 14px) / 4); width: auto; aspect-ratio: 118 / 168; height: auto;`
    - Do not modify `#cardsRow`/`.cards-row` rules (`display:flex; flex-wrap:wrap; gap:14px; justify-content:center;`), anywhere in the file
    - Do not modify the desktop `.card{width:150px; height:190px; ...}` rule outside the media query
    - Do not modify `src/ui/screens.js`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 3.1, 3.2_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add DOM/unit tests for card rendering and interaction under the new layout
  - [x]* 3.1 Write DOM test: `renderCards` produces no wrappers for varying Card_Count
    - Create `src/ui/screens.cardLayout.test.js` following the pattern of `screens.modal.open.test.js` (build DOM via `document.body.innerHTML`, import from `./screens.js`)
    - For Card_Count in {1, 4, 5, 6, 7}, call `renderCards` with that many synthetic cards and assert every child of `#cardsRow` is a `.card` element with the same `parentElement` (no intermediate container nodes)
    - _Requirements: 3.1, 1.1, 1.2, 1.3, 1.4, 2.1, 2.2_

  - [x]* 3.2 Write DOM test: order and `dataset.idx` preserved for Card_Count > 4
    - In `src/ui/screens.cardLayout.test.js`, for Card_Count = 5, 6, and 7, assert that `dataset.idx` of `#cardsRow`'s children, in DOM order, is `"0","1","2",...` strictly increasing and matches the index of the original `cards` array
    - _Requirements: 1.5, 4.4_

  - [x]* 3.3 Write DOM test: Card_Click_Handler works for indices >= 4
    - In `src/ui/screens.cardLayout.test.js`, render 6 or 7 cards, simulate `click` on cards at indices 0, 4, and 6, and assert `onCardClick` is invoked with the correct index each time
    - _Requirements: 4.1_

  - [x]* 3.4 Write DOM test: `dataset.idx` unchanged after opening/closing Modal_Pregunta for a card with index >= 4
    - In `src/ui/screens.cardLayout.test.js`, reuse the `buildDom`/`openQuestionModal`/`closeQuestionModal` pattern from `screens.modal.open.test.js`: render 6 cards, open the modal for the card at index 5, capture `dataset.idx` order before and after open+close, and assert it is unchanged
    - _Requirements: 4.2_

- [x] 4. Add static CSS verification tests
  - [x]* 4.1 Write static test: new mobile 4-per-row rule is present
    - In a new file `src/ui/cardLayout.css.test.js` (or appended to `screens.cardLayout.test.js`), read `index.html` as text via `readFileSync` (same pattern as `INDEX_HTML` in `screens.modal.open.test.js`) and use a regex to assert that, within the `@media (max-width:520px)` block, the `.card` rule declares `max-width: calc((100% - 3 * 14px) / 4)` (or the equivalent chosen value) and `aspect-ratio: 118 / 168`
    - Also assert via regex that the `.cards-row`/`#cardsRow` rule (outside any `@media`) still literally contains `display:flex`, `flex-wrap:wrap`, `gap:14px`, and `justify-content:center`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.2_

  - [x]* 4.2 Write static test: desktop `.card` rule remains intact
    - In the same test file, assert via regex that the `.card{width:150px; height:190px; ...}` rule outside `@media (max-width:520px)` is unchanged
    - _Requirements: 3.1_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Manual QA note (informational, not automatable)
  - Document that a manual visual verification is required before considering this feature fully validated: confirm exactly 2 rows with no horizontal scroll at Card_Count = 5 and 7, at a minimum of 2 viewport widths within Mobile_Breakpoint (e.g. 360px and 520px)
  - jsdom does not compute real layout (`getBoundingClientRect()` returns zeros unless mocked), so this cannot be covered by automated tests; this task is informational only and requires no code changes
  - _Requirements: 1.6_

## Notes

- No property-based tests are included: design.md explicitly justifies that this is a CSS-only structural change with no pure functions or data transformations to formulate universal properties over.
- Tasks marked with `*` (3.1-3.4, 4.1-4.2) are optional test tasks and can be skipped for a faster MVP, though they are strongly recommended given they are the only automated coverage for this change.
- Task 6 is informational/manual QA only, cannot be automated, and involves no code changes — included per design.md's "Fuera de alcance de los tests automatizados" section.
- `renderCards` and `#cardsRow`/`.cards-row` are never modified; only the `.card` rule inside `@media (max-width:520px)` in `index.html` changes.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3", "3.4", "4.1", "4.2"] }
  ]
}
```
