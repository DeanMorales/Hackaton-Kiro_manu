# Design Document

## Overview

Esta funcionalidad introduce un nuevo módulo `Combat_Sfx_Player` (`src/audio/combatSfx.js`) que sincroniza la reproducción de `Character_Voice_Sound` con el inicio de cada `Sprite_Animation` del `Warrior_Sprite` y del `Boss_Sprite` activo durante un `Boss_Fight`, y extiende el `Audio_Settings_Panel` ya existente con un segundo par de controles (volumen + mute) dedicado exclusivamente a estos sonidos de combate.

El módulo se mantiene deliberadamente separado tanto de `src/audio/music.js` como de `src/audio/sfx.js`: no importa nada de ninguno de los dos, no comparte estado ni volumen, y tiene su propia clave de `localStorage`. `music.js` sigue gestionando exclusivamente las dos pistas de música de fondo; `sfx.js` sigue gestionando exclusivamente los efectos de sonido puntuales de UI/juego (`place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`, `flipCard`, `jump`) — de los cuales se elimina `attack`, que pasa a ser responsabilidad exclusiva del `Combat_Sfx_Player`.

A diferencia de `music.js` (que mantiene dos `HTMLAudioElement` persistentes para preservar `currentTime` entre pausas), el `Combat_Sfx_Player` crea un `new Audio(url)` nuevo en cada invocación de `.play(role, folderId, animName)`, de forma perezosa (sin precarga), porque cada `Character_Voice_Sound` es un disparo puntual sincronizado con el inicio de una animación — no existe un concepto de "reanudar desde donde se pausó" para estos sonidos, y precargar los `.wav` de los 5 bosses de antemano introduciría trabajo y acoplamiento innecesarios (ver Requirement 1.3 y la decisión de diseño más abajo).

El `Sprite_Animation_Engine` (`src/render/spriteEngine.js`), la lógica de combate (`src/combat/fight.js`) y la rotación de bosses (`src/data/bossRoster.js`) no se modifican en absoluto (Requirement 12): el `Combat_Sfx_Player` se integra únicamente envolviendo, en `src/main.js`, las invocaciones ya existentes de `.play(animName, ...)` sobre las instancias de `Sprite_Animation_Engine` del `warriorEngine` y del `bossEngine` activo.

## Architecture

```mermaid
flowchart TD
    subgraph SfxPlayer["Combat_Sfx_Player (src/audio/combatSfx.js)"]
        STATE[Estado del módulo:<br/>activeSounds Map,<br/>effectiveVolume, muted]
        PREF[Combat_Sfx_Stored_Preference<br/>localStorage]
    end

    MAIN["src/main.js<br/>playWarriorAnim / playBossAnim<br/>(envuelven warriorEngine.play / bossEngine.play)"] -->|combatSfx.play('warrior', 'guerrero', animName)| STATE
    MAIN -->|combatSfx.play('boss', bossEntry.id, animName)| STATE

    STATE -->|construye URL dinámica:<br/>/audio/guerrero/&lt;anim&gt;/&lt;anim&gt;.wav<br/>o /audio/bosses/&lt;bossId&gt;/&lt;anim&gt;/&lt;anim&gt;.wav| NEWAUDIO[new Audio url]
    NEWAUDIO -->|loop = animName === 'idle'| PLAY[audioElement.play]
    STATE -->|detiene entrada previa del mismo rol<br/>antes de reproducir la nueva| STATE

    STATE <-->|load/save| PREF

    UI["src/ui/screens.js<br/>Audio_Settings_Panel<br/>(2do slider + 2do mute)"] -->|setVolume, toggleMute| STATE

    ENGINE["src/render/spriteEngine.js<br/>SpriteAnimationEngine (sin cambios)"]
    MAIN -->|delega tras notificar a combatSfx| ENGINE
```

### Decisión: URL dinámica sin tabla de mapeo, en vez de importar `BOSS_ROSTER`

Se evaluaron dos estrategias para resolver la ruta de un `Character_Voice_Sound`:

1. **Importar `BOSS_ROSTER` desde `src/data/bossRoster.js` y construir una tabla de mapeo `{ bossId: { animName: url } }` en la inicialización.** Esto acoplaría el `Combat_Sfx_Player` a la estructura de `bossRoster.js` y obligaría a mantener la tabla sincronizada cada vez que se agregue un boss o una animación, contradiciendo directamente el Requirement 1.3 ("sin requerir una tabla de mapeo manual distinta por personaje o por animación").
2. **Construir la URL dinámicamente en el momento de la llamada a `.play(role, folderId, animName)`**, aplicando el `Sound_Folder_Convention` como una fórmula: `guerrero` → `/audio/guerrero/<animName>/<animName>.wav`; cualquier otro `folderId` (un `bossId`) → `/audio/bosses/<folderId>/<animName>/<animName>.wav`.

**Decisión**: construir la URL dinámicamente (opción 2). El `Combat_Sfx_Player` no importa `bossRoster.js` ni conoce la lista de bosses o de animaciones existentes; simplemente recibe el `folderId` y el `animName` que ya le pasa el `Main_Module` en cada invocación de `.play(...)` del `Sprite_Animation_Engine`, y deriva la ruta con una única fórmula. Esto satisface el Requirement 1.3 por construcción y hace que agregar un boss nuevo (o una animación nueva) a `bossRoster.js`/`Sound_Folder_Convention` no requiera ningún cambio en `combatSfx.js`.

