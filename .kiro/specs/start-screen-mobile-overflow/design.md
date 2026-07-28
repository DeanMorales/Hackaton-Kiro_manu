# Start Screen Mobile Overflow Bugfix Design

## Overview

Este bugfix corrige la adaptación incompleta de la pantalla de inicio (`#startScreen`, que usa `.panel` y no `.overlay-content`) en viewports móviles bajos (320-375px). Dentro del bloque `@media (max-width:520px)` ya existente en `index.html`, `.panel` solo recibe una reducción de `padding` (`26px 20px 22px`), pero sus elementos internos —`.crest`, `.panel h1`, `.subtitle`, `.rules li` y `.btn-primary`— conservan los tamaños de escritorio (`font-size:40px`, `26px`, `14.5px`, `13.5px` y `padding:13px 30px`/`font-size:15px` respectivamente). El resultado es texto desproporcionado respecto al ancho disponible del panel en pantallas angostas.

Siguiendo el mismo enfoque ya aplicado en `hud-responsive-layout` (reducción de `.hud-pill`) y `combat-cards-mobile-layout` (reducción de `.card`), la solución es **puramente CSS**: añadir, dentro del `@media (max-width:520px)` ya existente, reglas que reduzcan proporcionalmente `font-size` de `.crest`, `.panel h1`, `.subtitle`, `.rules li`, y `padding`/`font-size` de `.btn-primary`. No se modifica ningún archivo `.js`, no se modifica el DOM, y no se modifica `.overlay-content` ni los overlays ya cubiertos (`#gameOverScreen`, `#leaderboardScreen`, `#audioSettingsPanel`) más allá de heredar automáticamente la misma reducción de tamaño porque comparten los mismos selectores de clase (`.panel h1`, `.subtitle`, `.btn-primary`, etc.) — esto es aceptable y deseable, ya que esos overlays también se benefician de texto más proporcionado en móvil, y ya tienen su propio tratamiento de `max-width` vía `.overlay-content` o `.panel{padding}`.

## Glossary

- **Bug_Condition (C)**: El elemento renderizado pertenece a `#startScreen`/`.panel` (o a cualquier otro contenedor que comparta los selectores `.crest`, `.panel h1`, `.subtitle`, `.rules li`, `.btn-primary`), el viewport está en Mobile_Breakpoint (`≤520px`), y el selector conserva su `font-size`/`padding` de escritorio en lugar de uno reducido.
- **Property (P)**: El elemento afectado por Bug_Condition debe mostrarse con un `font-size`/`padding` reducido respecto al valor de escritorio, cabiendo dentro del ancho disponible del panel sin desbordar ni cortar contenido de forma abrupta.
- **Preservation**: El comportamiento y estilo de escritorio/tablet (`>520px`) de estos mismos selectores, así como el estilo y comportamiento de `.overlay-content`, `#gameOverScreen`, `#leaderboardScreen`, `#audioSettingsPanel` y `#playerNameInput` fuera de los selectores modificados, deben permanecer sin cambios.
- **Mobile_Breakpoint**: Condición de viewport en la que aplica `@media (max-width:520px)` en `index.html` (ancho ≤520px). Término compartido con `hud-responsive-layout`/`combat-cards-mobile-layout`.
- **Desktop_Tablet_Layout**: Viewport con ancho >520px, donde Mobile_Breakpoint no aplica.
- **Reference_Min_Width**: 320px, el ancho de viewport móvil más angosto comúnmente soportado, usado como caso de prueba concreto.
- **Panel_Element**: Cualquiera de los cinco selectores CSS afectados por este bugfix: `.crest`, `.panel h1`, `.subtitle`, `.rules li`, `.btn-primary`.

## Bug Details

### Bug Condition

