# Implementation Plan: endless-tower-difficulty-cap

## Overview

Este plan implementa el tope de velocidad tras el 5º Duelo Ganado, las Plataformas de Respiro periódicas en la Fase_Estable, y el Bono de ancho por Racha Perfecta, extendiendo `src/engine/tower.js` y `src/combat/fight.js`, e integrándolos en `src/main.js`. El orden sigue la secuencia de datos del diagrama de diseño: primero el resultado de Duelo Perfecto en `fight.js`, luego las funciones puras y el estado nuevo en `tower.js` (tope de velocidad, racha, plataformas de respiro), después el punto de integración en `main.js`. No se replica nada en el monolito `torre-de-las-nubes.html` (fuera de alcance de este spec, consistente con `combat-animation-sfx`). `src/engine/tower.test.js` ya existe (de `tower-progression-scaling`); los nuevos tests se añaden a ese archivo sin sobrescribir los existentes.

## Tasks

- [x] 1. Exponer si un Duelo Ganado fue perfecto en `src/combat/fight.js`
  - [x] 1.1 Añadir `failedAnyCard: false` al objeto retornado por `startBossFight(level)`
    - _Requirements: 3.1, 3.2_

  - [ ] 1.2 Marcar `fight.failedAnyCard = true` en la rama de fallo de `answerCard`
    - Dentro de la rama `else` (fallo) que ya hace `card.locked = true; fight.playerPips = Math.max(0, fight.playerPips - 1);`, añadir `fight.failedAnyCard = true;`
    - _Requirements: 3.2_

  - [ ] 1.3 Añadir el campo `perfect` al valor de retorno de `answerCard`
    - Cambiar `return { correct, resolved: fight.resolved, outcome };` a `return { correct, resolved: fight.resolved, outcome, perfect: outcome === 'win' ? !fight.failedAnyCard : null };`
    - _Requirements: 3.1, 3.2_

  - [ ]* 1.4 Escribir pruebas unitarias de `perfect` en `answerCard`
    - Un Duelo de 1 carta acertada a la primera devuelve `perfect: true`
    - Un Duelo con al menos una carta fallida antes de ganar devuelve `perfect: false`
    - Un Duelo perdido devuelve `perfect: null`
    - Un Duelo no resuelto (`outcome === null`) devuelve `perfect: null`
    - _Requirements: 3.1, 3.2_

- [ ] 2. Checkpoint — resultado de Duelo Perfecto expuesto en `fight.js`
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Añadir constantes y estado nuevo del Tope_Velocidad en `src/engine/tower.js`
  - [ ] 3.1 Añadir las constantes `STABLE_PHASE_DUEL_THRESHOLD`, `SPEED_CAP`, `RELIEF_PLATFORM_INTERVAL`, `RELIEF_PLATFORM_WIDTH_MULTIPLIER`, `PERFECT_STREAK_BONUS_INTERVAL`, `PERFECT_STREAK_BONUS_WIDTH`
    - `STABLE_PHASE_DUEL_THRESHOLD = 5`
    - `SPEED_CAP = BASE_SPEED * Math.pow(SPEED_INCREMENT_FACTOR, STABLE_PHASE_DUEL_THRESHOLD)`
    - `RELIEF_PLATFORM_INTERVAL = 5`, `RELIEF_PLATFORM_WIDTH_MULTIPLIER = 2`
    - `PERFECT_STREAK_BONUS_INTERVAL = 3`, `PERFECT_STREAK_BONUS_WIDTH = 40`
    - _Requirements: 1.1, 2.1, 2.2, 3.4_

  - [ ] 3.2 Añadir `perfectStreak: 0`, `streakWidthBonus: 0`, `stableFloorsBuilt: 0` a `createTowerState` y a `resetGame`
    - _Requirements: 1.5, 2.5, 3.8_

  - [ ]* 3.3 Escribir property test para el reinicio completo de velocidad/racha/contadores de Fase_Estable
    - **Property 3: Reiniciar la partida restablece velocidad, racha y contadores de Fase_Estable a sus valores base**
    - **Validates: Requirements 1.5, 2.5, 3.8**

