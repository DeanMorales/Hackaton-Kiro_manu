# Design Document

## Overview

Esta funcionalidad evoluciona `src/audio/sfx.js` de un módulo puramente sintético (osciladores Web Audio API) a un `Sound_Player` híbrido que reproduce archivos `.wav` reales cuando existen, y recurre al `Synthesizer` (la función `beep` ya existente) cuando no hay archivo asociado o cuando la reproducción del archivo falla.

El cambio es intencionalmente de bajo impacto en el resto del código base: la interfaz pública exportada (`sfx.place`, `sfx.fall`, `sfx.correct`, `sfx.wrong`, `sfx.win`, `sfx.lose`, `sfx.door`) se mantiene idéntica en firma (funciones sin argumentos, invocación síncrona), y se agregan dos funciones nuevas (`sfx.flipCard`, `sfx.jump`) siguiendo el mismo patrón. Esto permite que `src/main.js` y `src/ui/screens.js` sigan invocando `sfx.*` exactamente como hoy, solo añadiendo las nuevas llamadas a `flipCard`/`jump` en los puntos correspondientes.

No hay pasos de respaldo/backup de archivos de audio: los `.wav` existentes en `src/audio/` se usan directamente, sin copiarlos ni moverlos.

## Architecture

```mermaid
flowchart TD
    A[Módulo de juego<br/>main.js / screens.js] -->|sfx.correct()| B[Sound_Player<br/>src/audio/sfx.js]
    B --> C{¿Sound_Event tiene<br/>Audio_File asociado?}
    C -->|No| D[Synthesizer: beep]
    C -->|Sí| E{¿Este evento ya<br/>está en modo fallback<br/>por fallo previo?}
    E -->|Sí| D
    E -->|No| F[Reproducir Audio_File<br/>vía HTMLAudioElement]
    F -->|Éxito| G[Sonido audible]
    F -->|Playback_Failure| H[Marcar evento en<br/>modo fallback permanente]
    H --> D
    D --> G
```

### Decisión: HTMLAudioElement vs Web Audio API `decodeAudioData`

Se evaluaron dos estrategias para reproducir los `Audio_File`:

1. **`HTMLAudioElement` (`new Audio(url)` + `.play()`)**: API simple, el navegador maneja la carga, el buffering y la decodificación internamente. Permite reproducir el mismo evento de forma superpuesta creando una nueva instancia (o clonando) sin gestión manual de buffers.
2. **Web Audio API con `decodeAudioData`**: Requiere un `AudioContext`, `fetch` + `arrayBuffer` + `decodeAudioData`, y un `AudioBufferSourceNode` por reproducción. Da más control (mezcla con el grafo de audio existente, latencia mínima) pero añade complejidad de precarga y gestión de buffers decodificados.

**Decisión**: usar `HTMLAudioElement` como mecanismo principal de reproducción de `Audio_File`, por las siguientes razones:
- El juego ya reproduce sonidos disparados por eventos discretos (golpe, colocación, etc.), no requiere mezcla de bajísima latencia ni sincronización sample-accurate con el `Synthesizer`.
- `HTMLAudioElement` reporta errores de carga/reproducción a través de eventos estándar (`error`, y el rechazo de la Promise devuelta por `.play()`), lo cual simplifica la detección de `Playback_Failure`.
- Evita mantener dos mecanismos de audio compitiendo por el mismo `AudioContext` (el `Synthesizer` ya crea su propio `AudioContext` de forma lazy).
- No se requiere `fetch`/CORS especial porque los archivos son locales al proyecto y servidos junto con el HTML.

El diseño mantiene esta decisión encapsulada dentro de `Sound_Player`, de forma que si en el futuro se quisiera migrar a `decodeAudioData` (por ejemplo para reducir latencia en dispositivos de gama baja), solo cambiaría la implementación interna de `playAudioFile`, no la interfaz pública ni los puntos de integración.

## Components and Interfaces

### `Sound_Player` (`src/audio/sfx.js`)

