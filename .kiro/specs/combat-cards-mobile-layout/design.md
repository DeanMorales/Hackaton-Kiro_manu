# Design Document

## Overview

Esta funcionalidad resuelve el desbordamiento impredecible de Cards en Card_Row (`#cardsRow`) cuando el viewport está en Mobile_Breakpoint (≤520px) y Card_Count supera 4. Hoy, `.cards-row` usa `display:flex; flex-wrap:wrap;` con `.card{width:118px; height:168px;}` fijo dentro del breakpoint móvil existente. Con ese ancho fijo, el número de Cards que caben por fila depende del ancho exacto del viewport (p. ej. un iPhone SE de 375px cabe menos de 4 Cards de 118px+14px de gap por fila, mientras que un viewport de 520px podría caber 4), produciendo 2 o 3 filas de forma errática según el dispositivo.

La solución elegida es **puramente CSS**: en lugar de un ancho fijo (`118px`), las Cards adoptan un ancho relativo al contenedor mediante `flex-basis`/`max-width` calculado para que **exactamente 4 Cards** ocupen el ancho disponible de Card_Row, sin importar el ancho exacto del viewport dentro de Mobile_Breakpoint. Al mantener `flex-wrap:wrap` (ya presente), la 5ª Card (y sucesivas) desborda automáticamente a una segunda fila — sin ningún cambio de JavaScript, sin wrappers nuevos en el DOM y sin tocar el comportamiento de Desktop_Tablet_Layout.

Esta es una decisión de diseño deliberada: **no se introduce ninguna lógica de agrupación en JavaScript**. `renderCards` (`src/ui/screens.js`) sigue añadiendo Cards como hijos directos de `#cardsRow` exactamente igual que hoy; el layout de dos filas es un efecto emergente de las reglas CSS del breakpoint móvil, análogo a cómo ya funciona con Card_Count ≤ 4.

## Architecture

```mermaid
flowchart TD
    A[renderCards(cards, onCardClick)] -->|crea .card por cada carta, sin wrappers| B[#cardsRow .cards-row]
    B -->|display:flex; flex-wrap:wrap; gap:14px| C{Viewport}
    C -->|"> 520px (Desktop_Tablet_Layout)"| D[.card width:150px fijo<br/>sin cambios]
    C -->|"≤ 520px (Mobile_Breakpoint)"| E[.card flex-basis/max-width calculado<br/>= ancho para 4 por fila]
    E --> F{Card_Count > 4?}
    F -->|No| G[1 fila: Top_Row únicamente]
    F -->|Sí| H[flex-wrap desborda la 5ª Card<br/>a una 2ª fila = Bottom_Row]
```

No hay cambios de arquitectura de módulos: `renderCards` y el resto de `src/ui/screens.js` permanecen sin modificar. El único artefacto modificado es la hoja de estilos embebida en `index.html` (regla `.card` dentro de `@media (max-width:520px)`).

### Por qué CSS puro (Flexbox con flex-basis) y no CSS Grid

Se evaluaron dos enfoques:

1. **CSS Grid** (`display:grid; grid-template-columns:repeat(4, 1fr);` en el contenedor bajo Mobile_Breakpoint): coloca automáticamente los ítems en filas de 4 columnas, desbordando el resto a una fila siguiente. Cumpliría R1.1–R1.5, pero **requiere cambiar `display` del contenedor** (`Card_Row`) de `flex` a `grid` dentro del breakpoint, lo cual es un cambio estructural mayor al contenedor y complica mantener `justify-content:center` cuando Card_Count < 4 (Grid no centra columnas parcialmente vacías de forma tan directa como Flexbox; requeriría reglas adicionales o `justify-content` distinto en Grid).
2. **Flexbox con `flex-basis` calculado** (enfoque elegido): solo cambia el tamaño de `.card`, no el `display` del contenedor. `Card_Row` conserva `display:flex; flex-wrap:wrap; gap:14px; justify-content:center;` sin modificación (cumple R3.2 al pie de la letra). Al fijar `flex-basis`/`max-width` de cada Card a `calc((100% - 3 * 14px) / 4)`, el ancho de 4 Cards + 3 gaps ocupa exactamente el 100% del ancho disponible de Card_Row; toda Card adicional (5ª en adelante) no cabe en la fila y `flex-wrap:wrap` la envía a la siguiente fila. Con Card_Count ≤ 4, las Cards siguen cabiendo en una sola fila (R2.1/R2.2) porque nunca se excede el ancho de 4 unidades.

