# Implementation Plan: Boss Fight Sprite Animations

## Overview

Este plan implementa el combate de sprites en canvas descrito en `design.md`, en el siguiente orden de dependencias: primero las piezas de datos/render reutilizables y sin estado de UI (`Sprite_Animation_Engine`, `Boss_Rotation`, `Boss_Fight_Renderer`), luego su integración no invasiva en `draw.js`, después los cambios de soporte independientes (estructura de audio, `setCardsInteractionLocked`, limpieza de `index.html`), y por último la orquestación completa en `src/main.js` (que depende de todo lo anterior), incluyendo explícitamente el guard `reactionInProgress` en `onCardClick`. Cada Correctness Property del diseño se implementa como una prueba de propiedad (fast-check, mínimo 100 iteraciones) ubicada junto a la implementación que valida.

Todo el código se escribe en JavaScript (ES modules), siguiendo las convenciones ya presentes en `src/` (sin TypeScript, sin frameworks adicionales), y usando **vitest** + **fast-check** + **jsdom**, ya presentes en `devDependencies`.

## Tasks

- [ ] 1. Implementar `Sprite_Animation_Engine` (`src/render/spriteEngine.js`, nuevo)
  - [x] 1.1 Implementar `SpriteAnimationEngine.load(jsonPath, baseFolder)`
    - Cargar y parsear el JSON de metadata (`fetch`/equivalente) y precargar una `Image` por animación.
    - Resolver la URL de cada imagen como `baseFolder + '/' + animation.file` (sin `/` final en `baseFolder`).
    - Exponer `displayWidth`, `displayHeight`, `frameWidth`, `frameHeight` y la lista de animaciones cargadas.
    - _Requirements: 2.1_
  - [x] 1.2 Implementar el cálculo del rectángulo fuente (`getFrameRect()`) para `layout: "grid"` y `layout: "row"`
    - Grid: `sx = (frameIndex % columns) * frameWidth`, `sy = Math.floor(frameIndex / columns) * frameHeight`.
    - Row: `sx = frameIndex * frameWidth`, `sy = 0`.
    - _Requirements: 2.2, 2.3_
  - [ ]* 1.3 Escribir prueba de propiedad para la geometría del frame
    - **Property 1: Geometría correcta del rectángulo de fotograma**
    - **Validates: Requirements 2.2, 2.3**
  - [x] 1.4 Implementar `update(dt)` y `play(name, opts)`: avance de fotograma, modo continuo vs. `once`/`loop:false`, y resolución de la Promise de `play()`
    - Modo continuo (`once:false`, `loop !== false`): `frameIndex = Math.floor(elapsed / frameDuration) % frameCount`.
    - Modo `once:true` o `loop:false`: fijar `frameIndex = frameCount - 1` al llegar al final y resolver la Promise exactamente una vez.
    - `play(name, opts)` siempre reinicia `elapsed = 0`, `frameIndex = 0`, sin importar el estado previo.
    - _Requirements: 2.4, 2.5, 2.6, 2.8_
  - [ ]* 1.5 Escribir prueba de propiedad para el avance de fotograma
    - **Property 2: Avance de fotograma consistente con fps, loop y modo once**
    - **Validates: Requirements 2.4, 2.5, 2.6**
  - [ ]* 1.6 Escribir prueba de propiedad para el reinicio de `idle`
    - **Property 3: `idle` siempre se reanuda desde el primer fotograma**
    - **Validates: Requirements 2.8**
  - [-] 1.7 Implementar `draw(ctx, x, y)` y `currentAnimationName`, verificando que ningún método del motor tenga ramas condicionales específicas de personaje
    - `draw()` dibuja el frame actual escalado a `displayWidth`/`displayHeight` en la esquina superior izquierda `(x, y)`.
    - _Requirements: 2.7_
  - [x] 1.8 Implementar manejo de errores: fallo de carga (JSON o imagen) deja una instancia con `update()`/`draw()` no-op seguros; `play()` con un nombre de animación inexistente se ignora con advertencia en consola
    - _Requirements: (ver sección Error Handling de design.md)_
  - [ ]* 1.9 Escribir pruebas unitarias del motor
    - `load()` con metadata válida expone `displayWidth`/`displayHeight` y la lista exacta de animaciones (Requirement 2.1).
    - Un fallo de carga (JSON/imagen inexistente) no lanza y deja `update()`/`draw()` como no-op.
    - `play()` con un nombre inexistente no lanza ni cambia la animación activa.
    - _Requirements: 2.1_

