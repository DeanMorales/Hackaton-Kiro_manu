# Relief Platform Canvas Clamp Bugfix Design

## Overview

`newMovingBlock(state, afterFloor, canvasWidth)` en `src/engine/tower.js` calcula el ancho (`w`) del próximo Bloque en Movimiento. La rama normal ya acota `w` a `canvasWidth` mediante `maxWidthWithStreakBonus = Math.min(afterFloor.width + streakBonus, canvasWidth ?? Infinity)`. Pero la rama de Plataforma_Respiro sobrescribe `w` incondicionalmente con la constante fija `BASE_PLATFORM_WIDTH` (630px), sin pasar por ningún clamp de `canvasWidth`. En un canvas móvil angosto (por ejemplo 375px), esto produce un Bloque en Movimiento de 630px, mucho más ancho que la pantalla visible.

La corrección es quirúrgica: dentro de la rama `if (isReliefPlatformFloor(state.floors.length))`, en lugar de asignar `w = BASE_PLATFORM_WIDTH` directamente, se acota ese valor a `canvasWidth` (cuando está definido) reutilizando el mismo patrón `Math.min(..., canvasWidth ?? Infinity)` que ya usa la rama normal, con un piso de `MIN_WIDTH` (la misma constante que ya usa toda la función) para evitar anchos degenerados en canvases extremadamente angostos. El incremento de velocidad (`applyReliefPlatformSpeedBoost`) se sigue aplicando exactamente igual, sin ninguna condición nueva. `minX`/`maxX` no se modifican: siguen derivándose del `w` (ya corregido) exactamente con la misma fórmula de hoy.

## Glossary

- **Bug_Condition (C)**: `isReliefPlatformFloor(state.floors.length) === true AND canvasWidth !== undefined AND canvasWidth < BASE_PLATFORM_WIDTH` — se está generando una Plataforma_Respiro en un canvas más angosto que 630px.
- **Property (P)**: el `w` asignado al Bloque en Movimiento SHALL ser `Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth))`, es decir, acotado a `canvasWidth` (con el piso `MIN_WIDTH` ya existente en la función), en vez de fijarse incondicionalmente a `BASE_PLATFORM_WIDTH`.
- **Preservation**: para Plataforma_Respiro con `canvasWidth >= BASE_PLATFORM_WIDTH` o `canvasWidth` no definido, `w` SHALL seguir siendo exactamente `BASE_PLATFORM_WIDTH`; para pisos que NO son Plataforma_Respiro, la rama normal (`maxWidthWithStreakBonus`, `w` con el resto aleatorio) permanece completamente sin cambios; `applyReliefPlatformSpeedBoost` y su condición de invocación permanecen sin cambios; `minX`/`maxX` siguen calculándose con la misma fórmula, solo reciben un `w` distinto como entrada.
- **`newMovingBlock(state, afterFloor, canvasWidth)`**: función pura (salvo la mutación de `state.moveSpeed` ya existente para Plataforma_Respiro) en `src/engine/tower.js` que genera el próximo Bloque en Movimiento.
- **`isReliefPlatformFloor(floorNum)`**: función pura existente que determina si el piso absoluto `floorNum` es una Plataforma_Respiro (piso 35, 65, 95, ... indefinidamente). No se modifica.
- **`BASE_PLATFORM_WIDTH`**: constante existente (630px, `BASE_WIDTH * 3`) que define el ancho "premio" de una Plataforma_Respiro. No se modifica.
- **`MIN_WIDTH`**: constante existente (46px) que ya actúa como piso mínimo de ancho para el Bloque en Movimiento en la rama normal. Se reutiliza como piso mínimo también para Plataforma_Respiro en canvases angostos, sin introducir una constante nueva.
- **`canvasWidth`**: ancho del canvas visible en píxeles, recibido como parámetro; puede ser `undefined` (sin límite, comportamiento equivalente a `Infinity`, igual que en la rama normal).
- **`applyReliefPlatformSpeedBoost(currentSpeed)`**: función pura existente que aplica el +0.5% compuesto de velocidad, acotado a `SPEED_CAP`. No se modifica.

## Bug Details

### Bug Condition

