# Requirements Document

## Introduction

El juego "Torre de las Nubes" reproduce actualmente sus efectos de sonido puntuales (`sfx.js`) pero no cuenta con música de fondo continua ni con un control de configuración de audio accesible al jugador.

Esta funcionalidad introduce **dos pistas de música** administradas por un único reproductor:

1. **Música general**: pista `music_background_music_medieval.wav`, que suena únicamente mientras el jugador está construyendo la torre (pantalla `build`), incluyendo la breve animación de caída que precede a la pantalla de fin de partida.
2. **Música de combate**: pista `music_combat.mp3`, que suena específicamente mientras el jugador está enfrentando a un guardián (pantalla `boss`), disparado al atravesar una puerta.

La música de fondo **no suena** durante la pantalla de inicio (`start`) ni durante la pantalla de fin de partida (`gameover`): al entrar a cualquiera de estas dos pantallas, la reproducción se pausa (no se detiene ni se reinicia), conservando su posición para reanudarse exactamente donde quedó cuando el jugador vuelva a construir la torre o a enfrentar un guardián.

Ambos archivos están grabados a volumen alto (100% de su volumen real) y ambos deben comenzar a sonar al **6% de su volumen real** por defecto, para no resultar intrusivos.

El jugador controla la música mediante **un único control de configuración general** (`Settings_Button` + `Audio_Settings_Panel`) que permite mutear/desmutear y ajustar el volumen de "la música" en general. Este control no distingue entre pista general y pista de combate: afecta a ambas por igual y de forma simultánea, y no afecta a los efectos de sonido puntuales de `sfx.js`.

## Glossary

- **Background_Music_Player**: El módulo responsable de gestionar la reproducción de música de fondo del juego. Administra ambas Music_Track (general y de combate) y garantiza que como máximo una esté sonando a la vez, aplicando a ambas el mismo Effective_Volume y Mute_State.
- **Music_Track**: Una pista de música gestionada por el Background_Music_Player. Existen dos: `general` (archivo `music_background_music_medieval.wav`) y `combat` (archivo `music_combat.mp3`). Solo una Music_Track puede estar activa (sonando) en un momento dado.
- **Active_Track**: La Music_Track que el Background_Music_Player está reproduciendo en un momento dado (`general`, `combat`, o ninguna si el juego aún no ha iniciado reproducción).
- **Boss_Fight**: El estado del juego en el que el jugador enfrenta a un guardián tras atravesar una puerta, gestionado por `src/combat/fight.js`.
- **Music_Active_Screen**: Cualquiera de las pantallas o estados del juego durante los cuales el Background_Music_Player debe mantener una Music_Track sonando: la pantalla de construcción de la torre (`build`), el Boss_Fight (`boss`), y el estado transitorio de caída del caballero (`falling`) que precede inmediatamente a la pantalla de fin de partida.
- **Music_Inactive_Screen**: Cualquiera de las pantallas del juego durante las cuales el Background_Music_Player debe mantener la reproducción en pausa: la pantalla de inicio (`start`) y la pantalla de fin de partida (`gameover`).
- **Base_Volume**: El nivel de volumen real de reproducción de un archivo de audio de música al 100% (volumen máximo del archivo), previo a aplicar el Effective_Volume.
- **Default_Volume_Level**: El nivel de volumen inicial aplicado a ambas Music_Track la primera vez que se reproducen, equivalente al 6% del Base_Volume.
- **Effective_Volume**: El nivel de volumen resultante que se aplica por igual a ambas Music_Track, determinado por el nivel elegido por el jugador en el Volume_Slider y por el Mute_State. Es un valor único y compartido entre la pista general y la pista de combate.
- **Mute_State**: El estado booleano (silenciado / no silenciado) controlado por el jugador, que se aplica de forma unificada a ambas Music_Track y nunca a los efectos de `sfx.js`.
- **Settings_Button**: El control de interfaz que el jugador utiliza para abrir el Audio_Settings_Panel.
- **Audio_Settings_Panel**: El panel de interfaz que contiene el control de mute y el Volume_Slider, único para toda la música del juego.
- **Volume_Slider**: El control deslizante dentro del Audio_Settings_Panel que permite al jugador ajustar el Effective_Volume aplicado a ambas Music_Track.
- **Stored_Audio_Preference**: La preferencia de audio (Effective_Volume y Mute_State) persistida por el Background_Music_Player entre sesiones de juego, y aplicada por igual a ambas Music_Track al cargar cualquiera de ellas.
- **Autoplay_Restriction**: La política del navegador que impide la reproducción automática de audio con sonido antes de una interacción explícita del usuario con la página.

