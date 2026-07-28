# Implementation Plan: combat-sprite-scaling

## Overview

Se implementa el escalado proporcional de los Combat_Sprite en `src/render/bossFightRender.js` mediante cuatro funciones puras nuevas (`computeSpriteScaleFactor`, `scaleDimensions`, `scaleOffset`, `computeDrawOrigin`), cada una acompañada de sus property-based tests (fast-check) correspondientes a las 13 Correctness Properties del design. Luego se reescribe `drawCombatants()` para usar `ctx.save()`/`ctx.scale()`/`ctx.restore()` con esas funciones, se agregan tests unitarios de casos límite (escritorio W=800, móvil W=375) y una prueba estructural que confirma que `src/render/spriteEngine.js` permanece sin cambios respecto al escalado (Requirement 5.3). `src/render/spriteEngine.js` no se modifica en ningún paso.

## Tasks

- [x] 1. Implementar el cálculo del Sprite_Scale_Factor
  - [x] 1.1 Agregar constantes `Reference_Canvas_Width`/`Minimum_Scale_Factor` e implementar `computeSpriteScaleFactor(W)`
    - Exportar `Reference_Canvas_Width = 800` y `Minimum_Scale_Factor = 0.55` desde `src/render/bossFightRender.js`
    - Implementar `computeSpriteScaleFactor(W)`: devuelve `1` si `W >= Reference_Canvas_Width`, y en otro caso `clamp(W / Reference_Canvas_Width, Minimum_Scale_Factor, 1)`, tratando `W <= 0` como clamp a `Minimum_Scale_Factor` sin lanzar
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1_

  - [x]* 1.2 Escribir property tests para `computeSpriteScaleFactor` en `src/render/bossFightRender.test.js`
    - **Property 1: El factor de escala satura en 1 para canvases anchos** — _Validates: Requirements 1.2_
    - **Property 2: El factor de escala es monótono no decreciente en `W`** — _Validates: Requirements 1.3_
    - **Property 3: El factor de escala siempre está en `[Minimum_Scale_Factor, 1]`** — _Validates: Requirements 1.4, 1.5_
    - **Property 4: El factor de escala es determinista (función pura)** — _Validates: Requirements 1.6_

- [x] 2. Implementar el escalado de dimensiones y offsets
  - [x] 2.1 Implementar `scaleDimensions({ width, height }, factor)` y `scaleOffset(offsetPx, factor)`
    - `scaleDimensions` multiplica `width`/`height` por `factor` sin leer ni mutar ninguna instancia de `SpriteAnimationEngine`
    - `scaleOffset` calcula `offsetPx * factor`
    - _Requirements: 2.1, 2.2, 2.3, 3.3_

  - [x]* 2.2 Escribir property test para `scaleDimensions` en `src/render/bossFightRender.test.js`
    - **Property 5: El escalado nunca agranda un sprite y es exacto en los bordes del dominio** — _Validates: Requirements 2.1, 2.4, 2.5_

  - [x]* 2.3 Escribir property test para `scaleOffset` en `src/render/bossFightRender.test.js`
    - **Property 7: Los Combat_Layout_Offset se escalan proporcionalmente al mismo factor** — _Validates: Requirements 3.3_

- [x] 3. Implementar el cálculo del origen de dibujo escalado
  - [x] 3.1 Implementar `computeDrawOrigin({ groundY, canvasWidth, xRatio, scaledWidth, scaledHeight, horizontalOffsetPx, verticalOffsetPx, scaleFactor })`
    - Calcular `y = groundY - scaledHeight + scaleOffset(verticalOffsetPx, scaleFactor)` y `x = canvasWidth * xRatio - scaledWidth / 2 + scaleOffset(horizontalOffsetPx, scaleFactor)`, devolviendo coordenadas de pantalla en píxeles reales
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x]* 3.2 Escribir property test para el alineamiento con la línea de suelo en `src/render/bossFightRender.test.js`
    - **Property 8: Los pies de cada Combat_Sprite quedan siempre sobre la misma línea de suelo ajustada** — _Validates: Requirements 3.1, 3.5_

  - [x]* 3.3 Escribir property test para el centrado horizontal en `src/render/bossFightRender.test.js`
    - **Property 9: El centrado horizontal se calcula sobre las dimensiones escaladas** — _Validates: Requirements 3.2_

  - [x]* 3.4 Escribir property test para el piso de legibilidad mínima en `src/render/bossFightRender.test.js`
    - **Property 11: El escalado nunca reduce un sprite por debajo del mínimo legible** — _Validates: Requirements 4.3_

