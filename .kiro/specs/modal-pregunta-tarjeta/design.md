# Design Document

## Overview

Esta funcionalidad reemplaza el volteo 3D "en sitio" de la tarjeta (`.card.flipped` → `.card-back`) por una **Modal_Pregunta**: una vista expandida y centrada que muestra la pregunta y las opciones de la Tarjeta seleccionada con tipografía de mayor tamaño, mientras la **Capa_Fondo** (canvas de combate, arena y demás Tarjetas) se muestra desenfocada. Al registrar la respuesta, la Modal_Pregunta se cierra con animación y la Tarjeta vuelve a su Estado_Original.

Objetivos de diseño derivados de los requisitos:

- **Legibilidad** (R1): pregunta y opciones con fuente estrictamente mayor que en la tarjeta reducida.
- **Cero reflow de la fila** (R4): las demás Tarjetas no se mueven ni reordenan; la vista expandida vive en una **capa superpuesta** (`position:fixed`), fuera del flujo de `#cardsRow`.
- **Enfoque visual** (R6): desenfoque del fondo sincronizado con la expansión/regreso, sin desenfocar la Modal_Pregunta.
- **Animación fluida y accesible** (R3): expansión/regreso continuos entre 200–600 ms, con salto inmediato (≤50 ms) bajo `prefers-reduced-motion`.
- **Coherencia** (R5): mismo idioma (español), Firma_Facetada (`clip-path`) y paleta de variables CSS del proyecto.

### Decisiones clave

1. **Capa superpuesta `position:fixed` en lugar de escalar la tarjeta en su sitio.** Escalar la Tarjeta dentro de `#cardsRow` (un contenedor `display:flex; flex-wrap:wrap`) provocaría reflow/reacomodo de las demás Tarjetas, violando R4. En su lugar, la Modal_Pregunta se renderiza en un overlay fijo (`#questionModalOverlay`) por encima de todo, y las Tarjetas originales **permanecen intactas** en la fila. Esto satisface R4.5 (representar la expansión en una capa superpuesta) de forma estructural, no por ajuste fino.

2. **Desenfoque con `backdrop-filter` sobre el overlay** en lugar de `filter: blur()` sobre un contenedor de fondo. `backdrop-filter` desenfoca todo lo que queda *detrás* del overlay (canvas, arena, Tarjetas) sin tocar el propio overlay ni la Modal_Pregunta que contiene. Esto satisface R6.3 (modal nítida) de forma natural y evita mover Tarjetas (R6.5), ya que no altera el layout de `#cardsRow`.

3. **Animación continua con la Web Animations API (WAAPI) usando la técnica FLIP.** Para animar "de las dimensiones de Estado_Original a las de Estado_Expandido" (R3.1/R3.2) sin reflow, se mide el rectángulo de la Tarjeta origen (First) y el rectángulo destino centrado (Last), y se anima con `transform` (Invert→Play). WAAPI permite cancelar una animación en curso desde sus dimensiones actuales (R3.6) y fijar el estado destino al terminar (R3.7).

4. **Separación lógica pura / DOM.** La decisión de qué Tarjeta está expandida, el guardado de una sola modal abierta, el rechazo de Tarjetas bloqueadas y la construcción del contenido de la modal se aíslan en un **controlador puro** (`modalState.js`) sin dependencias del DOM, para poder verificarlo con tests basados en propiedades. La capa DOM (`screens.js`) consume ese controlador y ejecuta render, animación y desenfoque.

5. **Vanilla, cero dependencias nuevas.** Coherente con el stack (ES modules, sin bundler pesado obligatorio, WAAPI y `backdrop-filter` disponibles en navegadores modernos). No se introducen librerías de UI ni de animación.

## Architecture

