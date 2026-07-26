# Implementation Plan: Combat Animation SFX

## Overview

Este plan implementa el `Combat_Sfx_Player` descrito en `design.md`, en el siguiente orden de dependencias: primero el nuevo módulo sin estado de UI ni de motor (`src/audio/combatSfx.js`, con su estado interno, su fórmula de resolución de rutas, su núcleo de reproducción/detención, su aplicación de volumen y su persistencia), luego la eliminación del mecanismo manual `sfx.attack()` en `src/audio/sfx.js`, después la integración de `combatSfx` en `src/main.js` mediante los wrappers `playWarriorAnim`/`playBossAnim` (sin tocar `spriteEngine.js`/`fight.js`/`bossRoster.js`), y por último la extensión del `Audio_Settings_Panel` ya existente (`index.html` + `src/ui/screens.js`) con el segundo par de controles de volumen/mute y su cableado en `main.js`. La verificación final confirma que la suite completa de pruebas y el build siguen pasando, y que ningún archivo fuera de alcance fue modificado.

Todo el código se escribe en JavaScript (ES modules), siguiendo las convenciones ya presentes en `src/` (sin TypeScript, sin frameworks adicionales), y usando **vitest** + **fast-check** + **jsdom**, ya presentes en `devDependencies`, siguiendo el mismo patrón de pruebas ya usado en `src/audio/music.js`/`src/audio/sfx.js`.

## Tasks

- [x] 1. Implementar `src/audio/combatSfx.js` (nuevo módulo)
  - [x] 1.1 Implementar el estado interno del módulo (`activeSounds` Map, `effectiveVolume = DEFAULT_VOLUME = 0.30`, `muted = false`, `PREF_KEY = 'torre-nubes-combat-sfx-pref'`) y la función `realVolume()`
    - _Requirements: 7.1, 7.2_
  - [x] 1.2 Implementar `buildUrl(folderId, animName)` (fórmula dinámica, sin tabla de mapeo: `guerrero` → `/audio/guerrero/<animName>/<animName>.wav`, cualquier otro `folderId` → `/audio/bosses/<folderId>/<animName>/<animName>.wav`)
    - _Requirements: 1.3, 1.4_
  - [x]* 1.3 Escribir prueba de propiedad para la resolución de rutas sin tabla de mapeo manual
    - **Property 1: Ruta del Character_Voice_Sound derivada sin tabla de mapeo manual**
    - **Validates: Requirements 1.3, 1.4**
  - [x] 1.4 Implementar `stopEntry(entry)` (detiene `pause()`+`currentTime=0` de forma segura con try/catch)
    - _Requirements: 11.3_
  - [x] 1.5 Implementar la función pública `play(role, folderId, animName)`: chequeo de no-op por mismo `folderId`+`animName` activo para ese `role` (Requirement 4.4/2.1c), `stopEntry` de la entrada previa del mismo rol (Requirement 4.1/4.2), guard de `typeof Audio === 'undefined'`, construcción de `new Audio(buildUrl(...))` envuelta en try/catch, `audioElement.loop = animName === 'idle'`, `audioElement.volume = realVolume()`, listener `error` que swallow, registro en `activeSounds`, y `.play()` síncrono envuelto en try/catch con `.catch()` en la Promise devuelta
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 11.1, 11.2, 11.3, 11.4_
  - [x]* 1.6 Escribir prueba de propiedad para el bucle de idle frente a la reproducción única de animaciones de acción
    - **Property 2: Reproducción en bucle para idle, reproducción única para animaciones de acción**
    - **Validates: Requirements 2.1, 2.2, 3.1, 3.2, 3.3**
  - [x]* 1.7 Escribir prueba de propiedad para la ausencia de solapamiento por rol
    - **Property 3: Ausencia de solapamiento por rol, incluyendo cambio de boss activo, e independencia entre roles**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  - [x]* 1.8 Escribir prueba de propiedad para la robustez ante fallos de reproducción
    - **Property 9: Robustez ante fallos de reproducción, sin excepciones y sin efecto cruzado entre personajes**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
  - [x] 1.9 Implementar `applyVolumeToActiveSounds()` (recorre `activeSounds.values()`, asigna `realVolume()` a cada `audioElement.volume` sin pausar/reiniciar)
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 1.10 Implementar `loadPreference()`/`savePreference(volume, muted)` (mismo patrón que `music.js`: JSON en localStorage bajo `PREF_KEY`, validación de `volume` numérico finito en [0,1] y `muted` booleano, try/catch en save sin relanzar)
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  - [x]* 1.11 Escribir prueba de propiedad para el round-trip de persistencia de preferencias válidas
    - **Property 6: Round-trip de persistencia de preferencias válidas**
    - **Validates: Requirements 8.1, 8.3, 8.6**
  - [x]* 1.12 Escribir prueba de propiedad para el descarte de preferencias inválidas
    - **Property 7: Descarte de preferencias inválidas y aplicación del valor por defecto**
    - **Validates: Requirements 7.1, 7.2, 8.4, 8.5**
  - [x] 1.13 Implementar la API pública `combatSfx` (`init`, `play`, `setVolume`, `toggleMute`, `getEffectiveVolumePercent`, `isMuted`) — `init()` carga preferencia o aplica default, sin precargar/crear ningún `HTMLAudioElement`
    - _Requirements: 7.1, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_
  - [x]* 1.14 Escribir prueba de propiedad para el volumen real consistente aplicado a todo sonido activo
    - **Property 5: Volumen real consistente aplicado a todo Active_Character_Sound**
    - **Validates: Requirements 7.1, 9.1, 9.2, 9.3, 9.4**
  - [x]* 1.15 Escribir pruebas unitarias del módulo `combatSfx.js`
    - `buildUrl` casos concretos: `buildUrl('guerrero', 'idle')` produce `/audio/guerrero/idle/idle.wav`; `buildUrl('boss_1_titan_guerrero', 'ataque_1')` y `buildUrl('boss_1_titan_guerrero', 'ataque_2')` producen las rutas correspondientes; cada uno de los demás `bossId` de `BOSS_ROSTER` (`boss_2_orco`, `boss_3_tigre`, `boss_4_golem`, `boss_5_brujo`) con su animación `ataque` produce la ruta correspondiente.
    - `combatSfx.init()` sin preferencia previa aplica `Combat_Sfx_Default_Volume_Level` (30%) y `Combat_Sfx_Mute_State` inactivo.
    - _Requirements: 1.3, 1.4, 7.1, 7.2_

