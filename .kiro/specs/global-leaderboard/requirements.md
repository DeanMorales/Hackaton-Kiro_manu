# Tabla de Scores Global - Requisitos

## Introducción

Esta especificación define los requisitos para implementar una tabla de scores global a nivel local en "Torre de las Nubes". El sistema registrará las alturas máximas alcanzadas por el jugador en cada partida, persistirá estos datos en el localStorage del navegador, y permitirá visualizar un ranking de mejores puntuaciones. La arquitectura está diseñada para soportar una migración futura a DynamoDB sin cambios significativos en la lógica del juego.

## Glosario

- **Score**: La altura máxima (medida en número de bloques o píxeles) alcanzada en una partida antes de perder.
- **Leaderboard/Tabla de Scores**: Colección ordenada de scores históricos del jugador, almacenada en localStorage.
- **localStorage**: API del navegador para persistencia de datos a nivel local por dominio/origen.
- **Partida**: Una sesión de juego que comienza en la pantalla de inicio y termina en Game Over.
- **Score Provider**: Interface abstracta (a nivel lógico) que permite intercambiar el origen de datos (localStorage en Fase 1, DynamoDB en Fase 2).
- **Top N**: Los N mejores scores en orden descendente (ej: top 10).
- **Persistencia**: Capacidad de mantener datos entre sesiones del navegador (sin perder datos al cerrar/reabrir).

## Requisitos

### Requisito 1: Captura y Registro de Score

**User Story:** Como jugador, quiero que mi score (altura máxima alcanzada) se registre automáticamente al terminar una partida, para poder ver mi progresión histórica.

#### Acceptance Criteria

1. WHEN a player loses (game over condition is triggered), THE ScoreManager SHALL capture the current tower height as the final score.
2. WHEN a score is captured, THE ScoreManager SHALL include a timestamp (ISO 8601 format) recording when the score was achieved.
3. WHEN a score is successfully recorded, THE ScoreManager SHALL append it to the leaderboard without losing previously recorded scores.
4. IF the tower height at game over is 0 or negative, THEN THE ScoreManager SHALL still record the score (do not discard it).

**Technical Notes:**
- Tower height is determined by the count of blocks in the tower or the Y-coordinate of the topmost block (implementation detail determined in design).
- Timestamp format: `YYYY-MM-DDTHH:mm:ss.sssZ` (JavaScript `new Date().toISOString()`).
- Score record structure: `{ score: number, timestamp: string, id?: string }` (id optional for future distributed systems).

---

### Requisito 2: Persistencia en localStorage

**User Story:** Como jugador, quiero que mis scores se guarden entre sesiones, para que no pierda mi historial al cerrar y reabrir el navegador.

#### Acceptance Criteria

1. WHEN a new score is recorded, THE ScoreManager SHALL serialize it and write it to browser localStorage under a defined key.
2. WHEN the game loads, THE ScoreManager SHALL retrieve all scores from localStorage and restore the leaderboard in memory.
3. IF localStorage is unavailable or the stored data is corrupted, THEN THE ScoreManager SHALL log a warning and continue with an empty leaderboard.
4. WHEN the leaderboard is updated, THE ScoreManager SHALL overwrite the previous localStorage entry with the new state (no append, full rewrite).
5. THE storage key used MUST be namespaced (e.g., `torre-nubes-scores`) to avoid conflicts with other applications.

**Technical Notes:**
- Storage format: JSON array of score objects: `[{ score: 1500, timestamp: "2024-01-15T14:30:00.000Z" }, ...]`.
- Approximate data size: 10 scores × ~80 bytes ≈ 800 bytes (well within typical localStorage limit of 5-10 MB).
- No expiration policy: scores persist indefinitely until manually cleared.

---

### Requisito 3: Visualización de Tabla de Scores

**User Story:** Como jugador, quiero ver mis mejores scores en una tabla clara durante o después de una partida, para monitorear mi progreso.

#### Acceptance Criteria

1. WHEN the leaderboard is accessed, THE UI SHALL display a table showing the top 10 scores in descending order (highest first).
2. WHEN a score is displayed in the table, THE UI SHALL show: rank number (1–10), score value, and timestamp in human-readable format (e.g., "15 Jan 2024, 14:30").
3. IF fewer than 10 scores exist in the leaderboard, THE UI SHALL display only the available scores without placeholder rows.
4. IF the leaderboard is empty, THE UI SHALL display a message (e.g., "No scores yet. Complete a game to appear here.").
5. WHEN the leaderboard table is visible, THE UI SHALL not obstruct core gameplay (render as an overlay or secondary panel that can be toggled/dismissed).
6. WHEN the leaderboard is updated with a new score, THE table display SHALL refresh to reflect the new ranking.

