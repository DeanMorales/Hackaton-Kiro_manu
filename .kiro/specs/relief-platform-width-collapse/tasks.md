# Implementation Plan: relief-platform-width-collapse

## Overview

Este plan corrige `computeNewFloor` en `src/engine/tower.js` (Bug_Condition: `movingBlock.width > prevFloor.width` con aterrizaje válido según `decidesFall(computeOverlap(...))`, sin modificar) para que el piso resultante conserve el ancho y la posición completos del Bloque en Movimiento premiado, en vez de recortarlos a la intersección con `prevFloor`. Sigue la metodología de Bug Condition: primero se escribe un test de exploración que falla sobre el código sin corregir (confirmando el bug), luego tests de preservación que pasan sobre el código sin corregir (capturando el comportamiento a conservar), después se aplica el fix quirúrgico, y finalmente se verifica que ambos conjuntos de tests pasan. Todos los tests nuevos se añaden a `src/engine/tower.test.js` (ya existe), sin sobrescribir los tests existentes.

## Tasks

- [ ] 1. Escribir el test de exploración de la condición de bug (ANTES del fix)
  - **Property 1: Bug Condition** - El piso resultante recorta el ancho de un Bloque en Movimiento premiado a la intersección con `prevFloor`
  - **IMPORTANT**: Escribir este property-based test ANTES de implementar el fix. **DO NOT** intentar arreglar el test ni el código cuando falle.
  - **GOAL**: Surfacear contraejemplos que demuestren que `computeNewFloor` recorta el ancho premiado, confirmando el diagnóstico de causa raíz del design.
  - **Scoped PBT Approach**: Usar `fast-check` para generar `prevFloor`/`movingBlock` filtrados por `movingBlock.width > prevFloor.width AND decidesFall(computeOverlap(prevFloor, movingBlock)) === false` (aterrizaje válido evaluado con las funciones de caída existentes, sin modificar), y afirmar `result.width === movingBlock.width && result.x === movingBlock.x` (el comportamiento ESPERADO tras el fix, según `isBugCondition`/Property 1 del design).
  - Incluir también los ejemplos concretos del design como casos fijos dentro del mismo test o como aserciones adicionales: Plataforma_Respiro con solapamiento total (`prevFloor = {x:400,width:200}`, `movingBlock = {x:380,width:400}`) y Bono_Racha_Perfecta con solapamiento parcial (`prevFloor = {x:500,width:210}`, `movingBlock = {x:470,width:300}`)
  - Ejecutar el test sobre el código SIN corregir (estado actual de `computeNewFloor`)
  - **EXPECTED OUTCOME**: el test FALLA (esto es correcto, confirma que el bug existe: `result.width < movingBlock.width` en vez de `=== movingBlock.width`)
  - Documentar el/los contraejemplo(s) obtenidos (p.ej. `computeNewFloor({x:400,width:200}, {x:380,width:400}, false, 0)` devuelve `width: 200` en vez de `400`)
  - Marcar la tarea como completa cuando el test esté escrito, ejecutado, y la falla documentada
  - _Requirements: 1.1, 1.2_

- [ ] 2. Escribir los tests de preservación (ANTES del fix, deben pasar sobre código sin corregir)
  - **Property 2: Preservation** - El caso normal y la detección de caída permanecen exactamente iguales
  - **IMPORTANT**: Seguir la metodología observation-first: observar el comportamiento del código SIN corregir para los casos no-bug, y capturarlo como oráculo de referencia antes de escribir las aserciones.
  - Observar: para `movingBlock.width <= prevFloor.width`, `computeNewFloor` produce `x = max(movingBlock.x, prevFloor.x)`, `width = min(movingBlock.x+movingBlock.width, prevFloor.x+prevFloor.width) - x` (la fórmula de intersección actual)
  - Observar: `computeOverlap`/`decidesFall` producen un valor determinado para pares arbitrarios de `prevFloor`/`movingBlock`, con o sin `movingBlock.width > prevFloor.width`
  - Escribir un property-based test (`fast-check`) que, para `prevFloor`/`movingBlock` generados con `movingBlock.width <= prevFloor.width`, compare el resultado de `computeNewFloor` contra la fórmula de intersección de referencia reimplementada en el test (Property 2 del design)
  - Escribir un segundo property-based test que, para `prevFloor`/`movingBlock` completamente arbitrarios (sin filtrar por ancho relativo), verifique que `computeOverlap(prevFloor, movingBlock)` y `decidesFall(overlap)` producen el valor esperado según su propia fórmula (Property 3 del design) — esto sirve como snapshot de comportamiento pre-fix para volver a verificar después
  - Escribir un tercer property-based test para los campos no afectados (`bottom`, `top`, `height`, `isDoor`, `seed`) con aterrizaje válido, arbitrario ancho relativo (Property 4 del design)
  - Ejecutar los tests sobre el código SIN corregir
  - **EXPECTED OUTCOME**: los tres tests PASAN (confirman el comportamiento base a preservar)
  - Marcar la tarea como completa cuando los tests estén escritos, ejecutados, y pasando sobre código sin corregir
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 3. Checkpoint — exploración y preservación documentadas antes del fix
  - Confirmar que el test de la tarea 1 falla y los tests de la tarea 2 pasan sobre el código actual (sin corregir). Ensure all tests pass as described, ask the user if questions arise.

