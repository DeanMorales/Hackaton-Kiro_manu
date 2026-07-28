# Implementation Plan: relief-platform-canvas-clamp

## Overview

Este plan corrige `newMovingBlock` en `src/engine/tower.js` (Bug_Condition: `isReliefPlatformFloor(state.floors.length) === true AND canvasWidth !== undefined AND canvasWidth < BASE_PLATFORM_WIDTH`) para que el ancho "premio" de Plataforma_Respiro se acote a `canvasWidth` en canvases angostos, en vez de fijarse incondicionalmente a `BASE_PLATFORM_WIDTH` (630px). Sigue la metodología de Bug Condition: primero un test de exploración que falla sobre el código sin corregir (confirmando el bug), luego tests de preservación que pasan sobre el código sin corregir (capturando el comportamiento de escritorio y de la rama normal a conservar), después el fix quirúrgico, y finalmente verificación de que ambos conjuntos de tests pasan. Todos los tests nuevos se añaden a `src/engine/tower.test.js` (ya existe), sin sobrescribir los tests existentes.

## Tasks

- [x] 1. Escribir el test de exploración de la condición de bug (ANTES del fix)
  - **Property 1: Bug Condition** - El ancho de la Plataforma_Respiro excede `canvasWidth` en canvases angostos
  - **IMPORTANT**: Escribir este property-based test ANTES de implementar el fix. **DO NOT** intentar arreglar el test ni el código cuando falle.
  - **GOAL**: Surfacear contraejemplos que demuestren que `newMovingBlock` asigna `w = BASE_PLATFORM_WIDTH` sin acotar a `canvasWidth`, confirmando el diagnóstico de causa raíz del design.
  - **Scoped PBT Approach**: Usar `fast-check` para generar pisos de Plataforma_Respiro (usar `isReliefPlatformFloor` para construir/filtrar `floorNum`, p.ej. `RELIEF_PLATFORM_FIRST_FLOOR + k * RELIEF_PLATFORM_REPEAT_INTERVAL`) y `canvasWidth` en `[MIN_WIDTH, BASE_PLATFORM_WIDTH - 1]`, y afirmar `result.width === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth))` (el comportamiento ESPERADO tras el fix, según `isBugCondition`/Property 1 del design)
  - Incluir también los ejemplos concretos del design como casos fijos dentro del mismo test o como aserciones adicionales: móvil típico (`floorNum = 35`, `canvasWidth = 375`, esperado `width = 375`) y extremo angosto (`floorNum = 65`, `canvasWidth = 300`, esperado `width = 300`)
  - Ejecutar el test sobre el código SIN corregir (estado actual de `newMovingBlock`)
  - **EXPECTED OUTCOME**: el test FALLA (esto es correcto, confirma que el bug existe: `result.width === 630` en vez del valor acotado esperado)
  - Documentar el/los contraejemplo(s) obtenidos (p.ej. con `floorNum = 35` y `canvasWidth = 375`, `newMovingBlock` devuelve `width: 630` en vez de `375`)
  - Marcar la tarea como completa cuando el test esté escrito, ejecutado, y la falla documentada
  - _Requirements: 1.1, 1.2_

- [x] 2. Escribir los tests de preservación (ANTES del fix, deben pasar sobre código sin corregir)
  - **Property 2: Preservation** - El ancho de la Plataforma_Respiro en escritorio y la rama normal permanecen sin cambios
  - **IMPORTANT**: Seguir la metodología observation-first: observar el comportamiento del código SIN corregir para los casos no-bug, y capturarlo como oráculo de referencia antes de escribir las aserciones.
  - Observar: para Plataforma_Respiro con `canvasWidth >= BASE_PLATFORM_WIDTH` o `canvasWidth === undefined`, `newMovingBlock` produce `width === BASE_PLATFORM_WIDTH` (630)
  - Observar: para pisos que NO son Plataforma_Respiro, `newMovingBlock` produce `width` según la fórmula de la rama normal (`maxWidthWithStreakBonus` con `canvasWidth ?? Infinity`, más el resto aleatorio y el piso `MIN_WIDTH`), y `minX`/`maxX`/`dir` según sus fórmulas actuales
  - Observar: para Plataforma_Respiro (angosta o no), la transición de `state.moveSpeed` sigue el resultado de `applyReliefPlatformSpeedBoost(moveSpeed_antes)`
  - Escribir un property-based test (`fast-check`) que, para `floorNum` de Plataforma_Respiro generado aleatoriamente con `canvasWidth >= BASE_PLATFORM_WIDTH` (incluyendo `undefined`), verifique que `width === BASE_PLATFORM_WIDTH` (Property 2 del design, caso escritorio)
  - Escribir un segundo property-based test que, para `floorNum` que NO es Plataforma_Respiro (generado con cualquier `canvasWidth` arbitrario, incluyendo `undefined`), compare `width`/`minX`/`maxX`/`dir` de `newMovingBlock` contra la fórmula de la rama normal reimplementada en el test como oráculo de referencia (Property 2 del design, rama normal)
  - Escribir un tercer property-based test que, para `floorNum` de Plataforma_Respiro con `canvasWidth` arbitrario (angosto o no, incluyendo `undefined`), verifique que `state.moveSpeed` tras la llamada coincide exactamente con `applyReliefPlatformSpeedBoost(moveSpeed_antes)` invocado directamente (Property 3 del design)
  - Ejecutar los tests sobre el código SIN corregir
  - **EXPECTED OUTCOME**: los tres tests PASAN (confirman el comportamiento base a preservar)
  - Marcar la tarea como completa cuando los tests estén escritos, ejecutados, y pasando sobre código sin corregir
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Checkpoint — exploración y preservación documentadas antes del fix
  - Confirmar que el test de la tarea 1 falla y los tests de la tarea 2 pasan sobre el código actual (sin corregir). Ensure all tests pass as described, ask the user if questions arise.