- [x] 2. Implementar `Boss_Rotation` (`src/data/bossRoster.js`, nuevo)
  - [x] 2.1 Definir `BOSS_ROSTER` con las 5 entradas reales (`boss_1_titan_guerrero` .. `boss_5_brujo`), cada una con `id`, `jsonPath`, `displayName`, `background` y `attackAnimations` (`['ataque_1','ataque_2']` solo para `boss_1_titan_guerrero`, `['ataque']` para el resto), usando las rutas exactas ya presentes en `public/sprites/bosses/` y `public/background/`
    - _Requirements: 4.3_
  - [x] 2.2 Implementar `selectBoss(bossesResolved)`: orden fijo para `bossesResolved` en `[0,4]`, selección aleatoria con repetición para `bossesResolved >= 5`
    - _Requirements: 4.1, 4.2_
  - [ ]* 2.3 Escribir prueba de propiedad para la rotación determinística
    - **Property 5: Rotación determinística en los primeros 5 combates**
    - **Validates: Requirements 4.1**
  - [ ]* 2.4 Escribir prueba de propiedad para la rotación aleatoria
    - **Property 6: Rotación aleatoria con repetición desde el sexto combate**
    - **Validates: Requirements 4.2**
  - [x] 2.5 Implementar `isAlternatingAttackBoss(bossEntry)` (`attackAnimations.length > 1`)
    - _Requirements: 7.4, 7.5_
  - [ ]* 2.6 Escribir prueba de propiedad para los atributos derivados del boss seleccionado
    - **Property 7: Atributos derivados del boss seleccionado**
    - **Validates: Requirements 4.3, 4.5**
  - [ ]* 2.7 Escribir prueba unitaria concreta de `selectBoss(0)` .. `selectBoss(4)`
    - Verificar que devuelven respectivamente `boss_1_titan_guerrero` .. `boss_5_brujo`.
    - _Requirements: 4.1_

- [x] 3. Implementar `Boss_Fight_Renderer` (`src/render/bossFightRender.js`, nuevo)
  - [x] 3.1 Definir `COMBAT_LAYOUT` y `drawBattleBackground(ctx, W, H, backgroundImage)` (fondo estirado a pantalla completa)
    - _Requirements: 4.4_
  - [x] 3.2 Implementar `drawCombatants(ctx, W, H, warriorEngine, bossEngine)` (guerrero a la izquierda, boss a la derecha, línea base compartida)
    - _Requirements: 3.1, 3.2_
  - [ ]* 3.3 Escribir prueba de propiedad para los invariantes de layout
    - **Property 4: Invariantes de layout del Boss_Fight_Renderer**
    - **Validates: Requirements 3.1, 3.2, 4.4**
  - [x] 3.4 Implementar `updateCombatants(dt, warriorEngine, bossEngine)` (avanza ambos motores independientemente de si hay una `Combat_Reaction` en curso)
    - _Requirements: 2.4_

- [x] 4. Checkpoint — capa de render
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Extender `src/render/draw.js` para dibujar el combate
  - [x] 5.1 Añadir el parámetro `combatUiState` a `render(ctx, W, H, gameState, combatUiState)` y, cuando `gameState.screen === 'boss'` y `combatUiState` existe, invocar `bossFightRender.updateCombatants`, `drawBattleBackground` y `drawCombatants` en ese orden, sin modificar `drawSky`/`drawTower`/`drawMovingBlock`/`drawKnight`
    - `updateCombatants` recibe `gameState.lastDt || 0`.
    - `drawKnight` no debe invocarse ni modificarse para `screen === 'boss'` (sigue siendo exclusivo de `build`/`falling`).
    - _Requirements: 3.1, 3.2, 4.4_
  - [ ]* 5.2 Escribir prueba unitaria de la rama `screen === 'boss'` de `render()`
    - Verificar que, con `combatUiState` mockeado, se invocan `updateCombatants`/`drawBattleBackground`/`drawCombatants`, y que `drawKnight` no se invoca en `screen === 'boss'`.
    - _Requirements: 3.1, 3.2_

