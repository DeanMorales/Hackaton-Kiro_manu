# Requirements Document

## Introduction

Esta especificación detalla los requisitos para introducir progresión y escalado en "Torre de las Nubes": (1) un tamaño inicial de plataforma base ampliado únicamente en la fase de arranque, (2) un incremento compuesto y continuo de la velocidad del bloque en movimiento tras cada duelo ganado, y (3) un cambio de color progresivo de los bloques en movimiento, desde un gris neutro inicial hacia la paleta de colores de las certificaciones de AWS a medida que el jugador avanza. El estado actual del código vive tanto en el monolito `torre-de-las-nubes.html` como en la migración modular en `src/engine/tower.js` y `src/render/draw.js`; el spec debe ser compatible con ambos.

## Glossary

- **Torre**: La estructura de pisos (`floors`) apilados que el jugador construye durante la partida.
- **Plataforma Base**: El primer piso de la Torre (`floors[0]` / `baseFloor`), presente desde el inicio de la partida.
- **Ancho_Base_Inicial**: La constante `BASE_WIDTH` (210px) usada actualmente como ancho de referencia de la Plataforma Base.
- **Fase de Arranque**: El período que transcurre desde que se inicializa una nueva partida (`resetGame` / `createTowerState`) hasta que la Plataforma Base queda establecida, antes de que el jugador suelte el primer Bloque en Movimiento. No incluye ningún momento posterior de la partida.
- **Bloque en Movimiento**: La plataforma que se desplaza horizontalmente sobre la Torre y que el jugador debe soltar (`state.moving` / `newMovingBlock`).
- **Velocidad_Actual**: El valor `speed` del Bloque en Movimiento vigente en un momento dado de la partida.
- **Velocidad_Base**: El valor de `speed` calculado por la fórmula original del motor, antes de aplicar cualquier incremento por puerta (equivalente al valor devuelto hoy por `newMovingBlock` sin el factor de progresión).
- **Puerta**: Piso especial que aparece cada `DOOR_INTERVAL` (5) pisos y desencadena un Duelo.
- **Duelo**: El combate de preguntas contra un guardián de AWS que se activa al alcanzar una Puerta (`startBossFight`).
- **Duelo Ganado**: El resultado de un Duelo en el que `bossPips` llega a 0 antes que `playerPips` (`outcome === 'win'` en `answerCard`).
- **Factor_Incremento**: El multiplicador de 1.30 (30% adicional) aplicado a la Velocidad_Actual cada vez que ocurre un Duelo Ganado.
- **Motor_Torre**: El módulo responsable del estado y la física de la Torre (`src/engine/tower.js`, y su equivalente inline en el monolito).
- **Nivel_Progreso**: Un indicador numérico del avance del jugador en la Torre (por ejemplo, el número de Puertas superadas o el número de pisos construidos), usado para determinar el color del Bloque en Movimiento.
- **Paleta_Gris_Neutro**: El color inicial del Bloque en Movimiento antes de superar ninguna Puerta.
- **Paleta_Certificaciones_AWS**: El conjunto ordenado de colores inspirados en los badges de certificación de AWS (verde, azul, naranja/dorado, púrpura) usados como destino del gradiente de color progresivo.

## Requirements

### Requirement 1: Tamaño Inicial de la Plataforma Base

**User Story:** Como jugador, quiero que la plataforma inicial de la torre sea más grande que el tamaño de referencia original, para que el arranque de la partida sea más accesible y visualmente coherente con la progresión del juego.

#### Acceptance Criteria

1. WHEN se inicializa una nueva partida, THE Motor_Torre SHALL establecer el ancho de la Plataforma Base en 630px, resultado de multiplicar `Ancho_Base_Inicial` (210px) por 3.
2. THE Motor_Torre SHALL calcular el ancho de la Plataforma Base únicamente durante la Fase de Arranque, antes de que el jugador suelte el primer Bloque en Movimiento.
3. WHILE la partida está en curso después de la Fase de Arranque, THE Motor_Torre SHALL mantener el ancho de la Plataforma Base en 630px sin modificarlo, independientemente de cuántos pisos se construyan, cuántos Duelos se gane, o si ocurre un redimensionamiento de la ventana/canvas (`resize()`).
4. WHEN el jugador reinicia la partida, THE Motor_Torre SHALL volver a calcular el ancho de la Plataforma Base en 630px aplicando el mismo factor de 3 sobre `Ancho_Base_Inicial`, de forma idéntica a la inicialización original.
5. THE ancho de la Plataforma Base resultante SHALL ser independiente del ancho de cualquier Bloque en Movimiento u otro piso construido durante la partida, y SHALL permanecer fijo en 630px incluso si dicho valor excede el ancho visible del canvas.

---

### Requirement 2: Incremento Compuesto de Velocidad al Vencer un Duelo

**User Story:** Como jugador, quiero que la plataforma en movimiento se vuelva más rápida cada vez que gano un duelo contra un guardián, para que la dificultad escale de forma perceptible con mi progreso.

#### Acceptance Criteria

