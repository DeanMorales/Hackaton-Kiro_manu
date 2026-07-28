# Requirements Document

## Introduction

Esta funcionalidad ajusta la disposición del HUD superior de "Torre de las Nubes — Duelo AWS" en el breakpoint móvil (viewport ≤520px). El HUD (`#hud` en `index.html`) contiene 4 elementos hijos: tres HUD_Pill informativas (🏆 mejor puntuación con `#bestScoreValue`, "Piso" con `#floorNum`, "Puerta en" con `#doorIn`) y el botón de ajustes de audio `#settingsBtn` (⚙️), que también usa la clase `.hud-pill`.

`#hud` ya tiene `display:flex; justify-content:center; gap:10px; flex-wrap:wrap;`, por lo que el HUD no se desborda de forma catastrófica, pero en viewports angostos dentro de Mobile_Breakpoint (por ejemplo 320-375px) la suma de anchos de las 4 HUD_Pill (con `padding:7px 16px` y `font-size:14px` actuales) más los `gap:10px` entre ellas excede el ancho disponible. El resultado es un `flex-wrap` impredecible, por ejemplo 3 HUD_Pill en una fila y 1 sola fila adicional debajo, dando un aspecto descuidado.

Esta funcionalidad sigue el mismo enfoque ya aplicado a `.card` en la spec hermana `combat-cards-mobile-layout`: reducir el "peso" visual de cada elemento (tamaño de fuente y padding) dentro del `Mobile_Breakpoint` existente para que quepan mejor en una sola fila. A diferencia de las cartas de combate (donde el conteo de elementos varía y se usó una regla de agrupación en 2 filas), aquí el número de HUD_Pill es siempre 4 (fijo), por lo que el problema es de tamaño y no de conteo variable, y no se requiere reordenar ni agrupar en filas fijas.

El cambio se limita a estilos CSS dentro del media query móvil ya existente. No se modifica el comportamiento del botón de ajustes de audio, ni los IDs o valores de los `<span>` del HUD, ni el layout en escritorio/tablet.

Todo el texto de cara al usuario se mantiene en español, en línea con las convenciones del producto.

## Glossary

- **HUD**: Contenedor superior de estado del juego, elemento DOM con `id="hud"` en `index.html`, con `display:flex; justify-content:center; gap:10px; flex-wrap:wrap;`, ubicado sobre el canvas del juego.
- **HUD_Pill**: Elemento visual individual dentro de HUD, con la clase `.hud-pill`. Existen exactamente 4 HUD_Pill: la pill de mejor puntuación (contiene `#bestScoreValue`), la pill de piso (contiene `#floorNum`), la pill de puerta (contiene `#doorIn`), y el botón de ajustes de audio (`#settingsBtn`, que también tiene la clase `.hud-pill`).
- **Settings_Button**: HUD_Pill específica implementada como `<button id="settingsBtn">`, que al hacer clic abre la configuración de audio. Es funcionalmente un botón, no solo un elemento informativo.
- **HUD_Value_Span**: Elemento `<span>` dentro de una HUD_Pill informativa que contiene un valor dinámico del juego: `#bestScoreValue`, `#floorNum` o `#doorIn`.
- **Mobile_Breakpoint**: Condición de viewport en la que aplica el media query `@media (max-width:520px)` de `index.html`, es decir, ancho de viewport menor o igual a 520px. (Término compartido con la spec `combat-cards-mobile-layout`.)
- **Desktop_Tablet_Layout**: Condición de viewport en la que Mobile_Breakpoint no aplica, es decir, ancho de viewport mayor a 520px.
- **Reference_Min_Width**: Ancho de viewport de referencia usado como caso de prueba concreto para verificar que las 4 HUD_Pill caben en una sola fila dentro de Mobile_Breakpoint. Su valor es 320px (el ancho de viewport móvil comúnmente más angosto soportado).
- **HUD_Row_Width**: Suma total, en una fila, de los anchos renderizados de las 4 HUD_Pill más los 3 espacios `gap:10px` entre ellas, dentro de HUD.

## Requirements

### Requirement 1: Reducción de tamaño de HUD_Pill en Mobile_Breakpoint para caber en una sola fila

**User Story:** Como jugador en un dispositivo móvil de pantalla angosta, quiero que las 4 HUD_Pill del HUD se muestren siempre en una sola fila, para tener una vista de estado del juego ordenada y consistente en lugar de un salto de línea impredecible.

#### Acceptance Criteria

