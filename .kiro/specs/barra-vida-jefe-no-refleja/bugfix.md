# Documento de Requisitos de Corrección de Bug

## Introduction

Durante el combate contra el guardián, el jugador reporta dos síntomas relacionados:

1. **La vida del jefe no se refleja al acertar**: al responder correctamente una pregunta, la barra de vida del jefe (`#bossHpBar`) no muestra de forma perceptible el punto de vida que se le quita.
2. **El jefe muere con menos intentos de los esperados**: el guardián se derrota con menos aciertos que el número de cartas del combate.

Ambos síntomas comparten una misma raíz. La vida inicial del jefe se calcula como `ceil(cardCount / 2)` (aproximadamente la mitad de las cartas) en lugar de un punto de vida por carta. Esto hace que:

- El jefe requiera menos aciertos de los esperados (síntoma 2).
- La barra tenga muy pocas casillas; en niveles bajos (cartas 1 o 2) la vida del jefe es de una sola casilla, por lo que un único acierto lleva la barra directamente a la victoria sin que el jugador perciba ningún decremento (síntoma 1).

Adicionalmente, en el acierto que derrota al jefe, el banner de victoria aparece en el mismo instante en que la barra debería vaciarse, de modo que el último decremento no se percibe antes del anuncio de victoria.

El objetivo de esta corrección es que el jefe requiera un acierto por carta y que cada acierto (incluido el que lo derrota) se refleje visiblemente en su barra de vida antes de anunciar la victoria, sin alterar el resto de la mecánica de combate.

## Bug Analysis

### Current Behavior (Defect)

Lo que ocurre actualmente cuando se dispara el bug:

1.1 WHEN comienza un combate de nivel L (número de cartas = mínimo entre L y 7) THEN el sistema fija la vida del jefe en `ceil(cardCount / 2)`, de modo que el jefe se derrota con menos aciertos que el número de cartas.

1.2 WHEN el número de cartas es 1 o 2 (niveles bajos) THEN la barra del jefe muestra una sola casilla y un único acierto la lleva directamente a la victoria, por lo que el jugador no percibe ningún decremento en la vida del jefe.

1.3 WHEN el jugador acierta la pregunta que reduce la vida del jefe a 0 THEN el sistema muestra el banner "¡Guardián derrotado!" en el mismo instante en que la barra debería vaciarse, por lo que el último decremento no se percibe antes del anuncio de victoria.

### Expected Behavior (Correct)

Lo que debería ocurrir en su lugar:

2.1 WHEN comienza un combate de nivel L THEN el sistema SHALL fijar la vida del jefe igual al número de cartas (mínimo entre L y 7), requiriendo un acierto por carta para derrotarlo.

2.2 WHEN comienza el combate THEN la barra de vida del jefe SHALL mostrar tantas casillas llenas como cartas tenga el combate.

2.3 WHEN el jugador acierta una pregunta y el combate continúa THEN el sistema SHALL reducir la vida del jefe en 1 y reflejar ese decremento en la barra del jefe de forma inmediata y perceptible.

2.4 WHEN el jugador acierta la pregunta que reduce la vida del jefe a 0 THEN el sistema SHALL reflejar visiblemente el último decremento en la barra del jefe y, tras una breve pausa, mostrar el banner de victoria.

### Unchanged Behavior (Regression Prevention)

Comportamiento existente que debe preservarse:

3.1 WHEN el jugador falla una pregunta THEN el sistema SHALL CONTINUE TO bloquear esa carta de forma permanente y reducir la vida del jugador en 1.

3.2 WHEN la vida del jugador llega a 0 THEN el sistema SHALL CONTINUE TO resolver el combate como derrota y mostrar el banner "¡Has caído ante el guardián!".

3.3 WHEN el jugador acierta sin resolver el combate THEN el sistema SHALL CONTINUE TO no bloquear la carta y refrescar su pregunta para poder volver a responderla.

3.4 WHEN se inicia el combate THEN el sistema SHALL CONTINUE TO ofrecer al jugador la misma tolerancia de fallos (vida del jugador) que antes de esta corrección; el cambio en la vida del jefe no debe reducir los fallos tolerados por el jugador.

3.5 WHEN se dibuja cualquier barra de vida THEN el sistema SHALL CONTINUE TO representar las casillas restantes como llenas y las consumidas como perdidas, con el mismo estilo visual actual.

3.6 WHEN el jugador está fuera del combate (fase de construcción, caída o game over) THEN el sistema SHALL CONTINUE TO comportarse igual; esta corrección solo afecta a la vida del jefe y a su reflejo visual durante el combate.
