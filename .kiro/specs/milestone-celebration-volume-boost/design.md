# Milestone Celebration Volume Boost — Diseño del Bugfix

## Overview

Este documento cubre el diseño técnico para tres problemas relacionados con el flujo de celebración al vencer un guardián:

- **Bug 1 — Volumen de celebración muy bajo**: `playMilestoneAudio` aplica directamente el volumen de la música (por defecto 6%) sin multiplicador, resultando en un sonido prácticamente inaudible.
- **Bug 2 — Confeti no visible**: `showMilestoneCelebration` se llama en el mismo tick que `hideBossScreen()`, antes de que la transición CSS de `#bossScreen` (z-index 100) termine, tapando el canvas de confeti (z-index 15).
- **Feature — Multiplicador de volumen configurable**: añadir un control en el panel de audio para que el jugador ajuste el boost de celebración (1.0×–3.0×, por defecto 1.5×) con persistencia en `localStorage`.

La estrategia es mínima e incremental: no se modifica `computeEffectiveVolume` ni `showMilestoneCelebration`, se añade estado interno en `milestoneSfx` siguiendo el patrón de `combatSfx`, y el delay se inserta en `endFight` dentro de `main.js`.

---

## Glossary

- **Bug_Condition (C)**: El conjunto de condiciones que activan uno de los dos bugs descritos.
- **Property (P)**: El comportamiento correcto esperado cuando se cumple la Bug_Condition.
- **Preservation**: Comportamientos existentes que no deben cambiar como resultado del fix.
- **boostMultiplier**: Multiplicador interno del módulo `milestoneSfx` (rango `[1.0, 3.0]`, por defecto `1.5`). Amplifica el volumen efectivo de celebración respecto al volumen base de música.
- **computeEffectiveVolume(volumePercent, muted)**: Función pura existente en `milestoneSfx.js` que convierte `volumePercent ∈ [0, 100]` y `muted: boolean` a un volumen `∈ [0, 1]`. **No se modifica.**
- **playMilestoneAudio(floorNumber)**: Método público de `milestoneSfx` que selecciona y reproduce el sonido de hito. **Se extiende** para aplicar el `boostMultiplier`.
- **endFight(won)**: Función en `main.js` que cierra el combate; cuando `won === true` llama a `showMilestoneCelebration`. **Se modifica** para añadir un delay de 1000 ms.
- **CELEBRATION_BOOST_KEY**: Clave `'torre-nubes-celebration-boost'` en `localStorage` para persistir el `boostMultiplier`.
- **hideBossScreen()**: Función en `screens.js` que añade `.hidden` a `#bossScreen`. La transición CSS de cierre dura ~1000 ms; hasta que no concluye, `#bossScreen` sigue visible por encima del canvas de confeti.

---

## Bug Details

### Bug 1 — Volumen de celebración muy bajo

#### Bug Condition

El bug se manifiesta cada vez que `playMilestoneAudio` calcula el volumen sin aplicar ningún multiplicador: el volumen base de música (por defecto 6%) se usa directamente como volumen de reproducción.

```
FUNCTION isBugCondition_Bug1(input)
  INPUT: input = { floorNumber: number, volCtx: { volume: number, muted: boolean } }
  OUTPUT: boolean

  RETURN selectMilestoneSound(input.floorNumber) !== 'none'
         AND input.volCtx.muted === false
         AND noBoostMultiplierApplied()
         // En el código actual: volumen = volCtx.volume * 100 / 100 = volCtx.volume
         // El multiplier nunca se aplica porque no existe como estado del módulo
END FUNCTION
```

#### Ejemplos concretos

- `floorNumber = 15`, `volCtx.volume = 0.06` (default): el sonido se reproduce a `0.06` (6%) en lugar de `Math.min(1, 0.06 * 1.5) = 0.09` (9%).
- `floorNumber = 30`, `volCtx.volume = 0.8`: el sonido se reproduce a `0.8` en lugar de `Math.min(1, 0.8 * 1.5) = 1.0`.
- `floorNumber = 15`, `volCtx.muted = true`: sin cambio — el sonido ya era 0 y sigue siendo 0 (caso preservado).

---

### Bug 2 — Confeti no visible

#### Bug Condition