1. WHILE el viewport está en Mobile_Breakpoint, THE HUD SHALL aplicar a cada HUD_Pill un `font-size` y un `padding` reducidos respecto de los valores usados fuera de Mobile_Breakpoint (`font-size:14px` y `padding:7px 16px`).
2. WHILE el viewport está en Mobile_Breakpoint AND el ancho del viewport es igual a Reference_Min_Width (320px), THE HUD SHALL mostrar las 4 HUD_Pill en una única fila, con HUD_Row_Width menor o igual al ancho disponible del HUD (ancho del viewport menos el `padding:0 10px` de HUD).
3. WHILE el viewport está en Mobile_Breakpoint AND el ancho del viewport es mayor o igual a Reference_Min_Width (320px) y menor o igual a 520px, THE HUD SHALL mostrar las 4 HUD_Pill en una única fila, sin que ninguna HUD_Pill se desplace a una segunda fila por efecto de `flex-wrap`.
4. WHILE el viewport está en Mobile_Breakpoint, THE HUD SHALL mantener la propiedad `flex-wrap:wrap` de HUD sin modificarla, de modo que el wrap solo actúe como salvaguarda ante anchos de viewport menores a Reference_Min_Width.

### Requirement 2: Legibilidad del texto reducido

**User Story:** Como jugador, quiero que el texto de las HUD_Pill siga siendo legible incluso después de reducir su tamaño en móvil, para poder leer mi mejor puntuación, el piso actual y el conteo de la puerta sin esfuerzo.

#### Acceptance Criteria

1. WHILE el viewport está en Mobile_Breakpoint, THE HUD SHALL aplicar a cada HUD_Pill un `font-size` mayor o igual a 11px.
2. WHILE el viewport está en Mobile_Breakpoint, THE HUD SHALL mantener sin cambios el color de texto (`color:var(--gold)`) y el color de los HUD_Value_Span (`color:var(--ink)`) definidos por `.hud-pill` y `.hud-pill span` fuera de Mobile_Breakpoint.
3. WHILE el viewport está en Mobile_Breakpoint, THE HUD SHALL aplicar a cada HUD_Pill un `padding` vertical y horizontal mayor a 0px, de modo que el texto de cada HUD_Pill no quede sin separación respecto del borde de la HUD_Pill.

### Requirement 3: Sin cambios en el layout de escritorio y tablet

**User Story:** Como jugador en escritorio o tablet, quiero que el HUD se vea igual que hoy, para que este ajuste de móvil no afecte mi experiencia en pantallas más grandes.

#### Acceptance Criteria

1. WHILE el viewport está en Desktop_Tablet_Layout (mayor a 520px), THE HUD SHALL mantener sin cambios los valores actuales de `font-size:14px` y `padding:7px 16px` de `.hud-pill`.
2. WHILE el viewport está en Desktop_Tablet_Layout, THE HUD SHALL mantener sin cambios las propiedades `display:flex`, `justify-content:center`, `gap:10px` y `flex-wrap:wrap` de HUD.

### Requirement 4: Sin cambios funcionales en Settings_Button ni en los valores del HUD

**User Story:** Como jugador, quiero poder seguir abriendo la configuración de audio y ver mis valores de puntuación, piso y puerta correctamente, para que el ajuste visual del HUD no afecte la funcionalidad existente.

#### Acceptance Criteria

1. WHILE el viewport está en Mobile_Breakpoint, THE HUD SHALL conservar sin cambios el atributo `id` de Settings_Button (`settingsBtn`) y de cada HUD_Value_Span (`bestScoreValue`, `floorNum`, `doorIn`).
2. WHEN el jugador hace clic en Settings_Button bajo Mobile_Breakpoint, THE HUD SHALL ejecutar el mismo comportamiento de apertura de configuración de audio que se ejecuta bajo Desktop_Tablet_Layout, incluyendo el mismo comportamiento ante fallos (por ejemplo, fallo silencioso o mensaje de error) si alguna dependencia como la inicialización del sistema de audio impide abrir la configuración.
3. WHILE el viewport está en Mobile_Breakpoint, THE HUD SHALL mostrar en cada HUD_Value_Span el mismo valor numérico o de texto que muestra bajo Desktop_Tablet_Layout, sin truncar ni ocultar el contenido de `#bestScoreValue`, `#floorNum` o `#doorIn`.
4. THE HUD SHALL mantener a Settings_Button como un elemento `<button>` con `pointer-events:auto`, de modo que siga siendo interactivo con clic o toque tanto en Mobile_Breakpoint como en Desktop_Tablet_Layout.
