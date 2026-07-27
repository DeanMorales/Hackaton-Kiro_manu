# Implementation Plan: Milestone Celebration Feedback

## Overview

Implementación del sistema de feedback visual y sonoro para hitos del jugador en "Torre de las Nubes". El plan crea dos módulos nuevos (`src/audio/milestoneSfx.js` y `src/ui/celebration.js`) y los integra en `src/main.js`, siguiendo los mismos patrones de `combatSfx.js` y `sfx.js`. Vitest + jsdom + fast-check ya están disponibles (`npm test`).

## Tasks

- [x] 1. Crear `src/audio/milestoneSfx.js` — capa pura y precarga

  - [x] 1.1 Crear el módulo con las constantes de rutas y la función pura exportada `selectMilestoneSound(floorNumber)`
    - Crear `src/audio/milestoneSfx.js` con la función exportada `selectMilestoneSound(n)`:
      - `n % 30 === 0` → retorna `'epic'`
      - `n % 15 === 0 && n % 30 !== 0` → retorna `'milestone'`
      - cualquier otro caso → retorna `'none'`
    - Exportar también la función pura `computeEffectiveVolume(volumePercent, muted)` → `muted ? 0 : volumePercent / 100`
    - _Requirements: 3.1, 3.3, 4.1, 4.3, 5.3, 3.5, 4.5_

  - [x]* 1.2 Escribir property tests para `selectMilestoneSound` — Propiedades 4, 5 y 6
    - **Property 4: Sound selection — multiples of 30** — `fc.integer({min:1,max:333}).map(n=>n*30)` → retorna `'epic'`
    - **Validates: Requirements 3.1, 3.3, 4.3**
    - **Property 5: Sound selection — multiples of 15 (not 30)** — enteros donde `n%15===0 && n%30!==0` → retorna `'milestone'`
    - **Validates: Requirement 4.1**
    - **Property 6: Sound selection — non-multiples of 15** — enteros donde `n%15!==0` → retorna `'none'`
    - **Validates: Requirement 5.3**
    - Archivo: `src/audio/milestoneSfx.test.js`

  - [x]* 1.3 Escribir property test para `computeEffectiveVolume` — Propiedad 7
    - **Property 7: Volume application** — para `v` en `[0,100]` y `m: boolean`, retorna `m ? 0 : v/100`
    - **Validates: Requirements 3.5, 4.5, 6.5**
    - Archivo: `src/audio/milestoneSfx.test.js`

  - [x] 1.4 Añadir precarga de los dos archivos MP3 y el objeto exportado `milestoneSfx`
    - Crear un `PRELOADED` Map con precarga de `epic_ congratulations_30.mp3` y `every_10_floors.mp3` siguiendo exactamente el patrón IIFE de `sfx.js` (ruta `/audio/sonidosUI/<filename>`, `preload = 'auto'`, `addEventListener('error', ()=>{})`, wrapped en `try/catch`)
    - Implementar `milestoneSfx.init(getVolCtx)` que almacena el callback internamente
    - Implementar `milestoneSfx.playMilestoneAudio(floorNumber)`:
      - Llama a `selectMilestoneSound(floorNumber)` para decidir qué sonido (o silencio)
      - Obtiene el contexto de volumen vía `getVolCtx()` si está disponible, o usa `{volume:1, muted:false}` como fallback
      - Calcula el volumen efectivo con `computeEffectiveVolume`
      - Crea un nuevo `Audio` (cloneNode del PRELOADED correspondiente si existe), asigna volumen, y llama a `.play()` con `.catch(err => console.error(...))`
      - Todos los errores de carga/reproducción → `console.error` + degradación silenciosa, nunca propaga
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 3.4, 4.4_

  - [x]* 1.5 Escribir unit tests para `milestoneSfx` (precarga y manejo de errores)
    - Caso: `milestoneSfx.init()` + `PRELOADED` tiene entradas para ambos archivos MP3
    - Caso: audio falla en `.play()` → `console.error` llamado, sin excepción propagada (mock de `Audio` que rechaza `.play()`)
    - Caso: `playMilestoneAudio` con piso no múltiplo de 15 → ningún `Audio` es instanciado para reproducción
    - Archivo: `src/audio/milestoneSfx.test.js`
    - _Requirements: 6.1, 6.2, 3.4, 4.4_