Se elige el enfoque Flexbox porque es el cambio de **menor superficie** (una sola regla de `.card` dentro del breakpoint existente), no toca `Card_Row` en absoluto (satisfaciendo R3.2 de forma trivial) y no introduce un modelo de layout nuevo (Grid) junto al Flexbox ya usado en Desktop_Tablet_Layout, reduciendo el riesgo de inconsistencias visuales entre breakpoints.

## Components and Interfaces

### `index.html` — hoja de estilos embebida (único artefacto modificado)

Regla actual dentro de `@media (max-width:520px)`:

```css
.card{width:118px; height:168px;}
```

Regla propuesta (mismo selector, mismo breakpoint, sin nuevas reglas para `Card_Row`):

```css
@media (max-width:520px){
  .card{
    flex: 0 1 calc((100% - 3 * 14px) / 4);
    max-width: calc((100% - 3 * 14px) / 4);
    width: auto;
    aspect-ratio: 118 / 168; /* conserva la proporción 118×168 ya usada */
    height: auto;
  }
}
```

Notas de diseño:

- `3 * 14px` corresponde a los 3 gaps entre 4 Cards por fila (`gap:14px` de `Card_Row`, sin cambios). Es un valor derivado directamente del `gap` existente, no un número mágico independiente.
- `aspect-ratio:118/168` sustituye al par `width:118px; height:168px;` fijo, preservando la proporción visual original de la Card móvil mientras el ancho absoluto se vuelve responsivo al contenedor. Esto evita distorsión visual de la Card (achatamiento) en viewports muy angostos (p. ej. 360px) donde 4 Cards de ancho fijo no cabrían.
- `flex:0 1 ...` (sin `grow`) evita que, con Card_Count ≤ 3, las Cards se estiren para llenar el ancho completo de la fila; mantienen el mismo ancho de "1/4 de fila" que tendrían con 4 o más Cards, preservando la consistencia visual entre combates con distinto Card_Count. `justify-content:center` en `Card_Row` (sin cambios) sigue centrando la fila cuando hay menos de 4 Cards.
- No se usa `order` ni ninguna reordenación: el orden visual de las Cards es el orden DOM, que es el orden en que `renderCards` las añade (R1.5 se cumple sin lógica adicional).
- `Card_Row` (`#cardsRow`/`.cards-row`) no recibe ninguna regla nueva; sus propiedades `display:flex`, `flex-wrap:wrap`, `gap:14px`, `justify-content:center` permanecen exactamente iguales dentro y fuera de Mobile_Breakpoint (R3.2).
- Fuera de `@media (max-width:520px)` (Desktop_Tablet_Layout) no se toca ninguna regla; `.card{width:150px; height:190px; ...}` permanece intacto (R3.1).

### `src/ui/screens.js` — `renderCards` (sin cambios)

`renderCards(cards, onCardClick)` sigue creando un `<div class="card" data-idx="${idx}">` por cada carta y añadiéndolo directamente como hijo de `#cardsRow`, sin envolver subconjuntos de Cards en contenedores intermedios (Top_Row/Bottom_Row son puramente visuales, no nodos DOM). Esto:

- Satisface R3.1 (Card_Row mantiene sus hijos directos sin wrappers) tanto en Mobile_Breakpoint como en Desktop_Tablet_Layout, porque la función es la misma para ambos casos.
- Satisface R4.4 de forma trivial: `dataset.idx` se asigna en `renderCards` de forma idéntica a hoy y no depende de ninguna regla CSS ni de en qué fila visual caiga la Card.
- Satisface R4.1/R4.2: el listener de click (`el.addEventListener('click', () => onCardClick(idx))`) se adjunta una sola vez en `renderCards` y no se toca al cambiar de fila visual (que es un efecto puramente de layout, no de DOM).