### Decisión: `activeSounds` indexado por rol fijo (`'warrior'` / `'boss'`), no por `bossId`

Se evaluaron dos estrategias para rastrear el `Active_Character_Sound` de cada personaje y cumplir el Requirement 4 (ausencia de solapamiento):

1. **Indexar por identidad concreta del personaje** (`'warrior'`, o el `bossId` activo, p. ej. `'boss_1_titan_guerrero'`). Esto falla ante un cambio de boss: si el jugador termina un `Boss_Fight` contra `boss_1_titan_guerrero` y comienza uno nuevo contra `boss_2_orco`, el `idle` en bucle del boss anterior quedaría almacenado bajo la clave `'boss_1_titan_guerrero'`, mientras que la primera reproducción del boss nuevo buscaría/detendría la clave `'boss_2_orco'` — nunca encontraría ni detendría el sonido anterior, que seguiría sonando en bucle indefinidamente en segundo plano (fuga de audio), violando el Requirement 4.2.
2. **Indexar por un rol fijo de dos valores** (`'warrior'` o `'boss'`), independiente de qué `bossId` esté activo en cada momento.

**Decisión**: usar un `Map` con exactamente dos claves posibles, `'warrior'` y `'boss'` (opción 2). Cada entrada almacena `{ folderId, animName, audioElement }` (ver Data Models), de modo que la identidad concreta del personaje sigue disponible para el chequeo de deduplicación del Requirement 4.4, pero la búsqueda de "¿qué sonido del boss está activo ahora, sin importar cuál boss era?" siempre resuelve al mismo slot. Así, la primera invocación de `.play('boss', <nuevoBossId>, ...)` de un `Boss_Fight` nuevo encuentra y detiene correctamente cualquier sonido del boss anterior, sin necesidad de lógica especial de "cambio de boss": el comportamiento correcto emerge directamente de la estructura de la clave.

Una consecuencia directa de esta decisión es que el chequeo de "misma animación ya activa" del Requirement 4.4 debe comparar **tanto `folderId` como `animName`**, no solo `animName`: si se comparara únicamente `animName`, una reinvocación de `idle` para un boss nuevo (`folderId` distinto) inmediatamente después del `idle` en bucle de un boss anterior sería tratada erróneamente como una reinvocación no disruptiva (Requirement 2.1c), y el sonido del boss anterior nunca se detendría. Comparar ambos campos garantiza que solo una reinvocación genuinamente idéntica (mismo personaje, misma animación) sea un no-op.

## Components and Interfaces

### `Combat_Sfx_Player` (`src/audio/combatSfx.js`)

**Estado interno del módulo** (no exportado directamente, accesible vía getters de la API):

```js
const DEFAULT_VOLUME = 0.30; // Combat_Sfx_Default_Volume_Level: 30% del Base_Volume
const PREF_KEY = 'torre-nubes-combat-sfx-pref';

let activeSounds = new Map(); // 'warrior' | 'boss' -> { folderId, animName, audioElement }
let effectiveVolume = DEFAULT_VOLUME; // 0..1
let muted = false;
```

**Función interna `realVolume()`**, idéntica en forma a la de `music.js`:
```js
function realVolume() {
  return muted ? 0 : effectiveVolume;
}
```

**Función interna `buildUrl(folderId, animName)`**, la fórmula central que evita la tabla de mapeo manual (Requirement 1.3, 1.4):
```js
function buildUrl(folderId, animName) {
  const base = folderId === 'guerrero' ? 'guerrero' : `bosses/${folderId}`;
  return `/audio/${base}/${animName}/${animName}.wav`;
}
```

**Función interna `stopEntry(entry)`**: detiene una entrada previa de forma segura, sin propagar excepciones si el elemento ya falló o fue descartado (Requirement 11.3):
```js
function stopEntry(entry) {
  if (!entry) return;
  try {
    entry.audioElement.pause();
    entry.audioElement.currentTime = 0;
  } catch (_e) { /* swallow: elemento ya inválido o sin soporte de seek */ }
}
```

**Función pública `play(role, folderId, animName)`**: el núcleo del módulo, invocada de forma síncrona por los wrappers de `main.js` (Requirement 1.1, 1.2):
```js
function play(role, folderId, animName) {
  const current = activeSounds.get(role);
  if (current && current.folderId === folderId && current.animName === animName) {
    return; // Requirement 4.4 / 2.1(c): misma animación del mismo personaje ya activa, no-op
  }
  stopEntry(current); // Requirement 4.1, 4.2: detiene el Active_Character_Sound anterior del mismo rol

  if (typeof Audio === 'undefined') return; // Requirement 11: navegador sin soporte de Audio

  let audioElement;
  try {
    audioElement = new Audio(buildUrl(folderId, animName));
    audioElement.loop = animName === 'idle'; // Requirement 2 vs Requirement 3
    audioElement.volume = realVolume();
    audioElement.addEventListener('error', () => { /* swallow: Requirement 11.1 */ });
  } catch (_e) {
    return; // fallo de construcción: Requirement 11.1, sin registrar Active_Character_Sound
  }

  activeSounds.set(role, { folderId, animName, audioElement });

  try {
    const playPromise = audioElement.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => { /* swallow: Requirement 11.1, sin fallback sintetizado */ });
    }
  } catch (_e) { /* swallow: fallo síncrono de .play(), Requirement 11.1 */ }
}
```

