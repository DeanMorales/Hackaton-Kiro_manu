# Requirements Document

## Introduction

En "Torre de las Nubes" (`src/engine/tower.js`), dos valores de física del Bloque en Movimiento están fijos en píxeles absolutos, sin relación al ancho del canvas `W` (ya disponible como parámetro: `dropBlock(state, width)` lo recibe, y `main.js` ya lo pasa vía `engine.dropBlock(gameState, W)`):

1. **Umbral de caída** (`decidesFall(overlap) { return overlap < 16; }`, usado en `dropBlock` a través de `computeOverlap(prevFloor, movingBlock)`): el Bloque en Movimiento debe solaparse al menos 16px con el piso anterior para no caer, sin importar `W` ni el ancho de los bloques/pisos involucrados. En un canvas angosto (móvil), 16px es proporcionalmente un margen de acierto mucho más exigente que en un canvas ancho (escritorio), porque los bloques también son proporcionalmente más pequeños respecto al canvas.

2. **Margen de movimiento del Bloque en Movimiento** (`newMovingBlock`, líneas `minX = Math.max(0, afterFloor.x - 90)` y `maxX = Math.min(canvasWidth ?? ..., afterFloor.x + afterFloor.width + 90) - w`): el bloque se mueve dentro de un rango que se extiende ±90px más allá del piso anterior, un valor fijo. En un canvas angosto, ±90px representa una fracción mucho mayor del ancho visible que en un canvas ancho, cambiando el ritmo/feel del juego entre dispositivos.

Esta feature normaliza ambos valores como una fracción del ancho del canvas (`W`) en vez de píxeles absolutos, de forma que la dificultad relativa de "acertar el aterrizaje" y el "feel" del rango de movimiento sean consistentes entre pantallas de cualquier tamaño (móvil, tablet, escritorio), preservando el comportamiento actual en el ancho de canvas de escritorio de referencia. El alcance se limita estrictamente a `decidesFall`/`computeOverlap` (umbral de caída) y a `minX`/`maxX` de `newMovingBlock` (margen de movimiento); no modifica el acotado de ancho de bloques/plataformas ya corregido en `relief-platform-canvas-clamp`/`base-platform-canvas-clamp`, ni `moveSpeed`/`SPEED_CAP`, ni la lógica de Plataforma_Respiro o Bono_Racha_Perfecta.

## Glossary

- **Bloque_en_Movimiento**: El objeto devuelto por `newMovingBlock` (`src/engine/tower.js`) que se desplaza horizontalmente entre `minX` y `maxX` mientras `state.screen === 'build'`.
- **Piso_Anterior**: El piso (`prevFloor`/`afterFloor`) ya colocado sobre el cual el Bloque_en_Movimiento debe aterrizar, obtenido mediante `topFloor(state)`.
- **Umbral_de_Caida**: El valor mínimo de solapamiento (en píxeles), evaluado por `decidesFall(overlap)`, por debajo del cual el Bloque_en_Movimiento cae en vez de convertirse en un nuevo piso. Actualmente la constante fija `16`.
- **Margen_de_Movimiento**: La distancia (en píxeles), actualmente la constante fija `90`, que extiende el rango de desplazamiento (`minX`/`maxX`) del Bloque_en_Movimiento más allá de los bordes izquierdo y derecho del Piso_Anterior.
- **Reference_Canvas_Width**: El ancho de canvas, en píxeles, para el cual el Umbral_de_Caida (16px) y el Margen_de_Movimiento (90px) actuales fueron calibrados sin necesitar ajuste (comportamiento de escritorio ya afinado). Su valor es `800px`, el mismo `Reference_Canvas_Width` ya usado en la spec `combat-sprite-scaling`, por consistencia dentro del plan de responsive design del proyecto.
- **Fall_Threshold_Fraction**: La fracción de `W` usada para calcular el Umbral_de_Caida efectivo en un canvas de ancho `W`.
- **Movement_Margin_Fraction**: La fracción de `W` usada para calcular el Margen_de_Movimiento efectivo en un canvas de ancho `W`.
- **`computeOverlap(prevFloor, movingBlock)`**: Función pura existente en `src/engine/tower.js` que calcula el solapamiento horizontal, en píxeles, entre el Bloque_en_Movimiento y el Piso_Anterior.
- **`decidesFall(overlap)`**: Función pura existente en `src/engine/tower.js` que decide, a partir del solapamiento calculado por `computeOverlap`, si el Bloque_en_Movimiento cae.
- **`newMovingBlock(state, afterFloor, canvasWidth)`**: Función existente en `src/engine/tower.js` que construye un nuevo Bloque_en_Movimiento, incluyendo su rango de desplazamiento (`minX`/`maxX`).
- **`dropBlock(state, width)`**: Función mutadora existente en `src/engine/tower.js`, llamada desde `main.js` como `engine.dropBlock(gameState, W)`, que usa `computeOverlap`/`decidesFall` para decidir si el Bloque_en_Movimiento cae o se convierte en un nuevo piso.
- **`W`**: El ancho actual del canvas visible en píxeles, ya disponible como parámetro (`width`/`canvasWidth`) en `dropBlock` y `newMovingBlock`.

## Requirements

### Requirement 1: Umbral de caída relativo al ancho del canvas

**User Story:** Como jugador, quiero que la dificultad de acertar el aterrizaje del Bloque_en_Movimiento sea consistente sin importar el tamaño de mi pantalla, para que el juego se sienta igualmente justo en móvil y en escritorio.

#### Acceptance Criteria

