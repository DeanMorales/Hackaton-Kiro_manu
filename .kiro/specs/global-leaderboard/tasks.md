# Implementation Plan: Global Leaderboard System

## Overview

This is an 11-task implementation plan for building a global leaderboard system for the Torre de las Nubes game. The feature captures and persists scores using localStorage in Phase 1, with a prepared abstraction layer for future DynamoDB migration in Phase 2. Tasks follow a critical path from foundation (storage layer) through business logic, UI components, integration, and end-to-end verification.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "name": "Foundation",
      "tasks": ["1.1"],
      "description": "Create abstract storage interface"
    },
    {
      "wave": 2,
      "name": "Business Logic",
      "tasks": ["1.2"],
      "description": "Implement score manager orchestrator"
    },
    {
      "wave": 3,
      "name": "Testing & UI Foundation",
      "tasks": ["1.3", "1.4"],
      "description": "Unit tests for manager and UI module creation"
    },
    {
      "wave": 4,
      "name": "UI Testing & HTML",
      "tasks": ["1.5", "1.6"],
      "description": "UI tests and HTML structure"
    },
    {
      "wave": 5,
      "name": "Styling & Integration",
      "tasks": ["1.7", "1.8"],
      "description": "CSS styling and main.js wiring"
    },
    {
      "wave": 6,
      "name": "Testing & Game Integration",
      "tasks": ["1.9", "1.10"],
      "description": "Integration tests and game over flow"
    },
    {
      "wave": 7,
      "name": "Verification",
      "tasks": ["1.11"],
      "description": "End-to-end testing and verification"
    }
  ]
}
```

## Tasks

### 1.1: Create ScoreStore Interface and LocalStorageScoreStore

**Complexity**: S (Small)  
**Time Estimate**: 2-3 hours  
**Status**: [ ] Not Started

**Description**:
Implement the abstract `ScoreStore` interface and the concrete `LocalStorageScoreStore` class in `src/data/scoreStore.js`. This provides the abstraction layer for storage operations, allowing future migration to DynamoDB without changing game logic.

**Acceptance Criteria**:
- [x] 1. `ScoreStore` class exports with three abstract methods: `load()`, `save()`, `clear()`
- [x] 2. Each method throws `Error('Must be implemented')` if not overridden
- [x] 3. `LocalStorageScoreStore` extends `ScoreStore` and implements all three methods
- [x] 4. `load()` returns a Promise that resolves to array of Score objects (empty array if no data)
- [x] 5. `load()` gracefully handles corrupted JSON (logs warning, returns empty array)
- [x] 6. `load()` validates score objects using `_isValidScore()` helper (checks score is non-negative integer, timestamp is valid ISO 8601)
- [x] 7. `save()` returns a Promise that resolves when data is persisted
- [x] 8. `save()` automatically prunes scores to max 100 if list exceeds limit (keeps highest scores)
- [x] 9. `save()` catches `QuotaExceededError` and logs error without throwing
- [x] 10. `clear()` returns a Promise that removes the localStorage key
- [x] 11. `clear()` catches errors and logs without throwing
- [x] 12. localStorage key is namespaced as `torre-nubes-scores`
- [x] 13. Module exports both `ScoreStore` and `LocalStorageScoreStore` classes

**Dependencies**:
- None (foundational)

**Testing Strategy**:
- Unit tests with mocked localStorage (vitest)
- Verify interface contract (methods exist, return Promises)
- Test error handling (corrupted data, quota exceeded)

---

### 1.2: Implement ScoreManager (Business Logic Orchestrator)

**Complexity**: M (Medium)  
**Time Estimate**: 3-4 hours  
**Status**: [ ] Not Started

**Description**:
Implement `ScoreManager` class in `src/data/scoreManager.js`. This module orchestrates score recording, retrieval, and persistence. It maintains in-memory leaderboard cache and delegates storage to the injected `ScoreStore`.

**Acceptance Criteria**:
- [x] 1. `ScoreManager` constructor accepts `store` parameter (ScoreStore instance)
- [x] 2. `initialize()` method loads scores from store and caches in memory (must be called once at game start)
- [x] 3. `initialize()` sets internal `loaded` flag to prevent duplicate loads
- [x] 4. `recordScore(height)` validates height is non-negative integer, rejects invalid values with null
- [x] 5. `recordScore(height)` generates unique `id` (timestamp-based or UUID-like)
- [x] 6. `recordScore(height)` creates Score object with `{ id, score, timestamp }`
- [x] 7. `recordScore(height)` determines if score is a new record (highest in leaderboard)
- [x] 8. `recordScore(height)` inserts score in descending order by score value
- [x] 9. `recordScore(height)` returns object: `{ score, isNewRecord, rank }` (rank is 1-indexed position)
- [x] 10. `recordScore(height)` calls `store.save()` without await (fire-and-forget, catches errors)
- [x] 11. `getLeaderboard(limit = 10)` returns top N scores from memory cache
- [x] 12. `getFullLeaderboard()` returns entire leaderboard array
- [x] 13. `clear()` empties in-memory leaderboard and calls `store.clear()`
- [x] 14. Module exports singleton instances: `scoreStore` (LocalStorageScoreStore) and `scoreManager` (ScoreManager)

**Dependencies**:
- 1.1: ScoreStore Interface & LocalStorageScoreStore

**Testing Strategy**:
- Unit tests with mock ScoreStore (vitest)
- Test score recording, ranking, new record detection
- Test initialization, caching, edge cases (empty leaderboard, duplicate scores)

---

### 1.3: Write Unit Tests for ScoreManager

**Complexity**: M (Medium)  
**Time Estimate**: 2-3 hours  
**Status**: [ ] Not Started

**Description**:
Create comprehensive unit tests for `ScoreManager` class in `src/data/scoreManager.test.js`. Tests must use a mock ScoreStore to isolate business logic from storage concerns.

**Acceptance Criteria**:
- [x] 1. Test file `src/data/scoreManager.test.js` created using Vitest
- [x] 2. Mock `ScoreStore` class implemented inline with async methods returning promises
- [x] 3. Test: `recordScore()` returns object with `score`, `isNewRecord`, `rank` properties
- [x] 4. Test: first score recorded is marked as `isNewRecord: true`
- [x] 5. Test: scores are maintained in descending order (highest first)
- [x] 6. Test: new score inserted in correct position (not always appended)
- [x] 7. Test: rank correctly calculated for each insertion position
- [x] 8. Test: `recordScore()` rejects negative heights (returns null)
- [x] 9. Test: `recordScore()` rejects non-integer scores (returns null)
- [x] 10. Test: `getLeaderboard(10)` returns top 10 scores
- [x] 11. Test: `getLeaderboard()` returns fewer scores if leaderboard has < 10 entries
- [x] 12. Test: `initialize()` loads scores from store and caches them
- [x] 13. Test: second call to `initialize()` does not reload (checks `loaded` flag)
- [x] 14. Test: `clear()` empties leaderboard and calls store.clear()
- [x] 15. Test: timestamp is in valid ISO 8601 format for each score
- [x] 16. All tests pass (0 failures)

**Dependencies**:
- 1.2: Implement ScoreManager

**Testing Strategy**:
- Vitest framework with mock ScoreStore
- No real localStorage access (fully isolated)
- Parametrized tests for edge cases

---

### 1.4: Create Leaderboard UI Module (leaderboard.js)

**Complexity**: M (Medium)  
**Time Estimate**: 3 hours  
**Status**: [ ] Not Started

**Description**:
Implement `src/ui/leaderboard.js` module with functions to render, display, and control the leaderboard overlay. This module handles DOM manipulation, formatting, and user interactions.

**Acceptance Criteria**:
- [x] 1. `renderLeaderboard(scores)` clears tbody and renders scores as table rows
- [x] 2. Each row displays: rank (1-indexed), score value, formatted timestamp
- [x] 3. If scores array is empty, hides table and shows empty-state message
- [x] 4. If scores array has data, hides empty-state and shows table
- [x] 5. `showLeaderboard()` removes `hidden` class from leaderboardScreen overlay
- [x] 6. `hideLeaderboard()` adds `hidden` class to leaderboardScreen overlay
- [x] 7. `updateGameOverScore(height, isNewRecord, rank)` updates final score display on game over screen
- [x] 8. If `isNewRecord` is true, displays "🏆 ¡Nuevo récord!" in rank badge
- [x] 9. If `isNewRecord` is false, displays "Puntuación #N" with rank number
- [x] 10. `formatDateLocale(isoString)` converts ISO 8601 timestamp to locale-readable format (e.g., "15 ene 2024, 14:30")
- [x] 11. `formatDateLocale()` handles invalid timestamps gracefully (returns "—")
- [x] 12. `bindLeaderboardControls(onClose)` attaches click handler to close button
- [x] 13. `bindLeaderboardControls()` attaches click handler to overlay (click outside closes)
- [x] 14. `bindLeaderboardControls()` attaches Escape key listener to close overlay
- [x] 15. All functions exported as named exports
- [x] 16. No external dependencies (vanilla JS only)

**Dependencies**:
- None (pure UI module)

**Testing Strategy**:
- DOM-based tests with vitest + jsdom (render, verify HTML structure)
- Test text formatting and localization
- Test overlay visibility toggling

---

### 1.5: Write Unit Tests for Leaderboard UI Module

**Complexity**: M (Medium)  
**Time Estimate**: 2-3 hours  
**Status**: [ ] Not Started

**Description**:
Create unit tests for leaderboard UI module in `src/ui/leaderboard.test.js`. Must test DOM rendering, formatting, and event handling.

**Acceptance Criteria**:
- [x] 1. Test file `src/ui/leaderboard.test.js` created using Vitest + jsdom
- [x] 2. Test: `renderLeaderboard([])` displays empty state message
- [x] 3. Test: `renderLeaderboard([])` hides table
- [x] 4. Test: `renderLeaderboard(scores)` renders correct number of rows (top 10 if > 10 provided)
- [x] 5. Test: each row contains rank, score, and timestamp in correct columns
- [x] 6. Test: `showLeaderboard()` removes `hidden` class
- [x] 7. Test: `hideLeaderboard()` adds `hidden` class
- [x] 8. Test: `updateGameOverScore()` displays "¡Nuevo récord!" when isNewRecord is true
- [x] 9. Test: `updateGameOverScore()` displays rank number when isNewRecord is false
- [x] 10. Test: `formatDateLocale("2024-01-15T14:30:00.000Z")` returns format matching Spanish locale (e.g., contains date/month/year/time)
- [x] 11. Test: `formatDateLocale("invalid-date")` returns "—" without throwing
- [x] 12. Test: `bindLeaderboardControls()` close button click hides overlay
- [x] 13. Test: `bindLeaderboardControls()` Escape key press hides overlay
- [x] 14. Test: `bindLeaderboardControls()` click outside overlay hides it
- [x] 15. All tests pass (0 failures)

**Dependencies**:
- 1.4: Create Leaderboard UI Module

**Testing Strategy**:
- Vitest with jsdom for DOM simulation
- Mock DOM elements (getElementById, querySelector)
- Test event listeners and visibility states

---

### 1.6: Add HTML Structure for Leaderboard Overlay and Game Over Display

**Complexity**: S (Small)  
**Time Estimate**: 1-2 hours  
**Status**: [ ] Not Started

**Description**:
Update `index.html` to add the leaderboard overlay and integrate score display into the game over screen. Must follow existing pattern of overlay structure (similar to bossScreen, gameOverScreen).

**Acceptance Criteria**:
- [x] 1. `index.html` has `#leaderboardScreen` div with class `overlay` and `hidden`
- [x] 2. Leaderboard overlay contains semantic `<table>` with `<thead>` and `<tbody>`
- [x] 3. Table has columns: # (rank), Puntaje (score), Fecha (timestamp)
- [x] 4. `<thead>` uses `<th scope="col">` for accessibility
- [x] 5. `<tbody id="leaderboardTableBody">` is empty (will be populated by JS)
- [x] 6. Leaderboard overlay has `.leaderboard-header` with `<h2>Tabla de Scores</h2>` and close button
- [x] 7. Close button has `aria-label="Cerrar tabla"` for a11y
- [x] 8. Leaderboard overlay has `.leaderboard-body` containing table and empty state
- [x] 9. Empty state div: `#leaderboardEmpty` with message "No hay scores aún. ¡Completa una partida para aparecer aquí!"
- [x] 10. Game over screen has `.score-info` section with `#finalScore` and `#scoreRank` elements
- [x] 11. Game over screen has button `#viewLeaderboardBtn` with text "Ver tabla de scores"
- [x] 12. All text is in Spanish
- [x] 13. All interactive elements have proper ARIA labels

