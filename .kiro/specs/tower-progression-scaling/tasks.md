# Implementation Plan: tower-progression-scaling

## Overview

Este plan implementa los tres mecanismos de progresión descritos en el diseño (Plataforma Base de 630px, velocidad compuesta sin techo, y color progresivo del Bloque en Movimiento) primero en los módulos de `src/` (con tests Vitest + `fast-check`), y luego los replica manualmente en el monolito `torre-de-las-nubes.html`. El orden sigue la secuencia de datos del diagrama de diseño: primero las funciones puras y el estado del motor (`tower.js`), después el punto de integración en `main.js`, después el render (`draw.js`), y finalmente la réplica en el monolito.

## Tasks

- [x] 1. Implementar utilidades puras de ancho y velocidad en el motor
  - [x] 1.1 Añadir constantes y funciones puras en `src/engine/tower.js`
    - Añadir `BASE_PLATFORM_WIDTH = BASE_WIDTH * 3`, `SPEED_INCREMENT_FACTOR = 1.30`, `BASE_SPEED = 1.6`
    - Añadir `computeBasePlatformWidth()` (retorna `BASE_PLATFORM_WIDTH`)
    - Añadir `applySpeedBoost(currentSpeed)` (retorna `currentSpeed * SPEED_INCREMENT_FACTOR`)
    - _Requirements: 1.1, 2.2, 3.2_

  - [ ]* 1.2 Escribir property test para `applySpeedBoost` en `src/engine/tower.test.js`
    - **Property 3: `applySpeedBoost` multiplica la velocidad por 1.30 de forma compuesta y sin techo**
    - **Validates: Requirements 2.1, 2.2, 2.5, 3.1, 3.2, 3.3**

- [x] 2. Integrar ancho fijo y velocidad persistente en el estado del motor
  - [x] 2.1 Modificar `createTowerState` y `resetGame` en `src/engine/tower.js`
    - `baseFloor.width` usa `computeBasePlatformWidth()` en vez de `BASE_WIDTH`
    - Añadir `moveSpeed: BASE_SPEED` al estado retornado por `createTowerState`
    - `resetGame` restablece `state.moveSpeed = BASE_SPEED` y el `baseFloor.width` con `computeBasePlatformWidth()`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 3.4_

  - [ ]* 2.2 Escribir property test para invariante de ancho de la Plataforma Base
    - **Property 1: La Plataforma Base siempre mide 630px al inicializar o reiniciar, sin importar el tamaño del canvas**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**

  - [x] 2.3 Modificar `newMovingBlock` en `src/engine/tower.js` para leer `state.moveSpeed`
    - Eliminar `Math.min(3.6, 1.6 + state.floors.length * 0.045)` y usar `speed: state.moveSpeed`
    - _Requirements: 2.4_

  - [ ]* 2.4 Escribir property test para consistencia de velocidad en `newMovingBlock`
    - **Property 4: `newMovingBlock` siempre usa la Velocidad_Actual vigente del estado, de forma constante entre duelos**
    - **Validates: Requirements 2.4**

  - [x] 2.5 Añadir `applyDuelWinSpeedBoost(state)` exportado en `src/engine/tower.js`
    - Implementa `state.moveSpeed = applySpeedBoost(state.moveSpeed); return state.moveSpeed;`
    - No debe mutar `state.moving`
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.6 Escribir property test para `applyDuelWinSpeedBoost`
    - **Property 5: `applyDuelWinSpeedBoost` solo se refleja en el estado cuando se invoca explícitamente, y no muta el bloque en movimiento existente**
    - **Validates: Requirements 2.1, 2.3**

  - [ ]* 2.7 Escribir property test para invariante de ancho tras construcción y resize
    - **Property 2: El ancho de la Plataforma Base es invariante frente a la construcción de pisos posteriores y al resize**
    - **Validates: Requirements 1.3**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Conectar el incremento de velocidad al resultado del duelo en `main.js`
  - [x] 4.1 Modificar la rama `outcome === 'win'` en `onAnswer` de `src/main.js`
    - Llamar a `engine.applyDuelWinSpeedBoost(gameState)` antes o junto a `endFight(true)`
    - No modificar la rama `'lose'` ni la ruta de caída (`onDrop` -> `fell`)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 4.2 Escribir test unitario/integración para la llamada condicional a `applyDuelWinSpeedBoost`
    - Simular `outcome: 'win'` y verificar que se invoca `engine.applyDuelWinSpeedBoost`
    - Simular `outcome: 'lose'` y verificar que NO se invoca
    - _Requirements: 2.1, 2.3_

