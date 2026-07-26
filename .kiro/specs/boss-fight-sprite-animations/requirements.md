# Requirements Document

## Introduction

Esta feature reemplaza la representación actual del combate contra el guardián ("bossScreen"), hoy dibujada con elementos DOM/CSS puros (`.fighter`, `.knight-*`, `.boss-*`, `.arena`), por un sistema de sprites animados dibujados sobre el `<canvas id="gameCanvas">` que ya usa el resto del juego "Torre de las Nubes". El guerrero y los 5 bosses ya cuentan con hojas de sprites (PNG) y metadata JSON (dimensiones, animaciones, fps, frameCount) ubicados en `public/sprites/`. La feature introduce un motor de animación de sprites genérico y reutilizable (no hardcodeado por personaje), sincroniza las animaciones de reacción (ataque, bloqueo, herido, morir) con los eventos de combate ya existentes en `src/combat/fight.js` (que no cambia su lógica de negocio), sustituye los temporizadores fijos de `src/main.js` por temporización derivada de la duración real de las animaciones, introduce la rotación de bosses (orden fijo en la primera vuelta, aleatorio con repetición después) con su fondo de pantalla correspondiente, elimina por completo el markup/CSS obsoleto del combate DOM, y prepara (sin implementar sonido) la estructura de carpetas para futuros efectos de audio por personaje/acción.

## Glossary

- **Sprite_Character**: Entidad visual (el guerrero o un boss) definida por un archivo de metadata JSON (`displayWidth`, `displayHeight`, `frameWidth`, `frameHeight`, `animations`) y sus archivos PNG de hoja de sprites asociados.
- **Warrior_Sprite**: El Sprite_Character correspondiente al guerrero jugador (`public/sprites/guerrero/guerrero.json`).
- **Boss_Sprite**: El Sprite_Character correspondiente al boss activo en el combate actual (uno de los 5 definidos en `public/sprites/bosses/`).
- **Sprite_Animation**: Una animación nombrada dentro de la metadata de un Sprite_Character (por ejemplo `idle`, `ataque`, `bloqueo`, `herido`, `morir`, `ataque_1`, `ataque_2`), con su propio `layout` (`grid` o `row`), `frameCount`, `fps` y bandera `loop`.
- **Animation_Sequence**: La reproducción ordenada y temporizada de una Sprite_Animation, desde su primer fotograma hasta su fotograma final, incluyendo la señal de finalización cuando `loop` es `false`.
- **Sprite_Animation_Engine**: El módulo genérico que carga metadata JSON de cualquier Sprite_Character y reproduce sus Sprite_Animation sobre el canvas, sin lógica específica por personaje.
- **Boss_Fight_Renderer**: La capa de dibujo específica de `screen === 'boss'` que usa el Sprite_Animation_Engine para dibujar el Warrior_Sprite y el Boss_Sprite en el área de combate del canvas.
- **Boss_Rotation**: La regla que determina qué Boss_Sprite aparece en cada combate contra el guardián a lo largo de la partida.
- **First_Round**: Los primeros 5 combates contra el guardián de toda la partida (uno por cada Boss_Sprite, en orden fijo).
- **Battle_Background**: La imagen de fondo (`Fondo_Boss_1.png` a `Fondo_Boss_5.png`) correspondiente al Boss_Sprite activo, estirada para cubrir toda el área visible del Fight_Screen.
- **Fight_Screen**: La pantalla overlay `#bossScreen` que aloja el combate (fondo, sprites, barras de vida, cartas).
- **Combat_Reaction**: Una Animation_Sequence disparada como reacción a un evento de combate (acierto, fallo, victoria, derrota), distinta del `idle` en bucle.
- **Card_Attempt_State**: El número de fallos previos ya registrados para una carta/pregunta concreta dentro del combate en curso; determina si el guerrero reacciona con `bloqueo` (primer fallo) o `herido` (fallos subsecuentes).
- **Alternating_Attack_Boss**: `boss_1_titan_guerrero`, el único Boss_Sprite con dos Sprite_Animation de ataque (`ataque_1`, `ataque_2`) que se alternan en fallos sucesivos dentro del mismo combate.
- **Main_Module**: El módulo `src/main.js`, orquestador de eventos de combate (`onAnswer`, `endFight`) y temporización de transiciones de UI.
- **Sound_Placeholder_Structure**: La estructura de carpetas creada para alojar futuros archivos `.wav` de reacciones del guerrero y de cada boss, sin audio implementado en esta feature.
- **Boss_Display_Name**: El nombre propio mostrado para el Boss_Sprite activo en el `bossLabel` del Fight_Screen, independiente de `BOSS_NAMES` (que está indexado por nivel en `src/data/services.js`): `boss_1_titan_guerrero` → "Titán Guerrero", `boss_2_orco` → "Orco", `boss_3_tigre` → "Tigre", `boss_4_golem` → "Golem", `boss_5_brujo` → "Brujo".

