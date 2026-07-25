# Requirements Document

## Introduction

Esta funcionalidad modifica la mecánica del duelo por turnos contra los guardianes de AWS en el juego "Torre de las Nubes — Duelo AWS". Se introducen dos cambios principales:

1. **Un único intento por carta**: cada carta del combate se puede responder una sola vez. Tras responderla, la carta queda bloqueada de forma definitiva y no puede volver a intentarse. Esto elimina la mecánica actual en la que una carta fallada recibe una nueva pregunta y vuelve a estar disponible.

2. **Escalado del número de cartas**: el número de cartas presentadas en cada combate aumenta a medida que el jugador supera combates y sube de nivel, hasta un máximo de 7 cartas.

Debido a que la mecánica actual asigna al jugador y al jefe un número de puntos de vida igual al número de cartas (esperando reintentos ilimitados), limitar cada carta a un único intento obliga a redefinir cómo se resuelve el combate para que siga siendo ganable. Por ello, este documento también especifica las reglas de resolución del combate bajo la nueva mecánica.

Todo el texto de cara al usuario se mantiene en español, en línea con las convenciones del producto.

## Glossary

- **Combat_System**: Módulo de lógica de combate (`src/combat/fight.js`) responsable de inicializar el estado del duelo, procesar respuestas y determinar el resultado. No accede al DOM.
- **Card**: Tarjeta de combate asociada a un servicio de AWS y a una pregunta de opción múltiple. Estado relevante: `locked` (respondida/bloqueada) y `question`.
- **Card_Count**: Número de cartas presentadas en un combate concreto.
- **Level**: Nivel del combate actual, equivalente al número de combate (primer combate = nivel 1, segundo = nivel 2, etc.). Corresponde al parámetro `level` que recibe `startBossFight`.
- **Player_Pips**: Contador de vida del jugador. Cada respuesta incorrecta lo reduce en 1. Representa el número de respuestas incorrectas que el jugador puede acumular antes de perder.
- **Boss_Pips**: Contador de vida del jefe. Cada respuesta correcta lo reduce en 1. Representa el número de respuestas correctas necesarias para derrotar al jefe.
- **Boss_Defeat_Threshold**: Valor inicial de Boss_Pips; número de respuestas correctas necesarias para ganar el combate.
- **Player_Defeat_Threshold**: Valor inicial de Player_Pips; número de respuestas incorrectas que provocan la derrota del jugador.
- **Max_Card_Count**: Límite superior del número de cartas en cualquier combate. Su valor es 7.
- **Combat_Outcome**: Resultado de un combate, con valores posibles `win` (jefe derrotado), `lose` (jugador derrotado) o `null` (combate aún en curso).

## Requirements

### Requirement 1: Un único intento por carta

**User Story:** Como jugador, quiero que cada carta del combate se pueda responder una sola vez, para que cada carta represente un intento definitivo y las decisiones tengan peso.

#### Acceptance Criteria

1. WHEN el jugador responde una Card cuyo estado `locked` es `false` y el combate no está resuelto (`resolved = false`), THE Combat_System SHALL marcar esa Card como bloqueada estableciendo `locked = true` antes de evaluar la respuesta.
2. IF el jugador intenta responder una Card cuyo estado `locked` ya es `true`, THEN THE Combat_System SHALL ignorar la acción y mantener sin cambios los valores de `playerPips`, `bossPips`, `resolved` y el estado `locked` de todas las Cards del combate.
3. IF el jugador intenta responder cualquier Card mientras el combate está resuelto (`resolved = true`), THEN THE Combat_System SHALL ignorar la acción y mantener sin cambios los valores de `playerPips`, `bossPips`, `resolved` y el estado `locked` de todas las Cards del combate.
4. WHEN una Card ha sido respondida (transición de `locked = false` a `locked = true`), THE Combat_System SHALL conservar el mismo objeto `question` de esa Card sin sustituirlo por uno nuevo durante el resto del combate.
5. WHEN una Card ha sido respondida (transición de `locked = false` a `locked = true`), THE Combat_System SHALL mantener el estado `locked = true` de esa Card desde ese instante y durante todo el combate en curso, hasta que finalice el combate actual.

### Requirement 2: Aplicación de daño según la respuesta

**User Story:** Como jugador, quiero que acertar dañe al jefe y fallar me dañe a mí, para que el resultado del combate dependa de mis respuestas.

#### Acceptance Criteria

1. WHEN el jugador responde correctamente una Card no bloqueada y el Combat_Outcome es aún `null`, THE Combat_System SHALL reducir Boss_Pips en exactamente 1, sin permitir valores por debajo de 0.
2. WHEN el jugador responde incorrectamente una Card no bloqueada y el Combat_Outcome es aún `null`, THE Combat_System SHALL reducir Player_Pips en exactamente 1, sin permitir valores por debajo de 0.
3. WHEN el jugador responde una Card no bloqueada, THE Combat_System SHALL informar si la respuesta fue correcta y cuál es el Combat_Outcome resultante.
4. WHEN Boss_Pips llega a 0 tras una respuesta correcta, THE Combat_System SHALL fijar el Combat_Outcome en `win`.
5. WHEN Player_Pips llega a 0 tras una respuesta incorrecta y Boss_Pips es mayor que 0, THE Combat_System SHALL fijar el Combat_Outcome en `lose`.
6. IF el jugador intenta responder una Card ya bloqueada o el Combat_Outcome no es `null`, THEN THE Combat_System SHALL rechazar la acción sin modificar Boss_Pips ni Player_Pips.

