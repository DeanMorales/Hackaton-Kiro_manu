# Implementation Plan: Enhanced Welcome Screen

## Overview

El plan implementa la mejora de la pantalla de bienvenida en JavaScript vanilla (ES6+) sobre la versión modularizada (`index.html` + `src/`), reflejando después el cambio en el monolito `torre-de-las-nubes.html` para mantener la paridad. Se empieza por la lógica pura y su persistencia (`src/data/playerName.js`), validada con property-based tests (fast-check) y unit tests (Vitest). Después se añade el DOM y el CSS aditivos, se extiende `src/ui/screens.js`, y finalmente se conecta todo en `src/main.js`. Cada paso construye sobre el anterior y termina integrando el código, sin dejar piezas huérfanas.

## Tasks

- [ ] 1. Crear el módulo de lógica pura y persistencia del nombre (`src/data/playerName.js`)
  - [ ] 1.1 Implementar sanitización, validación y constantes del nombre
    - Crear `src/data/playerName.js` con exports `STORAGE_KEY = 'playerName'`, `MAX_NAME_LENGTH = 8` y el regex `ALLOWED_CHARS` (letras con acentos y ñ, dígitos, espacios)
    - Implementar `sanitizeName(raw)`: coacciona a cadena, filtra a caracteres permitidos y recorta a `MAX_NAME_LENGTH`; nunca lanza excepción
    - Implementar `isValidName(raw)`: `true` si y solo si el sanitizado tiene longitud 1–8 (contando espacios) y contiene al menos un carácter alfanumérico
    - _Requirements: 3.3, 4.1, 4.2_

  - [ ]* 1.2 Escribir property test para `sanitizeName`
    - **Property 1: Sanitización conserva solo caracteres permitidos y es idempotente**
    - **Validates: Requirements 3.3, 4.2**
    - Archivo `src/data/playerName.test.js`, fast-check con `numRuns: 100`, generadores de cadenas arbitrarias (unicode, símbolos, espacios, vacías, >8 caracteres)

  - [ ]* 1.3 Escribir property test para `isValidName`
    - **Property 2: La validación depende de la longitud sanitizada**
    - **Validates: Requirements 4.1**
    - Incluir casos solo-espacios y solo-símbolos (inválidos por falta de alfanumérico) y rangos 0 / 1–8 / >8

  - [ ] 1.4 Implementar el nombre activo de partida (`commitName`)
    - Implementar `commitName(raw)`: devuelve `sanitizeName(raw)` si es válido, o `''` en caso contrario; idempotente sobre nombres válidos
    - _Requirements: 4.2, 4.4, 7.4, 8.1, 10.3, 10.4_

  - [ ]* 1.5 Escribir property test para `commitName`
    - **Property 3: El nombre activo proviene del campo y descarta entradas inválidas**
    - **Validates: Requirements 4.2, 4.4, 7.4, 8.1, 10.3, 10.4**
    - Verificar recorte a 8 en entradas largas e idempotencia sobre nombres válidos

  - [ ] 1.6 Implementar persistencia en localStorage (`persistIfValid`, `loadStoredName`)
    - Implementar `persistIfValid(raw)`: guarda `sanitizeName(raw)` en `localStorage[STORAGE_KEY]` solo si `isValidName`; devuelve `true`/`false`; captura excepciones (modo privado/cuota) con `console.warn` sin propagar
    - Implementar `loadStoredName()`: lee `localStorage[STORAGE_KEY]`, normaliza a cadena, devuelve `''` si no existe, hay error o el valor es inutilizable
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.2, 7.3, 10.2_

  - [ ]* 1.7 Escribir property test de round-trip de persistencia
    - **Property 4: Round-trip de persistencia — la última escritura válida gana**
    - **Validates: Requirements 5.1, 5.2, 7.2, 7.3, 10.2**
    - Usar mock de `localStorage` (o jsdom); secuencias de nombres que terminan en válido; limpiar store entre iteraciones

  - [ ]* 1.8 Escribir property test de no-modificación para entradas inválidas
    - **Property 5: Persistencia no modifica el storage para entradas inválidas**
    - **Validates: Requirements 5.3**
    - Precargar el store con estados previos arbitrarios y verificar que entradas inválidas lo dejan intacto

  - [ ] 1.9 Implementar el formateo del detalle de Game Over (`formatGameOverDetail`)
    - Implementar `formatGameOverDetail(playerName, floor, cause)`: si el nombre activo es no vacío devuelve `{ detail, playerName }` con nombre y piso; si es vacío devuelve detalle genérico con el piso y `playerName: ''`; soportar causas `'fall'` y `'boss'`
    - _Requirements: 6.1, 6.2, 8.2_

  - [ ]* 1.10 Escribir property test para `formatGameOverDetail`
    - **Property 6: El detalle de Game Over se personaliza según haya nombre o no**
    - **Validates: Requirements 6.1, 6.2, 8.2**
    - Generar piso y causa arbitrarios; verificar presencia/ausencia del nombre y presencia del piso

