# Requirements Document

## Introduction

El juego "Torre de las Nubes" ya cuenta con un sistema de animación de sprites para el combate contra guardianes (`SpriteAnimationEngine`, en `src/render/spriteEngine.js`), que anima al `Warrior_Sprite` y al `Boss_Sprite` activo mediante `Sprite_Animation` nombradas (`idle`, `ataque`/`ataque_1`/`ataque_2`, `bloqueo`, `herido`, `morir`) orquestadas desde `src/main.js`. Ese sistema de animación no tiene hoy ningún conocimiento de audio. En paralelo, ya existen archivos `.wav` reales para cada personaje y cada acción, organizados bajo `public/audio/guerrero/<animName>/` y `public/audio/bosses/<bossId>/<animName>/`, en carpetas preparadas previamente por la feature `boss-fight-sprite-animations` pero sin ningún mecanismo de reproducción conectado a ellas.

Esta feature introduce un **Combat_Sfx_Player**: un módulo dedicado que sincroniza la reproducción de esos archivos `.wav` con el inicio de cada `Sprite_Animation` del `Warrior_Sprite` y del `Boss_Sprite` activo durante un `Boss_Fight`. La animación `idle` reproduce su sonido en bucle continuo mientras siga activa; las animaciones de un solo uso (`ataque`, `ataque_1`, `ataque_2`, `bloqueo`, `herido`, `morir`) reproducen su sonido una sola vez, en sincronía con el inicio de la animación, sin forzar bucle ni recorte. Para un mismo personaje (el guerrero, o el boss activo), nunca deben sonar dos de estos sonidos a la vez: al iniciar una nueva animación se detiene de inmediato cualquier sonido todavía en reproducción de la animación anterior de ese mismo personaje. Los sonidos del guerrero y los del boss activo son independientes entre sí y pueden solaparse.

Como parte de esta feature, el mecanismo existente y manual `sfx.attack()` (definido en `src/audio/sfx.js`, disparado desde dos puntos de `src/main.js` justo antes de iniciar la animación `ataque` del guerrero) queda completamente eliminado, junto con su entrada `AUDIO_MAP.attack`: el nuevo Combat_Sfx_Player es, a partir de esta feature, el único mecanismo que dispara el sonido de la animación `ataque` del guerrero.

Esta feature también agrega, dentro del panel de configuración de audio ya existente (`#audioSettingsPanel`), un **segundo control de volumen y mute independiente**, dedicado exclusivamente al Combat_Sfx_Player. Este control convive junto al control de volumen/mute de música ya existente (gestionado por `src/audio/music.js`), pero es completamente independiente de él: tiene su propio valor de volumen efectivo (con un valor por defecto de 30%, distinto al 6% de la música), su propio estado de mute, y su propia clave de almacenamiento en `localStorage`, siguiendo el mismo patrón de persistencia y de manejo de datos corruptos ya implementado para la música. Este control no afecta en absoluto a la música de fondo ni a los efectos de sonido puntuales restantes de `sfx.js` (`place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`, `flipCard`, `jump`), y estos últimos tampoco afectan al Combat_Sfx_Player.

Esta feature no modifica la lógica de resolución de combate (`src/combat/fight.js`), el cálculo de fotogramas/temporización del `Sprite_Animation_Engine` (`src/render/spriteEngine.js`), ni la lógica de rotación/selección de bosses (`src/data/bossRoster.js`); únicamente añade/lee señales de inicio de animación para disparar sonido, y elimina los dos puntos de llamada manual a `sfx.attack()`.

## Glossary

