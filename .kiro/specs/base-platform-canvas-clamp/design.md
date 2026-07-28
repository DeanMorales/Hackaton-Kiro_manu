# Base Platform Canvas Clamp Bugfix Design

## Overview

`createTowerState(width, height)` y `resetGame(state, width, height)` en `src/engine/tower.js` construyen la Plataforma Base inicial (`baseFloor`) usando `x: (width - computeBasePlatformWidth()) / 2` y `width: computeBasePlatformWidth()`. `computeBasePlatformWidth()` devuelve incondicionalmente la constante fija `BASE_PLATFORM_WIDTH` (630px), sin considerar el parámetro `width` (ancho del canvas) que ambas funciones ya reciben. En un canvas móvil angosto (por ejemplo 375px), esto produce `baseFloor.width = 630` y `baseFloor.x = -127.5`, dejando la plataforma parcialmente fuera del canvas desde el inicio del juego.

La corrección es quirúrgica y reutiliza el mismo patrón ya aplicado en `relief-platform-canvas-clamp`: en los dos lugares donde se construye `baseFloor` (`createTowerState` y `resetGame`), se acota el ancho de la plataforma a `width` (cuando está definido) mediante `Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, width ?? Infinity))`, y `x` se recalcula usando ese ancho ya acotado para mantener la plataforma centrada. `computeBasePlatformWidth()` no se modifica (sigue siendo una función pura sin argumentos que devuelve `BASE_PLATFORM_WIDTH`); el acotado se aplica localmente al construir `baseFloor`, tal como el fix hermano acotó `w` localmente dentro de la rama de Plataforma_Respiro sin modificar ninguna función compartida.

## Glossary

- **Bug_Condition (C)**: `width !== undefined AND width < BASE_PLATFORM_WIDTH` — se está construyendo la Plataforma Base (en `createTowerState` o `resetGame`) para un canvas más angosto que 630px.
- **Property (P)**: el `width` asignado a `baseFloor` SHALL ser `Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, width))`, y `baseFloor.x` SHALL ser `(width - baseFloor.width) / 2` usando ese ancho ya acotado, en vez de fijarse incondicionalmente a `BASE_PLATFORM_WIDTH`.
- **Preservation**: para `width >= BASE_PLATFORM_WIDTH` o `width` no definido, `baseFloor.width` y `baseFloor.x` SHALL seguir siendo exactamente los mismos que hoy (`BASE_PLATFORM_WIDTH` y `(width - BASE_PLATFORM_WIDTH) / 2`); el resto de los campos de `baseFloor` (`bottom`, `top`, `height`, `isDoor`, `seed`) y el resto del estado construido por `createTowerState`/`resetGame` permanecen completamente sin cambios.
- **`createTowerState(width, height)`**: función pura (salvo `Math.random()` ya existente) en `src/engine/tower.js` que construye el estado inicial completo de la torre, incluyendo `baseFloor`.
- **`resetGame(state, width, height)`**: función mutadora existente en `src/engine/tower.js` que reconstruye `baseFloor` y reinicia el resto del `state` al reiniciar la partida. Comparte la misma fórmula de `baseFloor` que `createTowerState`.
- **`computeBasePlatformWidth()`**: función pura existente, sin argumentos, que devuelve `BASE_PLATFORM_WIDTH`. No se modifica; el acotado a `width` se aplica en el punto de construcción de `baseFloor`, no dentro de esta función.
- **`BASE_PLATFORM_WIDTH`**: constante existente (630px, `BASE_WIDTH * 3`) que define el ancho nominal de la Plataforma Base. No se modifica.
- **`MIN_WIDTH`**: constante existente (46px) que ya actúa como piso mínimo de ancho para el Bloque en Movimiento en `newMovingBlock`, y que ya se reutilizó como piso mínimo en el fix hermano de Plataforma_Respiro. Se reutiliza aquí también como piso mínimo del ancho de la Plataforma Base en canvases extremadamente angostos, sin introducir una constante nueva.
- **`width` (parámetro de `createTowerState`/`resetGame`)**: ancho del canvas visible en píxeles; puede ser `undefined` (sin límite, comportamiento equivalente a `Infinity`, igual convención que `canvasWidth` en `newMovingBlock`).