**Dependencies**:
- None (HTML structure only)

**Testing Strategy**:
- Manual inspection of HTML structure
- Verify semantic tags and accessibility attributes
- Check all required IDs and classes present

---

### 1.7: Add CSS Styling for Leaderboard Components

**Complexity**: M (Medium)  
**Time Estimate**: 2-3 hours  
**Status**: [ ] Not Started

**Description**:
Add CSS rules to `index.html` `<style>` block to style leaderboard overlay, table, buttons, and game over score display. Must maintain consistency with existing visual style (gem-cut aesthetic, color palette, animations).

**Acceptance Criteria**:
- [x] 1. `.overlay` class defines positioning (fixed, full screen, semi-transparent background)
- [x] 2. `.overlay-content` defines modal box styling (centered, rounded corners, shadow)
- [x] 3. `.leaderboard-header` styles title and close button (flexbox, spacing)
- [x] 4. `.leaderboard-body` defines table container (padding, overflow handling)
- [x] 5. `.leaderboard-table` styles table (full width, border-collapse, alternating row colors)
- [x] 6. Table headers have background color and text styling (bold, centered)
- [x] 7. Table rows have hover effects (slight background change)
- [x] 8. `.score-value` column is right-aligned (numerical values)
- [x] 9. `.score-date` column is right-aligned
- [x] 10. `.empty-state` is centered with descriptive message styling
- [x] 11. `.hidden` class uses `display: none` to hide elements
- [x] 12. `.new-record` class styling for rank badge (gold color, emphasis)
- [x] 13. Close button has hover and focus states (visible on keyboard navigation)
- [x] 14. `#viewLeaderboardBtn` button matches existing button styling
- [x] 15. Responsive design: table scales on small screens (no overflow or wrapping)
- [x] 16. All animations are smooth (no janky transitions)
- [x] 17. Color palette uses existing CSS variables (--color-*, --bg-*)