El bug se manifiesta cuando `showMilestoneCelebration` es llamada inmediatamente después de `hideBossScreen()`, antes de que la transición CSS de `#bossScreen` concluya.

```
FUNCTION isBugCondition_Bug2(callSequence)
  INPUT: callSequence = secuencia de llamadas en endFight(true)
  OUTPUT: boolean

  RETURN hideBossScreenCalledAt(t0)
         AND showMilestoneCelebrationCalledAt(t0)  // mismo tick (sin delay)
         AND bossScreenTransitionDuration > 0       // ~1000 ms en CSS actual
         // Resultado: confeti (z-index 15) tapado por #bossScreen (z-index 100)
         //            durante ~1000 ms de la animación de cierre
END FUNCTION
```

#### Ejemplos concretos

- `endFight(true)` se llama → `hideBossScreen()` añade `.hidden` a `#bossScreen` → en el mismo tick, `showMilestoneCelebration` crea el canvas de confeti con z-index 15 → `#bossScreen` todavía cubre la pantalla durante ~1 segundo → el jugador no percibe el confeti.
- Con delay de 1000 ms: `hideBossScreen()` → el canvas de confeti se crea 1000 ms después, cuando `#bossScreen` ya no es visible → el confeti se muestra correctamente.

---

## Expected Behavior

### Preservation Requirements

**Comportamientos que NO deben cambiar:**

- `computeEffectiveVolume(volumePercent, muted)` mantiene su firma y semántica exactas — los tests existentes deben seguir pasando sin modificación.
- Cuando `volCtx.muted === true`, `playMilestoneAudio` sigue reproduciendo a volumen 0, independientemente del `boostMultiplier`.
- Cuando `selectMilestoneSound(floorNumber)` devuelve `'none'`, `playMilestoneAudio` sigue retornando sin reproducir nada.
- `endFight(false)` no muestra confeti ni reproduce sonido de celebración; el delay de 1000 ms solo afecta al camino `won === true`.
- La transición de estado `gameState.screen = 'build'` y la llamada `music.enterBuildScreen()` ocurren **inmediatamente** en `endFight(true)`, sin verse afectadas por el delay de la celebración visual/sonora.
- Los controles preexistentes del panel de audio (volumen de música, mute, volumen de combate, mute de combate) siguen funcionando de forma independiente al nuevo control de boost.
- Con `prefers-reduced-motion` activo, el confeti sigue omitido y solo se muestra el mensaje de piso; el delay de 1000 ms se aplica igualmente.
- La clave de localStorage existente usada por `combatSfx` (`'torre-nubes-combat-sfx-pref'`) no se toca.

**Scope:**
Todas las entradas que no impliquen `playMilestoneAudio` con un piso múltiplo de 15/30, o que no sean la ruta `endFight(true)`, deben quedar completamente sin afectar.

---

## Hypothesized Root Cause

### Bug 1 — Volumen de celebración muy bajo

1. **Ausencia de estado de boost en el módulo**: `milestoneSfx` no tiene ninguna variable `boostMultiplier` ni expone API para configurarla. El volumen se calcula directamente como `computeEffectiveVolume(volCtx.volume * 100, volCtx.muted)`, que produce `volCtx.volume` — sin ningún amplificador.

2. **Diseño de integración incompleto**: al introducir `milestoneSfx`, se conectó al contexto de volumen de música pero no se consideró que la música de fondo tiene un volumen por defecto muy bajo (6%) para no interferir con el gameplay, mientras que un sonido de celebración de victoria debería ser notablemente más audible.

### Bug 2 — Confeti no visible

3. **Llamada síncrona sin delay tras hideBossScreen**: en `endFight(true)`, la línea `showMilestoneCelebration(floorNumber)` se ejecuta en el mismo tick que `ui.hideBossScreen()`. La función `hideBossScreen` solo añade la clase `.hidden`, pero la transición CSS de cierre de `#bossScreen` tarda ~1000 ms. Durante ese tiempo, `#bossScreen` con z-index 100 sigue tapando el canvas de confeti con z-index 15.

4. **z-index incompatible entre capas**: el Confetti_Overlay tiene z-index 15 (diseñado para estar sobre el canvas del juego), pero por debajo de los overlays de UI como `#bossScreen` (z-index 100). Sin el delay, esta jerarquía hace que el confeti sea invisible durante la transición.