## Bug Details

### Bug Condition

El bug se manifiesta al construir la Plataforma Base (en `createTowerState` o en `resetGame`) cuando el canvas visible es más angosto que `BASE_PLATFORM_WIDTH` (630px). Ambas funciones calculan `baseFloor.width` llamando a `computeBasePlatformWidth()`, que devuelve `BASE_PLATFORM_WIDTH` de forma incondicional sin considerar `width` en absoluto, y luego derivan `baseFloor.x` a partir de ese ancho sin acotar, pudiendo resultar en un valor negativo.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input = { width }
  OUTPUT: boolean

  RETURN input.width !== undefined
         AND input.width < BASE_PLATFORM_WIDTH
END FUNCTION
```

### Examples

- `width = 375` (móvil angosto). Esperado: `baseFloor.width = Math.max(46, Math.min(630, 375)) = 375`, `baseFloor.x = (375 - 375) / 2 = 0`. Actual: `baseFloor.width = 630`, `baseFloor.x = (375 - 630) / 2 = -127.5` — la plataforma arranca 127.5px fuera del borde izquierdo.
- `width = 300` (extremo angosto). Esperado: `baseFloor.width = Math.max(46, Math.min(630, 300)) = 300`, `baseFloor.x = 0`. Actual: `baseFloor.width = 630`, `baseFloor.x = -165`.
- Caso de escritorio (sin bug): `width = 800`. Esperado y actual: `baseFloor.width = 630`, `baseFloor.x = (800 - 630) / 2 = 85` — sin cambios (`Math.min(630, 800) = 630 >= MIN_WIDTH`).
- Caso `width` no definido (sin bug, comportamiento tipo desktop): `width = undefined`. Esperado y actual: `baseFloor.width = 630` (`width ?? Infinity` mantiene el ancho en `BASE_PLATFORM_WIDTH`); `baseFloor.x = NaN` en ambos casos, ya que `undefined - 630` es `NaN` — comportamiento idéntico al actual, no es una regresión nueva de esta corrección (esta función nunca se invoca hoy con `width` indefinido en el código del proyecto, pero se documenta para preservar exactamente el comportamiento existente si ocurriera).
- Edge case — canvas más angosto que `MIN_WIDTH`: `width = 30`. Esperado: `baseFloor.width = Math.max(46, Math.min(630, 30)) = 46`, `baseFloor.x = (30 - 46) / 2 = -8` (el piso `MIN_WIDTH` evita un ancho de plataforma degenerado o negativo, aunque en este caso extremo la plataforma seguirá siendo levemente más ancha que el canvas; este mismo trade-off ya existe en el fix hermano de Plataforma_Respiro y no es una regresión nueva).
- Caso `resetGame`: `width = 375` sobre un `state` ya existente (p.ej. tras una partida previa en escritorio). Esperado: la nueva `baseFloor` reconstruida tiene `width = 375`, `x = 0`, igual que si se llamara a `createTowerState(375, height)` desde cero. Actual: `width = 630`, `x = -127.5`, igual defecto que en `createTowerState`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Para `width >= BASE_PLATFORM_WIDTH` o `width === undefined`, `baseFloor.width` SHALL seguir siendo exactamente `BASE_PLATFORM_WIDTH` y `baseFloor.x` SHALL seguir siendo exactamente `(width - BASE_PLATFORM_WIDTH) / 2`, byte por byte igual al valor actual (sin regresión de escritorio).
- El resto de los campos de `baseFloor` (`bottom`, `top`, `height`, `isDoor`, `seed`) SHALL permanecer calculados exactamente igual que hoy, sin ningún cambio.
- El resto del estado construido por `createTowerState` (nubes, `moveSpeed`, `perfectStreak`, `streakWidthBonus`, `camElev`/`camElevTarget`, `anchorScreenY`, `knight`, `doorsPassed`, `pendingBossLevel`, `lastTs`, `torchSeed`, `activeBiome`, `activeTimeOfDay`) SHALL permanecer sin cambios, ya que ninguno de esos campos depende de `baseFloor.width`/`baseFloor.x`.
- El resto de los campos reiniciados por `resetGame` (`moveSpeed`, `perfectStreak`, `streakWidthBonus`, `camElevTarget`/`camElev`, `anchorScreenY`, `knight.elev`/`animating`/`falling`, `doorsPassed`, `pendingBossLevel`, `activeBiome`, `activeTimeOfDay`, `clouds`) SHALL permanecer sin cambios; `state.moving = newMovingBlock(state, baseFloor, width)` SHALL seguir invocándose exactamente igual, recibiendo como entrada la `baseFloor` ya corregida (esto es consistente con el comportamiento ya corregido de `newMovingBlock` en `relief-platform-canvas-clamp`, que también acota su propio ancho a `canvasWidth`).
- `computeBasePlatformWidth()` SHALL seguir devolviendo exactamente `BASE_PLATFORM_WIDTH` sin argumentos y sin ningún cambio en su firma o comportamiento.

**Scope:**
Todos los inputs donde NO se cumple la condición de bug permanecen completamente inafectados por este fix. Esto incluye:
- Cualquier llamada a `createTowerState`/`resetGame` con `width >= BASE_PLATFORM_WIDTH` (comportamiento actual de escritorio).
- Cualquier llamada a `createTowerState`/`resetGame` con `width === undefined`.
- Cualquier otro campo del estado inicial/reiniciado que no dependa de `baseFloor.width`/`baseFloor.x`.
- Cualquier llamada existente a `computeBasePlatformWidth()` fuera de la construcción de `baseFloor`.

## Hypothesized Root Cause

Confirmado por el análisis del bug reportado:

1. **`computeBasePlatformWidth()` es una función pura sin argumentos**: fue diseñada (`tower-progression-scaling`) para devolver un ancho "nominal" fijo de la Plataforma Base, sin considerar que `createTowerState`/`resetGame` ya reciben `width` (el ancho del canvas) como parámetro.
2. **Ningún acotado a `width` en la construcción de `baseFloor`**: a diferencia de `newMovingBlock` (que sí acota `w` a `canvasWidth` en su rama normal, y ya fue corregido para la rama de Plataforma_Respiro en `relief-platform-canvas-clamp`), la construcción de `baseFloor` en `createTowerState`/`resetGame` nunca pasó por ningún `Math.min` con `width`.
3. **`baseFloor.x` hereda el problema de `baseFloor.width`**: `x` se calcula como `(width - computeBasePlatformWidth()) / 2`; si el ancho de la plataforma ya excede `width`, el resultado es negativo por construcción algebraica, sin que exista ningún acotado adicional que lo corrija.
4. **Duplicación de la fórmula en dos funciones**: `createTowerState` y `resetGame` construyen `baseFloor` con código casi idéntico (copiado), por lo que el mismo defecto está presente en ambos lugares y debe corregirse en los dos.

## Correctness Properties

Property 1: Bug Condition - El ancho de la Plataforma Base se acota a `width` en canvases angostos

_For any_ `width` definido y menor que `BASE_PLATFORM_WIDTH`, tanto `createTowerState(width, height)` como `resetGame(state, width, height)` corregidos SHALL producir una `baseFloor` con `width === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, width))` y `x === (width - baseFloor.width) / 2`, sin exceder el canvas salvo por el piso mínimo `MIN_WIDTH` en canvases extremadamente angostos, y permaneciendo centrada horizontalmente.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - El ancho y la posición de la Plataforma Base en escritorio permanecen sin cambios

_For any_ `width` tal que NO se cumple la condición de bug (`width` es `undefined`, O `width >= BASE_PLATFORM_WIDTH`), tanto `createTowerState` como `resetGame` corregidos SHALL producir exactamente el mismo `baseFloor.width` y `baseFloor.x` (y el resto de los campos de `baseFloor`: `bottom`, `top`, `height`, `isDoor`) que las funciones originales, sin ninguna diferencia observable; y el resto de los campos del `state` construido/reiniciado SHALL permanecer idéntico.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Cambio mínimo, contenido enteramente en los dos puntos donde se construye `baseFloor` dentro de `createTowerState` y `resetGame` en `src/engine/tower.js`. No se toca `computeBasePlatformWidth()`, `newMovingBlock`, ni ningún otro archivo.

**File**: `src/engine/tower.js`

**Functions**: `createTowerState`, `resetGame`

**Specific Changes**:

1. **Acotar el ancho de `baseFloor` a `width` en ambas funciones**: en cada una de las dos construcciones de `baseFloor`, calcular primero `const basePlatformWidth = Math.max(MIN_WIDTH, Math.min(computeBasePlatformWidth(), width ?? Infinity));` y usar `basePlatformWidth` tanto en el campo `width` como en el cálculo de `x` (`x: (width - basePlatformWidth) / 2`), reutilizando el mismo patrón `width ?? Infinity` y la misma constante `MIN_WIDTH` que ya usa el fix hermano en `newMovingBlock`.
2. **No modificar `computeBasePlatformWidth()`**: permanece exactamente igual, como función pura sin argumentos que devuelve `BASE_PLATFORM_WIDTH`; el acotado se aplica en el punto de uso, no dentro de la función compartida (evita cambiar su contrato para otros posibles llamadores).
3. **No modificar el resto de los campos de `baseFloor`** (`bottom`, `top`, `height`, `isDoor`, `seed`): permanecen exactamente iguales en ambas funciones.
4. **No modificar el resto de `createTowerState`/`resetGame`**: nubes, `moveSpeed`, `perfectStreak`, `streakWidthBonus`, `camElev`/`camElevTarget`, `anchorScreenY`, `knight`, `doorsPassed`, `pendingBossLevel`, `activeBiome`, `activeTimeOfDay`, `state.moving = newMovingBlock(state, baseFloor, width)` (en `resetGame`) permanecen sin cambios, recibiendo la `baseFloor` ya corregida.

**Código exacto de los bloques corregidos:**

```js
// createTowerState(width, height)
export function createTowerState(width, height) {
  // Requirement 2.2/2.3: acotar el ancho de la Plataforma Base a `width`
  // en canvases más angostos que BASE_PLATFORM_WIDTH, igual patrón que
  // relief-platform-canvas-clamp; MIN_WIDTH evita anchos degenerados.
  const basePlatformWidth = Math.max(MIN_WIDTH, Math.min(computeBasePlatformWidth(), width ?? Infinity));
  const baseFloor = {
    bottom: 0,
    top: 64,
    x: (width - basePlatformWidth) / 2,
    width: basePlatformWidth,
    height: 64,
    isDoor: false,
    seed: Math.random(),
  };
  // ...resto sin cambios
}
```

```js
// resetGame(state, width, height)
export function resetGame(state, width, height) {
  const basePlatformWidth = Math.max(MIN_WIDTH, Math.min(computeBasePlatformWidth(), width ?? Infinity));
  const baseFloor = {
    bottom: 0,
    top: 64,
    x: (width - basePlatformWidth) / 2,
    width: basePlatformWidth,
    height: 64,
    isDoor: false,
    seed: Math.random(),
  };
  // ...resto sin cambios
}
```

Nota: cuando `width >= BASE_PLATFORM_WIDTH` o `width === undefined`, `Math.min(BASE_PLATFORM_WIDTH, width ?? Infinity) === BASE_PLATFORM_WIDTH`, y como `BASE_PLATFORM_WIDTH (630) > MIN_WIDTH (46)`, el resultado final es siempre `BASE_PLATFORM_WIDTH`, exactamente igual al comportamiento actual. Por lo tanto Property 2 se cumple por construcción algebraica, no solo por intención (mismo razonamiento que en `relief-platform-canvas-clamp`).

## Testing Strategy

### Validation Approach

Enfoque de dos fases: primero surfacear contraejemplos que demuestren el bug en el código sin corregir (confirmando que `baseFloor.width > width` y `baseFloor.x < 0` en canvases angostos), luego verificar que el fix produce el comportamiento esperado y no altera ningún caso de escritorio.

### Exploratory Bug Condition Checking

**Goal**: Confirmar, sobre el código SIN corregir, que `createTowerState`/`resetGame` producen `baseFloor.width > width` (y `baseFloor.x < 0`) para canvases angostos, validando el diagnóstico de causa raíz.

**Test Plan**: Llamar a `createTowerState(width, height)` (versión actual) con `width < BASE_PLATFORM_WIDTH` y observar que `state.floors[0].width > width` y `state.floors[0].x < 0`. Repetir sobre `resetGame`.

**Test Cases**:
1. **Móvil angosto típico**: `width = 375` — `baseFloor.width = 630` (excede el canvas en 255px), `baseFloor.x = -127.5` (falla en código sin corregir).
2. **Canvas extremo angosto**: `width = 300` — `baseFloor.width = 630`, `baseFloor.x = -165` (falla en código sin corregir).
3. **Caso límite justo por debajo de `BASE_PLATFORM_WIDTH`**: `width = 629` — `baseFloor.width = 630`, 1px más ancho que el canvas (falla en código sin corregir).
4. **`resetGame` con canvas angosto**: `width = 375` sobre un `state` construido previamente con `width` amplio — la nueva `baseFloor` reconstruida presenta el mismo defecto (falla en código sin corregir).
5. **Caso normal (control)**: `width = 800` (escritorio) — el resultado ya coincide con lo esperado hoy (no debería "fallar" el criterio de bug; sirve para confirmar que el contraejemplo es específico a canvases angostos).

**Expected Counterexamples**:
- `createTowerState(width, height).floors[0].width > width` cuando `width < BASE_PLATFORM_WIDTH`.
- `createTowerState(width, height).floors[0].x < 0` en el mismo escenario.
- Causa confirmada: `computeBasePlatformWidth()` se asigna a `baseFloor.width` sin pasar por ningún `Math.min` con `width`.

### Fix Checking

**Goal**: Verificar que para todo input donde la condición de bug se cumple, las funciones corregidas producen el ancho y la posición acotados esperados (Property 1).

**Pseudocode:**
```
FOR ALL width WHERE
    width !== undefined
    AND width < BASE_PLATFORM_WIDTH DO
  baseFloor := createTowerState_fixed(width, height).floors[0]
  ASSERT baseFloor.width === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, width))
  ASSERT baseFloor.x === (width - baseFloor.width) / 2
  ASSERT baseFloor.width <= width OR baseFloor.width === MIN_WIDTH

  baseFloor2 := resetGame_fixed(state, width, height); state.floors[0]
  ASSERT baseFloor2.width === baseFloor.width
  ASSERT baseFloor2.x === baseFloor.x
