# Implementation Plan: base-platform-canvas-clamp

## Overview

Este plan corrige `createTowerState(width, height)` y `resetGame(state, width, height)` en `src/engine/tower.js` (Bug_Condition: `width !== undefined AND width < BASE_PLATFORM_WIDTH`) para que el ancho de la Plataforma Base (`baseFloor`) se acote a `width` en canvases angostos, en vez de fijarse incondicionalmente a `BASE_PLATFORM_WIDTH` (630px) vía `computeBasePlatformWidth()`. Sigue la metodología de Bug Condition: primero un test de exploración que falla sobre el código sin corregir (confirmando el bug), luego tests de preservación que pasan sobre el código sin corregir (capturando el comportamiento de escritorio a conservar), después el fix quirúrgico en ambas funciones, y finalmente verificación de que ambos conjuntos de tests pasan. Todos los tests nuevos se añaden a `src/engine/tower.test.js` (ya existe), sin sobrescribir los tests existentes.

## Tasks

- [x] 1. Escribir el test de exploración de la condición de bug (ANTES del fix)
  - **Property 1: Bug Condition** - El ancho de la Plataforma Base excede `width` en canvases angostos
  - **IMPORTANT**: Escribir este property-based test ANTES de implementar el fix. **DO NOT** intentar arreglar el test ni el código cuando falle.
  - **GOAL**: Surfacear contraejemplos que demuestren que `createTowerState`/`resetGame` asignan `baseFloor.width = BASE_PLATFORM_WIDTH` sin acotar a `width`, y que `baseFloor.x` resulta negativo, confirmando el diagnóstico de causa raíz del design.
  - **Scoped PBT Approach**: Usar `fast-check` para generar `width` en `[MIN_WIDTH, BASE_PLATFORM_WIDTH - 1]` (canvas angosto) y un `height` arbitrario razonable, y afirmar `floors[0].width === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, width))` y `floors[0].x === (width - floors[0].width) / 2` (el comportamiento ESPERADO tras el fix, según `isBugCondition`/Property 1 del design), tanto para `createTowerState(width, height)` como para `resetGame(state, width, height)` sobre un `state` preexistente
  - Incluir también los ejemplos concretos del design como casos fijos dentro del mismo test o como aserciones adicionales: móvil típico (`width = 375`, esperado `floors[0].width = 375`, `floors[0].x = 0`) y extremo angosto (`width = 300`, esperado `floors[0].width = 300`, `floors[0].x = 0`)
  - Ejecutar el test sobre el código SIN corregir (estado actual de `createTowerState`/`resetGame`)
  - **EXPECTED OUTCOME**: el test FALLA (esto es correcto, confirma que el bug existe: `floors[0].width === 630` y `floors[0].x` negativo en vez del valor acotado/centrado esperado)
  - Documentar el/los contraejemplo(s) obtenidos (p.ej. con `width = 375`, `createTowerState` devuelve `floors[0].width: 630` y `floors[0].x: -127.5` en vez de `375`/`0`)
  - Marcar la tarea como completa cuando el test esté escrito, ejecutado, y la falla documentada
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Escribir los tests de preservación (ANTES del fix, deben pasar sobre código sin corregir)
  - **Property 2: Preservation** - El ancho y la posición de la Plataforma Base en escritorio permanecen sin cambios
  - **IMPORTANT**: Seguir la metodología observation-first: observar el comportamiento del código SIN corregir para los casos no-bug, y capturarlo como oráculo de referencia antes de escribir las aserciones.
  - Observar: para `width >= BASE_PLATFORM_WIDTH` o `width === undefined`, `createTowerState`/`resetGame` producen `floors[0].width === BASE_PLATFORM_WIDTH` (630) y `floors[0].x === (width - BASE_PLATFORM_WIDTH) / 2`
  - Observar: para cualquier `width` (angosto o no), el resto de los campos de `baseFloor` (`bottom`, `top`, `height`, `isDoor`) y el resto del estado construido/reiniciado (nubes, `moveSpeed`, `perfectStreak`, `streakWidthBonus`, `camElev`/`camElevTarget`, `anchorScreenY`, `knight`, `doorsPassed`, `pendingBossLevel`, `activeBiome`, `activeTimeOfDay`) no dependen de `width` de la plataforma y permanecen inalterados
  - Escribir un property-based test (`fast-check`) que, para `width` generado aleatoriamente con `width >= BASE_PLATFORM_WIDTH` (incluyendo `undefined`), verifique que `floors[0].width === BASE_PLATFORM_WIDTH` y `floors[0].x === (width - BASE_PLATFORM_WIDTH) / 2` para `createTowerState` (Property 2 del design, caso escritorio)
  - Escribir un segundo property-based test equivalente para `resetGame` sobre un `state` preexistente (construido con un `width` distinto), verificando que la nueva `baseFloor` reconstruida cumple el mismo criterio de preservación
  - Escribir un tercer test (unitario o de propiedad) que, para `width` arbitrario (angosto o no), verifique que `bottom`, `top`, `height`, `isDoor` de `baseFloor` permanecen `0`, `64`, `64`, `false` respectivamente, y que el resto de los campos del `state` no relacionados con `baseFloor.width`/`baseFloor.x` no cambian entre el código original y el corregido (comparar por igualdad estructural, excluyendo `seed`/`Math.random()` no determinísticos)
  - Ejecutar los tests sobre el código SIN corregir
  - **EXPECTED OUTCOME**: los tres tests PASAN (confirman el comportamiento base a preservar)
  - Marcar la tarea como completa cuando los tests estén escritos, ejecutados, y pasando sobre código sin corregir
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Checkpoint — exploración y preservación documentadas antes del fix
  - Confirmar que el test de la tarea 1 falla y los tests de la tarea 2 pasan sobre el código actual (sin corregir). Ensure all tests pass as described, ask the user if questions arise.

