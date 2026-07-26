# Implementation Plan: Modal_Pregunta de Tarjeta

## Overview

El plan implementa la Modal_Pregunta como una capa superpuesta (`position:fixed`) que sustituye el volteo 3D en sitio, sin provocar reflow de `#cardsRow`. Se construye de forma incremental: primero el controlador puro (`modalState.js`) con su lógica de estado verificable por propiedades, luego el shell DOM/CSS en `index.html`, después la capa DOM en `screens.js` (poblado de contenido, animación FLIP con WAAPI y desenfoque con `backdrop-filter`), y finalmente el wiring en `main.js` para abrir/cerrar la modal en los tres caminos de respuesta (acierto, fallo, resolución de combate). Todo el contenido de cara al usuario se mantiene en español y se reutiliza la Firma_Facetada y la paleta de variables CSS existentes.

## Tasks

- [x] 1. Crear el controlador puro de estado de la modal (`src/ui/modalState.js`)
  - [x] 1.1 Implementar el estado y las funciones de decisión del controlador
    - Crear `src/ui/modalState.js` como ES module sin dependencias del DOM
    - Implementar `createModalState()` → `{ expandedIdx: null }`
    - Implementar `computeOpen(state, cards, idx, resolved)`: devuelve `action:'open'` con `expandedIdx = idx` si y solo si `resolved` es falso, `idx` es índice válido y `cards[idx].locked` es falso; en cualquier otro caso devuelve `action:'ignore'` sin mutar el estado; una apertura válida sobrescribe cualquier `expandedIdx` previo
    - Implementar `computeClose(state)`: devuelve siempre `expandedIdx = null` con `action:'close'` (o `'noop'` si ya estaba cerrada)
    - Implementar `buildModalContent(card)`: copia `card.question.text` y `[...card.question.options]` preservando el orden, sin persistir `correct`
    - _Requirements: 1.1, 1.2, 1.5, 1.7, 2.5, 6.4_

  - [x]* 1.2 Escribir property test para la decisión de apertura
    - **Property 1: La decisión de apertura respeta el estado y el bloqueo**
    - **Validates: Requirements 1.1, 1.5**
    - Generar `cards` con `locked` aleatorio, índices dentro y fuera de rango y `resolved` booleano; verificar el bicondicional open/ignore y la inmutabilidad del estado en el caso `ignore`
    - Usar fast-check con `{ numRuns: 100 }` y etiquetar `// Feature: modal-pregunta-tarjeta, Property 1: ...`

  - [x]* 1.3 Escribir property test para la fidelidad del contenido
    - **Property 2: Fidelidad del contenido de la modal**
    - **Validates: Requirements 1.2**
    - Generar `question.text` arbitrario (incl. Unicode/vacío) y `options` (array de strings); verificar igualdad de `text` y `deepEqual` de `options` preservando el orden
    - Usar fast-check con `{ numRuns: 100 }`

  - [x]* 1.4 Escribir property test para "a lo sumo una modal"
    - **Property 3: A lo sumo una modal expandida**
    - **Validates: Requirements 1.7, 2.5**
    - Generar secuencias aleatorias de operaciones `{open idx | close}` sobre cards no bloqueadas; verificar que `expandedIdx` es siempre `null` o un escalar y que un `open` válido sobrescribe el anterior
    - Usar fast-check con `{ numRuns: 100 }`

  - [x]* 1.5 Escribir property test para el cierre y el desenfoque
    - **Property 4: El cierre limpia el estado y desactiva el desenfoque**
    - **Validates: Requirements 2.1, 2.2, 2.3, 6.4**
    - Para estados arbitrarios, `computeClose` siempre deja `expandedIdx === null`; y `expandedIdx === null` ⇒ la función de representación del overlay indica blur 0
    - Usar fast-check con `{ numRuns: 100 }`