- [ ] 2. Checkpoint - Validar la lógica pura
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Añadir DOM y CSS aditivos en la versión modularizada (`index.html`)
  - [ ] 3.1 Insertar los nuevos elementos del `#startScreen` en `index.html`
    - Dentro del `.panel.facet-cut`, entre la lista `.rules` y `#startBtn`, insertar `.welcome-msg` (mensaje motivacional exacto), `.name-field.facet-cut-sm` con `#playerNameInput` (`type="text"`, `maxlength="8"`, `autocomplete="off"`, `spellcheck="false"`, placeholder y aria-label "Tu nombre (opcional)") y `.name-hint`
    - Añadir en `#gameOverScreen` el elemento `#gameOverPlayerName.player-name-display` antes de `#gameOverDetail`
    - Preservar sin cambios `.crest`, `<h1>`, `.subtitle`, los cuatro `<li>` de `.rules` y `#startBtn` (id, clase `btn-primary`, texto "Comenzar a construir")
    - _Requirements: 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 6.4, 9.4_

  - [ ] 3.2 Añadir las reglas CSS aditivas reutilizando variables existentes
    - Agregar reglas para `.welcome-msg` (`var(--gold)`, `var(--font-display)`), `.name-field` (clip-path facetado, borde dorado, fondo oscuro), `#playerNameInput` (fondo oscuro/transparente, texto `var(--ink)`, padding), `.name-hint` (`var(--ink-dim)`, texto pequeño), `.player-name-display` (`var(--font-display)` peso 700, `var(--gold)`)
    - Añadir media query `@media (max-width:520px)` para adaptar el campo en móvil sin sobrescribir selectores existentes
    - _Requirements: 2.3, 3.5, 6.3, 8.4, 9.1, 9.2, 9.3, 9.5_

  - [ ]* 3.3 Escribir unit tests de estructura del DOM de bienvenida (jsdom)
    - Verificar mensaje de bienvenida exacto (2.2), `#playerNameInput` con placeholder "Tu nombre (opcional)" y `maxlength="8"` (3.1, 3.2), `.name-hint` presente (8.4), y preservación de `.crest`/`<h1>`/`.subtitle`/cuatro `<li>`/`#startBtn` con el nuevo bloque insertado entre `.rules` y `#startBtn`
    - _Requirements: 2.2, 2.4, 3.1, 3.2, 8.4, 9.4_