- [x] 4. Corregir `createTowerState` y `resetGame` para acotar el ancho de la Plataforma Base a `width`

  - [x] 4.1 Implementar el fix quirúrgico en `createTowerState` (`src/engine/tower.js`)
    - Antes de construir `baseFloor`, calcular `const basePlatformWidth = Math.max(MIN_WIDTH, Math.min(computeBasePlatformWidth(), width ?? Infinity));`
    - Reemplazar `x: (width - computeBasePlatformWidth()) / 2` por `x: (width - basePlatformWidth) / 2`, y `width: computeBasePlatformWidth()` por `width: basePlatformWidth`
    - No modificar `bottom`, `top`, `height`, `isDoor`, `seed` de `baseFloor`, ni el resto de `createTowerState` (nubes, `moveSpeed`, `perfectStreak`, `streakWidthBonus`, `camElev`/`camElevTarget`, `anchorScreenY`, `knight`, `doorsPassed`, `pendingBossLevel`, `lastTs`, `torchSeed`, `activeBiome`, `activeTimeOfDay`)
    - No modificar `computeBasePlatformWidth()` en sí (sigue sin argumentos, devolviendo `BASE_PLATFORM_WIDTH`)
    - _Bug_Condition: width !== undefined AND width < BASE_PLATFORM_WIDTH_
    - _Expected_Behavior: basePlatformWidth === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, width)) (Property 1 del design)_
    - _Preservation: para width >= BASE_PLATFORM_WIDTH o undefined, basePlatformWidth === BASE_PLATFORM_WIDTH sin cambios (Property 2)_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 4.2 Implementar el fix quirúrgico equivalente en `resetGame` (`src/engine/tower.js`)
    - Aplicar exactamente el mismo cambio que en 4.1, dentro de la construcción de `baseFloor` en `resetGame`: calcular `basePlatformWidth` con la misma fórmula y usarlo en `x`/`width` de `baseFloor`
    - No modificar el resto de `resetGame` (`state.moveSpeed`, `state.perfectStreak`, `state.streakWidthBonus`, `state.camElevTarget`/`state.camElev`, `state.anchorScreenY`, `state.knight.*`, `state.doorsPassed`, `state.pendingBossLevel`, `state.moving = newMovingBlock(state, baseFloor, width)`, `state.activeBiome`, `state.activeTimeOfDay`, `state.clouds`), que deben seguir recibiendo/usando la `baseFloor` ya corregida sin cambios adicionales
    - _Bug_Condition: width !== undefined AND width < BASE_PLATFORM_WIDTH_
    - _Expected_Behavior: basePlatformWidth === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, width)) (Property 1 del design)_
    - _Preservation: para width >= BASE_PLATFORM_WIDTH o undefined, basePlatformWidth === BASE_PLATFORM_WIDTH sin cambios; resto de resetGame sin cambios (Property 2)_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.4, 3.5_

  - [x] 4.3 Verificar que el test de exploración de la tarea 1 ahora pasa
    - **Property 1: Expected Behavior** - El ancho de la Plataforma Base se acota a `width` en canvases angostos
    - **IMPORTANT**: Re-ejecutar el MISMO test de la tarea 1, no escribir uno nuevo
    - **EXPECTED OUTCOME**: el test PASA (confirma que el bug está corregido: `floors[0].width === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, width))` y `floors[0].x` centrado, para `createTowerState` y `resetGame`)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.4 Verificar que los tests de preservación de la tarea 2 siguen pasando
    - **Property 2: Preservation** - El ancho y la posición de la Plataforma Base en escritorio permanecen sin cambios
    - **IMPORTANT**: Re-ejecutar los MISMOS tests de la tarea 2, no escribir tests nuevos
    - **EXPECTED OUTCOME**: los tres tests siguen PASANDO (confirma que no hay regresiones en escritorio ni en el resto del estado, para `createTowerState` y `resetGame`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x]* 4.5 Escribir pruebas unitarias concretas adicionales del fix
  - `createTowerState(375, height)` produce `floors[0].width === 375` y `floors[0].x === 0` (ejemplo concreto móvil)
  - `createTowerState(800, height)` produce `floors[0].width === BASE_PLATFORM_WIDTH` (630) y `floors[0].x === 85` (ejemplo concreto escritorio, sin regresión)
  - `createTowerState(30, height)` produce `floors[0].width === MIN_WIDTH` (46, piso mínimo)
  - `resetGame(state, 375, height)` produce `floors[0].width === 375` y `floors[0].x === 0`, igual que `createTowerState(375, height)`
  - `createTowerState`/`resetGame` con `width` angosto dejan `bottom === 0`, `top === 64`, `height === 64`, `isDoor === false` en `baseFloor`
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Checkpoint final
  - Ejecutar la suite completa de pruebas (`npm test` o el comando de test configurado) y confirmar que todos los tests nuevos y existentes de `src/engine/tower.test.js` pasan.
  - Ejecutar `npm run build` y confirmar que compila sin errores.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (tests adicionales) y no se implementan como parte de la ejecución automática de tareas obligatorias, pero se recomienda completarlas para tener evidencia adicional de las Correctness Properties del design.