El bug se manifiesta cuando el viewport está en Mobile_Breakpoint y el elemento renderizado es un Panel_Element: su `font-size` (o, en el caso de `.btn-primary`, también su `padding`) es idéntico al valor definido fuera de `@media (max-width:520px)`, en lugar de un valor reducido acorde al ancho disponible del panel (`max-width:460px`, con `padding:26px 20px 22px` ya aplicado en móvil).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type RenderedElement
  OUTPUT: boolean

  RETURN input.viewportWidth <= 520
         AND input.selector IN ['.crest', '.panel h1', '.subtitle', '.rules li', '.btn-primary']
         AND input.currentFontSizeOrPadding = input.desktopFontSizeOrPadding
END FUNCTION
```

### Examples

- En un viewport de 320px, `.panel h1` ("Torre de las Nubes") se renderiza a `font-size:26px` (igual que en escritorio), lo que hace que el título ocupe una fracción muy grande del ancho disponible del panel (`320px - 2*20px padding - bordes ≈ 276px`) y se corte en dos líneas de forma poco prolija.
- En un viewport de 320px, `.crest` (`🏰`, `font-size:40px`) ocupa una porción visualmente desproporcionada respecto al resto del contenido reducido de otros elementos ya tratados (como `.welcome-msg` que sí se reduce a `14px` en móvil).
- En un viewport de 320px, `#startBtn` (`.btn-primary`, `padding:13px 30px`, `font-size:15px`) puede acercarse al ancho total disponible del panel, dejando poco margen visual y sensación de desproporción respecto al resto de elementos ya reducidos.
- Caso esperado tras el fix: en 320px, `.panel h1` se reduce (por ejemplo a `20px`), cabe en una o dos líneas de forma prolija, y el conjunto del panel (crest, título, subtítulo, reglas, campo de nombre, botón) se percibe proporcionado y completo sin desbordar el ancho del viewport.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- En Desktop_Tablet_Layout (`>520px`), `.crest`, `.panel h1`, `.subtitle`, `.rules li` y `.btn-primary` deben conservar exactamente sus valores actuales (`font-size:40px`, `26px`, `14.5px`, `13.5px`, `padding:13px 30px`/`font-size:15px` respectivamente).
- En Mobile_Breakpoint, `.panel{padding:26px 20px 22px}` (ya existente) no se modifica.
- `.overlay-content` (usado por `#leaderboardScreen` y otros overlays no basados en `.panel`) no se modifica.
- El comportamiento funcional de `#startBtn` (evento `click`, navegación a inicio del juego) no se modifica.
- El campo `#playerNameInput`/`.name-field` (ya tratado en móvil por una regla existente separada) no se modifica.

**Scope:**
Todos los viewports en Desktop_Tablet_Layout (`>520px`) deben quedar completamente inafectados por este fix. Esto incluye:
- Cualquier renderizado de `.crest`, `.panel h1`, `.subtitle`, `.rules li`, `.btn-primary` en escritorio o tablet, dentro o fuera de `#startScreen`.
- El resto de las reglas ya existentes dentro de `@media (max-width:520px)` (`.card`, `.hud-pill`, `.combatant-hp`, `#leaderboardScreen .overlay-content`, `.leaderboard-table`, `.welcome-msg`, `.name-field`, `#playerNameInput`, `.name-hint`, `.player-name-display`), que no se tocan.

**Nota de alcance sobre selectores compartidos:** `.panel h1`, `.subtitle`, `.rules li` y `.btn-primary` también son usados por `#gameOverScreen` y `#audioSettingsPanel` (ambos usan `.panel`). Al reducir estos selectores dentro de `@media (max-width:520px)`, esos overlays heredarán automáticamente la misma reducción de tamaño. Esto es intencional y consistente con el objetivo de la corrección (texto proporcionado en móvil), no constituye una regresión: esos overlays ya tienen su propio `max-width` (`.panel` en general, o `#gameOverScreen .panel{max-width:420px}`) y no dependían de que estos selectores mantuvieran el tamaño de escritorio. No se requiere ninguna regla adicional para excluirlos, y no se modifica ningún selector con `id` específico de esos overlays (`#gameOverDetail`, `#finalScore`, `#scoreRank`, etc.), que quedan fuera de alcance.

