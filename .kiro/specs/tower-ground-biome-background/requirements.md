# Requirements Document

## Introduction

Esta feature añade dos mejoras visuales al mundo procedural de "Torre de las Nubes", dibujado en `src/render/draw.js`. Primero, introduce un `Ground_Visual` (suelo de pasto y tierra) dibujado en la base de la torre para que `baseFloor` y el guerrero dejen de parecer flotando sobre el fondo de cielo. Segundo, sustituye el fondo de cielo actualmente fijo de noche (`drawSky`) por un sistema de variedad de ambiente compuesto por dos catálogos independientes: 5 `Biome` (Tundra, Sabana, Desierto, Bosque templado, Taiga) y 4 `Time_Of_Day` (Mañana, Día, Tarde, Noche). Ambos catálogos se seleccionan una sola vez por `Game_Session`, en el momento en que `createTowerState`/`resetGame` (en `src/engine/tower.js`) inicializan una nueva partida, siguiendo cada uno el mismo patrón de rotación "orden fijo y luego aleatorio con repetición" que ya usa `selectBoss` en `src/data/bossRoster.js`, pero con dos contadores en memoria independientes entre sí y separados de `gameState.doorsPassed`. Toda la variación visual (suelo y cielo) se produce mediante dibujo procedural en canvas (gradientes, formas, paths), en el mismo estilo que `drawSky` y `drawFacetedBlock`, sin introducir ningún asset de imagen nuevo. Ni la física de la torre, ni la resolución de combates, ni la puntuación se ven afectadas por esta feature.

## Glossary

- **Game_Session**: Una partida de "Torre de las Nubes", desde que `createTowerState` o `resetGame` inicializan un nuevo estado de torre hasta que la pestaña se recarga por completo o comienza una nueva Game_Session mediante otra llamada a `resetGame`.
- **Ground_Visual**: El terreno de pasto y tierra dibujado procedimentalmente en y alrededor de `baseFloor`, que ancla visualmente la torre al suelo en lugar de dejarla flotando sobre el fondo.
- **Biome**: Uno de los 5 temas ambientales fijos (Tundra, Sabana, Desierto, Bosque_Templado, Taiga) que determina la paleta de colores procedural y las señales de vegetación usadas por el Environment_Renderer y el Ground_Visual durante la Game_Session actual.
- **Biome_Catalog**: La lista fija y ordenada de las 5 entradas de Biome (Tundra, Sabana, Desierto, Bosque_Templado, Taiga) en orden de catálogo, análoga a `BOSS_ROSTER`.
- **Time_Of_Day**: Uno de los 4 temas de iluminación fijos (Mañana, Día, Tarde, Noche) que determina el degradado de cielo, la visibilidad de estrellas y las señales de sol/luna usadas por el Environment_Renderer durante la Game_Session actual, de forma independiente al Biome.
- **Time_Of_Day_Catalog**: La lista fija y ordenada de las 4 entradas de Time_Of_Day (Mañana, Día, Tarde, Noche) en orden de catálogo.
- **Biome_Rotation**: La función de selección que determina qué entrada de Biome_Catalog se usa en una Game_Session, replicando el patrón fijo-luego-aleatorio de `selectBoss` sobre el Biome_Catalog.
- **Time_Of_Day_Rotation**: La función de selección que determina qué entrada de Time_Of_Day_Catalog se usa en una Game_Session, replicando el patrón fijo-luego-aleatorio de `selectBoss` sobre el Time_Of_Day_Catalog.
- **Biome_Session_Counter**: Un contador en memoria, a nivel de módulo, de Game_Session iniciadas, consumido por Biome_Rotation; independiente de `gameState.doorsPassed` y del Time_Of_Day_Session_Counter.
- **Time_Of_Day_Session_Counter**: Un contador en memoria, a nivel de módulo, de Game_Session iniciadas, consumido por Time_Of_Day_Rotation; independiente de `gameState.doorsPassed` y del Biome_Session_Counter.
- **Active_Biome**: La entrada de Biome seleccionada por Biome_Rotation para la Game_Session actual, almacenada en el estado del juego durante el resto de esa sesión.
- **Active_Time_Of_Day**: La entrada de Time_Of_Day seleccionada por Time_Of_Day_Rotation para la Game_Session actual, almacenada en el estado del juego durante el resto de esa sesión.
- **Environment_Renderer**: La extensión de `drawSky` (y del dibujo del Ground_Visual) que lee Active_Biome y Active_Time_Of_Day para variar el degradado de cielo, la visibilidad de estrellas, los colores de las colinas y los colores del suelo, reemplazando la paleta fija de noche actual.