- [ ] 4. Extender la capa de UI (`src/ui/screens.js`)
  - [ ] 4.1 Implementar `bindPlayerNameInput` y `getPlayerNameInputValue`
    - `bindPlayerNameInput(deps)`: pre-rellena `#playerNameInput` con `deps.getStored()`, y en el evento `input` sanitiza el valor visible con `deps.sanitize` y persiste con `deps.persist`; verifica existencia del elemento (degrada silenciosamente si falta)
    - `getPlayerNameInputValue()`: devuelve el valor crudo actual del campo, o `''` si no existe
    - _Requirements: 5.1, 5.2, 5.3, 7.2, 10.2_

  - [ ] 4.2 Modificar `showGameOverScreen` para mostrar el nombre opcional
    - Añadir parámetro `playerName`; escribir el nombre vía `textContent` en `#gameOverPlayerName` (evita inyección) y mostrarlo solo si no es vacío; escribir `detail` en `#gameOverDetail`; verificar existencia de los elementos
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.2_

  - [ ]* 4.3 Escribir unit tests de UI (jsdom)
    - `#startBtn` nunca `disabled` y sin mensaje de error con campo vacío (4.3, 8.3); pre-relleno del campo con nombre válido en storage; `showGameOverScreen` con nombre muestra `#gameOverPlayerName` y sin nombre lo oculta
    - _Requirements: 4.3, 6.1, 6.2, 8.2, 8.3_

- [ ] 5. Conectar todo en `src/main.js`
  - [ ] 5.1 Cablear la gestión de nombre en la inicialización y el flujo de partida
    - En init: llamar a `bindPlayerNameInput()` inyectando `sanitizeName`, `persistIfValid` y `loadStoredName` de `playerName.js`
    - En `onStart()`: `gameState.playerName = commitName(getPlayerNameInputValue())` antes de iniciar la partida
    - En `onRetry()`: volver a mostrar la pantalla de bienvenida (campo ya pre-rellenado); el nombre activo se recalcula en el siguiente `onStart()`
    - En Game Over (`onDrop` fallido y `endFight(false)`): componer el detalle con `formatGameOverDetail(gameState.playerName, floor, cause)` y pasar el resultado a `showGameOverScreen()`
    - _Requirements: 4.4, 6.1, 6.2, 7.1, 7.3, 8.1, 10.1, 10.3, 10.4_

  - [ ]* 5.2 Escribir test de integración del flujo (jsdom)
    - `onRetry()` vuelve a mostrar la pantalla de bienvenida (10.1); iniciar con nombre almacenado sin cambios lo usa (10.3); borrar el campo e iniciar juega sin nombre (10.4); Game Over refleja el nombre activo correcto
    - _Requirements: 7.1, 8.1, 10.1, 10.3, 10.4_

- [ ] 6. Reflejar el cambio en el monolito para paridad (`torre-de-las-nubes.html`)
  - [ ] 6.1 Replicar DOM, CSS y lógica de nombre inline en el monolito
    - Insertar los mismos elementos aditivos en `#startScreen` y `#gameOverScreen`, las reglas CSS nuevas y las funciones de sanitización/validación/persistencia/formateo y su wiring dentro de la IIFE, manteniendo paridad visual y funcional con la versión modularizada
    - _Requirements: 2.2, 3.1, 3.2, 6.1, 6.2, 11.1, 11.2, 11.4_

- [ ] 7. Checkpoint final - Asegurar que toda la suite pasa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (tests) y pueden omitirse para un MVP más rápido; el resto es implementación obligatoria.
- Cada tarea referencia cláusulas de requisitos específicas para trazabilidad.
- Property tests (fast-check, `numRuns: 100`) validan las Propiedades 1–6 sobre la lógica pura de `src/data/playerName.js`; los unit/integration tests (Vitest + jsdom) cubren DOM, UI y flujo.
- Los criterios de estilo/layout/compatibilidad (Requisitos 1.x, 9.x visuales, 11.3) se verifican de forma visual/manual y no tienen tareas de código automatizables.
- El trabajo se implementa primero en la versión modularizada y luego se refleja en el monolito para mantener la paridad de artefactos.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "1.6", "1.9"] },
    { "id": 3, "tasks": ["1.7", "1.8", "1.10", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "5.1"] },
    { "id": 6, "tasks": ["5.2", "6.1"] }
  ]
}
```