## Hypothesized Root Cause

1. **Regla móvil incompleta para `.panel`**: cuando se implementó la primera adaptación móvil de `.panel` (probablemente junto con `.overlay-content`), solo se ajustó el `padding` del contenedor, sin extender el ajuste a los selectores de los elementos internos (`.crest`, `.panel h1`, `.subtitle`, `.rules li`, `.btn-primary`), a diferencia de lo que sí se hizo más tarde para `.welcome-msg`, `.name-field`, `#playerNameInput`, `.name-hint` y `.player-name-display` en la spec `enhanced-welcome-screen`.

2. **Selectores de elementos internos nunca se agregaron al breakpoint móvil**: no existe ninguna entrada para `.crest`, `.panel h1`, `.subtitle`, `.rules li` o `.btn-primary` dentro de `@media (max-width:520px)`, mientras que sí existen para otros elementos comparables (`.hud-pill`, `.card`, `.welcome-msg`).

3. **Enfoque inconsistente entre overlays**: `#gameOverScreen`/`#leaderboardScreen`/`#audioSettingsPanel` usan `.overlay-content` con `max-width:95% !important` para controlar el ancho global, pero `#startScreen` usa `.panel` (`max-width:460px` fijo, sin `!important` en móvil), por lo que el contenedor de `#startScreen` no se ensancha proporcionalmente en móvil como sí ocurre con `.overlay-content`; esto agrava el problema de tamaño de fuente fijo, ya que el ancho disponible relativo al contenido es más ajustado.

## Correctness Properties

Property 1: Bug Condition - Reducción de tamaño de Panel_Element en Mobile_Breakpoint

_For any_ elemento Panel_Element (`.crest`, `.panel h1`, `.subtitle`, `.rules li`, `.btn-primary`) donde la condición de bug se cumple (viewport ≤520px y el elemento conserva su `font-size`/`padding` de escritorio), la función corregida SHALL aplicar un `font-size` (y, en el caso de `.btn-primary`, también un `padding`) estrictamente menor al valor de escritorio, de modo que el conjunto del panel de `#startScreen` se muestre completo, legible y sin desbordar el ancho del viewport en 320-375px.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Estilos de escritorio/tablet y overlays no basados en `.panel`

_For any_ elemento donde la condición de bug NO se cumple (viewport >520px, o el elemento no es un Panel_Element, o el selector es `.overlay-content`/`.panel{padding}`), la función corregida SHALL producir exactamente el mismo resultado que la función original, preservando los valores actuales de `font-size`/`padding` en Desktop_Tablet_Layout, la regla `.panel{padding:26px 20px 22px}` en móvil, la regla `.overlay-content` sin cambios, y el comportamiento funcional de `#startBtn` y `#playerNameInput`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Asumiendo que el análisis de causa raíz es correcto:

**File**: `index.html`

**Sección**: hoja de estilos embebida, dentro del bloque `@media (max-width:520px){...}` ya existente (el mismo donde viven las reglas de `.card`, `.hud-pill`, `.welcome-msg`, etc.)

**Specific Changes**:
1. **Reducir `.crest`**: añadir `font-size` reducido (por ejemplo `30px`, desde `40px` de escritorio) dentro del bloque móvil.
2. **Reducir `.panel h1`**: añadir `font-size` reducido (por ejemplo `20px`, desde `26px` de escritorio) dentro del bloque móvil.
3. **Reducir `.subtitle`**: añadir `font-size` reducido (por ejemplo `13px`, desde `14.5px` de escritorio) dentro del bloque móvil.
4. **Reducir `.rules li`**: añadir `font-size` reducido (por ejemplo `12px`, desde `13.5px` de escritorio) dentro del bloque móvil.
5. **Reducir `.btn-primary`**: añadir `padding` reducido (por ejemplo `11px 20px`, desde `13px 30px` de escritorio) y `font-size` reducido (por ejemplo `13.5px`, desde `15px` de escritorio) dentro del bloque móvil.
6. No modificar `.panel{padding:26px 20px 22px}` (ya existente), `.overlay-content`, ni ningún selector con `id` específico de otros overlays.
7. No modificar ningún archivo `.js`.