- [x] 6. Crear la estructura de carpetas de audio placeholder (Requirement 13)
  - [x] 6.1 Crear `public/audio/guerrero/{bloqueo,herido,morir}/.gitkeep`
    - _Requirements: 13.3, 13.4_
  - [x] 6.2 Crear `public/audio/bosses/boss_1_titan_guerrero/{idle,ataque_1,ataque_2,herido,morir}/.gitkeep`
    - _Requirements: 13.1, 13.2, 13.4_
  - [x] 6.3 Crear `public/audio/bosses/{boss_2_orco,boss_3_tigre,boss_4_golem,boss_5_brujo}/{idle,ataque,herido,morir}/.gitkeep`
    - _Requirements: 13.1, 13.2, 13.4_
  - [ ]* 6.4 Escribir prueba unitaria que verifique la existencia de cada directorio/`.gitkeep` listado en design.md sección 7
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 7. Añadir `setCardsInteractionLocked` a `src/ui/screens.js`
  - [x] 7.1 Implementar `setCardsInteractionLocked(isLocked)`: deshabilita/habilita los botones `.opt-btn` de toda carta que no tenga ya la clase `locked` permanente
    - _Requirements: 15.1, 15.3_
  - [ ]* 7.2 Escribir prueba de propiedad para el ciclo de bloqueo/desbloqueo de cartas (parte de `setCardsInteractionLocked`)
    - **Property 12: Ciclo de bloqueo/desbloqueo de cartas durante una Combat_Reaction** (cobertura parcial: `setCardsInteractionLocked`)
    - **Validates: Requirements 15.1, 15.3**
  - [ ]* 7.3 Escribir prueba unitaria de caso de borde: `setCardsInteractionLocked(true)` sobre una carta ya bloqueada (`locked`) no le cambia el estado
    - _Requirements: 15.1_

- [x] 8. Eliminar el markup/CSS obsoleto del combate DOM en `index.html`
  - [x] 8.1 Simplificar `#bossScreen` a `hp-label`/`hp-bar` (`playerHpBar`, `bossHpBar`)/`fightBanner`/`cardsRow` como hijos directos, eliminando `.arena`, `.combatant`, ambos `.fighter` y sus `.facet-*`, y `.vs-badge`
    - _Requirements: 1.1, 1.3_
  - [x] 8.2 Eliminar del `<style>` todas las reglas CSS listadas en design.md sección 6 (`.arena`, `.combatant`, `.fighter`, `.facet`, `.knight-*`, `.boss-*` excepto `#bossName`, `.vs-badge`, y la regla `@media (max-width:520px) .fighter{...}`) y añadir la regla `#bossScreen { background: none; }`
    - _Requirements: 1.2_
  - [ ]* 8.3 Escribir prueba unitaria que verifique que `#bossScreen` no contiene nodos con clase `fighter`, `facet`, `combatant`, `arena` ni `vs-badge` tras renderizar la pantalla de combate
    - _Requirements: 1.1_
  - [ ]* 8.4 Escribir prueba unitaria que verifique, leyendo el CSS fuente, que ninguna de las reglas eliminadas en la tarea 8.2 permanece
    - _Requirements: 1.2_
  - [ ]* 8.5 Escribir prueba unitaria confirmando que `renderPips`/`showBanner`/`renderCards` siguen funcionando igual tras la simplificación del markup
    - _Requirements: 1.3_

