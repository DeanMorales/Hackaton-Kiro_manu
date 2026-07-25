# Implementation Plan: background-music-controls

## Overview

Este plan construye el `Background_Music_Player` (`src/audio/music.js`) descrito en el diseño: dos `HTMLAudioElement` persistentes en bucle (`general`, `combat`), gestión de `Effective_Volume`/`Mute_State` compartida, persistencia en `localStorage`, y manejo de `Autoplay_Restriction`. Luego agrega el marcado del `Settings_Button`/`Audio_Settings_Panel` en `index.html`, las funciones de UI correspondientes en `src/ui/screens.js`, y finalmente integra todas las llamadas explícitas en `src/main.js` en cada punto de transición de pantalla. El proyecto ya cuenta con `vitest`, `fast-check` y `jsdom` en `devDependencies`, por lo que no es necesario introducir herramientas nuevas.

**Nota de corrección respecto al diseño**: `design.md` referencia el archivo de combate como `music_combat.mp3`, pero el archivo real presente en `public/audio/` es `music_combat.wav`. `TRACK_FILES.combat` debe usar `'music_combat.wav'` (extensión `.wav` para ambas pistas), consistente con el archivo real en disco.

## Tasks

- [x] 1. Construir el estado interno y las utilidades base del Background_Music_Player en `src/audio/music.js`
  - Definir `TRACK_FILES = { general: 'music_background_music_medieval.wav', combat: 'music_combat.wav' }` (ambos `.wav`, sin acoplarse a `sfx.js`)
  - Definir `DEFAULT_VOLUME = 0.06`, `PREF_KEY = 'torre-nubes-audio-pref'`
  - Definir el estado del módulo: `tracks`, `activeTrackName`, `effectiveVolume`, `muted`, `hasUserInteracted`, `pendingScreen`, `initialized`
  - Implementar `audioFileUrl(filename)` devolviendo `'/audio/' + filename`, duplicada localmente (sin importar desde `sfx.js`)
  - _Requirements: 1.7, 8.1_

- [x] 2. Implementar `loadPreference()` / `savePreference()`
  - `loadPreference()`: leer `localStorage.getItem(PREF_KEY)`, parsear JSON dentro de try/catch, validar que el resultado sea un objeto con `volume` numérico finito en `[0, 1]` y `muted` estrictamente booleano; retornar `null` si falta cualquiera de estas condiciones (JSON inválido, campos ausentes, tipos incorrectos, `volume` fuera de rango)
  - `savePreference(volume, muted)`: serializar `{ volume, muted }` y escribir con `localStorage.setItem(PREF_KEY, ...)` dentro de try/catch, sin relanzar si falla
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 2.1 Escribir prueba de propiedad: Round-trip de persistencia de preferencias válidas
    - **Property 5: Round-trip de persistencia de preferencias válidas**
    - **Validates: Requirements 6.1, 6.3**
    - Generar aleatoriamente `volume` en `[0, 100]` y `muted` en `{true, false}`; guardar mediante `setVolume`/`toggleMute`, reinicializar el módulo con `init()` sobre el mismo `localStorage` mockeado, y verificar que `getEffectiveVolumePercent()`/`isMuted()` resultantes coinciden con los valores guardados
    - Comentario de tag: `// Feature: background-music-controls, Property 5: Round-trip de persistencia de preferencias válidas`
    - Configurar mínimo 100 iteraciones

  - [ ]* 2.2 Escribir prueba de propiedad: Descarte de preferencias inválidas
    - **Property 6: Descarte de preferencias inválidas**
    - **Validates: Requirements 6.5**
    - Generar aleatoriamente valores corruptos bajo `PREF_KEY` (JSON malformado, `volume` ausente/no numérico/fuera de `[0,1]`, `muted` ausente/no booleano, objeto vacío); verificar que `init()` aplica siempre `DEFAULT_VOLUME` (6%) con `Mute_State` inactivo
    - Comentario de tag: `// Feature: background-music-controls, Property 6: Descarte de preferencias inválidas`
    - Configurar mínimo 100 iteraciones

  - [ ]* 2.3 Escribir prueba unitaria: `init()` sin preferencia previa aplica el valor por defecto
    - Verificar que sin `Stored_Audio_Preference` previo, `init()` aplica `DEFAULT_VOLUME` (6%) y `Mute_State` inactivo
    - _Requirements: 2.1, 6.4_

