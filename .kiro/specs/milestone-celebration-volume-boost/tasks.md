# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Volumen de celebración sin boost aplicado
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist
  - **Scoped PBT Approach**: Para Bug 1, usar `volume ∈ [0.01, 1]` y `boost = DEFAULT_BOOST (1.5)` para confirmar que el volumen de reproducción asignado es `volCtx.volume` en lugar de `Math.min(1, volCtx.volume * 1.5)`. Para Bug 2, verificar estáticamente que `showMilestoneCelebration` se llama en el mismo tick que `hideBossScreen()` en el código sin corregir (inspección del código fuente o mock de setTimeout).
  - **En `src/audio/milestoneSfx.test.js`**: añadir suite `describe('Bug Condition — Bug 1: playMilestoneAudio sin boost')`:
    - Configurar `milestoneSfx.init(() => ({ volume: 0.06, muted: false }))`
    - Mockear `Audio` con `MockAudio` que captura `.volume` asignado
    - Llamar `milestoneSfx.playMilestoneAudio(15)` y verificar que `audioEl.volume === Math.min(1, 0.06 * 1.5)` → `0.09`
    - En código sin corregir el test falla: `audioEl.volume` será `0.06` (sin boost)
  - **En `src/audio/milestoneSfx.test.js`**: añadir test de que `milestoneSfx.setBoost` no existe (TypeError al intentar llamarla):
    - Verificar `typeof milestoneSfx.setBoost === 'undefined'` → en código sin corregir: `true` (confirma ausencia de la API)
  - **En `src/main.test.js`** (o nuevo archivo `src/integration/endFight.test.js`): añadir suite para Bug 2:
    - Inspección estática: leer el código fuente de `src/main.js` y verificar que `showMilestoneCelebration` se llama DESPUÉS de 1000 ms (dentro de `setTimeout`). En código sin corregir la llamada es síncrona → el test falla.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - they prove the bugs exist)
  - Document counterexamples:
    - Bug 1: `playMilestoneAudio(15)` con `volume=0.06` → `audioEl.volume = 0.06` en lugar de `0.09`
    - Bug 2: `showMilestoneCelebration` invocada sincrónicamente, no con delay de 1000 ms
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Comportamientos no afectados por el bugfix
  - **IMPORTANT**: Follow observation-first methodology
  - Observe comportamiento en código NO corregido para inputs donde `isBugCondition` es `false`:
    - `playMilestoneAudio(15)` con `muted=true` → `audioEl.volume = 0` (mute gana)
    - `playMilestoneAudio(7)` (no múltiplo de 15) → no se construye ningún `Audio` (sin sonido)
    - `endFight(false)` → `showMilestoneCelebration` nunca llamada
    - `computeEffectiveVolume(volumePercent, muted)` → firma y resultado inalterados
    - `gameState.screen = 'build'` y `music.enterBuildScreen()` ocurren síncronamente en `endFight(true)` (NO dentro del setTimeout)
  - **En `src/audio/milestoneSfx.test.js`**: añadir suite `describe('Property 2: Preservation — mute y pisos sin sonido')`:
    - PBT: para cualquier `volume ∈ [0, 1]` y `muted = true`, `playMilestoneAudio(15)` → `audioEl.volume === 0` (mute siempre gana)
    - PBT: para cualquier `floorNumber` donde `floorNumber % 15 !== 0`, `playMilestoneAudio(floorNumber)` no construye ningún `Audio` (usando `MockAudio` con contador de instancias)
    - PBT: para cualquier `volume ∈ [0, 1]`, `boost ∈ [1.0, 3.0]`, `muted = false`, el volumen resultante es `≤ 1.0` Y `≥ volume` (boost nunca reduce; techo a 1.0)
    - Unit: `computeEffectiveVolume(volumePercent, muted)` devuelve `muted ? 0 : volumePercent / 100` (firma inalterada, ya cubierto en tests existentes)
  - **En `src/audio/milestoneSfx.test.js`**: añadir test de persistencia round-trip (observación para confirmar comportamiento antes del fix):
    - PBT: para cualquier `boost ∈ [1.0, 3.0]` (con paso 0.1), `setBoost(boost)` seguido de `loadBoostPreference()` retorna el mismo valor (comportamiento esperado tras el fix; en código sin corregir falla porque `setBoost` no existe → confirma que es una preservación que debe añadirse)
  - **En `src/main.test.js`**: añadir test de preservación de `endFight(false)`:
    - Verificar estáticamente que `endFight(false)` (el camino de derrota) NO contiene llamadas a `showMilestoneCelebration` ni a `milestoneSfx.playMilestoneAudio`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests de mute y pisos sin sonido PASS (confirman baseline a preservar). Tests de round-trip y pisos sin boost (Property 1) FAIL en código sin corregir (se esperan como parte de la exploración).
  - Mark task complete when tests are written, run, and results documented
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

