# Barra de Vida del Jefe No Refleja — Bugfix Design

## Overview

Durante el combate contra el guardián, la barra de vida del jefe (`#bossHpBar`) no
refleja de forma perceptible el punto de vida que se le quita al acertar, y el jefe
muere con menos aciertos de los esperados.

La raíz del problema es que `startBossFight(level)` inicializa la vida del jefe como
`Math.ceil(cardCount / 2)` en lugar de un punto de vida por carta (`cardCount`). Esto
provoca dos síntomas: (1) el jefe requiere aproximadamente la mitad de aciertos, y (2)
en niveles bajos la barra queda con una sola casilla, por lo que un único acierto la
lleva directamente a la victoria sin decremento perceptible.

Existe además un problema de temporización en la capa de UI (`src/main.js`,
`onAnswer`): en el acierto que derrota al jefe, el banner de victoria se muestra
prácticamente en el mismo instante en que la barra se vacía, de modo que el último
decremento no se percibe antes del anuncio de victoria.

La estrategia de corrección es mínima y quirúrgica:

1. En `src/combat/fight.js` → `startBossFight`: fijar la vida del jefe igual a
   `cardCount` (mínimo entre `level` y `MAX_CARD_COUNT`), manteniendo intacta la
   tolerancia de fallos del jugador (`playerPips`).
2. En `src/main.js` → `onAnswer` (rama `win`): garantizar que el último decremento se
   pinta en la barra y que el banner de victoria aparece tras una breve pausa.

La mecánica de daño por acierto (`answerCard` quita exactamente 1 pip al jefe) **ya es
correcta** y no debe modificarse; con la vida del jefe igual a `cardCount`, "un acierto
por carta" emerge de forma natural.

## Glossary

- **Bug_Condition (C)**: La condición que dispara el bug: al iniciar un combate, la vida
  máxima del jefe (`bossPipsMax`) no es igual al número de cartas (`cardCount`).
- **Property (P)**: El comportamiento deseado: la vida del jefe es igual al número de
  cartas y cada acierto (incluido el que lo derrota) se refleja visiblemente en la barra
  antes de anunciar la victoria.
- **Preservation**: El comportamiento existente que debe permanecer inalterado: la
  tolerancia de fallos del jugador, el bloqueo de cartas al fallar, el refresco de
  pregunta al acertar sin resolver, la resolución de derrota, el estilo visual de las
  barras y todo el comportamiento fuera del combate.
- **`startBossFight(level)`**: Función en `src/combat/fight.js` que calcula la
  configuración inicial de un combate (cartas, pips del jugador y del jefe). NO toca el
  DOM.
- **`answerCard(fight, idx, chosenIdx)`**: Función en `src/combat/fight.js` que procesa
  un intento; al acertar reduce `bossPips` en 1, al fallar bloquea la carta y reduce
  `playerPips` en 1. NO cambia con esta corrección.
- **`onAnswer(cardIdx, chosenIdx)`**: Manejador en `src/main.js` que orquesta la
  respuesta: llama a `answerCard`, repinta las barras (`renderPips`) y muestra el banner
  (`showBanner`) según el resultado.
- **`renderPips(elId, current, total)`**: Función en `src/ui/screens.js` que dibuja las
  casillas de una barra de vida: las primeras `current` como llenas y el resto (`total -
  current`) con la clase `lost`.
- **`cardCount`**: Número de cartas del combate = `Math.min(level, MAX_CARD_COUNT)` con
  `MAX_CARD_COUNT = 7`.

## Bug Details

### Bug Condition

El bug se manifiesta al iniciar cualquier combate: `startBossFight` fija la vida máxima
del jefe en `Math.ceil(cardCount / 2)` en lugar de `cardCount`. Como consecuencia, la
barra del jefe se dibuja con menos casillas de las que corresponden y el jefe se derrota
con menos aciertos que el número de cartas. En niveles bajos (`cardCount = 2`), la vida
colapsa a una sola casilla y no se percibe ningún decremento.

**Formal Specification:**
```
FUNCTION isBugCondition(level)
  INPUT: level, entero >= 1
  OUTPUT: boolean

  cardCount := min(level, MAX_CARD_COUNT)   // MAX_CARD_COUNT = 7
  fight := startBossFight(level)            // función bajo corrección

  // El bug se da cuando la vida (máxima) del jefe no es igual al nº de cartas.
  RETURN fight.bossPipsMax != cardCount
         OR fight.bossPips  != cardCount
END FUNCTION
```

Nota sobre la temporización visual (síntoma 1.3): incluso con la vida del jefe correcta,
el último decremento debe pintarse en la barra antes de mostrar el banner de victoria.
Esta faceta no es un valor de estado sino un orden de operaciones de UI; se valida
mediante prueba de integración (ver Testing Strategy) y queda cubierta por la Property 1.

