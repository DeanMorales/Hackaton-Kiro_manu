# Requirements Document

## Introduction

Esta funcionalidad mejora la legibilidad de las preguntas durante el combate contra el guardián en "Torre de las Nubes — Duelo AWS". Actualmente, al seleccionar una tarjeta de servicio AWS dentro de `#cardsRow`, la tarjeta se voltea (flip 3D) y muestra la pregunta y las opciones dentro del tamaño reducido de la tarjeta (150×190 px), lo que dificulta la lectura.

Con esta funcionalidad, al seleccionar una tarjeta, la pregunta se presentará en una modal (vista expandida) de mayor tamaño con texto de pregunta y respuestas más grandes. Al terminar de responder, la tarjeta regresa a su tamaño original. La expansión y el regreso incluyen animación, respetando `prefers-reduced-motion`. Las demás tarjetas de la fila permanecen en su posición original sin desplazarse ni reordenarse durante la expansión. Además, mientras la tarjeta está expandida, todo el contenido situado detrás de la Modal_Pregunta (la escena de combate en el canvas, las demás tarjetas y la arena) se muestra con un efecto de desenfoque para dirigir la atención hacia la pregunta; al regresar la tarjeta a su tamaño original, el fondo recupera su nitidez.

Todo el contenido de cara al usuario se mantiene en español y se conserva la firma visual "facetada" (gem-cut) y la paleta de variables CSS existentes.

## Glossary

- **Modal_Pregunta**: Vista expandida y centrada que muestra la pregunta y las opciones de respuesta de una tarjeta seleccionada con mayor tamaño. Reemplaza visualmente el reverso reducido de la tarjeta durante la respuesta.
- **Sistema_Tarjetas**: Componente de la UI responsable de renderizar y gestionar las tarjetas de servicio AWS dentro de `#cardsRow` durante el combate (funciones de render e interacción en `src/ui/screens.js`).
- **Tarjeta**: Elemento DOM `.card` que representa un servicio AWS, con anverso (`.card-front`) y reverso (`.card-back` con `.qtext` y botones `.opt-btn`).
- **Fila_Tarjetas**: Contenedor `.cards-row` con `id="cardsRow"` que aloja todas las tarjetas del combate en una fila.
- **Estado_Expandido**: Estado visual de una tarjeta cuando su pregunta se muestra como Modal_Pregunta (tamaño mayor).
- **Estado_Original**: Estado visual de una tarjeta en su tamaño base dentro de la fila (150×190 px de escritorio, 118×168 px en móvil).
- **Animación_Expansión**: Transición visual que se reproduce cuando una Tarjeta pasa de Estado_Original a Estado_Expandido.
- **Animación_Regreso**: Transición visual que se reproduce cuando una Tarjeta pasa de Estado_Expandido a Estado_Original.
- **Movimiento_Reducido**: Preferencia del sistema operativo/navegador `prefers-reduced-motion: reduce` que solicita minimizar animaciones.
- **Firma_Facetada**: Estilo visual gem-cut basado en `clip-path` y la paleta de variables CSS del proyecto.
- **Capa_Fondo**: Conjunto del contenido visual situado detrás de la Modal_Pregunta durante el Estado_Expandido, compuesto por la escena de combate del canvas (`#gameCanvas`), la arena (`.arena` con combatientes y barras de vida) y las demás Tarjetas de la Fila_Tarjetas distintas de la Tarjeta expandida.
- **Desenfoque_Fondo**: Efecto visual de desenfoque (blur) aplicado a la Capa_Fondo mientras una Tarjeta está en Estado_Expandido, que reduce la nitidez del contenido de fondo sin afectar a la Tarjeta expandida ni a la Modal_Pregunta.

## Requirements

### Requirement 1: Expansión de la pregunta a Modal_Pregunta

**User Story:** Como jugador en combate, quiero que al seleccionar una tarjeta la pregunta se muestre en una modal más grande, para poder leer la pregunta y las opciones con mayor comodidad.

#### Acceptance Criteria

