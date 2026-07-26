# Sonido de Ataque del Guerrero — Bugfix Design

## Overview

Durante un duelo contra un guardián (boss fight), al acertar la respuesta de una carta el guerrero debería reproducir su sonido de ataque real desde `public/audio/guerrero/ataque/attack_sword.wav`. Hoy, la rama de acierto de `answerCard(idx, chosenIdx)` solo dispara el beep sintetizado `sfx.correct()` (Web Audio API) y nunca reproduce el archivo `.wav`. El resultado es una pérdida de retroalimentación sonora: el golpe al guardián se siente vacío.

El enfoque del arreglo es mínimo y quirúrgico: introducir la capacidad de reproducir un archivo de audio real (`new Audio(...)`) y disparar `attack_sword.wav` únicamente en la rama de acierto de `answerCard`, en adición (no en reemplazo) a `sfx.correct()`. El arreglo debe soportar aciertos consecutivos (cada acierto reproduce el sonido sin que un sonido en curso bloquee al siguiente) y debe fallar silenciosamente si el archivo no carga o el navegador bloquea la reproducción, para no interrumpir el juego.

Respetando el stack (un solo archivo `torre-de-las-nubes.html`, JS vanilla en IIFE, sin build ni dependencias), la reproducción del `.wav` se añade como un pequeño helper dentro del bloque `SFX`, manteniendo la convención existente del objeto `sfx`.

## Glossary

- **Bug_Condition (C)**: La condición que dispara el bug — acertar una carta durante un duelo activo (`duringBossFight AND chosenIdx === correctIdx`), momento en el que el sonido de ataque del guerrero (`attack_sword.wav`) no se reproduce.
- **Property (P)**: El comportamiento deseado bajo la condición del bug — además del beep `sfx.correct()`, el sistema reproduce el archivo `attack_sword.wav`.
- **Preservation**: El comportamiento existente que debe permanecer inalterado — el manejo de fallos (`sfx.wrong()`), la lógica de resolución del duelo (pips, `renderPips`, victoria/derrota, avance de carta) y todos los demás eventos de sonido del juego.
- **`answerCard(idx, chosenIdx)`**: La función en `torre-de-las-nubes.html` (sección BOSS FIGHT) que procesa la respuesta del jugador a una carta durante un duelo, ajusta los pips de vida y dispara los efectos de sonido correspondientes.
- **`sfx`**: El objeto en la sección SFX de `torre-de-las-nubes.html` que agrupa los efectos de sonido sintetizados vía Web Audio API (`place`, `fall`, `correct`, `wrong`, `win`, `lose`, `door`).
- **`fight`**: El objeto de estado del combate; `answerCard` solo actúa cuando `fight` existe y `fight.resolved` es falso (equivalente a "duelo activo").
- **F** (`answerCard`): La función original, que al acertar solo reproduce `sfx.correct()`.
- **F'** (`answerCard'`): La función corregida, que al acertar reproduce `sfx.correct()` y además `attack_sword.wav`.

## Bug Details

### Bug Condition

El bug se manifiesta cuando el jugador acierta la respuesta de una carta durante un duelo activo. La rama de acierto de `answerCard` (`if(correct){ ... }`) decrementa `fight.bossPips` y llama a `sfx.correct()`, pero no ejecuta ninguna reproducción del archivo `attack_sword.wav` — de hecho, no existe uso alguno de `new Audio(...)` ni de elementos `<audio>` para archivos reales en el código.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AnswerEvent   // { duringBossFight, chosenIdx, correctIdx }
  OUTPUT: boolean

  RETURN input.duringBossFight = true
         AND input.chosenIdx = input.correctIdx
         AND NOT played("public/audio/guerrero/ataque/attack_sword.wav")
END FUNCTION
```

### Examples