### Examples

- **Nivel 2 (2 cartas)** — Actual: `bossPips = ceil(2/2) = 1`, la barra tiene 1 casilla;
  un solo acierto gana el combate sin decremento visible. Esperado: `bossPips = 2`, dos
  aciertos, un decremento perceptible en el primero.
- **Nivel 4 (4 cartas)** — Actual: `bossPips = ceil(4/2) = 2`, el jefe muere con 2
  aciertos. Esperado: `bossPips = 4`, el jefe muere con 4 aciertos.
- **Nivel 6 (6 cartas)** — Actual: `bossPips = ceil(6/2) = 3` (la mitad de los aciertos
  esperados). Esperado: `bossPips = 6`.
- **Nivel >= 7 (7 cartas, tope)** — Actual: `bossPips = ceil(7/2) = 4`. Esperado:
  `bossPips = 7`.
- **Golpe mortal (cualquier nivel)** — Actual: el banner "¡Guardián derrotado!" aparece
  en el mismo instante en que la barra se vacía. Esperado: la barra se ve vaciarse y,
  tras una breve pausa, aparece el banner.
- **Nivel 1 (1 carta)** — Caso límite: `cardCount = 1`, por lo que la vida del jefe es 1
  tanto antes como después de la corrección. Un único acierto derrota al jefe porque solo
  hay una carta; esto es el comportamiento esperado y no cambia.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- La tolerancia de fallos del jugador (`playerPips` / `playerPipsMax`) debe conservar el
  mismo valor que antes de la corrección: `cardCount - ceil(cardCount / 2) + 1`. El
  cambio en la vida del jefe NO debe reducir los fallos tolerados por el jugador
  (Req 3.4).
- Al fallar una pregunta, la carta se bloquea de forma permanente y se reduce
  `playerPips` en 1 (Req 3.1).
- Cuando `playerPips` llega a 0, el combate se resuelve como derrota y se muestra el
  banner "¡Has caído ante el guardián!" (Req 3.2).
- Al acertar sin resolver el combate, la carta NO se bloquea y su pregunta se refresca
  con `pickQuestion` (Req 3.3).
- El estilo visual de las barras se mantiene: casillas restantes llenas, consumidas con
  clase `lost` (Req 3.5).
- Todo el comportamiento fuera del combate (construcción, caída, game over) permanece
  idéntico (Req 3.6).
- La forma de retorno de `startBossFight` (`cardCount`, `cards`, `bossLabel`, `resolved`)
  y la mecánica de `answerCard` (daño de 1 pip por acierto, resolución) no cambian.

**Scope:**
Todas las entradas y comportamientos que NO involucren la inicialización de la vida del
jefe ni el orden de pintado del último decremento antes del banner deben quedar
completamente inalterados. Esto incluye:
- La inicialización y el consumo de la vida del jugador.
- El bloqueo de cartas al fallar y el refresco de pregunta al acertar.
- La resolución de derrota y su banner.
- El comportamiento fuera del combate.

**Note:** El comportamiento correcto esperado se define en la sección Correctness
Properties (Property 1). Esta sección se centra en lo que NO debe cambiar.

## Hypothesized Root Cause

Con base en el análisis del código y de la descripción del bug, las causas son:

1. **Inicialización incorrecta de la vida del jefe** (causa principal): en
   `startBossFight`, `bossDefeatThreshold = Math.ceil(cardCount / 2)` y luego
   `bossPips`/`bossPipsMax` se fijan a ese valor. Debería ser `cardCount` (un punto de
   vida por carta).
   - `src/combat/fight.js`, líneas donde se calcula `bossDefeatThreshold` y se asignan
     `bossPips` / `bossPipsMax`.

2. **Acoplamiento de la vida del jugador a la del jefe**: `playerDefeatThreshold =
   cardCount - bossDefeatThreshold + 1`. Si se cambia la vida del jefe de forma ingenua,
   se alteraría la tolerancia del jugador. Debe desacoplarse para preservar Req 3.4: la
   fórmula del jugador debe seguir dando `cardCount - ceil(cardCount / 2) + 1`.

3. **Temporización del banner de victoria**: en `src/main.js` → `onAnswer`, en la rama
   `win` se llama a `renderPips('bossHpBar', ...)` e inmediatamente después a
   `showBanner(...)`. Aunque el repintado ocurre antes del banner, no hay pausa para que
   el ojo perciba el vaciado de la barra antes del anuncio. Debe introducirse una breve
   pausa entre el último decremento visible y el banner de victoria (Req 2.4).

4. **Percepción en niveles bajos**: es un efecto derivado de la causa 1 (barra de una
   sola casilla). Se resuelve automáticamente al fijar la vida del jefe en `cardCount`
   para `cardCount >= 2`.