```mermaid
flowchart TD
  Click["Clic en .card (onCardClick en main.js)"] --> Ctrl
  subgraph UI["src/ui"]
    Ctrl["modalState.js (controlador puro)\ncomputeOpen / computeClose / buildModalContent"]
    Screens["screens.js (capa DOM)\nopenQuestionModal / closeQuestionModal / isQuestionModalOpen"]
  end
  Ctrl -->|acción: open | ignore| Screens
  Screens -->|render + FLIP (WAAPI)| Overlay["#questionModalOverlay (position:fixed, z-index alto)\nbackdrop-filter: blur()"]
  Overlay --> Modal[".question-modal (.facet-cut, paleta :root)\n.qmodal-qtext + .qmodal-opt (fuente mayor)"]
  Modal -->|clic en opción| OnAnswer["onAnswer (main.js) → combat.answerCard"]
  OnAnswer -->|tras marcar acierto/fallo| Screens
  Screens -->|closeQuestionModal| Overlay
```

### Flujo de interacción

1. **Apertura (R1).** `main.js#onCardClick(idx)` delega en `screens.openQuestionModal(cardEl, card, onAnswer, idx)`. Internamente:
   - `modalState.computeOpen(state, cards, idx)` decide `open` o `ignore` (ignora si la Tarjeta está bloqueada o el combate está resuelto → R1.5).
   - Si `open`: se construye el contenido con `modalState.buildModalContent(card)` (texto + opciones en el mismo orden → R1.2), se puebla `.question-modal`, se muestra `#questionModalOverlay` y se lanza la Animación_Expansión (FLIP) + aparición del Desenfoque_Fondo.
2. **Respuesta (R1.6).** Cada opción es un botón `.qmodal-opt`; al hacer clic se llama `onAnswer(idx, chosenIdx)` (idéntico contrato al actual). Tras el primer clic, las opciones se deshabilitan (una única selección efectiva).
3. **Cierre / regreso (R2).** Tras marcar acierto/fallo y reproducir SFX/banner, `main.js` invoca `screens.closeQuestionModal()`, que lanza la Animación_Regreso + retirada del Desenfoque_Fondo y, al terminar, oculta el overlay y limpia el estado (`expandedIdx = null`). El disparo del regreso ocurre dentro de 0–2000 ms del registro de la respuesta (R2.4); en resolución de combate (`win`/`lose`) se cierra antes de `endFight` (R2.3).

### Capas y z-index

| Capa | Elemento | z-index | Desenfocada |
|------|----------|--------:|:-----------:|
| Mundo | `#gameCanvas` | 0 | Sí (detrás del overlay) |
| Combate | `#bossScreen .overlay` (arena, `#cardsRow`) | 20 | Sí (detrás del overlay) |
| Modal | `#questionModalOverlay` (`backdrop-filter`) | 60 | No |
| Contenido modal | `.question-modal` | (dentro del overlay) | No |

El overlay de la modal usa un z-index (60) superior al de `#bossScreen` (20) y al banner (30), de modo que `backdrop-filter` desenfoca canvas + arena + Tarjetas simultáneamente, mientras la propia modal queda nítida por encima.

## Components and Interfaces

### 1. `src/ui/modalState.js` (nuevo — controlador puro, sin DOM)

Aísla la lógica de estado para permitir pruebas basadas en propiedades.

```js
/** Estado del controlador de la Modal_Pregunta. */
// { expandedIdx: number | null }

/** Crea el estado inicial (ninguna modal abierta). */
export function createModalState(); // → { expandedIdx: null }

/**
 * Decide la apertura de la modal para la Tarjeta `idx`.
 * Ignora si el combate está resuelto, si el índice no existe o si la Tarjeta está bloqueada.
 * @returns {{ state: {expandedIdx:number|null}, action: 'open'|'ignore' }}
 */
export function computeOpen(state, cards, idx, resolved);

/**
 * Decide el cierre de la modal. Siempre deja expandedIdx = null.
 * @returns {{ state: {expandedIdx:null}, action: 'close'|'noop' }}
 */
export function computeClose(state);

/**
 * Construye el modelo de contenido de la modal a partir de una Tarjeta,
 * preservando el texto de la pregunta y el orden de las opciones.
 * @returns {{ text: string, options: string[] }}
 */
export function buildModalContent(card);
```

Reglas:
- `computeopen` con `resolved === true`, `idx` fuera de rango, o `cards[idx].locked === true` → `action:'ignore'`, estado sin cambios (R1.5).
- `computeOpen` válido → `action:'open'`, `state.expandedIdx = idx`. Sobrescribe cualquier valor previo, garantizando **a lo sumo una** modal (R1.7).
- `buildModalContent(card)` copia `card.question.text` y `[...card.question.options]` sin reordenar (R1.2).