- **Acierto durante duelo**: El jugador elige la opción correcta de una carta contra el guardián. Esperado: suena `sfx.correct()` + `attack_sword.wav`. Actual: solo suena `sfx.correct()`.
- **Aciertos consecutivos**: El jugador acierta dos cartas seguidas. Esperado: `attack_sword.wav` suena en cada acierto. Actual: nunca suena en ninguno.
- **Acierto que derrota al guardián**: El último pip del jefe cae con un acierto. Esperado: suena el ataque del guerrero y luego `sfx.win()`. Actual: solo `sfx.correct()` y `sfx.win()`.
- **Edge case — archivo ausente/bloqueado**: El navegador bloquea el autoplay o el `.wav` no carga. Esperado: el duelo continúa con normalidad, sin excepción que interrumpa el juego.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Fallar una respuesta (`chosenIdx !== card.question.correct`) SIGUE restando un pip al jugador y reproduciendo `sfx.wrong()`, sin reproducir el ataque del guerrero (Requirement 3.1).
- Acertar SIGUE restando un pip de vida al guardián, actualizando ambas barras vía `renderPips` y ejecutando la resolución del duelo (derrota del guardián con `sfx.win()` y escalado de velocidad, derrota del jugador con `sfx.lose()`, y avance/reflip de carta) exactamente igual que antes (Requirement 3.2).
- Los demás eventos de sonido (`sfx.place`, `sfx.fall`, `sfx.wrong`, `sfx.win`, `sfx.lose`, `sfx.door` y el propio `sfx.correct`) SIGUEN reproduciéndose sin cambios (Requirement 3.3).
- Si `attack_sword.wav` no puede cargarse o la reproducción es bloqueada, el juego SIGUE funcionando con normalidad, sin lanzar un error que interrumpa el duelo (Requirement 3.4).

**Scope:**
Todas las entradas que NO cumplen la condición del bug deben quedar completamente inafectadas por este arreglo. Esto incluye:
- Fallar una respuesta durante un duelo.
- Cualquier interacción fuera de un duelo activo (fase de construcción, apilado de bloques, aperturas de puerta).
- Cualquier otro evento sonoro del juego.

**Nota:** El comportamiento correcto esperado bajo la condición del bug se define en la sección Correctness Properties (Property 1). Esta sección se enfoca en lo que NO debe cambiar.

## Hypothesized Root Cause

Con base en la descripción del bug y la lectura del código, la causa raíz es clara y acotada:

1. **Ausencia de reproducción del archivo real**: La rama de acierto de `answerCard` (`if(correct){ fight.bossPips = ...; sfx.correct(); }`) solo dispara el beep sintetizado. No hay ninguna instrucción que reproduzca `attack_sword.wav`.

2. **No existe infraestructura para archivos de audio**: El bloque SFX está construido íntegramente sobre Web Audio API (`beep()` con osciladores). No hay `new Audio(...)` ni elementos `<audio>`, por lo que reproducir un `.wav` requiere añadir esa capacidad.

3. **Riesgo de solapamiento en aciertos consecutivos** (a considerar en el arreglo): Reutilizar una única instancia `Audio` y llamar `play()` sin reiniciar podría impedir que el segundo acierto suene mientras el primero está en curso. El arreglo debe permitir aciertos consecutivos.

4. **Riesgo de excepción por políticas del navegador** (a considerar en el arreglo): `Audio.play()` devuelve una promesa que puede rechazarse (autoplay bloqueado, archivo no encontrado). Sin manejo, esto podría generar un `unhandled rejection`; debe capturarse para no afectar el juego.

## Correctness Properties

Property 1: Bug Condition - El acierto reproduce el sonido de ataque del guerrero

_For any_ entrada donde la condición del bug se cumple (`isBugCondition` retorna true: acierto durante un duelo activo), la función corregida `answerCard'` SHALL reproducir el sonido de ataque del guerrero desde `public/audio/guerrero/ataque/attack_sword.wav`, en adición al beep `sfx.correct()`, permitiendo que aciertos consecutivos disparen el sonido en cada ocasión sin que un sonido en curso bloquee al siguiente.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Comportamiento inalterado para entradas no-bug

