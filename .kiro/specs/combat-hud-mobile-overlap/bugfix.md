# Bugfix Requirements Document

## Introduction

En la pantalla de combate (`#bossScreen`) de "Torre de las Nubes — Duelo AWS", los contenedores de nombre y barra de vida del guerrero (`.combatant-hp-player`) y del guardián/boss (`.combatant-hp-boss`) se posicionan mediante `.combatant-hp{position:absolute; top:min(4vh,34px);}`, un valor prácticamente idéntico al `top:14px` del HUD superior (`#hud`, que muestra el contador de trofeos, piso, puerta y el botón de ajustes). En resoluciones móviles bajas (320-375px de ancho de viewport), dentro del breakpoint existente `@media (max-width:520px)`, el único ajuste aplicado a `.combatant-hp` es `width:140px` (reducción de ancho), sin ningún reposicionamiento vertical. Como resultado, el nombre y la barra de vida de cada combatiente quedan parcial o totalmente solapados/ocultos detrás del HUD superior, que en móvil puede ocupar más altura de la disponible entre su `top:14px` y los `min(4vh,34px)` donde arrancan `.combatant-hp-player`/`.combatant-hp-boss` — especialmente si las pills del HUD (`.hud-pill`) se envuelven en dos filas por `flex-wrap:wrap`.

Esta funcionalidad corrige ese solapamiento aplicando, exclusivamente dentro de `@media (max-width:520px)`, un reposicionamiento vertical de `.combatant-hp` que garantice espacio suficiente debajo del HUD superior en móvil, siguiendo el mismo enfoque de ajustes puntuales por breakpoint ya usado en las specs hermanas `hud-responsive-layout` y `combat-cards-mobile-layout`, sin alterar el posicionamiento en escritorio/tablet (`>520px`) ni ningún otro estilo de `#hud`, `.hud-pill` o de los elementos internos de `.combatant-hp` (`.hp-label`, `.difficulty-tag`, `.hp-bar`, `.pip`).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN el viewport está en un ancho ≤520px (dentro de `@media (max-width:520px)`) y la pantalla de combate (`#bossScreen`) está visible THEN el sistema posiciona `.combatant-hp-player` y `.combatant-hp-boss` con `top:min(4vh,34px)` (el mismo valor usado en escritorio), sin ningún ajuste vertical adicional en móvil más allá de `width:140px`.

1.2 WHEN el viewport está en un ancho ≤520px y `#hud` ocupa una altura real (offset `top:14px` + altura de sus `.hud-pill` en móvil, potencialmente en dos filas por `flex-wrap:wrap`) mayor a `min(4vh,34px)` THEN el sistema muestra el `.hp-label` (nombre "Tu vida"/"Guardián") y/o la `.hp-bar` (barra de vida) de `.combatant-hp-player`/`.combatant-hp-boss` parcial o totalmente solapados u ocultos detrás de `#hud` (`z-index:25`), reduciendo o eliminando su visibilidad.

1.3 WHEN el viewport está en un ancho ≤520px y el HUD superior se envuelve en dos filas (por ejemplo, cuando las cuatro `.hud-pill` no caben en una sola fila dentro del ancho disponible) THEN el sistema agrava el solapamiento descrito en 1.2, ya que la altura real ocupada por `#hud` aumenta pero `.combatant-hp` no recibe ningún ajuste adicional para compensarlo.

### Expected Behavior (Correct)

2.1 WHEN el viewport está en `@media (max-width:520px)` y la pantalla de combate está visible THEN el sistema SHALL posicionar `.combatant-hp-player` y `.combatant-hp-boss` con un `top` mayor al valor de escritorio (`min(4vh,34px)`), suficiente para que quede espacio libre debajo de la altura real ocupada por `#hud` en móvil.

2.2 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL mostrar el `.hp-label` y la `.hp-bar` de `.combatant-hp-player` y `.combatant-hp-boss` completamente visibles, sin solaparse ni quedar ocultos detrás de ninguna `.hud-pill` de `#hud` (incluyendo el contador de trofeos, piso, puerta en curso y el botón de ajustes).

