# Implementation Plan: Barra de vida del jefe no refleja

## Overview

Se corrige la inicialización de la vida del jefe en `src/combat/fight.js` (`startBossFight`), que hoy usa `Math.ceil(cardCount / 2)` en lugar de `cardCount`, preservando la tolerancia de fallos del jugador. Además se ajusta la temporización de la rama `win` en `src/main.js` → `onAnswer` para que el último decremento de la barra del jefe se perciba antes del banner de victoria. Se sigue el flujo de bugfix por exploración: primero pruebas que demuestran el bug y pruebas de preservación sobre el código sin corregir, luego la corrección, y por último la verificación. Las pruebas usan `vitest` y `fast-check`, ya declarados como `devDependencies`. Todo el texto de cara al usuario se mantiene en español.

## Tasks

- [x] 1. Escribir la prueba de exploración de la condición del bug
  - **Property 1: Bug Condition** - La vida del jefe equivale al número de cartas y se refleja visiblemente
  - **CRÍTICO**: Esta prueba DEBE FALLAR sobre el código sin corregir; el fallo confirma que el bug existe.
  - **NO intentes arreglar la prueba ni el código cuando falle**: el fallo es el resultado esperado en esta etapa.
  - **NOTA**: Esta prueba codifica el comportamiento esperado; validará la corrección cuando pase tras la implementación (tarea 3.4).
  - **OBJETIVO**: Exponer contraejemplos que demuestren que el bug existe (vida del jefe = `ceil(cardCount / 2)` en vez de `cardCount`).
  - **Enfoque PBT acotado**: escribir una prueba basada en propiedades en `src/combat/fight.test.js` con `fast-check` que, para todo `level >= 1`, afirme que `startBossFight(level).bossPips === Math.min(level, MAX_CARD_COUNT)` y `bossPipsMax === Math.min(level, MAX_CARD_COUNT)` (según la Bug Condition y la Property 1 del diseño). Reforzar con ejemplos deterministas concretos: nivel 2 → `bossPips = 2` (hoy 1), nivel 4 → `bossPips = 4` (hoy 2), nivel 6 → `bossPips = 6` (hoy 3), nivel 7 y 100 → `bossPips = 7` (hoy 4).
  - Las aserciones deben coincidir con las Expected Behavior Properties del diseño (`bossPips == cardCount`, `bossPipsMax == cardCount`, un acierto por carta para derrotar al jefe).
  - Ejecutar la prueba sobre el código SIN corregir con `npm test -- --run`.
  - **RESULTADO ESPERADO**: la prueba FALLA (correcto: prueba que el bug existe).
  - Documentar los contraejemplos encontrados (p. ej. "`startBossFight(4).bossPips` devuelve 2 en lugar de 4"; "`startBossFight(2).bossPipsMax` devuelve 1 en lugar de 2") para entender la causa raíz.
  - Marcar la tarea como completa cuando la prueba esté escrita, ejecutada y el fallo documentado.
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Escribir las pruebas de preservación (ANTES de implementar la corrección)
  - **Property 2: Preservation** - Tolerancia del jugador y mecánica de combate inalteradas
  - **IMPORTANTE**: Seguir la metodología de observación primero.
  - Observar el comportamiento del código SIN corregir para las entradas no buggy y registrarlo:
    - `startBossFight(L).playerPips` y `playerPipsMax` valen `cardCount - Math.ceil(cardCount / 2) + 1` (p. ej. nivel 4 → 3, nivel 6 → 4, nivel 7 → 4).
    - `startBossFight(L).cardCount` vale `Math.min(L, 7)`.
    - `answerCard` al fallar bloquea la carta y reduce `playerPips` en 1; al acertar sin resolver refresca la pregunta; `playerPips = 0` produce `outcome = 'lose'`.
  - Escribir pruebas basadas en propiedades con `fast-check` en `src/combat/fight.test.js` que capturen esos patrones observados (a partir de las Preservation Requirements del diseño):
    - Para todo `level >= 1`: `playerPips` corregido == `cardCount - Math.ceil(cardCount / 2) + 1` y `playerPipsMax` idéntico.
    - Para cualquier secuencia de respuestas: `answerCard` conserva daño de 1 pip al jugador al fallar, bloqueo permanente de carta, refresco de pregunta al acertar sin resolver y resolución de derrota.
    - Verificar que las propiedades de forma del estado (`cardCount`, `cards`, `bossLabel`) y estilo de barras no cambian.
  - Las pruebas basadas en propiedades generan muchos casos para garantías más fuertes.
  - Ejecutar las pruebas sobre el código SIN corregir con `npm test -- --run`.
  - **RESULTADO ESPERADO**: las pruebas PASAN (confirma el comportamiento base a preservar).
  - Marcar la tarea como completa cuando las pruebas estén escritas, ejecutadas y pasando sobre el código sin corregir.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Corrección de la vida del jefe y de la temporización del banner de victoria

  - [x] 3.1 Fijar la vida del jefe = número de cartas en `startBossFight` preservando la tolerancia del jugador
    - En `src/combat/fight.js` → `startBossFight(level)`: sustituir el cálculo de la vida del jefe basado en `Math.ceil(cardCount / 2)` por `cardCount` (`bossPips = cardCount`, `bossPipsMax = cardCount`).
    - Desacoplar la tolerancia del jugador de la vida del jefe: calcular `playerPips`/`playerPipsMax` de forma independiente como `cardCount - Math.ceil(cardCount / 2) + 1`, para que conserve exactamente el valor previo a la corrección (no derivarlo del nuevo `bossPips`).
    - No modificar el resto del retorno (`cardCount`, `cards`, `bossLabel`, `resolved`) ni la mecánica de `answerCard`.
    - _Bug_Condition: isBugCondition(level) → fight.bossPipsMax != cardCount OR fight.bossPips != cardCount (del diseño)_
    - _Expected_Behavior: bossPips == cardCount AND bossPipsMax == cardCount, siendo cardCount = min(level, 7) (Property 1 del diseño)_
    - _Preservation: playerPips/playerPipsMax = cardCount - ceil(cardCount/2) + 1; answerCard, estilo de barras y comportamiento fuera del combate inalterados (Preservation Requirements del diseño)_
    - _Requirements: 2.1, 2.2, 2.3, 3.4_

  - [x] 3.2 Añadir una breve pausa entre el último decremento y el banner de victoria en `main.js`
    - En `src/main.js` → `onAnswer(cardIdx, chosenIdx)`, rama `result.outcome === 'win'`: asegurar que `ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax)` (que deja la barra en 0) sea perceptible e introducir una breve pausa antes de `ui.showBanner('¡Guardián derrotado!', 'win')` para que el jugador vea la barra vaciarse.
    - Mantener el `setTimeout` existente hacia `endFight(true)` (~1300 ms) medido desde el banner para no acortar el flujo total.
    - No alterar las ramas `lose` ni de acierto sin resolver (temporización de derrota y volteo/rehabilitación de cartas se conservan).
    - _Bug_Condition: golpe mortal donde el banner aparece en el mismo instante en que la barra se vacía (síntoma 1.3 del diseño)_
    - _Expected_Behavior: el último decremento se refleja visiblemente en #bossHpBar y, tras una breve pausa, aparece el banner de victoria (Property 1, Req 2.4)_
    - _Preservation: ramas 'lose' y de acierto sin resolver sin cambios (Preservation Requirements del diseño)_
    - _Requirements: 2.4_

  - [x] 3.3 Actualizar la prueba existente que afirma `bossPips === ceil(cardCount / 2)`
    - En `src/combat/fight.test.js`, actualizar la prueba "Property 8: los umbrales iniciales son válidos y siguen la fórmula del diseño" que hoy afirma `bossPips === Math.ceil(cardCount / 2)` y `playerPips === cardCount - bossPips + 1`.
    - Ajustar las aserciones a la nueva especificación: `bossPips === cardCount`, `bossPipsMax === cardCount` y `playerPips === cardCount - Math.ceil(cardCount / 2) + 1`.
    - Revisar y actualizar otras pruebas dependientes del valor antiguo si es necesario: la tabla de umbrales de `startBossFight — ejemplos y bordes (unit)` (bossPips esperado por nivel) y cualquier comentario sobre `bossDefeatThreshold` en las pruebas de victoria/derrota, sin cambiar la mecánica que validan.
    - _Bug_Condition: la prueba antigua codifica el comportamiento buggy (bossPips = ceil(cardCount/2))_
    - _Expected_Behavior: bossPips == cardCount (Property 1 del diseño)_
    - _Preservation: la fórmula de playerPips y la mecánica de answerCard validadas por el resto de pruebas no cambian_
    - _Requirements: 2.1, 2.2, 3.4_

  - [x] 3.4 Verificar que la prueba de exploración de la condición del bug ahora pasa
    - **Property 1: Expected Behavior** - La vida del jefe equivale al número de cartas y se refleja visiblemente
    - **IMPORTANTE**: Re-ejecutar la MISMA prueba de la tarea 1; NO escribir una prueba nueva.
    - La prueba de la tarea 1 codifica el comportamiento esperado; al pasar, confirma que se satisface.
    - Ejecutar la prueba de exploración de la tarea 1 con `npm test -- --run`.
    - **RESULTADO ESPERADO**: la prueba PASA (confirma que el bug está corregido).
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 Verificar que las pruebas de preservación siguen pasando
    - **Property 2: Preservation** - Tolerancia del jugador y mecánica de combate inalteradas
    - **IMPORTANTE**: Re-ejecutar las MISMAS pruebas de la tarea 2; NO escribir pruebas nuevas.
    - Ejecutar las pruebas de preservación de la tarea 2 con `npm test -- --run`.
    - **RESULTADO ESPERADO**: las pruebas PASAN (confirma que no hay regresiones).
    - Confirmar que todas las pruebas siguen pasando tras la corrección.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Añadir pruebas de integración del flujo de combate
  - Escribir pruebas de integración (p. ej. en `src/integration/`) que cubran el flujo completo descrito en Integration Tests del diseño:
    - Iniciar un combate de nivel `>= 2`, acertar una pregunta y verificar que la barra del jefe (`#bossHpBar`) muestra un decremento perceptible (una casilla pasa a `lost`) por acierto.
    - Golpe mortal: en el acierto que lleva `bossPips` a 0, verificar que `#bossHpBar` se repinta a 0 casillas llenas y que el banner de victoria aparece tras una breve pausa (orden de operaciones de UI).
    - Verificar que la vida del jugador y el flujo fuera del combate no se ven afectados por la corrección.
  - Ejecutar con `npm test -- --run` y confirmar que pasan.
  - _Requirements: 2.3, 2.4, 3.4, 3.6_

- [x] 5. Checkpoint - Asegurar que todas las pruebas pasan
  - Ejecutar toda la suite con `npm test -- --run` y confirmar que todas las pruebas pasan (exploración, preservación, unitarias e integración).
  - Si surgen dudas o fallos inesperados, consultar al usuario antes de continuar.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["3.4", "3.5"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5"] }
  ]
}
```

## Notes

- La corrección es mínima y quirúrgica: solo `startBossFight` (vida del jefe) y la rama `win` de `onAnswer` (temporización). `answerCard` y `renderPips` NO se modifican.
- Las tareas 1 y 2 se ejecutan sobre el código SIN corregir: la tarea 1 debe FALLAR (confirma el bug) y la tarea 2 debe PASAR (fija la línea base a preservar).
- Property 1 cubre la Bug Condition / Expected Behavior; Property 2 cubre la Preservation. Ambas usan `fast-check` con al menos 100 iteraciones, siguiendo la convención del proyecto.
- No hay build step; los tests son de desarrollo (`vitest`) y se ejecutan con `npm test -- --run` (una sola pasada, sin watch).