**Dependencies**:
- 1.6: Add HTML Structure for Leaderboard Overlay

**Testing Strategy**:
- Visual inspection on desktop and mobile browsers
- Verify no layout shifts or overflow issues
- Test keyboard focus visibility on buttons

---

### 1.8: Integrate ScoreManager with main.js and Initialize Leaderboard System

**Complexity**: M (Medium)  
**Time Estimate**: 2-3 hours  
**Status**: [ ] Not Started

**Description**:
Update `src/main.js` to initialize the leaderboard system. Must call `scoreManager.initialize()` at startup and wire event handlers for leaderboard visibility and data refresh.

**Acceptance Criteria**:
- [x] 1. `main.js` imports `ScoreManager`, `scoreStore`, `scoreManager` from `src/data/scoreManager.js`
- [x] 2. `main.js` imports leaderboard functions from `src/ui/leaderboard.js`
- [x] 3. At game startup (inside game initialization function or IIFE), `await scoreManager.initialize()` is called
- [x] 4. After initialization, `leaderboard.bindLeaderboardControls(hideLeaderboard)` is called to set up event handlers
- [x] 5. `#viewLeaderboardBtn` click event handler attached (gets top 10, renders, and shows)
- [x] 6. Clear leaderboard function exposed (e.g., `window.__torreNubes.clearLeaderboard()` for dev use)
- [x] 7. Clear function calls `scoreManager.clear()` and updates UI
- [x] 8. No errors in console during initialization
- [x] 9. Game runs normally (no side effects on existing gameplay)