### 2. `src/ui/screens.js` (capa DOM — nuevas funciones exportadas)

```js
/**
 * Abre la Modal_Pregunta para una Tarjeta: puebla contenido, muestra el overlay,
 * lanza la Animación_Expansión (FLIP con WAAPI) y aplica el Desenfoque_Fondo.
 * No-op si la Tarjeta está bloqueada o el combate está resuelto.
 */
export function openQuestionModal(cardEl, card, onAnswer, cardIdx, { resolved } = {});

/**
 * Cierra la Modal_Pregunta: lanza la Animación_Regreso, retira el Desenfoque_Fondo,
 * oculta el overlay y limpia el estado. Cancela cualquier animación en curso.
 */
export function closeQuestionModal();

/** Indica si la Modal_Pregunta está abierta actualmente. */
export function isQuestionModalOpen(); // → boolean
```

Detalles de implementación:

- **Poblado de contenido:** el texto se escribe con `textContent` (nunca `innerHTML`) para evitar inyección; las opciones se crean como `<button class="qmodal-opt facet-cut-sm">`. El contenedor principal `.question-modal` lleva `.facet-cut` (R5.2).
- **Una sola opción efectiva (R1.6):** al primer clic, se marca la elegida (`.correct`/`.incorrect`) y se hace `disabled` a todos los botones, replicando el comportamiento de `onAnswer` actual.
- **FLIP / WAAPI (R3):**
  - `first = cardEl.getBoundingClientRect()`; `last = modalEl.getBoundingClientRect()` (con la modal ya en su posición final centrada, medida antes de pintar).
  - Invertir: `dx = first.left - last.left`, `dy = first.top - last.top`, `sx = first.width/last.width`, `sy = first.height/last.height`.
  - `currentAnimation = modalEl.animate([{transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity:.6},{transform:'none', opacity:1}], { duration: DURATION_MS, easing:'cubic-bezier(.4,.2,.2,1)', fill:'both' })`.
  - El desenfoque se anima en paralelo sobre `#questionModalOverlay` (transición de `--modal-blur` de 0 → valor final), con la **misma duración** (R6.6/R6.7).
  - **Cancelación (R3.6):** si `openQuestionModal`/`closeQuestionModal` se invoca con una animación en curso, se llama `currentAnimation.cancel()` y la nueva animación arranca desde las dimensiones actuales (`getBoundingClientRect()` recalculado).
  - **Commit (R3.7):** en `animation.onfinish` se retira el `transform` y se fija el estado destino (overlay visible/ocultado; blur final 0 o N).
- **Movimiento_Reducido (R3.5/R6.8):** si `matchMedia('(prefers-reduced-motion: reduce)').matches`, se omite `.animate()` y se aplica el estado destino directamente (mostrar/ocultar overlay y fijar blur), completando en ≤50 ms. Regla CSS `@media (prefers-reduced-motion: reduce)` como refuerzo declarativo.

### 3. `src/main.js` (wiring — cambios)

- `onCardClick(idx)`: sustituye `ui.renderCardBack(cardEl, card, onAnswer, idx)` por `ui.openQuestionModal(cardEl, card, onAnswer, idx, { resolved: fight.resolved })`.
- `onAnswer(cardIdx, chosenIdx)`: tras marcar acierto/fallo y `renderPips`, invoca el cierre:
  - `win`/`lose`: `ui.closeQuestionModal()` antes de `endFight(...)` (R2.3), dentro de los temporizadores existentes.
  - Acierto sin resolver: `ui.closeQuestionModal()` en lugar de `cardEl.classList.remove('flipped')` (R2.1); la Tarjeta origen no queda bloqueada y sigue disponible.
  - Fallo sin resolver: `ui.closeQuestionModal()` (R2.2); la Tarjeta origen queda bloqueada como hoy.
- El disparo del cierre respeta la ventana 0–2000 ms (R2.4).

### 4. `index.html` (shell — nuevos DOM + CSS)