- **Sprite_Character**, **Warrior_Sprite**, **Boss_Sprite**, **Sprite_Animation**, **Animation_Sequence**, **Sprite_Animation_Engine**, **Boss_Fight**, **Alternating_Attack_Boss**, **Main_Module**: mismos términos y significados definidos en `boss-fight-sprite-animations/requirements.md`. En particular, `Main_Module` es `src/main.js`, que mantiene una instancia de `Sprite_Animation_Engine` para el `Warrior_Sprite` (`warriorEngine`) y una por cada boss (`bossEngines`, seleccionada como `bossEngine` según el `bossEntry` activo).
- **Settings_Button**, **Audio_Settings_Panel**: mismos términos definidos en `background-music-controls/requirements.md`: el botón `#settingsBtn` y el panel `#audioSettingsPanel`, ambos ya existentes y reutilizados sin cambios estructurales por esta feature salvo la adición descrita en el Requirement 6.
- **Combat_Sfx_Player**: El nuevo módulo dedicado, independiente de `src/audio/music.js` y de `src/audio/sfx.js`, responsable de reproducir, detener y controlar el volumen de los sonidos de personaje asociados a las `Sprite_Animation` del `Warrior_Sprite` y del `Boss_Sprite` activo durante un `Boss_Fight`.
- **Character_Voice_Sound**: El archivo `.wav` individual asociado a una combinación (personaje, `Sprite_Animation`), ubicado según el `Sound_Folder_Convention`, que el Combat_Sfx_Player reproduce al iniciar dicha `Sprite_Animation` para ese personaje.
- **Sound_Folder_Convention**: La convención de nombres ya existente en el sistema de archivos, donde cada `Sprite_Animation` de cada personaje tiene una subcarpeta homónima que contiene exactamente un `Character_Voice_Sound`: `public/audio/guerrero/<animName>/` para el `Warrior_Sprite`, y `public/audio/bosses/<bossId>/<animName>/` para un `Boss_Sprite` (donde `bossId` corresponde al campo `id` de la entrada de `BOSS_ROSTER` en `src/data/bossRoster.js`, p. ej. `boss_1_titan_guerrero`).
- **Active_Character_Sound**: El `Character_Voice_Sound` que el Combat_Sfx_Player está reproduciendo o tiene en bucle en un momento dado para un personaje concreto (el `Warrior_Sprite` o el `Boss_Sprite` activo). Cada personaje tiene, como máximo, un Active_Character_Sound a la vez.
- **Combat_Sfx_Volume_Slider**: El control deslizante añadido dentro del `Audio_Settings_Panel`, distinto e independiente del `Volume_Slider` de música ya existente, que permite al jugador ajustar el `Combat_Sfx_Effective_Volume`.
- **Combat_Sfx_Mute_State**: El estado booleano (silenciado / no silenciado), gestionado por su propio control dentro del `Audio_Settings_Panel`, distinto e independiente del `Mute_State` de música ya existente, que se aplica exclusivamente a los `Character_Voice_Sound` reproducidos por el Combat_Sfx_Player.
- **Combat_Sfx_Effective_Volume**: El nivel de volumen resultante aplicado a todo `Character_Voice_Sound` reproducido por el Combat_Sfx_Player, determinado por el nivel elegido en el Combat_Sfx_Volume_Slider y por el Combat_Sfx_Mute_State, de forma análoga al `Effective_Volume` de música pero completamente independiente de él.
- **Combat_Sfx_Default_Volume_Level**: El nivel de volumen inicial aplicado por el Combat_Sfx_Player la primera vez que reproduce sonido si no existe un `Combat_Sfx_Stored_Preference` previo, equivalente al 30% del volumen real del archivo (`Base_Volume`), análogo al `Default_Volume_Level` de música pero con un valor distinto.
- **Combat_Sfx_Stored_Preference**: La preferencia de audio (`Combat_Sfx_Effective_Volume` y `Combat_Sfx_Mute_State`) persistida por el Combat_Sfx_Player en `localStorage` bajo una clave distinta de la usada por el `Stored_Audio_Preference` de música, siguiendo el mismo formato y las mismas reglas de validación/descarte de datos corruptos que este último.

## Requirements

### Requirement 1: Reproducción de sonido sincronizada con el inicio de cada animación

**User Story:** Como jugador, quiero escuchar el sonido correspondiente a cada acción del guerrero y del guardián justo cuando esa acción comienza a animarse, para percibir el combate como más vivo e inmersivo.

#### Acceptance Criteria