- [x] 2. Checkpoint — módulo `combatSfx.js` completo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Eliminar `sfx.attack()` de `src/audio/sfx.js`
  - [x] 3.1 Eliminar la entrada `attack: 'guerrero/ataque/attack_sword.wav'` de `AUDIO_MAP`
    - _Requirements: 5.1_
  - [x] 3.2 Eliminar la propiedad `attack:()=>dispatch('attack')` del objeto exportado `sfx`
    - _Requirements: 5.2_
  - [x]* 3.3 Escribir pruebas unitarias de la eliminación de `attack` en `sfx.js`
    - `AUDIO_MAP.attack === undefined`.
    - `sfx.attack === undefined`.
    - _Requirements: 5.1, 5.2_

- [x] 4. Integrar `combatSfx` en `src/main.js` mediante wrappers, sin modificar `spriteEngine.js`/`fight.js`/`bossRoster.js`
  - [x] 4.1 Importar `combatSfx` en `main.js` y añadir `combatSfx.init()` junto a `music.init()` en la inicialización del módulo
    - _Requirements: 7.1, 8.3, 8.4, 8.5, 12.2, 12.1, 12.3_
  - [x] 4.2 Implementar `playWarriorAnim(name, opts)` y `playBossAnim(name, opts)` (wrappers que llaman `combatSfx.play('warrior'|'boss', folderId, name)` de forma síncrona antes de delegar/retornar `combatUiState.warriorEngine.play(name, opts)`/`combatUiState.bossEngine.play(name, opts)`)
    - _Requirements: 1.1, 1.2, 12.4_
  - [x] 4.3 Sustituir cada llamada directa a `combatUiState.warriorEngine.play(...)`/`combatUiState.bossEngine.play(...)` en `resumeIdleBoth()`, `playFailureReaction()`, `playWinSequence()`, `playLoseSequence()`, `playCorrectNonResolvingSequence()`, y el bloque de inicio de Boss_Fight dentro de `loop()`, por la llamada al wrapper correspondiente (`playWarriorAnim`/`playBossAnim`), preservando la semántica exacta de `await`/retorno de Promise
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 3.1, 4.1, 4.2, 12.4_
  - [x] 4.4 Eliminar las dos líneas `sfx.attack();` de `playWinSequence()` y `playCorrectNonResolvingSequence()`
    - _Requirements: 5.3, 5.4, 5.5_
  - [x]* 4.5 Escribir prueba de propiedad estática para la eliminación completa y verificable de `sfx.attack()`
    - **Property 4: Eliminación completa y verificable de sfx.attack()** (prueba estática, no generativa, de una sola ejecución sobre el código fuente de `sfx.js` y `main.js`)
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
  - [x]* 4.6 Escribir pruebas unitarias de la integración en `main.js`
    - Inspección de que `playWinSequence`/`playCorrectNonResolvingSequence` no contienen `sfx.attack()`.
    - Cada punto de la tabla de integración del design.md invoca el wrapper correcto (`playWarriorAnim`/`playBossAnim`) en lugar de la llamada directa a `warriorEngine.play`/`bossEngine.play`.
    - _Requirements: 5.3, 5.4, 12.4_