## Requirements

### Requirement 1: Reproducción continua y alternancia entre pistas de música

**User Story:** Como jugador, quiero escuchar música de fondo apropiada al contexto del juego (ambiente general o combate), para tener una experiencia más inmersiva sin que ambas pistas se superpongan.

#### Acceptance Criteria

1. WHEN el jugador realiza la primera interacción que habilita la reproducción de audio y el juego se encuentra en un Music_Active_Screen, THE Background_Music_Player SHALL iniciar la reproducción de la Music_Track `general` en bucle continuo desde el inicio de la pista.
2. WHILE el juego se encuentra en la pantalla de construcción de la torre (`build`) o en el estado transitorio de caída (`falling`) posterior a ella, THE Background_Music_Player SHALL mantener la Music_Track `general` como Active_Track en bucle continuo.
3. WHEN el estado del juego transiciona a Boss_Fight (al atravesar una puerta), THE Background_Music_Player SHALL pausar la Music_Track `general` si se encuentra reproduciéndose, conservando su posición de reproducción, y SHALL reproducir la Music_Track `combat` en bucle continuo como Active_Track.
4. WHEN el Boss_Fight finaliza por victoria del jugador y el juego regresa a la pantalla de construcción de la torre, THE Background_Music_Player SHALL detener la Music_Track `combat` y SHALL resumir la reproducción de la Music_Track `general` como Active_Track desde el punto exacto en que fue pausada, o desde el inicio de la pista si esta nunca había comenzado a reproducirse.
5. WHEN el estado del juego transiciona a la pantalla de inicio (`start`) o a la pantalla de fin de partida (`gameover`), THE Background_Music_Player SHALL pausar la Active_Track, si existe una reproduciéndose en ese momento, conservando su posición de reproducción, sin detenerla ni reiniciarla.
6. WHEN el jugador inicia una nueva partida desde la pantalla de inicio o desde la pantalla de fin de partida y el juego transiciona a la pantalla de construcción de la torre (`build`), THE Background_Music_Player SHALL resumir la reproducción de la Music_Track `general` como Active_Track desde el punto exacto en que fue pausada al entrar a dicha pantalla, o desde el inicio de la pista si esta nunca había comenzado a reproducirse.
7. THE Background_Music_Player SHALL garantizar que, en todo momento, como máximo una Music_Track se encuentre sonando simultáneamente.
8. WHILE el Mute_State está activo, THE Background_Music_Player SHALL mantener la alternancia y las transiciones de pausa/reanudación entre Music_Track descritas en los criterios 1.1 a 1.6 sin reproducir audio audible.
9. IF el archivo de audio de la Active_Track no puede cargarse o reproducirse, THEN THE Background_Music_Player SHALL continuar la ejecución del juego sin lanzar una excepción no controlada, sin reintentar automáticamente la reproducción fallida, y SHALL continuar respondiendo a las transiciones de estado descritas en los criterios 1.1 a 1.6 con normalidad.

### Requirement 2: Volumen inicial reducido compartido entre ambas pistas

**User Story:** Como jugador, quiero que la música de fondo no sea intrusiva ni abrumadora al empezar a jugar, sin importar si es la pista general o la de combate.

#### Acceptance Criteria

1. WHEN el Background_Music_Player reproduce por primera vez en la sesión de juego, ya sea la Music_Track `general` o la Music_Track `combat`, y no existe un Stored_Audio_Preference previo, THE Background_Music_Player SHALL aplicar como Effective_Volume el Default_Volume_Level (equivalente al 6% del Base_Volume) y establecer el Mute_State como inactivo, aplicando ambos valores de forma compartida a las dos Music_Track para toda reproducción posterior dentro de esa sesión.
2. THE Background_Music_Player SHALL aplicar el mismo Effective_Volume a la Music_Track `general` y a la Music_Track `combat`, de modo que un cambio de volumen afecte a ambas por igual, incluso si en ese momento solo una de ellas es la Active_Track.
3. WHEN el Background_Music_Player alterna la Active_Track entre `general` y `combat` (Requirement 1), THE Background_Music_Player SHALL aplicar a la nueva Active_Track el Effective_Volume y el Mute_State vigentes en el momento de la alternancia.