Notas de diseño sobre esta función:
- La llamada a `audioElement.play()` ocurre de forma síncrona dentro de `play(role, folderId, animName)`, que a su vez es invocada de forma síncrona por los wrappers `playWarriorAnim`/`playBossAnim` antes de delegar al `Sprite_Animation_Engine` real — esto satisface el requisito de invocación síncrona del Requirement 1.1/1.2, siguiendo el mismo patrón fire-and-forget ya usado en `sfx.js` (`playAudioFile`/`dispatch`) y en `music.js` (`safePlay`). La resolución real de la reproducción en el navegador y de la Promise devuelta por `.play()` sigue siendo asíncrona, pero eso no afecta el punto de invocación.
- Un fallo en cualquier etapa (construcción de `Audio`, `.play()` síncrono, o rechazo de la Promise) nunca registra una entrada en `activeSounds`, salvo que el fallo ocurra únicamente en el intento de reproducción después de ya haber sido registrada (rechazo asíncrono de la Promise): en ese caso la entrada permanece registrada como el `Active_Character_Sound` "vigente" a efectos de deduplicación (Requirement 4.4), pero al no sonar nada no hay solapamiento audible; una animación posterior distinta la detendrá y reemplazará con normalidad (Requirement 11.4), y el `pause()`/`currentTime = 0` de `stopEntry` sobre un elemento que nunca llegó a reproducir no lanza excepción.
- Fallos del `Warrior_Sprite` y del `Boss_Sprite` son completamente independientes porque cada rol tiene su propia entrada en el `Map` y su propio `HTMLAudioElement`: un fallo al reproducir el sonido del guerrero nunca toca la entrada `'boss'` (Requirement 11.2).

**Función interna `applyVolumeToActiveSounds()`**: recorre `activeSounds.values()` y asigna `realVolume()` a cada `audioElement.volume` sin pausar ni reiniciar la reproducción (Requirement 9.1, 9.2, 9.3).

**Funciones internas `loadPreference()` / `savePreference(volume, muted)`**: mismo patrón que `music.js`, bajo la clave `PREF_KEY = 'torre-nubes-combat-sfx-pref'`; `loadPreference()` valida que el valor almacenado sea un objeto con `volume` numérico finito en `[0, 1]` y `muted` estrictamente booleano, descartando (retornando `null`) cualquier otro caso (Requirement 8.5); `savePreference()` envuelve `localStorage.setItem` en try/catch sin relanzar (Requirement 8.2).

#### API pública

```js
export const combatSfx = {
  init(),                        // Carga Combat_Sfx_Stored_Preference (o Combat_Sfx_Default_Volume_Level)
  play(role, folderId, animName), // role: 'warrior' | 'boss'
  setVolume(volumePercent),      // 0..100 -> effectiveVolume = volumePercent/100; aplica y persiste
  toggleMute(),                  // Invierte muted; aplica y persiste
  getEffectiveVolumePercent(),   // 0..100, para reflejar el Combat_Sfx_Volume_Slider al abrir el panel
  isMuted(),                     // boolean, para reflejar el control de mute al abrir el panel
};
```

`init()` no crea ni precarga ningún `HTMLAudioElement` (a diferencia de `music.js`): solo resuelve `effectiveVolume`/`muted` desde `Combat_Sfx_Stored_Preference` o desde `Combat_Sfx_Default_Volume_Level`, ya que cada `Character_Voice_Sound` se crea perezosamente en cada `play(...)`.

### Puntos de integración en `src/main.js`

Se añaden dos funciones locales que envuelven las invocaciones existentes de `.play(...)` del `Sprite_Animation_Engine`, y se sustituye cada llamada directa a `combatUiState.warriorEngine.play(...)` / `combatUiState.bossEngine.play(...)` por la llamada al wrapper correspondiente, preservando exactamente la misma semántica de `await`/retorno de Promise:

```js
function playWarriorAnim(name, opts) {
  combatSfx.play('warrior', 'guerrero', name);
  return combatUiState.warriorEngine.play(name, opts);
}
function playBossAnim(name, opts) {
  combatSfx.play('boss', combatUiState.bossEntry.id, name);
  return combatUiState.bossEngine.play(name, opts);
}
```