- [x] 2. Crear `src/ui/celebration.js` — funciones puras

  - [x] 2.1 Crear el módulo con las constantes y la función pura exportada `generateParticles(screenWidth)`
    - Crear `src/ui/celebration.js` con las constantes exportadas:
      ```js
      export const CONFETTI_COLORS = ['#ff9f2e','#d9b34d','#3fa1a1','#59c27a','#e2493a','#f3ecd8','#6b4226'];
      export const PARTICLE_COUNT_MIN = 80;
      export const PARTICLE_COUNT_MAX = 150;
      export const SPEED_MIN = 2;
      export const SPEED_MAX = 6;
      export const CONFETTI_DURATION_MS = 3500;
      export const FLOOR_MSG_DURATION_MS = 2400;
      ```
    - Implementar y exportar `generateParticles(screenWidth)` que retorna un array de objetos `Particle` con:
      - `length` en `[PARTICLE_COUNT_MIN, PARTICLE_COUNT_MAX]`
      - `x` en `[0, screenWidth]`, `y` negativo (fuera del viewport)
      - `speed` en `[SPEED_MIN, SPEED_MAX]`, `color` de `CONFETTI_COLORS`
      - `rotation`, `rotSpeed` aleatorios, `width` en `[6,14]`, `height` en `[8,18]`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x]* 2.2 Escribir property tests para `generateParticles` — Propiedades 1 y 2
    - **Property 1: Particle count within bounds** — para `w` en `[100, 4000]`, `particles.length` en `[80, 150]`
    - **Validates: Requirement 1.2**
    - **Property 2: Particle speed and color invariants** — cada partícula: `speed∈[2,6]`, `color∈CONFETTI_COLORS`, `x∈[0,w]`
    - **Validates: Requirements 1.3, 1.4**
    - Archivo: `src/ui/celebration.test.js`

  - [x] 2.3 Implementar y exportar `buildFloorMessageElement(floorNumber)`
    - Retorna un `<div>` con `textContent === \`PISO \${floorNumber}\``
    - Aplica inline styles: `font-family: var(--font-display)`, `font-size: 64px`, `color: var(--gold)`, `position: fixed`, `top: 50%`, `left: 50%`, `transform: translate(-50%, -50%)`, `z-index: 25`, `text-align: center`, `pointer-events: none`
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x]* 2.4 Escribir property test para `buildFloorMessageElement` — Propiedad 3
    - **Property 3: Floor message text encoding** — para `N` entero positivo, `el.textContent === \`PISO \${N}\``
    - **Validates: Requirement 2.1**
    - Archivo: `src/ui/celebration.test.js`

- [x] 3. Checkpoint — Ejecutar `npm test` y asegurarse de que todos los tests pasan

  - Ejecutar `npm test` (vitest run). Corregir cualquier error antes de continuar.

