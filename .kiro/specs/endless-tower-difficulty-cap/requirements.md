# Requirements Document

## Introduction

Esta especificación detalla los requisitos para corregir el "cliff" de dificultad en Torre de las Nubes: actualmente la Velocidad_Actual del Bloque en Movimiento crece de forma compuesta y sin límite cada vez que el jugador gana un Duelo (ver `tower-progression-scaling`), lo que hace que alrededor del piso 25-30 la partida se vuelva prácticamente imposible de continuar. Esta especificación introduce (1) un Tope_Velocidad que estabiliza la Velocidad_Actual a partir de un punto determinado de la partida, y (2) dos mecanismos de recompensa posteriores al tope: Plataformas_Respiro ocasionales y un incremento de ancho por Racha_Perfecta de 3 Duelos Ganados consecutivos sin fallos. El objetivo de diseño es que el reto deje de ser únicamente "¿puedo reaccionar más rápido?" y pase a ser también "¿puedo mantener la concentración y la precisión durante una partida efectivamente infinita?". El estado actual del código vive en `src/engine/tower.js` (Motor_Torre) y `src/combat/fight.js` (seguimiento de aciertos/fallos por Duelo); el spec debe ser compatible con ambos y no debe alterar el comportamiento previo a que se alcance el Tope_Velocidad.

## Glossary

- **Torre**: La estructura de pisos (`floors`) apilados que el jugador construye durante la partida.
- **Bloque en Movimiento**: La plataforma que se desplaza horizontalmente sobre la Torre y que el jugador debe soltar (`state.moving` / `newMovingBlock`).
- **Velocidad_Actual**: El valor `speed`/`moveSpeed` del Bloque en Movimiento vigente en un momento dado de la partida (`state.moveSpeed`).
- **Velocidad_Base**: El valor inicial de Velocidad_Actual al comenzar una partida (`BASE_SPEED`, 1.6).
- **Factor_Incremento**: El multiplicador de 1.30 aplicado a la Velocidad_Actual cada vez que ocurre un Duelo Ganado (`SPEED_INCREMENT_FACTOR`, ya definido en `tower-progression-scaling`).
- **Puerta**: Piso especial que aparece cada `DOOR_INTERVAL` (5) pisos y desencadena un Duelo.
- **Duelo**: El combate de preguntas contra un guardián de AWS que se activa al alcanzar una Puerta (`startBossFight`).
- **Duelo Ganado**: El resultado de un Duelo en el que `bossPips` llega a 0 antes que `playerPips` (`outcome === 'win'` en `answerCard`).
- **Duelo Perfecto**: Un Duelo Ganado durante el cual el jugador respondió correctamente TODAS las cartas presentadas, sin ningún fallo (ninguna carta quedó marcada como `locked` por una respuesta incorrecta antes de resolverse el Duelo).
- **Conteo_Duelos_Ganados**: El número total de Duelos Ganados acumulados por el jugador durante la partida en curso (ya usado en `tower-progression-scaling` para el color del Bloque en Movimiento).
- **Tope_Velocidad**: El valor de Velocidad_Actual alcanzado tras el 5º Duelo Ganado de la partida (es decir, `Velocidad_Base * Factor_Incremento^5`), a partir del cual la Velocidad_Actual deja de incrementarse. El 5º Duelo Ganado corresponde a la Puerta del piso 25, por lo que el Tope_Velocidad rige desde que el jugador reanuda la construcción en el piso 26.
- **Fase_Estable**: El período de la partida que comienza inmediatamente después de que se alcanza el Tope_Velocidad (es decir, desde el 6º Duelo Ganado en adelante, y desde que se reanuda la construcción en el piso 26) y continúa hasta el fin de la partida.
- **Racha_Perfecta**: El conteo de Duelos Perfectos consecutivos ganados por el jugador sin interrupción por un Duelo no-perfecto (un Duelo Ganado con al menos un fallo) ni por una derrota/caída. Se reinicia a 0 en cuanto el jugador gana un Duelo con al menos un fallo, pierde un Duelo, o cae de la Torre.
- **Plataforma_Respiro**: Un piso construido durante la Fase_Estable cuyo ancho es mayor al ancho que tendría normalmente el Bloque en Movimiento en ese momento, otorgado de forma periódica como respiro.
- **Bono_Racha_Perfecta**: Un incremento permanente (durante el resto de la partida en curso) del ancho máximo del Bloque en Movimiento, otorgado la primera vez que la Racha_Perfecta alcanza exactamente 3 dentro de la Fase_Estable, y cada vez que vuelve a alcanzar un múltiplo de 3 tras haberse reiniciado.
- **Motor_Torre**: El módulo responsable del estado y la física de la Torre (`src/engine/tower.js`).
- **Módulo_Combate**: El módulo responsable del estado y la lógica de los Duelos (`src/combat/fight.js`).

