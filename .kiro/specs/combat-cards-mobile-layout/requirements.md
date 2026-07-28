# Requirements Document

## Introduction

Esta funcionalidad ajusta la disposición de las cartas de combate en el breakpoint móvil (viewport ≤520px) de "Torre de las Nubes — Duelo AWS". Las cartas se renderizan mediante `renderCards(cards, onCardClick)` (`src/ui/screens.js`) dentro de Card_Row (`#cardsRow`, `.cards-row`), un contenedor con `display:flex; gap:14px; flex-wrap:wrap; justify-content:center;`. El número de cartas por combate escala de 1 a un máximo de 7 (Max_Card_Count, ver spec `combate-cartas-escaladas`).

Ya existe un breakpoint móvil `@media (max-width:520px)` en `index.html` que reduce el tamaño de `.card` de 150×190px a 118×168px, pero no controla cuántas cartas caben por fila. Con `flex-wrap` libre, hasta 7 cartas de 118px pueden desbordarse en 3 o más filas de forma impredecible según el ancho exacto del viewport.

Esta funcionalidad introduce una regla de distribución fija para Mobile_Breakpoint: cuando hay más de 4 cartas, estas se organizan siempre en exactamente 2 filas, con la fila superior (Top_Row) llenándose primero hasta 4 cartas y el resto (hasta 3) en la fila inferior (Bottom_Row). Con 4 cartas o menos, se mantiene una sola fila. El comportamiento fuera de Mobile_Breakpoint (escritorio/tablet, >520px) no se modifica.

Todo el texto de cara al usuario se mantiene en español, en línea con las convenciones del producto.

## Glossary

- **Card_Row**: Contenedor de las cartas de combate, elemento DOM con `id="cardsRow"` y clase `.cards-row`, poblado por la función `renderCards` (`src/ui/screens.js`).
- **Card**: Tarjeta de combate individual, elemento DOM `.card` renderizado dentro de Card_Row, asociada a un servicio de AWS y a una pregunta.
- **Card_Count**: Número total de Cards presentes en Card_Row para el combate en curso. Valor entero entre 1 y Max_Card_Count (7).
- **Max_Card_Count**: Límite superior del número de Cards en cualquier combate. Su valor es 7 (definido en la spec `combate-cartas-escaladas`).
- **Mobile_Breakpoint**: Condición de viewport en la que aplica el media query `@media (max-width:520px)` de `index.html`, es decir, ancho de viewport menor o igual a 520px.
- **Desktop_Tablet_Layout**: Condición de viewport en la que Mobile_Breakpoint no aplica, es decir, ancho de viewport mayor a 520px.
- **Top_Row**: Primera fila visual de Cards dentro de Card_Row cuando Mobile_Breakpoint aplica.
- **Bottom_Row**: Segunda fila visual de Cards dentro de Card_Row cuando Mobile_Breakpoint aplica y Card_Count es mayor que 4.
- **Max_Cards_Per_Row_Mobile**: Número máximo de Cards permitido en Top_Row cuando Mobile_Breakpoint aplica. Su valor es 4.
- **Card_Click_Handler**: Comportamiento existente asociado al evento click de una Card (invocación de `onCardClick`, volteo de la Card y apertura de la Modal_Pregunta ya implementada en la spec `modal-pregunta-tarjeta`).

## Requirements

### Requirement 1: Distribución en dos filas para más de 4 cartas en móvil

**User Story:** Como jugador en un dispositivo móvil, quiero que cuando hay más de 4 cartas de combate estas se organicen siempre en 2 filas predecibles, para poder ver y tocar todas las cartas sin que el diseño se desborde de forma errática.

#### Acceptance Criteria

1. WHILE el viewport está en Mobile_Breakpoint AND Card_Count es mayor que Max_Cards_Per_Row_Mobile (4), THE Card_Row SHALL distribuir las Cards en exactamente dos filas: Top_Row con exactamente 4 Cards y Bottom_Row con exactamente (Card_Count menos 4) Cards.
2. WHEN Card_Count es igual a 5 y el viewport está en Mobile_Breakpoint, THE Card_Row SHALL mostrar 4 Cards en Top_Row y 1 Card en Bottom_Row.
3. WHEN Card_Count es igual a 6 y el viewport está en Mobile_Breakpoint, THE Card_Row SHALL mostrar 4 Cards en Top_Row y 2 Cards en Bottom_Row.
4. WHEN Card_Count es igual a 7 (Max_Card_Count) y el viewport está en Mobile_Breakpoint, THE Card_Row SHALL mostrar 4 Cards en Top_Row y 3 Cards en Bottom_Row.
5. WHILE el viewport está en Mobile_Breakpoint AND Card_Count es mayor que 4, THE Card_Row SHALL asignar las Cards a Top_Row y Bottom_Row conservando el orden secuencial original de las Cards, de modo que las primeras 4 Cards del orden queden en Top_Row y las Cards restantes queden en Bottom_Row en el mismo orden relativo.
6. WHILE el viewport está en Mobile_Breakpoint, THE Card_Row SHALL distribuir las Cards de modo que ninguna Card requiera scroll horizontal ni quede parcialmente fuera del área visible de Card_Row, independientemente del Card_Count vigente.

