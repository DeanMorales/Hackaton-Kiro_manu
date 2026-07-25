# Implementation Plan: Combate de cartas escaladas

## Overview

Se implementa la nueva mecánica de combate (intento único por carta + escalado de cartas por nivel + rediseño de umbrales de vida) modificando el módulo de lógica pura `src/combat/fight.js`, ajustando el wiring de UI en `src/main.js` para dejar de reactivar cartas, y cubriendo las 12 propiedades de corrección del diseño con tests basados en propiedades (fast-check) más tests unitarios de ejemplos y bordes en `src/combat/fight.test.js`.

El proyecto ya declara `vitest` y `fast-check` como `devDependencies` y usa ES modules vanilla sin build step para el runtime del juego. Los tests son de desarrollo y no se cargan en el navegador. Todo el texto de cara al usuario se mantiene en español.

## Tasks

- [x] 1. Reimplementar la inicialización del combate con escalado y umbrales
  - [x] 1.1 Reescribir `startBossFight(level)` en `src/combat/fight.js`
    - Definir la constante `MAX_CARD_COUNT = 7` en el módulo.
    - Calcular `cardCount = Math.min(level, MAX_CARD_COUNT)` (para `level = 1` da `1`).
    - Calcular `bossDefeatThreshold = Math.ceil(cardCount / 2)` y `playerDefeatThreshold = cardCount - bossDefeatThreshold + 1`.
    - Inicializar `bossPips = bossDefeatThreshold` y `playerPips = playerDefeatThreshold`.
    - Seleccionar `cardCount` servicios distintos con `shuffle(AWS_SERVICES).slice(0, cardCount)` y mapear a `{ service, question: pickQuestion(s.id, null), locked: false }`.
    - Componer `bossLabel = BOSS_NAMES[Math.min(level, BOSS_NAMES.length) - 1] + " — Nivel " + level` (acotado a la longitud del arreglo para garantizar nombre no vacío en niveles altos).
    - Retornar la forma plana `{ cardCount, playerPips, bossPips, resolved: false, cards, bossLabel }`.
    - _Requirements: 3.4, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3_

  - [x]* 1.2 Escribir property test para umbrales iniciales
    - **Property 8: Umbrales iniciales válidos y según fórmula**
    - **Validates: Requirements 3.6, 3.7, 3.8, 3.9, 4.6, 5.3**
    - Generador `fc.integer({ min: 1, max: 100 })`; mínimo 100 iteraciones; comentario `// Feature: combate-cartas-escaladas, Property 8: ...`.

  - [x]* 1.3 Escribir property test para escalado de `cardCount`
    - **Property 9: cardCount válido, acotado y monótono**
    - **Validates: Requirements 3.4, 4.1, 4.2, 4.4**
    - Generar pares de niveles `a <= b` y verificar rango `1..7`, monotonía y saturación en 7 para niveles >= 7.

  - [x]* 1.4 Escribir property test para unicidad de servicios
    - **Property 10: Servicios únicos por combate**
    - **Validates: Requirements 4.5**
    - Verificar que los `service.id` de las cartas son únicos y hay exactamente `cardCount`.

  - [x]* 1.5 Escribir property test para la forma del estado de combate
    - **Property 11: Forma del estado de combate**
    - **Validates: Requirements 5.1**
    - Verificar presencia de `cardCount`, `playerPips`, `bossPips`, `cards`, `bossLabel` y `cards.length === cardCount`.

  - [x]* 1.6 Escribir property test para el formato de `bossLabel`
    - **Property 12: Formato de la etiqueta del jefe**
    - **Validates: Requirements 5.2**
    - Verificar que `bossLabel` concatena un nombre de guardián no vacío con ` — Nivel {level}`.