**DOM** (añadido al final de `#app`, hermano de `#bossScreen`):

```html
<div id="questionModalOverlay" class="qmodal-overlay hidden" aria-hidden="true">
  <div class="question-modal facet-cut" role="dialog" aria-modal="true" aria-label="Pregunta">
    <div class="qmodal-qtext"></div>
    <div class="qmodal-opts"></div>
  </div>
</div>
```

**CSS** (nuevo bloque `/* ---------- question modal ---------- */`, usando solo variables `:root`):

```css
:root{ --modal-blur: 8px; --modal-anim-ms: 320ms; } /* 2–12px y 200–600ms */

.qmodal-overlay{
  position:fixed; inset:0; z-index:60;
  display:flex; align-items:center; justify-content:center; padding:24px;
  backdrop-filter: blur(var(--modal-blur));
  -webkit-backdrop-filter: blur(var(--modal-blur));
  transition: backdrop-filter var(--modal-anim-ms) ease, -webkit-backdrop-filter var(--modal-anim-ms) ease;
}
.qmodal-overlay.hidden{ display:none; }
.qmodal-overlay.no-blur{ backdrop-filter: blur(0); -webkit-backdrop-filter: blur(0); } /* estado retirado (R6.2/6.4) */

.question-modal{
  width:min(560px, 92vw); max-height:82vh; overflow-y:auto; padding:26px 28px;
  background:linear-gradient(160deg, var(--panel-2), var(--panel));
  border:1px solid rgba(217,179,77,.5);
  box-shadow:0 0 0 1px rgba(0,0,0,.3), 0 20px 60px rgba(0,0,0,.55);
  /* .facet-cut aporta el clip-path gem-cut (R5.2) */
}
.qmodal-qtext{ font-family:var(--font-body); font-weight:600; color:var(--ink);
  font-size:clamp(18px, 2.4vw, 24px); line-height:1.4; margin-bottom:18px; } /* > 11.5px (R1.3) */
.qmodal-opt{ display:block; width:100%; text-align:left; font-family:var(--font-body);
  font-size:clamp(15px, 1.8vw, 18px); line-height:1.35; color:var(--ink-dim);
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.16);
  padding:12px 14px; margin-bottom:10px; cursor:pointer; } /* > 10.5px (R1.4) */
.qmodal-opt.correct{ background:rgba(89,194,122,.35); border-color:var(--success); color:#fff; }
.qmodal-opt.incorrect{ background:rgba(226,73,58,.35); border-color:var(--danger); color:#fff; }

@media (prefers-reduced-motion: reduce){
  .qmodal-overlay{ transition-duration:0ms; } /* refuerzo declarativo (R6.8) */
}
```

Las Tarjetas de `#cardsRow` **no se modifican**: permanecen en su tamaño y posición; la modal es una capa aparte (R4).

## Data Models

El modelo reutiliza la estructura de Tarjeta ya existente (definida en `combat/fight.js`) y añade un pequeño estado de UI.

```js
// Tarjeta (existente, sin cambios): fight.cards[i]
// {
//   service: { id, abbr, name, color },
//   question: { text: string, options: string[], correct: number },
//   locked: boolean
// }

// Estado del controlador de modal (nuevo, en modalState.js)
// ModalState = { expandedIdx: number | null }

// Modelo de contenido de la modal (derivado, nuevo)
// ModalContent = { text: string, options: string[] }
```

- `ModalState.expandedIdx` es el único campo de estado; su cardinalidad (escalar, no lista) impone estructuralmente el invariante de "una sola modal" (R1.7).
- `ModalContent` es una proyección de solo lectura de `card.question`; no persiste `correct` (la corrección la resuelve `combat.answerCard`, igual que hoy).
- No hay persistencia en disco ni cambios en `scoreStore`/`fight`.

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe cumplirse en todas las ejecuciones válidas de un sistema; esencialmente, un enunciado formal de lo que el sistema debe hacer. Las propiedades son el puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquina.*