- [x] 2. Añadir el shell DOM y el CSS de la Modal_Pregunta en `index.html`
  - [x] 2.1 Añadir la estructura DOM del overlay de la modal
    - Insertar `#questionModalOverlay.qmodal-overlay.hidden` (con `aria-hidden="true"`) como hermano de `#bossScreen` al final de `#app`
    - Incluir `.question-modal.facet-cut` con `role="dialog"`, `aria-modal="true"`, `aria-label="Pregunta"` (español), y contenedores `.qmodal-qtext` y `.qmodal-opts`
    - _Requirements: 4.5, 5.1, 5.2_

  - [x] 2.2 Añadir el bloque CSS de la modal usando solo variables `:root`
    - Definir `--modal-blur` en el rango 2–12 px y `--modal-anim-ms` en el rango 200–600 ms en `:root`
    - Estilar `.qmodal-overlay` con `position:fixed; inset:0; z-index:60`, centrado flex, `backdrop-filter: blur(var(--modal-blur))` (+ prefijo `-webkit-`) y transición de la misma duración; estados `.hidden` y `.no-blur`
    - Estilar `.question-modal` (ancho responsivo, paleta vía `var(--panel)`/`var(--panel-2)`/`var(--ink)`), `.qmodal-qtext` con `font-size` mínimo estrictamente mayor que en Estado_Original (>11.5px), y `.qmodal-opt` con `font-size` mínimo >10.5px, más estados `.correct`/`.incorrect`
    - Usar `var(--font-body)`/`var(--font-display)` sin introducir fuentes ni colores literales nuevos; añadir `@media (prefers-reduced-motion: reduce)` con `transition-duration:0ms`
    - No modificar el tamaño ni la posición de las Tarjetas de `#cardsRow`
    - _Requirements: 1.3, 1.4, 3.3, 3.4, 5.2, 5.3, 5.4, 6.1, 6.3_

- [x] 3. Implementar la capa DOM de apertura de la modal (`src/ui/screens.js`)
  - [x] 3.1 Implementar `openQuestionModal` con poblado de contenido y selección única
    - Añadir `openQuestionModal(cardEl, card, onAnswer, cardIdx, { resolved } = {})` que consulta `modalState.computeOpen`; no-op si la acción es `ignore` (Tarjeta bloqueada o combate resuelto)
    - Poblar `.qmodal-qtext` con `textContent` (nunca `innerHTML`) y crear cada opción como `<button class="qmodal-opt facet-cut-sm">` en el mismo orden que `buildModalContent`
    - Al primer clic en una opción: marcar `.correct`/`.incorrect`, deshabilitar todos los `.qmodal-opt` y llamar `onAnswer(cardIdx, chosenIdx)` una sola vez
    - Mostrar `#questionModalOverlay` (quitar `.hidden`, actualizar `aria-hidden`) manteniendo intactas las demás Tarjetas
    - Añadir `isQuestionModalOpen()` → boolean
    - _Requirements: 1.1, 1.2, 1.6, 4.2, 4.5_

  - [x] 3.2 Implementar la Animación_Expansión (FLIP con WAAPI) y el Desenfoque_Fondo de apertura
    - Medir `first = cardEl.getBoundingClientRect()` y `last = modalEl.getBoundingClientRect()` (modal ya en su posición final centrada) y calcular `dx/dy/sx/sy`
    - Lanzar `currentAnimation = modalEl.animate([...], { duration: --modal-anim-ms, easing, fill:'both' })` desde las dimensiones de la Tarjeta origen hacia el destino
    - Animar el desenfoque sobre `#questionModalOverlay` en paralelo (0 → valor final) con la misma duración
    - En `onfinish`: retirar el `transform` y fijar el estado destino (overlay visible, blur final)
    - Bajo `matchMedia('(prefers-reduced-motion: reduce)').matches`: omitir `.animate()` y aplicar el estado destino directamente en ≤50 ms
    - Cancelar cualquier `currentAnimation` en curso antes de iniciar una nueva, arrancando desde las dimensiones actuales
    - _Requirements: 3.1, 3.3, 3.5, 3.6, 3.7, 6.1, 6.6, 6.8_

  - [x]* 3.3 Escribir tests de ejemplo (jsdom) para apertura, contenido y accesibilidad de movimiento reducido
    - Verificar tamaños de fuente mínimos: `.qmodal-qtext` (18px) > 11.5px y `.qmodal-opt` (15px) > 10.5px (R1.3, R1.4)
    - Simular clic en una opción y confirmar que todos los `.qmodal-opt` quedan `disabled` y `onAnswer` se llama una sola vez (R1.6)
    - Capturar el orden de `dataset.idx` en `#cardsRow` antes/después de abrir y confirmar que no cambia y que `.question-modal` vive dentro de `#questionModalOverlay` (R4.2, R4.5)
    - Con `matchMedia` mockeado a `reduce`, confirmar que `openQuestionModal` aplica el estado destino sin invocar `element.animate` (R3.5, R6.8)
    - Asserts de que `--modal-anim-ms` ∈ [200, 600] y `--modal-blur` ∈ [2, 12] (R3.3, R6.1)
    - _Requirements: 1.3, 1.4, 1.6, 3.3, 3.5, 4.2, 4.5, 6.1, 6.8_