- [x] 3. Fix — Boost de volumen en `milestoneSfx` y delay de confeti en `endFight`

  - [x] 3.1 Añadir estado de boost en `src/audio/milestoneSfx.js`
    - Declarar `const CELEBRATION_BOOST_KEY = 'torre-nubes-celebration-boost'` y `const DEFAULT_BOOST = 1.5` al inicio del módulo, antes del bloque PRELOADED
    - Declarar variable de módulo `let _boostMultiplier = DEFAULT_BOOST`
    - Añadir función interna `loadBoostPreference()`: lee `localStorage.getItem(CELEBRATION_BOOST_KEY)`, parsea como número con `Number(...)`, valida rango `[1.0, 3.0]` y `Number.isFinite`; retorna el valor si válido, `null` si inválido/ausente; envuelve en try/catch que registra con `console.error` y retorna `null`
    - Añadir función interna `saveBoostPreference(v)`: llama `localStorage.setItem(CELEBRATION_BOOST_KEY, String(v))` con try/catch que registra con `console.error` y no relanza
    - Extender `milestoneSfx.init(getVolCtx)`: además de `_getVolCtx = getVolCtx`, llamar `const saved = loadBoostPreference(); if (saved !== null) _boostMultiplier = saved;`
    - Modificar `playMilestoneAudio`: reemplazar el cálculo actual `const effectiveVolume = computeEffectiveVolume(volCtx.volume * 100, volCtx.muted)` por:
      ```js
      const boostedVolume = Math.min(1, volCtx.volume * _boostMultiplier);
      const effectiveVolume = volCtx.muted ? 0 : boostedVolume;
      ```
    - Añadir `setBoost(v)` al objeto `milestoneSfx`: valida `typeof v === 'number' && Number.isFinite(v) && v >= 1.0 && v <= 3.0`; si válido, asigna `_boostMultiplier = v` y llama `saveBoostPreference(v)`
    - Añadir `getBoost()` al objeto `milestoneSfx`: retorna `_boostMultiplier`
    - _Bug_Condition: isBugCondition_Bug1(input) — selectMilestoneSound(floorNumber) !== 'none' AND volCtx.muted === false AND _boostMultiplier no aplicado en cálculo de volumen_
    - _Expected_Behavior: audioEl.volume === Math.min(1, volCtx.volume * _boostMultiplier); si muted, audioEl.volume === 0_
    - _Preservation: computeEffectiveVolume sin modificar; mute siempre produce 0; pisos no múltiplo de 15 no crean Audio_
    - _Requirements: 2.1, 2.2, 2.3, 2.7, 2.8, 3.1, 3.2_

  - [x] 3.2 Añadir delay de celebración en `src/main.js`
    - En la función `endFight(won)`, dentro del bloque `if (won) { ... }`, mover `showMilestoneCelebration(floorNumber)` y `milestoneSfx.playMilestoneAudio(floorNumber)` dentro de un `setTimeout(..., 1000)`:
      ```js
      if (won) {
        engine.applyDuelWinSpeedBoost(gameState);
        sfx.win();
        gameState.doorsPassed += 1;
        gameState.screen = 'build';
        gameState.pendingBossLevel = 0;
        music.enterBuildScreen();
        const floorNumber = gameState.floors.length - 1;
        setTimeout(() => {
          showMilestoneCelebration(floorNumber);
          milestoneSfx.playMilestoneAudio(floorNumber);
        }, 1000);
        playWinSequence();
      }
      ```
    - Verificar que `gameState.doorsPassed += 1`, `gameState.screen = 'build'`, `gameState.pendingBossLevel = 0` y `music.enterBuildScreen()` permanecen fuera del `setTimeout` (síncronos)
    - Añadir función `onCelebrationBoostChange(value)` en `main.js`:
      ```js
      function onCelebrationBoostChange(value) {
        milestoneSfx.setBoost(value);
        ui.setCelebrationBoostDisplay(value);
      }
      ```
    - Pasar `onCelebrationBoostChange` a `ui.bindAudioSettingsHandlers(...)` como nueva propiedad del objeto de handlers
    - Actualizar la llamada a `ui.showAudioSettingsPanel(...)` en `onToggleAudioSettings` para pasar `milestoneSfx.getBoost()` como quinto argumento
    - _Bug_Condition: isBugCondition_Bug2 — showMilestoneCelebration llamada en el mismo tick que hideBossScreen(), sin delay_
    - _Expected_Behavior: showMilestoneCelebration y playMilestoneAudio envueltas en setTimeout(..., 1000); gameState.screen y music.enterBuildScreen() síncronos_
    - _Preservation: endFight(false) no llama showMilestoneCelebration ni playMilestoneAudio; transición de estado síncrona_
    - _Requirements: 2.4, 2.5, 3.4, 3.6_

  - [x] 3.3 Extender `src/ui/screens.js` con control de boost de celebración
    - Extender la firma de `showAudioSettingsPanel` a `showAudioSettingsPanel(volumePercent, isMuted, combatSfxVolumePercent, combatSfxIsMuted, celebrationBoostValue)`:
      ```js
      document.getElementById('celebrationBoostSlider').value = celebrationBoostValue;
      setCelebrationBoostDisplay(celebrationBoostValue);
      ```
    - Añadir función exportada `setCelebrationBoostDisplay(value)`:
      ```js
      export function setCelebrationBoostDisplay(value) {
        const el = document.getElementById('celebrationBoostValue');
        if (el) el.textContent = Number(value).toFixed(1) + '×';
      }
      ```
    - Extender `bindAudioSettingsHandlers` para aceptar `onCelebrationBoostChange` en el objeto de handlers y enlazar el slider:
      ```js
      document.getElementById('celebrationBoostSlider').addEventListener('input', (e) =>
        onCelebrationBoostChange(Number(e.target.value))
      );
      ```
    - _Requirements: 2.6, 3.3, 3.7_

  - [x] 3.4 Añadir control slider en `index.html`
    - Dentro de `#audioSettingsPanel`, añadir un nuevo grupo de control tras el grupo de `combatSfx`:
      ```html
      <div class="audio-control-group">
        <label for="celebrationBoostSlider">
          Boost de celebración: <span id="celebrationBoostValue">1.5×</span>
        </label>
        <input
          id="celebrationBoostSlider"
          type="range"
          min="1.0"
          max="3.0"
          step="0.1"
          value="1.5"
          aria-label="Multiplicador de volumen de celebración"
        />
      </div>
      ```
    - Verificar que el orden de elementos en `#audioSettingsPanel` queda: volumen música → mute música → volumen combate → mute combate → boost celebración → botón cerrar
    - _Requirements: 2.6, 3.7_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Boost de volumen aplicado y confeti con delay
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - Re-ejecutar la suite `describe('Bug Condition — Bug 1: playMilestoneAudio sin boost')` de `src/audio/milestoneSfx.test.js`:
      - `playMilestoneAudio(15)` con `volume=0.06, muted=false` → `audioEl.volume === 0.09` (Math.min(1, 0.06 * 1.5))
      - `typeof milestoneSfx.setBoost === 'function'` → `true`
    - Re-ejecutar la suite de Bug 2 en `src/main.test.js` / `src/integration/endFight.test.js`:
      - Inspección estática confirma que `showMilestoneCelebration` está dentro de `setTimeout` con delay 1000 ms
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Comportamientos no afectados por el bugfix
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Re-ejecutar todas las suites de preservación de `src/audio/milestoneSfx.test.js`:
      - PBT mute siempre gana: `muted=true` → `audioEl.volume === 0` para cualquier `volume` y `boost`
      - PBT pisos sin sonido: `floorNumber % 15 !== 0` → no instancia `Audio`
      - PBT techo 1.0: `volume ∈ [0, 1]`, `boost ∈ [1.0, 3.0]` → `audioEl.volume ≤ 1.0`
      - PBT round-trip de boost: `setBoost(v)` → `loadBoostPreference()` retorna `v`
      - Unit `computeEffectiveVolume`: firma inalterada, tests existentes siguen pasando
    - Re-ejecutar suites de preservación de `src/main.test.js`:
      - `endFight(false)` no llama `showMilestoneCelebration`
      - `gameState.screen = 'build'` ocurre síncronamente (no dentro del setTimeout)
    - Re-ejecutar tests de audio preexistentes: `npm run test` completo sin regresiones
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Ejecutar `npm run test` (vitest run) y confirmar que todos los tests del proyecto pasan sin errores.
  - Verificar que no hay regresiones en los módulos relacionados: `sfx.test.js`, `combatSfx.test.js`, `milestoneSfx.test.js` (tests preexistentes), `fight.test.js`, `tower.test.js`.
  - Si algún test falla, diagnosticar la causa raíz antes de aplicar correcciones adicionales.
  - Verificar manualmente en el navegador (abrir `index.html`): vencer un guardián → el confeti aparece visible tras ~1 segundo, el sonido de celebración es claramente audible por encima de la música, y el slider de boost en el panel de audio funciona y persiste al recargar.
  - Verificar que los controles preexistentes del panel de audio (volumen música, mute, volumen combate, mute combate) siguen funcionando de forma independiente al nuevo slider.
  - Ensure all tests pass, ask the user if questions arise.