### Requirement 3: Acceso al control de configuración de audio

**User Story:** Como jugador, quiero acceder fácilmente a un control de configuración de audio, para ajustar la música del juego según mi preferencia.

#### Acceptance Criteria

1. WHILE el juego se encuentra en cualquiera de las pantallas del juego (inicio, construcción de la torre, Boss_Fight o fin de partida), independientemente de si el Background_Music_Player se encuentra reproduciendo o pausado en ese momento, THE Settings_Button SHALL permanecer visible en pantalla y responder a la interacción del jugador (clic, tap o teclado).
2. WHEN el jugador activa el Settings_Button mientras el Audio_Settings_Panel está oculto, THE Audio_Settings_Panel SHALL mostrarse con el control de mute reflejando el Mute_State vigente y el Volume_Slider reflejando el Effective_Volume vigente.
3. WHEN el jugador activa el Settings_Button mientras el Audio_Settings_Panel ya está visible, THE Audio_Settings_Panel SHALL ocultarse sin alterar el Effective_Volume ni el Mute_State vigentes.
4. WHEN el jugador activa el control de cierre del Audio_Settings_Panel, THE Audio_Settings_Panel SHALL ocultarse sin alterar el Effective_Volume ni el Mute_State vigentes.

### Requirement 4: Control unificado de silencio (mute) para ambas pistas

**User Story:** Como jugador, quiero poder silenciar la música del juego con un único control, sin tener que silenciar cada pista por separado.

#### Acceptance Criteria

1. WHEN el jugador activa el control de mute en el Audio_Settings_Panel, THE Background_Music_Player SHALL establecer el Mute_State como activo y silenciar de forma simultánea tanto la Music_Track `general` como la Music_Track `combat`, independientemente de cuál sea la Active_Track en ese momento, incluyendo el caso en que ninguna Music_Track esté reproduciéndose todavía.
2. WHEN el jugador desactiva el control de mute en el Audio_Settings_Panel, THE Background_Music_Player SHALL establecer el Mute_State como inactivo y restaurar el Effective_Volume vigente para la Active_Track, si existe una en ese momento.
3. IF no existe ninguna Active_Track en el momento en que el jugador activa o desactiva el control de mute, THEN THE Background_Music_Player SHALL almacenar el Mute_State actualizado y SHALL aplicarlo a la Music_Track que se convierta en Active_Track al iniciar su reproducción.
4. THE Background_Music_Player SHALL aplicar el control de mute exclusivamente a las Music_Track que gestiona, sin alterar la reproducción de los efectos de sonido de `sfx.js`.

### Requirement 5: Control unificado de volumen mediante slider

**User Story:** Como jugador, quiero ajustar el volumen de la música del juego con un único control deslizante, para adecuarlo a mi preferencia sin distinguir entre pista general y de combate.

#### Acceptance Criteria

1. WHEN el jugador ajusta el Volume_Slider en el Audio_Settings_Panel a un valor entre 0% y 100% del Base_Volume, THE Background_Music_Player SHALL actualizar el Effective_Volume compartido a ese valor y aplicarlo a la Active_Track, si existe una en ese momento, sin requerir una acción de confirmación adicional.
2. WHEN el jugador ajusta el Volume_Slider mientras el Mute_State está activo, THE Background_Music_Player SHALL almacenar el nuevo Effective_Volume sin reproducir audio audible hasta que el Mute_State se desactive.
3. THE Volume_Slider SHALL permitir seleccionar cualquier valor entre 0% y 100% del Base_Volume, y SHALL reflejar el Effective_Volume vigente, compartido entre ambas Music_Track, cada vez que el Audio_Settings_Panel se muestra.
4. WHEN el jugador ajusta el Volume_Slider a 0%, THE Background_Music_Player SHALL tratar dicho valor como silencio audible a través del Effective_Volume, sin modificar el Mute_State gestionado por el control de mute del Requirement 4.

### Requirement 6: Persistencia de la preferencia de audio para ambas pistas

