# Implementation Plan: Tower Ground & Biome Background

## Overview

Este plan implementa las dos mejoras visuales descritas en `design.md`, en el siguiente orden de dependencias: primero el nuevo módulo de datos sin estado de motor ni de render (`src/data/environmentRoster.js`, con sus catálogos y sus dos pares de funciones de selección pura/con-estado), luego su integración en `src/engine/tower.js` (`createTowerState`/`resetGame`), después la extensión del `Environment_Renderer` (`drawSky`) y la nueva función `drawGround` (`Ground_Visual`) en `src/render/draw.js`, y por último su cableado conjunto dentro de `render()`. La verificación final confirma los invariantes globales de la feature (ausencia de assets de imagen, no interferencia con combate/física) sin introducir nuevas superficies de implementación. Cada Correctness Property del diseño se implementa como una prueba de propiedad (fast-check, mínimo 100 iteraciones salvo donde se indique lo contrario) ubicada junto a la implementación que valida.

Todo el código se escribe en JavaScript (ES modules), siguiendo las convenciones ya presentes en `src/` (sin TypeScript, sin frameworks adicionales), y usando **vitest** + **fast-check** + **jsdom**, ya presentes en `devDependencies`.

## Tasks

- [x] 1. Implementar `src/data/environmentRoster.js` (nuevo)
  - [x] 1.1 Definir `BIOME_CATALOG` con las 5 entradas (Tundra, Sabana, Desierto, Bosque_Templado, Taiga), cada una con `id`, `displayName`, `hillColor`, `groundColors` (`[claro, oscuro]`) y `vegetationCue`, en el orden exacto de catálogo
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 1.2 Definir `TIME_OF_DAY_CATALOG` con las 4 entradas (Mañana, Día, Tarde, Noche), cada una con `id`, `displayName`, `skyGradientStops`, `starVisibility`, `cloudColor` y `sunMoonCue`, en el orden exacto de catálogo
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 1.3 Implementar las funciones puras `selectBiome(sessionsStarted)` y `selectTimeOfDay(sessionsStarted)`, replicando exactamente el patrón fijo-luego-aleatorio de `selectBoss` (`src/data/bossRoster.js`) sobre cada catálogo
    - _Requirements: 4.1, 4.2, 5.1, 5.2_
  - [x]* 1.4 Escribir prueba de propiedad para la rotación determinística de ambos catálogos
    - **Property 1: Rotación determinística en las primeras sesiones de cada catálogo**
    - **Validates: Requirements 4.1, 5.1**
  - [x]* 1.5 Escribir prueba de propiedad para la rotación aleatoria con repetición de ambos catálogos
    - **Property 2: Rotación aleatoria con repetición fuera del rango fijo**
    - **Validates: Requirements 4.2, 5.2**
  - [x] 1.6 Implementar los wrappers con estado `nextBiomeForSession()`/`nextTimeOfDayForSession()`, dueños de los dos contadores en memoria a nivel de módulo (`biomeSessionCounter`, `timeOfDaySessionCounter`), incrementándolos internamente en exactamente 1 por invocación, sin que ninguna función exportada del módulo los reinicie (solo la reinstanciación del módulo los reinicia)
    - _Requirements: 4.3, 4.4, 5.3, 5.4, 9.1, 9.2, 9.3_
  - [x]* 1.7 Escribir prueba de propiedad para la independencia entre ambas rotaciones
    - **Property 3: Independencia entre Biome_Rotation y Time_Of_Day_Rotation**
    - **Validates: Requirements 4.3, 4.4, 5.3, 5.4, 5.5**
  - [x]* 1.8 Escribir pruebas unitarias de los catálogos y las selecciones puras
    - `BIOME_CATALOG` tiene exactamente 5 entradas en el orden Tundra, Sabana, Desierto, Bosque_Templado, Taiga; `TIME_OF_DAY_CATALOG` tiene exactamente 4 entradas en el orden Mañana, Día, Tarde, Noche.
    - Ninguna pareja de entradas de `BIOME_CATALOG` comparte la misma combinación de `hillColor`+`groundColors`+`vegetationCue`, y ninguna pareja de entradas de `TIME_OF_DAY_CATALOG` comparte la misma combinación de `skyGradientStops`+`starVisibility`+`sunMoonCue`.
    - La entrada `Desierto` tiene `vegetationCue === 'none'`; la entrada `Noche` tiene `starVisibility === true` y las otras tres tienen `starVisibility === false`; `Bosque_Templado` y `Taiga` tienen `vegetationCue` distintos entre sí.
    - `selectBiome(0)` .. `selectBiome(4)` devuelven respectivamente Tundra .. Taiga; `selectTimeOfDay(0)` .. `selectTimeOfDay(3)` devuelven respectivamente Mañana .. Noche.
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 4.1, 5.1, 8.3, 8.5_

