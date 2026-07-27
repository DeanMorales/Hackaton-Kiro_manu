# Implementation Plan: Dificultad Progresiva de Preguntas

## Overview

> **Nota de adaptación (proyecto modular `src/`)**: El monolito `torre-de-las-nubes.html`
> quedó congelado y NO debe modificarse. Este plan implementa la dificultad progresiva
> en la arquitectura modular vigente (`src/`), respetando la equivalencia de responsabilidades:
> - **Sección DATA del monolito → `src/data/services.js`** (banco `QUESTIONS`, `AWS_SERVICES`,
>   `pickQuestion`, `shuffle`; aquí se añaden `difficultyForBossLevel`, `resolveEffectiveDifficulty`,
>   `difficultyLabel`, `CLF_DOMAINS`).
> - **Sección BOSS FIGHT del monolito → `src/combat/fight.js`** (`startBossFight`, `answerCard`).
> - **Indicador visual (UI) → `src/ui/screens.js` + markup en `index.html`**; cableado en `src/main.js`.
> - **Hook `window.__torreTest`**: NO aplica. Los módulos son ES modules; las pruebas importan
>   las funciones directamente con `import`. Se usa `vitest` + `fast-check` + `jsdom` (ya en `package.json`,
>   `vitest.config.js` con `environment: 'jsdom'`).
> - **Trato igualitario de todos los servicios**: no existe un subconjunto "foco". El mecanismo de
>   dificultad (mapeo, selección con reserva al nivel más cercano, indicador, integración) aplica a
>   TODOS los servicios del banco gracias a la reserva (`resolveEffectiveDifficulty`) y a tratar
>   preguntas sin `d` como nivel 1 (`q.d || 1`). Los mínimos por nivel (R1.2) —`>=8` nivel 1, `>=10`
>   nivel 2, `>=5` nivel 3— se cumplen por igual para **cada uno** de los ~54 servicios de
>   `AWS_SERVICES` (R1.5), y la selección de servicios de combate es aleatoria uniforme sobre
>   `AWS_SERVICES`, sin pesos (R1.6).

El trabajo se organiza de forma incremental: primero las funciones puras del mapeo y la selección por
dificultad (con sus pruebas de propiedad), luego la asignación de dificultad a las preguntas
existentes y la ampliación de datos del banco **por grupo de dominio** de `AWS_SERVICES` (un esfuerzo
de contenido muy grande, ~1150+ preguntas), después el cableado en el combate y el indicador visual, y
finalmente las pruebas de integración y no regresión. Cada tarea construye sobre la anterior y termina
integrándose en el flujo del combate, sin código huérfano.

## Tasks

- [x] 1. Implementar el Mapeador_De_Dificultad y sus exports
  - [x] 1.1 Implementar `difficultyForBossLevel(level)` en `src/data/services.js`
    - Añadir y exportar la función (`export function difficultyForBossLevel(level)`) en la sección DATA de `src/data/services.js`
    - Mapeo `1→1`, `2→2`, `>=3→3`; usar `Math.floor(level)` y tratar valores `< 1` como 1
    - Garantizar salida siempre en `{1,2,3}`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x]* 1.2 Escribir prueba de propiedad: mapeo acotado en [1,3]
    - **Property 1: Mapeo acotado en [1,3]**
    - **Validates: Requirements 2.6**
    - En `src/data/services.difficulty.test.js`, `import { difficultyForBossLevel } from './services.js'`; generar enteros `>= 1` (incluyendo valores grandes); `numRuns` >= 100

  - [x]* 1.3 Escribir prueba de propiedad: mapeo monótono no decreciente
    - **Property 2: Mapeo monótono no decreciente**
    - **Validates: Requirements 2.5**
    - Generar pares `a <= b` (ambos `>= 1`) y verificar `f(a) <= f(b)`; `numRuns` >= 100

  - [x]* 1.4 Escribir prueba de propiedad: mapeo conforme a puntos especificados
    - **Property 3: Mapeo conforme a los puntos especificados**
    - **Validates: Requirements 2.2, 2.3, 2.4**
    - Verificar `1→1`, `2→2` y `>=3→3` (incluyendo varios niveles `>= 3`)

