# Documento de Requisitos de Corrección de Bug

## Introduction

`newMovingBlock(state, afterFloor, canvasWidth)` en `src/engine/tower.js` genera el ancho (`w`) del Bloque en Movimiento antes de que el jugador lo suelte. En la rama normal, ese ancho se acota correctamente al ancho disponible del canvas: `maxWidthWithStreakBonus = Math.min(afterFloor.width + streakBonus, canvasWidth ?? Infinity)`. Esto asegura que, en un canvas móvil angosto, el Bloque en Movimiento nunca sea más ancho que la pantalla visible.

Sin embargo, cuando el piso que se está generando corresponde a una Plataforma_Respiro (`isReliefPlatformFloor(state.floors.length)`, piso 35, 65, 95... indefinidamente, ver `endless-tower-difficulty-cap`), la función sobrescribe `w` directamente con la constante fija `BASE_PLATFORM_WIDTH` (630px), sin pasar por ningún clamp de `canvasWidth`:

```js
if (isReliefPlatformFloor(state.floors.length)) {
  w = BASE_PLATFORM_WIDTH;
  state.moveSpeed = applyReliefPlatformSpeedBoost(state.moveSpeed);
}
```

En un canvas de escritorio (≥630px de ancho) esto es inofensivo: el bloque cabe perfectamente y coincide con el comportamiento actual esperado. Pero en un canvas móvil angosto (por ejemplo, 375px de ancho), el Bloque en Movimiento generado mide 630px — mucho más ancho que la pantalla visible — lo que rompe el layout y la jugabilidad: el bloque queda parcialmente fuera del canvas y el jugador no puede operarlo con normalidad.

Cabe notar que `minX`/`maxX` (el rango de movimiento horizontal del bloque) sí se acotan usando `canvasWidth` en esta misma función, pero eso no soluciona el problema porque el ancho del bloque (`w`) ya excede `canvasWidth` desde el momento en que se asigna, antes de calcular `minX`/`maxX`.

El objetivo de esta corrección es que, cuando aparece una Plataforma_Respiro, su ancho siga siendo `BASE_PLATFORM_WIDTH` en los canvases donde eso cabe (sin cambios respecto al comportamiento actual de escritorio), pero se acote a `canvasWidth` en los canvases más angostos que `BASE_PLATFORM_WIDTH`, igual que ya hace la rama normal. El resto de la lógica de Plataforma_Respiro — en particular el +0.5% de velocidad compuesto (`applyReliefPlatformSpeedBoost`) — no debe cambiar.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN el piso que se está generando es una Plataforma_Respiro (`isReliefPlatformFloor(state.floors.length) === true`) AND `canvasWidth` es menor que `BASE_PLATFORM_WIDTH` (630px) THEN el sistema asigna al Bloque en Movimiento un ancho (`w`) igual a `BASE_PLATFORM_WIDTH`, sin acotarlo a `canvasWidth`, produciendo un bloque más ancho que el canvas visible.

1.2 WHEN ocurre el escenario del criterio 1.1 THEN el sistema calcula `minX`/`maxX` (el rango de movimiento horizontal del bloque) a partir de un `w` que ya excede `canvasWidth`, por lo que el bloque en movimiento queda parcialmente fuera del área visible del canvas durante todo su recorrido, independientemente del rango de movimiento resultante.

### Expected Behavior (Correct)

2.1 WHEN el piso que se está generando es una Plataforma_Respiro (`isReliefPlatformFloor(state.floors.length) === true`) AND `canvasWidth` es mayor o igual que `BASE_PLATFORM_WIDTH` (o `canvasWidth` no está definido) THEN el sistema SHALL asignar al Bloque en Movimiento un ancho (`w`) igual a `BASE_PLATFORM_WIDTH`, exactamente igual que hoy (sin regresión en escritorio).

2.2 WHEN el piso que se está generando es una Plataforma_Respiro (`isReliefPlatformFloor(state.floors.length) === true`) AND `canvasWidth` es menor que `BASE_PLATFORM_WIDTH` THEN el sistema SHALL acotar el ancho (`w`) del Bloque en Movimiento a `canvasWidth` (con un margen mínimo razonable definido en el diseño), de modo que el bloque quepa siempre dentro del canvas visible.

2.3 WHEN ocurre el escenario del criterio 2.2 THEN el sistema SHALL seguir aplicando el incremento de velocidad de Plataforma_Respiro (`applyReliefPlatformSpeedBoost`) exactamente igual que en el criterio 2.1, sin que el acotado de ancho afecte el cálculo de velocidad.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN el piso que se está generando NO es una Plataforma_Respiro (`isReliefPlatformFloor(state.floors.length) === false`) THEN el sistema SHALL CONTINUE TO calcular el ancho del Bloque en Movimiento exactamente igual que hoy (rama normal con `maxWidthWithStreakBonus` acotado por `canvasWidth`, más el Bono_Racha_Perfecta si corresponde), sin ningún cambio introducido por esta corrección.

3.2 WHEN el piso que se está generando es una Plataforma_Respiro Y `canvasWidth` es mayor o igual que `BASE_PLATFORM_WIDTH` (incluyendo `canvasWidth` no definido/`undefined`) THEN el sistema SHALL CONTINUE TO producir exactamente el mismo ancho (`BASE_PLATFORM_WIDTH`) que produce hoy, sin ninguna diferencia (caso de escritorio, sin regresión).

3.3 WHEN se calcula `minX`/`maxX` para el Bloque en Movimiento (Plataforma_Respiro o no) THEN el sistema SHALL CONTINUE TO usar la misma fórmula de acotado a `canvasWidth` que usa hoy, tomando como entrada el `w` ya corregido; esta corrección no modifica la fórmula de `minX`/`maxX`, solo el valor de `w` que Plataforma_Respiro le entrega en canvases angostos.

3.4 WHEN se genera una Plataforma_Respiro THEN el sistema SHALL CONTINUE TO aplicar el incremento de velocidad `applyReliefPlatformSpeedBoost(state.moveSpeed)` de la misma forma que hoy, independientemente del ancho final asignado al bloque.

3.5 WHEN el piso que se está generando NO es una Plataforma_Respiro THEN el sistema SHALL CONTINUE TO dejar `state.moveSpeed` sin modificar por esta lógica (el incremento de velocidad de Plataforma_Respiro solo se aplica cuando `isReliefPlatformFloor` es verdadero), exactamente igual que hoy.