- [x] 5. Implementar paleta de color progresiva en el render
  - [x] 5.1 Añadir `PROGRESS_PALETTES` y `getBlockColorPalette(nivelProgreso)` en `src/render/draw.js`
    - Normalizar entradas no finitas con `Number.isFinite(nivelProgreso) ? Math.trunc(nivelProgreso) : 0`
    - Clamp con `Math.max(0, Math.min(safeLevel, PROGRESS_PALETTES.length - 1))`
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.2 Escribir property test para `getBlockColorPalette`
    - **Property 6: `getBlockColorPalette` es una función determinística con clamp para niveles de progreso altos o inválidos**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5, 4.6**

  - [x] 5.3 Modificar `drawMovingBlock` en `src/render/draw.js`
    - Añadir parámetro `nivelProgreso = 0` a la firma
    - Sustituir la paleta fija `['#b7c0d1','#8993a8']` por `getBlockColorPalette(nivelProgreso)` cuando el siguiente piso no es puerta
    - Conservar la paleta dorada especial cuando `nextIsDoor` es verdadero
    - _Requirements: 4.3, 4.4, 4.7_

  - [x] 5.4 Modificar `render(ctx, W, H, gameState)` en `src/render/draw.js`
    - Pasar `gameState.doorsPassed` como argumento `nivelProgreso` a `drawMovingBlock`
    - _Requirements: 4.2_

  - [ ]* 5.5 Escribir tests unitarios para `drawMovingBlock` y valores concretos de paleta
    - Verificar que `drawMovingBlock` con `nivelProgreso` no numérico (`undefined`, valor por defecto `0`) no lanza excepción
    - Verificar `getBlockColorPalette(0)`, `getBlockColorPalette(1)`, `getBlockColorPalette(2)`, `getBlockColorPalette(3)`, `getBlockColorPalette(4)` contra la tabla exacta de colores
    - _Requirements: 4.1, 4.3, 4.6_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Replicar manualmente los cambios en el monolito `torre-de-las-nubes.html`
  - [x] 7.1 Añadir `BASE_PLATFORM_WIDTH` y actualizar la creación de la Plataforma Base
    - Añadir `const BASE_PLATFORM_WIDTH = BASE_WIDTH*3;` junto a la constante `BASE_WIDTH` existente
    - Actualizar el código que crea `baseFloor`/`floors[0]` (en la inicialización y en `resetGame()`) para usar `BASE_PLATFORM_WIDTH` en vez de `BASE_WIDTH`
    - Añadir comentario `// tower-progression-scaling: Requirement 1.1` en el punto de cambio
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 7.2 Añadir `state.moveSpeed` en la inicialización y en `resetGame()` del monolito
    - Añadir `moveSpeed: 1.6` al objeto `state` inicial
    - En `resetGame()`, restablecer `state.moveSpeed = 1.6`
    - Añadir comentario `// tower-progression-scaling: Requirement 3.4` en `resetGame()`
    - _Requirements: 1.2, 3.4_

  - [x] 7.3 Actualizar `newMovingBlock(afterFloor)` del monolito para usar `state.moveSpeed`
    - Eliminar la fórmula `Math.min(3.6, 1.6 + state.floors.length*0.045)` y usar `speed: state.moveSpeed`
    - Añadir comentario `// tower-progression-scaling: Requirement 2.4`
    - _Requirements: 2.4_

  - [x] 7.4 Añadir el incremento de velocidad en `answerCard()` del monolito
    - Dentro del bloque que detecta `fight.bossPips<=0` (equivalente a `outcome==='win'`), añadir `state.moveSpeed *= 1.30;`
    - No modificar la rama de derrota (`playerPips<=0`) ni la ruta de caída
    - Añadir comentario `// tower-progression-scaling: Requirement 2.1, 2.2, 2.3`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 7.5 Añadir `getBlockColorPalette(nivelProgreso)` local y conectarlo a `drawMovingBlock()` del monolito
    - Añadir una función local idéntica a la de `draw.js` (mismas paletas y clamp) dentro de la IIFE, en la sección RENDER
    - Modificar `drawMovingBlock()` para usar `getBlockColorPalette(state.doorsPassed)` en vez de la paleta fija, conservando la paleta dorada de puerta inminente
    - Añadir comentario `// tower-progression-scaling: Requirement 4.1, 4.3, 4.4, 4.5, 4.6, 4.7`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

## Notes

- Las tareas marcadas con `*` son opcionales (tests) y no se implementan como parte de la ejecución automática de tareas.
- Las tareas de la sección 7 (monolito) no tienen tests automatizados, tal como indica el diseño; su verificación es manual/QA exploratorio y no está dentro del alcance de este plan.
- Los tests de propiedades usan `fast-check` (ya presente en `devDependencies`) con un mínimo de 100 ejecuciones (`numRuns: 100`), siguiendo la convención de `src/data/scoreManager.test.js`.
- Ubicación sugerida de los nuevos archivos de test: `src/engine/tower.test.js` (Properties 1, 2, 3, 4, 5) y `src/render/draw.test.js` (Property 6 y tests unitarios de paleta).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "5.1"] },
    { "id": 1, "tasks": ["2.1", "5.3", "1.2"] },
    { "id": 2, "tasks": ["2.3", "5.4", "2.2", "5.2"] },
    { "id": 3, "tasks": ["2.5", "2.4", "5.5", "7.1"] },
    { "id": 4, "tasks": ["4.1", "2.6", "7.2"] },
    { "id": 5, "tasks": ["4.2", "2.7", "7.3"] },
    { "id": 6, "tasks": ["7.4"] },
    { "id": 7, "tasks": ["7.5"] }
  ]
}
```
