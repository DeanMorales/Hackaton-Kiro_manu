# Implementation Plan: modular-architecture-migration

## Overview

Convertir `torre-de-las-nubes.html` (HTML+CSS+JS inline en IIFE) en una app servida por Vite, con el mismo HTML/CSS y el JavaScript dividido en ES modules bajo `src/` (`data/`, `audio/`, `engine/`, `combat/`, `render/`, `ui/`, `main.js`). Cada función se traslada literalmente desde el monolito: mismo cuerpo, mismas fórmulas, mismo orden de efectos secundarios. Las tareas siguen el orden de dependencias del grafo de módulos (`data`/`audio` primero, `engine`/`combat`/`render`/`ui` después, `main.js` al final) para poder validar cada pieza pura con property-based tests antes de conectarlas.

Lenguaje de implementación: **JavaScript vanilla (ES6+)**, ya fijado por el design document (sin pseudocódigo). Test runner: **Vitest**. Property-based testing: **fast-check**.

## Tasks

- [x] 1. Set up project structure and Vite build configuration
  - [x] 1.1 Initialize `package.json` and Vite configuration
    - Crear `package.json` con Vite declarado exclusivamente en `devDependencies`, sin `dependencies` de runtime nuevas
    - Agregar scripts `dev` (servidor de desarrollo Vite) y `build` (build de producción)
    - Agregar Vitest y fast-check como `devDependencies` para las tareas de testing posteriores
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.3, 8.4_

  - [x] 1.2 Create `src/` module skeleton and update `index.html` entry point
    - Crear los directorios `src/data/`, `src/audio/`, `src/engine/`, `src/combat/`, `src/render/`, `src/ui/` y el archivo `src/main.js` (vacío o con stub inicial)
    - Copiar literalmente el `<body>` y el `<style>` (incluyendo variables CSS, `clip-path`, animaciones, media queries y el `<link>` de Google Fonts Cinzel/Space Grotesk) del `Monolith_File` a `index.html`
    - Reemplazar el `<script>` inline por `<script type="module" src="/src/main.js"></script>`
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1_

- [x] 2. Implement Data_Module
  - [x] 2.1 Implement `src/data/services.js`
    - Trasladar literalmente `AWS_SERVICES`, `QUESTIONS`, `BOSS_NAMES`, `shuffle` y `pickQuestion` desde el monolito, exportados con `export`
    - Incluir el comentario de encabezado `/* ===== DATA: ... ===== */`
    - Sin acceso a DOM, canvas ni Web Audio API
    - _Requirements: 1.3, 1.10, 3.2, 5.1, 5.2, 5.4_

  - [ ]* 2.2 Write property test for Data_Module question selection
    - **Property 2: Selección de preguntas preserva el banco y el índice correcto, respetando el reintento de `avoidText`**
    - **Validates: Requirements 1.3, 1.10**
    - Usar fast-check con `serviceId` tomados de `AWS_SERVICES` reales y `avoidText` arbitrario (coincidente y no coincidente); mockear `Math.random` de forma determinista dentro del test sin alterar la firma pública de `pickQuestion`

  - [ ]* 2.3 Write unit test for `avoidText` retry exhaustion
    - Caso concreto donde el banco de un servicio tiene más de una pregunta y `avoidText` coincide repetidamente, verificando el límite de 8 reintentos
    - _Requirements: 1.10_

