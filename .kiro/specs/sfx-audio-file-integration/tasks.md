# Implementation Plan: sfx-audio-file-integration

## Overview

Este plan convierte `src/audio/sfx.js` en el `Sound_Player` híbrido descrito en el diseño (mapeo evento→archivo, precarga, fallback permanente por sesión al `Synthesizer`), agrega las funciones públicas `flipCard`/`jump`, integra las nuevas llamadas en `src/main.js` y `src/ui/screens.js`, y cubre las 5 Correctness Properties del diseño con pruebas basadas en propiedades (usando `fast-check`, ya presente en `devDependencies`) más pruebas unitarias de ejemplo. El proyecto ya cuenta con `vitest` y `fast-check` configurados en `package.json`, por lo que no es necesario introducir un test runner nuevo.

## Tasks

- [x] 1. Construir la estructura interna del Sound_Player en `src/audio/sfx.js`
  - Mantener la función `beep` existente sin cambios de comportamiento
  - Definir `AUDIO_MAP` (evento → nombre de archivo) para `correct`, `place`, `door`, `fall`, `lose`, `wrong`, `flipCard`, `jump` (sin entrada para `win`)
  - Definir `SYNTH_FALLBACK` con los mismos parámetros de oscilador que la implementación original de `place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`, y añadir implementaciones razonables de `beep` para `flipCard` y `jump`
  - Definir `failedEvents` como `Set` vacío para el registro de fallback permanente por sesión
  - _Requirements: 3.2, 4.4, 5.1_

- [x] 2. Implementar la precarga de archivos de audio (`PRELOADED`)
  - Al cargar el módulo, crear `new Audio('./audio/<archivo>')` con `preload = 'auto'` para cada archivo único referenciado en `AUDIO_MAP`
  - Almacenar las instancias en un `Map<filename, HTMLAudioElement>` (`PRELOADED`)
  - Capturar el evento `error` de cada elemento precargado sin lanzar excepción durante la inicialización del módulo
  - _Requirements: 4.2, 4.3_

- [x] 3. Implementar `playAudioFile(file)`
  - Si `typeof Audio === 'undefined'`, señalar `Playback_Failure` inmediatamente sin intentar reproducir
  - Clonar (`cloneNode()`) el `HTMLAudioElement` precargado correspondiente y llamar a `.play()`
  - Tratar como `Playback_Failure` el rechazo de la Promise de `.play()` o el evento `error` del clon
  - Envolver toda la lógica en manejo de errores para que ninguna excepción se propague al llamador
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 4. Implementar `dispatch(eventName)`
  - Si `eventName` está en `failedEvents`, invocar `SYNTH_FALLBACK[eventName]()` y retornar
  - Si `eventName` no tiene entrada en `AUDIO_MAP` (caso `win`), invocar `SYNTH_FALLBACK[eventName]()` y retornar
  - En otro caso, intentar `playAudioFile(AUDIO_MAP[eventName])`; ante `Playback_Failure`, agregar `eventName` a `failedEvents` e invocar `SYNTH_FALLBACK[eventName]()` como respaldo
  - Envolver el cuerpo completo (incluida la invocación de `SYNTH_FALLBACK`) en try/catch y manejo de rechazo de Promesas, de forma síncrona desde la perspectiva del llamador
  - _Requirements: 3.1, 4.1, 4.4, 4.5, 5.2_

- [ ]* 4.1 Escribir prueba de propiedad: Fallback seguro ante fallo de reproducción
  - **Property 2: Fallback seguro ante fallo de reproducción**
  - **Validates: Requirements 4.1, 4.2**
  - Usar mocks de `HTMLAudioElement`/`Audio` para simular `Playback_Failure` (rechazo de `.play()`, evento `error`, `Audio` no definida) sobre los 8 eventos con `Audio_File` asociado
  - Comentario de tag: `// Feature: sfx-audio-file-integration, Property 2: Fallback seguro ante fallo de reproducción`
  - Configurar mínimo 100 iteraciones

- [ ]* 4.2 Escribir prueba de propiedad: Persistencia del modo fallback durante la sesión
  - **Property 3: Persistencia del modo fallback durante la sesión**
  - **Validates: Requirements 4.4**
  - Generar un evento con archivo, forzar un primer `Playback_Failure`, luego generar N (1–20) invocaciones subsecuentes y verificar que ninguna vuelve a intentar `playAudioFile`
  - Comentario de tag: `// Feature: sfx-audio-file-integration, Property 3: Persistencia del modo fallback durante la sesión`
  - Configurar mínimo 100 iteraciones

- [ ]* 4.3 Escribir prueba de propiedad: No propagación de excepciones ante doble fallo
  - **Property 4: No propagación de excepciones ante doble fallo**
  - **Validates: Requirements 4.5**
  - Forzar fallo simultáneo del `Audio_File` y del mock de `Synthesizer`/`beep` para cualquiera de los 9 eventos, y verificar que la función pública correspondiente no lanza
  - Comentario de tag: `// Feature: sfx-audio-file-integration, Property 4: No propagación de excepciones ante doble fallo`
  - Configurar mínimo 100 iteraciones