1. WHEN el `Main_Module` invoca `.play(animName, ...)` sobre el `Sprite_Animation_Engine` del `Warrior_Sprite` durante un `Boss_Fight`, THE Combat_Sfx_Player SHALL comenzar la reproducción del `Character_Voice_Sound` ubicado en `public/audio/guerrero/<animName>/` de forma síncrona dentro de esa misma invocación de `.play(...)`, antes de que dicha invocación retorne el control al `Main_Module`, sin diferir el inicio del sonido a un fotograma de animación posterior, a un temporizador ni a ninguna otra tarea asíncrona. IF dicha reproducción síncrona no puede iniciarse dentro de esa misma invocación de `.play(...)` (por ejemplo, debido a restricciones de autoplay del navegador, problemas de inicialización del audio context, o cualquier otro fallo síncrono), THEN THE Combat_Sfx_Player SHALL NOT recurrir a una reproducción asíncrona o diferida para ese intento de inicio de animación, y SHALL en su lugar manejarlo como un fallo de reproducción conforme al Requirement 11.
2. WHEN el `Main_Module` invoca `.play(animName, ...)` sobre el `Sprite_Animation_Engine` del `Boss_Sprite` activo durante un `Boss_Fight`, THE Combat_Sfx_Player SHALL comenzar la reproducción del `Character_Voice_Sound` ubicado en `public/audio/bosses/<bossId>/<animName>/` (donde `bossId` es el `id` del `bossEntry` activo) de forma síncrona dentro de esa misma invocación de `.play(...)`, antes de que dicha invocación retorne el control al `Main_Module`, sin diferir el inicio del sonido a un fotograma de animación posterior, a un temporizador ni a ninguna otra tarea asíncrona. IF dicha reproducción síncrona no puede iniciarse dentro de esa misma invocación de `.play(...)` (por ejemplo, debido a restricciones de autoplay del navegador, problemas de inicialización del audio context, o cualquier otro fallo síncrono), THEN THE Combat_Sfx_Player SHALL NOT recurrir a una reproducción asíncrona o diferida para ese intento de inicio de animación, y SHALL en su lugar manejarlo como un fallo de reproducción conforme al Requirement 11.
3. THE Combat_Sfx_Player SHALL determinar la ruta del `Character_Voice_Sound` a reproducir siguiendo el `Sound_Folder_Convention`, sustituyendo únicamente el personaje (`guerrero` o el `bossId` activo) y el `animName` recibido en `.play(...)` dentro de esa ruta, sin requerir una tabla de mapeo manual distinta por personaje o por animación.
4. WHERE el `Boss_Sprite` activo es el `Alternating_Attack_Boss`, WHEN su `Sprite_Animation_Engine` inicia la `Sprite_Animation` `ataque_1` o `ataque_2`, THE Combat_Sfx_Player SHALL reproducir exactamente el `Character_Voice_Sound` ubicado en la subcarpeta homónima a la animación iniciada (`ataque_1/` o `ataque_2/` según corresponda), sin reproducir en su lugar el `Character_Voice_Sound` de la otra animación de ataque.

### Requirement 2: Reproducción en bucle de la animación idle

**User Story:** Como jugador, quiero escuchar un sonido ambiental continuo mientras el guerrero o el guardián están en espera, para reforzar la sensación de que los personajes están presentes en la escena.

#### Acceptance Criteria

1. WHEN la `Sprite_Animation` `idle` inicia para el `Warrior_Sprite` o para el `Boss_Sprite` activo — incluyendo una reinvocación de `.play('idle', ...)` mientras `idle` ya era la animación activa de ese personaje — THE Combat_Sfx_Player SHALL: (a) si ningún `Active_Character_Sound` está sonando para ese personaje, comenzar a reproducir el `Character_Voice_Sound` de `idle` de ese personaje en bucle continuo; (b) si un `Active_Character_Sound` de una `Sprite_Animation` distinta está sonando para ese personaje, detenerlo conforme al Requirement 4 y comenzar a reproducir el `Character_Voice_Sound` de `idle` en bucle continuo desde su inicio; o (c) si el `Character_Voice_Sound` de `idle` ya está en bucle para ese personaje sin que ninguna otra animación haya iniciado en el ínterin, THE Combat_Sfx_Player SHALL dejarlo sonando sin interrupción, sin reiniciarlo desde el principio.
2. WHILE `idle` permanece como la animación activa de un personaje sin que ninguna otra `Sprite_Animation` haya iniciado en el ínterin, THE Combat_Sfx_Player SHALL mantener el `Character_Voice_Sound` de `idle` de ese personaje sonando en bucle sin interrupción, salvo por la detención exigida por el Requirement 4 cuando inicia una `Sprite_Animation` distinta para ese mismo personaje.