- [x] 2. Implementar el Selector_De_Preguntas por dificultad
  - [x] 2.1 Implementar `resolveEffectiveDifficulty(pool, target)` y actualizar `pickQuestion` en `src/data/services.js`
    - Añadir y exportar `resolveEffectiveDifficulty(pool, target)`: exacta → más cercana MENOR → más cercana MAYOR; tratar preguntas sin `d` como nivel 1 (`q.d || 1`)
    - Ampliar la firma a `pickQuestion(serviceId, avoidText, targetDifficulty)`; default seguro a 1 si `targetDifficulty` no está en `[1,3]` (incluye `undefined`, preservando compatibilidad con las llamadas existentes de 2 argumentos)
    - Filtrar por dificultad efectiva, conservar la evasión de `avoidText` (por `q` original) y el barajado de opciones existente con seguimiento del índice correcto (`order.indexOf(pick.c)`)
    - Devolver `{text, options, correct, difficulty}`; retornar `null` si el servicio no tiene preguntas
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 1.4_

  - [x]* 2.2 Escribir prueba de propiedad: retorno siempre válido del servicio
    - **Property 4: El selector siempre devuelve una pregunta válida del servicio**
    - **Validates: Requirements 3.5, 3.1**
    - Generar pools sintéticos (mocks) y objetivos en `{1,2,3}`; verificar 4 opciones y `correct` en `[0,3]`; `numRuns` >= 100

  - [x]* 2.3 Escribir prueba de propiedad: coincidencia exacta de dificultad
    - **Property 5: Coincidencia exacta de dificultad cuando existe**
    - **Validates: Requirements 3.2**
    - Cuando el pool contiene el nivel objetivo, el `difficulty` devuelto debe igualarlo; `numRuns` >= 100

  - [x]* 2.4 Escribir prueba de propiedad: reserva al nivel disponible más cercano
    - **Property 6: Reserva al nivel disponible más cercano**
    - **Validates: Requirements 3.3, 3.4**
    - Generar pools con el nivel objetivo ausente; verificar que se elige el nivel más cercano menor y, si no existe, el más cercano mayor; `numRuns` >= 100

  - [x]* 2.5 Escribir prueba de propiedad: preservación del índice correcto tras barajar
    - **Property 7: Preservación del índice de la opción correcta tras barajar**
    - **Validates: Requirements 3.6**
    - Generar preguntas con `c` arbitrario, ejecutar `pickQuestion` muchas veces y verificar `options[correct] === opciónCorrectaOriginal`; `numRuns` >= 100

  - [x]* 2.6 Escribir prueba de propiedad: preguntas sin `d` tratadas como nivel 1
    - **Property 10: Preguntas sin dificultad se tratan como nivel 1**
    - **Validates: Requirements 1.4**
    - Incluir preguntas sin campo `d` en el pool (vía `resolveEffectiveDifficulty` con pools mock) y verificar que se consideran nivel 1 en coincidencia exacta y reserva; `numRuns` >= 100

- [x] 3. Checkpoint - Verificar lógica pura
  - Ejecutar `npx vitest run src/data/services.difficulty.test.js`; asegurar que todas las pruebas pasan. Consultar al usuario si surgen dudas.

- [x] 4. Definir constantes de dominio y asignar dificultad a las preguntas existentes de TODOS los servicios
  - [x] 4.1 Añadir constante `CLF_DOMAINS` y asignar `d` a las preguntas existentes de todos los servicios
    - Añadir y exportar `CLF_DOMAINS` (`{conceptos, seguridad, tecnologia, facturacion}` con sus etiquetas en español) en `src/data/services.js`
    - Recorrer TODOS los servicios de `AWS_SERVICES` (~54) y asignar el campo `d` a cada pregunta ya presente en `QUESTIONS`; las preguntas existentes son mayormente introductorias, por lo que en su mayoría reciben `d: 1` (asignar `d: 2` solo si el enunciado ya es de caso de uso), conservando su formato de 4 opciones e índice correcto
    - No es obligatorio anotar `dom` en las preguntas de nivel 1; las preguntas sin `d` siguen tratándose como nivel 1 vía `q.d || 1` (compatibilidad)
    - Mantener todos los enunciados y opciones en español
    - _Requirements: 1.1, 1.3, 1.4, 7.5, 7.6_

