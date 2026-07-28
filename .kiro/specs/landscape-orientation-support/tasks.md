# Implementation Plan: landscape-orientation-support

## Overview

Introducir un `Vertical_Anchor_Ratio` variable (`0.62` por defecto, `0.75` en `Landscape_Mobile_Mode`) mediante un nuevo módulo puro compartido (`src/render/anchorRatio.js`), y propagarlo como parámetro opcional a `elevToScreen` y las funciones de dibujo de la torre (`src/render/draw.js`), y a `drawCombatants` (`src/render/bossFightRender.js`), sin romper ninguna llamada existente en los tests actuales. Se implementa en JavaScript (ES modules), siguiendo las convenciones ya presentes en el repo (Vitest + fast-check).

## Tasks

- [x] 1. Crear el módulo `src/render/anchorRatio.js`
  - Exportar las constantes `DEFAULT_VERTICAL_ANCHOR_RATIO = 0.62`, `LANDSCAPE_VERTICAL_ANCHOR_RATIO = 0.75`, `LANDSCAPE_HEIGHT_THRESHOLD = 520`
  - Implementar `isLandscapeMobileMode(W, H)`: `return W > H && H <= LANDSCAPE_HEIGHT_THRESHOLD`
  - Implementar `computeVerticalAnchorRatio(W, H)`: devuelve `LANDSCAPE_VERTICAL_ANCHOR_RATIO` si `isLandscapeMobileMode(W, H)` es `true`, si no `DEFAULT_VERTICAL_ANCHOR_RATIO`
  - Ambas funciones puras, sin efectos secundarios, sin lanzar excepciones para `W`/`H` no positivos
  - _Requirements: 1.1, 1.2, 1.3_

  - [x]* 1.1 Escribir property test para detección de Landscape_Mobile_Mode en el cuadrante landscape móvil
    - **Property 1: Detección correcta de Landscape_Mobile_Mode en el cuadrante landscape móvil**
    - **Validates: Requirements 1.1**

  - [x]* 1.2 Escribir property test para Landscape_Mobile_Mode desactivado cuando W <= H
    - **Property 2: Landscape_Mobile_Mode desactivado cuando W <= H, para cualquier H**
    - **Validates: Requirements 1.2**

  - [x]* 1.3 Escribir property test para Landscape_Mobile_Mode desactivado en landscape con suficiente alto
    - **Property 3: Landscape_Mobile_Mode desactivado en landscape con suficiente alto (tablet/escritorio)**
    - **Validates: Requirements 1.3**

  - [x]* 1.4 Escribir property test para el valor exacto del ratio en Landscape_Mobile_Mode
    - **Property 4: El ratio resuelto es exactamente 0.75 en Landscape_Mobile_Mode**
    - **Validates: Requirements 2.1, 3.1**

  - [x]* 1.5 Escribir property test para el valor exacto del ratio fuera de Landscape_Mobile_Mode (no-regresión)
    - **Property 5: El ratio resuelto es exactamente 0.62 fuera de Landscape_Mobile_Mode (no-regresión)**
    - **Validates: Requirements 2.3, 3.2**

  - [x]* 1.6 Escribir property test de consistencia entre Tower_Camera y Combat_Ground_Anchor
    - **Property 6: Camera_Anchor y Combat_Ground_Anchor siempre comparten el mismo ratio**
    - **Validates: Requirements 3.3**

  - [x]* 1.7 Escribir unit tests de casos límite para `isLandscapeMobileMode`
    - Umbral exacto: `isLandscapeMobileMode(800, 520)` → `true`; `isLandscapeMobileMode(800, 521)` → `false`
    - Igualdad `W === H`: `isLandscapeMobileMode(400, 400)` → `false`
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Modificar `elevToScreen` y las funciones de dibujo de la torre en `src/render/draw.js`
  - Importar `DEFAULT_VERTICAL_ANCHOR_RATIO` y `computeVerticalAnchorRatio` desde `./anchorRatio.js`
  - Añadir 4º parámetro opcional `ratio = DEFAULT_VERTICAL_ANCHOR_RATIO` a `elevToScreen(camElev, elev, H, ratio)`, y usar `H * ratio - (elev - camElev)`
  - Añadir parámetro opcional `ratio = DEFAULT_VERTICAL_ANCHOR_RATIO` a `drawGround`, `drawTower`, `drawMovingBlock`, `drawKnight`, reenviándolo a cada llamada interna a `elevToScreen`
  - En `render(ctx, W, H, gameState, combatUiState)`, calcular `const ratio = computeVerticalAnchorRatio(W, H)` una sola vez por frame y pasarlo a `drawGround`, `drawTower`, `drawMovingBlock`, `drawKnight`
  - _Requirements: 2.1, 2.2, 2.3_

  - [x]* 2.1 Escribir property test del invariante de alineación relativa de `elevToScreen`
    - **Property 7: elevToScreen preserva las distancias relativas de elevación, para cualquier ratio**
    - **Validates: Requirements 2.2**

  - [x]* 2.2 Escribir property test de no-interferencia con tamaños fijos en píxeles
    - **Property 8: El cambio de ratio nunca altera los tamaños fijos en píxeles dibujados**
    - **Validates: Requirements 5.1**

  - [x]* 2.3 Escribir unit tests de no-regresión para las llamadas existentes de 3 argumentos
    - Verificar que las 3 llamadas existentes en `draw.test.js` a `elevToScreen(camElev, elev, H)` (sin `ratio`) siguen pasando sin modificación, confirmando el comportamiento del default
    - _Requirements: 2.3_

  - [x]* 2.4 Escribir unit test de ejemplo concreto de landscape móvil (667×375)
    - Verificar que `render()` con `W=667, H=375` calcula `ratio === 0.75` y las coordenadas Y resultantes de `drawGround`/`drawTower`/`drawKnight` reflejan ese ratio
    - _Requirements: 2.1, 2.2_

  - [x]* 2.5 Escribir unit test de no-regresión de escritorio/portrait
    - Verificar que `render()` con `W=800, H=600` produce exactamente las mismas coordenadas Y que antes de esta feature (`ratio === 0.62`)
    - _Requirements: 2.3, 4.1_