2.3 WHEN el viewport está en `@media (max-width:520px)` y `#hud` se envuelve en dos filas por `flex-wrap:wrap` THEN el sistema SHALL mantener el margen de seguridad vertical suficiente en `.combatant-hp` para que el nombre y la barra de vida sigan siendo completamente visibles y no se solapen con la segunda fila del HUD superior.

2.4 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL mantener el alto contraste y la legibilidad actuales de `.hp-label` y `.difficulty-tag`, sin introducir ningún otro cambio visual además del reposicionamiento vertical.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN el viewport está en un ancho mayor a 520px (escritorio/tablet) THEN el sistema SHALL CONTINUE TO posicionar `.combatant-hp-player` y `.combatant-hp-boss` con `top:min(4vh,34px)` exactamente como en la actualidad, sin ningún cambio.

3.2 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL CONTINUE TO aplicar a `.combatant-hp` la reducción de ancho `width:140px` ya existente, sin modificarla.

3.3 WHEN el viewport está en cualquier ancho THEN el sistema SHALL CONTINUE TO dejar sin cambios `#hud` (`position:absolute; top:14px; display:flex; justify-content:center; gap:10px; pointer-events:none; z-index:25; flex-wrap:wrap; padding:0 10px;`) y `.hud-pill` (incluyendo su regla móvil `font-size:12px; padding:5px 8px;` dentro de `@media (max-width:520px)`), tanto dentro como fuera del breakpoint móvil.

3.4 WHEN el viewport está en cualquier ancho THEN el sistema SHALL CONTINUE TO mantener sin cambios el posicionamiento horizontal de `.combatant-hp-player` (`left:24%; transform:translateX(-50%);`) y `.combatant-hp-boss` (`left:76%; transform:translateX(-50%);`), que están alineados con `COMBAT_LAYOUT.warriorXRatio`/`bossXRatio` en `src/render/bossFightRender.js`.

3.5 WHEN el viewport está en cualquier ancho THEN el sistema SHALL CONTINUE TO mantener sin cambios los estilos internos de `.hp-label`, `.difficulty-tag`, `.hp-bar` y `.pip` (incluyendo sus variantes `.boss`, `.lost`, `.just-lost` y la animación `pipHit`).

3.6 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL CONTINUE TO dejar sin cambios el resto de las reglas ya existentes dentro de ese bloque (`.panel`, `.overlay-content`, `.card`, `#leaderboardScreen .overlay-content`, `.leaderboard-table`, `.score-value`/`.score-date`, `.welcome-msg`, `.name-field`, `#playerNameInput`, `.name-hint`, `.player-name-display`).

3.7 WHEN se aplica cualquier cambio de esta corrección THEN el sistema SHALL CONTINUE TO no modificar ningún archivo `.js` (incluyendo `src/render/bossFightRender.js`), limitando el cambio exclusivamente a la hoja de estilos CSS embebida en `index.html`.

3.8 WHEN el usuario interactúa con `#bossScreen` en cualquier ancho de viewport THEN el sistema SHALL CONTINUE TO mantener sin cambios el comportamiento funcional de combate (clics en cartas, actualización de `.pip`, transición de banners de victoria/derrota).

### Bug Condition (formalización preliminar)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type RenderedElement
  OUTPUT: boolean

  RETURN X.viewportWidth <= 520
         AND X.selector IN ['.combatant-hp', '.combatant-hp-player', '.combatant-hp-boss']
         AND X.appliedTop = X.desktopTop  // min(4vh,34px), sin ajuste móvil adicional
         AND X.overlapsWithHud = true     // se solapa verticalmente con el área real de #hud
END FUNCTION
```

```pascal
// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result <- render'(X)
  ASSERT result.top > X.desktopTop
    AND result.overlapsWithHud = false
    AND result.fullyVisible = true
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT render(X) = render'(X)
END FOR
```