### Requirement 2: Fila única sin cambios para 4 cartas o menos en móvil

**User Story:** Como jugador en un dispositivo móvil, quiero que cuando hay 4 cartas o menos estas sigan mostrándose en una sola fila, para conservar el diseño actual cuando no es necesario dividir en dos filas.

#### Acceptance Criteria

1. WHILE el viewport está en Mobile_Breakpoint AND Card_Count es menor o igual a Max_Cards_Per_Row_Mobile (4), THE Card_Row SHALL mostrar todas las Cards en una única fila (Top_Row), conservando el orden secuencial original de las Cards dentro de esa fila, sin generar Bottom_Row.
2. WHEN Card_Count es igual a 1, 2, 3 o 4 y el viewport está en Mobile_Breakpoint, THE Card_Row SHALL mostrar el total de Cards correspondiente en Top_Row, sin que exista Bottom_Row ni ninguna Card asignada a Bottom_Row.

### Requirement 3: Sin cambios en el layout de escritorio y tablet

**User Story:** Como jugador en escritorio o tablet, quiero que la disposición de las cartas de combate se mantenga igual que hoy, para que este ajuste de móvil no afecte mi experiencia en pantallas más grandes.

#### Acceptance Criteria

1. WHILE el viewport está en Desktop_Tablet_Layout (mayor a 520px), THE Card_Row SHALL mantener el comportamiento de disposición de Cards existente basado en `flex-wrap` libre, sin agrupar las Cards en Top_Row ni Bottom_Row, independientemente del valor de Card_Count, y SHALL mantener las Cards como hijos directos de Card_Row sin introducir contenedores envolventes (wrappers) alrededor de subconjuntos de Cards.
2. WHILE el viewport está en Desktop_Tablet_Layout, THE Card_Row SHALL mantener sin cambios las propiedades `display:flex`, `flex-wrap:wrap`, `gap:14px` y `justify-content:center` de Card_Row.

### Requirement 4: Interacción existente no afectada por el cambio de layout

**User Story:** Como jugador, quiero poder seleccionar y responder cualquier carta sin importar en qué fila se encuentre en móvil, para que la mecánica de combate siga funcionando igual que antes de este cambio de disposición.

#### Acceptance Criteria

1. WHEN el jugador hace clic en una Card ubicada en Top_Row o en Bottom_Row bajo Mobile_Breakpoint, THE Card_Row SHALL ejecutar el mismo Card_Click_Handler (volteo de la Card y apertura de la Modal_Pregunta) que se ejecuta para una Card en Desktop_Tablet_Layout.
2. WHILE una Card tiene su Modal_Pregunta abierta bajo Mobile_Breakpoint, THE Card_Row SHALL mantener la agrupación de Top_Row y Bottom_Row de las demás Cards sin alterar su fila ni su posición relativa dentro de esa fila.
3. WHEN el ancho del viewport cruza el umbral de Mobile_Breakpoint (520px) durante un combate en curso, THE Card_Row SHALL recalcular la agrupación en una sola fila o en Top_Row/Bottom_Row según el Card_Count vigente y el nuevo estado del viewport, sin remover ni recrear los Card_Click_Handler existentes de las Cards ya renderizadas, y sin cerrar ninguna Modal_Pregunta que estuviera abierta en el momento del cruce.
4. WHEN se aplica o recalcula la agrupación en Top_Row y Bottom_Row bajo Mobile_Breakpoint (incluyendo el recálculo por cruce de breakpoint descrito en el criterio 3), THE Card_Row SHALL conservar sin cambios el atributo `dataset.idx` de cada Card, de modo que el índice usado por Card_Click_Handler siga correspondiendo a la misma Card que antes de esta funcionalidad.