- [x] 9. Checkpoint — soporte independiente completo
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integrar la orquestación de combate en `src/main.js`
  - [x] 10.1 Precargar `warriorEngine` y las 5 `bossEngines` (una por `BOSS_ROSTER` entry) con `SpriteAnimationEngine.load(...)` en la inicialización del módulo, antes de que cualquier combate pueda iniciarse
    - _Requirements: 2.1_
  - [ ]* 10.2 Escribir prueba unitaria de robustez: si la carga de un `bossEngine` falla, el resto de la inicialización del juego continúa sin lanzar
    - _Requirements: (ver sección Error Handling de design.md)_
  - [x] 10.3 Reemplazar la rama `shouldStartBoss` de `loop()`: usar `selectBoss(gameState.doorsPassed)` para obtener `bossEntry`, construir `combatUiState` (`bossEntry`, `warriorEngine`, `bossEngine` correspondiente, `failedAnswerCount: 0`, `attackAlternateIndex: 0`, `reactionInProgress: false`), llamar `play('idle')` en ambos motores, e invocar `ui.showBossScreen` con el `bossLabel` construido como `` `${bossEntry.displayName} — Nivel ${lvl}` `` — **ignorando por completo `fight.bossLabel`**
    - _Requirements: 4.1, 4.2, 4.5, 5.1, 8.1_
  - [ ]* 10.4 Escribir prueba unitaria confirmando que `fight.bossLabel` nunca se lee ni se usa para construir el `bossLabel` mostrado
    - _Requirements: 4.5_
  - [x] 10.5 Guardar el `dt` calculado en `loop()` en `gameState.lastDt` y pasarlo a `render.render(...)` junto con `combatUiState`
    - _Requirements: 3.1, 3.2_
  - [x] 10.6 Añadir el guard `combatUiState.reactionInProgress` en `onCardClick(idx)`, evaluado antes de `card.locked` y antes de `ui.openQuestionModal(...)` (en el mismo lugar donde el diseño original lo ponía antes de `ui.renderCardBack(...)`), de forma que ninguna carta pueda abrir la Modal_Pregunta mientras una `Combat_Reaction` está en curso
    - _Requirements: 15.2_
  - [ ]* 10.7 Escribir prueba de propiedad para el guard de `onCardClick` (caso explícito de la Property 12)
    - **Property 12: Ciclo de bloqueo/desbloqueo de cartas durante una Combat_Reaction** (cobertura: `onCardClick` + `combatUiState.reactionInProgress`, verificando que `ui.openQuestionModal` no se invoca mientras `reactionInProgress` es `true`)
    - **Validates: Requirements 15.2**
  - [x] 10.8 Implementar `playFailureReaction()`: selecciona la animación de ataque del boss (con alternancia `ataque_1`/`ataque_2` vía `attackAlternateIndex` para el Alternating_Attack_Boss), la reproduce con `once:true`, y luego reproduce `bloqueo` (si `failedAnswerCount === 0`) o `herido` en el Warrior_Sprite, incrementando `failedAnswerCount`
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 10.9 Escribir prueba de propiedad para la alternancia de ataque
    - **Property 11: Alternancia `ataque_1`/`ataque_2` con reinicio por combate**
    - **Validates: Requirements 7.4, 7.5**
  - [x] 10.10 Implementar `resumeIdleBoth()`: reproduce `idle` en `warriorEngine` y `bossEngine`
    - _Requirements: 5.2, 8.2_
  - [ ]* 10.11 Escribir prueba de propiedad para el ciclo idle/reacción/idle de ambos personajes
    - **Property 8: Ciclo idle-por-defecto / reacción / vuelta-a-idle para ambos personajes**
    - **Validates: Requirements 5.1, 5.2, 8.1, 8.2**
  - [x] 10.12 Implementar `playWinSequence()`: espera la pausa de lectura de la modal (`MODAL_CLOSE_PAUSE_MS.win`, 500ms), invoca `ui.closeQuestionModal()`, y **recién después** marca `reactionInProgress = true` + `setCardsInteractionLocked(true)`, reproduce `ataque` (guerrero) → `herido` (boss), muestra el banner de victoria (después de la reacción, no antes), reproduce `morir` (boss), e invoca `endFight(true)`
    - _Requirements: 6.1, 6.2, 10.1, 10.2, 10.3, 11.1, 11.4, 15.1_
  - [ ]* 10.13 Escribir prueba de propiedad para la secuencia de acierto/victoria
    - **Property 9: Orden y cierre de la secuencia de acierto (incluye victoria)** (incluye verificar que la modal está cerrada antes de que arranque `ataque`, y que el banner se muestra después de `herido`)
    - **Validates: Requirements 6.1, 6.2, 10.1, 10.2, 10.3, 11.1**
  - [x] 10.14 Implementar `playLoseSequence()`: espera la pausa de lectura de la modal (`MODAL_CLOSE_PAUSE_MS.lose`, 1200ms), invoca `ui.closeQuestionModal()`, y **recién después** marca `reactionInProgress = true` + `setCardsInteractionLocked(true)`, invoca `playFailureReaction()`, muestra el banner de derrota (después de la reacción, no antes), reproduce `morir` (guerrero), e invoca `endFight(false)`
    - _Requirements: 9.1, 9.2, 9.3, 11.2, 11.4, 15.1_
  - [ ]* 10.15 Escribir prueba de propiedad para la secuencia de fallo/derrota
    - **Property 10: Orden, selección de reacción y cierre de la secuencia de fallo (incluye derrota)** (incluye verificar que la modal está cerrada antes de que arranque el ataque del boss, y que el banner se muestra después de la reacción de fallo)
    - **Validates: Requirements 7.1, 7.2, 7.3, 9.1, 9.2, 9.3, 11.2**
  - [x] 10.16 Implementar `playCorrectNonResolvingSequence(cardEl)`: espera la pausa de lectura de la modal (`MODAL_CLOSE_PAUSE_MS.correctNonResolving`, 900ms), invoca `ui.closeQuestionModal()` y actualiza `ui.renderPips('bossHpBar', ...)`, y **recién después** marca `reactionInProgress`/bloqueo de cartas, reproduce `ataque` (guerrero) → `herido` (boss), quita `locked` de `cardEl` (re-habilita la Tarjeta ya que la Modal_Pregunta, no la carta de la fila, es lo que se cierra/abre), llama `resumeIdleBoth()`, y desbloquea cartas (`reactionInProgress = false`, `setCardsInteractionLocked(false)`)
    - _Requirements: 6.1, 6.2, 11.3, 11.4, 15.1, 15.2, 15.3_
  - [x] 10.17 Implementar `playIncorrectNonResolvingSequence()`: espera la pausa de lectura de la modal (`MODAL_CLOSE_PAUSE_MS.incorrectNonResolving`, 900ms), invoca `ui.closeQuestionModal()`, y **recién después** marca `reactionInProgress`/bloqueo de cartas, invoca `playFailureReaction()`, llama `resumeIdleBoth()`, y desbloquea cartas
    - _Requirements: 7.1, 7.2, 7.3, 11.4, 15.1, 15.2, 15.3_
  - [ ]* 10.18 Escribir prueba unitaria de `playCorrectNonResolvingSequence`: confirmar que `ui.closeQuestionModal()` se invoca antes de que arranque cualquier `Combat_Reaction`, y que `cardEl` pierde la clase `locked` solo después de que ambas animaciones (`ataque`, `herido`) completan
    - _Requirements: 11.3, 11.4_
  - [x] 10.19 Reescribir `onAnswer(cardIdx, chosenIdx)`: eliminar todos los `setTimeout` de la rama de resultado (sustituidos por las pausas `await wait(...)` dentro de cada función de secuencia); mantener el marcado visual inmediato (`cardEl.classList.add('locked')`) y `sfx.correct()`/`sfx.wrong()`/`sfx.win()`/`sfx.lose()` y `ui.renderPips(...)` sin cambios de temporización; despachar a `playWinSequence()`, `playLoseSequence()`, `playCorrectNonResolvingSequence(cardEl)` o `playIncorrectNonResolvingSequence()` según `result.outcome`/`result.correct` (la Modal_Pregunta sigue abierta en el momento de este despacho; cada función de secuencia es responsable de cerrarla tras su propia pausa de lectura)
    - _Requirements: 11.4, 12.1, 12.2, 12.3_
  - [ ]* 10.20 Escribir prueba unitaria confirmando que `sfx.correct()`/`sfx.wrong()`/`sfx.win()`/`sfx.lose()` y `ui.renderPips(...)` se ejecutan inmediatamente tras `answerCard`, antes de que `ui.closeQuestionModal()` sea invocado y antes de que se resuelva cualquier Promise de animación (usando motores de animación mockeados con `play()` diferido y `ui.closeQuestionModal` mockeado)
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 10.21 Modificar `endFight(won)` para limpiar `combatUiState = null` junto con `fight = null`, preservando el resto del comportamiento existente (registro de score, `showGameOverScreen`, transición de `screen`)
    - _Requirements: 9.3, 10.3_
  - [ ]* 10.22 Escribir prueba de propiedad para la inmutabilidad del estado de combate de `fight.js`
    - **Property 13: El estado de combate de `fight.js` no es alterado por la capa visual**
    - **Validates: Requirements 14.1**

- [x] 11. Checkpoint final
  - Ejecutar la suite completa de pruebas (`npm test`) y confirmar que todas las pruebas nuevas y existentes pasan, incluyendo las pruebas ya existentes de `src/combat/fight.js` (no modificado), `src/audio/sfx.js` y `src/audio/music.js` (comportamiento no alterado por esta feature).
  - Ejecutar `npm run build` y confirmar que compila sin errores.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas unitarias/de propiedad) y pueden omitirse para un MVP más rápido, aunque se recomienda implementarlas dado que este es un cambio con muchas propiedades de orden temporal (secuencias `async`).
- Cada tarea de propiedad referencia una única Correctness Property del diseño y se etiqueta en el código como `Feature: boss-fight-sprite-animations, Property N: {texto}`, con un mínimo de 100 iteraciones (fast-check).
- `src/combat/fight.js`, `src/audio/sfx.js`, `src/audio/music.js` y `src/engine/tower.js` no se modifican en ninguna tarea (Requirement 14.1).
- La verificación visual manual del combate en el navegador y la validación de la experiencia de usuario quedan fuera del alcance de este plan (no son tareas de código) y se dejan a criterio del usuario tras completar la tarea 11.