- [ ] 4. Corregir `computeNewFloor` para conservar el ancho completo del Bloque en Movimiento premiado

  - [ ] 4.1 Implementar el fix quirúrgico en `computeNewFloor` (`src/engine/tower.js`)
    - Añadir una rama condicional: si `movingBlock.width > prevFloor.width`, fijar `x = movingBlock.x` y `width = movingBlock.width` directamente, sin pasar por `left`/`right`/`overlap`
    - En el `else` (caso normal, `movingBlock.width <= prevFloor.width`), preservar exactamente la fórmula actual de intersección, reutilizando `computeOverlap(prevFloor, movingBlock)` en vez de reimplementar `left`/`right` inline
    - No modificar `bottom`, `top`, `height`, `isDoor`, `seed`: deben calcularse exactamente igual en ambas ramas
    - No modificar `computeOverlap`, `decidesFall`, ni el orden/argumentos de su invocación dentro de `dropBlock`
    - _Bug_Condition: movingBlock.width > prevFloor.width AND decidesFall(computeOverlap(prevFloor, movingBlock)) === false_
    - _Expected_Behavior: result.width === movingBlock.width AND result.x === movingBlock.x (Property 1 del design)_
    - _Preservation: para movingBlock.width <= prevFloor.width, resultado idéntico a la fórmula de intersección original (Property 2); computeOverlap/decidesFall sin cambios para cualquier input (Property 3); bottom/top/height/isDoor/seed sin cambios (Property 4)_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 4.2 Verificar que el test de exploración de la tarea 1 ahora pasa
    - **Property 1: Expected Behavior** - El piso resultante conserva el ancho completo del Bloque en Movimiento premiado
    - **IMPORTANT**: Re-ejecutar el MISMO test de la tarea 1, no escribir uno nuevo
    - **EXPECTED OUTCOME**: el test PASA (confirma que el bug está corregido: `result.width === movingBlock.width`, `result.x === movingBlock.x`)
    - _Requirements: 2.1, 2.2_

  - [ ] 4.3 Verificar que los tests de preservación de la tarea 2 siguen pasando
    - **Property 2: Preservation** - El caso normal y la detección de caída permanecen exactamente iguales
    - **IMPORTANT**: Re-ejecutar los MISMOS tests de la tarea 2, no escribir tests nuevos
    - **EXPECTED OUTCOME**: los tres tests siguen PASANDO (confirma que no hay regresiones en el caso normal, en `computeOverlap`/`decidesFall`, ni en los campos no afectados)
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ]* 4.4 Escribir pruebas unitarias concretas adicionales del fix
  - `computeNewFloor` con `movingBlock` más ancho que `prevFloor` y aterrizaje válido produce `width === movingBlock.width`, `x === movingBlock.x` (ejemplo concreto de Plataforma_Respiro)
  - `computeNewFloor` con `movingBlock.width <= prevFloor.width` produce el mismo resultado que la fórmula de intersección de referencia (ejemplo concreto, valores fijos)
  - `dropBlock` con un `state.moving` premiado (`width > prevFloor.width`) pero con solapamiento insuficiente (`overlap < 16`) sigue devolviendo `{ type: 'fell', ... }`, sin construir ningún piso ni cambiar `state.floors`
  - `dropBlock` con un `state.moving` premiado y solapamiento suficiente empuja a `state.floors` un piso con `width === movingBlock.width` y genera un siguiente `newMovingBlock` válido (`minX <= maxX`, `width` dentro de `[MIN_WIDTH, BASE_PLATFORM_WIDTH]`)
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.4_

- [ ] 5. Checkpoint final
  - Ejecutar la suite completa de pruebas (`npm test` o el comando de test configurado) y confirmar que todos los tests nuevos y existentes de `src/engine/tower.test.js` pasan.
  - Ejecutar `npm run build` y confirmar que compila sin errores.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (tests adicionales) y no se implementan como parte de la ejecución automática de tareas obligatorias, pero se recomienda completarlas para tener evidencia adicional de las Correctness Properties del design.
- Los tests de propiedades usan `fast-check` (ya presente en `devDependencies`) con un mínimo de 100 ejecuciones (`numRuns: 100`), siguiendo la convención de `src/engine/tower.test.js`.
- Todos los tests nuevos de esta feature se añaden a `src/engine/tower.test.js` (ya existe), sin sobrescribir los tests existentes de `tower-ground-biome-background`/`tower-progression-scaling`/`endless-tower-difficulty-cap`.
- El fix está contenido enteramente en `computeNewFloor`; no se modifica `computeOverlap`, `decidesFall`, `dropBlock` (salvo por el resultado que recibe de `computeNewFloor`), `newMovingBlock`, ni ningún otro archivo del proyecto.
- No se replica ningún cambio en el monolito `torre-de-las-nubes.html`, consistente con el enfoque de specs anteriores del proyecto.

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