### Requirement 3: Reproducción única y completa de sonidos de animaciones de un solo uso

**User Story:** Como jugador, quiero que los sonidos de ataque, bloqueo, herida y muerte se escuchen completos y una sola vez cada vez que ocurre esa acción, sin que se recorten ni se repitan artificialmente.

#### Acceptance Criteria

1. WHEN una `Sprite_Animation` distinta de `idle` (`ataque`, `ataque_1`, `ataque_2`, `bloqueo`, `herido` o `morir`) inicia para el `Warrior_Sprite` o para el `Boss_Sprite` activo, THE Combat_Sfx_Player SHALL reproducir el `Character_Voice_Sound` correspondiente exactamente una vez, de principio a fin, sin activar reproducción en bucle.
2. WHILE dicho `Character_Voice_Sound` está sonando a raíz del inicio descrito en el criterio 1, THE Combat_Sfx_Player SHALL dejarlo finalizar de forma natural según su propia duración, sin truncarlo si es más largo que la `Animation_Sequence` visual asociada y sin extenderlo ni repetirlo si es más corto — salvo por la detención exigida por el Requirement 4 cuando inicia una nueva `Sprite_Animation` para ese mismo personaje antes de que este `Character_Voice_Sound` termine por sí solo.
3. THE Combat_Sfx_Player SHALL iniciar la reproducción descrita en el criterio 1 únicamente en sincronía con el instante de inicio de la `Sprite_Animation`, sin realizar ningún ajuste adicional de velocidad o duración para forzar una coincidencia exacta con el final de la `Animation_Sequence`.

### Requirement 4: Ausencia de solapamiento de sonido para el mismo personaje

**User Story:** Como jugador, quiero que los sonidos de un mismo personaje nunca se mezclen entre sí, para que cada acción se escuche con claridad y sin ruido superpuesto confuso.

#### Acceptance Criteria

1. WHILE un personaje (el `Warrior_Sprite`, o el `Boss_Sprite` activo) tiene un `Active_Character_Sound` sonando de una `Sprite_Animation` anterior, WHEN inicia una `Sprite_Animation` nueva y distinta para ese mismo personaje, THE Combat_Sfx_Player SHALL detener ese `Active_Character_Sound` anterior de forma síncrona, dentro de la misma llamada de ejecución que inicia el nuevo `Character_Voice_Sound`, antes o en el mismo instante en que este comienza.
2. THE Combat_Sfx_Player SHALL garantizar que, en todo momento, cada rol de personaje (el `Warrior_Sprite`, o el `Boss_Sprite` que esté activo en ese momento) tenga como máximo un `Active_Character_Sound` sonando simultáneamente — este invariante SHALL mantenerse también ante un cambio del `Boss_Sprite` activo (por ejemplo, un nuevo `Boss_Fight` contra un boss distinto), deteniéndose el `Active_Character_Sound` del boss anterior, si existía, a más tardar en el momento en que comienza el primer `Character_Voice_Sound` del nuevo boss.
3. THE Combat_Sfx_Player SHALL permitir que el `Active_Character_Sound` del `Warrior_Sprite` y el `Active_Character_Sound` del `Boss_Sprite` activo suenen de forma simultánea entre sí, sin que el inicio o la detención de sonido de un personaje afecte al sonido del otro. WHEN el `Warrior_Sprite` y el `Boss_Sprite` activo inician cada uno una `Sprite_Animation` nueva de forma simultánea o casi simultánea, THE Combat_Sfx_Player SHALL permitir que cada personaje cambie su propio `Active_Character_Sound` de forma independiente, de modo que el cambio de sonido de un personaje nunca bloquee, retrase, ni sea bloqueado o retrasado por el cambio de sonido del otro personaje ocurrido en ese mismo instante.
4. WHEN `.play(animName, ...)` se invoca para un personaje con el mismo `animName` que la `Sprite_Animation` actualmente activa de ese personaje (por ejemplo, `idle` reinvocado mientras `idle` ya está activo, conforme al Requirement 2), THE Combat_Sfx_Player SHALL NOT tratar esto como el inicio de una nueva `Sprite_Animation` a efectos del criterio 1, y SHALL NOT detener ni reiniciar el `Active_Character_Sound` vigente de ese personaje como consecuencia de ello.