---

## Correctness Properties

Property 1: Bug Condition — Boost de volumen aplicado en celebración

_For any_ llamada a `milestoneSfx.playMilestoneAudio(floorNumber)` donde `selectMilestoneSound(floorNumber) !== 'none'` y `volCtx.muted === false`, la función corregida SHALL calcular el volumen de reproducción como `Math.min(1, volCtx.volume * boostMultiplier)`, garantizando que el audio de celebración se reproduce más alto que el volumen base de música cuando `boostMultiplier > 1.0`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Mute y casos sin sonido

_For any_ llamada a `milestoneSfx.playMilestoneAudio(floorNumber)` donde `volCtx.muted === true` O donde `selectMilestoneSound(floorNumber) === 'none'`, la función corregida SHALL producir exactamente el mismo resultado que la función original: volumen 0 en modo mute, o retorno sin acción cuando no corresponde ningún sonido.

**Validates: Requirements 3.1, 3.2**

Property 3: Bug Condition — Confeti visible tras cierre de bossScreen

_For any_ invocación de `endFight(true)`, el sistema corregido SHALL retrasar la llamada a `showMilestoneCelebration` al menos 1000 ms después de `hideBossScreen()`, garantizando que el confeti se renderiza cuando `#bossScreen` ya no cubre la pantalla.

**Validates: Requirements 2.4, 2.5**

Property 4: Preservation — endFight(true) no retrasa transición de estado

_For any_ invocación de `endFight(true)`, la función corregida SHALL asignar `gameState.screen = 'build'` y llamar `music.enterBuildScreen()` en el mismo tick síncrono (sin delay), preservando la lógica de estado de juego independiente del delay de la celebración visual.

**Validates: Requirements 3.4, 3.6**

Property 5: Preservation — Boost persistido y restaurado

_For any_ valor de `boostMultiplier` en `[1.0, 3.0]` guardado mediante `milestoneSfx.setBoost(v)`, la función corregida SHALL restaurar ese mismo valor tras `milestoneSfx.init(getVolCtx)` en una sesión nueva (leyendo desde `localStorage`).

**Validates: Requirements 2.7, 2.8**

---

## Fix Implementation

### Cambios requeridos

#### 1. `src/audio/milestoneSfx.js` — Añadir estado de boost

**Cambios específicos:**

- Declarar `const CELEBRATION_BOOST_KEY = 'torre-nubes-celebration-boost'` y `const DEFAULT_BOOST = 1.5`.
- Declarar variable de módulo `let _boostMultiplier = DEFAULT_BOOST`.
- Añadir `loadBoostPreference()`: lee `localStorage.getItem(CELEBRATION_BOOST_KEY)`, parsea como número, valida rango `[1.0, 3.0]`; retorna el valor o `null` si inválido/ausente.
- Añadir `saveBoostPreference(v)`: `localStorage.setItem(CELEBRATION_BOOST_KEY, String(v))` con try/catch.
- Extender `init(getVolCtx)`: además de almacenar `_getVolCtx`, llamar `loadBoostPreference()` y asignarlo a `_boostMultiplier` si válido.
- Modificar `playMilestoneAudio`: cambiar el cálculo del volumen efectivo de:
  ```js
  const effectiveVolume = computeEffectiveVolume(volCtx.volume * 100, volCtx.muted);
  ```
  a:
  ```js
  const boostedVolume = Math.min(1, volCtx.volume * _boostMultiplier);
  const effectiveVolume = volCtx.muted ? 0 : boostedVolume;
  ```
  (No se llama a `computeEffectiveVolume` con el boost para no alterar la firma/semántica de esa función.)
- Exportar `setBoost(v)`: valida `v` en `[1.0, 3.0]`, asigna `_boostMultiplier = v`, llama `saveBoostPreference(v)`.
- Exportar `getBoost()`: retorna `_boostMultiplier`.

#### 2. `src/main.js` — Delay de celebración en endFight

**Cambios específicos:**