1. WHEN el jugador selecciona una Tarjeta no bloqueada durante el combate, THE Sistema_Tarjetas SHALL mostrar la pregunta y las opciones de esa Tarjeta en la Modal_Pregunta en Estado_Expandido dentro de 1 segundo.
2. WHILE una Tarjeta está en Estado_Expandido, THE Modal_Pregunta SHALL mostrar el mismo texto de pregunta y las mismas opciones de respuesta, en el mismo orden, que corresponden a esa Tarjeta.
3. WHILE una Tarjeta está en Estado_Expandido, THE Modal_Pregunta SHALL renderizar el texto de la pregunta con un tamaño de fuente estrictamente mayor que el tamaño usado por ese mismo texto en Estado_Original.
4. WHILE una Tarjeta está en Estado_Expandido, THE Modal_Pregunta SHALL renderizar el texto de cada opción de respuesta con un tamaño de fuente estrictamente mayor que el tamaño usado por esa misma opción en Estado_Original.
5. IF el jugador selecciona una Tarjeta que está bloqueada, THEN THE Sistema_Tarjetas SHALL mantener esa Tarjeta en Estado_Original sin mostrar la Modal_Pregunta.
6. WHILE una Tarjeta está en Estado_Expandido, THE Sistema_Tarjetas SHALL permitir la selección de una única opción de respuesta de esa Tarjeta.
7. WHILE una Tarjeta está en Estado_Expandido, THE Sistema_Tarjetas SHALL mantener como máximo una Modal_Pregunta abierta a la vez.

### Requirement 2: Regreso al tamaño original tras responder

**User Story:** Como jugador en combate, quiero que la tarjeta vuelva a su tamaño original cuando termino de responder, para continuar el combate con la fila de tarjetas en su disposición habitual.

#### Acceptance Criteria

1. WHEN el jugador selecciona una opción de respuesta correcta de la Tarjeta en Estado_Expandido y el combate continúa (el jefe conserva puntos de vida mayores que cero y el jugador conserva puntos de vida mayores que cero), THE Sistema_Tarjetas SHALL devolver esa Tarjeta a Estado_Original.
2. WHEN el jugador selecciona una opción de respuesta incorrecta de la Tarjeta en Estado_Expandido y el combate continúa (el jefe conserva puntos de vida mayores que cero y el jugador conserva puntos de vida mayores que cero), THE Sistema_Tarjetas SHALL devolver esa Tarjeta a Estado_Original.
3. WHEN el combate se resuelve tras seleccionar una opción de respuesta (el jefe queda con cero puntos de vida o el jugador queda con cero puntos de vida), THE Sistema_Tarjetas SHALL devolver la Tarjeta que estaba en Estado_Expandido a Estado_Original.
4. WHEN el Sistema_Tarjetas registra la opción de respuesta seleccionada de la Tarjeta en Estado_Expandido, THE Sistema_Tarjetas SHALL iniciar el regreso de esa Tarjeta a Estado_Original dentro de un tiempo del rango de 0 a 2000 milisegundos.
5. WHILE una Tarjeta está en Estado_Expandido, THE Sistema_Tarjetas SHALL mantener en Estado_Original a todas las demás Tarjetas de la Fila_Tarjetas.

### Requirement 3: Animación de expansión y regreso

**User Story:** Como jugador, quiero ver una animación cuando la tarjeta crece y cuando regresa, para percibir de forma fluida el cambio de tamaño.

#### Acceptance Criteria

1. WHEN una Tarjeta pasa de Estado_Original a Estado_Expandido, THE Sistema_Tarjetas SHALL reproducir la Animación_Expansión como una transición continua entre las dimensiones de Estado_Original y las de Estado_Expandido.
2. WHEN una Tarjeta pasa de Estado_Expandido a Estado_Original, THE Sistema_Tarjetas SHALL reproducir la Animación_Regreso como una transición continua entre las dimensiones de Estado_Expandido y las de Estado_Original.
3. THE Animación_Expansión SHALL completarse en un tiempo dentro del rango de 200 a 600 milisegundos.
4. THE Animación_Regreso SHALL completarse en un tiempo dentro del rango de 200 a 600 milisegundos.
5. WHERE la preferencia Movimiento_Reducido está activa, THE Sistema_Tarjetas SHALL aplicar el cambio entre Estado_Original y Estado_Expandido de forma inmediata, sin fotogramas intermedios de escala y en un tiempo máximo de 50 milisegundos.
6. IF se dispara una nueva transición mientras una Animación_Expansión o Animación_Regreso está en curso, THEN THE Sistema_Tarjetas SHALL cancelar la animación en curso e iniciar la nueva transición desde las dimensiones actuales de la Tarjeta.
7. WHEN una Animación_Expansión o Animación_Regreso se completa, THE Sistema_Tarjetas SHALL fijar las dimensiones de la Tarjeta a las del estado destino.

### Requirement 4: Estabilidad de la disposición de la fila

**User Story:** Como jugador, quiero que las demás tarjetas permanezcan en su lugar cuando una se expande, para no perder la referencia visual de la fila.

#### Acceptance Criteria