| Punto en `main.js` | Cambio | Requirement |
|---|---|---|
| Inicialización del módulo (junto a `music.init()`) | Se añade `combatSfx.init()` | 7.1, 8.3, 8.4, 8.5 |
| `resumeIdleBoth()` | `combatUiState.warriorEngine.play('idle')` → `playWarriorAnim('idle')`; `combatUiState.bossEngine.play('idle')` → `playBossAnim('idle')` | 2.1, 2.2 |
| `playFailureReaction()` | `combatUiState.bossEngine.play(attackAnim, { once: true })` → `playBossAnim(attackAnim, { once: true })`; `combatUiState.warriorEngine.play(reactionAnim, { once: true })` → `playWarriorAnim(reactionAnim, { once: true })` | 1.1, 1.2, 1.4, 3.1, 4.1 |
| `playWinSequence()` | Se elimina la línea `sfx.attack();`; `combatUiState.warriorEngine.play('ataque', { once: true })` → `playWarriorAnim('ataque', { once: true })`; `combatUiState.bossEngine.play('herido', { once: true })` → `playBossAnim('herido', { once: true })`; `combatUiState.bossEngine.play('morir', { once: true })` → `playBossAnim('morir', { once: true })` | 5.3, 5.5, 1.1, 1.2 |
| `playLoseSequence()` | `combatUiState.warriorEngine.play('morir', { once: true })` → `playWarriorAnim('morir', { once: true })` (la reacción de fallo ya pasa por `playFailureReaction()`) | 1.1 |
| `playCorrectNonResolvingSequence(cardEl)` | Se elimina la línea `sfx.attack();`; `combatUiState.warriorEngine.play('ataque', { once: true })` → `playWarriorAnim('ataque', { once: true })`; `combatUiState.bossEngine.play('herido', { once: true })` → `playBossAnim('herido', { once: true })` | 5.4, 5.5, 1.1, 1.2 |
| `playIncorrectNonResolvingSequence()` | Sin llamadas directas propias (delega en `playFailureReaction()`); sin cambios adicionales | — |
| Bloque de inicio de `Boss_Fight` dentro de `loop()` | `combatUiState.warriorEngine.play('idle')` → `playWarriorAnim('idle')`; `combatUiState.bossEngine.play('idle')` → `playBossAnim('idle')` | 2.1, 4.2 |
| `src/audio/sfx.js`: `AUDIO_MAP` | Se elimina la entrada `attack: 'guerrero/ataque/attack_sword.wav'` | 5.1 |
| `src/audio/sfx.js`: objeto exportado `sfx` | Se elimina la propiedad `attack:()=>dispatch('attack')` | 5.2 |

Como `attackAnim` en `playFailureReaction()` es siempre una animación del `Boss_Sprite` (`ataque` o, para el `Alternating_Attack_Boss`, `ataque_1`/`ataque_2`), y `reactionAnim` es siempre una animación del `Warrior_Sprite` (`bloqueo` o `herido`), el `folderId` correcto para cada wrapper se resuelve automáticamente según cuál wrapper se invoca — no se necesita lógica adicional para distinguir `ataque_1` de `ataque_2` (Requirement 1.4): `playBossAnim` simplemente pasa el `animName` recibido, que ya es exactamente `'ataque_1'` o `'ataque_2'` según lo decidido por la lógica existente de alternancia en `playFailureReaction()`.

### Extensión del `Audio_Settings_Panel` (`index.html` + `src/ui/screens.js`)

**Marcado añadido en `index.html`**, dentro de `#audioSettingsPanel`, junto a los controles de música ya existentes (sin removerlos):

```html
<div id="audioSettingsPanel" class="overlay hidden">
  <div class="panel facet-cut">
    <h1>Configuración de audio</h1>
    <label class="subtitle" for="volumeSlider">Volumen de música</label>
    <input type="range" id="volumeSlider" min="0" max="100" step="1" />
    <button id="muteToggleBtn" class="btn-secondary" aria-pressed="false">Silenciar música</button>

    <label class="subtitle" for="combatSfxVolumeSlider">Volumen de efectos de combate</label>
    <input type="range" id="combatSfxVolumeSlider" min="0" max="100" step="1" />
    <button id="combatSfxMuteToggleBtn" class="btn-secondary" aria-pressed="false">Silenciar efectos de combate</button>

    <button id="closeAudioSettingsBtn" class="btn-primary">Cerrar</button>
  </div>
</div>
```

Las etiquetas ("Volumen de efectos de combate" / "Silenciar efectos de combate") contienen explícitamente la palabra "combate" y son distintas de las etiquetas de música existentes ("Volumen de música" / "Silenciar música"), satisfaciendo Requirement 6.2.

**Funciones extendidas/añadidas en `src/ui/screens.js`**:

```js
export function showAudioSettingsPanel(volumePercent, isMuted, combatSfxVolumePercent, combatSfxIsMuted) {
  document.getElementById('volumeSlider').value = volumePercent;
  setMuteButtonState(isMuted);
  document.getElementById('combatSfxVolumeSlider').value = combatSfxVolumePercent;
  setCombatSfxMuteButtonState(combatSfxIsMuted);
  document.getElementById('audioSettingsPanel').classList.remove('hidden');
}

export function setCombatSfxMuteButtonState(isMuted) {
  const btn = document.getElementById('combatSfxMuteToggleBtn');
  btn.textContent = isMuted ? 'Activar efectos de combate' : 'Silenciar efectos de combate';
  btn.setAttribute('aria-pressed', String(isMuted));
}

export function bindAudioSettingsHandlers({
  onToggleSettings, onVolumeChange, onToggleMute,
  onCombatSfxVolumeChange, onToggleCombatSfxMute, onCloseSettings
}) {
  document.getElementById('settingsBtn').addEventListener('click', onToggleSettings);
  document.getElementById('volumeSlider').addEventListener('input', (e) => onVolumeChange(Number(e.target.value)));
  document.getElementById('muteToggleBtn').addEventListener('click', onToggleMute);
  document.getElementById('combatSfxVolumeSlider').addEventListener('input', (e) => onCombatSfxVolumeChange(Number(e.target.value)));
  document.getElementById('combatSfxMuteToggleBtn').addEventListener('click', onToggleCombatSfxMute);
  document.getElementById('closeAudioSettingsBtn').addEventListener('click', onCloseSettings);
}
```