### Modal_Pregunta (spec `modal-pregunta-tarjeta`, sin cambios)

`openQuestionModal`/`closeQuestionModal` operan sobre `#questionModalOverlay`, un overlay `position:fixed` fuera de `#cardsRow`. Al no modificarse la estructura DOM de `Card_Row` ni el CSS de `#questionModalOverlay`/`.question-modal`, la apertura de la Modal_Pregunta para una Card en Top_Row o Bottom_Row bajo Mobile_Breakpoint sigue funcionando de forma idéntica: la medición FLIP (`getBoundingClientRect()`) usa las coordenadas reales de la Card en su fila visual (Top_Row o Bottom_Row), lo cual ya es compatible con el diseño existente de FLIP (que no asume ninguna fila específica). Esto satisface R4.1, R4.2 y R4.3 sin cambios en `screens.js`.

### Cruce de Mobile_Breakpoint durante un combate (R4.3)

No existe en el código actual ningún listener de `resize` ni recálculo de layout en JavaScript asociado a `Card_Row` (se confirmó revisando `src/ui/screens.js` y el resto de `src`). La agrupación en Top_Row/Bottom_Row es un efecto puramente declarativo del media query `@media (max-width:520px)`: el navegador recalcula automáticamente qué reglas CSS aplican en cada repintado cuando el ancho del viewport cruza el umbral, sin intervención de JavaScript. Como consecuencia:

- No hay Card_Click_Handler que remover ni recrear al cruzar el breakpoint (nunca se tocan en JS).
- No hay Modal_Pregunta que cerrar al cruzar el breakpoint: `#questionModalOverlay` es independiente del breakpoint de `Card_Row` y no tiene ninguna regla condicionada a `@media (max-width:520px)`.

Por lo tanto, R4.3 se satisface sin ningún cambio de código: es una consecuencia directa de no introducir lógica de agrupación en JavaScript (decisión de diseño ya justificada en Architecture).

## Data Models

No se introducen modelos de datos nuevos ni se modifican los existentes. La carta (`card = { service: {abbr, name, color}, question: {text, options, correct}, locked }`) usada por `renderCards`/`renderCardBack` no cambia. Top_Row y Bottom_Row **no son entidades de datos ni nodos DOM**: son un resultado visual emergente de las reglas CSS descritas arriba, aplicado sobre la misma lista `cards` y los mismos elementos `.card` que ya existen. `dataset.idx` sigue siendo la única fuente de índice usada por `Card_Click_Handler`, sin relación con la fila visual.

## Error Handling

No se introduce lógica nueva susceptible de error (no hay parsing, I/O, ni ramas condicionales nuevas en JavaScript). Los casos a considerar son puramente de robustez CSS:

- **Card_Count = 0**: `Card_Row` queda vacío; ninguna regla de `.card` aplica. No hay comportamiento especial que definir (no listado en requirements).
- **Viewport exactamente en 520px**: el media query `(max-width:520px)` es inclusivo (`520px` cuenta como Mobile_Breakpoint), consistente con la definición del Glossary ("ancho de viewport menor o igual a 520px") y con el comportamiento ya existente del breakpoint actual (sin cambios en el punto de corte).
- **`aspect-ratio` no soportado por el navegador** (motores muy antiguos): degrada a `height:auto`, lo que podría colapsar la altura de la Card a la de su contenido. Dado que `.card-inner`/`.card-face` usan `position:absolute; inset:0;` (dependen de que `.card` tenga una altura explícita), se documenta este riesgo pero no se mitiga con un fallback adicional porque `aspect-ratio` tiene soporte amplio en navegaders modernos (Chrome/Edge/Firefox/Safari desde 2021) y el resto del proyecto (`backdrop-filter`, WAAPI `element.animate`) ya asume capacidades CSS/JS modernas equivalentes o mayores.

## Testing Strategy