## Requirements

### Requirement 1: Eliminación del combate DOM/CSS obsoleto

**User Story:** Como desarrollador, quiero eliminar por completo la representación DOM/CSS del guerrero y el boss en el combate, para que no queden residuos ni reglas muertas cuando el combate pase a dibujarse en canvas.

#### Acceptance Criteria

1. THE Fight_Screen SHALL render both the Warrior_Sprite and the Boss_Sprite exclusively on the `gameCanvas` element, with no corresponding DOM nodes representing the combatants inside `#bossScreen`.
2. THE Boss_Fight_Stylesheet SHALL contain no style rules referencing `.fighter`, `.facet`, `.knight-head`, `.knight-body`, `.knight-shoulder-l`, `.knight-shoulder-r`, `.knight-sword`, `.knight-legs`, `.boss-core`, `.boss-eye-l`, `.boss-eye-r`, `.boss-crown`, `.boss-arm-l`, `.boss-arm-r`, `.boss-legs`, `.combatant`, `.arena`, or `.vs-badge`.
3. THE Fight_Screen SHALL retain the `hp-label`, `hp-bar` (`playerHpBar`, `bossHpBar`), `fightBanner`, and `cardsRow` DOM elements unchanged in behavior.

### Requirement 2: Motor genérico de animación de sprites

**User Story:** Como desarrollador, quiero un motor de animación de sprites genérico y reutilizable, para poder animar a los 6 personajes (guerrero y 5 bosses) con estructuras de animación distintas sin duplicar código por personaje.

#### Acceptance Criteria

1. THE Sprite_Animation_Engine SHALL load a Sprite_Character's metadata from its JSON file, reading `displayWidth`, `displayHeight`, `frameWidth`, `frameHeight`, and the `animations` map.
2. WHERE a Sprite_Animation entry declares `layout: "grid"`, THE Sprite_Animation_Engine SHALL compute each frame's source rectangle from the declared `columns` and `rows`.
3. WHERE a Sprite_Animation entry declares `layout: "row"`, THE Sprite_Animation_Engine SHALL compute each frame's source rectangle by dividing the sprite sheet into `frameCount` equal horizontal segments.
4. THE Sprite_Animation_Engine SHALL advance the displayed frame of the active Sprite_Animation at the `fps` rate declared for that Sprite_Animation.
5. WHERE a Sprite_Animation declares `loop: false`, THE Sprite_Animation_Engine SHALL hold on the final frame and SHALL signal Animation_Sequence completion instead of restarting.
6. WHERE a Sprite_Animation does not declare `loop: false`, THE Sprite_Animation_Engine SHALL restart the Animation_Sequence from its first frame immediately after reaching its final frame.
7. THE Sprite_Animation_Engine SHALL play any named Sprite_Animation for any Sprite_Character using the same code path, without character-specific conditional branches.
8. WHEN the Sprite_Animation_Engine resumes a Sprite_Character's `idle` Sprite_Animation after any interruption, THE Sprite_Animation_Engine SHALL restart that `idle` Sprite_Animation from its first frame, regardless of the frame at which the interruption occurred.

### Requirement 3: Posicionamiento de combatientes

**User Story:** Como jugador, quiero ver siempre al guerrero a la izquierda y al boss a la derecha, para identificar claramente los bandos del combate.

#### Acceptance Criteria