## Requirements

### Requirement 1: Suelo visible en la base de la torre

**User Story:** Como jugador, quiero ver un suelo de pasto y tierra debajo de la torre, para que la torre y el personaje no parezcan estar flotando.

#### Acceptance Criteria

1. WHILE `gameState.screen` is `'build'`, `'boss'`, or `'falling'` AND `floors[0]` (`baseFloor`) is visible on screen, THE Environment_Renderer SHALL draw a Ground_Visual beneath and around `baseFloor`'s screen position.
2. THE Ground_Visual SHALL be drawn using only procedural canvas drawing (gradients, fills, paths), consistent with the low-poly faceted visual style of `drawFacetedBlock`, and SHALL introduce no new image assets.
3. THE Ground_Visual SHALL extend across the full width of the visible canvas at the vertical position of `baseFloor`'s bottom edge, so that no gap of sky/background is visible between the tower base and the bottom of the canvas.
4. THE Environment_Renderer SHALL draw the Ground_Visual after `drawSky` and before `baseFloor`'s `drawFacetedBlock` call, so `baseFloor` remains fully visible on top of it.

### Requirement 2: Catálogo de biomas

**User Story:** Como jugador, quiero que la torre tenga distintos ambientes visuales (biomas), para que el entorno no se sienta siempre igual.

#### Acceptance Criteria

1. THE Biome_Catalog SHALL contain exactly 5 entries in this fixed order: Tundra, Sabana, Desierto, Bosque_Templado, Taiga.
2. EACH Biome entry in the Biome_Catalog SHALL define a procedural sky color set, hill/ground color set, and vegetation cue that is visually distinct from every other Biome entry's sky color set, hill/ground color set, and vegetation cue.
3. WHEN the Active_Biome is Tundra, THE Environment_Renderer SHALL render snow/ice-tinted hill and ground colors.
4. WHEN the Active_Biome is Sabana, THE Environment_Renderer SHALL render dry-grass/savanna-toned hill and ground colors.
5. WHEN the Active_Biome is Desierto, THE Environment_Renderer SHALL render sandy/dune-toned hill and ground colors.
6. WHEN the Active_Biome is Bosque_Templado, THE Environment_Renderer SHALL render green-forest-toned hill and ground colors.
7. WHEN the Active_Biome is Taiga, THE Environment_Renderer SHALL render conifer-forest-toned hill and ground colors that are visually distinct from Bosque_Templado's hill and ground colors.

### Requirement 3: Catálogo de momentos del día

**User Story:** Como jugador, quiero que el cielo cambie entre mañana, día, tarde y noche, para que la torre no se vea siempre de noche.

#### Acceptance Criteria