Esta funcionalidad es mayormente de UI (render DOM, animación, desenfoque y estilo), lo cual no es apto para pruebas basadas en propiedades y se cubre con tests de ejemplo, integración y revisión estática (ver Testing Strategy). No obstante, la lógica de estado se aísla en un **controlador puro** (`modalState.js`) con propiedades universales verificables. Las siguientes propiedades aplican a ese controlador.

### Property 1: La decisión de apertura respeta el estado y el bloqueo

*Para toda* colección de Tarjetas, cualquier índice y cualquier valor de `resolved`, `computeOpen(state, cards, idx, resolved)` devuelve `action:'open'` con `expandedIdx === idx` **si y solo si** el combate no está resuelto, `idx` es un índice válido y `cards[idx].locked` es falso; en cualquier otro caso devuelve `action:'ignore'` dejando el estado sin cambios.

**Validates: Requirements 1.1, 1.5**

### Property 2: Fidelidad del contenido de la modal

*Para toda* Tarjeta, `buildModalContent(card)` produce un `text` idéntico a `card.question.text` y una lista `options` con exactamente los mismos elementos, en el mismo orden, que `card.question.options`.

**Validates: Requirements 1.2**

### Property 3: A lo sumo una modal expandida

*Para toda* secuencia de operaciones `computeOpen`/`computeClose` aplicadas sobre el estado inicial, el `expandedIdx` resultante es siempre `null` o un único índice (nunca un conjunto), y una apertura válida sobre un índice distinto sobrescribe al anterior sin conservar el previo. En consecuencia, a lo sumo una Tarjeta está en Estado_Expandido y todas las demás permanecen en Estado_Original.

**Validates: Requirements 1.7, 2.5**

### Property 4: El cierre limpia el estado y desactiva el desenfoque

*Para todo* estado (con o sin modal abierta), `computeClose(state)` deja `expandedIdx === null`; y para todo estado, `expandedIdx === null` implica que la representación del overlay derivada del estado no aplica Desenfoque_Fondo (radio 0). Es decir, tras cerrar (por acierto, fallo o resolución del combate) la Tarjeta vuelve a Estado_Original y el fondo recupera su nitidez.

**Validates: Requirements 2.1, 2.2, 2.3, 6.4**

## Error Handling

- **Índice de Tarjeta inválido o combate resuelto:** `computeOpen` devuelve `action:'ignore'` sin mutar el estado; `openQuestionModal` es un no-op. Coherente con las guardas actuales de `onCardClick`/`answerCard` (que ya retornan temprano ante `fight.resolved` o `card.locked`).
- **Tarjeta bloqueada:** se ignora la apertura (R1.5); la Tarjeta permanece en Estado_Original.
- **Doble clic / clics rápidos en opciones:** al primer clic se hace `disabled` a todos los `.qmodal-opt` y se marca la Tarjeta origen como ocupada, garantizando una única selección efectiva (R1.6) y evitando llamadas duplicadas a `onAnswer`.
- **Reapertura durante una animación:** `openQuestionModal`/`closeQuestionModal` cancelan la `Animation` en curso (`currentAnimation.cancel()`) y arrancan desde las dimensiones actuales medidas con `getBoundingClientRect()` (R3.6). Un `onfinish` obsoleto no revierte el estado destino porque se comprueba la animación vigente antes de commitear.
- **Ausencia de `backdrop-filter` (navegador sin soporte):** degradación elegante — el overlay sigue mostrando la modal centrada y por encima del fondo; solo se pierde el desenfoque (mejora estética, no funcional). No bloquea responder la pregunta.
- **`prefers-reduced-motion` activo:** se omite la animación y se aplica el estado destino directamente (≤50 ms), tanto para la escala como para el desenfoque (R3.5, R6.8).
- **Sanitización:** el enunciado y las opciones se escriben con `textContent` (nunca `innerHTML`), evitando inyección de HTML a partir de datos de pregunta.

## Testing Strategy

Enfoque dual: tests basados en propiedades para la lógica pura del controlador y tests de ejemplo/integración/estáticos para la capa DOM, la animación, el desenfoque y el estilo (que no son aptos para PBT).

### Herramientas