- [ ] 4. Implementar el Tope_Velocidad en `src/engine/tower.js`
  - [ ] 4.1 Añadir la función pura `applySpeedBoostWithCap(currentSpeed, doorsPassedBeforeThisWin)`
    - Si `doorsPassedBeforeThisWin >= STABLE_PHASE_DUEL_THRESHOLD`, retorna `SPEED_CAP` directamente
    - En otro caso calcula `applySpeedBoost(currentSpeed)`, y si `doorsPassedBeforeThisWin + 1 >= STABLE_PHASE_DUEL_THRESHOLD` (5º Duelo Ganado), retorna `SPEED_CAP` exacto en vez del producto flotante acumulado
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 4.2 Escribir property test para el alcance exacto y la estabilidad del Tope_Velocidad
    - **Property 1: El Tope_Velocidad se alcanza exactamente al 5º Duelo Ganado y se mantiene constante después**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.6**

  - [ ]* 4.3 Escribir property test de equivalencia con el comportamiento pre-tope de `tower-progression-scaling`
    - **Property 2: El comportamiento previo al Tope_Velocidad es idéntico al de `tower-progression-scaling`**
    - **Validates: Requirement 1.4**

  - [ ] 4.4 Modificar `applyDuelWinSpeedBoost(state)` para usar `applySpeedBoostWithCap`
    - Cambiar `state.moveSpeed = applySpeedBoost(state.moveSpeed);` por `state.moveSpeed = applySpeedBoostWithCap(state.moveSpeed, state.doorsPassed);`
    - No cambiar la firma de la función ni su punto de invocación existente
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 5. Checkpoint — Tope_Velocidad completo en el motor
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implementar el seguimiento de Racha_Perfecta y Bono_Racha_Perfecta en `src/engine/tower.js`
  - [ ] 6.1 Añadir `registerDuelWinForStreak(state, perfect)` exportada
    - Si `perfect` es falsy, `state.perfectStreak = 0` y retorna
    - Si `perfect` es true, incrementa `state.perfectStreak`; si `state.doorsPassed >= STABLE_PHASE_DUEL_THRESHOLD` y `state.perfectStreak % PERFECT_STREAK_BONUS_INTERVAL === 0`, suma `PERFECT_STREAK_BONUS_WIDTH` a `state.streakWidthBonus`
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

  - [ ] 6.2 Añadir `resetPerfectStreak(state)` exportada
    - Implementa `state.perfectStreak = 0;` sin tocar `state.streakWidthBonus`
    - _Requirements: 3.3, 3.7_

  - [ ]* 6.3 Escribir property test para la actualización de la Racha_Perfecta
    - **Property 6: La Racha_Perfecta se incrementa solo con Duelos Perfectos consecutivos y se reinicia ante cualquier interrupción**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 6.4 Escribir property test para el otorgamiento acumulativo e irreversible del Bono_Racha_Perfecta
    - **Property 7: El Bono_Racha_Perfecta se otorga exactamente cada 3 Duelos Perfectos consecutivos dentro de la Fase_Estable, es acumulativo y nunca se revierte**
    - **Validates: Requirements 3.4, 3.6, 3.7**

  - [ ]* 6.5 Escribir property test para la ausencia de bono antes de la Fase_Estable
    - **Property 8: Ningún Duelo Perfecto anterior a la Fase_Estable otorga Bono_Racha_Perfecta, aunque sí incrementa la racha**
    - **Validates: Requirement 3.5**

- [ ] 7. Checkpoint — Racha_Perfecta y Bono_Racha_Perfecta completos en el motor
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implementar Plataformas_Respiro y aplicar el Bono_Racha_Perfecta al ancho en `newMovingBlock`
  - [ ] 8.1 Añadir la función pura `isReliefPlatformFloor(stableFloorsBuiltBeforeThisFloor)`
    - Retorna `(stableFloorsBuiltBeforeThisFloor + 1) % RELIEF_PLATFORM_INTERVAL === 0`
    - _Requirements: 2.1, 2.3, 2.4_

  - [ ]* 8.2 Escribir property test para la elegibilidad determinística de Plataforma_Respiro
    - **Property 4: Las Plataformas_Respiro solo ocurren en la Fase_Estable, exactamente cada 5 pisos construidos desde su inicio**
    - **Validates: Requirements 2.1, 2.3, 2.4**

  - [ ] 8.3 Modificar `newMovingBlock(state, afterFloor, canvasWidth)` para aplicar `streakWidthBonus` y Plataforma_Respiro
    - Calcular `inStablePhase = state.doorsPassed >= STABLE_PHASE_DUEL_THRESHOLD`
    - Calcular `maxWidthWithStreakBonus = Math.min(afterFloor.width + (inStablePhase ? state.streakWidthBonus : 0), canvasWidth ?? Infinity)` y usarlo en vez de `afterFloor.width` al derivar `w`
    - Si `inStablePhase && isReliefPlatformFloor(state.stableFloorsBuilt)`, aplicar `w = Math.min(BASE_PLATFORM_WIDTH, w * RELIEF_PLATFORM_WIDTH_MULTIPLIER)`
    - No modificar el cálculo de `minX`/`maxX`/`dir`/`x`/`h`/`speed` más allá de que ahora dependen del nuevo `w`
    - _Requirements: 2.1, 2.2, 2.4, 3.4, 3.6, 4.2_

  - [ ]* 8.4 Escribir property test para el ancho exacto de una Plataforma_Respiro
    - **Property 5: El ancho de una Plataforma_Respiro es exactamente el doble del ancho que tendría sin ese mecanismo, acotado a 630px**
    - **Validates: Requirements 2.2, 4.2**

  - [ ] 8.5 Incrementar `state.stableFloorsBuilt` en `dropBlock` cuando el piso recién construido pertenece a la Fase_Estable
    - Insertar, inmediatamente después de `state.floors.push(newFloor);` y antes de generar el siguiente `newMovingBlock`, el bloque: `if (state.doorsPassed >= STABLE_PHASE_DUEL_THRESHOLD) { state.stableFloorsBuilt += 1; }`
    - No reordenar ninguna otra línea de `dropBlock`
    - _Requirements: 2.1, 2.5_

  - [ ]* 8.6 Escribir pruebas unitarias concretas de `newMovingBlock`/`dropBlock` con Plataforma_Respiro y Bono_Racha_Perfecta combinados
    - Un piso NO elegible como Plataforma_Respiro y sin bono de racha produce el ancho normal sin cambios
    - Un piso elegible como Plataforma_Respiro sin bono de racha duplica el ancho normal, acotado a 630px
    - Un piso elegible como Plataforma_Respiro CON `streakWidthBonus > 0` vigente duplica el ancho YA incrementado por el bono, acotado a 630px
    - _Requirements: 2.2, 4.2_