### Requirement 5: Eliminación del mecanismo manual de sonido de ataque

**User Story:** Como desarrollador, quiero que exista un único mecanismo que dispare el sonido de ataque del guerrero, para evitar sonidos duplicados o en conflicto y simplificar el mantenimiento del código.

#### Acceptance Criteria

1. THE `AUDIO_MAP` de `src/audio/sfx.js` SHALL NOT contain an entry for the `attack` Sound_Event.
2. THE exported `sfx` object in `src/audio/sfx.js` SHALL NOT expose an `attack` function.
3. THE `Main_Module` SHALL NOT invoke `sfx.attack()` at the call site inside `playWinSequence()`.
4. THE `Main_Module` SHALL NOT invoke `sfx.attack()` at the call site inside `playCorrectNonResolvingSequence()`.
5. WHEN the Warrior_Sprite's `ataque` Sprite_Animation starts during a Boss_Fight, THE Combat_Sfx_Player described in Requirement 1 SHALL be the only mechanism in the codebase that, as a direct consequence of that animation start, triggers audible sound — specifically, no `sfx.js` Sound_Event dispatch (via the `sfx` object) SHALL be invoked as a direct consequence of that animation start; this criterion does not restrict other, unrelated sounds (e.g. UI sfx triggered by unrelated player actions) that may incidentally overlap in time without being caused by this animation start.

### Requirement 6: Control de volumen dedicado a los efectos de combate en el panel existente

**User Story:** Como jugador, quiero poder ajustar el volumen de los sonidos de combate por separado del volumen de la música, para adaptar cada uno a mi preferencia sin que uno dependa del otro.

#### Acceptance Criteria

1. THE `Audio_Settings_Panel` (`#audioSettingsPanel`) SHALL contain a Combat_Sfx_Volume_Slider and its own dedicated mute control, presented alongside the existing music Volume_Slider and mute control, without replacing or removing either of them.
2. THE Combat_Sfx_Volume_Slider and its mute control SHALL each display a visible text label that identifies them as controlling combat sound effects (containing wording such as "efectos de combate", "sonido de combate", "combate", or an equivalent explicit reference to combat sound effects), AND the text of each of these labels SHALL NOT be identical to the text of the existing music Volume_Slider label or the existing music mute control label.
3. WHEN the player activates the Settings_Button while the Audio_Settings_Panel is hidden, THE Audio_Settings_Panel SHALL display the Combat_Sfx_Volume_Slider reflecting the current Combat_Sfx_Effective_Volume and its mute control reflecting the current Combat_Sfx_Mute_State, in addition to reflecting the existing music Effective_Volume and Mute_State.
4. WHEN the player hides the Audio_Settings_Panel, whether by activating the Settings_Button while the Audio_Settings_Panel is already visible or by activating the Audio_Settings_Panel's close control, THE Audio_Settings_Panel SHALL hide without altering the current Combat_Sfx_Effective_Volume or the current Combat_Sfx_Mute_State.

### Requirement 7: Volumen inicial reducido por defecto

**User Story:** Como jugador, quiero que los sonidos de combate no sean demasiado fuertes la primera vez que juego, para tener una experiencia auditiva cómoda desde el inicio.

#### Acceptance Criteria

1. WHEN the Combat_Sfx_Player initializes, IF no Combat_Sfx_Stored_Preference exists, THEN THE Combat_Sfx_Player SHALL apply the Combat_Sfx_Default_Volume_Level (30% of Base_Volume) as the Combat_Sfx_Effective_Volume and SHALL set the Combat_Sfx_Mute_State to inactive, before any Character_Voice_Sound playback is attempted, so that the Audio_Settings_Panel and any playback reflect this default from that point forward.
2. THE Combat_Sfx_Default_Volume_Level SHALL be distinct from, and SHALL NOT be derived from, the Default_Volume_Level used by the existing music system in `src/audio/music.js`.

### Requirement 8: Persistencia independiente de la preferencia de efectos de combate

**User Story:** Como jugador, quiero que mi preferencia de volumen y silencio de los efectos de combate se recuerde entre sesiones, igual que ya ocurre con la música, para no tener que reconfigurarla cada vez que juego.