1. WHILE the Fight_Screen is active, THE Boss_Fight_Renderer SHALL draw the Warrior_Sprite on the left side of the combat area.
2. WHILE the Fight_Screen is active, THE Boss_Fight_Renderer SHALL draw the Boss_Sprite on the right side of the combat area.

### Requirement 4: Rotación de bosses y fondo de pantalla

**User Story:** Como jugador, quiero enfrentar a los 5 guardianes en un orden predecible en mi primera vuelta y luego con variedad aleatoria, con un fondo que corresponda visualmente a cada guardián.

#### Acceptance Criteria

1. WHILE the current game session has resolved fewer than 5 boss combats, THE Boss_Rotation SHALL select `boss_1_titan_guerrero`, `boss_2_orco`, `boss_3_tigre`, `boss_4_golem`, `boss_5_brujo` as the Boss_Sprite for the 1st through 5th boss combats respectively, in that fixed order.
2. WHEN the current game session starts its 6th boss combat or any later boss combat, THE Boss_Rotation SHALL select the Boss_Sprite at random among the 5 available Boss_Sprite entries, allowing any entry to repeat.
3. WHEN a Boss_Sprite is selected for a boss combat, THE Fight_Screen SHALL display the Battle_Background image that corresponds to that Boss_Sprite (`Fondo_Boss_1` for `boss_1_titan_guerrero`, `Fondo_Boss_2` for `boss_2_orco`, `Fondo_Boss_3` for `boss_3_tigre`, `Fondo_Boss_4` for `boss_4_golem`, `Fondo_Boss_5` for `boss_5_brujo`).
4. WHILE the Fight_Screen is active, THE Battle_Background SHALL be scaled to cover the full visible canvas area.
5. WHEN a Boss_Sprite is selected for a boss combat, THE Fight_Screen SHALL display a `bossLabel` composed of that Boss_Sprite's Boss_Display_Name followed by " — Nivel {level}", instead of the level-indexed name produced by `BOSS_NAMES` in `src/data/services.js`.

### Requirement 5: Animación idle del guerrero

**User Story:** Como jugador, quiero que el guerrero se vea vivo en pantalla mientras espera, para que el combate se sienta dinámico.

#### Acceptance Criteria

1. WHILE the Fight_Screen is active and no Combat_Reaction is playing for the Warrior_Sprite, THE Boss_Fight_Renderer SHALL continuously loop the Warrior_Sprite's `idle` Sprite_Animation.
2. WHEN a Combat_Reaction Animation_Sequence for the Warrior_Sprite completes, THE Boss_Fight_Renderer SHALL resume the Warrior_Sprite's `idle` Sprite_Animation.

### Requirement 6: Reacción del guerrero al acertar

**User Story:** Como jugador, quiero ver al guerrero atacar cuando respondo correctamente, y ver al boss reaccionar herido justo después, para percibir el daño causado.

#### Acceptance Criteria

1. WHEN the player answers a card correctly, THE Boss_Fight_Renderer SHALL play the Warrior_Sprite's `ataque` Animation_Sequence to completion before starting any Boss_Sprite Combat_Reaction for that answer.
2. WHEN the Warrior_Sprite's `ataque` Animation_Sequence for a correct answer completes, THE Boss_Fight_Renderer SHALL play the Boss_Sprite's `herido` Animation_Sequence.

### Requirement 7: Reacción al fallar una pregunta

**User Story:** Como jugador, quiero ver al boss atacar cuando fallo una pregunta, y ver al guerrero bloquear el primer golpe o resultar herido en golpes posteriores, para distinguir la gravedad de mis fallos.

#### Acceptance Criteria