**User Story:** Como jugador, quiero que mi preferencia de volumen y silencio se recuerde entre sesiones de juego, para no tener que reconfigurarla cada vez que juego, sin importar qué pista de música esté sonando.

#### Acceptance Criteria

1. WHEN el jugador modifica el Mute_State o el Effective_Volume, THE Background_Music_Player SHALL guardar de inmediato un Stored_Audio_Preference que represente ambos valores.
2. IF el intento de guardar el Stored_Audio_Preference falla por cualquier motivo, THEN THE Background_Music_Player SHALL continuar la ejecución del juego sin lanzar una excepción no controlada, conservando el Mute_State y el Effective_Volume vigentes en memoria para la sesión actual.
3. WHEN el Background_Music_Player reproduce por primera vez en la sesión cualquiera de las dos Music_Track (`general` o `combat`), IF existe un Stored_Audio_Preference guardado de una sesión anterior, THEN THE Background_Music_Player SHALL aplicar dicho Stored_Audio_Preference como Effective_Volume y Mute_State compartidos, en lugar del Default_Volume_Level.
4. IF no existe un Stored_Audio_Preference guardado al cargar el juego, THEN THE Background_Music_Player SHALL aplicar el Default_Volume_Level descrito en el Requirement 2 a ambas Music_Track.
5. IF el Stored_Audio_Preference encontrado está corrupto, incompleto, o contiene un valor de Effective_Volume fuera del rango de 0% a 100% del Base_Volume, THEN THE Background_Music_Player SHALL descartar dicho Stored_Audio_Preference y SHALL aplicar el Default_Volume_Level descrito en el Requirement 2 a ambas Music_Track.

### Requirement 7: Cumplimiento de restricciones de autoplay del navegador

**User Story:** Como jugador, quiero que el juego no falle ni muestre errores si el navegador bloquea la reproducción automática de música, para tener una experiencia fluida independientemente de la política de autoplay.

#### Acceptance Criteria

1. IF el navegador aplica una Autoplay_Restriction que impide iniciar la reproducción de una Music_Track sin interacción previa del usuario, THEN THE Background_Music_Player SHALL diferir el inicio de la reproducción hasta que ocurra la primera interacción del usuario con la página, entendida como un clic, un toque (tap) o una pulsación de tecla.
2. WHEN el jugador activa el Start_Button en la pantalla de inicio, THE Background_Music_Player SHALL reconocer dicha interacción como la primera interacción calificante del usuario descrita en el criterio 1.
3. WHEN el juego transiciona a la pantalla de construcción de la torre (`build`) inmediatamente después de que el jugador activa el Start_Button, THE Background_Music_Player SHALL iniciar la reproducción de la Music_Track `general`, aplicando el Effective_Volume y el Mute_State vigentes en ese momento.
4. IF el intento de reproducción de una Music_Track es rechazado por una Autoplay_Restriction, THEN THE Background_Music_Player SHALL continuar la ejecución del juego sin lanzar una excepción no controlada, y SHALL mantener sin cambios el Effective_Volume y el Mute_State vigentes.

### Requirement 8: Convivencia entre música de fondo y efectos de sonido puntuales

**User Story:** Como desarrollador, quiero que el control de música de fondo no interfiera con los efectos de sonido existentes, ni que las dos pistas de música interfieran entre sí más allá de su alternancia esperada, para mantener ambos sistemas de audio funcionando de forma independiente y predecible.

#### Acceptance Criteria

1. THE Mute_State y el Effective_Volume gestionados por el Background_Music_Player SHALL aplicarse exclusivamente a la Music_Track `general` y a la Music_Track `combat`, sin afectar el volumen ni la reproducción de los efectos de sonido despachados por `sfx.js`.
2. WHEN uno o más efectos de sonido de `sfx.js` se reproducen, de forma simultánea o consecutiva, mientras una Music_Track está sonando, THE Background_Music_Player SHALL continuar la reproducción de la Active_Track sin interrupción, cambio de volumen ni reinicio de la pista.
3. THE Background_Music_Player SHALL evitar que la Music_Track `general` y la Music_Track `combat` suenen simultáneamente, salvo por un solapamiento técnico durante la transición descrita en el Requirement 1 (pausa de una pista e inicio de la otra) que no deberá exceder los 300 milisegundos.