`hideAudioSettingsPanel()` e `isAudioSettingsPanelVisible()` no cambian: ocultar el panel nunca altera `Combat_Sfx_Effective_Volume` ni `Combat_Sfx_Mute_State` (Requirement 6.4), porque ninguna de las dos funciones toca ese estado.

**Cableado extendido en `src/main.js`**:

```js
function onToggleAudioSettings() {
  music.notifyUserInteraction();
  if (ui.isAudioSettingsPanelVisible()) {
    ui.hideAudioSettingsPanel();
  } else {
    ui.showAudioSettingsPanel(
      music.getEffectiveVolumePercent(), music.isMuted(),
      combatSfx.getEffectiveVolumePercent(), combatSfx.isMuted()
    );
  }
}
function onVolumeChange(percent) {
  music.notifyUserInteraction();
  music.setVolume(percent);
}
function onToggleMute() {
  music.notifyUserInteraction();
  music.toggleMute();
  ui.setMuteButtonState(music.isMuted());
}
function onCombatSfxVolumeChange(percent) {
  combatSfx.setVolume(percent);
}
function onToggleCombatSfxMute() {
  combatSfx.toggleMute();
  ui.setCombatSfxMuteButtonState(combatSfx.isMuted());
}
function onCloseAudioSettings() {
  ui.hideAudioSettingsPanel();
}
// ...
ui.bindAudioSettingsHandlers({
  onToggleSettings: onToggleAudioSettings,
  onVolumeChange,
  onToggleMute,
  onCombatSfxVolumeChange,
  onToggleCombatSfxMute,
  onCloseSettings: onCloseAudioSettings
});
music.init();
combatSfx.init();
```

Los nuevos handlers de efectos de combate no llaman a `music.notifyUserInteraction()` ni a ninguna función de `music.js`: son deliberadamente independientes, satisfaciendo el aislamiento del Requirement 10.4/10.5. `combatSfx.init()` se invoca una sola vez, junto a `music.init()`, en el bloque de inicialización del módulo.

## Data Models

Estructuras internas de `combatSfx.js` (no expuestas fuera del módulo salvo por getters):

```
CombatSfxEntry = {
  folderId: string,        // 'guerrero' o un id de BOSS_ROSTER (p. ej. 'boss_1_titan_guerrero')
  animName: string,        // Sprite_Animation; coincide con una subcarpeta del Sound_Folder_Convention
  audioElement: HTMLAudioElement,
}

CombatSfxModuleState (interno de src/audio/combatSfx.js) = {
  activeSounds: Map<'warrior' | 'boss', CombatSfxEntry>,  // exactamente 2 claves posibles (ver decisión de diseño)
  effectiveVolume: number,  // 0..1
  muted: boolean,
}

CombatSfxStoredPreference = {
  volume: number, // 0..1
  muted: boolean,
}
```

`CombatSfxStoredPreference` se serializa como JSON bajo la clave `torre-nubes-combat-sfx-pref` en `localStorage`, con las mismas reglas de validación/descarte que `StoredAudioPreference` de `music.js`: un valor se considera válido si es un objeto con `volume` numérico finito en `[0, 1]` y `muted` estrictamente booleano; cualquier otro caso (JSON inválido, campos ausentes, tipos incorrectos, `volume` fuera de rango) se trata como ausente y provoca la aplicación de `Combat_Sfx_Default_Volume_Level` (Requirement 8.5).

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Ruta del Character_Voice_Sound derivada sin tabla de mapeo manual

For any `folderId` (`'guerrero'` o cualquier `bossId` de `BOSS_ROSTER`, incluyendo ids no existentes en el roster actual) y cualquier `animName` no vacío, la URL construida por `Combat_Sfx_Player` para reproducir el `Character_Voice_Sound` correspondiente es exactamente `/audio/guerrero/<animName>/<animName>.wav` cuando `folderId === 'guerrero'`, y exactamente `/audio/bosses/<folderId>/<animName>/<animName>.wav` en cualquier otro caso, derivada mediante una única fórmula aplicada de forma idéntica a todos los personajes y animaciones, sin ninguna tabla, objeto de mapeo o `switch`/`if` por `bossId` o por `animName` individual.

**Validates: Requirements 1.3, 1.4**

### Property 2: Reproducción en bucle para `idle`, reproducción única para animaciones de acción