1. WHEN the player answers a card incorrectly, THE Boss_Fight_Renderer SHALL play the Boss_Sprite's attack Animation_Sequence (`ataque`, or `ataque_1`/`ataque_2` per Requirement 7.4 WHERE the Boss_Sprite is the Alternating_Attack_Boss) before starting any Warrior_Sprite Combat_Reaction for that answer.
2. WHEN the Boss_Sprite's attack Animation_Sequence completes AND the answered card's Card_Attempt_State had zero prior incorrect attempts, THE Boss_Fight_Renderer SHALL play the Warrior_Sprite's `bloqueo` Animation_Sequence.
3. WHEN the Boss_Sprite's attack Animation_Sequence completes AND the answered card's Card_Attempt_State had one or more prior incorrect attempts, THE Boss_Fight_Renderer SHALL play the Warrior_Sprite's `herido` Animation_Sequence.
4. WHERE the Boss_Sprite is the Alternating_Attack_Boss, THE Boss_Fight_Renderer SHALL alternate between `ataque_1` and `ataque_2` on each successive incorrect answer within the same combat, starting with `ataque_1` on the combat's first incorrect answer.
5. WHEN a new boss combat starts against the Alternating_Attack_Boss, THE Boss_Fight_Renderer SHALL reset the ataque_1/ataque_2 alternation counter so that the combat's first incorrect answer always plays `ataque_1`, regardless of the alternation state reached in any previous combat.

### Requirement 8: Animación idle del boss

**User Story:** Como jugador, quiero que el boss se vea vivo en pantalla mientras espera, para que el combate se sienta dinámico.

#### Acceptance Criteria

1. WHILE the Fight_Screen is active and no Combat_Reaction is playing for the Boss_Sprite, THE Boss_Fight_Renderer SHALL continuously loop the Boss_Sprite's `idle` Sprite_Animation.
2. WHEN a Combat_Reaction Animation_Sequence for the Boss_Sprite completes, THE Boss_Fight_Renderer SHALL resume the Boss_Sprite's `idle` Sprite_Animation.

### Requirement 9: Secuencia de derrota del guerrero

**User Story:** Como jugador, quiero ver al guerrero caer cuando pierdo el combate, y que la transición a la caída de la torre ocurra justo cuando esa animación termina.

#### Acceptance Criteria

1. WHEN the answer that produces `outcome === 'lose'` is processed, THE Boss_Fight_Renderer SHALL play the full failure Combat_Reaction (Requirement 7) for that answer to completion before starting the Warrior_Sprite's `morir` Animation_Sequence.
2. THE Boss_Fight_Renderer SHALL NOT start the Warrior_Sprite's `morir` Animation_Sequence while the failure Combat_Reaction (Requirement 7) for the resolving answer is still playing.
3. WHEN the Warrior_Sprite's `morir` Animation_Sequence completes, THE Main_Module SHALL close the Fight_Screen and transition `gameState.screen` to `'falling'`.

### Requirement 10: Secuencia de derrota del boss

**User Story:** Como jugador, quiero ver al boss caer cuando lo derroto, y que el juego continúe justo cuando esa animación termina.

#### Acceptance Criteria

1. WHEN the answer that produces `outcome === 'win'` is processed, THE Boss_Fight_Renderer SHALL play the full success Combat_Reaction (Requirement 6) for that answer to completion before starting the Boss_Sprite's `morir` Animation_Sequence.
2. THE Boss_Fight_Renderer SHALL NOT start the Boss_Sprite's `morir` Animation_Sequence while the success Combat_Reaction (Requirement 6) for the resolving answer is still playing.
3. WHEN the Boss_Sprite's `morir` Animation_Sequence completes, THE Main_Module SHALL close the Fight_Screen and transition `gameState.screen` to `'build'`.

### Requirement 11: Temporización de la UI derivada de las animaciones

**User Story:** Como desarrollador, quiero que las transiciones de UI del combate (banner, refresco de carta, cierre de pantalla) se sincronicen con la duración real de cada secuencia de animación en lugar de temporizadores fijos, para que nunca se corten animaciones a mitad de reproducción.

#### Acceptance Criteria

1. WHEN a correct answer resolves the combat with `outcome === 'win'`, THE Main_Module SHALL display the victory banner only after the Warrior_Sprite `ataque` and Boss_Sprite `herido` Animation_Sequences for that answer have both completed.
2. WHEN an incorrect answer resolves the combat with `outcome === 'lose'`, THE Main_Module SHALL display the defeat banner only after the Boss_Sprite attack and Warrior_Sprite `bloqueo`/`herido` Animation_Sequences for that answer have both completed.
3. WHEN a correct answer does not resolve the combat, THE Main_Module SHALL flip the answered card back to its front face and re-enable it for further interaction only after the Warrior_Sprite `ataque` and Boss_Sprite `herido` Animation_Sequences for that answer have both completed.
4. THE Main_Module SHALL derive all Fight_Screen transition timing described in Requirements 9, 10, and 11.1-11.3 from Sprite_Animation_Engine completion signals rather than from fixed millisecond timeouts.