**Justificación de los valores elegidos:** cada valor se elige de forma que sea estrictamente menor al valor de escritorio (cumpliendo Property 1) y mayor a un mínimo de legibilidad razonable (siguiendo el mismo criterio de `.hud-pill` con mínimo 11px y de `.welcome-msg`/`.name-hint` reducidos ~1-2px respecto a escritorio): `.crest` 40px→30px (-25%), `.panel h1` 26px→20px (-23%), `.subtitle` 14.5px→13px (-10%), `.rules li` 13.5px→12px (-11%), `.btn-primary` font-size 15px→13.5px (-10%) y padding 13px 30px→11px 20px (reduce el ancho horizontal ocupado por el botón en ~33%, el eje más relevante para el desborde en 320px). Estos porcentajes son consistentes con las reducciones ya aplicadas en `.hud-pill` (14px→12px, -14%) y `.welcome-msg` (15px→14px, -7%) en el mismo archivo.

## Testing Strategy

### Validation Approach

Igual que en `hud-responsive-layout` y `combat-cards-mobile-layout`, este es un cambio **puramente CSS** sin funciones puras ni lógica de transformación de datos en JavaScript sobre la que formular property-based tests (PBT) con `fast-check`. No hay entrada/salida computable en código propio: el "comportamiento" a verificar es la hoja de estilos embebida en `index.html`, que se valida mediante lectura de texto y expresiones regulares (jsdom no calcula layout real). Por lo tanto, **no se usa PBT/fast-check para esta funcionalidad**, siguiendo el mismo criterio documentado en las specs hermanas. Las pruebas automatizadas son ejemplos concretos de verificación estática, más pruebas DOM/unitarias para confirmar que no se rompe ninguna funcionalidad, y una nota de QA manual para la verificación visual real (fuera del alcance de jsdom).

### Exploratory Bug Condition Checking

**Goal**: Confirmar, leyendo el CSS actual, que `.crest`, `.panel h1`, `.subtitle`, `.rules li` y `.btn-primary` NO tienen ninguna regla dentro de `@media (max-width:520px)` antes del fix (esto demuestra que el bug existe tal como se describe).

**Test Plan**: Escribir un test estático que lea `index.html`, extraiga el bloque `@media (max-width:520px){...}` y confirme, sobre el código SIN FIX, que ninguno de los cinco selectores aparece dentro de ese bloque.

**Test Cases**:
1. **`.crest` ausente en móvil (código sin fix)**: confirmar que `mobileBlock` no contiene una regla `.crest{...}` (fallará después del fix, que es el resultado esperado del ciclo explorar→implementar).
2. **`.panel h1` ausente en móvil (código sin fix)**: idem para `.panel h1`.
3. **`.subtitle` ausente en móvil (código sin fix)**: idem para `.subtitle`.
4. **`.rules li` ausente en móvil (código sin fix)**: idem para `.rules li`.
5. **`.btn-primary` ausente en móvil (código sin fix)**: idem para `.btn-primary`.

**Expected Counterexamples**:
- Ninguno de los cinco selectores aparece dentro de `@media (max-width:520px)` en el código actual (sin fix), confirmando la causa raíz #2 (selectores de elementos internos nunca se agregaron al breakpoint móvil).

### Fix Checking

**Goal**: Verificar que, para todo Panel_Element donde la condición de bug se cumple, la función corregida produce el comportamiento esperado (tamaño reducido, sin desborde).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderPanelElement_fixed(input)
  ASSERT result.fontSizeOrPadding < input.desktopFontSizeOrPadding