For any `role`, `folderId` y `animName`, tras invocar `combatSfx.play(role, folderId, animName)` con éxito, el `audioElement` creado tiene `loop === true` si y solo si `animName === 'idle'`; para cualquier `animName` distinto de `'idle'` (`ataque`, `ataque_1`, `ataque_2`, `bloqueo`, `herido`, `morir`), `loop === false`.

**Validates: Requirements 2.1, 2.2, 3.1, 3.2, 3.3**

### Property 3: Ausencia de solapamiento por rol, incluyendo cambio de boss activo, e independencia entre roles

For any secuencia de invocaciones a `combatSfx.play(role, folderId, animName)` (con `role` en `{'warrior', 'boss'}`, `folderId`/`animName` arbitrarios, incluyendo secuencias donde `folderId` cambia entre invocaciones consecutivas del mismo rol `'boss'` simulando un cambio de guardián activo), en todo punto posterior a cada invocación existe como máximo una entrada activa (no detenida) por valor de `role` en `activeSounds`, y una invocación sobre `role = 'warrior'` nunca detiene, reinicia ni modifica la entrada asociada a `role = 'boss'` (ni viceversa). Además, si la invocación tiene el mismo `folderId` y el mismo `animName` que la entrada ya activa para ese `role`, la entrada activa no se detiene ni se reemplaza (no-op).

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 4: Eliminación completa y verificable de `sfx.attack()`

Inspeccionando estáticamente el código fuente resultante de `src/audio/sfx.js` y de `src/main.js`: `AUDIO_MAP` no contiene una clave `attack`; el objeto exportado `sfx` no expone una propiedad `attack`; el cuerpo de la función `playWinSequence` en `src/main.js` no contiene ninguna invocación `sfx.attack()`; el cuerpo de la función `playCorrectNonResolvingSequence` en `src/main.js` no contiene ninguna invocación `sfx.attack()`; y no existe ninguna otra invocación de `sfx.attack()` en todo `src/main.js`. Esta propiedad se verifica una sola vez sobre el código fuente (no es generativa): no depende de valores generados aleatoriamente, sino de una inspección textual/estructural exhaustiva y estable del archivo.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 5: Volumen real consistente aplicado a todo Active_Character_Sound

For any valor de `Combat_Sfx_Effective_Volume` en `[0, 100]` y cualquier valor de `Combat_Sfx_Mute_State` (`true`/`false`) aplicados mediante `setVolume`/`toggleMute`, el `.volume` de **cada** `audioElement` presente en `activeSounds` (sea la entrada de `'warrior'`, la de `'boss'`, o ambas) es igual a `Combat_Sfx_Effective_Volume/100 * (Combat_Sfx_Mute_State ? 0 : 1)`, sin alterar `paused`, `currentTime` ni `loop` de ninguno de esos elementos como efecto del cambio de volumen o de mute.

**Validates: Requirements 7.1, 9.1, 9.2, 9.3, 9.4**

### Property 6: Round-trip de persistencia de preferencias válidas

For any valor válido de `Combat_Sfx_Effective_Volume` en `[0, 100]` y `Combat_Sfx_Mute_State` en `{true, false}`, guardar esa preferencia mediante `setVolume`/`toggleMute` y luego (re)inicializar el módulo (`init()`) desde ese `Combat_Sfx_Stored_Preference` sobre el mismo `localStorage` produce un `Combat_Sfx_Effective_Volume` y `Combat_Sfx_Mute_State` iniciales iguales a los valores guardados.

**Validates: Requirements 8.1, 8.3, 8.6**

### Property 7: Descarte de preferencias inválidas y aplicación del valor por defecto

For any valor almacenado bajo la clave `torre-nubes-combat-sfx-pref` que no sea un objeto válido según el esquema (JSON malformado, campo `volume` ausente/no numérico/fuera de `[0, 1]`, campo `muted` ausente o no booleano, o ausencia total de la clave), inicializar el módulo (`init()`) descarta ese valor y aplica `Combat_Sfx_Default_Volume_Level` (30%) con `Combat_Sfx_Mute_State` inactivo.

**Validates: Requirements 7.1, 7.2, 8.4, 8.5**

### Property 8: Independencia total respecto a la música y a los efectos de sfx.js restantes

For any secuencia de operaciones sobre `combatSfx` (`play`, `setVolume`, `toggleMute`) intercaladas en cualquier orden con cualquier secuencia de operaciones sobre `music` (`setVolume`, `toggleMute`, `enterBuildScreen`, `enterBossScreen`, etc.) y sobre las funciones restantes de `sfx` (`place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`, `flipCard`, `jump`), el estado observable de `music` (`getEffectiveVolumePercent()`, `isMuted()`, pista activa) y el comportamiento de las funciones de `sfx` restantes son idénticos a los que resultarían de ejecutar únicamente esa subsecuencia de operaciones de `music`/`sfx`, ignorando por completo las operaciones de `combatSfx` intercaladas; simétricamente, el estado observable de `combatSfx` (`getEffectiveVolumePercent()`, `isMuted()`, entradas de `activeSounds`) es idéntico al que resultaría de ejecutar únicamente la subsecuencia de operaciones de `combatSfx`, ignorando las de `music`/`sfx`.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Property 9: Robustez ante fallos de reproducción, sin excepciones y sin efecto cruzado entre personajes