## Requirements

### Requirement 1: Tope de Velocidad a partir del 5º Duelo Ganado

**User Story:** Como jugador, quiero que la velocidad del bloque en movimiento deje de aumentar después de cierto punto de la partida, para poder seguir construyendo indefinidamente sin que la dificultad se vuelva imposible de superar.

#### Acceptance Criteria

1. WHEN el jugador logra su 5º Duelo Ganado de la partida, THE Motor_Torre SHALL calcular la Velocidad_Actual resultante como `Velocidad_Base * Factor_Incremento^5` y SHALL fijar ese valor como el Tope_Velocidad de la partida en curso.
2. WHEN el jugador logra el 6º Duelo Ganado de la partida o cualquier Duelo Ganado posterior, THE Motor_Torre SHALL NOT multiplicar la Velocidad_Actual por el Factor_Incremento, y SHALL mantener la Velocidad_Actual exactamente igual al Tope_Velocidad calculado en el criterio 1.
3. WHILE la partida se encuentra en la Fase_Estable, THE Motor_Torre SHALL generar todo nuevo Bloque en Movimiento con una velocidad igual al Tope_Velocidad, sin variación, independientemente de cuántos pisos adicionales se construyan o cuántos Duelos adicionales se gane.
4. THE Motor_Torre SHALL aplicar el comportamiento de incremento compuesto de Velocidad_Actual descrito en `tower-progression-scaling` (Requirements 2 y 3 de esa especificación) sin modificación alguna para el 1º al 5º Duelo Ganado de la partida.
5. WHEN el jugador reinicia la partida tras un Game Over o una victoria, THE Motor_Torre SHALL restablecer la Velocidad_Actual a la Velocidad_Base y SHALL restablecer el Conteo_Duelos_Ganados a 0, de modo que el Tope_Velocidad deba alcanzarse de nuevo tras 5 nuevos Duelos Ganados en la nueva partida.
6. THE Motor_Torre SHALL determinar si la partida se encuentra en la Fase_Estable exclusivamente a partir del Conteo_Duelos_Ganados (mayor o igual a 5), y NOT a partir del número de pisos construidos, del tiempo transcurrido, ni de ningún otro indicador.

---

### Requirement 2: Plataformas de Respiro Periódicas en la Fase_Estable

**User Story:** Como jugador, quiero recibir ocasionalmente una plataforma más ancha de lo normal una vez que la velocidad se ha estabilizado, para tener momentos de alivio que hagan la partida infinita más disfrutable y menos monótona.

#### Acceptance Criteria

1. WHILE la partida se encuentra en la Fase_Estable, THE Motor_Torre SHALL otorgar una Plataforma_Respiro exactamente una vez cada 5 pisos construidos dentro de la Fase_Estable (es decir, en el 5º, 10º, 15º, ... piso construido contando desde el inicio de la Fase_Estable), independientemente de si ese piso coincide o no con una Puerta.
2. WHEN corresponde otorgar una Plataforma_Respiro según el criterio 1, THE Motor_Torre SHALL generar el Bloque en Movimiento de ese piso con un ancho igual al doble del ancho que le correspondería normalmente en ese momento de la partida, acotado como máximo al ancho de la Plataforma Base (630px).
3. THE Motor_Torre SHALL NOT otorgar una Plataforma_Respiro fuera de la Fase_Estable, ni en ningún piso previo al 5º piso construido dentro de la Fase_Estable.
4. THE Motor_Torre SHALL determinar la elegibilidad de un piso para ser Plataforma_Respiro de forma determinística a partir del número de pisos construidos desde el inicio de la Fase_Estable, exigiendo que la partida se encuentre actualmente en la Fase_Estable y que dicho conteo haya alcanzado como mínimo 5 pisos, sin depender de aleatoriedad.
5. WHEN el jugador reinicia la partida, THE Motor_Torre SHALL reiniciar el conteo de pisos construidos dentro de la Fase_Estable a 0, de modo que la próxima Plataforma_Respiro de la nueva partida (si se alcanza la Fase_Estable) se otorgue igualmente en el 5º piso construido dentro de esa nueva Fase_Estable.

