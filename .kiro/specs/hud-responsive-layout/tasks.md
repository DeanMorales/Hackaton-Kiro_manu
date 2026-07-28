# Implementation Plan: HUD Responsive Layout

## Overview

Add a single new `.hud-pill{font-size:12px; padding:5px 8px;}` rule inside the existing `@media (max-width:520px)` block in `index.html` (the same block that holds the `combat-cards-mobile-layout` `.card` fix), so the 4 HUD_Pill elements (`#bestScoreValue`, `#floorNum`, `#doorIn` pills, and `#settingsBtn`) shrink enough to fit in a single row on mobile. `#hud` (`display:flex; justify-content:center; gap:10px; flex-wrap:wrap; padding:0 10px;`) is left untouched, and no `.js` file is modified. Verification combines jsdom DOM/unit tests (following the `screens.audioSettings.test.js` pattern) with static text/regex checks against `index.html`, plus a manual QA note for real-viewport visual confirmation (jsdom cannot compute layout).

design.md explicitly justifies that this is a CSS-only change with no pure functions/data transforms to formulate universal properties over, so no Correctness Properties section exists and no property-based test sub-tasks are included — only unit/DOM tests and static assertions.

## Tasks

- [x] 1. Add the mobile `.hud-pill` CSS rule in `index.html`
  - [x] 1.1 Add the reduced `.hud-pill` rule inside the existing `@media (max-width:520px)` block
    - In `index.html`, inside the existing `@media (max-width:520px){...}` block (the same block containing the `combat-cards-mobile-layout` `.card` fix), add the exact rule from design.md's Components and Interfaces section: `.hud-pill{ font-size: 12px; padding: 5px 8px; }`
    - Do not modify `#hud` (`display:flex; justify-content:center; gap:10px; pointer-events:none; z-index:25; flex-wrap:wrap; padding:0 10px;`), anywhere in the file
    - Do not modify the desktop `.hud-pill{...padding:7px 16px; ...font-size:14px;...}` rule outside the media query, nor `.hud-pill span{color:var(--ink);}`
    - Do not add any new selector for `#settingsBtn`, and do not modify its tag, attributes, or classes
    - Do not modify any `.js` file
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add DOM/unit tests for HUD interaction and content integrity
  - [x]* 3.1 Write DOM test: `#settingsBtn` remains interactive after the style change
    - Create `src/ui/screens.hudLayout.test.js` following the `buildDom`/`bindAudioSettingsHandlers` pattern of `screens.audioSettings.test.js` (replicate the `#hud` markup with `#settingsBtn` and the three `.hud-pill` value spans)
    - Call `bindAudioSettingsHandlers`, dispatch a `click` event on `#settingsBtn`, and assert `onToggleSettings` is invoked exactly once — this confirms the click binding is by `id` and does not depend on any `.hud-pill` `font-size`/`padding` value (jsdom does not apply the `@media` rule, but the test proves the binding is style-independent)
    - _Requirements: 4.2, 4.4_

  - [x]* 3.2 Write DOM test: HUD_Value_Span IDs and content intact, including a multi-digit score
    - In `src/ui/screens.hudLayout.test.js`, build the HUD DOM with `#bestScoreValue`, `#floorNum`, `#doorIn` set to concrete values, including a multi-digit case (e.g. `#bestScoreValue` = `"123456"`)
    - Assert all three IDs are present via `document.getElementById(...)` and that `textContent` for each matches the exact value with no truncation (e.g. `"123456"` stays `"123456"`, not shortened)
    - _Requirements: 4.1, 4.3_

- [x] 4. Add static CSS verification tests
  - [x]* 4.1 Write static test: reduced `.hud-pill` rule present inside the mobile breakpoint
    - In a new file `src/ui/hudLayout.css.test.js`, read `index.html` as text via `readFileSync` (same pattern as the `INDEX_HTML` constant in `screens.modal.open.test.js`/`combat-cards-mobile-layout`'s CSS test)
    - Use a regex to assert that, within the `@media (max-width:520px){...}` block, a `.hud-pill` rule exists with a numeric `font-size` value that is `>= 11` and `<= 14`, and a `padding` whose vertical and horizontal components are both `> 0`
    - _Requirements: 1.1, 2.1, 2.3_

  - [x]* 4.2 Write static test: desktop `.hud-pill` rule remains intact
    - In `src/ui/hudLayout.css.test.js`, assert via regex that the `.hud-pill{...}` rule outside any `@media` still literally contains `font-size:14px` and `padding:7px 16px`
    - _Requirements: 3.1_

  - [x]* 4.3 Write static test: `#hud` rule unchanged
    - In `src/ui/hudLayout.css.test.js`, assert via regex that the `#hud{...}` block outside `@media` still literally contains `display:flex`, `justify-content:center`, `gap:10px`, `pointer-events:none`, `flex-wrap:wrap`, and `padding:0 10px`, and that none of these properties are overridden inside `@media (max-width:520px)`
    - _Requirements: 1.4, 3.2_

  - [x]* 4.4 Write static test: `#settingsBtn` remains a `<button>` with `pointer-events:auto`
    - In `src/ui/hudLayout.css.test.js`, assert via regex/text search on `index.html` that `#settingsBtn` is declared as a `<button>` element and that its inline `style` attribute contains `pointer-events:auto`
    - _Requirements: 4.4_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Manual QA note (informational, not automatable)
  - Document that a manual visual verification is required before considering this feature fully validated: confirm the 4 HUD_Pill elements render in a single row, with no overflow and legible text, at a minimum of 3 viewport widths within Mobile_Breakpoint: 320px, 375px, and 520px
  - jsdom does not compute real layout (`getBoundingClientRect()` returns zeros unless mocked), so this cannot be covered by automated tests; this task is informational only and requires no code changes
  - _Requirements: 1.2, 1.3_

## Notes

- No property-based tests are included: design.md explicitly justifies this as a CSS-only change with no pure functions or data transformations to formulate universal properties over.
- Tasks marked with `*` (3.1-3.2, 4.1-4.4) are optional test tasks and can be skipped for a faster MVP, though they are the only automated coverage for this change.
- Task 6 is informational/manual QA only, cannot be automated, and involves no code changes — included per design.md's "Fuera de alcance de los tests automatizados" section.
- `#hud`, `#settingsBtn`, and all `.js` files are never modified; only the `.hud-pill` rule inside `@media (max-width:520px)` in `index.html` changes.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["3.1", "3.2", "4.1", "4.2", "4.3", "4.4"] }
  ]
}
```