- [x] 5. Checkpoint — integración en main.js completa (sin modificar spriteEngine.js/fight.js/bossRoster.js)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Extender el `Audio_Settings_Panel` con el segundo par de controles (volumen + mute de efectos de combate)
  - [x] 6.1 Añadir en `index.html`, dentro de `#audioSettingsPanel`, el marcado `#combatSfxVolumeSlider` + `#combatSfxMuteToggleBtn` con las etiquetas "Volumen de efectos de combate"/"Silenciar efectos de combate", junto a (sin remover) los controles de música existentes
    - _Requirements: 6.1, 6.2_
  - [x] 6.2 Extender `showAudioSettingsPanel(volumePercent, isMuted, combatSfxVolumePercent, combatSfxIsMuted)` en `src/ui/screens.js` para reflejar los dos valores nuevos, e implementar `setCombatSfxMuteButtonState(isMuted)`
    - _Requirements: 6.3_
  - [x] 6.3 Extender `bindAudioSettingsHandlers({...})` en `src/ui/screens.js` con `onCombatSfxVolumeChange`/`onToggleCombatSfxMute`, cableando los listeners `input`/`click` de los nuevos controles
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x]* 6.4 Escribir pruebas unitarias de los nuevos controles del panel
    - Los nuevos controles existen en el DOM con las etiquetas correctas y distintas de las de música.
    - `bindAudioSettingsHandlers` invoca los callbacks correctos al disparar `input`/`click` sobre ellos.
    - _Requirements: 6.1, 6.2_

- [x] 7. Cablear los nuevos controles en `src/main.js`, manteniendo independencia total de `music.js`
  - [x] 7.1 Actualizar `onToggleAudioSettings()` para pasar `combatSfx.getEffectiveVolumePercent()`/`combatSfx.isMuted()` a `ui.showAudioSettingsPanel(...)`, junto a los valores de `music` ya existentes
    - _Requirements: 6.3_
  - [x] 7.2 Implementar `onCombatSfxVolumeChange(percent)` y `onToggleCombatSfxMute()` (sin invocar ninguna función de `music.js`), y registrar ambos en `ui.bindAudioSettingsHandlers({...})`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.4, 10.5_
  - [x]* 7.3 Escribir prueba de propiedad para la independencia total respecto a la música y a los efectos de sfx.js restantes
    - **Property 8: Independencia total respecto a la música y a los efectos de sfx.js restantes**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
  - [x]* 7.4 Escribir pruebas unitarias de la independencia entre `combatSfx` y `music`
    - Invocar `music.setVolume(...)`/`music.toggleMute()` no modifica `combatSfx.getEffectiveVolumePercent()`/`combatSfx.isMuted()`, y viceversa.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8. Checkpoint — panel de configuración de audio completo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Checkpoint final
  - Ejecutar la suite completa de pruebas (`npm test`) y confirmar que todas las pruebas nuevas y existentes pasan, incluyendo las pruebas ya existentes de `src/audio/sfx.js`, `src/audio/music.js`, `src/render/spriteEngine.js`, `src/combat/fight.js` y `src/data/bossRoster.js` (comportamiento previo no alterado salvo la eliminación de `attack` en `sfx.js` descrita en la tarea 3).
  - Ejecutar `npm run build` y confirmar que compila sin errores.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas unitarias/de propiedad) y pueden omitirse para un MVP más rápido, aunque se recomienda implementarlas dado el número de propiedades de orden/cobertura que cubren.
- Cada tarea de propiedad referencia una única Correctness Property del diseño y se etiqueta en el código como `Feature: combat-animation-sfx, Property N: {texto}`, con un mínimo de 100 iteraciones (fast-check), salvo la Property 4, que es una comprobación estática de inspección de código fuente de una sola ejecución.
- `src/render/spriteEngine.js`, `src/combat/fight.js` y `src/data/bossRoster.js` no se modifican en ninguna tarea de este plan (Requirement 12.1, 12.2, 12.3).
- `src/audio/music.js` no se modifica en ninguna tarea de este plan (solo se lee/referencia como patrón arquitectónico a imitar).
- La verificación manual de calidad de audio en el navegador (escuchar cada uno de los 6 conjuntos de sonidos de boss/guerrero, confirmar que la sincronización "se siente" correcta, y confirmar el efecto audible del nuevo slider) queda fuera del alcance de este plan (no es una tarea de código) y se deja a criterio del usuario tras completar el checkpoint final.