**Dependencies**:
- 1.1: ScoreStore Interface & LocalStorageScoreStore
- 1.2: Implement ScoreManager
- 1.4: Create Leaderboard UI Module
- 1.6: Add HTML Structure

**Testing Strategy**:
- Manual browser test: open game, verify no errors
- Verify localStorage is accessed at startup
- Verify leaderboard button works on game over screen

---

### 1.9: Write Integration Tests for localStorage Persistence

**Complexity**: M (Medium)  
**Time Estimate**: 2-3 hours  
**Status**: [ ] Not Started

**Description**:
Create integration tests in `src/integration/leaderboard.integration.test.js` that verify the full persistence flow: record score → save to localStorage → load in new session → verify data integrity.

**Acceptance Criteria**:
- [x] 1. Test file `src/integration/leaderboard.integration.test.js` created using Vitest
- [x] 2. Test: record score → localStorage contains data → new instance loads data → data matches
- [x] 3. Test: multiple scores recorded → order maintained across sessions (descending)
- [x] 4. Test: localStorage quota exceeded → error caught, partial data preserved
- [x] 5. Test: corrupted JSON in localStorage → data ignored, leaderboard starts fresh
- [x] 6. Test: clear operation → localStorage key removed → new instance loads empty array
- [x] 7. Test: timestamp persisted as valid ISO 8601 format across save/load cycles
- [x] 8. Each test calls `localStorage.clear()` before and after to isolate test state
- [x] 9. All tests pass (0 failures)