- **Vitest** (`vitest run`) como runner, coherente con los tests existentes (`fight.test.js`, `screens`/`leaderboard`).
- **fast-check** (`^3.23.2`, ya en `devDependencies`) para las propiedades.
- **jsdom** para tests de DOM (poblado, orden, `disabled`, presencia de clases). Las mediciones de layout pixel-exacto y el rendering de `backdrop-filter`/WAAPI no son fiables en jsdom y se relegan a integración/E2E en navegador.
- No se implementa PBT desde cero ni se añaden dependencias nuevas.

### Tests basados en propiedades (controlador puro `modalState.js`)

- Mínimo **100 iteraciones** por propiedad (`{ numRuns: 100 }`).
- Cada test se etiqueta con un comentario que referencia la propiedad del diseño, con el formato:
  `// Feature: modal-pregunta-tarjeta, Property {n}: {texto}`.
- Una única prueba de propiedad por cada propiedad de corrección:
  - **Property 1** — generar `cards` (con `locked` aleatorio), índices dentro y fuera de rango y `resolved` booleano; verificar el bicondicional open/ignore y la inmutabilidad del estado en el caso `ignore`.
  - **Property 2** — generar `question.text` (string arbitrario, incl. Unicode/vacío) y `options` (array de strings); verificar igualdad de `text` y `deepEqual` de `options` preservando el orden.
  - **Property 3** — generar secuencias aleatorias de operaciones `{open idx | close}` sobre cards no bloqueadas; verificar que `expandedIdx` es siempre `null` o un escalar y que un `open` válido sobrescribe el anterior.
  - **Property 4** — para estados arbitrarios, `computeClose` siempre deja `expandedIdx === null`; y `expandedIdx === null` ⇒ la función de representación del overlay indica blur 0.

### Tests de ejemplo / edge cases (jsdom)

- **Contenido y tipografía (R1.3, R1.4):** confirmar que el tamaño mínimo de `.qmodal-qtext` (18px) > 11.5px y el de `.qmodal-opt` (15px) > 10.5px.
- **Selección única (R1.6):** simular clic en una opción; verificar que todos los `.qmodal-opt` quedan `disabled` y `onAnswer` se llama una sola vez.
- **Estabilidad de orden (R4.2, R4.5):** capturar el orden de `dataset.idx` en `#cardsRow` antes/después de abrir; confirmar que no cambia y que `.question-modal` vive dentro de `#questionModalOverlay` (no de `#cardsRow`).
- **Desenfoque destino (R6.2, R6.3):** tras `closeQuestionModal`, el overlay queda oculto/`no-blur`; `.question-modal` no tiene filtro propio.
- **Movimiento reducido (R3.5, R6.8):** con `matchMedia` mockeado a `reduce`, `openQuestionModal` aplica el estado destino sin invocar `element.animate` y con transición de blur a 0 ms.
- **Rangos de configuración (R3.3, R3.4, R6.1, R6.6, R6.7):** asserts de que `--modal-anim-ms` ∈ [200, 600] y `--modal-blur` ∈ [2, 12].
- **Idioma (R5.1):** los literales fijos (aria-label, banners reutilizados) están en español.

### Tests de integración / E2E (navegador)

- **Animaciones (R3.1, R3.2, R3.6, R3.7):** verificar que abrir/cerrar crean una `Animation` (WAAPI), que una reapertura durante la animación llama `cancel()` sobre la anterior, y que el `onfinish` fija el estado destino.
- **Estabilidad de layout (R4.1, R4.3, R4.4, R6.5):** medir `getBoundingClientRect()` de las demás Tarjetas antes/durante/después de expandir y cerrar; tolerancia ≤ 1px, sin desplazamiento intermedio.
- **Temporización del cierre (R2.4):** con fake timers, confirmar que `closeQuestionModal` se dispara dentro de la ventana 0–2000 ms tras `onAnswer` en las tres ramas (acierto, fallo, resolución).

### Revisión estática (smoke) — R5.3, R5.4

- El bloque CSS de la modal usa exclusivamente `var(--...)` para colores (los `rgba` de resaltado replican los ya usados por `.opt-btn`/overlays existentes) y `var(--font-body)`/`var(--font-display)` para tipografía; no se añaden `@font-face` ni `<link>` de fuentes nuevas.
