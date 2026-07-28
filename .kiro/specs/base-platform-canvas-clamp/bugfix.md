# Documento de Requisitos de Corrección de Bug

## Introduction

`createTowerState(width, height)` y `resetGame(state, width, height)` en `src/engine/tower.js` construyen la Plataforma Base inicial de la torre (`baseFloor`), el primer piso sobre el que se apoya todo lo demás. Ambas funciones ya reciben `width` (el ancho del canvas visible) como parámetro, pero al calcular el ancho de la Plataforma Base no lo usan en absoluto:

```js
const baseFloor = {
  bottom: 0,
  top: 64,
  x: (width - computeBasePlatformWidth()) / 2,
  width: computeBasePlatformWidth(),
  height: 64,
  isDoor: false,
  seed: Math.random(),
};
```

`computeBasePlatformWidth()` devuelve siempre la constante fija `BASE_PLATFORM_WIDTH` (630px, `BASE_WIDTH * 3`), sin ningún acotado a `width`. En un canvas de escritorio (≥630px de ancho) esto es inofensivo: la Plataforma Base cabe perfectamente centrada y coincide con el comportamiento actual esperado. Pero en un canvas móvil angosto (por ejemplo, 375px de ancho), `baseFloor.width` sigue midiendo 630px y `baseFloor.x = (375 - 630) / 2 = -127.5`, es decir, la Plataforma Base arranca 127.5px fuera del borde izquierdo del canvas. El resultado es que, desde el primer instante del juego (antes de que el jugador haga nada), la plataforma inicial de la torre queda parcialmente invisible y descentrada.

Este es el mismo patrón de bug ya corregido en la spec `relief-platform-canvas-clamp` (que acotó el ancho "premio" de la Plataforma_Respiro en `newMovingBlock`), pero aquí afecta a la Plataforma Base construida en `createTowerState`/`resetGame`, no a un Bloque en Movimiento generado dinámicamente. El objetivo de esta corrección es que, en canvases donde `width >= BASE_PLATFORM_WIDTH` (o `width` no definido), la Plataforma Base siga siendo exactamente `BASE_PLATFORM_WIDTH` centrada, sin ningún cambio; y que en canvases más angostos, la Plataforma Base se acote a `width` (con un margen mínimo razonable) y permanezca centrada horizontalmente dentro del canvas.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN se llama a `createTowerState(width, height)` con `width` menor que `BASE_PLATFORM_WIDTH` (630px) THEN el sistema asigna a la Plataforma Base (`baseFloor`) un ancho (`width`) igual a `BASE_PLATFORM_WIDTH`, sin acotarlo al `width` del canvas, produciendo una plataforma más ancha que el canvas visible.

1.2 WHEN ocurre el escenario del criterio 1.1 THEN el sistema calcula `baseFloor.x = (width - BASE_PLATFORM_WIDTH) / 2` con un `BASE_PLATFORM_WIDTH` que ya excede `width`, resultando en un valor de `x` negativo, por lo que la Plataforma Base arranca fuera del borde izquierdo del canvas y queda parcialmente invisible desde el inicio del juego.

1.3 WHEN se llama a `resetGame(state, width, height)` con `width` menor que `BASE_PLATFORM_WIDTH` THEN el sistema reconstruye la Plataforma Base con el mismo defecto descrito en 1.1 y 1.2, ya que `resetGame` calcula `baseFloor` con la misma fórmula que `createTowerState`.

### Expected Behavior (Correct)

2.1 WHEN se llama a `createTowerState(width, height)` o `resetGame(state, width, height)` con `width` mayor o igual que `BASE_PLATFORM_WIDTH` (o `width` no está definido) THEN el sistema SHALL asignar a la Plataforma Base un ancho igual a `BASE_PLATFORM_WIDTH`, exactamente igual que hoy (sin regresión en escritorio).

2.2 WHEN se llama a `createTowerState(width, height)` o `resetGame(state, width, height)` con `width` menor que `BASE_PLATFORM_WIDTH` THEN el sistema SHALL acotar el ancho de la Plataforma Base a `width` (con un margen mínimo razonable definido en el diseño), de modo que la Plataforma Base quepa siempre dentro del canvas visible.

2.3 WHEN ocurre el escenario del criterio 2.2 THEN el sistema SHALL calcular `baseFloor.x` de modo que la Plataforma Base (con su ancho ya acotado) permanezca centrada horizontalmente dentro del canvas, es decir, `baseFloor.x = (width - width_acotado_de_la_plataforma) / 2`.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN se llama a `createTowerState(width, height)` o `resetGame(state, width, height)` con `width` mayor o igual que `BASE_PLATFORM_WIDTH` (incluyendo `width` no definido/`undefined`) THEN el sistema SHALL CONTINUE TO producir exactamente el mismo `baseFloor.width` (`BASE_PLATFORM_WIDTH`) y el mismo `baseFloor.x` que produce hoy, sin ninguna diferencia (caso de escritorio, sin regresión).

3.2 WHEN se construye la Plataforma Base (en cualquier `width`) THEN el sistema SHALL CONTINUE TO dejar sin cambios el resto de los campos de `baseFloor` (`bottom`, `top`, `height`, `isDoor`, `seed`), que no dependen de `width` ni de `computeBasePlatformWidth()`.

3.3 WHEN se llama a `createTowerState(width, height)` THEN el sistema SHALL CONTINUE TO construir el resto del estado inicial (nubes, `moveSpeed`, `perfectStreak`, `streakWidthBonus`, `camElev`/`camElevTarget`, `anchorScreenY`, `knight`, `doorsPassed`, `pendingBossLevel`, `activeBiome`, `activeTimeOfDay`, etc.) exactamente igual que hoy, sin ningún cambio introducido por esta corrección.

3.4 WHEN se llama a `resetGame(state, width, height)` THEN el sistema SHALL CONTINUE TO reiniciar el resto de los campos del `state` (`moveSpeed`, `perfectStreak`, `streakWidthBonus`, `camElev`/`camElevTarget`, `anchorScreenY`, `knight`, `doorsPassed`, `pendingBossLevel`, `activeBiome`, `activeTimeOfDay`, `clouds`, y la generación de `state.moving` vía `newMovingBlock(state, baseFloor, width)`) exactamente igual que hoy, tomando como entrada la `baseFloor` ya corregida.

3.5 WHEN se llama a `computeBasePlatformWidth()` sin ningún argumento (uso existente fuera de `baseFloor`, si lo hubiera) THEN el sistema SHALL CONTINUE TO devolver `BASE_PLATFORM_WIDTH` sin cambios; esta corrección no modifica la firma ni el comportamiento de `computeBasePlatformWidth()`, el acotado se aplica únicamente al construir `baseFloor`.