- [x] 4. Corregir `newMovingBlock` para acotar el ancho de Plataforma_Respiro a `canvasWidth`

  - [x] 4.1 Implementar el fix quirúrgico en `newMovingBlock` (`src/engine/tower.js`)
    - Dentro del bloque `if (isReliefPlatformFloor(state.floors.length))`, reemplazar `w = BASE_PLATFORM_WIDTH;` por `w = Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth ?? Infinity));`
    - No modificar la línea `state.moveSpeed = applyReliefPlatformSpeedBoost(state.moveSpeed);`, que permanece en el mismo bloque `if`, sin condiciones adicionales
    - No modificar la rama normal (`maxWidthWithStreakBonus`, cálculo de `w` con resto aleatorio), ni `minX`/`maxX`, ni la lógica de `startFromRight`/`dir`/`x`
    - No modificar `isReliefPlatformFloor`, `applyReliefPlatformSpeedBoost`, ni ningún otro archivo
    - _Bug_Condition: isReliefPlatformFloor(state.floors.length) === true AND canvasWidth !== undefined AND canvasWidth < BASE_PLATFORM_WIDTH_
    - _Expected_Behavior: w === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth)) (Property 1 del design)_
    - _Preservation: para canvasWidth >= BASE_PLATFORM_WIDTH o undefined, w === BASE_PLATFORM_WIDTH sin cambios (Property 2); rama normal sin cambios (Property 2); applyReliefPlatformSpeedBoost invocado idénticamente sin importar el clamp de ancho (Property 3)_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Verificar que el test de exploración de la tarea 1 ahora pasa
    - **Property 1: Expected Behavior** - El ancho de la Plataforma_Respiro se acota a `canvasWidth` en canvases angostos
    - **IMPORTANT**: Re-ejecutar el MISMO test de la tarea 1, no escribir uno nuevo
    - **EXPECTED OUTCOME**: el test PASA (confirma que el bug está corregido: `result.width === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth))`)
    - _Requirements: 2.1, 2.2_

  - [x] 4.3 Verificar que los tests de preservación de la tarea 2 siguen pasando
    - **Property 2: Preservation** - El ancho de la Plataforma_Respiro en escritorio y la rama normal permanecen sin cambios
    - **IMPORTANT**: Re-ejecutar los MISMOS tests de la tarea 2, no escribir tests nuevos
    - **EXPECTED OUTCOME**: los tres tests siguen PASANDO (confirma que no hay regresiones en escritorio, en la rama normal, ni en el incremento de velocidad de Plataforma_Respiro)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 4.4 Escribir pruebas unitarias concretas adicionales del fix
  - `newMovingBlock` con `floorNum` de Plataforma_Respiro (p.ej. 35) y `canvasWidth = 375` produce `width === 375` (ejemplo concreto móvil)
  - `newMovingBlock` con `floorNum` de Plataforma_Respiro y `canvasWidth = 800` produce `width === BASE_PLATFORM_WIDTH` (630, ejemplo concreto escritorio, sin regresión)
  - `newMovingBlock` con `floorNum` de Plataforma_Respiro y `canvasWidth` extremadamente angosto (p.ej. 30) produce `width === MIN_WIDTH` (46, piso mínimo)
  - `dropBlock` seguido de la generación interna de `newMovingBlock` en el piso 35 con un `width` (parámetro) angosto simulado: el `state.moving` resultante tiene `width <= width` (el ancho del canvas pasado a `dropBlock`)
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.4_

- [ ] 5. Checkpoint final
  - Ejecutar la suite completa de pruebas (`npm test` o el comando de test configurado) y confirmar que todos los tests nuevos y existentes de `src/engine/tower.test.js` pasan.
  - Ejecutar `npm run build` y confirmar que compila sin errores.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (tests adicionales) y no se implementan como parte de la ejecución automática de tareas obligatorias, pero se recomienda completarlas para tener evidencia adicional de las Correctness Properties del design.
- Los tests de propiedades usan `fast-check` (ya presente en `devDependencies`) con un mínimo de 100 ejecuciones (`numRuns: 100`), siguiendo la convención de `src/engine/tower.test.js`.
- Todos los tests nuevos de esta feature se añaden a `src/engine/tower.test.js` (ya existe), sin sobrescribir los tests existentes de `tower-ground-biome-background`/`tower-progression-scaling`/`endless-tower-difficulty-cap`/`relief-platform-width-collapse`.
- El fix está contenido enteramente en la rama de Plataforma_Respiro dentro de `newMovingBlock`; no se modifica `isReliefPlatformFloor`, `applyReliefPlatformSpeedBoost`, la rama normal de `newMovingBlock`, `minX`/`maxX`, `computeNewFloor`, `dropBlock`, ni ningún otro archivo del proyecto.
- No se replica ningún cambio en el monolito `torre-de-las-nubes.html`, consistente con el enfoque de specs anteriores del proyecto.
- Esta spec es independiente de `relief-platform-width-collapse` (bug distinto: aquel corrige el ancho del PISO resultante al aterrizar un bloque premiado; este corrige el ancho del BLOQUE EN MOVIMIENTO generado para Plataforma_Respiro antes de que exista ningún aterrizaje). No se modifica ni se duplica esa spec.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4"] },
    { "id": 5, "tasks": ["5"] }
  ]
}
```