- [x] 5. Ampliar el Banco_De_Preguntas por grupo de dominio de AWS_SERVICES (contenido en español, ~1150+ preguntas)
  > Cada sub-tarea cubre un grupo de dominio de `AWS_SERVICES` (definidos en `src/data/services.js`).
  > Para CADA servicio del grupo se debe alcanzar `>=8` preguntas de nivel 1, `>=10` de nivel 2 y `>=5`
  > de nivel 3. Nivel 1: definiciones/siglas (sin `dom` requerido, R7.6). Niveles 2 y 3: enunciado
  > orientado a escenario estilo CLF-C02, con campo `dom` válido de `CLF_DOMAINS`, exactamente 4
  > opciones e índice correcto `c` en `[0,3]`; todo en español. Trabajo puramente de datos en
  > `src/data/services.js` (R1.5: umbrales idénticos para todos los servicios).

  - [x] 5.1 Ampliar el grupo **Cómputo** (`ec2`, `lambda`, `beanstalk`, `ecs`, `eks`, `fargate`, `lightsail`)
    - Para cada uno de los 7 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Niveles 2 y 3 en estilo escenario CLF-C02 con `dom` válido; 4 opciones; todo en español
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.2 Ampliar el grupo **Almacenamiento** (`s3`, `ebs`, `efs`, `glacier`, `backup`)
    - Para cada uno de los 5 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.3 Ampliar el grupo **Bases de datos** (`rds`, `aurora`, `dynamodb`, `redshift`, `elasticache`)
    - Para cada uno de los 5 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.4 Ampliar el grupo **Redes** (`vpc`, `route53`, `cloudfront`, `elb`, `apigateway`)
    - Para cada uno de los 5 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.5 Ampliar el grupo **Seguridad** (`iam`, `cognito`, `kms`, `secretsmanager`, `waf`, `shield`, `guardduty`, `organizations`)
    - Para cada uno de los 8 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1; inclinar naturalmente `dom` hacia `seguridad` donde corresponda
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.6 Ampliar el grupo **Administración** (`cloudwatch`, `cloudtrail`, `config`, `cloudformation`, `systemsmanager`, `trustedadvisor`, `controltower`)
    - Para cada uno de los 7 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.7 Ampliar el grupo **Integración** (`sns`, `sqs`, `eventbridge`, `stepfunctions`)
    - Para cada uno de los 4 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.8 Ampliar el grupo **Analítica** (`athena`, `kinesis`, `quicksight`)
    - Para cada uno de los 3 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.9 Ampliar el grupo **IA/ML** (`sagemaker`, `rekognition`, `polly`)
    - Para cada uno de los 3 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.10 Ampliar el grupo **Herramientas de desarrollo** (`codecommit`, `codepipeline`)
    - Para cada uno de los 2 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.11 Ampliar el grupo **Migración** (`snow`, `dms`)
    - Para cada uno de los 2 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.12 Ampliar el grupo **Facturación** (`costexplorer`, `budgets`, `pricingcalculator`)
    - Para cada uno de los 3 servicios alcanzar `>=8` nivel 1, `>=10` nivel 2, `>=5` nivel 3
    - Mismas reglas de formato, escenario, `dom` y español que 5.1; asegurar que el dominio `facturacion` quede representado en niveles 2/3
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x]* 5.13 Escribir prueba por ejemplo: mínimos del banco para TODOS los servicios
    - En `src/data/services.bank.test.js`, importar `QUESTIONS` y `AWS_SERVICES`; recorrer TODOS los servicios de `AWS_SERVICES` afirmando `>=8` de nivel 1 (`(q.d || 1) === 1`), `>=10` de nivel 2 y `>=5` de nivel 3
    - _Requirements: 1.2, 1.5_

  - [x]* 5.14 Escribir prueba por ejemplo: formato y etiqueta de dominio en niveles 2 y 3
    - **Property 12: Etiqueta de dominio válida en niveles 2 y 3**
    - **Validates: Requirements 7.1, 7.2**
    - Test data-driven: para toda pregunta con `d >= 2` en TODOS los servicios, afirmar `dom` en `{conceptos, seguridad, tecnologia, facturacion}` y `o.length === 4` con `c` entero en `[0,3]` (formato R7.4)

  - [x]* 5.15 Escribir prueba por ejemplo: cobertura de los cuatro dominios CLF-C02
    - **Property 11: Cobertura de los cuatro dominios CLF-C02 en niveles 2 y 3**
    - **Validates: Requirements 7.7**
    - Reunir el conjunto de valores `dom` de todas las preguntas con `d >= 2` (todos los servicios) y afirmar que contiene los cuatro dominios canónicos