- [ ] 9. Checkpoint — Plataformas_Respiro y aplicación del Bono_Racha_Perfecta completos en el motor
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integrar el tope de velocidad y el seguimiento de racha en `src/main.js`
  - [ ] 10.1 Añadir `engine.registerDuelWinForStreak(gameState, result.perfect)` en la rama `outcome === 'win'` de `onAnswer`
    - Debe llamarse después de `engine.applyDuelWinSpeedBoost(gameState)` y antes de que `endFight(true)` incremente `gameState.doorsPassed`
    - No modificar ninguna otra línea de esa rama
    - _Requirements: 1.1, 3.1, 3.2, 3.4_

  - [ ] 10.2 Añadir `engine.resetPerfectStreak(gameState)` en la rama `outcome === 'lose'` de `onAnswer`
    - _Requirements: 3.3_

  - [ ] 10.3 Añadir `engine.resetPerfectStreak(gameState)` en la rama `result.type === 'fell'` de `onDrop`
    - _Requirements: 3.3_

  - [ ]* 10.4 Escribir pruebas unitarias/de integración para las tres llamadas nuevas en `main.js`
    - Simular `outcome: 'win'` con `perfect: true`/`perfect: false` y verificar que `registerDuelWinForStreak` se invoca con el valor correcto en cada caso
    - Simular `outcome: 'lose'` y verificar que se invoca `resetPerfectStreak`
    - Simular una caída (`result.type === 'fell'`) y verificar que se invoca `resetPerfectStreak`
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 11. Checkpoint — integración en main.js completa
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 12. Escribir la property test de independencia entre velocidad y ancho
  - **Property 9: El Tope_Velocidad y los mecanismos de ancho (Plataforma_Respiro, Bono_Racha_Perfecta) son completamente independientes entre sí**
  - **Validates: Requirement 4.3**

- [ ] 13. Checkpoint final
  - Ejecutar la suite completa de pruebas (`npm test`) y confirmar que todas las pruebas nuevas y existentes pasan, incluyendo las pruebas ya existentes de `src/engine/tower.js`, `src/combat/fight.js`, `src/render/draw.js` y `src/main.js` (comportamiento previo no alterado salvo lo descrito en este plan).
  - Ejecutar `npm run build` y confirmar que compila sin errores.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (tests) y no se implementan como parte de la ejecución automática de tareas obligatorias, pero se recomienda completarlas para tener evidencia de las Correctness Properties del diseño.
- Los tests de propiedades usan `fast-check` (ya presente en `devDependencies`) con un mínimo de 100 ejecuciones (`numRuns: 100`), siguiendo la convención de `src/engine/tower.test.js` y `src/data/scoreManager.test.js`.
- `src/engine/tower.test.js` ya existe; todas las nuevas properties/tests de esta feature se añaden a ese archivo (o a `src/combat/fight.test.js` para la Property 6 si se prefiere aislar lo relativo a `answerCard`), sin sobrescribir los tests existentes de `tower-ground-biome-background`/`tower-progression-scaling`.
- No se modifica `src/render/draw.js`, `src/render/spriteEngine.js`, ni `src/data/bossRoster.js` en ningún punto de este plan.
- No se replica ningún cambio en el monolito `torre-de-las-nubes.html`, consistente con el enfoque más reciente del proyecto (`combat-animation-sfx`).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "3.1"] },
    { "id": 2, "tasks": ["1.3", "3.2"] },
    { "id": 3, "tasks": ["1.4", "3.3", "4.1"] },
    { "id": 4, "tasks": ["2", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4"] },
    { "id": 6, "tasks": ["5", "6.1", "8.1"] },
    { "id": 7, "tasks": ["6.2", "8.2"] },
    { "id": 8, "tasks": ["6.3", "6.4", "6.5", "8.3"] },
    { "id": 9, "tasks": ["7", "8.4", "8.5"] },
    { "id": 10, "tasks": ["8.6"] },
    { "id": 11, "tasks": ["9", "10.1"] },
    { "id": 12, "tasks": ["10.2", "10.3"] },
    { "id": 13, "tasks": ["10.4"] },
    { "id": 14, "tasks": ["11", "12"] },
    { "id": 15, "tasks": ["13"] }
  ]
}
```