- [x] 3. Implementar el motor interno de reproducción: `realVolume()`, `applyVolumeToBothTracks()`, `safePlay()`, `pauseTrack()`, `setActiveTrack()`
  - `realVolume()`: retorna `muted ? 0 : effectiveVolume`
  - `applyVolumeToBothTracks()`: asigna `realVolume()` a `tracks.general.volume` y `tracks.combat.volume`
  - `safePlay(track)`: invoca `track.play()`, captura el rechazo de la Promise sin propagar excepción; si el rechazo corresponde a una `Autoplay_Restriction` (`NotAllowedError`) y `hasUserInteracted` es falso, registra la pantalla objetivo en `pendingScreen` para reintentar en `notifyUserInteraction()`; captura también el evento `error` del elemento sin relanzar
  - `pauseTrack(name)`: llama a `tracks[name].pause()` si el elemento existe, preservando `currentTime` de forma nativa
  - `setActiveTrack(name)`: pausa síncronamente la pista activa distinta de `name` antes de iniciar la nueva (si `hasUserInteracted` es verdadero) o de diferirla vía `pendingScreen`; actualiza `activeTrackName`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.2, 2.3, 8.3_

  - [ ]* 3.1 Escribir prueba de propiedad: Exclusividad de reproducción
    - **Property 1: Exclusividad de reproducción**
    - **Validates: Requirements 1.7, 8.3**
    - Generar secuencias aleatorias (1 a 20 llamadas) de `enterBuildScreen`/`enterFallingScreen`/`enterBossScreen`/`enterInactiveScreen`; tras cada llamada, verificar que a lo sumo un mock de `<audio>` tiene `paused === false`
    - Comentario de tag: `// Feature: background-music-controls, Property 1: Exclusividad de reproducción`
    - Configurar mínimo 100 iteraciones

  - [ ]* 3.2 Escribir prueba de propiedad: Continuidad de posición al pausar y reanudar
    - **Property 2: Continuidad de posición al pausar y reanudar**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
    - Generar una posición aleatoria de `currentTime`, disparar una transición de pausa (`boss`/`start`/`gameover`) y luego una reanudación hacia la misma pista; verificar que `currentTime` al reanudar es igual al valor guardado antes de pausar (o `0` si nunca había comenzado)
    - Comentario de tag: `// Feature: background-music-controls, Property 2: Continuidad de posición al pausar y reanudar`
    - Configurar mínimo 100 iteraciones

  - [ ]* 3.3 Escribir prueba de propiedad: Robustez ante fallos de carga, reproducción y Autoplay_Restriction
    - **Property 4: Robustez ante fallos de carga, reproducción y Autoplay_Restriction**
    - **Validates: Requirements 1.9, 7.1, 7.4**
    - Generar aleatoriamente un tipo de fallo (rechazo genérico de `.play()`, evento `error`, `NotAllowedError`) y una secuencia de 2 a 5 llamadas a funciones de transición; verificar que ninguna lanza excepción y que el `Active_Track` interno avanza correctamente en la siguiente llamada
    - Comentario de tag: `// Feature: background-music-controls, Property 4: Robustez ante fallos de carga, reproducción y Autoplay_Restriction`
    - Configurar mínimo 100 iteraciones