1. THE Tower_Engine SHALL compute an effective Umbral_de_Caida from the current canvas width `W` and a Fall_Threshold_Fraction, instead of using a fixed pixel constant.
2. WHEN `W` equals Reference_Canvas_Width, THE Tower_Engine SHALL compute an effective Umbral_de_Caida equal to the current fixed value (`16`px).
3. FOR ALL canvas widths `W > 0`, THE Tower_Engine SHALL compute an effective Umbral_de_Caida proportional to `W` (strictly less than the value computed for a larger `W`, and strictly greater than the value computed for a smaller `W`, all else equal).
4. WHEN `decidesFall(overlap, W)` is evaluated for a given `overlap` and canvas width `W`, THE Tower_Engine SHALL return `true` if and only if `overlap` is less than the effective Umbral_de_Caida computed for that `W`.
5. FOR ALL identical values of `W`, THE Tower_Engine SHALL compute an identical effective Umbral_de_Caida (deterministic, side-effect-free calculation).
6. WHERE the canvas width `W` equals Reference_Canvas_Width, THE Tower_Engine SHALL preserve the exact current fall decision for any `overlap` value (no behavior change on the reference desktop width).

### Requirement 2: Margen de movimiento relativo al ancho del canvas

**User Story:** Como jugador, quiero que el rango de desplazamiento del Bloque_en_Movimiento se sienta proporcional al tamaño de mi pantalla, para que el ritmo del juego no cambie de forma no intencional entre dispositivos.

#### Acceptance Criteria

1. THE Tower_Engine SHALL compute an effective Margen_de_Movimiento from the current canvas width `canvasWidth` and a Movement_Margin_Fraction, instead of using a fixed pixel constant (`90`).
2. WHEN `canvasWidth` equals Reference_Canvas_Width exactly, THE Tower_Engine SHALL compute an effective Margen_de_Movimiento equal to the current fixed value (`90`px).
3. IF `canvasWidth` is different from Reference_Canvas_Width by any amount, including a single pixel, THEN THE Tower_Engine SHALL compute an effective Margen_de_Movimiento using the proportional Movement_Margin_Fraction calculation instead of the fixed value (no tolerance range around Reference_Canvas_Width).
4. FOR ALL canvas widths `canvasWidth > 0`, THE Tower_Engine SHALL compute an effective Margen_de_Movimiento proportional to `canvasWidth`.
5. WHEN `newMovingBlock(state, afterFloor, canvasWidth)` computes `minX`, THE Tower_Engine SHALL use `Math.max(0, afterFloor.x - effectiveMargin)`, where `effectiveMargin` is the Margen_de_Movimiento computed for `canvasWidth`.
6. WHEN `newMovingBlock(state, afterFloor, canvasWidth)` computes `maxX`, THE Tower_Engine SHALL use the same `effectiveMargin` value used for `minX` in that same call.
7. WHERE `canvasWidth` equals Reference_Canvas_Width exactly, THE Tower_Engine SHALL preserve the exact current `minX` and `maxX` values produced by `newMovingBlock` for any `afterFloor` and `w` (no behavior change on the reference desktop width).

### Requirement 3: Compatibilidad con canvas de escritorio de referencia

**User Story:** Como desarrollador, quiero que el juego se sienta exactamente igual en el ancho de escritorio de referencia después de este cambio, para no romper el balance ya afinado del juego.

#### Acceptance Criteria

1. THE Tower_Engine SHALL define a Reference_Canvas_Width constant representing the desktop canvas width for which the current fixed values (16px fall threshold, 90px movement margin) were calibrated.
2. WHERE the canvas width used by `decidesFall`/`computeOverlap` equals Reference_Canvas_Width, THE Tower_Engine SHALL produce fall decisions identical to the current unmodified behavior for every possible `overlap` value.
3. WHERE the canvas width used by `newMovingBlock` equals Reference_Canvas_Width, THE Tower_Engine SHALL produce `minX` and `maxX` values identical to the current unmodified behavior for every possible `afterFloor` and `w`.

### Requirement 4: Aislamiento de alcance respecto a otros sistemas

**User Story:** Como desarrollador, quiero que este cambio de balance no afecte sistemas ya cubiertos por specs anteriores, para no introducir regresiones en el resto del juego.

#### Acceptance Criteria

1. THE Tower_Engine SHALL NOT modify the clamping behavior of block or platform widths against `canvasWidth` already implemented by `relief-platform-canvas-clamp` and `base-platform-canvas-clamp`.
2. THE Tower_Engine SHALL NOT alter `moveSpeed`, `SPEED_CAP`, `BASE_SPEED`, `applySpeedBoost`, `applySpeedBoostWithCap`, or `applyReliefPlatformSpeedBoost` as a result of computing an effective Umbral_de_Caida or Margen_de_Movimiento.
3. THE Tower_Engine SHALL NOT alter the Plataforma_Respiro selection logic (`isReliefPlatformFloor`) or its width assignment as a result of computing an effective Umbral_de_Caida or Margen_de_Movimiento.
4. THE Tower_Engine SHALL NOT alter the Bono_Racha_Perfecta logic (`registerDuelWinForStreak`, `streakWidthBonus`, `PERFECT_STREAK_BONUS_WIDTH`) as a result of computing an effective Umbral_de_Caida or Margen_de_Movimiento.
5. THE Tower_Engine SHALL NOT change the function signatures of `dropBlock(state, width)` or `newMovingBlock(state, afterFloor, canvasWidth)` in a way that breaks their existing call sites in `main.js` and `resetGame`.