1. THE Time_Of_Day_Catalog SHALL contain exactly 4 entries in this fixed order: Mañana, Día, Tarde, Noche.
2. EACH Time_Of_Day entry in the Time_Of_Day_Catalog SHALL define a procedural sky gradient, star-visibility level, and sun/moon cue that is visually distinct from every other Time_Of_Day entry's sky gradient, star-visibility level, and sun/moon cue.
3. WHEN the Active_Time_Of_Day is Noche, THE Environment_Renderer SHALL render a dark sky gradient with visible stars, consistent with the star-rendering behavior currently present in `drawSky`.
4. WHEN the Active_Time_Of_Day is Mañana, Día, or Tarde, THE Environment_Renderer SHALL render a sky gradient with no visible stars and a sun cue whose color and/or position reflects that specific Time_Of_Day.
5. THE Environment_Renderer SHALL apply the Active_Time_Of_Day's sky gradient, star-visibility, and sun/moon treatment independently of, and combined together with, the Active_Biome's hill and ground colors.

### Requirement 4: Rotación de biomas

**User Story:** Como jugador, quiero recorrer los 5 biomas en un orden predecible en mis primeras partidas y luego con variedad aleatoria, similar a como ya funciona la rotación de bosses.

#### Acceptance Criteria

1. WHILE the Biome_Session_Counter's value at the start of a Game_Session is less than 5 (i.e., for the 1st through 5th Game_Session), THE Biome_Rotation SHALL select the Biome_Catalog entry at the index equal to that counter value, following Biome_Catalog order (Tundra, Sabana, Desierto, Bosque_Templado, Taiga), mirroring `selectBoss`'s fixed-order behavior.
2. WHEN the Biome_Session_Counter's value at the start of a Game_Session is 5 or greater (i.e., the 6th Game_Session or any later Game_Session), THE Biome_Rotation SHALL select a Biome_Catalog entry at random among all 5 entries, allowing any entry to repeat, mirroring `selectBoss`'s random-with-repetition behavior.
3. WHEN a Game_Session starts, THE Biome_Rotation SHALL increment the Biome_Session_Counter by exactly 1.
4. THE Biome_Session_Counter SHALL be held in-memory as a module-level value, separate from `gameState.doorsPassed` and from the Time_Of_Day_Session_Counter.

### Requirement 5: Rotación de momentos del día

**User Story:** Como jugador, quiero recorrer los 4 momentos del día en un orden predecible en mis primeras partidas y luego con variedad aleatoria, de forma independiente a la rotación de biomas.

#### Acceptance Criteria

1. WHILE the Time_Of_Day_Session_Counter's value at the start of a Game_Session is less than 4 (i.e., for the 1st through 4th Game_Session), THE Time_Of_Day_Rotation SHALL select the Time_Of_Day_Catalog entry at the index equal to that counter value, following Time_Of_Day_Catalog order (Mañana, Día, Tarde, Noche), mirroring `selectBoss`'s fixed-order behavior.
2. WHEN the Time_Of_Day_Session_Counter's value at the start of a Game_Session is 4 or greater (i.e., the 5th Game_Session or any later Game_Session), THE Time_Of_Day_Rotation SHALL select a Time_Of_Day_Catalog entry at random among all 4 entries, allowing any entry to repeat, mirroring `selectBoss`'s random-with-repetition behavior.
3. WHEN a Game_Session starts, THE Time_Of_Day_Rotation SHALL increment the Time_Of_Day_Session_Counter by exactly 1.
4. THE Time_Of_Day_Session_Counter SHALL be held in-memory as a module-level value, separate from `gameState.doorsPassed` and from the Biome_Session_Counter.
5. THE Biome_Rotation and Time_Of_Day_Rotation SHALL operate as two independent rotations rather than as a single combined fixed-order rotation over all Biome/Time_Of_Day combinations.

### Requirement 6: Selección única por partida y persistencia durante la sesión

**User Story:** Como jugador, quiero que el bioma y el momento del día elegidos para mi partida se mantengan fijos durante toda esa partida, sin cambiar mientras juego.

#### Acceptance Criteria