- [x] 4. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Reescribir `drawCombatants()` usando contexto de canvas escalado
  - [x] 5.1 Reescribir `drawCombatants(ctx, W, H, warriorEngine, bossEngine)`
    - Calcular `factor` una sola vez con `computeSpriteScaleFactor(W)` y reutilizarlo para ambos Combat_Sprite
    - Para cada engine: calcular dimensiones escaladas con `scaleDimensions`, offsets escalados con `scaleOffset`, y el origen con `computeDrawOrigin`
    - Envolver cada llamada a `engine.draw(...)` en `ctx.save(); ctx.scale(factor, factor); engine.draw(ctx, x / factor, y / factor); ctx.restore();`
    - No leer/mutar `engine.displayWidth`/`displayHeight` salvo para calcular las dimensiones escaladas locales; no modificar `spriteEngine.js`
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 4.2, 5.3_

  - [x]* 5.2 Escribir property test de no-mutación del engine en `src/render/bossFightRender.test.js`
    - **Property 6: `scaleDimensions` no muta ni lee el estado del engine** — _Validates: Requirements 2.2_

  - [x]* 5.3 Escribir property test de orden horizontal guerrero/boss en `src/render/bossFightRender.test.js`
    - **Property 10: El guerrero siempre queda a la izquierda del boss** — _Validates: Requirements 3.4_

  - [x]* 5.4 Escribir property test de independencia del ciclo de animación en `src/render/bossFightRender.test.js`
    - **Property 12: El ciclo de animación es independiente del factor de escala** — _Validates: Requirements 5.1_

  - [x]* 5.5 Escribir property test de inmutabilidad del estado de combate en `src/render/bossFightRender.test.js`
    - **Property 13: El estado de combate es inmutable frente al escalado visual** — _Validates: Requirements 5.2_

  - [x]* 5.6 Escribir test unitario de paridad de escritorio en `src/render/bossFightRender.test.js`
    - Con `W = Reference_Canvas_Width` (800), verificar mediante spies en un `ctx` mock que las coordenadas `(x, y)` pasadas a `engine.draw()` son idénticas a las del comportamiento sin escalado
    - _Requirements: 4.2, 2.5_

  - [x]* 5.7 Escribir test unitario del escenario móvil (`W = 375`) en `src/render/bossFightRender.test.js`
    - Reproducir el escenario del Boss_Sprite de 550px de ancho descrito en la Introduction y verificar que el sprite dibujado (`scaledWidth`, posición `x`) cabe dentro del canvas de 375px
    - _Requirements: 1.3, 4.3_

  - [x]* 5.8 Escribir test unitario de la constante `Minimum_Scale_Factor` en `src/render/bossFightRender.test.js`
    - Verificar que `Minimum_Scale_Factor > 0`
    - _Requirements: 4.1_

- [x] 6. Agregar prueba estructural sobre `spriteEngine.js`
  - [x]* 6.1 Crear `src/render/spriteEngineScaleInvariant.test.js` que lea el código fuente de `src/render/spriteEngine.js` como texto y verifique con expresiones regulares que no contiene referencias a `canvas.width`, `window.innerWidth`, `Sprite_Scale_Factor`, `scaleFactor`, ni llamadas a `computeSpriteScaleFactor`
    - Seguir el patrón de `src/render/proceduralInvariant.test.js` (lectura de archivo fuente, ejecución única sin fast-check)
    - _Requirements: 5.3_

- [x] 7. Checkpoint final - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (tests) y no se implementan salvo pedido explícito.
- `src/render/spriteEngine.js` no se modifica en ninguna tarea de este plan.
- Cada property test debe etiquetarse con el comentario `// Feature: combat-sprite-scaling, Property N: <texto de la propiedad>`, siguiendo la convención ya usada en `draw.test.js`.
- Los tests que ejercitan `drawCombatants()` deben usar un `ctx` mock mínimo (`save`, `restore`, `scale`, `drawImage`, etc., patrón de `draw.test.js`) y engines `SpriteAnimationEngine` reales o mocks ligeros con `displayWidth`/`displayHeight`/`draw`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "6.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["1.2"] },
    { "id": 5, "tasks": ["2.2"] },
    { "id": 6, "tasks": ["2.3"] },
    { "id": 7, "tasks": ["3.2"] },
    { "id": 8, "tasks": ["3.3"] },
    { "id": 9, "tasks": ["3.4"] },
    { "id": 10, "tasks": ["5.2"] },
    { "id": 11, "tasks": ["5.3"] },
    { "id": 12, "tasks": ["5.4"] },
    { "id": 13, "tasks": ["5.5"] },
    { "id": 14, "tasks": ["5.6"] },
    { "id": 15, "tasks": ["5.7"] },
    { "id": 16, "tasks": ["5.8"] }
  ]
}
```