Responsabilidades:
- Mantener el `Synthesizer` existente (`beep`) sin modificaciones de comportamiento.
- Mantener un **registro de mapeo** `Sound_Event -> Audio_File` (uno o varios archivos por evento).
- Mantener un **registro de estado de fallback por evento** (`Set<SoundEventName>` o `Map<SoundEventName, boolean>`), inicialmente vacío, que se llena cuando un evento sufre un `Playback_Failure`.
- Precargar los `Audio_File` al cargar el módulo (ver "Estrategia de precarga").
- Exponer las funciones públicas `place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`, `flipCard`, `jump`, cada una implementada como: `dispatch(eventName)`.

```js
// Pseudocódigo de la forma interna (no es un lenguaje de implementación específico)
const AUDIO_MAP = {
  correct: ['attack_sword.wav'],
  place:   ['Blocks.wav'],
  door:    ['door-open.wav'],
  fall:    ['drop.wav'],
  lose:    ['drop.wav'],
  wrong:   ['incorrect.wav'],
  flipCard:['flip_card.wav'],
  jump:    ['jump.wav'],
  // 'win' no aparece: siempre usa el Synthesizer
};

const SYNTH_FALLBACK = {
  win:  () => { beep(523,0.12,'triangle',0.08); ...},
  place:   () => beep(220,0.08,'square',0.05),
  fall:    () => beep(110,0.5,'sawtooth',0.07),
  correct: () => { beep(660,0.09,'triangle',0.07); ... },
  wrong:   () => beep(140,0.28,'sawtooth',0.08),
  lose:    () => { beep(200,0.2,'sawtooth',0.08); ... },
  door:    () => { beep(392,0.15,'triangle',0.06); ... },
  flipCard: () => beep(300,0.05,'square',0.04),  // nuevo, parámetros a definir en implementación
  jump:     () => beep(440,0.07,'square',0.05),  // nuevo, parámetros a definir en implementación
};

const failedEvents = new Set(); // eventos en modo fallback permanente
```

`flipCard` y `jump` son eventos nuevos (Requirement 2) sin comportamiento previo de `Synthesizer`; se les asigna una implementación de `beep` razonable como fallback, ya que el Requirement 4 exige que, ante un `Playback_Failure`, el `Sound_Player` reproduzca "el sonido equivalente mediante el Synthesizer para ese Sound_Event" — esto aplica a todo evento con `Audio_File` asociado, incluyendo los nuevos.

**Función `dispatch(eventName)`** (usada internamente por cada función pública):

1. Si `eventName` está en `failedEvents` → invocar `SYNTH_FALLBACK[eventName]()` y retornar.
2. Si `eventName` no tiene entrada en `AUDIO_MAP` (caso `win`) → invocar `SYNTH_FALLBACK[eventName]()` y retornar.
3. En otro caso, para cada archivo en `AUDIO_MAP[eventName]`, intentar reproducirlo vía `playAudioFile(file)`.
   - Si la reproducción tiene éxito (o se dispara sin error síncrono/asíncrono detectable de inmediato), continuar.
   - Si ocurre un `Playback_Failure` en cualquiera de los archivos, agregar `eventName` a `failedEvents` e invocar `SYNTH_FALLBACK[eventName]()` como respaldo para ese evento.
4. Todo el cuerpo de `dispatch` está envuelto en manejo de errores (try/catch y manejo de rechazo de Promesas) de forma que ninguna excepción se propague al código que invoca `sfx.*`.

**Función `playAudioFile(file)`**:
- Obtiene la instancia de `HTMLAudioElement` precargada para `file` (ver estrategia de precarga).
- Si el navegador no soporta reproducción de audio (`typeof Audio === 'undefined'`), lanza un `Playback_Failure` controlado inmediatamente (sin intentar reproducir), permitiendo que `dispatch` recurra al `Synthesizer`.
- Clona el `HTMLAudioElement` precargado (`element.cloneNode()`) antes de reproducir, para permitir reproducciones superpuestas del mismo archivo (por ejemplo, respuestas rápidas consecutivas) sin cancelar la reproducción anterior.
- Llama a `.play()` y retorna la Promise que expone; si la Promise se rechaza, o si el elemento emite un evento `error`, se considera `Playback_Failure`.