1. WHEN `createTowerState` or `resetGame` executes to start a new Game_Session, THE system SHALL invoke Biome_Rotation and Time_Of_Day_Rotation exactly once each and SHALL store the resulting Active_Biome and Active_Time_Of_Day on the game state produced/mutated by that call.
2. THE Active_Biome and Active_Time_Of_Day SHALL NOT change for the remainder of a Game_Session, regardless of how many doors are opened, how many floors are built, how many boss combats resolve (i.e., regardless of changes to `gameState.doorsPassed`), or how much real wall-clock time elapses.
3. THE selection of Active_Biome and Active_Time_Of_Day SHALL be triggered only by `createTowerState`/`resetGame` starting a Game_Session, and SHALL NOT be triggered by a door opening, a boss fight resolving, floor count/height, or real wall-clock time.
4. WHEN `resetGame` executes to start a subsequent Game_Session (for example, after a game over and restart), THE system SHALL re-invoke Biome_Rotation and Time_Of_Day_Rotation to select new Active_Biome and Active_Time_Of_Day values for that new Game_Session, replacing the previous Game_Session's stored values.

### Requirement 7: Integración en el renderizado sin afectar la lógica del juego

**User Story:** Como jugador, quiero que el fondo de la torre refleje el bioma y momento del día elegidos, sin que esto afecte cómo se juega o se puntúa la partida.

#### Acceptance Criteria

1. THE Environment_Renderer SHALL replace `drawSky`'s current fixed night-time gradient, star, and hills output with output derived from the current Game_Session's Active_Biome and Active_Time_Of_Day.
2. THE Environment_Renderer SHALL preserve the parallax cloud drawing behavior currently provided by `drawCloud` and `gameState.clouds` (position and parallax motion unchanged), adapting only cloud color/opacity if needed for readability against the Active_Time_Of_Day sky.
3. THE Environment_Renderer SHALL NOT alter floor placement, block-drop physics, combat resolution (`src/combat/fight.js`), or scoring logic in any way.
4. THE Environment_Renderer SHALL introduce no new image asset files; all Biome and Time_Of_Day visual variation SHALL be produced exclusively via procedural canvas drawing (gradients, shapes, paths).

### Requirement 8: Adaptación del suelo al bioma activo

**User Story:** Como jugador, quiero que el suelo bajo la torre cambie de color y vegetación según el bioma activo, para que combine visualmente con el resto del ambiente.

#### Acceptance Criteria

1. WHEN the Active_Biome is Tundra, THE Ground_Visual SHALL render snow-tinted ground colors.
2. WHEN the Active_Biome is Sabana, THE Ground_Visual SHALL render dry-grass-toned ground colors.
3. WHEN the Active_Biome is Desierto, THE Ground_Visual SHALL render sandy ground colors with no grass vegetation cue.
4. WHEN the Active_Biome is Bosque_Templado, THE Ground_Visual SHALL render green-grass ground colors.
5. WHEN the Active_Biome is Taiga, THE Ground_Visual SHALL render taiga-appropriate ground colors with procedurally drawn conifer vegetation cues that are visually distinct from Bosque_Templado's ground treatment.
6. THE Ground_Visual's per-biome color and vegetation adaptation SHALL introduce no new image assets, consistent with Requirement 7.4.

### Requirement 9: Contadores de rotación únicamente en memoria

**User Story:** Como desarrollador, quiero que los contadores de rotación de bioma y momento del día vivan solo en memoria, para no tener que diseñar ni mantener un mecanismo de persistencia.

#### Acceptance Criteria

1. THE Biome_Session_Counter and Time_Of_Day_Session_Counter SHALL be held exclusively as in-memory, module-level JavaScript variables.
2. THE system SHALL NOT persist the Biome_Session_Counter, the Time_Of_Day_Session_Counter, the Active_Biome, or the Active_Time_Of_Day to `localStorage`, `sessionStorage`, cookies, or any other persistence mechanism.
3. WHEN the page is fully reloaded, THE Biome_Session_Counter and Time_Of_Day_Session_Counter SHALL naturally reset to their initial value (0) as a consequence of module re-instantiation, with no dedicated reset code required.