#### Acceptance Criteria

1. WHEN the player modifies the Combat_Sfx_Mute_State or the Combat_Sfx_Effective_Volume, THE Combat_Sfx_Player SHALL, within the same synchronous execution that applies the change, attempt to persist a Combat_Sfx_Stored_Preference representing both values under a localStorage key distinct from the existing music Stored_Audio_Preference key.
2. IF the attempt to persist the Combat_Sfx_Stored_Preference fails for any reason, THEN THE Combat_Sfx_Player SHALL continue game execution without throwing an uncaught exception, keeping the current Combat_Sfx_Mute_State and Combat_Sfx_Effective_Volume in memory for the current session.
3. WHEN the Combat_Sfx_Player initializes, IF a Combat_Sfx_Stored_Preference from a previous session exists and is valid, THEN THE Combat_Sfx_Player SHALL apply it as the Combat_Sfx_Effective_Volume and Combat_Sfx_Mute_State instead of the Combat_Sfx_Default_Volume_Level.
4. WHEN the Combat_Sfx_Player initializes, IF no Combat_Sfx_Stored_Preference exists, THEN THE Combat_Sfx_Player SHALL apply the Combat_Sfx_Default_Volume_Level described in Requirement 7.
5. IF the Combat_Sfx_Stored_Preference found is corrupt, incomplete, or contains a Combat_Sfx_Effective_Volume value outside the 0% to 100% of Base_Volume range, THEN THE Combat_Sfx_Player SHALL discard it and SHALL apply the Combat_Sfx_Default_Volume_Level described in Requirement 7.
6. WHEN the player reloads the page after having previously adjusted the Combat_Sfx_Volume_Slider or its mute control, THE Combat_Sfx_Volume_Slider and its mute control SHALL reflect the persisted Combat_Sfx_Effective_Volume and Combat_Sfx_Mute_State the next time the Audio_Settings_Panel is shown.

### Requirement 9: Ajuste en vivo del volumen y mute de efectos de combate

**User Story:** Como jugador, quiero que mover el slider o el botón de mute de los efectos de combate tenga efecto inmediato, para escuchar el resultado de mi ajuste sin pasos adicionales.

#### Acceptance Criteria

1. WHILE the Combat_Sfx_Mute_State is inactive, WHEN the player adjusts the Combat_Sfx_Volume_Slider to a value between 0% and 100% of Base_Volume, THE Combat_Sfx_Player SHALL update the Combat_Sfx_Effective_Volume to that value and SHALL apply the updated Combat_Sfx_Effective_Volume audibly to any Active_Character_Sound currently playing within 100 milliseconds of the adjustment, without requiring an additional confirmation action and without restarting, pausing, or resetting the playback position of that Active_Character_Sound.
2. WHEN the player activates the Combat_Sfx_Volume_Slider's dedicated mute control while the Combat_Sfx_Mute_State is inactive, THE Combat_Sfx_Player SHALL set the Combat_Sfx_Mute_State to active and SHALL silence any Active_Character_Sound currently playing within 100 milliseconds, without stopping, pausing, or resetting its playback position.
3. WHEN the player deactivates the Combat_Sfx_Volume_Slider's dedicated mute control while the Combat_Sfx_Mute_State is active, THE Combat_Sfx_Player SHALL set the Combat_Sfx_Mute_State to inactive and SHALL restore the current Combat_Sfx_Effective_Volume audibly to any Active_Character_Sound currently playing within 100 milliseconds, continuing its playback from the current position without restarting it from the beginning.
4. WHEN the player adjusts the Combat_Sfx_Volume_Slider while the Combat_Sfx_Mute_State is active, THE Combat_Sfx_Player SHALL update and store the new Combat_Sfx_Effective_Volume without producing audible sound for any Active_Character_Sound currently playing until the Combat_Sfx_Mute_State is later deactivated.

### Requirement 10: Alcance exclusivo del control de efectos de combate

**User Story:** Como desarrollador, quiero que el nuevo control de volumen de combate y el control de volumen de música existente sean totalmente independientes entre sí, para evitar efectos secundarios inesperados entre ambos sistemas de audio.

#### Acceptance Criteria