- [x] 6. Checkpoint - Verificar banco de preguntas
  - Ejecutar `npx vitest run src/data/`; asegurar que todas las pruebas pasan. Consultar al usuario si surgen dudas.

- [x] 7. Implementar el indicador visual de dificultad
  - [x] 7.1 Añadir `difficultyLabel` (data) y `updateDifficultyIndicator` (UI)
    - Añadir y exportar `difficultyLabel(difficulty)` en `src/data/services.js` (`1→'Fácil'`, `2→'Media'`, `3→'Difícil'`, default 'Fácil')
    - Añadir y exportar `updateDifficultyIndicator(difficulty)` en `src/ui/screens.js` con guardia `if(!el) return` y `try/catch` para degradación elegante; el nodo objetivo es `#bossDifficulty` (usa `difficultyLabel` y setea `data-level`)
    - _Requirements: 5.1, 5.3_

  - [x] 7.2 Añadir nodo DOM `#bossDifficulty` y regla CSS en `index.html`
    - Insertar `<div class="difficulty-tag" id="bossDifficulty" aria-live="polite"></div>` dentro del bloque del jefe en `#bossScreen` (junto a `#bossName`, en `.combatant-hp-boss`)
    - Añadir la regla `.difficulty-tag` y variantes por `data-level` en el `<style>` de `index.html`
    - _Requirements: 5.1_

  - [x]* 7.3 Escribir prueba de propiedad: etiqueta de dificultad correcta
    - **Property 9: Etiqueta de dificultad correcta**
    - **Validates: Requirements 5.1**
    - En `src/data/services.difficulty.test.js`, verificar mapeo exhaustivo de `{1,2,3}` a "Fácil"/"Media"/"Difícil"

- [x] 8. Integrar la dificultad en el flujo de combate
  - [x] 8.1 Cablear `startBossFight` con dificultad por combate en `src/combat/fight.js`
    - Importar `difficultyForBossLevel` desde `../data/services.js`
    - Calcular `const difficulty = difficultyForBossLevel(level)` y guardarlo en el objeto de combate devuelto (`difficulty`)
    - Seleccionar cada carta inicial con `pickQuestion(s.id, null, difficulty)`
    - Conservar `cardCount = Math.min(level, MAX_CARD_COUNT)`, la selección uniforme de servicios `shuffle(AWS_SERVICES).slice(0, cardCount)` (R1.6, sin pesos) y el resto de la forma del estado de combate (incluye `bossLabel`, `playerPipsMax`, `bossPipsMax`)
    - _Requirements: 4.1, 4.3, 6.2, 1.6_

  - [x] 8.2 Cablear el reciclado de carta en `answerCard` (`src/combat/fight.js`)
    - En el reciclado tras respuesta correcta, usar `pickQuestion(card.service.id, card.question.text, fight.difficulty)`
    - Conservar intacta la lógica de daño (acierto daña al jefe, fallo al jugador) y el resto del contrato de `answerCard`
    - _Requirements: 4.2, 4.3, 6.3_

  - [x] 8.3 Cablear el indicador de dificultad en `src/main.js`
    - Al iniciar un combate (`combat.startBossFight(lvl)`), llamar a `ui.updateDifficultyIndicator(fight.difficulty)` tras `ui.showBossScreen(...)`
    - Conservar el resto del arranque del combate (`renderPips`, animaciones, etc.)
    - _Requirements: 5.1, 5.2_

  - [x]* 8.4 Escribir prueba de propiedad: consistencia de dificultad dentro de un combate
    - **Property 8: Consistencia de dificultad dentro de un combate**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - En `src/combat/fight.difficulty.test.js`, verificar que `startBossFight(level).difficulty === difficultyForBossLevel(level)` y que tras reciclar cartas con `answerCard` (aciertos), el `fight.difficulty` permanece constante; que cada carta inicial y reciclada tenga `question.difficulty` coherente con la reserva del nivel; `numRuns` >= 100

  - [x]* 8.5 Escribir prueba de propiedad: selección uniforme de servicios
    - **Property 13: Selección uniforme de servicios sin pesos**
    - **Validates: Requirements 1.6**
    - En `src/combat/fight.difficulty.test.js`, importar `AWS_SERVICES` y `shuffle`; para `cardCount` generado en `[1, AWS_SERVICES.length]`, verificar que `shuffle(AWS_SERVICES).slice(0, cardCount)` devuelve exactamente `cardCount` servicios distintos, todos pertenecientes a `AWS_SERVICES`, sin duplicados ni ponderación (cada servicio elegible por igual); `numRuns` >= 100

