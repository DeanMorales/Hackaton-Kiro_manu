# Documento de Requisitos de Corrección de Bug

## Introduction

Al alcanzar la Fase_Estable de "Torre de las Nubes" (`endless-tower-difficulty-cap`), el Motor_Torre puede generar un Bloque en Movimiento visiblemente ancho como recompensa al jugador, mediante dos mecanismos ya existentes:

- **Plataforma_Respiro** (Requirement 2.2 de `endless-tower-difficulty-cap`): duplica el ancho normal del Bloque en Movimiento, acotado a 630px.
- **Bono_Racha_Perfecta** (Requirement 3.4 de `endless-tower-difficulty-cap`): incrementa permanentemente en 40px el ancho máximo del Bloque en Movimiento por cada 3 Duelos Perfectos consecutivos en la Fase_Estable.

El jugador reporta que, al soltar uno de estos bloques anchos, la plataforma aparece ancha en pantalla mientras se mueve, pero en el instante en que hace clic para soltarla, el piso resultante se ve angosto — aproximadamente del ancho del piso ANTERIOR, no del ancho del bloque que el jugador acaba de soltar.

La causa es que `computeNewFloor` en `src/engine/tower.js` calcula el ancho del piso resultante como la intersección geométrica (`overlap`) entre el Bloque en Movimiento y el piso anterior (`prevFloor`), en lugar de usar el ancho propio del Bloque en Movimiento. Esta regla de "solo sobrevive la parte que se solapa con el piso de abajo" es la física de aterrizaje original del juego (anterior a `endless-tower-difficulty-cap`) y es correcta para un Bloque en Movimiento normal, cuyo ancho máximo nunca excede el ancho del piso anterior. Pero Plataforma_Respiro y Bono_Racha_Perfecta rompen esa invariante a propósito: generan Bloques en Movimiento MÁS anchos que el piso anterior, precisamente para recompensar al jugador con un aterrizaje más fácil y más ancho. Cuando eso ocurre, la intersección queda acotada por el piso anterior (más angosto), y el "premio" desaparece en el momento de colocarse, sin que el jugador reciba ningún beneficio real por la Plataforma_Respiro o el Bono_Racha_Perfecta obtenidos.

El objetivo de esta corrección es que, cuando un Bloque en Movimiento premiado (más ancho que el piso anterior) aterriza con éxito (sin caer, según la regla de caída ya existente), el piso resultante conserve el ancho completo del Bloque en Movimiento, en lugar de recortarse a la intersección con el piso anterior. La lógica de detección de caída (`decidesFall`/`computeOverlap`) debe permanecer exactamente igual para todos los bloques, incluidos los premiados: esta corrección solo cambia cuánto ancho conserva el piso una vez que el aterrizaje ya fue confirmado como válido.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN el Bloque en Movimiento que el jugador suelta es más ancho que el piso anterior (`movingBlock.width > prevFloor.width`, producido por Plataforma_Respiro y/o Bono_Racha_Perfecta) AND el aterrizaje es válido (el solapamiento con el piso anterior es suficiente para no caer, `decidesFall(overlap) === false`) THEN el sistema calcula el ancho del piso resultante como la intersección (`overlap`) entre el Bloque en Movimiento y el piso anterior, produciendo un piso más angosto que el Bloque en Movimiento que el jugador realmente soltó.

1.2 WHEN ocurre el escenario del criterio 1.1 THEN el piso resultante puede llegar a tener un ancho tan angosto como el ancho del piso anterior, anulando visual y funcionalmente el efecto de la Plataforma_Respiro o del Bono_Racha_Perfecta que originó el ancho extra del Bloque en Movimiento.

### Expected Behavior (Correct)

2.1 WHEN el Bloque en Movimiento que el jugador suelta es más ancho que el piso anterior (`movingBlock.width > prevFloor.width`) AND el aterrizaje es válido (`decidesFall(overlap) === false`, evaluado exactamente igual que hoy) THEN el sistema SHALL fijar el ancho del piso resultante igual al ancho completo del Bloque en Movimiento (`movingBlock.width`), sin recortarlo a la intersección con el piso anterior.

2.2 WHEN ocurre el escenario del criterio 2.1 THEN el sistema SHALL posicionar el piso resultante en la misma coordenada X en la que se encontraba el Bloque en Movimiento en el momento de soltarse (`movingBlock.x`), de modo que el piso conserve exactamente la forma y posición que el jugador vio en pantalla al soltarlo.

2.3 THE Motor_Torre SHALL NOT modificar la lógica de detección de caída (`computeOverlap`, `decidesFall`) para ningún tipo de Bloque en Movimiento, incluidos los ensanchados por Plataforma_Respiro o Bono_Racha_Perfecta; un aterrizaje que hoy resultaría en caída (`overlap < 16`) SHALL CONTINUE TO resultar en caída exactamente igual tras esta corrección.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN el Bloque en Movimiento que el jugador suelta NO es más ancho que el piso anterior (`movingBlock.width <= prevFloor.width`, el caso normal fuera de Plataforma_Respiro/Bono_Racha_Perfecta) THEN el sistema SHALL CONTINUE TO calcular el ancho del piso resultante como la intersección (`overlap`) entre el Bloque en Movimiento y el piso anterior, exactamente igual que hoy.

3.2 WHEN el solapamiento entre el Bloque en Movimiento y el piso anterior es insuficiente (`decidesFall(overlap) === true`) THEN el sistema SHALL CONTINUE TO tratarlo como una caída del jugador, independientemente de si el Bloque en Movimiento era más ancho o no que el piso anterior; esta corrección no cambia ningún caso de caída, solo el ancho asignado a un piso cuyo aterrizaje ya era válido.

3.3 THE Motor_Torre SHALL CONTINUE TO acotar el ancho de cualquier Bloque en Movimiento (incluidos los premiados por Plataforma_Respiro/Bono_Racha_Perfecta) a un máximo de `BASE_PLATFORM_WIDTH` (630px) en `newMovingBlock`, sin cambios respecto al comportamiento actual; esta corrección no altera cómo se genera el ancho del Bloque en Movimiento, solo cómo se traduce ese ancho al piso una vez colocado.

3.4 WHEN se genera una Puerta (piso especial cada `DOOR_INTERVAL` pisos) THEN el sistema SHALL CONTINUE TO marcarla como tal (`isDoor`) de la misma forma que hoy, independientemente de si el piso resultante conserva el ancho completo del Bloque en Movimiento o el de la intersección.

3.5 WHEN se calcula la posición Y del piso resultante (`bottom`, `top`, `height`) THEN el sistema SHALL CONTINUE TO derivarla de `prevFloor.top` y `movingBlock.height` exactamente igual que hoy; esta corrección solo afecta al ancho (`width`) y a la coordenada X (`x`) del piso resultante en el caso descrito en el criterio 2.1.