### Estrategia de precarga

Al cargar el módulo `sfx.js`:
- Para cada archivo único referenciado en `AUDIO_MAP` (`attack_sword.wav`, `Blocks.wav`, `door-open.wav`, `drop.wav`, `incorrect.wav`, `flip_card.wav`, `jump.wav`), se crea una instancia `new Audio('./audio/<archivo>')` con `preload = 'auto'`.
- Estas instancias se guardan en un registro `Map<filename, HTMLAudioElement>` y se usan como plantilla para `cloneNode()` en cada reproducción.
- La precarga es de "mejor esfuerzo": si falla la carga inicial de un archivo (evento `error` en el elemento precargado), se registra internamente pero **no** se lanza ninguna excepción durante la inicialización del módulo. El primer intento de reproducción de ese archivo detectará el fallo (el elemento clonado también fallará) y activará el fallback descrito en `dispatch`, marcando el evento correspondiente en `failedEvents`.
- Esta estrategia evita que un archivo faltante o corrupto bloquee la carga del juego, cumpliendo el Requirement 4 (fallback ante fallos) desde el primer uso.

### Puntos de integración

**`src/main.js`**:
- `onDrop()`: sin cambios en la lógica de ramas existente (`sfx.fall()`, `sfx.place()`, `sfx.door()`). Se añade una llamada a `sfx.jump()` en la rama `result.type === 'placed'`, junto a `sfx.place()` (y `sfx.door()` si aplica), representando el inicio de la animación de ascenso del guerrero tras una colocación exitosa.
- `onAnswer(cardIdx, chosenIdx)`: sin cambios (`sfx.correct()`, `sfx.wrong()`, `sfx.win()`, `sfx.lose()` ya están presentes y siguen invocándose igual).

**`src/ui/screens.js`**:
- `renderCardBack(cardEl, card, onAnswer, cardIdx)`: se añade una llamada a `sfx.flipCard()` justo al entrar en la rama `if (!cardEl.classList.contains('flipped'))`, antes o después de `cardEl.classList.add('flipped')`, ya que esa rama representa exactamente la transición frontal→posterior. La función ya está protegida por ese `if`, por lo que `flipCard` nunca se dispara en la transición inversa (la función no tiene lógica para volver de posterior a frontal; eso ocurre en `main.js` vía `cardEl.classList.remove('flipped')`, que no pasa por `renderCardBack`).

No se requieren cambios adicionales de firma en `main.js` ni `screens.js`: ambos módulos importan `sfx` desde `./audio/sfx.js` (o ruta relativa equivalente) exactamente como hoy.

## Data Models

No hay persistencia ni modelos de datos complejos. Las estructuras relevantes son internas al módulo `Sound_Player`:

- `AUDIO_MAP: Record<SoundEventName, string[]>` — mapeo evento → lista de nombres de archivo (la mayoría con un solo archivo; `place` en un piso de puerta dispara tanto `place` como `door` como dos invocaciones separadas desde `main.js`, no como una lista múltiple en `AUDIO_MAP`).
- `PRELOADED: Map<string, HTMLAudioElement>` — archivo → elemento de audio precargado (plantilla para clonar).
- `failedEvents: Set<SoundEventName>` — eventos que han sufrido un `Playback_Failure` y deben usar el `Synthesizer` de forma permanente durante la sesión actual.

`SoundEventName` es la unión de los nombres de función pública: `'place' | 'fall' | 'correct' | 'wrong' | 'win' | 'lose' | 'door' | 'flipCard' | 'jump'`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Independencia de la resolución de sonidos por resultado de colocación