1. WHEN una Tarjeta pasa a Estado_Expandido, THE Sistema_Tarjetas SHALL mantener la posición horizontal y vertical de cada una de las demás Tarjetas de la Fila_Tarjetas con una tolerancia máxima de 1 píxel respecto a su posición previa a la expansión.
2. WHEN una Tarjeta pasa a Estado_Expandido, THE Sistema_Tarjetas SHALL mantener el orden secuencial de las Tarjetas dentro de la Fila_Tarjetas idéntico al registrado inmediatamente antes de iniciar la expansión.
3. WHEN una Tarjeta regresa a Estado_Original, THE Sistema_Tarjetas SHALL conservar la posición (con tolerancia máxima de 1 píxel) y el orden secuencial de todas las Tarjetas de la Fila_Tarjetas igual que antes de la expansión.
4. WHILE una Animación_Expansión o Animación_Regreso está en curso, THE Sistema_Tarjetas SHALL mantener la posición de las demás Tarjetas de la Fila_Tarjetas sin desplazamiento intermedio observable.
5. IF la Tarjeta en Estado_Expandido se solapa o desborda respecto al espacio de las demás Tarjetas, THEN THE Sistema_Tarjetas SHALL representar la Tarjeta expandida en una capa superpuesta sin alterar la posición de las demás Tarjetas.

### Requirement 5: Consistencia visual e idioma

**User Story:** Como jugador, quiero que la modal mantenga el estilo y el idioma del juego, para tener una experiencia coherente.

#### Acceptance Criteria

1. WHEN la Modal_Pregunta se muestra al jugador, THE Modal_Pregunta SHALL presentar todo su contenido textual de cara al usuario (enunciado de la pregunta, opciones de respuesta, etiquetas de botones y mensajes de retroalimentación de acierto o fallo) en idioma español.
2. WHILE la Modal_Pregunta está visible, THE Modal_Pregunta SHALL aplicar la Firma_Facetada mediante `clip-path` a su contenedor principal y a las tarjetas de opción, reproduciendo el estilo facetado (gem-cut) usado en los demás overlays del juego.
3. WHILE la Modal_Pregunta está visible, THE Modal_Pregunta SHALL obtener todos sus colores exclusivamente de las variables CSS de la paleta existente del proyecto (definidas en `:root`), sin introducir valores de color literales propios.
4. WHILE la Modal_Pregunta está visible, THE Modal_Pregunta SHALL usar las mismas familias tipográficas ya empleadas por el proyecto para títulos y cuerpo de texto, sin introducir fuentes nuevas.

### Requirement 6: Desenfoque del fondo durante la expansión

**User Story:** Como jugador en combate, quiero que el fondo detrás de la tarjeta expandida se vea desenfocado, para concentrar mi atención en la pregunta y sus opciones sin distracciones.

#### Acceptance Criteria

1. WHEN una Tarjeta pasa a Estado_Expandido, THE Sistema_Tarjetas SHALL aplicar el Desenfoque_Fondo a la Capa_Fondo con un radio de desenfoque dentro del rango de 2 a 12 píxeles.
2. WHEN una Tarjeta regresa a Estado_Original, THE Sistema_Tarjetas SHALL retirar el Desenfoque_Fondo de la Capa_Fondo, dejando el radio de desenfoque de la Capa_Fondo en 0 píxeles.
3. WHILE una Tarjeta está en Estado_Expandido, THE Sistema_Tarjetas SHALL mantener la Tarjeta expandida y la Modal_Pregunta con un radio de desenfoque de 0 píxeles.
4. WHILE ninguna Tarjeta está en Estado_Expandido, THE Sistema_Tarjetas SHALL mantener la Capa_Fondo con un radio de desenfoque de 0 píxeles.
5. WHEN el Sistema_Tarjetas aplica o retira el Desenfoque_Fondo, THE Sistema_Tarjetas SHALL preservar la posición horizontal y vertical de cada Tarjeta de la Fila_Tarjetas con una tolerancia máxima de 1 píxel respecto a su posición previa, sin desplazar ni reordenar las Tarjetas.
6. WHEN una Tarjeta pasa a Estado_Expandido, THE Sistema_Tarjetas SHALL sincronizar la aparición del Desenfoque_Fondo con la Animación_Expansión, completando la aplicación del Desenfoque_Fondo en un tiempo dentro del rango de 200 a 600 milisegundos.
7. WHEN una Tarjeta regresa a Estado_Original, THE Sistema_Tarjetas SHALL sincronizar la desaparición del Desenfoque_Fondo con la Animación_Regreso, completando la retirada del Desenfoque_Fondo en un tiempo dentro del rango de 200 a 600 milisegundos.
8. WHERE la preferencia Movimiento_Reducido está activa, THE Sistema_Tarjetas SHALL aplicar y retirar el Desenfoque_Fondo de forma inmediata, sin fotogramas intermedios de transición del radio de desenfoque y en un tiempo máximo de 50 milisegundos.