END FOR
```

### Preservation Checking

**Goal**: Verificar que, para todo input donde la condición de bug NO se cumple (Desktop_Tablet_Layout, u otros selectores/overlays no afectados), la función corregida produce el mismo resultado que la original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderPanelElement_original(input) = renderPanelElement_fixed(input)
END FOR
```

**Testing Approach**: Dado que no hay una función pura en JavaScript sobre la que aplicar PBT, la preservación se verifica mediante aserciones estáticas concretas (no universales) sobre el contenido textual de `index.html`, siguiendo el mismo patrón que `hudLayout.css.test.js`. Esto es un ejemplo concreto, no una propiedad exhaustiva sobre un espacio de entradas, porque `index.html` es un artefacto único y estático.

**Test Plan**: Observar los valores actuales de `.crest`, `.panel h1`, `.subtitle`, `.rules li`, `.btn-primary` fuera de `@media` (código sin fix), y escribir tests que confirmen que esos valores permanecen idénticos después del fix.

**Test Cases**:
1. **`.crest` fuera de `@media` intacto**: confirmar que la regla `.crest{font-size:40px;...}` fuera de `@media` no cambia tras el fix.
2. **`.panel h1` fuera de `@media` intacto**: confirmar que `.panel h1{...font-size:26px;...}` fuera de `@media` no cambia.
3. **`.subtitle` fuera de `@media` intacto**: confirmar que `.subtitle{...font-size:14.5px;...}` fuera de `@media` no cambia.
4. **`.rules li` fuera de `@media` intacto**: confirmar que `.rules li{...font-size:13.5px;...}` fuera de `@media` no cambia.
5. **`.btn-primary` fuera de `@media` intacto**: confirmar que `.btn-primary{...padding:13px 30px;...font-size:15px;...}` fuera de `@media` no cambia.
6. **`.panel{padding:26px 20px 22px}` en móvil intacto**: confirmar que esta regla ya existente sigue presente sin modificar.
7. **`.overlay-content` sin cambios**: confirmar que la regla `.overlay-content` (dentro y fuera de `@media`) no fue modificada por este fix.
8. **`#startBtn` conserva su `id` y clase**: confirmar mediante DOM/jsdom que `#startBtn` sigue siendo `<button id="startBtn" class="btn-primary">` sin cambios de atributos.

### Unit Tests

- Test DOM/jsdom que construya el markup de `#startScreen` y confirme que `#startBtn`, `#playerNameInput` y sus IDs/atributos permanecen sin cambios tras el fix (verificación de que el cambio es puramente de estilo, no de estructura).
- Test DOM/jsdom que confirme que el evento `click` de `#startBtn` sigue disparándose correctamente (binding por `id`, independiente del tamaño de fuente/padding).

### Property-Based Tests

- No aplica (ver "Validation Approach" arriba): no existen funciones puras ni transformaciones de datos sobre las que formular propiedades universales para este cambio CSS puro.

### Integration Tests

- No se requieren pruebas de integración adicionales de flujo de juego: este fix no altera ninguna lógica de transición de pantallas ni el flujo de inicio del juego, solo el tamaño visual de elementos dentro de `#startScreen` en móvil.

### QA Manual (fuera de alcance de tests automatizados)

La verificación visual real de que el panel de `#startScreen` se muestra completo, legible y sin desbordar en dispositivos reales (Requirement 2.6) requiere renderizado de layout real, que jsdom no provee (`getBoundingClientRect()` devuelve ceros salvo mock explícito). Se recomienda verificación manual en al menos tres anchos de viewport: 320px, 375px y 520px, confirmando visualmente que el crest, título, subtítulo, reglas, campo de nombre y botón se muestran completos y proporcionados, sin cortes de línea abruptos ni desborde horizontal, antes de cerrar la tarea de implementación.