### Requirement 3: Resolución del combate bajo un único intento por carta

**User Story:** Como jugador, quiero que el combate siempre pueda resolverse y siga siendo ganable aunque cada carta tenga un solo intento, para que la partida no quede bloqueada ni sea imposible de superar.

#### Acceptance Criteria

1. WHEN Boss_Pips llega a 0 y el combate no está aún resuelto, THE Combat_System SHALL marcar el combate como resuelto con Combat_Outcome `win` y mantener ese Combat_Outcome sin cambios durante el resto del combate.
2. WHEN Player_Pips llega a 0, Boss_Pips es mayor que 0 y el combate no está aún resuelto, THE Combat_System SHALL marcar el combate como resuelto con Combat_Outcome `lose` y mantener ese Combat_Outcome sin cambios durante el resto del combate.
3. WHILE el combate está resuelto, THE Combat_System SHALL ignorar cualquier respuesta adicional a las cartas sin modificar Boss_Pips, Player_Pips ni el Combat_Outcome ya asignado.
4. WHEN se inicia un combate, THE Combat_System SHALL usar un Card_Count con un valor entero mayor o igual a 1.
5. WHEN se inicia un combate, THE Combat_System SHALL asignar Boss_Defeat_Threshold y Player_Defeat_Threshold de forma que su suma no supere Card_Count más 1, garantizando que el combate se resuelva a más tardar al responder la última Card.
6. WHEN se inicia un combate, THE Combat_System SHALL asignar Boss_Defeat_Threshold con un valor mayor o igual a 1 y menor o igual a Card_Count.
7. WHEN se inicia un combate, THE Combat_System SHALL asignar Player_Defeat_Threshold con un valor mayor o igual a 1.
8. WHEN se inicia un combate con Card_Count cartas, THE Combat_System SHALL establecer Boss_Defeat_Threshold igual a la mitad de Card_Count redondeada hacia arriba.
9. WHEN se inicia un combate con Card_Count cartas, THE Combat_System SHALL establecer Player_Defeat_Threshold igual a Card_Count menos Boss_Defeat_Threshold más 1.

### Requirement 4: Escalado del número de cartas por nivel

**User Story:** Como jugador, quiero enfrentar más cartas a medida que avanzo en los combates, para que la dificultad crezca de forma progresiva.

#### Acceptance Criteria

1. WHEN se inicia un combate en un Level (número entero mayor o igual a 1), THE Combat_System SHALL calcular Card_Count aumentándolo en exactamente 1 por cada incremento de 1 en Level mientras Card_Count no haya alcanzado Max_Card_Count (7), de modo que Card_Count nunca decrezca al aumentar Level.
2. WHEN se inicia un combate en cualquier Level, THE Combat_System SHALL limitar Card_Count a un valor máximo igual a Max_Card_Count (7), sin permitir valores superiores a 7.
3. WHEN se inicia un combate en el Level 1, THE Combat_System SHALL asignar un Card_Count igual a 1.
4. WHEN se inicia un combate en un Level mayor o igual a Max_Card_Count (7), THE Combat_System SHALL asignar exactamente Max_Card_Count (7) cartas.
5. WHEN se inicia un combate con Card_Count cartas, THE Combat_System SHALL crear exactamente Card_Count cartas, cada una asociada a un servicio de AWS con identidad distinta, sin repetir el mismo servicio entre las cartas del combate.
6. WHEN se inicia un combate, THE Combat_System SHALL inicializar Boss_Pips con el valor de Boss_Defeat_Threshold y Player_Pips con el valor de Player_Defeat_Threshold.

### Requirement 5: Consistencia con la interfaz de combate existente

**User Story:** Como jugador, quiero que las barras de vida y las cartas mostradas reflejen con exactitud el estado del combate, para entender cuántos aciertos y fallos me quedan.

#### Acceptance Criteria

1. WHEN se inicia un combate, THE Combat_System SHALL incluir en el estado del combate devuelto los campos Card_Count, Player_Pips, Boss_Pips, la lista de cartas y la etiqueta del jefe (`bossLabel`), y la lista de cartas SHALL contener exactamente Card_Count elementos.
2. WHEN se inicia un combate en un Level mayor o igual a 1, THE Combat_System SHALL componer `bossLabel` concatenando el nombre no vacío del guardián correspondiente al Level con el texto literal ` — Nivel {Level}`, donde {Level} es el valor numérico del Level.
3. WHEN se inicia un combate, THE Combat_System SHALL exponer Player_Pips con un valor igual a Player_Defeat_Threshold y Boss_Pips con un valor igual a Boss_Defeat_Threshold.