- Añadir import de `milestoneSfx.setBoost` / `getBoost` (o usar `milestoneSfx.setBoost`).
- En `endFight(won)`, en el bloque `if (won)`, envolver `showMilestoneCelebration` y `milestoneSfx.playMilestoneAudio` en un `setTimeout`:
  ```js
  if (won) {
    engine.applyDuelWinSpeedBoost(gameState);
    sfx.win();
    gameState.doorsPassed += 1;
    gameState.screen = 'build';
    gameState.pendingBossLevel = 0;
    music.enterBuildScreen();
    setTimeout(() => {
      const floorNumber = gameState.floors.length - 1;
      showMilestoneCelebration(floorNumber);
      milestoneSfx.playMilestoneAudio(floorNumber);
    }, 1000);
    playWinSequence();  // ya estaba antes del endFight
  }
  ```
  **Nota importante**: `gameState.screen = 'build'`, `gameState.doorsPassed += 1` y `music.enterBuildScreen()` permanecen síncronos. Solo `showMilestoneCelebration` y `playMilestoneAudio` van dentro del `setTimeout`.
- Añadir handler `onCelebrationBoostChange(value)`:
  ```js
  function onCelebrationBoostChange(value) {
    milestoneSfx.setBoost(value);
    ui.setCelebrationBoostDisplay(value);
  }
  ```
- Pasar `onCelebrationBoostChange` a `ui.bindAudioSettingsHandlers`.
- Pasar `milestoneSfx.getBoost()` como `celebrationBoostValue` a `ui.showAudioSettingsPanel`.

#### 3. `src/ui/screens.js` — Nuevo control en el panel de audio

**Cambios específicos:**

- Extender la firma de `showAudioSettingsPanel` para aceptar un quinto parámetro `celebrationBoostValue`:
  ```js
  export function showAudioSettingsPanel(volumePercent, isMuted, combatSfxVolumePercent, combatSfxIsMuted, celebrationBoostValue)
  ```
  Dentro de la función, añadir:
  ```js
  document.getElementById('celebrationBoostSlider').value = celebrationBoostValue;
  setCelebrationBoostDisplay(celebrationBoostValue);
  ```
- Añadir función exportada `setCelebrationBoostDisplay(value)` que actualiza el texto del label de valor del slider:
  ```js
  export function setCelebrationBoostDisplay(value) {
    const el = document.getElementById('celebrationBoostValue');
    if (el) el.textContent = Number(value).toFixed(1) + '×';
  }
  ```
- Extender `bindAudioSettingsHandlers` para aceptar `onCelebrationBoostChange` y enlazar el slider:
  ```js
  document.getElementById('celebrationBoostSlider').addEventListener('input', (e) =>
    onCelebrationBoostChange(Number(e.target.value))
  );
  ```

#### 4. `index.html` — Añadir control al panel de audio

**Cambios específicos:**

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

---

## Testing Strategy

### Enfoque de validación

La estrategia sigue el modelo de dos fases del bug condition methodology:
1. **Exploración**: confirmar que el código sin corregir exhibe el bug.
2. **Verificación**: confirmar que el código corregido satisface las propiedades y no introduce regresiones.

Los tests siguen el patrón `fast-check` + `readFileSync` ya establecido en el proyecto.

---

### Exploratory Bug Condition Checking

**Objetivo**: Ejecutar tests sobre el código NO corregido para confirmar la causa raíz y obtener contraejemplos concretos. Si no falla, revisar la hipótesis de causa raíz.

**Plan de tests** (sobre código sin corregir):

1. **Test de volumen sin boost** (fallará en código sin corregir):
   Configurar `_getVolCtx` para devolver `{ volume: 0.06, muted: false }`, llamar `playMilestoneAudio(15)`, capturar el `audioEl.volume` asignado. Expected: `0.09`. Actual sin corregir: `0.06`.

2. **Test de boost ignorado tras setBoost** (fallará en código sin corregir):
   Llamar `milestoneSfx.setBoost(2.0)` (aún no existe) → `playMilestoneAudio(15)` → verificar volumen `Math.min(1, 0.06 * 2.0) = 0.12`. Sin corregir: el método no existe.

3. **Test de confeti inmediato** (fallará en código sin corregir):
   Simular `endFight(true)` y verificar que `showMilestoneCelebration` es llamada dentro del mismo tick. Con la corrección, debe llamarse después de 1000 ms.