- [x] 4. Implementar la capa DOM de cierre/regreso de la modal (`src/ui/screens.js`)
  - [x] 4.1 Implementar `closeQuestionModal` con Animación_Regreso y retirada del Desenfoque_Fondo
    - Añadir `closeQuestionModal()` que consulta `modalState.computeClose`, lanza la Animación_Regreso (FLIP inverso hacia las dimensiones de la Tarjeta origen) y anima el desenfoque de N → 0 con la misma duración
    - Cancelar cualquier `currentAnimation` en curso y arrancar desde las dimensiones actuales medidas con `getBoundingClientRect()`
    - En `onfinish`: ocultar el overlay (`.hidden`/`.no-blur`, `aria-hidden="true"`), fijar blur 0 y limpiar el estado (`expandedIdx = null`), comprobando que la animación vigente no fue reemplazada
    - Bajo `prefers-reduced-motion: reduce`: aplicar el estado destino directamente en ≤50 ms, sin fotogramas intermedios de escala ni de blur
    - Garantizar que la Tarjeta expandida y la modal nunca reciben blur y que las demás Tarjetas conservan posición (tolerancia ≤1px) y orden
    - _Requirements: 3.2, 3.4, 3.5, 3.6, 3.7, 4.1, 4.3, 4.4, 6.2, 6.3, 6.5, 6.7, 6.8_

  - [x]* 4.2 Escribir tests de ejemplo (jsdom) para el estado tras el cierre
    - Tras `closeQuestionModal`, confirmar que el overlay queda oculto/`no-blur` y que `.question-modal` no tiene filtro propio (R6.2, R6.3)
    - Confirmar que el orden de `dataset.idx` en `#cardsRow` es idéntico al previo a la expansión (R4.3)
    - _Requirements: 4.3, 6.2, 6.3_

- [x] 5. Integrar la Modal_Pregunta en el flujo de combate (`src/main.js`)
  - [x] 5.1 Wire de apertura en `onCardClick`
    - Sustituir `ui.renderCardBack(cardEl, card, onAnswer, idx)` por `ui.openQuestionModal(cardEl, card, onAnswer, idx, { resolved: fight.resolved })`
    - Conservar las guardas existentes de `fight.resolved` y `card.locked`
    - _Requirements: 1.1, 1.5_

  - [x] 5.2 Wire de cierre en `onAnswer` para los tres caminos
    - En `win`/`lose`: invocar `ui.closeQuestionModal()` antes de `endFight(...)`, dentro de los temporizadores existentes (R2.3)
    - En acierto sin resolver: reemplazar `cardEl.classList.remove('flipped')` por `ui.closeQuestionModal()`; la Tarjeta origen sigue disponible (R2.1)
    - En fallo sin resolver: invocar `ui.closeQuestionModal()`; la Tarjeta origen queda bloqueada como hoy (R2.2)
    - Asegurar que el disparo del cierre ocurre dentro de la ventana 0–2000 ms tras registrar la respuesta (R2.4)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x]* 5.3 Escribir tests de integración de temporización del cierre
    - Con fake timers, confirmar que `closeQuestionModal` se dispara dentro de la ventana 0–2000 ms tras `onAnswer` en las tres ramas (acierto, fallo, resolución) (R2.4)
    - Verificar que en `win`/`lose` el cierre ocurre antes de `endFight` (R2.3)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Checkpoint - Asegurar que todas las pruebas pasan
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido; incluyen tests de propiedades, de ejemplo (jsdom) y de integración.
- Cada tarea referencia cláusulas específicas de requisitos para trazabilidad.
- Las propiedades de corrección (Property 1–4) se prueban sobre el controlador puro `modalState.js`; la capa DOM, la animación, el desenfoque y el estilo se cubren con tests de ejemplo/integración por no ser aptos para PBT.
- Se reutiliza Vitest + fast-check + jsdom (ya en el proyecto); no se añaden dependencias nuevas.
- La firma visual facetada y la paleta de variables CSS existentes se conservan; todo el contenido de cara al usuario permanece en español.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "2.2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["3.3", "4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2"] },
    { "id": 6, "tasks": ["5.3"] }
  ]
}
```