- [x] 9. Pruebas de integración y no regresión (jsdom)
  - [x]* 9.1 Escribir prueba de integración del indicador visual
    - En `src/integration/difficulty.integration.test.js`, montar el markup de `#bossScreen`/`#bossDifficulty` (o cargar `index.html`) en jsdom, invocar `updateDifficultyIndicator` con dificultades derivadas de niveles 1, 2 y `>=3`, y verificar que `#bossDifficulty` muestra "Fácil"/"Media"/"Difícil" y cambia entre combates sucesivos
    - _Requirements: 5.1, 5.2_

  - [x]* 9.2 Escribir prueba de degradación elegante del indicador
    - Sin el nodo `#bossDifficulty` en el DOM, confirmar que `updateDifficultyIndicator` no lanza y el flujo continúa
    - _Requirements: 5.3_

  - [x]* 9.3 Escribir pruebas de humo de preservación del comportamiento
    - Verificar que `startBossFight` conserva `cardCount === Math.min(level, MAX_CARD_COUNT)`, que un acierto reduce `bossPips` y un fallo reduce `playerPips` (reutilizar patrones de `src/combat/fight.test.js`)
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 10. Checkpoint final - Ensure all tests pass
  - Ejecutar `npx vitest run`; asegurar que toda la suite pasa (incluidas las pruebas preexistentes). Consultar al usuario si surgen dudas.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas) y pueden omitirse para un MVP más rápido.
- Cada tarea referencia requisitos específicos para trazabilidad.
- Las pruebas de propiedad (`fast-check`) usan como mínimo 100 iteraciones y se etiquetan con `// Feature: dificultad-progresiva-preguntas, Property {n}: ...`.
- Las Propiedades 11 y 12 son invariantes sobre el dato concreto del banco; se validan con pruebas data-driven que recorren el banco real una sola vez sobre TODOS los servicios de `AWS_SERVICES`.
- La ampliación del banco (sección 5) es un esfuerzo de contenido muy grande (~1150+ preguntas: `>=23` por servicio × ~54 servicios). Se planifica por grupo de dominio para que cada tarea sea acotada y revisable de forma independiente; todos los servicios reciben el mismo trato (R1.5).
- Las cualidades redaccionales R7.3/R7.5/R7.6 (escenario, idioma, permisividad de nivel 1) se aseguran mediante revisión humana durante la autoría del contenido.
- Todo el contenido de cara al usuario permanece en español. La implementación se realiza en los ES modules de `src/`; el monolito `torre-de-las-nubes.html` no se toca.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "4.1"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12"] },
    { "id": 4, "tasks": ["5.13", "5.14", "5.15", "7.1", "7.2"] },
    { "id": 5, "tasks": ["7.3", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] },
    { "id": 7, "tasks": ["8.4", "8.5", "9.1", "9.2", "9.3"] }
  ]
}
```