- [  ] 3. Implement Audio_Module
  - [x] 3.1 Implement `src/audio/sfx.js`
    - Trasladar literalmente `beep()` (no exportada) y el objeto `sfx` (`place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`) desde el monolito
    - Incluir el comentario de encabezado `/* ===== AUDIO: ... ===== */`
    - Sin dependencias de ningún otro módulo de `src/`
    - _Requirements: 3.7, 5.1, 5.4_

  - [ ]* 3.2 Write unit test for graceful audio failure
    - Simular que `AudioContext`/`webkitAudioContext` no existen o lanzan excepción y verificar que `sfx.*` no interrumpe la ejecución (try/catch silencioso preservado)
    - _Requirements: 7.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Engine_Module pure physics functions
  - [x] 5.1 Implement `computeOverlap`, `computeNewFloor`, `decidesFall`, `easeOutQuad`
    - Extraer literalmente las fórmulas equivalentes del monolito como funciones puras exportadas en `src/engine/tower.js`
    - Incluir el comentario de encabezado `/* ===== ENGINE: ... ===== */` y las constantes `DOOR_INTERVAL`, `BASE_WIDTH`, `MIN_WIDTH`
    - _Requirements: 1.2, 3.3, 5.2, 5.4_

  - [ ]* 5.2 Write property test for block placement/fall formulas
    - **Property 1: Colocación/caída de bloque preserva las fórmulas del monolito**
    - **Validates: Requirements 1.2**
    - Generar `prevFloor`/`movingBlock` arbitrarios con fast-check (posición y ancho arbitrarios) y verificar `computeOverlap`, `decidesFall` (umbral 16) y `computeNewFloor` (x/width resultantes)

- [ ] 6. Implement Engine_Module state and mutators
  - [x] 6.1 Implement `createTowerState`, `topFloor`, `newMovingBlock`, `resetGame`, `updateDoorCounter`, `dropBlock`, `triggerFall`, `update`
    - Trasladar literalmente la lógica de mutación de `state` del monolito, parametrizada por `width`/`height` en vez de globals
    - `dropBlock` retorna un descriptor (`{type:'placed', ...}` o `{type:'fell'}`) en vez de tocar DOM/audio directamente
    - _Requirements: 1.1, 1.9, 3.3_

  - [ ]* 6.2 Write property test for fall reporting the reached floor number
    - **Property 6: Fallar el encaje de un bloque siempre reporta el número de piso alcanzado en ese momento**
    - **Validates: Requirements 1.9**
    - Generar cantidades arbitrarias de pisos ya construidos y verificar que, cuando `dropBlock` decide caída, el descriptor indica `floors.length - 1`, `knight.falling = true` y `screen = 'falling'`

  - [ ]* 6.3 Write unit tests for `resetGame`/`createTowerState` and `updateDoorCounter`
    - Verificar que el piso base usa `BASE_WIDTH`/`MIN_WIDTH` esperados
    - Verificar el caso límite `placed === 0` de `updateDoorCounter`
    - _Requirements: 1.1_

- [ ] 7. Implement Combat_Module boss fight setup
  - [x] 7.1 Implement `startBossFight`
    - Trasladar literalmente el cálculo de `cardCount = min(level, 4)`, `playerPips`/`bossPips` y `bossLabel` con `BOSS_NAMES` en `src/combat/fight.js`
    - Incluir el comentario de encabezado `/* ===== COMBAT: ... ===== */`
    - _Requirements: 1.4, 3.4, 5.4_

  - [ ]* 7.2 Write property test for boss fight configuration by level
    - **Property 3: Configuración de combate depende solo del nivel, con el mismo clamping a 4**
    - **Validates: Requirements 1.4**
    - Generar niveles enteros arbitrarios `>= 1` con fast-check y verificar `cardCount`, `playerPips`/`bossPips` y el nombre de guardián resultante