END FOR
```

### Preservation Checking

**Goal**: Verificar que para todo input donde la condición de bug NO se cumple, las funciones corregidas producen exactamente el mismo `baseFloor.width`/`baseFloor.x` (y el resto de `baseFloor`, y el resto del `state`) que las funciones originales (Property 2).

**Pseudocode:**
```
FOR ALL width WHERE
    width === undefined
    OR width >= BASE_PLATFORM_WIDTH DO
  ASSERT createTowerState_original(width, height).floors[0].width
      = createTowerState_fixed(width, height).floors[0].width
  ASSERT createTowerState_original(width, height).floors[0].x
      = createTowerState_fixed(width, height).floors[0].x
END FOR
```

**Testing Approach**: Property-based testing es la técnica recomendada, porque:
- Genera automáticamente muchas combinaciones de `width` (incluyendo el borde exacto `width === BASE_PLATFORM_WIDTH` y canvases extremadamente angostos), igual que en `relief-platform-canvas-clamp`.
- Da garantías fuertes de que ningún input de escritorio cambia de comportamiento tras el fix, sin necesidad de enumerar manualmente cada valor de `width`.

**Test Plan**: Observar primero el comportamiento del código SIN corregir para `width >= BASE_PLATFORM_WIDTH` (o `undefined`), y capturarlo como oráculo de referencia; luego escribir los tests de propiedades que comparan contra ese oráculo tanto antes como después del fix.

**Test Cases**:
1. **Preservación en escritorio (`createTowerState`)**: para `width >= BASE_PLATFORM_WIDTH` (o `undefined`) generado aleatoriamente, `baseFloor.width`/`baseFloor.x` corregidos coinciden con `BASE_PLATFORM_WIDTH`/`(width - BASE_PLATFORM_WIDTH) / 2`.
2. **Preservación en escritorio (`resetGame`)**: mismo criterio, aplicado a `resetGame` sobre un `state` preexistente.
3. **Preservación del resto del estado**: para cualquier `width` (angosto o no), el resto de los campos de `baseFloor` y del `state` (no relacionados con `width`/`x` de la plataforma) permanecen idénticos entre el código original y el corregido.

### Unit Tests

- `createTowerState(375, height)` produce `floors[0].width === 375` y `floors[0].x === 0` (ejemplo concreto móvil).
- `createTowerState(800, height)` produce `floors[0].width === BASE_PLATFORM_WIDTH` (630) y `floors[0].x === 85` (ejemplo concreto escritorio, sin regresión).
- `createTowerState(30, height)` produce `floors[0].width === MIN_WIDTH` (46, piso mínimo, no negativo ni cero).
- `resetGame(state, 375, height)` produce el mismo `floors[0].width`/`floors[0].x` que `createTowerState(375, height)`.
- `createTowerState`/`resetGame` con `width` angosto dejan sin cambios `bottom`, `top`, `height`, `isDoor` de `baseFloor`.

### Property-Based Tests

- Property 1 (Bug Condition/Fix Checking): generar `width` arbitrario en `[MIN_WIDTH, BASE_PLATFORM_WIDTH - 1]`, verificar `floors[0].width === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, width))` y `floors[0].x === (width - floors[0].width) / 2`, para `createTowerState` y para `resetGame`.
- Property 2 (Preservation): generar `width` arbitrario (incluyendo `undefined`) filtrado por la negación de la condición de bug (`width >= BASE_PLATFORM_WIDTH` o `undefined`), verificar igualdad exacta de `floors[0].width`/`floors[0].x` con el resultado del código original, para `createTowerState` y para `resetGame`.

### Integration Tests

- `createTowerState(width, height)` seguido de `dropBlock`/`newMovingBlock` en un canvas angosto simulado: la `baseFloor` resultante cabe dentro del canvas y sirve de base coherente para el primer `state.moving` generado por `resetGame`.
- Flujo de reinicio: `createTowerState` con `width` amplio, seguido de `resetGame` con `width` angosto, confirmando que la nueva `baseFloor` se acota correctamente sin arrastrar el ancho del estado anterior.
- Flujo equivalente en un canvas ancho (escritorio), confirmando que el comportamiento no cambia respecto al actual.