**Technical Notes:**
- Display format: top 10 by default; future phases may allow user-configurable limits.
- Timestamp display format: locale-aware or fixed format (design decision, e.g., "DD MMM YYYY, HH:mm").
- Overlay approach: DOM overlay (similar to existing startScreen, bossScreen, gameOverScreen) or canvas-based (design decision).

---

### Requisito 4: Integración con Game Over

**User Story:** Como jugador, quiero que al terminar una partida, se muestre mi nuevo score en contexto (ej: "Tu puntuación: 1500 bloques") y tener opción de ver la tabla completa.

#### Acceptance Criteria

1. WHEN the game over screen is displayed, THE UI SHALL show the final score of the current game in a prominent location.
2. WHEN the game over screen is displayed, THE UI SHALL indicate whether the score is a new personal record (e.g., "¡Nuevo récord!" if it is, or "Puntuación #3" if ranked).
3. WHEN a player is on the game over screen, THE UI SHALL provide a button or link to view the full leaderboard table.
4. WHEN the player clicks the leaderboard button, THE UI SHALL display the leaderboard overlay without closing the game over screen (toggle behavior).

**Technical Notes:**
- New record detection: compare current score with the max score in localStorage.
- Ranking calculation: determine the position of the current score within the stored leaderboard.

---

### Requisito 5: Capacidad de Limpieza (Reset)

**User Story:** Como jugador (o desarrollador durante testing), quiero poder limpiar/resetear todos los scores almacenados, para empezar de cero o prueba el sistema.

#### Acceptance Criteria

1. WHERE developer-mode or secret-menu is accessible, THE UI SHALL provide a "Clear Leaderboard" button.
2. WHEN the "Clear Leaderboard" button is clicked, THE UI SHALL prompt the player for confirmation (e.g., "Are you sure? This cannot be undone.").
3. WHEN confirmed, THE ScoreManager SHALL clear all scores from both memory and localStorage.
4. WHEN the leaderboard is cleared, THE UI SHALL update to display the empty state message.
5. THE clear function SHALL NOT affect any other game state (only scores are deleted).

**Technical Notes:**
- Developer mode: implementation to be decided (secret key combo, URL parameter, localStorage flag).
- Confirmation dialog: simple browser `confirm()` or custom modal (design decision).

---

### Requisito 6: Soporte para Arquitectura Modular y Migración a DynamoDB

**User Story:** Como architect, quiero que el código de scores esté desacoplado de detalles de almacenamiento, para facilitar la migración a DynamoDB en una fase posterior sin refactorizar lógica de juego.

#### Acceptance Criteria

1. THE ScoreManager SHALL use an abstract interface (or pattern equivalent) for storage operations (read, write, clear).
2. WHEN a new score is recorded, THE ScoreManager SHALL call a generic "persist" method without knowledge of whether it uses localStorage or cloud storage.
3. WHEN the game loads, THE ScoreManager SHALL call a generic "load" method to retrieve scores from the configured provider.
4. IF the storage provider is swapped (e.g., from localStorage to DynamoDB), THE game logic SHALL require no changes.
5. THE ScoreManager module SHALL be independently testable (exports functions that can be called in isolation).

**Technical Notes:**
- Pattern: Strategy pattern or Dependency Injection to swap storage providers.
- Example interface (pseudo-code):
  ```
  interface ScoreStore {
    load(): Promise<Score[]>
    save(scores: Score[]): Promise<void>
    clear(): Promise<void>
  }
  ```
- Phase 1 implementation: `LocalStorageScoreStore` (synchronous or async wrapper).
- Phase 2 implementation: `DynamoDBScoreStore` (async, with AWS SDK integration).

---

### Requisito 7: Manejo de Errores y Validación

**User Story:** Como desarrollador, quiero que el sistema maneje errores gracefully (sin crashes) y valide datos antes de usar, para mantener la robustez del juego.

#### Acceptance Criteria

1. IF localStorage quota is exceeded, THEN THE ScoreManager SHALL log an error and continue without persisting the score (do not crash).
2. IF stored data in localStorage is corrupted or not valid JSON, THEN THE ScoreManager SHALL log a warning and ignore the corrupted entry (start fresh).
3. WHEN a score is recorded, THE ScoreManager SHALL validate that the score value is a valid non-negative number.
4. WHEN a timestamp is created, THE ScoreManager SHALL validate that it is in ISO 8601 format before storing.
5. IF validation fails for a score record, THEN THE ScoreManager SHALL reject the record and log the reason (do not silently drop it).

**Technical Notes:**
- Validation function example: `isValidScore(score) => Number.isInteger(score) && score >= 0`.
- Logging: use browser console (`console.warn`, `console.error`) or future logging system (design decision).
- Storage quota error: `QuotaExceededError` exception handling in try-catch.