_For any_ entrada donde la condición del bug NO se cumple (`isBugCondition` retorna false: fallar una respuesta o cualquier interacción fuera de un duelo activo), la función corregida `answerCard'` SHALL producir el mismo resultado que la función original `answerCard`, preservando el manejo de fallos (`sfx.wrong()`), la lógica de resolución del duelo (pips, `renderPips`, victoria/derrota, avance de carta) y todos los demás eventos de sonido del juego.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Asumiendo que el análisis de causa raíz es correcto:

**File**: `torre-de-las-nubes.html`

**Funciones**: sección SFX (nuevo helper) y `answerCard` (sección BOSS FIGHT).

**Specific Changes**:

1. **Añadir helper de reproducción de archivo en el bloque SFX**: Introducir una pequeña función (por ejemplo `playSample(src, gain)`) que cree una instancia `new Audio(src)` y llame a `.play()`, respetando la convención del objeto `sfx`. Ejemplo conceptual:
   ```js
   function playSample(src, vol){
     try{
       const a = new Audio(src);
       a.volume = (vol==null?0.6:vol);
       const p = a.play();
       if(p && p.catch) p.catch(()=>{}); // ignora bloqueo/errores de reproducción
     }catch(e){}
   }
   ```

2. **Registrar la ruta del ataque del guerrero**: Añadir al objeto `sfx` una entrada dedicada, p. ej. `guerreroAtaque: ()=>playSample('public/audio/guerrero/ataque/attack_sword.wav', 0.6)`, manteniendo el estilo del resto de entradas de `sfx`.

3. **Disparar el sonido en la rama de acierto de `answerCard`**: Dentro de `if(correct){ ... }`, tras `sfx.correct();`, añadir la llamada `sfx.guerreroAtaque();`. No se modifica ninguna otra rama ni la lógica de pips/resolución.

4. **Soporte de aciertos consecutivos**: Crear una nueva instancia `Audio` en cada disparo (no reutilizar una sola instancia) garantiza que cada acierto reproduzca el sonido sin que un sonido en curso lo bloquee.

5. **Degradación elegante**: El `try/catch` alrededor de la creación de `Audio` y el `.catch(()=>{})` sobre la promesa de `play()` aseguran que un fallo de carga o un bloqueo de autoplay no lance un error que interrumpa el duelo.

## Testing Strategy

### Validation Approach

La estrategia sigue un enfoque de dos fases: primero, exponer contraejemplos que demuestren el bug sobre el código sin arreglar; luego, verificar que el arreglo funciona correctamente y preserva el comportamiento existente.

Dado que el proyecto no tiene framework de pruebas ni build step (JS vanilla en un solo HTML), las pruebas se plantean de forma pragmática: instrumentación manual en el navegador y/o pruebas basadas en propiedades sobre una extracción testeable de la lógica de decisión de sonido (qué sonidos se disparan dado un `AnswerEvent`). Si se introduce un runner ligero para PBT, debe mantenerse la política de cero dependencias pesadas salvo aprobación explícita.

### Exploratory Bug Condition Checking

**Goal**: Exponer contraejemplos que demuestren el bug ANTES de implementar el arreglo. Confirmar o refutar el análisis de causa raíz. Si se refuta, habrá que re-hipotetizar.

**Test Plan**: Instrumentar/observar `answerCard` sobre el código SIN arreglar, simulando un acierto durante un duelo, y verificar qué reproducción de audio ocurre. Espiar la creación de instancias `Audio` (p. ej. envolviendo `window.Audio`) para detectar que `attack_sword.wav` nunca se instancia.

