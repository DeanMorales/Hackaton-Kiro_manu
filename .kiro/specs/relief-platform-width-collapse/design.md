# Relief Platform Width Collapse Bugfix Design

## Overview

`computeNewFloor(prevFloor, movingBlock, isDoor, seed)` en `src/engine/tower.js` calcula hoy el `width`/`x` del piso resultante como la intersección geométrica (`overlap`) entre el Bloque en Movimiento y `prevFloor`. Esa regla es correcta para el caso normal, en el que el Bloque en Movimiento nunca es más ancho que el piso anterior. Pero Plataforma_Respiro y Bono_Racha_Perfecta (`endless-tower-difficulty-cap`) generan a propósito Bloques en Movimiento MÁS anchos que `prevFloor`, y en ese caso la intersección recorta el premio: el piso resultante termina tan angosto como `prevFloor`, anulando visualmente el ancho extra que el jugador vio al soltar el bloque.

La corrección es quirúrgica: dentro de `computeNewFloor`, cuando `movingBlock.width > prevFloor.width` Y el aterrizaje ya es válido (evaluado con las funciones `computeOverlap`/`decidesFall` existentes, sin modificarlas), el piso resultante toma `width = movingBlock.width` y `x = movingBlock.x` en vez de la intersección. Para todo lo demás (`movingBlock.width <= prevFloor.width`, el caso normal/legacy), el cálculo por intersección permanece exactamente igual que hoy. Los campos `bottom`/`top`/`height`/`isDoor`/`seed` no se tocan en ningún caso, y `computeOverlap`/`decidesFall` no se modifican ni se les cambia el orden de invocación respecto al de caída.

## Glossary

- **Bug_Condition (C)**: `movingBlock.width > prevFloor.width AND decidesFall(computeOverlap(prevFloor, movingBlock)) === false` — un Bloque en Movimiento premiado (más ancho que el piso anterior) que aterriza con éxito.
- **Property (P)**: el piso resultante SHALL tener `width === movingBlock.width` y `x === movingBlock.x`, conservando exactamente la forma y posición que el jugador vio al soltar el bloque.
- **Preservation**: para `movingBlock.width <= prevFloor.width` (caso normal), el cálculo de `width`/`x` por intersección (`overlap`) permanece idéntico al actual; y para todo bloque sin excepción, `computeOverlap`/`decidesFall` (detección de caída) permanecen sin modificar y se invocan exactamente igual.
- **`computeNewFloor(prevFloor, movingBlock, isDoor, seed)`**: función pura en `src/engine/tower.js` que produce el objeto `Floor` cuando el jugador suelta el Bloque en Movimiento y el aterrizaje no cae.
- **`computeOverlap(prevFloor, movingBlock)`**: función pura existente que calcula la longitud del solapamiento horizontal entre el Bloque en Movimiento y el piso anterior. No se modifica.
- **`decidesFall(overlap)`**: función pura existente (`overlap < 16`) que decide si el solapamiento es insuficiente y el jugador cae. No se modifica.
- **`prevFloor`**: el piso sobre el que se apoya el nuevo piso, `topFloor(state)` en el momento de `dropBlock`.
- **`movingBlock`**: el Bloque en Movimiento que el jugador suelta (`state.moving`), cuyo `width` puede exceder `prevFloor.width` por Plataforma_Respiro o Bono_Racha_Perfecta.
- **`newMovingBlock(state, afterFloor, canvasWidth)`**: función pura existente que genera el SIGUIENTE Bloque en Movimiento a partir del piso recién colocado (`afterFloor`). No se modifica; solo recibe un `newFloor` potencialmente más ancho/posicionado distinto como `afterFloor`.

## Bug Details

### Bug Condition

El bug se manifiesta cuando el Bloque en Movimiento que el jugador suelta es más ancho que `prevFloor` (producido por Plataforma_Respiro y/o Bono_Racha_Perfecta de `endless-tower-difficulty-cap`) y el aterrizaje es válido según la regla de caída existente. `computeNewFloor` usa incondicionalmente `left = max(movingBlock.x, prevFloor.x)` y `right = min(movingBlock.x + movingBlock.width, prevFloor.x + prevFloor.width)` para derivar `x`/`width`, lo cual recorta el ancho premiado a la intersección con el piso más angosto de abajo.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input = { prevFloor, movingBlock }
  OUTPUT: boolean

  RETURN input.movingBlock.width > input.prevFloor.width
         AND decidesFall(computeOverlap(input.prevFloor, input.movingBlock)) === false
         AND computeNewFloor(input.prevFloor, input.movingBlock, false, 0).width
             !== input.movingBlock.width