1. THE Combat_Sfx_Effective_Volume and Combat_Sfx_Mute_State SHALL apply exclusively to Character_Voice_Sound instances played by the Combat_Sfx_Player (files sourced from `public/audio/guerrero/**` and `public/audio/bosses/**`).
2. THE Combat_Sfx_Effective_Volume and Combat_Sfx_Mute_State SHALL have zero effect on the volume, mute state, play/pause state, selected Active_Track, or playback position of the `general` and `combat` Music_Track managed by `src/audio/music.js`.
3. THE Combat_Sfx_Effective_Volume and Combat_Sfx_Mute_State SHALL have zero effect on the volume, play/pause state, or playback position of the remaining `sfx.js` one-shot Sound_Event entries (`place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`, `flipCard`, `jump`).
4. WHEN the player adjusts the Combat_Sfx_Volume_Slider or its mute control, THE existing music Volume_Slider, its mute control, the music Effective_Volume, the music Mute_State, and the persisted music Stored_Audio_Preference SHALL remain unchanged.
5. WHEN the player adjusts the existing music Volume_Slider or its mute control, THE Combat_Sfx_Volume_Slider, its mute control, the Combat_Sfx_Effective_Volume, the Combat_Sfx_Mute_State, and the persisted Combat_Sfx_Stored_Preference SHALL remain unchanged.

### Requirement 11: Manejo de fallos de reproducción sin bloquear el juego

**User Story:** Como jugador, quiero que un archivo de sonido de combate faltante o dañado nunca detenga ni rompa el juego, para poder seguir jugando con normalidad aunque falte algún sonido puntual.

#### Acceptance Criteria

1. IF a Character_Voice_Sound file fails to load or fails to play for a given Sprite_Animation start, for any reason (including but not limited to a missing file, a corrupted file, a network error, or a browser playback restriction), THEN THE Combat_Sfx_Player SHALL NOT throw an uncaught exception, and SHALL allow the corresponding Animation_Sequence to start and progress according to its normal frame timing without waiting for the playback attempt to resolve.
2. IF a Character_Voice_Sound file fails to load or fails to play for the Warrior_Sprite or for the active Boss_Sprite, THEN THE Combat_Sfx_Player SHALL NOT alter the playback, the Active_Character_Sound, or any other audio state of the other Sprite_Character.
3. IF a Character_Voice_Sound file fails to load or fails to play for a given Sprite_Animation start, THEN THE Combat_Sfx_Player SHALL produce no sound for that specific animation attempt, with no synthesized fallback substitute, and SHALL NOT record that failed attempt as an Active_Character_Sound requiring a subsequent stop action.
4. THE Combat_Sfx_Player SHALL, for each subsequent Sprite_Animation start occurring after a previous playback failure for the same or a different Character_Voice_Sound, independently attempt to load and play the Character_Voice_Sound associated with that new Sprite_Animation start following the same Sound_Folder_Convention lookup, without permanently disabling playback attempts for the affected character or animation.

### Requirement 12: Preservación de la lógica de combate y animación existente

**User Story:** Como desarrollador, quiero que la incorporación del sonido de combate no altere ninguna regla de negocio ya validada del combate ni del motor de animación, para no introducir regresiones.

#### Acceptance Criteria

1. THE Combat_Sfx_Player implementation SHALL NOT modify any part of `src/combat/fight.js`.
2. THE Combat_Sfx_Player implementation SHALL NOT modify any part of `src/render/spriteEngine.js`, including but not limited to the frame/timing computation logic (`update`, `getFrameRect`) of the Sprite_Animation_Engine.
3. THE Combat_Sfx_Player implementation SHALL NOT modify any part of `src/data/bossRoster.js`, including the boss rotation/selection logic.
4. THE Combat_Sfx_Player's integration in `src/main.js` SHALL be limited to: (a) reading or wrapping the Main_Module's existing invocations of `.play(animName, ...)` on the Warrior_Sprite's and Boss_Sprite's Sprite_Animation_Engine instances in order to trigger Combat_Sfx_Player playback, and (b) removing the two `sfx.attack()` call sites described in Requirement 5; THE Combat_Sfx_Player's integration SHALL NOT alter any other control flow, state, or return value of `src/main.js`.