**Dependencies**:
- 1.1: ScoreStore Interface & LocalStorageScoreStore
- 1.2: Implement ScoreManager

**Testing Strategy**:
- Vitest with real localStorage (no mocks for this test suite)
- Each test is isolated (clear before/after)
- Simulate session boundaries (create new ScoreManager instance)

---

### 1.10: Integrate Score Capture into Game Over Flow

**Complexity**: M (Medium)  
**Time Estimate**: 2-3 hours  
**Status**: [ ] Not Started

**Description**:
Update the game's game-over-screen logic to capture the current tower height and call `scoreManager.recordScore()`. Update the game over screen display to show final score and ranking. This requires modifying existing game logic to hook into the leaderboard system.

**Acceptance Criteria**:
- [x] 1. When game ends (trigger game over condition), tower height is captured
- [x] 2. `scoreManager.recordScore(height)` is called with tower height
- [x] 3. Result object `{ score, isNewRecord, rank }` is received
- [x] 4. `leaderboard.updateGameOverScore(score, isNewRecord, rank)` is called with result
- [x] 5. Game over screen displays final score in `#finalScore` element
- [x] 6. Game over screen displays "🏆 ¡Nuevo récord!" or "Puntuación #N" in `#scoreRank` element
- [x] 7. `#viewLeaderboardBtn` is visible and clickable on game over screen
- [x] 8. No game logic is altered (tower height calculation, game end conditions remain the same)
- [x] 9. Edge case: if height is 0 or negative, still recorded (no rejection)
- [x] 10. No errors in console during game over sequence