For any resultado de colocación de bloque (con `isDoor` verdadero o falso) y para cualquier invocación independiente de `sfx.jump()`, el conjunto de sonidos disparados por el flujo de colocación es exactamente `{place}` si `isDoor` es falso, o `{place, door}` si `isDoor` es verdadero; y la invocación de `jump` no altera ni depende de ese conjunto.

**Validates: Requirements 1.7, 2.2**

### Property 2: Fallback seguro ante fallo de reproducción

For any Sound_Event que tiene un `Audio_File` asociado, si la reproducción o carga de ese `Audio_File` falla (`Playback_Failure` simulado), entonces invocar la función pública correspondiente del `Sound_Player` invoca el `Synthesizer` equivalente para ese evento y no lanza ninguna excepción no controlada.

**Validates: Requirements 4.1, 4.2**

### Property 3: Persistencia del modo fallback durante la sesión

For any Sound_Event con `Audio_File` asociado que ya sufrió un `Playback_Failure`, y para cualquier número N de invocaciones subsecuentes de ese evento dentro de la misma sesión, ninguna de esas N invocaciones vuelve a intentar reproducir el `Audio_File`; todas usan el `Synthesizer`.

**Validates: Requirements 4.4**

### Property 4: No propagación de excepciones ante doble fallo

For any Sound_Event, si tanto el intento de reproducción del `Audio_File` como el intento de respaldo mediante el `Synthesizer` fallan, invocar la función pública correspondiente no lanza ninguna excepción no controlada.

**Validates: Requirements 4.5**

### Property 5: Contrato síncrono y no disruptivo de la interfaz pública

For any una de las nueve funciones exportadas por el `Sound_Player` (`place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`, `flipCard`, `jump`), invocarla sin argumentos retorna el control al código llamador de forma inmediata (no bloqueante) y no lanza excepciones, independientemente de si la vía de reproducción resultante es el `Audio_File` o el `Synthesizer`.

**Validates: Requirements 5.1, 5.2**

## Error Handling

- **Carga inicial fallida de un `Audio_File`** (precarga): se captura el evento `error` del `HTMLAudioElement`; no se lanza excepción durante la inicialización del módulo. El archivo queda registrado como "no disponible" y la primera reproducción real de ese evento activará el fallback normal (Property 2).
- **`Playback_Failure` en tiempo de reproducción** (rechazo de la Promise de `.play()`, evento `error` en el clon, o ausencia de la API `Audio`): capturado dentro de `dispatch`/`playAudioFile` mediante try/catch y manejo de rechazo de Promesas; nunca se propaga al llamador (Property 2, Property 4).
- **Fallback del `Synthesizer` también falla** (por ejemplo, `AudioContext` no disponible o `createOscillator` lanza): la función `beep` ya existente captura sus propios errores internamente (`try { ... } catch(e){}`); `dispatch` además envuelve la invocación de `SYNTH_FALLBACK[eventName]()` en su propio try/catch por robustez adicional, garantizando que ningún camino de error llegue al código de `main.js`/`screens.js` (Property 4).
- **Navegador sin soporte de Web Audio API ni de elementos de audio HTML**: detectado explícitamente al inicio de `playAudioFile` (`typeof Audio === 'undefined'`) y dentro de `beep` (ya maneja la ausencia de `AudioContext`); en ambos casos el `Sound_Player` omite la reproducción sin detener la ejecución del juego (Requirement 4.3).
- **Estado de fallback por evento**: una vez que un evento entra en `failedEvents`, ese estado vive únicamente en memoria durante la sesión de la página (se reinicia al recargar el juego), tal como exige el Requirement 4.4 ("dentro de la misma sesión de juego").

## Testing Strategy

**Enfoque dual**: pruebas unitarias para ejemplos concretos y casos de borde, y pruebas basadas en propiedades para las reglas universales identificadas en la sección de Correctness Properties.

### Pruebas unitarias (ejemplos)