- [x] 4. Implementar y exportar la API pública de `music.js`
  - `init()`: detecta `typeof Audio === 'undefined'` (dejando `tracks = null` si no hay soporte), crea los dos `HTMLAudioElement` con `loop = true`, aplica `loadPreference()` o `DEFAULT_VOLUME`/`muted=false` si no existe o es inválida, y llama a `applyVolumeToBothTracks()`
  - `notifyUserInteraction()`: marca `hasUserInteracted = true`; si existe `pendingScreen`, reintenta esa transición
  - `enterBuildScreen()` y `enterFallingScreen()`: ambas invocan `setActiveTrack('general')` (alias del mismo comportamiento)
  - `enterBossScreen()`: invoca `setActiveTrack('combat')`
  - `enterInactiveScreen()`: invoca `setActiveTrack(null)` (pausa sin elegir nueva pista)
  - `setVolume(volumePercent)`: actualiza `effectiveVolume = volumePercent/100`, reaplica volumen a ambas pistas, y persiste vía `savePreference()`
  - `toggleMute()`: invierte `muted`, reaplica volumen, y persiste vía `savePreference()`
  - `getEffectiveVolumePercent()`: retorna `Math.round(effectiveVolume * 100)`
  - `isMuted()`: retorna `muted`
  - Todas las funciones de transición deben ser idempotentes ante llamadas repetidas en el mismo estado
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.1, 3.2, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.3, 6.4, 7.2, 7.3_

  - [ ]* 4.1 Escribir prueba de propiedad: Volumen real compartido y consistente
    - **Property 3: Volumen real compartido y consistente**
    - **Validates: Requirements 2.2, 2.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.4, 7.3**
    - Generar aleatoriamente `Effective_Volume` (0-100), `Mute_State` (booleano) y `Active_Track` (`general`/`combat`/`null`); aplicar `setVolume`/`toggleMute` en orden aleatorio y verificar que `tracks.general.volume === tracks.combat.volume === Effective_Volume/100 * (muted?0:1)`
    - Comentario de tag: `// Feature: background-music-controls, Property 3: Volumen real compartido y consistente`
    - Configurar mínimo 100 iteraciones

  - [ ]* 4.2 Escribir pruebas unitarias de aislamiento respecto a `sfx.js` y de idempotencia
    - Verificar que `music.toggleMute()`/`music.setVolume()` no invocan ni afectan ninguna función exportada por `sfx.js`, y viceversa (Requirements 4.4, 8.1, 8.2)
    - Verificar que llamar dos veces seguidas a `enterBuildScreen()` no reinicia `general` si ya es la `Active_Track`
    - Verificar que uno o más `sfx.*` disparados mientras una pista suena no interrumpen ni reinician la `Active_Track`
    - _Requirements: 4.4, 8.1, 8.2_

- [x] 5. Checkpoint - Ensure all tests pass, ask the user if questions arise.
  - Ejecutar `vitest run` sobre las pruebas de `music.js` creadas hasta este punto

- [x] 6. Agregar el marcado HTML del `Settings_Button` y del `Audio_Settings_Panel` en `index.html`
  - Añadir `<button id="settingsBtn" class="hud-pill facet-cut-sm" aria-label="Configuración de audio" style="pointer-events:auto; cursor:pointer;">⚙️</button>` dentro de `#hud`, junto a los `hud-pill` existentes
  - Añadir el overlay `#audioSettingsPanel` (hermano de `#startScreen`/`#bossScreen`/`#gameOverScreen`) con clases `overlay hidden`, conteniendo `.panel.facet-cut` con `#volumeSlider` (`input type="range" min="0" max="100" step="1"`), `#muteToggleBtn` (`aria-pressed="false"`) y `#closeAudioSettingsBtn`
  - Seguir el lenguaje visual existente (`.hud-pill`, `.panel.facet-cut`, `.overlay`, `.hidden`, `.btn-secondary`, `.btn-primary`)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Implementar las funciones de UI del panel de audio en `src/ui/screens.js`
  - `showAudioSettingsPanel(volumePercent, isMuted)`: asigna `volumeSlider.value = volumePercent`, refleja `isMuted` en `muteToggleBtn` (vía `setMuteButtonState`), y remueve `hidden` de `#audioSettingsPanel`
  - `hideAudioSettingsPanel()`: agrega `hidden` a `#audioSettingsPanel`
  - `isAudioSettingsPanelVisible()`: retorna `boolean` leyendo `classList` de `#audioSettingsPanel`
  - `setMuteButtonState(isMuted)`: actualiza texto y `aria-pressed` de `#muteToggleBtn` según `isMuted`
  - `bindAudioSettingsHandlers({ onToggleSettings, onVolumeChange, onToggleMute, onCloseSettings })`: conecta los listeners de `#settingsBtn` (`click`), `#volumeSlider` (`input`, pasando `Number(e.target.value)`), `#muteToggleBtn` (`click`) y `#closeAudioSettingsBtn` (`click`), siguiendo el mismo patrón que `bindInputHandlers`/`bindLeaderboardControls`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.3_

  - [ ]* 7.1 Escribir prueba de propiedad: El panel de configuración refleja el estado vigente
    - **Property 7: El panel de configuración refleja el estado vigente**
    - **Validates: Requirements 3.2, 5.3**
    - Generar aleatoriamente `Effective_Volume`/`Mute_State`, aplicarlos al `Background_Music_Player`, llamar `showAudioSettingsPanel(music.getEffectiveVolumePercent(), music.isMuted())` y verificar que el valor del slider mockeado y el estado del botón de mute coinciden con los valores aplicados
    - Comentario de tag: `// Feature: background-music-controls, Property 7: El panel de configuración refleja el estado vigente`
    - Configurar mínimo 100 iteraciones

  - [ ]* 7.2 Escribir pruebas unitarias de comportamiento del panel
    - Verificar que alternar dos veces `#settingsBtn` con el panel visible lo oculta sin modificar `Effective_Volume`/`Mute_State` (Requirement 3.3)
    - Verificar que activar `#closeAudioSettingsBtn` oculta el panel sin modificar `Effective_Volume`/`Mute_State` (Requirement 3.4)
    - Verificar que `#settingsBtn` permanece visible y responde a interacción en cualquiera de las cuatro pantallas del juego (Requirement 3.1)
    - _Requirements: 3.1, 3.3, 3.4_