---

### Requirement 3: Bono de Ancho por Racha Perfecta de 3 Duelos Ganados

**User Story:** Como jugador, quiero recibir una recompensa permanente si gano 3 duelos consecutivos sin fallar ninguna pregunta, para sentirme incentivado a jugar con precisión además de rapidez durante la partida infinita.

#### Acceptance Criteria

1. WHEN el jugador logra un Duelo Ganado en el que respondió correctamente todas las cartas presentadas sin ningún fallo (un Duelo Perfecto), THE Módulo_Combate SHALL incrementar la Racha_Perfecta en 1.
2. WHEN el jugador logra un Duelo Ganado en el que falló al menos una carta antes de ganar, THE Módulo_Combate SHALL restablecer la Racha_Perfecta a 0.
3. WHEN el jugador pierde un Duelo o cae de la Torre, THE Módulo_Combate SHALL restablecer la Racha_Perfecta a 0.
4. WHILE la partida se encuentra en la Fase_Estable, WHEN la Racha_Perfecta alcanza un valor que es múltiplo de 3 (3, 6, 9, ...) inmediatamente después de un Duelo Perfecto, THE Motor_Torre SHALL otorgar un Bono_Racha_Perfecta que incrementa permanentemente, por el resto de la partida en curso, el ancho máximo del Bloque en Movimiento en 40px adicionales respecto al ancho máximo vigente inmediatamente antes de ese Duelo Perfecto.
5. THE Motor_Torre SHALL NOT otorgar ningún Bono_Racha_Perfecta como resultado de Duelos Perfectos logrados antes de que la partida alcance la Fase_Estable, aunque dichos Duelos Perfectos SHALL seguir incrementando la Racha_Perfecta según el criterio 1.
6. THE Motor_Torre SHALL aplicar cada Bono_Racha_Perfecta de forma acumulativa: si la Racha_Perfecta alcanza 6 dentro de la Fase_Estable, el ancho máximo del Bloque en Movimiento SHALL reflejar la suma de los incrementos otorgados al alcanzar tanto 3 como 6.
7. WHEN la Racha_Perfecta se restablece a 0 según los criterios 2 o 3 de este Requirement, THE Motor_Torre SHALL NOT revertir ningún Bono_Racha_Perfecta ya otorgado durante la partida en curso; los incrementos de ancho ya concedidos permanecen vigentes.
8. WHEN el jugador reinicia la partida, THE Motor_Torre SHALL restablecer a 0 tanto la Racha_Perfecta como la totalidad de los Bono_Racha_Perfecta acumulados, de modo que el ancho máximo del Bloque en Movimiento vuelva a su valor base sin ningún incremento por racha.

---

### Requirement 4: Coexistencia de los Mecanismos de Recompensa Post-Tope

**User Story:** Como jugador, quiero que las plataformas de respiro y el bono por racha perfecta puedan ocurrir ambos durante la misma partida, para que la recompensa por buen desempeño se sienta rica y no limitada a un solo camino de juego.

#### Acceptance Criteria

1. THE Motor_Torre SHALL tratar las Plataformas_Respiro (Requirement 2) y el Bono_Racha_Perfecta (Requirement 3) como mecanismos independientes entre sí, cada uno activable durante la Fase_Estable sin que la ocurrencia de uno impida, retrase, o modifique la ocurrencia del otro.
2. IF un piso construido dentro de la Fase_Estable es simultáneamente elegible como Plataforma_Respiro (Requirement 2, criterio 1) y el ancho máximo del Bloque en Movimiento en ese momento ya refleja uno o más Bono_Racha_Perfecta acumulados (Requirement 3), THEN THE Motor_Torre SHALL calcular el ancho de ese Bloque en Movimiento aplicando el duplicado de Requirement 2, criterio 2 sobre el ancho máximo YA incrementado por los Bono_Racha_Perfecta vigentes, acotado igualmente al ancho de la Plataforma Base (630px).
3. THE Motor_Torre SHALL calcular la Velocidad_Actual (Requirement 1) de forma completamente independiente del ancho máximo del Bloque en Movimiento (Requirements 2 y 3); ninguna Plataforma_Respiro ni Bono_Racha_Perfecta SHALL alterar la Velocidad_Actual, y el Tope_Velocidad SHALL alterar exclusivamente la velocidad, no el ancho.