El bug se manifiesta cuando el piso que se está generando es una Plataforma_Respiro y el canvas visible es más angosto que `BASE_PLATFORM_WIDTH` (630px). La rama `if (isReliefPlatformFloor(state.floors.length))` asigna `w = BASE_PLATFORM_WIDTH` de forma incondicional, sin considerar `canvasWidth` en absoluto, a diferencia de la rama normal que sí lo hace vía `maxWidthWithStreakBonus`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input = { floorNum, canvasWidth }
  OUTPUT: boolean

  RETURN isReliefPlatformFloor(input.floorNum) === true
         AND input.canvasWidth !== undefined
         AND input.canvasWidth < BASE_PLATFORM_WIDTH
END FUNCTION
```

### Examples

- `state.floors.length = 35` (Plataforma_Respiro), `canvasWidth = 375` (móvil angosto). Esperado: `w = Math.max(MIN_WIDTH, Math.min(630, 375)) = 375`. Actual: `w = 630` — el bloque excede el canvas en 255px.
- `state.floors.length = 65` (Plataforma_Respiro), `canvasWidth = 300` (extremo angosto). Esperado: `w = Math.max(46, Math.min(630, 300)) = 300`. Actual: `w = 630`.
- Caso de escritorio (sin bug): `state.floors.length = 35`, `canvasWidth = 800`. Esperado y actual: `w = 630` — sin cambios (`Math.min(630, 800) = 630 >= MIN_WIDTH`).
- Caso `canvasWidth` no definido (sin bug, comportamiento tipo desktop): `state.floors.length = 95`, `canvasWidth = undefined`. Esperado y actual: `w = 630` (`canvasWidth ?? Infinity` mantiene `w` en `BASE_PLATFORM_WIDTH`).
- Edge case — canvas más angosto que `MIN_WIDTH`: `state.floors.length = 35`, `canvasWidth = 30`. Esperado: `w = Math.max(46, Math.min(630, 30)) = 46` (el piso `MIN_WIDTH` evita un ancho de bloque degenerado o negativo); este caso extremo ya puede ocurrir hoy en la rama normal con canvases igualmente angostos, por lo que no es una regresión nueva de esta corrección.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Para pisos que NO son Plataforma_Respiro, la rama normal (`maxWidthWithStreakBonus`, cálculo de `w` con el resto aleatorio y `Math.max(MIN_WIDTH, ...)`) SHALL permanecer exactamente igual, sin ningún cambio.
- Para Plataforma_Respiro con `canvasWidth >= BASE_PLATFORM_WIDTH` o `canvasWidth === undefined`, `w` SHALL seguir siendo exactamente `BASE_PLATFORM_WIDTH`, byte por byte igual al valor actual (sin regresión de escritorio).
- `applyReliefPlatformSpeedBoost(state.moveSpeed)` SHALL seguir invocándose exactamente en la misma condición (`isReliefPlatformFloor(state.floors.length)`) y de la misma forma, sin que el acotado de `w` afecte el cálculo de velocidad.
- `minX`/`maxX` SHALL seguir calculándose con la misma fórmula (`minX = max(0, afterFloor.x - 90)`, `maxX = min(canvasWidth ?? (afterFloor.x + afterFloor.width + 90), afterFloor.x + afterFloor.width + 90) - w`), tomando como entrada el `w` ya corregido; esta corrección no toca esa fórmula.
- La lógica de dirección/posición inicial del bloque (`startFromRight`, `dir`, `x`) SHALL permanecer sin cambios; sigue derivándose de `minX`/`maxX` y de un valor aleatorio, exactamente igual que hoy.

**Scope:**
Todos los inputs donde NO se cumple la condición de bug permanecen completamente inafectados por este fix. Esto incluye:
- Cualquier piso que no sea Plataforma_Respiro, sin importar `canvasWidth`.
- Cualquier Plataforma_Respiro en un canvas de ancho `>= BASE_PLATFORM_WIDTH` (comportamiento actual de escritorio).
- Cualquier Plataforma_Respiro con `canvasWidth === undefined` (sin límite conocido).
- El incremento de velocidad de Plataforma_Respiro, en todos los casos.
- El cálculo de `minX`/`maxX` como fórmula (solo cambia el valor de `w` que recibe como entrada en el caso del bug).

## Hypothesized Root Cause

Confirmado por el análisis del bug reportado:

1. **Asignación incondicional de `w = BASE_PLATFORM_WIDTH`**: la rama de Plataforma_Respiro fue diseñada (`endless-tower-difficulty-cap`) pensando en un ancho "premio" fijo de 630px, sin considerar que `newMovingBlock` ya recibe `canvasWidth` como parámetro y que la rama normal sí lo usa para acotar `w`. La rama de Plataforma_Respiro simplemente no reutiliza ese acotado.
2. **No hay clamp de `canvasWidth` en la rama de Plataforma_Respiro**: a diferencia de `maxWidthWithStreakBonus = Math.min(afterFloor.width + bonus, canvasWidth ?? Infinity)`, la línea `w = BASE_PLATFORM_WIDTH` no pasa por ningún `Math.min` con `canvasWidth`.
3. **`minX`/`maxX` no compensan el problema**: aunque `minX`/`maxX` sí usan `canvasWidth` para acotar el rango de movimiento horizontal, ese acotado actúa sobre la posición `x` del bloque, no sobre su ancho `w`; si `w` ya excede `canvasWidth`, ningún rango de movimiento horizontal puede hacer que el bloque quepa visualmente en el canvas.

## Correctness Properties

Property 1: Bug Condition - El ancho de la Plataforma_Respiro se acota a `canvasWidth` en canvases angostos

_For any_ `floorNum` tal que `isReliefPlatformFloor(floorNum) === true`, y `canvasWidth` definido y menor que `BASE_PLATFORM_WIDTH`, la función `newMovingBlock` corregida SHALL producir `w === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth))`, sin exceder `canvasWidth` salvo por el piso mínimo `MIN_WIDTH` en canvases extremadamente angostos.

**Validates: Requirements 2.2, 2.3**

Property 2: Preservation - El ancho de la Plataforma_Respiro en escritorio y la rama normal permanecen sin cambios

_For any_ `floorNum` y `canvasWidth` tales que NO se cumple la condición de bug (`isReliefPlatformFloor(floorNum) === false`, O `canvasWidth` es `undefined`, O `canvasWidth >= BASE_PLATFORM_WIDTH`), la función `newMovingBlock` corregida SHALL producir exactamente el mismo `w` (y, para la rama normal, exactamente el mismo `minX`/`maxX`/`x`/`dir`) que la función original, sin ninguna diferencia observable.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 3: Preservation - El incremento de velocidad de Plataforma_Respiro no se ve afectado por el acotado de ancho

_For any_ `floorNum` tal que `isReliefPlatformFloor(floorNum) === true` (con o sin `canvasWidth` angosto), el `state.moveSpeed` resultante tras llamar a `newMovingBlock` corregida SHALL ser idéntico al que produce `applyReliefPlatformSpeedBoost(previousMoveSpeed)`, exactamente igual que en el código sin corregir, independientemente del valor final de `w`.

**Validates: Requirements 2.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Cambio mínimo, contenido enteramente dentro del bloque `if (isReliefPlatformFloor(state.floors.length))` de `newMovingBlock` en `src/engine/tower.js`. No se toca la rama normal, `minX`/`maxX`, `applyReliefPlatformSpeedBoost`, `isReliefPlatformFloor`, ni ningún otro archivo.

**File**: `src/engine/tower.js`

**Function**: `newMovingBlock`

**Specific Changes**:

1. **Acotar `w` a `canvasWidth` dentro de la rama de Plataforma_Respiro**: reemplazar `w = BASE_PLATFORM_WIDTH;` por `w = Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth ?? Infinity));`, reutilizando el mismo patrón `canvasWidth ?? Infinity` y la misma constante `MIN_WIDTH` que ya usa la rama normal, sin introducir constantes ni parámetros nuevos.
2. **No modificar la línea del incremento de velocidad**: `state.moveSpeed = applyReliefPlatformSpeedBoost(state.moveSpeed);` permanece exactamente igual, en el mismo bloque `if`, sin ninguna condición adicional.
3. **No modificar `minX`/`maxX`**: siguen calculándose después del bloque `if`, con la misma fórmula, recibiendo el `w` ya corregido como entrada (comportamiento ya correcto, no forma parte del bug).
4. **No modificar la rama normal (`maxWidthWithStreakBonus`, `w` con resto aleatorio)**: permanece sin cambios.

**Código exacto del bloque corregido:**

```js
if (isReliefPlatformFloor(state.floors.length)) {
  // Requirement 2.2/2.3: acotar el ancho "premio" de Plataforma_Respiro a canvasWidth
  // en canvases más angostos que BASE_PLATFORM_WIDTH, igual que ya hace la rama normal;
  // MIN_WIDTH evita anchos degenerados en canvases extremadamente angostos.
  w = Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth ?? Infinity));
  state.moveSpeed = applyReliefPlatformSpeedBoost(state.moveSpeed);
}
```

Nota: cuando `canvasWidth >= BASE_PLATFORM_WIDTH` o `canvasWidth === undefined`, `Math.min(BASE_PLATFORM_WIDTH, canvasWidth ?? Infinity) === BASE_PLATFORM_WIDTH`, y como `BASE_PLATFORM_WIDTH (630) > MIN_WIDTH (46)`, el resultado final es siempre `BASE_PLATFORM_WIDTH`, exactamente igual al comportamiento actual. Por lo tanto el Property 2 se cumple por construcción algebraica, no solo por intención.

## Testing Strategy

### Validation Approach

Enfoque de dos fases: primero surfacear contraejemplos que demuestren el bug en el código sin corregir (confirmando que `w` excede `canvasWidth` en Plataforma_Respiro sobre canvases angostos), luego verificar que el fix produce el comportamiento esperado y no altera ningún caso de escritorio ni la rama normal.

### Exploratory Bug Condition Checking

**Goal**: Confirmar, sobre el código SIN corregir, que `newMovingBlock` produce `w > canvasWidth` para Plataforma_Respiro en canvases angostos, validando el diagnóstico de causa raíz.

**Test Plan**: Llamar a `newMovingBlock` (versión actual) con `state.floors.length` igual a un piso de Plataforma_Respiro (35, 65, ...) y `canvasWidth < BASE_PLATFORM_WIDTH`, y observar que `result.width > canvasWidth`.

**Test Cases**:
1. **Móvil angosto típico**: `state.floors.length = 35`, `canvasWidth = 375` — el bloque resultante mide 630px (falla en código sin corregir).
2. **Canvas extremo angosto**: `state.floors.length = 65`, `canvasWidth = 300` — el bloque resultante sigue midiendo 630px (falla en código sin corregir).
3. **Caso límite justo por debajo de `BASE_PLATFORM_WIDTH`**: `canvasWidth = 629` — el bloque resultante mide 630px, 1px más ancho que el canvas (falla en código sin corregir).
4. **Caso normal (control)**: `canvasWidth = 800` (escritorio) — el resultado ya coincide con lo esperado hoy (no debería "fallar" el criterio de bug; sirve para confirmar que el contraejemplo es específico a canvases angostos).

**Expected Counterexamples**:
- `newMovingBlock(...).width > canvasWidth` cuando el piso es Plataforma_Respiro y `canvasWidth < BASE_PLATFORM_WIDTH`.
- Causa confirmada: `w = BASE_PLATFORM_WIDTH` se asigna sin pasar por ningún `Math.min` con `canvasWidth`.

### Fix Checking

**Goal**: Verificar que para todo input donde la condición de bug se cumple, la función corregida produce el ancho acotado esperado (Property 1).

**Pseudocode:**
```
FOR ALL (floorNum, canvasWidth) WHERE
    isReliefPlatformFloor(floorNum) === true
    AND canvasWidth !== undefined
    AND canvasWidth < BASE_PLATFORM_WIDTH DO
  result := newMovingBlock_fixed(state_with_floors_length(floorNum), afterFloor, canvasWidth)
  ASSERT result.width === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth))
  ASSERT result.width <= canvasWidth OR result.width === MIN_WIDTH