- [ ]* 4.4 Escribir pruebas unitarias de mapeo estático y comportamiento del Synthesizer
  - Verificar `sfx.correct()`→`attack_sword.wav`, `sfx.place()`→`Blocks.wav`, `sfx.door()`→`door-open.wav`, `sfx.fall()`→`drop.wav`, `sfx.lose()`→`drop.wav`, `sfx.wrong()`→`incorrect.wav`, `sfx.flipCard()`→`flip_card.wav`, `sfx.jump()`→`jump.wav`
  - Verificar que `sfx.win()` siempre usa el Synthesizer y nunca intenta cargar un `Audio_File`
  - Verificar que los parámetros de oscilador de `SYNTH_FALLBACK.win` coinciden con la implementación original
  - Verificar caso de borde: entorno sin `AudioContext`/`Audio` disponibles, todas las funciones públicas omiten la reproducción sin lanzar
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 3.1, 3.2, 4.3_

- [x] 5. Exponer las funciones públicas del Sound_Player
  - Implementar `place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door` como `() => dispatch('<evento>')`, preservando exactamente los nombres y la ausencia de argumentos
  - Implementar las nuevas funciones públicas `flipCard` y `jump` siguiendo el mismo patrón `() => dispatch('<evento>')`
  - _Requirements: 1.7, 2.1, 2.2, 5.1, 5.2_

- [ ]* 5.1 Escribir prueba de propiedad: Contrato síncrono y no disruptivo de la interfaz pública
  - **Property 5: Contrato síncrono y no disruptivo de la interfaz pública**
  - **Validates: Requirements 5.1, 5.2**
  - Generar aleatoriamente una de las 9 funciones exportadas y un modo de reproducción (éxito de archivo, fallo con fallback exitoso, doble fallo); verificar que la llamada retorna sin lanzar y sin requerir esperar una Promise
  - Comentario de tag: `// Feature: sfx-audio-file-integration, Property 5: Contrato síncrono y no disruptivo de la interfaz pública`
  - Configurar mínimo 100 iteraciones

- [ ]* 5.2 Escribir prueba unitaria de verificación estructural del módulo
  - Verificar que el módulo exporta exactamente las funciones `place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`, `flipCard`, `jump` (ni más ni menos)
  - _Requirements: 5.1_

- [x] 6. Checkpoint - Asegurar que todas las pruebas de `sfx.js` pasen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrar `sfx.jump()` en `src/main.js`
  - Dentro de `onDrop()`, en la rama `result.type === 'placed'`, añadir la llamada a `sfx.jump()` junto a `sfx.place()` (y `sfx.door()` cuando `result.isDoor` sea verdadero), sin modificar el resto de la lógica de la función
  - _Requirements: 2.2_

- [ ]* 7.1 Escribir prueba de propiedad: Independencia de la resolución de sonidos por resultado de colocación
  - **Property 1: Independencia de la resolución de sonidos por resultado de colocación**
  - **Validates: Requirements 1.7, 2.2**
  - Generar aleatoriamente `isDoor` (booleano) y si `sfx.jump()` se invoca antes, después o no se invoca en el mismo flujo; verificar (mediante spies sobre `sfx.place`, `sfx.door`, `sfx.jump`) que el conjunto de sonidos disparados por la colocación es exactamente `{place}` o `{place, door}` según `isDoor`, y que la invocación de `jump` no altera ese conjunto
  - Comentario de tag: `// Feature: sfx-audio-file-integration, Property 1: Independencia de la resolución de sonidos por resultado de colocación`
  - Configurar mínimo 100 iteraciones

- [ ]* 7.2 Escribir prueba unitaria de integración en `onDrop`
  - Verificar que `onDrop()` invoca `sfx.jump()` junto con `sfx.place()` (y `sfx.door()` cuando corresponde) en la rama de colocación exitosa, usando mocks del motor (`engine.dropBlock`) y spies sobre `sfx`
  - _Requirements: 2.2_

- [x] 8. Integrar `sfx.flipCard()` en `src/ui/screens.js`
  - Dentro de `renderCardBack(cardEl, card, onAnswer, cardIdx)`, añadir la llamada a `sfx.flipCard()` dentro de la rama `if (!cardEl.classList.contains('flipped'))`, sin afectar la lógica de renderizado de la pregunta y las opciones
  - Importar `sfx` desde `../audio/sfx.js` en `screens.js`
  - _Requirements: 2.1_

- [ ]* 8.1 Escribir prueba unitaria de integración en `renderCardBack`
  - Verificar que `sfx.flipCard()` se invoca (spy) cuando `renderCardBack` se llama sobre una carta no volteada (transición frontal→posterior)
  - Verificar que `sfx.flipCard()` NO se invoca cuando `renderCardBack` se llama sobre una carta ya volteada (`classList` ya contiene `flipped`)
  - _Requirements: 2.1_

- [x] 9. Checkpoint final - Ensure all tests pass, ask the user if questions arise.
  - Ejecutar la suite completa de pruebas (`vitest run`)
  - Confirmar manualmente por inspección de código que la interfaz pública exportada por `sfx.js` no cambió de forma para los llamadores existentes en `main.js` y `screens.js`, y que ningún archivo `.wav` fue copiado, movido o respaldado

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas) y pueden omitirse para un MVP más rápido, pero se recomienda implementarlas para validar las Correctness Properties.
- Cada tarea referencia requisitos específicos del `requirements.md` para trazabilidad.
- Ninguna tarea incluye respaldo/backup de archivos de audio, conforme a la restricción del diseño.
- Las pruebas de propiedad usan `fast-check` (ya en `devDependencies`) con mínimo 100 iteraciones cada una, y mocks de `HTMLAudioElement`/`AudioContext` para evitar dependencias del navegador real.