For any secuencia de invocaciones a `combatSfx.play(role, folderId, animName)` donde una proporción arbitraria de ellas simula un fallo (construcción de `Audio` que lanza, `.play()` síncrono que lanza, o Promise devuelta por `.play()` que rechaza), ninguna invocación de la secuencia lanza una excepción no controlada, y para cada invocación fallida sobre `role = 'warrior'` el estado de la entrada `'boss'` en `activeSounds` (y viceversa) permanece exactamente igual a como estaba inmediatamente antes de esa invocación; además, toda invocación posterior con un `role`/`folderId`/`animName` distinto sigue intentando reproducir con normalidad, sin quedar permanentemente deshabilitada por el fallo anterior.

**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

## Error Handling

- **Fallo al construir o cargar un `Character_Voice_Sound`** (`new Audio(url)` lanza, o el elemento emite el evento `error` tras intentar cargar una URL inexistente/corrupta): capturado en un try/catch alrededor de la construcción y mediante un listener `error` que no relanza; el intento de reproducción correspondiente se descarta en silencio, sin fallback sintetizado, y sin registrarse como `Active_Character_Sound` a efectos de un `stop` posterior si la construcción falló antes de llegar a `activeSounds.set(...)` (Requirement 11.1, 11.3).
- **Rechazo síncrono o asíncrono de `.play()`**: el `.play()` síncrono se envuelve en try/catch; la Promise que puede devolver se envuelve en `.catch()` que ignora el rechazo (sin relanzar, sin fallback). Si el rechazo ocurre después de que la entrada ya fue registrada en `activeSounds`, la entrada permanece como referencia de deduplicación, pero no produce sonido; una animación posterior para ese mismo rol la detiene y reemplaza con normalidad (Requirement 11.1, 11.4).
- **Fallo al detener una entrada previa** (`stopEntry`: `audioElement.pause()` o el `set currentTime` lanzan, por ejemplo sobre un elemento que nunca cargó): capturado con try/catch dentro de `stopEntry`, sin relanzar, de modo que iniciar la siguiente animación nunca queda bloqueado por el fallo de limpieza de la anterior (Requirement 11.3).
- **Fallo al persistir `Combat_Sfx_Stored_Preference`** (`localStorage.setItem` lanza, por ejemplo `QuotaExceededError` o modo privado sin almacenamiento): capturado en `savePreference()` con try/catch, sin relanzar; `Combat_Sfx_Effective_Volume`/`Combat_Sfx_Mute_State` en memoria no se revierten (Requirement 8.2).
- **`Combat_Sfx_Stored_Preference` corrupto, incompleto o fuera de rango al cargar**: `loadPreference()` valida estructura y rango antes de aplicar el valor; cualquier fallo de `JSON.parse` o de validación de esquema hace que la función retorne `null`, y `init()` aplica `Combat_Sfx_Default_Volume_Level` (Requirement 7.1, 8.4, 8.5).
- **Navegador sin soporte de `Audio`** (`typeof Audio === 'undefined'`): `play(...)` detecta esto explícitamente (mismo patrón que `sfx.js`/`music.js`) y retorna sin crear ningún elemento ni lanzar excepción; ninguna entrada se registra en `activeSounds` para ese intento.

## Testing Strategy

**Enfoque dual**: pruebas unitarias para ejemplos concretos, casos de borde y puntos de integración de UI/código fuente, y pruebas basadas en propiedades para los invariantes universales de la sección de Correctness Properties.

### Pruebas unitarias (ejemplos)

- `buildUrl('guerrero', 'idle')` produce `/audio/guerrero/idle/idle.wav`.
- `buildUrl('boss_1_titan_guerrero', 'ataque_1')` produce `/audio/bosses/boss_1_titan_guerrero/ataque_1/ataque_1.wav`; lo mismo para `ataque_2` y para los demás `bossId` de `BOSS_ROSTER` (`boss_2_orco`, `boss_3_tigre`, `boss_4_golem`, `boss_5_brujo`) con su animación `ataque`.
- Tras `combatSfx.play('warrior', 'guerrero', 'idle')`, el `audioElement` creado tiene `loop === true`.
- Tras `combatSfx.play('boss', 'boss_2_orco', 'herido')`, el `audioElement` creado tiene `loop === false`.
- `src/audio/sfx.js` ya no exporta ni mapea `attack`: `AUDIO_MAP.attack` es `undefined` y `sfx.attack` es `undefined`.
- `src/main.js` ya no invoca `sfx.attack()` en ningún punto (inspección de las funciones `playWinSequence` y `playCorrectNonResolvingSequence`).
- El `Audio_Settings_Panel` contiene los nuevos controles `#combatSfxVolumeSlider` y `#combatSfxMuteToggleBtn`, con etiquetas visibles que mencionan "combate", distintas de las etiquetas de música.
- `ui.bindAudioSettingsHandlers({...})` registra correctamente los listeners `input`/`click` sobre `#combatSfxVolumeSlider` y `#combatSfxMuteToggleBtn`, invocando `onCombatSfxVolumeChange`/`onToggleCombatSfxMute` respectivamente.
- `combatSfx.init()` sin `Combat_Sfx_Stored_Preference` previo aplica `Combat_Sfx_Default_Volume_Level` (30%) y `Combat_Sfx_Mute_State` inactivo.
- Invocar `music.setVolume(...)`/`music.toggleMute()` no modifica `combatSfx.getEffectiveVolumePercent()`/`combatSfx.isMuted()`, y viceversa.