- [ ] 8. Implement Combat_Module answer resolution
  - [x] 8.1 Implement `answerCard` and `refreshCardQuestion`
    - Trasladar literalmente la lógica de mutación de `fight.playerPips`/`fight.bossPips`/`locked` y el clamping a cero, retornando descriptores (`{correct, resolved, outcome}`) en vez de tocar DOM/audio
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 3.4_

  - [ ]* 8.2 Write property test for pip reduction on answer
    - **Property 4: Responder una carta reduce en uno los pips del bando correspondiente**
    - **Validates: Requirements 1.5, 1.6**
    - Generar estados de combate arbitrarios (pips entre 0 y `cardCount`) y resultados correcto/incorrecto arbitrarios con fast-check; verificar reducción de exactamente uno con límite inferior de cero

  - [ ]* 8.3 Write property test for win/lose resolution
    - **Property 5: El combate se resuelve como victoria o derrota exactamente cuando el pip correspondiente llega a cero**
    - **Validates: Requirements 1.7, 1.8**
    - Generar secuencias arbitrarias de respuestas con fast-check y verificar `resolved`/`outcome` y los efectos esperados (`doorsPassed`, `screen`, `knight.falling`)

  - [ ]* 8.4 Write unit test for a full 1-card combat sequence
    - Ejercitar `startBossFight(1)` hasta victoria y hasta derrota como casos concretos
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Render_Module drawing primitives and orchestrator
  - [x] 10.1 Implement `elevToScreen`, `drawSky`, `drawCloud`, `seededRand`, `drawFacetedBlock`, `drawTorch`
    - Trasladar literalmente cada función de dibujo a `src/render/draw.js`, recibiendo `ctx`/dimensiones/estado como parámetros explícitos en vez de closures
    - Incluir el comentario de encabezado `/* ===== RENDER: ... ===== */`
    - _Requirements: 2.3, 3.5, 5.4_

  - [x] 10.2 Implement `drawTower`, `drawMovingBlock`, `drawKnight`, and `render` orchestrator
    - Trasladar literalmente estas funciones, preservando el mismo z-order (`drawSky` → `drawTower` → `drawMovingBlock` → `drawKnight`) que el monolito
    - _Requirements: 2.3, 3.5_

  - [ ]* 10.3 Write property test for render trace parity vs frozen monolith fixture
    - **Property 7: El Render_Module produce la misma secuencia de operaciones de dibujo que las funciones equivalentes del monolito**
    - **Validates: Requirements 2.3**
    - Crear un fixture de test (no en `src/`) con copias congeladas de las funciones de dibujo del monolito como oráculo
    - Generar estados de juego arbitrarios con fast-check (pisos, bloque en movimiento, caballero, nubes, elevación de cámara) y comparar, usando un mock de `CanvasRenderingContext2D` que registra llamadas, la traza de `render()` del nuevo módulo contra la traza del oráculo

- [ ] 11. Implement UI_Module
  - [x] 11.1 Implement `updateHud`, screen show/hide, `renderPips`, `renderCards`, `renderCardBack`, `showBanner`, `bindInputHandlers`, `showIncompatibilityMessage`
    - Trasladar literalmente la manipulación de DOM de overlays/HUD del monolito a `src/ui/screens.js`, recibiendo callbacks y datos ya calculados en vez de importar `Engine_Module`/`Combat_Module`
    - Incluir el comentario de encabezado `/* ===== UI: ... ===== */`
    - Agregar `showIncompatibilityMessage(reason)` para el mensaje visible de navegador no compatible (Requirement 7.5)
    - _Requirements: 2.1, 3.6, 5.1, 5.3, 5.4, 7.5_

  - [ ]* 11.2 Write unit tests for `renderCards`/`renderPips` output and incompatibility message
    - Verificar número correcto de elementos DOM y clases esperadas
    - Verificar que `showIncompatibilityMessage` reemplaza el overlay de inicio con el mensaje visible
    - _Requirements: 2.1, 7.5_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement Main_Module and wire the application
  - [x] 13.1 Implement `src/main.js`
    - Inicializar canvas/`ctx`, `resize()`, verificación de compatibilidad (Canvas 2D y Web Audio) al arrancar, mostrando `ui.showIncompatibilityMessage` si falta Canvas 2D
    - Implementar `onDrop`, `onCardClick`, `onAnswer` y `loop(ts)`, interpretando los descriptores de `engine`/`combat` para disparar `sfx.*` y `ui.*` en el mismo orden que el monolito
    - Conectar `ui.bindInputHandlers`, `window.addEventListener('resize', resize)` y `requestAnimationFrame(loop)`
    - Incluir el comentario de encabezado `/* ===== MAIN: ... ===== */`
    - _Requirements: 1.1, 3.8, 3.9, 7.5_

  - [ ]* 13.2 Write unit test for incompatibility fallback
    - Mockear ausencia de `canvas.getContext('2d')` y verificar que se muestra el mensaje visible en vez de continuar la inicialización del juego
    - _Requirements: 7.5_

  - [ ]* 13.3 Write DOM/CSS diff snapshot test
    - Comparar el `<body>`/`<style>` de `index.html` contra los bloques equivalentes del `Monolith_File` (`torre-de-las-nubes.html`)
    - _Requirements: 2.1, 2.2, 2.4_

