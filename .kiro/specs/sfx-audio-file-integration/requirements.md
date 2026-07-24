# Requirements Document

## Introduction

El juego "Torre de las Nubes" actualmente genera todos sus efectos de sonido mediante síntesis con Web Audio API (osciladores) en `src/audio/sfx.js`. La carpeta `src/audio/` contiene además siete archivos `.wav` grabados (`attack_sword.wav`, `Blocks.wav`, `door-open.wav`, `drop.wav`, `flip_card.wav`, `incorrect.wav`, `jump.wav`) que actualmente no se utilizan.

Esta funcionalidad reemplaza, únicamente para los eventos de sonido que tienen un archivo `.wav` correspondiente, la síntesis por osciladores con la reproducción del archivo de audio real. Los eventos que no tengan un archivo `.wav` asociado (por ejemplo `sfx.win`) deben continuar utilizando el sintetizador sin cambios. Si un archivo de audio falla al cargar o reproducirse, el sistema debe recurrir automáticamente al sintetizador como respaldo.

## Glossary

- **Sound_Player**: El módulo responsable de reproducir efectos de sonido del juego (evolución de `src/audio/sfx.js`), que decide entre reproducir un archivo de audio grabado o sintetizar el sonido mediante Web Audio API.
- **Sound_Event**: Un evento del juego que dispara un efecto de sonido (por ejemplo: colocar bloque, caer, respuesta correcta, respuesta incorrecta, victoria, derrota, puerta, voltear carta, saltar).
- **Audio_File**: Un archivo `.wav` ubicado en `src/audio/` que contiene una grabación de audio real asociada a uno o más Sound_Event.
- **Synthesizer**: El mecanismo de generación de sonido por osciladores de Web Audio API ya existente en `src/audio/sfx.js` (función `beep`).
- **Playback_Failure**: Cualquier error que impida la carga o la reproducción de un Audio_File (archivo no encontrado, error de decodificación, error de reproducción, o Web Audio API no disponible).

## Requirements

### Requirement 1: Mapeo de eventos de sonido existentes a archivos de audio

**User Story:** Como jugador, quiero escuchar sonidos grabados reales en los eventos principales del juego que ya tienen un archivo de audio disponible, para tener una experiencia sonora más inmersiva.

#### Acceptance Criteria

1. WHEN el jugador responde correctamente a una pregunta de combate, THE Sound_Player SHALL reproducir el Audio_File `attack_sword.wav`.
2. WHEN el jugador coloca exitosamente un bloque del castillo sobre la torre (sin que el bloque caiga), THE Sound_Player SHALL reproducir el Audio_File `Blocks.wav`.
3. WHEN el bloque colocado exitosamente corresponde a un piso de puerta de acceso a un jefe, THE Sound_Player SHALL reproducir el Audio_File `door-open.wav`.
4. WHEN el guerrero cae de la torre por un bloque mal encajado, THE Sound_Player SHALL reproducir el Audio_File `drop.wav`.
5. WHEN el guerrero es derrotado en combate contra un jefe, THE Sound_Player SHALL reproducir el Audio_File `drop.wav`.
6. WHEN el jugador responde incorrectamente a una pregunta de combate, THE Sound_Player SHALL reproducir el Audio_File `incorrect.wav`.
7. WHEN el bloque colocado corresponde a un piso de puerta, THE Sound_Player SHALL reproducir tanto el Audio_File `Blocks.wav` como el Audio_File `door-open.wav` para ese único evento de colocación.

### Requirement 2: Nuevos eventos de sonido sin equivalente previo

**User Story:** Como jugador, quiero escuchar sonidos grabados al voltear una carta de combate y al saltar el guerrero entre bloques, para tener retroalimentación sonora en acciones que hoy son silenciosas.

#### Acceptance Criteria

1. WHEN una carta de combate transiciona de su cara frontal a su cara posterior para revelar una pregunta (incluyendo revelaciones repetidas tras una respuesta incorrecta en la misma carta), THE Sound_Player SHALL reproducir el Audio_File `flip_card.wav`. Esta transición NO SHALL disparar el Audio_File cuando la carta regresa de su cara posterior a la frontal.
2. WHEN el guerrero inicia su animación de ascenso tras una colocación exitosa de bloque (sin caída), THE Sound_Player SHALL reproducir el Audio_File `jump.wav`, de forma independiente y pudiendo coincidir con la reproducción de `Blocks.wav` para el mismo evento de colocación.

### Requirement 3: Preservación del sintetizador para eventos sin archivo de audio

**User Story:** Como desarrollador, quiero que los eventos de sonido sin archivo `.wav` asociado sigan usando el sintetizador actual sin cambios, para no romper el comportamiento existente donde no hay un archivo de reemplazo.

#### Acceptance Criteria

1. WHEN el jugador derrota al jefe de combate, THE Sound_Player SHALL reproducir el efecto de victoria mediante la función `win` del Synthesizer.
2. IF un Sound_Event no tiene un Audio_File asociado, THEN THE Sound_Player SHALL invocar el Synthesizer para ese Sound_Event utilizando los mismos parámetros de oscilador (frecuencia, tipo de onda, duración y ganancia) que producía la función correspondiente en `src/audio/sfx.js` antes de esta integración.

### Requirement 4: Comportamiento de respaldo (fallback) ante fallos de carga o reproducción

**User Story:** Como jugador, quiero seguir escuchando efectos de sonido aunque un archivo de audio no cargue correctamente, para que un problema de audio no afecte mi experiencia de juego.

#### Acceptance Criteria

1. IF ocurre un Playback_Failure al intentar reproducir un Audio_File para un Sound_Event, THEN THE Sound_Player SHALL reproducir el sonido equivalente mediante el Synthesizer para ese Sound_Event.
2. IF ocurre un Playback_Failure, THEN THE Sound_Player SHALL continuar la ejecución del juego sin lanzar una excepción no controlada, de modo que los demás Sound_Event y la lógica de juego sigan funcionando con normalidad.
3. WHILE el navegador no soporta Web Audio API ni la reproducción de elementos de audio HTML, THE Sound_Player SHALL omitir la reproducción de sonido sin detener la ejecución del juego.
4. IF un Sound_Event con Audio_File asociado experimenta un Playback_Failure, THEN THE Sound_Player SHALL utilizar el Synthesizer para ese Sound_Event en todas las invocaciones posteriores dentro de la misma sesión de juego, sin volver a intentar reproducir ese Audio_File.
5. IF ocurre un Playback_Failure y el intento de respaldo mediante el Synthesizer también falla, THEN THE Sound_Player SHALL continuar la ejecución del juego sin lanzar una excepción no controlada, aun cuando ningún sonido resulte audible para ese Sound_Event.

### Requirement 5: No alteración de eventos ya cubiertos por Synthesizer

**User Story:** Como desarrollador, quiero que los eventos de sonido migrados a archivos de audio mantengan la misma interfaz pública que usan los módulos que los invocan, para no tener que modificar la lógica de juego que dispara los sonidos.

#### Acceptance Criteria

1. THE Sound_Player SHALL exponer los mismos nombres de función usados actualmente en `sfx.js` (`place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`), además de las funciones `flipCard` y `jump` para los Sound_Event introducidos en el Requirement 2.
2. WHEN un módulo del juego invoca una función del Sound_Player para un Sound_Event, THE Sound_Player SHALL producir sonido audible mediante el Audio_File asociado o, en su defecto, mediante el Synthesizer, invocando la función sin argumentos y de forma síncrona, sin requerir cambios en el código que invoca la función.