- Los tests de propiedades usan `fast-check` (ya presente en `devDependencies`) con un mínimo de 100 ejecuciones (`numRuns: 100`), siguiendo la convención de `src/engine/tower.test.js`.
- Todos los tests nuevos de esta feature se añaden a `src/engine/tower.test.js` (ya existe), sin sobrescribir los tests existentes de `tower-ground-biome-background`/`tower-progression-scaling`/`endless-tower-difficulty-cap`/`relief-platform-width-collapse`/`relief-platform-canvas-clamp`.
- El fix está contenido enteramente en la construcción de `baseFloor` dentro de `createTowerState` y `resetGame`; no se modifica `computeBasePlatformWidth()`, `newMovingBlock`, `isReliefPlatformFloor`, `applyReliefPlatformSpeedBoost`, ni ningún otro archivo del proyecto.
- No se replica ningún cambio en el monolito `torre-de-las-nubes.html`, consistente con el enfoque de specs anteriores del proyecto.
- Esta spec es independiente de `relief-platform-canvas-clamp` (bug distinto: aquella corrige el ancho del Bloque en Movimiento generado dinámicamente para Plataforma_Respiro; esta corrige el ancho de la Plataforma Base construida al inicio del juego/reinicio) y de `relief-platform-width-collapse`. No se modifica ni se duplica ninguna de esas specs.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3"] },
    { "id": 2, "tasks": ["4.1", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4"] },
    { "id": 4, "tasks": ["4.5"] },
    { "id": 5, "tasks": ["5"] }
  ]
}
```