1. WHEN el jugador logra un Duelo Ganado, THE Motor_Torre SHALL actualizar el valor almacenado de Velocidad_Actual multiplicándolo por 1.30, sin modificar la velocidad de ningún Bloque en Movimiento que ya esté en pantalla en ese momento (dado que la fase de construcción está pausada durante el Duelo).
2. THE Motor_Torre SHALL calcular el incremento del 30% tomando como referencia la Velocidad_Actual vigente inmediatamente antes del Duelo Ganado, no la Velocidad_Base original de la partida.
3. IF el jugador pierde un Duelo o cae de la Torre, THEN THE Motor_Torre SHALL no modificar la Velocidad_Actual como consecuencia de ese resultado.
4. WHEN el jugador reanuda la fase de construcción tras un Duelo Ganado, THE Motor_Torre SHALL generar el primer Bloque en Movimiento posterior con una velocidad igual a la Velocidad_Actual ya incrementada según el criterio 1, y SHALL usar esa misma Velocidad_Actual como referencia para todos los Bloques en Movimiento subsiguientes hasta el próximo Duelo Ganado.
5. THE Motor_Torre SHALL calcular la Velocidad_Actual resultante tras N Duelos Ganados consecutivos, para cualquier valor entero de N mayor o igual a 1, como el producto de la Velocidad_Actual previa a la secuencia por 1.30 elevado a la potencia N, admitiendo una tolerancia máxima de diferencia de 0.001 unidades de velocidad respecto al valor exacto calculado al momento de la verificación (propiedad de incremento compuesto).

---

### Requirement 3: Continuidad del Incremento de Velocidad Durante Toda la Partida

**User Story:** Como jugador, quiero que la velocidad siga aumentando cada vez que abro una nueva puerta durante toda la partida, sin que el juego deje de escalar la dificultad tras los primeros niveles.

#### Acceptance Criteria

1. WHEN el jugador logra un Duelo Ganado en cualquier punto de la partida, THE Motor_Torre SHALL aplicar el Factor_Incremento a la Velocidad_Actual, sin imponer un límite máximo al número de Duelos Ganados (consecutivos o totales) durante los cuales dicho incremento puede aplicarse, incluyendo secuencias de al menos 50 Duelos Ganados dentro de una misma partida.
2. THE Motor_Torre SHALL no aplicar ningún techo, valor máximo fijo, ni redondeo hacia abajo a la Velocidad_Actual que impida el crecimiento compuesto descrito en el Requirement 2, salvo los límites naturales de la representación numérica de punto flotante utilizada por el Motor_Torre (IEEE 754 de doble precisión), los cuales no se consideran una violación de este requisito.
3. WHEN el jugador supera una Puerta adicional después de haber superado al menos una Puerta previamente en la misma partida, THE Motor_Torre SHALL calcular el nuevo incremento del 30% sobre la Velocidad_Actual acumulada hasta ese momento, incluyendo la totalidad de los incrementos anteriores aplicados durante la partida.
4. WHEN el jugador reinicia la partida tras un Game Over, THE Motor_Torre SHALL restablecer la Velocidad_Actual a la Velocidad_Base original, de modo que el conteo de incrementos compuestos comience de nuevo desde cero Duelos Ganados, independientemente del número de Duelos Ganados o del valor de Velocidad_Actual alcanzado antes del Game Over.

---

### Requirement 4: Cambio de Color Progresivo de los Bloques en Movimiento

**User Story:** Como jugador, quiero que el bloque en movimiento cambie de color a medida que avanzo en la torre, para percibir visualmente mi progreso y sentir que la partida evoluciona.

#### Acceptance Criteria

1. WHEN se genera el primer Bloque en Movimiento de una partida nueva, THE Render_Module SHALL asignarle un color correspondiente a la Paleta_Gris_Neutro.
2. THE Nivel_Progreso SHALL calcularse exclusivamente como el número total de Duelos Ganados acumulados por el jugador durante la partida en curso.
3. THE Render_Module SHALL asignar el color del Bloque en Movimiento según la siguiente tabla determinística de Nivel_Progreso (número de Duelos Ganados) a color: 0 Duelos Ganados → Paleta_Gris_Neutro; 1 Duelo Ganado → verde; 2 Duelos Ganados → azul; 3 Duelos Ganados → naranja/dorado; 4 o más Duelos Ganados → púrpura.
4. THE Render_Module SHALL determinar el color del Bloque en Movimiento a partir de una función pura que reciba el Nivel_Progreso como entrada y retorne un color determinístico, sin depender de temporizadores ni de estado aleatorio.
5. WHERE el Nivel_Progreso del jugador es de 4 o más Duelos Ganados, THE Render_Module SHALL mantener el color púrpura de la última etapa definida, sin generar errores ni colores indefinidos, independientemente de cuánto continúe aumentando el Nivel_Progreso.
6. WHEN el jugador reinicia la partida, THE Render_Module SHALL restablecer el color del Bloque en Movimiento a la Paleta_Gris_Neutro, de forma consistente con el reinicio del Nivel_Progreso a 0 Duelos Ganados.
7. WHEN el jugador logra un Duelo Ganado, THE Render_Module SHALL aplicar el color correspondiente a la tabla del criterio 3 únicamente al Bloque en Movimiento generado después de reanudar la fase de construcción, sin alterar el color de ningún Bloque en Movimiento ya renderizado antes del Duelo.