**Test Cases**:
1. **Acierto simple**: Simular acierto (`chosenIdx === correctIdx`) durante duelo y afirmar que se reproduce `attack_sword.wav` (fallará en código sin arreglar).
2. **Aciertos consecutivos**: Simular dos aciertos seguidos y afirmar que el `.wav` se dispara en ambos (fallará en código sin arreglar).
3. **Acierto que derrota al guardián**: Simular el acierto que lleva `bossPips` a 0 y afirmar que se dispara el ataque además de `sfx.win()` (fallará en código sin arreglar).
4. **Edge — archivo ausente/bloqueado**: Simular rechazo de `Audio.play()` y afirmar que no se propaga excepción (comportamiento a garantizar tras el arreglo).

**Expected Counterexamples**:
- Nunca se instancia `new Audio('.../attack_sword.wav')` al acertar.
- Causa probable: la rama de acierto solo llama a `sfx.correct()` y no existe infraestructura para reproducir archivos.

### Fix Checking

**Goal**: Verificar que para todas las entradas donde la condición del bug se cumple, la función corregida produce el comportamiento esperado.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := answerCard_fixed(input)
  ASSERT played(result, "public/audio/guerrero/ataque/attack_sword.wav")
END FOR
```

### Preservation Checking

**Goal**: Verificar que para todas las entradas donde la condición del bug NO se cumple, la función corregida produce el mismo resultado que la función original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT answerCard_original(input) = answerCard_fixed(input)
END FOR
```

**Testing Approach**: Se recomienda pruebas basadas en propiedades (PBT) para el chequeo de preservación porque:
- Generan automáticamente muchos casos a lo largo del dominio de entrada (aciertos, fallos, dentro/fuera de duelo).
- Capturan casos borde que las pruebas unitarias manuales podrían omitir.
- Dan garantías fuertes de que el comportamiento no cambia para todas las entradas no-bug.

**Test Plan**: Observar el comportamiento sobre el código SIN arreglar para fallos y para interacciones fuera del duelo, luego escribir pruebas que capturen ese comportamiento y verifiquen que se mantiene tras el arreglo.

**Test Cases**:
1. **Preservación de fallo**: Observar que fallar resta pip al jugador y suena `sfx.wrong()` sin ataque del guerrero; verificar que continúa tras el arreglo.
2. **Preservación de resolución del duelo**: Observar que acertar resta pip al jefe, actualiza `renderPips` y resuelve victoria/derrota/avance igual; verificar que continúa (salvo el nuevo sonido añadido) tras el arreglo.
3. **Preservación de otros sonidos**: Observar `sfx.place`, `sfx.fall`, `sfx.win`, `sfx.lose`, `sfx.door`, `sfx.correct` sin cambios; verificar que continúan.
4. **Preservación fuera de duelo**: Observar que interacciones sin `fight` activo no disparan el ataque del guerrero; verificar que continúan.

### Unit Tests

- Verificar que la rama de acierto de `answerCard` dispara la reproducción de `attack_sword.wav`.
- Verificar que la rama de fallo NO dispara el ataque del guerrero y sí `sfx.wrong()`.
- Verificar que un fallo de carga/bloqueo de `Audio.play()` se captura y no propaga excepción.
- Verificar que la lógica de pips y resolución (victoria/derrota/avance) no cambia.

### Property-Based Tests

- Generar `AnswerEvent` aleatorios (`duringBossFight`, `chosenIdx`, `correctIdx`) y verificar que el ataque del guerrero se reproduce si y solo si `isBugCondition` es verdadera.
- Generar secuencias de aciertos consecutivos y verificar que el `.wav` se dispara en cada uno (nueva instancia por disparo, sin bloqueo por sonido en curso).
- Generar entradas no-bug y verificar equivalencia de resultado entre `answerCard` original y corregida (preservación).

### Integration Tests

- Flujo completo de duelo: acertar varias cartas y confirmar retroalimentación sonora del ataque en cada acierto además del beep.
- Cambio de contexto: alternar entre fase de construcción y duelo, confirmando que el ataque solo suena al acertar dentro del duelo.
- Retroalimentación visual/sonora combinada: confirmar que el sonido acompaña el decremento del pip del guardián y no interfiere con `sfx.win()` al derrotarlo.