- [x] 2. Reimplementar el procesamiento de respuestas y el bloqueo de cartas
  - [x] 2.1 Ajustar `answerCard(fight, idx, chosenIdx)` en `src/combat/fight.js`
    - Si `fight.resolved` es `true`, retornar `{ correct: false, resolved: true, outcome: null }` sin mutar nada.
    - Añadir salvaguarda de índice inválido: si `fight.cards[idx]` es `undefined`, retornar `{ correct: false, resolved: fight.resolved, outcome: null }` sin mutar (no-op defensivo).
    - Si la carta está bloqueada (`card.locked === true`), retornar `{ correct: false, resolved: false, outcome: null }` sin mutar nada.
    - Bloquear la carta (`card.locked = true`) ANTES de evaluar la respuesta.
    - Evaluar `correct = (chosenIdx === card.question.correct)`; si es correcta `bossPips = Math.max(0, bossPips - 1)`, si no `playerPips = Math.max(0, playerPips - 1)`.
    - Resolver en orden estricto: `bossPips <= 0` → `resolved = true`, `outcome = 'win'`; si no, `playerPips <= 0` → `resolved = true`, `outcome = 'lose'`; en otro caso `outcome = null` (win tiene prioridad sobre lose).
    - Retornar `{ correct, resolved: fight.resolved, outcome }`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3_

  - [x]* 2.2 Escribir property test para el bloqueo permanente de cartas
    - **Property 1: Responder bloquea la carta de forma permanente**
    - **Validates: Requirements 1.1, 1.5**

  - [x]* 2.3 Escribir property test para no-op ante carta bloqueada o combate resuelto
    - **Property 2: Responder una carta bloqueada o un combate resuelto no altera el estado**
    - **Validates: Requirements 1.2, 1.3, 2.6, 3.3**

  - [x]* 2.4 Escribir property test para la persistencia de la pregunta
    - **Property 3: La pregunta de una carta nunca se sustituye**
    - **Validates: Requirements 1.4**
    - Verificar identidad referencial del objeto `question` tras cualquier secuencia de respuestas.

  - [x]* 2.5 Escribir property test para la aplicación del daño y el resultado de la respuesta
    - **Property 4: Aplicación correcta del daño y del resultado de la respuesta**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x]* 2.6 Escribir property test para la victoria estable
    - **Property 5: bossPips en 0 produce victoria estable**
    - **Validates: Requirements 2.4, 3.1**
    - Derivar respuestas correctas a partir de `card.question.correct`; verificar estabilidad del resultado ante acciones posteriores.

  - [x]* 2.7 Escribir property test para la derrota estable
    - **Property 6: playerPips en 0 (con bossPips > 0) produce derrota estable**
    - **Validates: Requirements 2.5, 3.2**

  - [x]* 2.8 Escribir property test para la resolución garantizada del combate
    - **Property 7: Todo combate se resuelve a más tardar en la última carta**
    - **Validates: Requirements 3.5**
    - Agotar todas las cartas con secuencias arbitrarias; verificar `resolved === true`, `outcome ∈ {win, lose}` y `bossPips + playerPips <= cardCount + 1` al iniciar.

- [x] 3. Eliminar `refreshCardQuestion` del módulo de combate
  - [x] 3.1 Eliminar la función y su export de `src/combat/fight.js`
    - Quitar por completo `export function refreshCardQuestion(...)` (contradice el intento único).
    - _Requirements: 1.4, 1.5_

  - [x]* 3.2 Escribir unit test que verifique que `refreshCardQuestion` ya no se exporta
    - Importar el módulo y afirmar que `refreshCardQuestion` es `undefined` en `src/combat/fight.js`.
    - _Requirements: 1.4, 1.5_

- [x] 4. Actualizar el wiring de UI en `src/main.js`
  - [x] 4.1 Modificar `onAnswer` para no reactivar cartas tras un fallo
    - Eliminar la llamada a `combat.refreshCardQuestion` y el bloque `setTimeout` que hacía flip-back con nueva pregunta.
    - Dejar las cartas respondidas visualmente bloqueadas de forma permanente (mantener clase `locked` y botones deshabilitados) hasta que el combate se resuelva.
    - Conservar el flujo de `outcome === 'win'` / `outcome === 'lose'` (banners, sfx y `endFight`) sin cambios.
    - _Requirements: 1.1, 1.5, 3.3_

- [x] 5. Checkpoint - Verificar lógica y wiring
  - Ejecutar `npm test` (vitest). Ensure all tests pass, ask the user if questions arise.

- [x] 6. Cobertura de ejemplos y casos borde
  - [x]* 6.1 Escribir unit tests de ejemplos y bordes en `src/combat/fight.test.js`
    - `startBossFight(1).cardCount === 1` (Requirement 4.3).
    - Bordes de `cardCount`: `level = 6` → 6; `level = 7` → 7; `level = 8` y `level = 100` → 7.
    - Tabla de umbrales por `cardCount` (1..7) de la sección Data Models como casos concretos.
    - `bossLabel` para un nivel dentro del rango de `BOSS_NAMES` y para un nivel que excede su longitud (se usa el último guardián).
    - _Requirements: 4.2, 4.3, 4.4, 5.2, 5.3_

- [x] 7. Checkpoint final - Ejecutar la suite completa
  - Ejecutar `npm test`. Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (tests) y pueden omitirse para un MVP más rápido, aunque se recomienda implementarlas por ser un módulo de lógica pura con propiedades universales claras.
- Cada tarea referencia cláusulas de requisitos específicas para trazabilidad.
- Cada propiedad de la sección Correctness Properties del diseño se implementa con un único test basado en propiedades, anotado con su número de propiedad y las cláusulas que valida.
- Los property tests usan `fast-check` con mínimo 100 iteraciones (`{ numRuns: 100 }`) y no tocan el DOM ni el audio.
- `refreshCardQuestion` se elimina; cualquier consumidor que la importe fallará de forma visible y temprana (preferible a una regresión silenciosa).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["1.2"] },
    { "id": 5, "tasks": ["1.3"] },
    { "id": 6, "tasks": ["1.4"] },
    { "id": 7, "tasks": ["1.5"] },
    { "id": 8, "tasks": ["1.6"] },
    { "id": 9, "tasks": ["2.2"] },
    { "id": 10, "tasks": ["2.3"] },
    { "id": 11, "tasks": ["2.4"] },
    { "id": 12, "tasks": ["2.5"] },
    { "id": 13, "tasks": ["2.6"] },
    { "id": 14, "tasks": ["2.7"] },
    { "id": 15, "tasks": ["2.8"] },
    { "id": 16, "tasks": ["3.2"] },
    { "id": 17, "tasks": ["6.1"] }
  ]
}
```