### Pruebas basadas en propiedades

Se utilizará **fast-check** (ya presente en `devDependencies` del proyecto), configurando cada prueba con un mínimo de 100 iteraciones, ejecutadas con **vitest** sobre un entorno **jsdom** que mockea/sobrescribe `Audio`/`HTMLAudioElement` (constructor, `play`, `pause`, `currentTime`, `volume`, `loop`, evento `error`) para simular reproducción, fallos y estados de forma determinista y sin depender de archivos `.wav` reales. Cada prueba de propiedad se etiqueta con un comentario que referencia la propiedad correspondiente:

`// Feature: combat-animation-sfx, Property N: {texto de la propiedad}`

- **Property 1** (Ruta sin tabla de mapeo): generar `folderId` aleatorio (`'guerrero'` o una cadena arbitraria simulando un `bossId`) y `animName` aleatorio no vacío; verificar que la URL usada al construir el `Audio` mockeado coincide exactamente con la fórmula esperada según `folderId`.
- **Property 2** (Loop para idle, único para el resto): generar `role`/`folderId` aleatorios y `animName` aleatorio tomado de `{'idle', 'ataque', 'ataque_1', 'ataque_2', 'bloqueo', 'herido', 'morir'}`; verificar que `loop` del mock resultante es `true` si y solo si `animName === 'idle'`.
- **Property 3** (Ausencia de solapamiento por rol): generar una secuencia aleatoria de 1 a 20 invocaciones a `play(role, folderId, animName)` con `role`, `folderId` y `animName` aleatorios (incluyendo repeticiones y cambios de `folderId` para `role = 'boss'`); tras cada invocación, verificar que a lo sumo un mock por `role` está "activo" (no detenido) y que las entradas de `'warrior'` y `'boss'` nunca se ven afectadas por invocaciones del otro rol.
- **Property 4** (Eliminación de `sfx.attack()`): prueba estática de una sola ejecución (no generativa) que lee el contenido fuente de `src/audio/sfx.js` y `src/main.js` y verifica ausencia de `attack` mediante inspección de AST o de las estructuras exportadas en tiempo de ejecución (`AUDIO_MAP`, `sfx`, y el texto fuente de las funciones relevantes).
- **Property 5** (Volumen real consistente): generar `Combat_Sfx_Effective_Volume` aleatorio en `[0, 100]`, `Combat_Sfx_Mute_State` aleatorio, y un conjunto aleatorio de entradas activas (`'warrior'`, `'boss'`, ambas, o ninguna) previamente creadas vía `play(...)`; aplicar `setVolume`/`toggleMute` en orden aleatorio y verificar que `.volume` de cada mock activo es igual a `Effective_Volume/100 * (muted?0:1)`, y que `paused`/`currentTime`/`loop` no cambiaron.
- **Property 6** (Round-trip de persistencia): generar aleatoriamente `volume` (0-100) y `muted` (booleano), llamar `setVolume`/`toggleMute`, simular reinicialización llamando `init()` de nuevo sobre el mismo `localStorage` mockeado, y verificar que los valores iniciales resultantes coinciden.
- **Property 7** (Descarte de preferencias inválidas): generar aleatoriamente valores corruptos (JSON malformado, `volume` fuera de `[0,1]`, `volume` no numérico, `muted` no booleano, clave ausente) almacenados bajo `torre-nubes-combat-sfx-pref`; verificar que `init()` aplica siempre `Combat_Sfx_Default_Volume_Level` (30%) con `Combat_Sfx_Mute_State` inactivo.
- **Property 8** (Independencia respecto a música y sfx.js): generar una secuencia aleatoria intercalada de operaciones de `combatSfx`, `music` y `sfx`; verificar que el estado observable de `music` y el comportamiento de `sfx` coinciden con los que resultarían de ejecutar solo su propia subsecuencia, y que el estado observable de `combatSfx` coincide con el que resultaría de ejecutar solo la suya.
- **Property 9** (Robustez ante fallos): generar una secuencia aleatoria de invocaciones a `play(role, folderId, animName)` donde cada invocación tiene una probabilidad aleatoria de simular un fallo (constructor lanza, `.play()` síncrono lanza, o Promise rechazada); verificar que ninguna invocación lanza excepción, que las entradas del rol no afectado por un fallo permanecen sin cambios, y que las invocaciones posteriores siguen intentando reproducir con normalidad.

Este enfoque cubre tanto los puntos de integración concretos y la eliminación verificable de `sfx.attack()` (unitarios) como los invariantes generales de ausencia de solapamiento, volumen, persistencia, independencia y robustez ante fallos (propiedades), siguiendo el mismo formato usado en el spec `background-music-controls`.
