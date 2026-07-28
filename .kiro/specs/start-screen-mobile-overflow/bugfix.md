# Bugfix Requirements Document

## Introduction

La pantalla de inicio (`#startScreen`, que usa la clase `.panel` en lugar de `.overlay-content`) de "Torre de las Nubes — Duelo AWS" no está completamente adaptada a resoluciones móviles bajas (320-375px de ancho de viewport). Dentro del breakpoint móvil existente (`@media (max-width:520px)` en `index.html`), `.panel` solo recibe una reducción de `padding` (`26px 20px 22px`), pero ninguno de sus elementos internos —`.crest` (icono, `font-size:40px`), `.panel h1` (título, `font-size:26px`), `.subtitle` (subtítulo, `font-size:14.5px`), `.rules li` (reglas del juego, `font-size:13.5px`) y `.btn-primary` (botón, `padding:13px 30px`/`font-size:15px`)— reduce su tamaño en móvil, a diferencia de otros overlays como `#gameOverScreen`/`#leaderboardScreen` (que usan `.overlay-content` con `max-width:95% !important` en móvil) y de elementos ya tratados en las specs hermanas `hud-responsive-layout` y `combat-cards-mobile-layout`.

El resultado en viewports de 320-375px es texto desproporcionadamente grande respecto al ancho disponible del panel, con líneas que se cortan de forma poco prolija y un recuadro que se siente "no adaptado" en comparación con el resto de la interfaz. Esta funcionalidad corrige ese desajuste aplicando reducciones de tamaño proporcionales a los elementos internos de `.panel` dentro de `#startScreen`, siguiendo el mismo enfoque ya usado para `.hud-pill` y `.card` en las specs hermanas, sin alterar el layout en escritorio/tablet ni el resto de overlays ya cubiertos (`.overlay-content`, `#gameOverScreen`, `#leaderboardScreen`, `#audioSettingsPanel`).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN el viewport está en un ancho de 320-375px (dentro de `@media (max-width:520px)`) THEN el sistema muestra `.crest` dentro de `#startScreen` con `font-size:40px` (el mismo tamaño usado en escritorio), ocupando una porción desproporcionada del ancho disponible del panel.

1.2 WHEN el viewport está en un ancho de 320-375px THEN el sistema muestra `.panel h1` dentro de `#startScreen` con `font-size:26px` (el mismo tamaño usado en escritorio), provocando que el título "Torre de las Nubes" se ajuste en líneas con salto poco prolijo respecto al ancho del panel.

1.3 WHEN el viewport está en un ancho de 320-375px THEN el sistema muestra `.subtitle` dentro de `#startScreen` con `font-size:14.5px` (el mismo tamaño usado en escritorio), sin reducción proporcional al ancho disponible.

1.4 WHEN el viewport está en un ancho de 320-375px THEN el sistema muestra cada `.rules li` dentro de `#startScreen` con `font-size:13.5px` (el mismo tamaño usado en escritorio), sin reducción proporcional al ancho disponible.

1.5 WHEN el viewport está en un ancho de 320-375px THEN el sistema muestra `#startBtn` (`.btn-primary`) dentro de `#startScreen` con `padding:13px 30px` y `font-size:15px` (los mismos valores usados en escritorio), ocupando un ancho desproporcionado respecto al panel disponible.

### Expected Behavior (Correct)

2.1 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL aplicar a `.crest` dentro de `#startScreen`/`.panel` un `font-size` reducido respecto al valor de escritorio (40px).

2.2 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL aplicar a `.panel h1` dentro de `#startScreen`/`.panel` un `font-size` reducido respecto al valor de escritorio (26px), de modo que el título se muestre completo y legible sin desbordar el ancho del panel.

2.3 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL aplicar a `.subtitle` dentro de `#startScreen`/`.panel` un `font-size` reducido respecto al valor de escritorio (14.5px), manteniendo la legibilidad del texto.

2.4 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL aplicar a cada `.rules li` dentro de `#startScreen`/`.panel` un `font-size` reducido respecto al valor de escritorio (13.5px), manteniendo la legibilidad del texto.

2.5 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL aplicar a `#startBtn` (`.btn-primary`) dentro de `#startScreen`/`.panel` un `padding` y/o `font-size` reducidos respecto a los valores de escritorio (`padding:13px 30px`, `font-size:15px`), de modo que el botón quepa cómodamente dentro del ancho del panel en viewports de 320-375px.

2.6 WHEN el viewport está en un ancho de 320-375px THEN el sistema SHALL mostrar el panel completo de `#startScreen` (crest, título, subtítulo, reglas, campo de nombre y botón) de forma completa, legible y sin desbordar el ancho del viewport.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN el viewport está en un ancho mayor a 520px (escritorio/tablet) THEN el sistema SHALL CONTINUE TO mostrar `.crest`, `.panel h1`, `.subtitle`, `.rules li` y `.btn-primary` (incluyendo dentro de `#startScreen`) con los mismos valores de `font-size`/`padding` que tienen actualmente fuera de `@media (max-width:520px)`.

3.2 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL CONTINUE TO aplicar a `.panel` (dentro de `#startScreen` y en cualquier otro overlay que la use, como `#gameOverScreen`/`#audioSettingsPanel`) el `padding:26px 20px 22px` ya existente, sin modificarlo.

3.3 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL CONTINUE TO dejar sin cambios la regla `.overlay-content` (usada por `#leaderboardScreen` y otros overlays que no son `.panel`), incluyendo `max-width:95% !important`.

3.4 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL CONTINUE TO dejar sin cambios el comportamiento visual de `#gameOverScreen`, `#leaderboardScreen` y `#audioSettingsPanel` fuera de los estilos genéricos compartidos por `.panel` (`padding`) y por los selectores de elementos internos (`.crest`, `.panel h1`, `.subtitle`, `.rules li`, `.btn-primary`) que también aparecen dentro de esos overlays, ya que estos selectores no están asociados a un único `id` y cualquier reducción de tamaño se aplicará también a esos overlays por diseño (ver nota de alcance en design.md).

3.5 WHEN el viewport está en `@media (max-width:520px)` THEN el sistema SHALL CONTINUE TO conservar el comportamiento funcional de `#startBtn` (evento de clic, navegación a inicio del juego) sin ningún cambio de comportamiento, IDs o atributos.

3.6 WHEN el usuario interactúa con `#playerNameInput` en cualquier ancho de viewport THEN el sistema SHALL CONTINUE TO mantener su comportamiento actual sin cambios (este campo ya tiene tratamiento móvil propio vía `.name-field`/`#playerNameInput` en `@media (max-width:520px)`, fuera del alcance de este bugfix).

3.7 WHEN se aplica cualquier cambio de esta corrección THEN el sistema SHALL CONTINUE TO no modificar ningún archivo `.js`, limitando el cambio exclusivamente a la hoja de estilos CSS embebida en `index.html`.

### Bug Condition (formalización preliminar)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type RenderedElement
  OUTPUT: boolean

  RETURN X.viewportWidth <= 520
         AND X.container CONTAINS "#startScreen"
         AND X.selector IN ['.crest', '.panel h1', '.subtitle', '.rules li', '.btn-primary']
         AND X.appliedFontSizeOrPadding = X.desktopFontSizeOrPadding
END FUNCTION
```

```pascal
// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result <- render'(X)
  ASSERT result.fontSizeOrPadding < X.desktopFontSizeOrPadding
    AND result.fitsWithinPanelWidth = true
    AND result.noOverflow = true
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT render(X) = render'(X)
END FOR
```