**Dependencies**:
- 1.2: Implement ScoreManager
- 1.4: Create Leaderboard UI Module
- 1.6: Add HTML Structure
- 1.8: Integrate ScoreManager with main.js

**Testing Strategy**:
- Manual gameplay: lose game, verify score and ranking displayed
- Verify second loss shows correct ranking (not always "new record")
- Verify leaderboard button opens overlay with updated data

---

### 1.11: End-to-End Testing and Verification

**Complexity**: M (Medium)  
**Time Estimate**: 2-3 hours  
**Status**: [ ] Not Started

**Description**:
Comprehensive testing of the entire leaderboard feature: gameplay integration, persistence, UI, and edge cases. Verify all requirements from design.md are met.

**Acceptance Criteria**:
- [x] 1. Play 3 complete games and verify each score is recorded
- [x] 2. Verify scores appear in game over screen in correct order (first score: new record, subsequent: ranked)
- [x] 3. Click "Ver tabla de scores" and verify top 10 are displayed
- [x] 4. Refresh browser (simulate new session) and verify scores persisted in localStorage
- [x] 5. Verify localStorage key is `torre-nubes-scores`
- [x] 6. Verify localStorage data is valid JSON array of Score objects
- [x] 7. Verify each Score object has `id`, `score`, and `timestamp` properties
- [x] 8. Verify timestamps are in ISO 8601 format
- [x] 9. Record 101 scores and verify leaderboard keeps only top 100
- [x] 10. Verify "No hay scores aún" message displays on fresh browser (cleared localStorage)
- [x] 11. Test close button on leaderboard overlay (click X, press Escape, click outside)
- [x] 12. Test on mobile viewport (verify table responsive, no overflow)
- [x] 13. Open browser DevTools → Application → localStorage and inspect data structure
- [x] 14. No console errors throughout gameplay
- [x] 15. All accessibility features work: table is semantic HTML, buttons have aria-labels, keyboard navigation works
- [x] 16. All text is in Spanish
- [x] 17. Update game over screen title/messages if necessary (integration check)

**Dependencies**:
- All previous tasks (1.1 - 1.10)

**Testing Strategy**:
- Manual E2E testing in browser
- Inspect localStorage via DevTools
- Test multiple browsers (Chrome, Firefox, Safari)
- Test keyboard navigation for a11y compliance
- Generate test report documenting all checks passed

---

## Notes

**Task Execution Order (Critical Path)**:
1. 1.1 → Create ScoreStore Interface & LocalStorageScoreStore
2. 1.2 → Implement ScoreManager
3. 1.3 → Unit Tests for ScoreManager
4. 1.4 → Create Leaderboard UI Module
5. 1.5 → Unit Tests for Leaderboard UI
6. 1.6 → Add HTML Structure
7. 1.7 → Add CSS Styling
8. 1.8 → Integrate with main.js
9. 1.9 → Integration Tests
10. 1.10 → Game Over Integration
11. 1.11 → E2E Testing & Verification

**Rationale**: Foundation first (storage layer), then business logic, then UI, then integration, finally verification.

**Estimated Timeline**:
- Phase 1 Implementation: 20-25 hours total
- Per Task Average: 2-3 hours
- Critical Path: 11 tasks, sequential (no parallelization possible due to dependencies)
- Recommended Sprint: 5-6 working days (full sprint) or 2-3 sprints for distributed work

**Success Criteria**:
✅ All 11 tasks completed  
✅ All unit tests pass (0 failures)  
✅ All integration tests pass  
✅ E2E testing confirms all requirements met  
✅ No console errors during gameplay  
✅ localStorage persists scores across sessions  
✅ UI renders correctly on desktop and mobile  
✅ Accessibility features verified (ARIA, keyboard nav, Spanish text)  
✅ Performance: no noticeable lag in game loop  
✅ Code follows existing project conventions (camelCase, module pattern)