- [x] 2. Checkpoint — módulo de datos completo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Integrar la selección de Active_Biome/Active_Time_Of_Day en `src/engine/tower.js`
  - [x] 3.1 Modificar `createTowerState(width, height)` para importar y llamar una vez a `nextBiomeForSession()`/`nextTimeOfDayForSession()`, almacenando los resultados como `activeBiome`/`activeTimeOfDay` en el estado devuelto
    - _Requirements: 6.1_
  - [x] 3.2 Modificar `resetGame(state, width, height)` para llamar una vez a `nextBiomeForSession()`/`nextTimeOfDayForSession()`, reemplazando `state.activeBiome`/`state.activeTimeOfDay`
    - _Requirements: 6.1, 6.4_
  - [x]* 3.3 Escribir prueba de propiedad para la inmutabilidad de Active_Biome/Active_Time_Of_Day durante la sesión
    - **Property 4: Inmutabilidad de Active_Biome y Active_Time_Of_Day durante la sesión**
    - **Validates: Requirements 6.2, 6.3**
  - [x]* 3.4 Escribir pruebas unitarias de la integración en el motor
    - `createTowerState` devuelve un objeto con `activeBiome` igual a una entrada de `BIOME_CATALOG` y `activeTimeOfDay` igual a una entrada de `TIME_OF_DAY_CATALOG`.
    - Llamar `resetGame` dos veces sucesivas sobre el mismo `state` re-invoca la selección (reemplaza ambos campos).
    - _Requirements: 6.1, 6.4_

- [x] 4. Checkpoint — integración en el motor completa
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Extender `drawSky` en `src/render/draw.js` para leer Active_Biome/Active_Time_Of_Day (Environment_Renderer)
  - [x] 5.1 Cambiar la firma a `drawSky(ctx, W, H, clouds, activeBiome, activeTimeOfDay)`; sustituir los stops de gradiente fijos por `activeTimeOfDay.skyGradientStops`, la condición del bucle de estrellas por `if (activeTimeOfDay.starVisibility)`, el `fillStyle` de las nubes por `activeTimeOfDay.cloudColor`, y el `fillStyle` de las colinas por `activeBiome.hillColor`, preservando exactamente el algoritmo/forma de dibujo existente (dirección del gradiente, fórmula de grilla de estrellas, fórmula de parallax de nubes, silueta senoidal de colinas)
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.3, 3.4, 7.1, 7.2, 7.4_
  - [x] 5.2 Implementar el nuevo helper `drawSunMoonCue(ctx, W, H, cue)`, invocado desde `drawSky`, dibujando un resplandor de gradiente radial más un círculo sólido en `cue.xRatio`/`cue.yRatio` usando `cue.color`/`cue.radius`
    - _Requirements: 3.4_
  - [x]* 5.3 Escribir pruebas unitarias de `drawSky`
    - `drawSky` no lanza para ninguna de las 5×4 combinaciones de `BIOME_CATALOG`×`TIME_OF_DAY_CATALOG`, usando un `ctx` mockeado (spies de `createLinearGradient`, `createRadialGradient`, `fillRect`, `beginPath`, `arc`, `fill`, `moveTo`, `lineTo`, `closePath`).
    - Cuando `activeTimeOfDay` es Noche, el bucle de dibujo de estrellas se ejecuta (se invoca `fillRect` para las estrellas); cuando es Mañana/Día/Tarde, no se ejecuta.
    - _Requirements: 3.3, 3.4_

- [x] 6. Implementar `Ground_Visual`: nueva función `drawGround` en `src/render/draw.js`
  - [x] 6.1 Implementar `drawGround(ctx, W, H, camElev, baseFloor, activeBiome)`: calcular `bandTop` vía `elevToScreen(camElev, baseFloor.bottom, H)` acotado a `H`, retornar sin dibujar (`no-op`) si `!baseFloor` o `bandTop >= H`, y rellenar un rectángulo con gradiente lineal desde `bandTop` hasta `H`, abarcando todo el ancho `W`, usando `activeBiome.groundColors`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 6.2 Implementar los helpers `drawVegetationCues(ctx, W, bandTop, H, cue)` y `drawVegetationCue(ctx, x, y, cue, seed)`: no-op para `'none'`, y formas low-poly distintas para `'dryGrassTufts'`, `'bushes'` y `'conifers'` (cada una visualmente distinta entre sí, consistente con el estilo low-poly ya usado por `drawFacetedBlock`)
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  - [x]* 6.3 Escribir prueba de propiedad para la cobertura del Ground_Visual
    - **Property 5: El Ground_Visual siempre cubre todo el ancho hasta el borde inferior del canvas**
    - **Validates: Requirements 1.3**
  - [x]* 6.4 Escribir pruebas unitarias de `drawGround`
    - `drawGround` es un no-op (no lanza, no invoca `fillRect`) cuando `baseFloor` es `undefined`/`null`.
    - `drawGround` es un no-op cuando el `bandTop` calculado es `>= H` (base floor fuera de vista, scrolleado).
    - `drawGround` no lanza para cada una de las 5 entradas de `BIOME_CATALOG`, usando un `ctx` mockeado.
    - _Requirements: 1.1, 1.2_