- [ ] 14. Add static architecture and dependency safeguards
  - [x] 14.1 Add circular-import check script
    - Agregar un script npm (por ejemplo usando `madge --circular` o un chequeo equivalente del grafo de imports) sobre `src/main.js`
    - _Requirements: 3.9_

  - [ ]* 14.2 Write test verifying absence of circular imports
    - Ejecutar el chequeo de imports circulares como parte de la suite de tests y fallar si se detecta algún ciclo entre `data/`, `audio/`, `engine/`, `combat/`, `render/`, `ui/`, `main.js`
    - _Requirements: 3.9_

  - [ ]* 14.3 Write test verifying naming and comment conventions
    - Verificar que cada módulo de `src/` incluye su comentario de encabezado `/* ===== ... ===== */`, que las constantes de datos/configuración usan MAYÚSCULAS_CON_GUION_BAJO, y que los ids/clases DOM referenciados usan kebab-case
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 14.4 Write test verifying absence of TypeScript/UI framework artifacts
    - Verificar ausencia de archivos `.ts`/`.tsx` y `tsconfig.json`, ausencia de paquetes de frameworks UI/gestión de estado en `package.json`, y ausencia de imports que los referencien en `src/`
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 15. Add build verification tests
  - [ ]* 15.1 Write build smoke test
    - Ejecutar `vite build` mediante el test runner y verificar código de salida 0 y que `dist/` contiene `index.html` y assets JS/CSS
    - _Requirements: 4.2, 4.5, 4.6_

  - [ ]* 15.2 Write build failure smoke test
    - Introducir deliberadamente un import roto en una copia de prueba del proyecto y verificar que `vite build` termina con código de salida distinto de cero y sin `dist/` completo
    - _Requirements: 4.5_

  - [ ]* 15.3 Write dev/preview server smoke test
    - Iniciar `vite` (o `vite preview` sobre el build) y confirmar que responde HTTP 200 en la ruta raíz
    - _Requirements: 4.1, 4.6_

- [ ] 16. Update project documentation
  - [x] 16.1 Update `README.md`
    - Documentar prerrequisitos (Node.js y gestor de paquetes), instalación de dependencias, comando de desarrollo, comando de build de producción y método para servir/previsualizar el build
    - Documentar que abrir `torre-de-las-nubes.html` con doble clic deja de estar soportado, indicando las dos rutas válidas de ejecución (dev server o build + servidor de archivos estáticos)
    - Documentar la versión mínima de Node.js requerida
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP, though they cover the correctness properties and behavior-parity guarantees central to this migration.
- Property tests (Properties 1-7) validate the pure logic extracted from the monolith (`engine/tower.js`, `data/services.js`, `combat/fight.js`) and the render trace parity (`render/draw.js`); unit/smoke tests cover concrete integration points, DOM wiring, and build tooling.
- Each property test tags its property number and validated requirement clauses per the design's Testing Strategy (fast-check, minimum 100 runs, tag format `Feature: modular-architecture-migration, Property {N}: {title}`).
- `src/engine/tower.js`, `src/combat/fight.js`, and `src/render/draw.js` are each written in two passes (pure/primitive functions first, then state/orchestration on top) to keep tasks small and let the corresponding property tests run as early as possible.
- Cross-browser verification (Requirements 7.3, 7.4) is manual/out of scope for this task list, per the design's Testing Strategy, and is not included as an automated coding task.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1", "7.1", "10.1", "11.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "5.2", "6.1", "7.2", "8.1", "10.2", "11.2"] },
    { "id": 3, "tasks": ["6.2", "6.3", "8.2", "8.3", "8.4", "10.3", "13.1"] },
    { "id": 4, "tasks": ["13.2", "13.3", "14.1", "16.1"] },
    { "id": 5, "tasks": ["14.2", "14.3", "14.4", "15.1", "15.2", "15.3"] }
  ]
}
```