**Evaluación de aplicabilidad de PBT:** esta funcionalidad no introduce ninguna función pura ni lógica de transformación de datos en JavaScript — es un cambio exclusivamente declarativo en la hoja de estilos CSS embebida en `index.html` (una regla `.card` dentro de un `@media` existente). No hay entrada/salida computable sobre la que formular una propiedad universal ("para todo X, P(X) se cumple") relativa a código propio: el "comportamiento" a verificar es la disposición visual resultante de reglas CSS, que jsdom (el entorno de test del proyecto, ver `screens.modal.open.test.js`) no calcula (no hay motor de layout real; `getBoundingClientRect()` devuelve ceros salvo que se mockee explícitamente, como ya se hace en los tests de `Modal_Pregunta`). Por lo tanto, **se omite la sección de Correctness Properties y no se usa property-based testing (fast-check) para esta funcionalidad**, siguiendo el criterio de "Simple CRUD/CSS-only structural change" de las guías de PBT. Se usan en su lugar tests unitarios/DOM basados en jsdom (mismo patrón que `screens.modal.open.test.js`) más verificación estática de la regla CSS.

### Unit / DOM tests (jsdom, patrón `screens.*.test.js`)

1. **`renderCards` no introduce wrappers (R3.1, R1.*, R2.*)**: renderizar entre 1 y 7 cartas (casos concretos: 1, 4, 5, 6, 7) y afirmar que todos los hijos directos de `#cardsRow` son `.card` (mismo `parentElement`), sin ningún contenedor intermedio — esto es invariante respecto al breakpoint porque `renderCards` no lee el viewport.
2. **Orden y `dataset.idx` preservados (R1.5, R4.4)**: para Card_Count = 5, 6 y 7, afirmar que el `dataset.idx` de los hijos de `#cardsRow`, en orden DOM, es `"0","1","2",...` de forma estrictamente creciente y coincide con el índice del array `cards` original — cubre explícitamente que las primeras 4 (Top_Row lógico) y el resto (Bottom_Row lógico) conservan el orden secuencial, sin que el test necesite inspeccionar CSS.
3. **Card_Click_Handler no se ve afectado (R4.1)**: simular `click` sobre Cards de distintos índices (incluyendo índices ≥4, que caerían en Bottom_Row bajo Mobile_Breakpoint) y afirmar que `onCardClick` se invoca con el índice correcto — test ya cubierto en espíritu por los tests existentes de `renderCards`/`onCardClick`; se añade el caso con Card_Count > 4 explícitamente.
4. **`dataset.idx` no cambia tras un ciclo de apertura/cierre de Modal_Pregunta (R4.2)**: reutilizando el patrón de `screens.modal.open.test.js`, abrir la Modal_Pregunta para una carta con índice ≥ 4 y afirmar que el `dataset.idx` de todas las Cards en `#cardsRow` permanece sin cambios antes y después.

### Verificación estática de la regla CSS (ejemplo, no PBT)

5. **Regla CSS de 4 por fila presente (R1.1–R1.4, R3.2)**: test unitario que lee el contenido de `index.html` (o, alternativamente, consulta `document.styleSheets` tras cargar el documento en jsdom) y afirma mediante una expresión regular que, dentro del bloque `@media (max-width:520px)`, la regla `.card` define `flex-basis`/`max-width` como `calc((100% - 3 * 14px) / 4)` (o el valor equivalente elegido), y que el bloque de `Card_Row` (`.cards-row`) fuera de cualquier `@media` sigue conteniendo literalmente `display:flex`, `flex-wrap:wrap`, `gap:14px`, `justify-content:center`. Esto es un ejemplo concreto (no una propiedad universal) porque el archivo CSS es un artefacto único y estático, no un espacio de entradas a explorar.
6. **Regla de Desktop_Tablet_Layout intacta (R3.1)**: mismo mecanismo, afirmando que la regla `.card{width:150px; height:190px; ...}` fuera del `@media (max-width:520px)` no cambió.

### Fuera de alcance de los tests automatizados (QA manual)

- La verificación visual real de "exactamente 2 filas sin scroll horizontal" en distintos dispositivos (R1.6) requiere renderizado real de layout (motor de navegador), que jsdom no provee. Se recomienda una verificación manual/QA en al menos dos anchos de viewport dentro de Mobile_Breakpoint (p. ej. 360px y 520px) con Card_Count = 5 y 7, antes de cerrar la tarea de implementación.