- [x] 8. Integrar `music.js` y las nuevas funciones de `screens.js` en `src/main.js`
  - Importar `music` desde `./audio/music.js` en `src/main.js`
  - Llamar a `music.init()` junto al bloque de inicialización existente (junto a la llamada a `scoreManager.initialize()`)
  - En `onStart()`, invocar `music.notifyUserInteraction()` seguido de `music.enterBuildScreen()` antes de `gameState.screen = 'build'`
  - En `onDrop()`, rama `result.type === 'fell'`, invocar `music.enterFallingScreen()` inmediatamente después de `engine.triggerFall(...)`
  - Dentro del `setTimeout` de `onDrop()` que ejecuta `gameState.screen = 'gameover'`, invocar `music.enterInactiveScreen()`
  - En `loop()`, rama `updateResult.shouldStartBoss`, invocar `music.enterBossScreen()`
  - En `endFight(won)`, rama `won === true`, invocar `music.enterBuildScreen()`
  - En `endFight(won)`, rama `won === false`, invocar `music.enterFallingScreen()` junto a `engine.triggerFall(...)`, y dentro de su `setTimeout` que ejecuta `gameState.screen = 'gameover'`, invocar `music.enterInactiveScreen()`
  - En `onRetry()`, invocar `music.enterBuildScreen()` antes de `gameState.screen = 'build'`
  - Definir las funciones locales `onToggleAudioSettings`, `onVolumeChange`, `onToggleMute`, `onCloseAudioSettings` (llamando primero a `music.notifyUserInteraction()` en las tres primeras) y cablearlas mediante `ui.bindAudioSettingsHandlers({ onToggleSettings: onToggleAudioSettings, onVolumeChange, onToggleMute, onCloseAudioSettings })`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.2, 3.3, 4.1, 4.2, 5.1, 7.2, 7.3_

  - [ ]* 8.1 Escribir pruebas unitarias de integración de los puntos de transición en `main.js`
    - Verificar que cada punto de la tabla de integración del diseño (`onStart`, `onDrop`, `loop`, `endFight`, `onRetry`) dispara la llamada `music.*` correspondiente en la rama esperada, usando spies sobre el módulo `music`
    - Verificar que `onStart()` invoca `music.notifyUserInteraction()` antes de `music.enterBuildScreen()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.2, 7.3_

- [x] 9. Checkpoint final - Ensure all tests pass, ask the user if questions arise.
  - Ejecutar la suite completa de pruebas (`vitest run`)
  - Ejecutar `npm run build` para confirmar que el proyecto compila sin errores con los nuevos archivos y el nuevo marcado en `index.html`
  - Confirmar manualmente por inspección de código que `sfx.js` no fue modificado en su comportamiento y que los efectos de sonido existentes siguen despachándose desde los mismos puntos de `main.js`/`screens.js`
  - Confirmar que el servidor de desarrollo (`npm run dev`, a ejecutar manualmente por el usuario) carga el juego sin errores de consola relacionados con `music.js` o el nuevo marcado de `index.html`

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas) y pueden omitirse para un MVP más rápido, pero se recomienda implementarlas para validar las 7 Correctness Properties del diseño.
- Cada tarea referencia requisitos específicos de `requirements.md` para trazabilidad.
- `TRACK_FILES.combat` usa `'music_combat.wav'` (no `.mp3`), corrigiendo la referencia de `design.md` para que coincida con el archivo real en `public/audio/`.
- Las pruebas de propiedad usan `fast-check` (ya en `devDependencies`) con mínimo 100 iteraciones cada una, y mocks/stubs de `HTMLAudioElement` (vía `jsdom`, ya en `devDependencies`) para simular reproducción, fallos y posiciones de forma determinista y sin depender de archivos de audio reales.
- Ningún requisito de estilo/accesibilidad completo (UX del panel, WCAG) se valida mediante pruebas automatizadas; requeriría revisión manual adicional.