**Contraejemplos esperados**:
- `audioEl.volume` será igual a `volCtx.volume` (sin multiplicar) en el código sin corregir.
- `milestoneSfx.setBoost` no existirá en el código sin corregir → `TypeError`.

---

### Fix Checking

**Objetivo**: Para todos los inputs donde la Bug_Condition se cumple, la función corregida produce el comportamiento esperado.

```
FOR ALL input WHERE isBugCondition_Bug1(input) DO
  result := playMilestoneAudio_fixed(input.floorNumber)
  ASSERT audioEl.volume === Math.min(1, input.volCtx.volume * boostMultiplier)
END FOR

FOR ALL input WHERE isBugCondition_Bug2(input) DO
  result := endFight_fixed(true)
  ASSERT showMilestoneCelebration called after >= 1000ms
  ASSERT gameState.screen === 'build' set synchronously
END FOR
```

---

### Preservation Checking

**Objetivo**: Para todos los inputs donde la Bug_Condition NO se cumple, el comportamiento es idéntico al original.

```
FOR ALL input WHERE NOT isBugCondition_Bug1(input) DO
  ASSERT playMilestoneAudio_original(input) === playMilestoneAudio_fixed(input)
END FOR

FOR ALL input WHERE NOT isBugCondition_Bug2(input) DO
  ASSERT endFight_original(false) === endFight_fixed(false)
END FOR
```

**Enfoque con property-based testing**: se generan aleatoriamente combinaciones de `floorNumber`, `volCtx.volume` y `volCtx.muted` para verificar que los casos de preservación (mute, sin sonido) son estables.

---

### Unit Tests

Archivo: `src/audio/milestoneSfx.test.js` (nuevo archivo de tests o extensión del existente)

- Verificar que `setBoost(1.5)` asigna el multiplicador y `getBoost()` lo devuelve.
- Verificar que `playMilestoneAudio(15)` con `volume=0.06, muted=false, boost=1.5` produce `audioEl.volume = 0.09`.
- Verificar que `playMilestoneAudio(15)` con `muted=true` produce `audioEl.volume = 0` independientemente del boost.
- Verificar que `playMilestoneAudio(10)` (no múltiplo de 15) retorna sin crear audio.
- Verificar que `setBoost(2.0)` + `volume=0.8` produce `audioEl.volume = 1.0` (techo aplicado).
- Verificar que `loadBoostPreference` con valor inválido en localStorage retorna `null` y se usa el default.
- Verificar que `init` restaura el boost desde localStorage si el valor es válido.

Archivo: `src/main.test.js` o tests de integración

- Verificar que en `endFight(true)`, `gameState.screen` y `music.enterBuildScreen()` ocurren síncronamente.
- Verificar que `showMilestoneCelebration` y `playMilestoneAudio` se llaman después de 1000 ms.
- Verificar que `endFight(false)` no llama a `showMilestoneCelebration`.

---

### Property-Based Tests

Usando `fast-check` siguiendo el patrón del proyecto:

- **Boost dentro del rango correcto**: para cualquier `volume ∈ [0, 1]`, `boost ∈ [1.0, 3.0]`, `muted = false`, el volumen resultante siempre es `≤ 1.0` y `≥ volume` (el boost nunca reduce el volumen).
- **Mute siempre gana**: para cualquier combinación de `volume` y `boost`, si `muted = true`, el volumen resultante es siempre `0`.
- **Persistencia round-trip**: para cualquier `boost ∈ [1.0, 3.0]`, `setBoost(boost)` seguido de `loadBoostPreference()` devuelve exactamente el mismo valor.
- **Pisos sin sonido preservados**: para cualquier `floorNumber` donde `floorNumber % 15 !== 0`, `playMilestoneAudio` no crea ningún elemento de audio.

---

### Integration Tests

- Flujo completo de combate ganado → verificar que el confeti aparece visualmente tras el delay y no está tapado.
- Panel de audio → ajustar el slider de boost → cerrar panel → vencer guardián → verificar que el volumen de celebración es proporcional al boost configurado.
- Reiniciar el juego → verificar que el boost persiste desde localStorage y se refleja en el slider.
- Verificar que la música de fondo no se ve afectada al ajustar el slider de boost de celebración.