- [x] 4. Implementar la función principal `showMilestoneCelebration` y el motor de confeti

  - [x] 4.1 Implementar la función interna `prefersReducedMotion()` y el overlay de confeti
    - Implementar `prefersReducedMotion()` con try/catch (retorna `false` en entornos sin `matchMedia`)
    - Implementar `createConfettiOverlay()`: crea un `<canvas>` con `position:fixed; inset:0; width:100%; height:100%; z-index:15; pointer-events:none` y lo añade a `document.body`
    - Implementar `removeConfettiOverlay()`: busca y elimina el canvas del DOM
    - _Requirements: 1.1, 1.5, 1.6_

  - [x] 4.2 Implementar el loop RAF `animateConfetti(canvas, particles, startTime)` con limpieza automática
    - En cada frame: limpiar el canvas, actualizar `y += speed`, `rotation += rotSpeed` de cada partícula, dibujar cada partícula como un rectángulo rotado con su color
    - Detener y llamar `removeConfettiOverlay()` cuando `Date.now() - startTime >= CONFETTI_DURATION_MS`
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 4.3 Implementar `createFloorMessage(floorNumber)` y `removeFloorMessage()` con setTimeout
    - `createFloorMessage(floorNumber)`: usa `buildFloorMessageElement(floorNumber)`, añade el elemento a `document.body`, programa `removeFloorMessage()` con `setTimeout(..., FLOOR_MSG_DURATION_MS)`
    - `removeFloorMessage()`: busca y elimina el div de Floor_Message del DOM
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.4 Implementar y exportar `showMilestoneCelebration(floorNumber)`
    - Orquesta los tres efectos en paralelo de forma no bloqueante (sin await):
      1. Si no `prefersReducedMotion()`: crea el canvas, genera partículas con `screenWidth = window.innerWidth`, inicia `animateConfetti`
      2. Llama a `createFloorMessage(floorNumber)`
    - Nota: la llamada de audio se hace desde `main.js`, no desde aquí
    - _Requirements: 1.1, 1.6, 2.1, 5.4_

  - [x]* 4.5 Escribir unit tests para `showMilestoneCelebration` (DOM + timers)
    - Caso: con `prefers-reduced-motion: reduce` → no se crea ningún canvas en el DOM
    - Caso: el div Floor_Message tiene `z-index` numérico mayor que 15 (Confetti_Overlay) y menor que 100 (`#bossScreen`)
    - Caso: el div Floor_Message usa `font-family` con `var(--font-display)` y `font-size` >= `48px`
    - Caso: tras `FLOOR_MSG_DURATION_MS` (con `vi.useFakeTimers()`), el div Floor_Message ya no está en el DOM
    - Caso: tras `CONFETTI_DURATION_MS` de RAF simulado, el canvas ya no está en el DOM
    - Archivo: `src/ui/celebration.test.js`
    - _Requirements: 1.5, 1.6, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Integrar ambos módulos en `src/main.js`

  - [x] 5.1 Añadir los imports y la llamada a `milestoneSfx.init(...)` en la inicialización
    - Añadir al bloque de imports en `src/main.js`:
      ```js
      import { showMilestoneCelebration } from './ui/celebration.js';
      import { milestoneSfx } from './audio/milestoneSfx.js';
      ```
    - Añadir junto a `combatSfx.init()` en la sección de inicialización:
      ```js
      milestoneSfx.init(() => ({ volume: music.getEffectiveVolumePercent() / 100, muted: music.isMuted() }));
      ```
    - _Requirements: 6.4, 6.5_

  - [x] 5.2 Modificar `endFight(won)` para activar la celebración tras victoria
    - En la rama `if (won)` de `endFight`, antes de `gameState.doorsPassed += 1`, añadir:
      ```js
      const floorNumber = gameState.floors.length - 1;
      showMilestoneCelebration(floorNumber);
      milestoneSfx.playMilestoneAudio(floorNumber);
      ```
    - Verificar que la rama `else` de `endFight` (derrota) no llama a ninguna de las dos funciones nuevas
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 3.2, 4.2_

  - [x]* 5.3 Escribir unit tests de integración para `endFight`
    - Caso: `endFight(false)` no llama a `showMilestoneCelebration` ni a `milestoneSfx.playMilestoneAudio` (spies)
    - Caso: `endFight(true)` llama a ambas funciones con `gameState.floors.length - 1` como argumento
    - Archivo: `src/main.test.js` (ya existe en el proyecto)
    - _Requirements: 5.1, 5.2_

- [x] 6. Checkpoint final — Ejecutar `npm test` y verificar cobertura completa

  - Ejecutar `npm test`. Todos los tests nuevos y existentes deben pasar. Corregir cualquier fallo antes de cerrar.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para una MVP más rápida, pero cubren las 7 propiedades del design.md y los casos de borde críticos.
- El runner de tests es **vitest** con entorno **jsdom** (`npm test` ejecuta `vitest run`). fast-check ya está instalado como devDependency.
- `showMilestoneCelebration` no llama a `milestoneSfx.playMilestoneAudio`; ambas llamadas van en `endFight(true)` en `main.js` para mantener la separación de responsabilidades del design.
- Los archivos MP3 ya existen en `public/audio/sonidosUI/`; la ruta de acceso desde código es `/audio/sonidosUI/<filename>`.
- El canvas del confeti (z-index 15) y el div Floor_Message (z-index 25) son creados/destruidos dinámicamente; no hay markup estático que añadir a `index.html`.
- `prefersReducedMotion()` suprime el confeti pero **no** el Floor_Message ni el audio (Requisito 1.6).
- Cada tarea puede ser ejecutada de forma autónoma por un agente de código: todos los archivos de contexto (`requirements.md`, `design.md`) están disponibles en `.kiro/specs/milestone-celebration-feedback/`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3"] },
    { "id": 2, "tasks": ["1.4", "2.4", "4.1"] },
    { "id": 3, "tasks": ["1.5", "4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4"] },
    { "id": 5, "tasks": ["4.5", "5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["5.3"] }
  ]
}
```