## Correctness Properties

Property 1: Bug Condition - La vida del jefe equivale al número de cartas y se refleja visiblemente

_For any_ nivel `L >= 1` en el que se inicia un combate (donde `isBugCondition` es
verdadero en el código sin corregir), la función corregida `startBossFight(L)` SHALL
producir `bossPips == cardCount` y `bossPipsMax == cardCount`, siendo `cardCount =
min(L, 7)`, de modo que se requiere un acierto por carta para derrotar al jefe; y cada
acierto, incluido el que reduce la vida del jefe a 0, SHALL reflejarse visiblemente en
`#bossHpBar` antes de anunciar la victoria.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Tolerancia del jugador y mecánica de combate inalteradas

_For any_ nivel `L >= 1` y cualquier secuencia de respuestas (donde `isBugCondition` es
falso, es decir, cualquier faceta ajena a la inicialización de la vida del jefe), el
código corregido SHALL producir exactamente el mismo resultado que el original,
preservando: el valor inicial de `playerPips`/`playerPipsMax` (`cardCount - ceil(cardCount
/ 2) + 1`), el bloqueo de cartas y el daño al jugador al fallar, el refresco de pregunta
al acertar sin resolver, la resolución de derrota con su banner, el estilo visual de las
barras y todo el comportamiento fuera del combate.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Asumiendo que el análisis de causa raíz es correcto:

**Archivo 1**: `src/combat/fight.js`

**Función**: `startBossFight(level)`

**Cambios específicos**:
1. **Vida del jefe = nº de cartas**: sustituir el cálculo de la vida del jefe basado en
   `Math.ceil(cardCount / 2)` por `cardCount`.
   - `bossPips = cardCount`
   - `bossPipsMax = cardCount`
2. **Preservar la tolerancia del jugador**: mantener el valor de `playerPips` /
   `playerPipsMax` que se obtenía antes de la corrección. Calcularlo de forma
   independiente de la vida del jefe para que siga siendo `cardCount - Math.ceil(cardCount
   / 2) + 1` (no derivarlo del nuevo `bossPips`).
   - Ejemplo de forma sugerida:
     ```
     const cardCount = Math.min(level, MAX_CARD_COUNT);
     const bossPipsInit = cardCount;                                  // un HP por carta
     const playerPipsInit = cardCount - Math.ceil(cardCount / 2) + 1; // sin cambios
     ```
3. **No tocar el resto del retorno**: `cardCount`, `cards`, `bossLabel`, `resolved`
   permanecen igual.

**Archivo 2**: `src/main.js`

**Función**: `onAnswer(cardIdx, chosenIdx)` (rama `result.outcome === 'win'`)

**Cambios específicos**:
4. **Pintar el último decremento antes del banner**: asegurar que
   `renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax)` (que ya deja la barra en
   0) se ejecute y sea perceptible, e introducir una breve pausa antes de
   `showBanner('¡Guardián derrotado!', 'win')` para que el jugador vea la barra vaciarse.
   - Mantener el `setTimeout` existente hacia `endFight(true)` (~1300 ms) medido desde el
     banner, para no acortar el flujo total más de lo necesario.
5. **No alterar las ramas `lose` ni de acierto no resuelto**: la temporización de derrota
   y el volteo/rehabilitación de cartas al acertar sin resolver se conservan.

### Notas de alcance

- `answerCard` NO se modifica: ya reduce `bossPips` en 1 por acierto y resuelve el
  combate cuando `bossPips <= 0`.
- `renderPips` en `src/ui/screens.js` NO se modifica: dibuja `total` casillas y marca las
  consumidas con `lost`; con `bossPipsMax = cardCount` dibujará el número correcto de
  casillas automáticamente.

## Testing Strategy

### Validation Approach

La estrategia sigue un enfoque de dos fases: primero, exponer contraejemplos que
demuestren el bug sobre el código sin corregir; después, verificar que la corrección
funciona y que se preserva el comportamiento existente.

### Exploratory Bug Condition Checking

**Goal**: Exponer contraejemplos que demuestren el bug ANTES de implementar la corrección.
Confirmar o refutar el análisis de causa raíz. Si se refuta, habrá que re-hipotetizar.

**Test Plan**: Escribir pruebas que inicien combates de distintos niveles y comprueben la
vida inicial del jefe; y una prueba de integración que simule el golpe mortal y observe el
orden de pintado de la barra respecto al banner. Ejecutar sobre el código SIN corregir para
observar los fallos.

**Test Cases**:
1. **Vida del jefe por nivel**: `startBossFight(4)` devuelve `bossPips = 4` (fallará: hoy
   devuelve 2).
2. **Nivel bajo perceptible**: `startBossFight(2)` devuelve `bossPipsMax = 2` (fallará:
   hoy devuelve 1).