END FUNCTION
```

### Examples

- `prevFloor = { x: 400, width: 200 }`, `movingBlock = { x: 380, width: 400 }` (Plataforma_Respiro, solapamiento total). Esperado: piso resultante `width = 400`, `x = 380`. Actual: `overlap` da `x = max(380,400)=400`, `width = min(780,600)-400 = 200` — el piso queda tan angosto como `prevFloor`, perdiendo por completo el ancho premiado.
- `prevFloor = { x: 500, width: 210 }`, `movingBlock = { x: 470, width: 300 }` (Bono_Racha_Perfecta). Esperado: `width = 300`, `x = 470`. Actual: `width = min(770,710)-max(470,500) = 710-500 = 210`, `x = 500` — recorte parcial, el piso pierde 90px del premio.
- Caso normal (sin bug): `prevFloor = { x: 300, width: 210 }`, `movingBlock = { x: 320, width: 150 }` (`movingBlock.width <= prevFloor.width`). El comportamiento de intersección es correcto y debe permanecer igual: `width = min(470,510)-max(320,300) = 470-320 = 150`, `x = 320`.
- Edge case — aterrizaje inválido con bloque premiado: `prevFloor = { x: 400, width: 200 }`, `movingBlock = { x: 590, width: 400 }` (`overlap = min(990,600)-max(590,400) = 600-590 = 10 < 16`). Esperado: `decidesFall(10) === true`, el jugador cae — `computeNewFloor` no debe ni llegar a ejecutarse para este caso, y esta corrección no debe cambiar ese resultado.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Para `movingBlock.width <= prevFloor.width` (caso normal, fuera de Plataforma_Respiro/Bono_Racha_Perfecta), `width`/`x` del piso resultante SHALL seguir calculándose por la fórmula de intersección exacta de hoy.
- `computeOverlap`/`decidesFall` SHALL permanecer sin modificar, para todo Bloque en Movimiento sin excepción — un aterrizaje que hoy cae (`overlap < 16`) SHALL CONTINUE cayendo exactamente igual.
- `bottom`, `top`, `height`, `isDoor`, `seed` del piso resultante SHALL seguir derivándose exactamente igual que hoy (`prevFloor.top`, `movingBlock.height`, los parámetros `isDoor`/`seed` recibidos), sin ningún cambio introducido por esta corrección.
- El acotado de `MovingBlock.width` a `BASE_PLATFORM_WIDTH` (630px) en `newMovingBlock` SHALL permanecer sin cambios; esta corrección no toca cómo se genera el ancho del Bloque en Movimiento, solo cómo se traduce ese ancho al piso una vez colocado.

**Scope:**
Todos los inputs donde `movingBlock.width <= prevFloor.width` (la inmensa mayoría de los aterrizajes, fuera de Plataforma_Respiro/Bono_Racha_Perfecta) permanecen completamente inafectados por este fix. Esto incluye:
- Aterrizajes normales sin ningún bono de ancho activo.
- Cualquier aterrizaje que resulte en caída (`decidesFall(overlap) === true`), sin importar si el bloque era premiado o no.
- La generación del siguiente Bloque en Movimiento (`newMovingBlock`), que no se modifica.

## Hypothesized Root Cause

Confirmado por el análisis en `bugfix.md`:

1. **Fórmula de intersección aplicada incondicionalmente**: `computeNewFloor` fue diseñada antes de que existieran Bloques en Movimiento más anchos que `prevFloor` (la invariante `movingBlock.width <= prevFloor.width` se mantenía siempre en el juego original). La fórmula `left = max(...)`, `right = min(...)` asume implícitamente esa invariante; cuando `endless-tower-difficulty-cap` la rompe a propósito (Plataforma_Respiro, Bono_Racha_Perfecta), la intersección deja de representar "todo el bloque cabe en el piso de abajo" y empieza a representar "recorte al ancho del piso más angosto de los dos".
2. **No hay rama especial para el caso premiado**: no existe ninguna verificación de `movingBlock.width > prevFloor.width` en `computeNewFloor` hoy; la función trata todos los casos de la misma forma, por lo que el "premio" de ancho extra se pierde silenciosamente en el momento de aterrizar, incluso cuando el aterrizaje fue válido.
3. **La detección de caída ya es independiente y correcta**: `decidesFall(computeOverlap(...))` ya evalúa correctamente si el aterrizaje es válido (usa el mismo `overlap`, que sigue siendo la medida correcta de "cuánto se tocan" para decidir la caída). El bug es exclusivamente de asignación de `width`/`x` al piso, no de la lógica de caída — por eso la corrección no debe tocar `computeOverlap`/`decidesFall`.

## Correctness Properties

Property 1: Bug Condition - El piso resultante conserva el ancho completo del Bloque en Movimiento premiado

_For any_ `prevFloor` y `movingBlock` tales que `movingBlock.width > prevFloor.width` y `decidesFall(computeOverlap(prevFloor, movingBlock)) === false` (aterrizaje válido evaluado con las funciones de caída sin modificar), el `computeNewFloor` corregido SHALL producir `width === movingBlock.width` y `x === movingBlock.x`, sin recortar al solapamiento con `prevFloor`.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - El caso normal (bloque no más ancho que el piso anterior) sigue usando la fórmula de intersección exacta de hoy

_For any_ `prevFloor` y `movingBlock` tales que `movingBlock.width <= prevFloor.width`, el `computeNewFloor` corregido SHALL producir exactamente el mismo `width` y `x` que la fórmula de intersección original (`x = max(movingBlock.x, prevFloor.x)`, `width = min(movingBlock.x + movingBlock.width, prevFloor.x + prevFloor.width) - x`), sin ninguna diferencia, incluyendo los casos en que el aterrizaje resulta en caída.

**Validates: Requirements 3.1, 3.2**

Property 3: Preservation - `computeOverlap`/`decidesFall` y la detección de caída permanecen byte-por-byte idénticas para todo bloque

_For any_ `prevFloor` y `movingBlock` arbitrarios (con o sin `movingBlock.width > prevFloor.width`), el valor devuelto por `computeOverlap(prevFloor, movingBlock)` y por `decidesFall(overlap)` tras la corrección SHALL ser idéntico, valor por valor, al que producían antes de la corrección — es decir, ningún aterrizaje que hoy decide caída (`overlap < 16`) puede dejar de decidir caída tras el fix, y viceversa, independientemente del ancho relativo de `movingBlock` respecto a `prevFloor`.

**Validates: Requirements 2.3, 3.2, 3.3**

Property 4: Preservation - Los campos no relacionados con `width`/`x` permanecen sin cambios

_For any_ `prevFloor`, `movingBlock`, `isDoor`, `seed` arbitrarios donde el aterrizaje es válido, el `computeNewFloor` corregido SHALL producir `bottom === prevFloor.top`, `top === prevFloor.top + movingBlock.height`, `height === movingBlock.height`, `isDoor === isDoor` (el parámetro recibido) y `seed === seed` (el parámetro recibido), exactamente igual que antes de la corrección, sin importar si el piso cayó en la rama del Property 1 o en la rama del Property 2.

**Validates: Requirement 3.5**

## Fix Implementation

### Changes Required

Cambio mínimo, contenido enteramente dentro de `computeNewFloor` en `src/engine/tower.js`. No se toca `computeOverlap` ni `decidesFall`, ni su orden de invocación relativo dentro de `dropBlock` (la comprobación de caída en `dropBlock` sigue llamando a `computeOverlap`/`decidesFall` exactamente igual que hoy, antes de llamar a `computeNewFloor`).

**File**: `src/engine/tower.js`

**Function**: `computeNewFloor`

**Specific Changes**:

1. **Añadir una rama condicional para el caso premiado**: si `movingBlock.width > prevFloor.width`, el `x`/`width` del piso resultante se fijan directamente a `movingBlock.x`/`movingBlock.width`, sin pasar por `left`/`right`/`overlap`.
2. **Mantener `overlap` (vía `computeOverlap`) solo para el caso normal**: cuando `movingBlock.width <= prevFloor.width`, se preserva exactamente la fórmula actual (`left`/`right`/`overlap`), reutilizando la función `computeOverlap` ya existente en lugar de reimplementar la resta de `left`/`right` inline, sin cambiar su resultado numérico.
3. **No modificar `bottom`/`top`/`height`/`isDoor`/`seed`**: estos cinco campos se calculan exactamente igual en ambas ramas, tal como hoy.
4. **No modificar `dropBlock`**: la llamada `computeOverlap(prev, moving)` / `decidesFall(overlap)` que decide si el jugador cae permanece antes de invocar `computeNewFloor`, sin cambios de orden ni de argumentos.

**Código exacto de `computeNewFloor` tras el fix:**

```js
export function computeNewFloor(prevFloor, movingBlock, isDoor, seed) {
  let x;
  let width;

  if (movingBlock.width > prevFloor.width) {
    // Requirement 2.1/2.2: Bloque en Movimiento premiado (Plataforma_Respiro / Bono_Racha_Perfecta)
    // que aterrizó con éxito (la caída ya fue descartada en dropBlock vía computeOverlap/decidesFall,
    // sin modificar). El piso resultante conserva el ancho y la posición completos del bloque,
    // en vez de recortarse a la intersección con prevFloor.
    x = movingBlock.x;
    width = movingBlock.width;
  } else {
    // Caso normal/legacy (Requirement 3.1): sin cambios respecto al comportamiento actual.
    const left = Math.max(movingBlock.x, prevFloor.x);
    const right = Math.min(movingBlock.x + movingBlock.width, prevFloor.x + prevFloor.width);
    x = left;
    width = right - left;
  }

  return {
    bottom: prevFloor.top, top: prevFloor.top + movingBlock.height,
    x, width, height: movingBlock.height, isDoor, seed,
  };
}
```

Nota: `computeOverlap`/`decidesFall` no se invocan dentro de `computeNewFloor` (no lo hacían antes tampoco); la decisión de caída ya fue tomada en `dropBlock` antes de llegar aquí, y esa lógica queda completamente intacta. La rama `else` reproduce carácter por carácter la fórmula original (`left`/`right`/`overlap` como resta), por lo que el Property 2 se cumple por construcción, no solo por intención.

### Downstream Analysis: `newMovingBlock(state, newFloor, canvasWidth)` con un `newFloor` inusualmente ancho

Tras el fix, el `newFloor` empujado a `state.floors` puede tener `width` mayor que antes (hasta `movingBlock.width`, acotado ya a `BASE_PLATFORM_WIDTH` = 630px por `newMovingBlock` en la generación del bloque, sin cambios de esta corrección) y una posición `x` distinta (la del bloque al soltarse, no la recortada). La siguiente llamada a `newMovingBlock(state, newFloor, canvasWidth)` lee `afterFloor.x`/`afterFloor.width` para:

- `maxWidthWithStreakBonus = min(afterFloor.width + bono, canvasWidth)`: ya soportaba cualquier `afterFloor.width` hasta 630px (el propio piso base arranca con `width = BASE_PLATFORM_WIDTH = 630`), así que un `newFloor.width` más ancho (hasta ese mismo tope) no introduce ningún valor fuera del rango que la función ya maneja hoy.
- `minX = max(0, afterFloor.x - 90)` y `maxX = min(canvasWidth ?? (afterFloor.x + afterFloor.width + 90), afterFloor.x + afterFloor.width + 90) - w`: son funciones puras de `afterFloor.x`/`afterFloor.width`/`canvasWidth` que ya se acotan a `[0, canvasWidth]` mediante los `max(0, ...)`/`min(canvasWidth, ...)` existentes, para cualquier combinación de `x`/`width` de `afterFloor` — incluido el caso del piso base (630px, centrado). Un `newFloor` más ancho o desplazado simplemente traslada el rango `[minX, maxX]` disponible para el siguiente bloque, sin poder producir `maxX < minX` de forma distinta a como ya podía ocurrir hoy con pisos angostos cerca del borde del canvas (ese caso límite, si existe, es preexistente y no se agrava por este fix: `w` en sí sigue acotado por `MIN_WIDTH`/`BASE_PLATFORM_WIDTH` igual que siempre).

**Conclusión**: `newMovingBlock` no requiere ningún cambio ni manejo especial. Ya trata `afterFloor.width` como un valor arbitrario acotado por `BASE_PLATFORM_WIDTH`, y esta corrección no produce ningún `newFloor.width` que exceda ese tope (el `movingBlock.width` que se copia ya viene acotado por la propia `newMovingBlock` en su generación previa) ni ningún `newFloor.x` fuera de los rangos que la función ya sabe absorber vía sus `max(0, ...)`/`min(canvasWidth, ...)`.

## Testing Strategy

### Validation Approach

Enfoque de dos fases: primero surfacear contraejemplos que demuestren el bug en el código sin corregir (confirmando que el recorte por intersección ocurre hoy para bloques premiados), luego verificar que el fix produce el comportamiento esperado y no altera ningún caso normal ni la lógica de caída.

### Exploratory Bug Condition Checking

**Goal**: Confirmar, sobre el código SIN corregir, que `computeNewFloor` recorta el ancho de un Bloque en Movimiento premiado a la intersección con `prevFloor`, validando el diagnóstico de causa raíz.

**Test Plan**: Llamar a `computeNewFloor` (versión actual) con pares `prevFloor`/`movingBlock` donde `movingBlock.width > prevFloor.width` y el solapamiento es suficiente para no caer, y observar que `result.width !== movingBlock.width`.

**Test Cases**:
1. **Plataforma_Respiro con solapamiento total**: `movingBlock` de ancho doble, totalmente contenido dentro del rango de `prevFloor` desplazado — el piso resultante queda tan angosto como `prevFloor` (falla en código sin corregir).
2. **Bono_Racha_Perfecta con solapamiento parcial**: `movingBlock` moderadamente más ancho, con solapamiento parcial — el piso resultante pierde parte del ancho premiado (falla en código sin corregir).
3. **Caso límite en el borde de caída**: `overlap` justo por encima de 16 con `movingBlock` premiado — el piso resultante aún se recorta pese a que el aterrizaje fue válido (falla en código sin corregir).
4. **Caso normal (control)**: `movingBlock.width <= prevFloor.width` — el resultado ya coincide con lo esperado hoy (no debería fallar; sirve para confirmar que el contraejemplo es específico al caso premiado).

**Expected Counterexamples**:
- `computeNewFloor(prevFloor, movingBlock, ...).width < movingBlock.width` cuando `movingBlock.width > prevFloor.width` y el aterrizaje es válido.
- Causa confirmada: la fórmula de intersección (`left`/`right`/`overlap`) se aplica incondicionalmente, sin distinguir el caso premiado.

### Fix Checking

**Goal**: Verificar que para todo input donde la condición de bug se cumple, la función corregida produce el comportamiento esperado (Property 1).

**Pseudocode:**
```
FOR ALL (prevFloor, movingBlock) WHERE
    movingBlock.width > prevFloor.width
    AND decidesFall(computeOverlap(prevFloor, movingBlock)) === false DO
  result := computeNewFloor_fixed(prevFloor, movingBlock, isDoor, seed)
  ASSERT result.width === movingBlock.width
  ASSERT result.x === movingBlock.x