- Tabla de mapeo estático evento → archivo: verificar que `sfx.correct()` → `attack_sword.wav`, `sfx.place()` → `Blocks.wav`, `sfx.door()` → `door-open.wav`, `sfx.fall()` → `drop.wav`, `sfx.lose()` → `drop.wav`, `sfx.wrong()` → `incorrect.wav`, `sfx.flipCard()` → `flip_card.wav`, `sfx.jump()` → `jump.wav` (Requirements 1.1–1.6, 2.1, 2.2).
- `sfx.win()` siempre usa el `Synthesizer` y nunca intenta cargar un `Audio_File` (Requirement 3.1).
- Los parámetros de oscilador usados por el `Synthesizer` para cada evento sin archivo (`win`) coinciden exactamente con los de la implementación original de `sfx.js` (Requirement 3.2).
- Verificación estructural: el módulo exporta exactamente las funciones `place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`, `flipCard`, `jump` (Requirement 5.1).
- Caso de borde: entorno sin `AudioContext`/`Audio` disponibles — todas las funciones públicas omiten la reproducción sin lanzar ni detener el juego (Requirement 4.3).
- Integración de punto de invocación: `renderCardBack` llama a `sfx.flipCard()` solo en la transición frontal→posterior, y nunca en la transición inversa (Requirement 2.1).
- Integración de punto de invocación: `onDrop` en `main.js` llama a `sfx.jump()` junto con `sfx.place()` (y `sfx.door()` cuando corresponde) en la rama de colocación exitosa.

### Pruebas basadas en propiedades

Se utilizará una librería de property-based testing estándar para JavaScript (por ejemplo, **fast-check**), configurando cada prueba con un mínimo de 100 iteraciones. Cada prueba de propiedad se implementa como un único test que valida la propiedad correspondiente del diseño, y se etiqueta con un comentario que referencia la propiedad:

**Feature: sfx-audio-file-integration, Property N: {texto de la propiedad}**

Las pruebas de propiedad usan mocks/stubs para `HTMLAudioElement` (`play`, evento `error`) y para el `Synthesizer` (`beep`/`AudioContext`), de modo que puedan simular `Playback_Failure` de forma determinista y de bajo costo, sin depender de archivos reales ni de temporizadores del navegador:

- **Property 1** (Independencia de resolución de sonidos por colocación): generar aleatoriamente `isDoor` (booleano) y una secuencia aleatoria de si se invoca `jump` antes, después o no se invoca; verificar que el conjunto de archivos/eventos disparados por la colocación coincide con el mapeo esperado y que la presencia de `jump` no lo altera.
- **Property 2** (Fallback seguro ante fallo de reproducción): generar aleatoriamente uno de los 8 `Sound_Event` con `Audio_File` asociado y un tipo de fallo simulado (rechazo de `.play()`, evento `error`, `Audio` no definida); verificar que se invoca el `Synthesizer` correspondiente y que no se lanza excepción.
- **Property 3** (Persistencia del modo fallback): generar aleatoriamente un `Sound_Event` con archivo y un número N de invocaciones subsecuentes (1–20) tras un primer `Playback_Failure`; verificar que ninguna de esas N invocaciones vuelve a intentar `playAudioFile`.
- **Property 4** (No propagación de excepciones ante doble fallo): generar aleatoriamente un `Sound_Event` y forzar fallo simultáneo del `Audio_File` y del `Synthesizer` (mock que lanza); verificar que la función pública no lanza.
- **Property 5** (Contrato síncrono y no disruptivo): generar aleatoriamente una de las 9 funciones públicas y un modo de reproducción (éxito de archivo, fallo con fallback exitoso, doble fallo); verificar en todos los casos que la llamada retorna sin lanzar y sin bloquear el hilo (no se espera una Promise para que el llamador continúe).

Este enfoque cubre tanto los mapeos fijos y puntos de integración concretos (unitarios) como las reglas generales de resolución y manejo de fallos (propiedades), en línea con el resto de la base de código, que actualmente no usa un framework de testing pero cuya lógica de audio es pura y aislable del DOM/canvas real mediante mocks.