- [x] 7. Integrar `drawGround` y los nuevos parámetros de `drawSky` en `render()`
  - [x] 7.1 Modificar `render(ctx, W, H, gameState, combatUiState)` para invocar `drawSky(ctx, W, H, gameState.clouds, gameState.activeBiome, gameState.activeTimeOfDay)` y luego `drawGround(ctx, W, H, gameState.camElev, gameState.floors[0], gameState.activeBiome)` antes de `drawTower(...)`, sin modificar `drawTower`/`drawMovingBlock`/`drawKnight`/el bloque de `bossFightRender`
    - _Requirements: 1.1, 1.4, 7.1, 7.3_
  - [x]* 7.2 Escribir pruebas unitarias de la integración en `render()`
    - `render(ctx, W, H, gameState, null)` no lanza para `gameState.screen` en `'build'`, `'boss'`, `'falling'` (`ctx` mockeado, `gameState` construido vía `createTowerState`).
    - El efecto de `drawGround` (mockeado/spy) se invoca antes que el efecto de `drawTower` dentro de una misma llamada a `render()`.
    - _Requirements: 1.1, 1.4_

- [x] 8. Checkpoint — integración de render completa
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Verificar los invariantes globales de la feature (sin nuevas superficies de implementación)
  - [x]* 9.1 Escribir prueba estática (no generativa) de ausencia de carga de assets de imagen
    - **Property 6: Ausencia de carga de assets de imagen (invariante procedural)**
    - Leer como texto el código fuente de `src/data/environmentRoster.js` y de las funciones relevantes de `src/render/draw.js`, y verificar mediante expresiones regulares la ausencia de `new Image(`, `.src =`, `drawImage(` y extensiones de archivo de imagen.
    - **Validates: Requirements 1.2, 7.4, 8.6**
  - [x]* 9.2 Escribir prueba de propiedad para la no interferencia con combate/puntuación/física de pisos
    - **Property 7: El combate, la puntuación y la física de pisos no son alterados por esta feature**
    - Comparación deep-equal de un objeto `fight` producido por `startBossFight` y de un estado de torre producido por `createTowerState`, antes y después de invocar `drawSky`/`drawGround`/`render` con `ctx` mockeado.
    - **Validates: Requirement 7.3**

- [x] 10. Checkpoint final
  - Ejecutar la suite completa de pruebas (`npm test`) y confirmar que todas las pruebas nuevas y existentes pasan, incluyendo las pruebas ya existentes de `src/combat/fight.js`, `src/data/bossRoster.js` y `src/engine/tower.js` (comportamiento previo no alterado salvo la extensión aditiva de `createTowerState`/`resetGame`).
  - Ejecutar `npm run build` y confirmar que compila sin errores.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas unitarias/de propiedad) y pueden omitirse para un MVP más rápido, aunque se recomienda implementarlas dado el número de propiedades de orden/cobertura que cubren.
- Cada tarea de propiedad referencia una única Correctness Property del diseño y se etiqueta en el código como `Feature: tower-ground-biome-background, Property N: {texto}`, con un mínimo de 100 iteraciones (fast-check), salvo la Property 6, que es una comprobación estática de inspección de código fuente de una sola ejecución.
- `src/combat/fight.js`, `src/data/bossRoster.js`, `src/audio/sfx.js`, `src/audio/music.js`, las funciones de colocación de pisos/física en `src/engine/tower.js` (`computeOverlap`, `decidesFall`, `computeNewFloor`, `dropBlock`, `applyDuelWinSpeedBoost`, `triggerFall`, `newMovingBlock`, `updateDoorCounter`), y `src/data/scoreManager.js` no se modifican en ninguna tarea de este plan.
- La verificación visual manual en el navegador de las 5×4 combinaciones de bioma/momento del día y del suelo visual queda fuera del alcance de este plan (no es una tarea de código) y se deja a criterio del usuario tras completar el checkpoint final.