END FOR
```

### Preservation Checking

**Goal**: Verificar que para todo input donde la condición de bug NO se cumple, la función corregida produce exactamente el mismo `w` (y, en la rama normal, el mismo `minX`/`maxX`/`x`/`dir`) que la función original (Property 2), y que el incremento de velocidad de Plataforma_Respiro no cambia (Property 3).

**Pseudocode:**
```
FOR ALL (floorNum, canvasWidth) WHERE
    isReliefPlatformFloor(floorNum) === false
    OR canvasWidth === undefined
    OR canvasWidth >= BASE_PLATFORM_WIDTH DO
  ASSERT newMovingBlock_original(state, afterFloor, canvasWidth).width
      = newMovingBlock_fixed(state, afterFloor, canvasWidth).width
END FOR

FOR ALL floorNum WHERE isReliefPlatformFloor(floorNum) === true DO
  ASSERT applyReliefPlatformSpeedBoost invoked identically (same moveSpeed transition)
      regardless of canvasWidth/width clamp
END FOR
```

**Testing Approach**: Property-based testing es la técnica recomendada, porque:
- Genera automáticamente muchas combinaciones de `floorNum`/`canvasWidth`, incluyendo el borde exacto `canvasWidth === BASE_PLATFORM_WIDTH` y canvases extremadamente angostos (`canvasWidth < MIN_WIDTH`).
- Cubre tanto pisos de Plataforma_Respiro como pisos normales sin necesidad de enumerarlos a mano, reutilizando `isReliefPlatformFloor` como predicado de generación/filtrado.
- Da garantías fuertes de que ningún input de escritorio o de la rama normal cambia de comportamiento tras el fix.

**Test Plan**: Observar primero el comportamiento del código SIN corregir para Plataforma_Respiro en escritorio (`canvasWidth >= BASE_PLATFORM_WIDTH`) y para la rama normal, y capturarlo como oráculo de referencia; luego escribir los tests de propiedades que comparan contra ese oráculo tanto antes como después del fix.

**Test Cases**:
1. **Preservación de Plataforma_Respiro en escritorio**: para `canvasWidth >= BASE_PLATFORM_WIDTH` (o `undefined`) y `floorNum` de Plataforma_Respiro generado aleatoriamente, `w` corregido coincide con `BASE_PLATFORM_WIDTH`.
2. **Preservación de la rama normal**: para `floorNum` que NO es Plataforma_Respiro, `w`/`minX`/`maxX`/`x`/`dir` corregidos coinciden con los del código original, para cualquier `canvasWidth`.
3. **Preservación del incremento de velocidad**: para `floorNum` de Plataforma_Respiro con cualquier `canvasWidth` (angosto o no), `state.moveSpeed` tras la llamada coincide con `applyReliefPlatformSpeedBoost(moveSpeed_antes)`.

### Unit Tests

- `newMovingBlock` con `floorNum` de Plataforma_Respiro (p.ej. 35) y `canvasWidth = 375` produce `width === 375` (acotado, ejemplo concreto móvil).
- `newMovingBlock` con `floorNum` de Plataforma_Respiro y `canvasWidth = 800` produce `width === BASE_PLATFORM_WIDTH` (630, ejemplo concreto escritorio, sin regresión).
- `newMovingBlock` con `floorNum` de Plataforma_Respiro y `canvasWidth` extremadamente angosto (p.ej. 30) produce `width === MIN_WIDTH` (piso mínimo, no negativo ni cero).
- `newMovingBlock` con `floorNum` de Plataforma_Respiro produce el mismo `state.moveSpeed` resultante (vía `applyReliefPlatformSpeedBoost`) sin importar si `canvasWidth` es angosto o ancho.

### Property-Based Tests

- Property 1 (Bug Condition/Fix Checking): generar `floorNum` de Plataforma_Respiro (usando `isReliefPlatformFloor` para filtrar/construir) y `canvasWidth < BASE_PLATFORM_WIDTH`, verificar `result.width === Math.max(MIN_WIDTH, Math.min(BASE_PLATFORM_WIDTH, canvasWidth))`.
- Property 2 (Preservation): generar `floorNum`/`canvasWidth` arbitrarios filtrados por la negación de la condición de bug, verificar igualdad exacta con el resultado del código original (`w`, y para la rama normal también `minX`/`maxX`/`x`/`dir`).
- Property 3 (Preservation): generar `floorNum` de Plataforma_Respiro con `canvasWidth` arbitrario (angosto o no), verificar que la transición de `state.moveSpeed` es idéntica a `applyReliefPlatformSpeedBoost` aplicada directamente.

### Integration Tests

- `dropBlock` seguido de la generación interna de `newMovingBlock` para un piso de Plataforma_Respiro con `width` (parámetro de `dropBlock`) angosto: el `state.moving` resultante tiene `width <= width` (el ancho del canvas) y `minX <= maxX`.
- Flujo completo: varios `dropBlock` consecutivos hasta alcanzar el piso 35 en un canvas angosto simulado, confirmando que el Bloque en Movimiento generado en ese piso cabe dentro del canvas.
- Flujo equivalente en un canvas ancho (escritorio), confirmando que el comportamiento no cambia respecto al actual.