END FOR
```

### Preservation Checking

**Goal**: Verificar que para todo input donde la condición de bug NO se cumple, la función corregida produce exactamente el mismo resultado que la fórmula de intersección original (Property 2), y que `computeOverlap`/`decidesFall` no cambian para ningún input (Property 3).

**Pseudocode:**
```
FOR ALL (prevFloor, movingBlock) WHERE movingBlock.width <= prevFloor.width DO
  ASSERT computeNewFloor_original(prevFloor, movingBlock, isDoor, seed)
      = computeNewFloor_fixed(prevFloor, movingBlock, isDoor, seed)
END FOR

FOR ALL (prevFloor, movingBlock) DO
  ASSERT computeOverlap(prevFloor, movingBlock) unchanged
  ASSERT decidesFall(computeOverlap(prevFloor, movingBlock)) unchanged
END FOR
```

**Testing Approach**: Property-based testing es la técnica recomendada, porque:
- Genera automáticamente muchas combinaciones de `prevFloor.x`/`width` y `movingBlock.x`/`width`, incluyendo el borde exacto `movingBlock.width === prevFloor.width` y el borde `overlap === 16`.
- Cubre casos donde `movingBlock.width > prevFloor.width` con solapamiento insuficiente (debe seguir cayendo) sin necesidad de enumerarlos a mano.
- Da garantías fuertes de que ningún input normal (`movingBlock.width <= prevFloor.width`) cambia de comportamiento tras el fix.

**Test Plan**: Observar primero el comportamiento del código SIN corregir para el caso normal (`movingBlock.width <= prevFloor.width`) y para `computeOverlap`/`decidesFall` en general, y capturarlo como el oráculo de referencia (la fórmula de intersección misma, reimplementada en el test); luego escribir los tests de propiedades que comparan contra ese oráculo tanto antes como después del fix.

**Test Cases**:
1. **Preservación del caso normal**: para `movingBlock.width <= prevFloor.width` generado aleatoriamente, `computeNewFloor` corregido coincide con la fórmula de intersección de referencia.
2. **Preservación de la detección de caída**: para pares arbitrarios (con o sin bloque premiado), `computeOverlap`/`decidesFall` producen el mismo valor antes y después del fix.
3. **Preservación de campos no afectados**: `bottom`/`top`/`height`/`isDoor`/`seed` idénticos a los parámetros/derivaciones esperadas en ambas ramas.

### Unit Tests

- `computeNewFloor` con `movingBlock` más ancho que `prevFloor` y aterrizaje válido produce `width === movingBlock.width`, `x === movingBlock.x` (ejemplo concreto de Plataforma_Respiro).
- `computeNewFloor` con `movingBlock.width <= prevFloor.width` produce el mismo resultado que hoy (ejemplo concreto, valores fijos).
- `computeOverlap`/`decidesFall` siguen decidiendo caída correctamente para un `movingBlock` premiado con solapamiento insuficiente (`overlap < 16`), verificando que `dropBlock` sigue devolviendo `{ type: 'fell', ... }` en ese caso.
- `computeNewFloor` en ambas ramas produce `bottom`/`top`/`height`/`isDoor`/`seed` idénticos a los parámetros esperados.

### Property-Based Tests

- Property 1 (Bug Condition/Fix Checking): generar `prevFloor`/`movingBlock` aleatorios filtrados por `movingBlock.width > prevFloor.width AND decidesFall(computeOverlap(...)) === false`, verificar `result.width === movingBlock.width` y `result.x === movingBlock.x`.
- Property 2 (Preservation): generar `prevFloor`/`movingBlock` aleatorios filtrados por `movingBlock.width <= prevFloor.width`, verificar igualdad exacta con la fórmula de intersección de referencia.
- Property 3 (Preservation): generar `prevFloor`/`movingBlock` completamente arbitrarios (sin filtrar por ancho relativo), verificar que `computeOverlap`/`decidesFall` no cambian de valor.
- Property 4 (Preservation): generar `prevFloor`/`movingBlock`/`isDoor`/`seed` arbitrarios con aterrizaje válido, verificar `bottom`/`top`/`height`/`isDoor`/`seed` en ambas ramas.

### Integration Tests

- `dropBlock` con un `state.moving` de ancho premiado (simulando Plataforma_Respiro/Bono_Racha_Perfecta) sobre un `topFloor` más angosto: el piso empujado a `state.floors` conserva el ancho completo del bloque, y la siguiente llamada interna a `newMovingBlock` genera un bloque válido (`minX <= maxX`, `width` dentro de `[MIN_WIDTH, BASE_PLATFORM_WIDTH]`).
- `dropBlock` con un `state.moving` premiado pero con solapamiento insuficiente: sigue devolviendo `{ type: 'fell', ... }`, sin construir ningún piso.
- Flujo completo Plataforma_Respiro → aterrizaje → siguiente Bloque en Movimiento: el piso ancho resultante no rompe la generación del siguiente bloque ni el ciclo normal de `dropBlock`/`update`.