### Requirement 12: Los efectos de sonido existentes se mantienen inmediatos

**User Story:** Como jugador, quiero seguir escuchando el sonido de acierto/fallo/victoria/derrota en el mismo instante que hoy, para no perder la respuesta auditiva inmediata al responder.

#### Acceptance Criteria

1. WHEN the player answers a card, THE Main_Module SHALL play `sfx.correct()` or `sfx.wrong()` immediately after updating the health pip bars, independent of any Combat_Reaction Animation_Sequence duration.
2. WHEN `outcome === 'win'`, THE Main_Module SHALL play `sfx.win()` immediately after updating the health pip bars, independent of any Combat_Reaction Animation_Sequence duration.
3. WHEN `outcome === 'lose'`, THE Main_Module SHALL play `sfx.lose()` immediately after updating the health pip bars, independent of any Combat_Reaction Animation_Sequence duration.

### Requirement 13: Estructura de carpetas para audio futuro

**User Story:** Como desarrollador, quiero tener ya preparada la estructura de carpetas para los sonidos de combate que se añadirán después, para que el usuario pueda colocar sus archivos `.wav` sin tener que crear la jerarquía de directorios manualmente.

#### Acceptance Criteria

1. THE Sound_Placeholder_Structure SHALL provide one directory per Boss_Sprite (`boss_1_titan_guerrero`, `boss_2_orco`, `boss_3_tigre`, `boss_4_golem`, `boss_5_brujo`) under a dedicated bosses audio location.
2. THE Sound_Placeholder_Structure SHALL provide, within each Boss_Sprite's directory, one subdirectory per combat action (`idle`, `ataque` — or `ataque_1` and `ataque_2` WHERE the Boss_Sprite is the Alternating_Attack_Boss —, `herido`, `morir`).
3. THE Sound_Placeholder_Structure SHALL provide subdirectories for the Warrior_Sprite's `bloqueo`, `herido`, and `morir` actions, which currently have no associated audio file in `AUDIO_MAP`.
4. WHERE a Sound_Placeholder_Structure directory has no user-supplied audio file yet, THE Sound_Placeholder_Structure SHALL contain a placeholder file (e.g. `.gitkeep`) so the empty directory is preserved in version control.

### Requirement 14: Preservación de la lógica de negocio de combate

**User Story:** Como desarrollador, quiero que la capa visual de sprites nunca altere el cálculo de daño, vida o resultado del combate, para no introducir regresiones en la mecánica ya validada.

#### Acceptance Criteria

1. THE Boss_Fight_Renderer and Sprite_Animation_Engine SHALL read combat state (`cardCount`, `playerPips`, `bossPips`, `resolved`, `outcome`, `correct`) produced by `startBossFight` and `answerCard` in `src/combat/fight.js` without modifying those values or their computation.

### Requirement 15: Bloqueo global de interacción durante una Combat_Reaction

**User Story:** Como jugador, quiero que no se acepten nuevas respuestas mientras se está reproduciendo cualquier animación de reacción de combate, para que no pueda disparar una segunda respuesta antes de que termine la reacción visual en curso.

#### Acceptance Criteria

1. WHEN any Combat_Reaction Animation_Sequence begins for the Warrior_Sprite or the Boss_Sprite as a result of a correct answer (Requirement 6) or an incorrect answer (Requirement 7), THE Boss_Fight_Renderer SHALL disable every unlocked card in `cardsRow`, not only the card that was just answered.
2. WHILE any Combat_Reaction Animation_Sequence is playing for the Warrior_Sprite or the Boss_Sprite, THE Fight_Screen SHALL reject further answer attempts on any card.
3. WHEN the Combat_Reaction sequence triggered by an answer completes and both the Warrior_Sprite and the Boss_Sprite have resumed their `idle` Sprite_Animation, THE Boss_Fight_Renderer SHALL re-enable every card that is not locked by Card_Attempt_State.