- [x] 3. Checkpoint - Asegurar que todos los tests pasan
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Modificar `drawCombatants` en `src/render/bossFightRender.js`
  - Importar `computeVerticalAnchorRatio` desde `./anchorRatio.js`
  - Eliminar `groundYRatio` del objeto `COMBAT_LAYOUT`, dejando solo `warriorXRatio` y `bossXRatio`
  - Sustituir `H * COMBAT_LAYOUT.groundYRatio` por `H * computeVerticalAnchorRatio(W, H)` dentro de `drawCombatants`
  - Mantener sin cambios la firma de `drawCombatants(ctx, W, H, warriorEngine, bossEngine)` y el uso de `computeSpriteScaleFactor(W)`
  - _Requirements: 3.1, 3.2, 3.3, 5.2_

  - [x]* 4.1 Escribir property test de no-interferencia con Sprite_Scale_Factor
    - **Property 9: Sprite_Scale_Factor es independiente de H y de Landscape_Mobile_Mode**
    - **Validates: Requirements 5.2**

  - [x]* 4.2 Escribir unit test de ejemplo concreto de landscape móvil para `drawCombatants`
    - Verificar que con `W=667, H=375` el `groundY` interno usa `ratio === 0.75`, consistente con el usado por `render()` en la tarea 2.4
    - _Requirements: 3.1, 3.3_

  - [x]* 4.3 Escribir unit test de no-regresión de `COMBAT_LAYOUT.groundYRatio`
    - Verificar que fuera de `Landscape_Mobile_Mode` (por ejemplo `W=800, H=600`) el `groundY` calculado por `drawCombatants` es idéntico al que producía la constante `groundYRatio = 0.62` antes del cambio
    - _Requirements: 3.2, 4.2_

- [x] 5. Verificar no-regresión de `anchorScreenY` en `src/engine/tower.js`
  - [x] 5.1 Escribir unit test de no-regresión para `createTowerState`/`resetGame`
    - Confirmar que `createTowerState(W, H).anchorScreenY === H * 0.62` y que `resetGame` mantiene el mismo valor, para ejemplos de `H`, sin ninguna modificación al código de `tower.js`
    - _Requirements: 4.1_

- [x] 6. Checkpoint final - Asegurar que todos los tests pasan
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Nota de verificación manual (no automatizable)
  - Dejar constancia, como comentario o nota en el propio PR/commit (no como código de test), de que se debe realizar un smoke test visual en un viewport landscape móvil real (por ejemplo 667×375 en DevTools) para confirmar que el HUD (`#hud`) no se solapa con la torre/caballero en pantalla `build` ni con los Combat_Sprite en pantalla `boss`
    - No automatizable: depende de `getBoundingClientRect` sobre un DOM real renderizado, fuera del alcance de la suite de mocks de `CanvasRenderingContext2D`
    - _Requirements: 6.1, 6.2_

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido, pero SÍ deben implementarse (no son un placeholder): solo indican que son tareas de testing, no de implementación core.
- Todos los property tests usan `fast-check` con `fc.assert(fc.property(...), { numRuns: 100 })`, siguiendo la convención ya establecida en `draw.test.js` y `bossFightRender.test.js`.
- La tarea 7 es puramente informativa/documental: no genera código de test automatizado, ya que el Requirement 6 depende de layout real del DOM.
- Cada tarea de implementación referencia requisitos granulares (no solo user stories) para trazabilidad.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "4.1", "4.2", "4.3", "5.1"] }
  ]
}
```