3. **Tope de cartas**: `startBossFight(7)` y `startBossFight(100)` devuelven `bossPips = 7`
   (fallará: hoy devuelve 4).
4. **Golpe mortal / banner (integración)**: simular el acierto que lleva `bossPips` a 0 y
   verificar que la barra se repinta a 0 y que el banner aparece tras una pausa (podría
   fallar sobre el código sin corregir por falta de pausa).

**Expected Counterexamples**:
- `startBossFight(L).bossPips === Math.ceil(min(L,7) / 2)` en vez de `min(L,7)`.
- Posibles causas: cálculo `Math.ceil(cardCount / 2)` para la vida del jefe; banner sin
  pausa tras el último decremento.

### Fix Checking

**Goal**: Verificar que, para todas las entradas donde se cumple la condición del bug, la
función corregida produce el comportamiento esperado.

**Pseudocode:**
```
FOR ALL level WHERE isBugCondition(level) DO
  fight := startBossFight_fixed(level)
  cardCount := min(level, MAX_CARD_COUNT)
  ASSERT fight.bossPips == cardCount
  ASSERT fight.bossPipsMax == cardCount
END FOR
```

### Preservation Checking

**Goal**: Verificar que, para todas las entradas donde NO se cumple la condición del bug,
la función corregida produce el mismo resultado que la original.

**Pseudocode:**
```
FOR ALL level WHERE NOT isBugCondition(level) DO
  ASSERT startBossFight_original(level).playerPips    == startBossFight_fixed(level).playerPips
  ASSERT startBossFight_original(level).playerPipsMax == startBossFight_fixed(level).playerPipsMax
  ASSERT startBossFight_original(level).cardCount     == startBossFight_fixed(level).cardCount
END FOR

FOR ALL (level, secuencia de respuestas) DO
  // answerCard no cambia: mismo daño, mismo bloqueo, misma resolución
  ASSERT answerCard_original(...) == answerCard_fixed(...)
END FOR
```

**Testing Approach**: Se recomienda property-based testing para la preservación porque:
- Genera muchos casos automáticamente en todo el dominio de niveles y secuencias.
- Captura casos límite que las pruebas manuales podrían omitir.
- Ofrece garantías fuertes de que el comportamiento no cambia para las entradas no buggy.

**Test Plan**: Observar el comportamiento del código SIN corregir para la vida del jugador
y la mecánica de `answerCard`, y escribir pruebas basadas en propiedades que capturen ese
comportamiento y comprueben que persiste tras la corrección.

**Test Cases**:
1. **Tolerancia del jugador preservada**: para cualquier nivel, `playerPips` corregido ==
   `cardCount - ceil(cardCount / 2) + 1` (mismo valor que antes).
2. **Bloqueo y daño al fallar preservados**: fallar bloquea la carta y reduce `playerPips`
   en 1, igual que antes.
3. **Refresco de pregunta al acertar sin resolver preservado**.
4. **Resolución de derrota preservada**: `playerPips = 0` produce `outcome = 'lose'`.

### Unit Tests

- `startBossFight(L)` fija `bossPips` y `bossPipsMax` en `min(L, 7)` para niveles
  representativos (1, 2, 4, 6, 7, 100).
- `startBossFight(L)` conserva `playerPips`/`playerPipsMax` en `cardCount - ceil(cardCount
  / 2) + 1`.
- Casos límite: nivel 1 (1 carta → vida del jefe 1) y niveles `>= 7` (tope 7).

### Property-Based Tests

- **Property 1**: para cualquier `level >= 1`, `startBossFight(level).bossPips ===
  min(level, 7)` y `bossPipsMax === min(level, 7)`; y responder correctamente `cardCount`
  cartas derrota al jefe (ni antes ni después).
- **Property 2 (preservación)**: para cualquier `level >= 1`, `playerPips` corregido
  coincide con la fórmula previa; y para cualquier secuencia de respuestas, `answerCard`
  mantiene daño, bloqueo, refresco de pregunta y resolución.
- Actualizar la prueba existente en `src/combat/fight.test.js` que hoy afirma `bossPips ===
  ceil(cardCount / 2)` para reflejar la nueva especificación (`bossPips === cardCount`).

### Integration Tests

- Flujo completo de combate: iniciar combate de nivel `>= 2`, acertar y verificar que la
  barra del jefe muestra un decremento perceptible (una casilla pasa a `lost`) por acierto.
- Golpe mortal: en el acierto que lleva `bossPips` a 0, verificar que `#bossHpBar` se
  repinta a 0 casillas llenas y que el banner de victoria aparece tras una breve pausa.
- Verificar que la vida del jugador y el flujo fuera del combate no se ven afectados por la
  corrección.