---

### Requisito 8: Performance y UX

**User Story:** Como usuario, quiero que la tabla de scores cargue rápidamente y no cause lag en el juego, incluso si tengo muchos scores almacenados.

#### Acceptance Criteria

1. WHEN the leaderboard is loaded from localStorage, THE operation SHALL complete in under 50ms (to avoid visible UI jank).
2. WHEN the leaderboard is displayed, THE UI rendering (DOM or canvas) SHALL not block the game loop.
3. WHEN a new score is persisted, THE write to localStorage SHALL not block the game loop or cause a noticeable frame drop.
4. THE leaderboard storage SHALL be limited to a reasonable maximum (e.g., last 100 scores) to prevent unbounded growth.
5. IF the leaderboard exceeds the maximum, THE oldest scores SHALL be automatically pruned (FIFO or age-based).

**Technical Notes:**
- Performance baseline: localStorage operations are generally < 1ms on modern hardware; async/await is not required for Phase 1.
- Pruning strategy: keep only the top 100 scores or scores from the last 30 days (design decision).
- Frame rate target: 60 FPS → ~16.67ms per frame; storage ops should not occupy more than a few ms.

---

### Requisito 9: Accesibilidad y Localización

**User Story:** Como jugador hispanohablante, quiero que los textos de la tabla de scores estén en español y sean accesibles en lectores de pantalla.

#### Acceptance Criteria

1. ALL text labels in the leaderboard UI (table headers, rank, score, timestamp, buttons, messages) SHALL be in Spanish.
2. WHEN the leaderboard table is rendered in the DOM, THE structure SHALL include semantic HTML (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`) for screen reader accessibility.
3. WHEN interactive elements (buttons) are present, THEY SHALL have descriptive `aria-label` attributes and proper keyboard focus states.
4. WHEN the leaderboard is displayed as a modal or overlay, THE UI SHALL support keyboard navigation (Tab, Escape to close).
5. THE timestamp display SHALL use a locale-appropriate format or a fixed format clearly understood by Spanish speakers.

**Technical Notes:**
- Language: all new strings must be in Spanish (consistent with product steering).
- Semantic HTML: avoid `<div>` tables in favor of proper `<table>` elements.
- Keyboard support: Escape to close overlay, Tab to navigate buttons.
- ARIA attributes: `aria-label`, `aria-describedby` for additional context if needed.

---

## Data Structure Proposal (Informativo)

This section describes the proposed data structure for Phase 1 (localStorage). Final design will be detailed in `design.md`.

### Score Record

```json
{
  "id": "uuid-or-timestamp-hash",
  "score": 1500,
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

### Leaderboard (Array of Score Records)

```json
[
  {
    "id": "20240115-143000-001",
    "score": 1500,
    "timestamp": "2024-01-15T14:30:00.000Z"
  },
  {
    "id": "20240114-102000-001",
    "score": 1200,
    "timestamp": "2024-01-14T10:20:00.000Z"
  }
]
```

### localStorage Key

```
torre-nubes-scores
```

---

## Constraints and Assumptions

- **Phase 1 scope**: localStorage only; DynamoDB integration deferred to Phase 2.
- **Single-player**: no multiplayer or cross-device sync in Phase 1.
- **Browser storage**: relies on localStorage API (available in all modern browsers).
- **No external dependencies**: keep implementation in vanilla JavaScript (no new npm packages for this feature).
- **Non-destructive to existing gameplay**: leaderboard feature does not alter core tower or combat mechanics.
- **Modular design**: score management must be separable from game state for testing and future migration.

---

## Acceptance Criteria Summary

| Req | Title | Key Acceptance Criteria |
|-----|-------|------------------------|
| 1 | Captura y Registro | Score captured at game over, with timestamp |
| 2 | Persistencia | localStorage read/write with error handling |
| 3 | Visualización | Top 10 table, human-readable format, empty state |
| 4 | Game Over Integration | Display final score, rank, leaderboard link |
| 5 | Reset Capability | Clear button (dev mode), with confirmation |
| 6 | Modular Architecture | Abstract storage interface, provider-agnostic logic |
| 7 | Error Handling | Graceful failures, validation, logging |
| 8 | Performance | < 50ms load, no game loop blocking |
| 9 | Accesibilidad | Spanish text, semantic HTML, keyboard nav |

---

## Success Criteria

- ✅ Scores are captured and persisted across browser sessions.
- ✅ Leaderboard is displayed correctly with top 10 and empty state.
- ✅ Game over screen integrates with score display and ranking.
- ✅ Architecture supports transparent migration to DynamoDB.
- ✅ No performance impact on game loop.
- ✅ All UI text is in Spanish and accessible.
- ✅ Error handling is robust (no crashes on storage failure).

