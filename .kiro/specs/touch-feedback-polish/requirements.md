# Requirements Document

## Introduction

Esta funcionalidad añade retroalimentación visual táctil inmediata a los elementos interactivos de "Torre de las Nubes — Duelo AWS" que actualmente solo cuentan con estilos `:hover`. En dispositivos táctiles, `:hover` no se dispara de forma confiable (o puede quedar "pegado" visualmente tras levantar el dedo en algunos navegadores móviles), por lo que la Tarjeta de combate (`.card`), las Opciones_Modal (`.qmodal-opt` dentro de la Modal_Pregunta) y las Pastillas_HUD (`.hud-pill`, incluyendo `#settingsBtn`) no ofrecen hoy ninguna señal visual inmediata al ser tocados.

El proyecto ya resuelve este problema para `.btn-primary` y `.btn-secondary` mediante un Patron_Presionado (`transform:translateY(0px) scale(.98)` en `:active`, sumado a `filter:brightness(...)` y `transform:translateY(-1px)` en `:hover`). Esta funcionalidad extiende el mismo patrón visual, adaptado a la geometría facetada (gem-cut) y a los gradientes existentes de cada elemento, a la Tarjeta, la Opcion_Modal y la Pastilla_HUD, sin alterar ningún listener, callback o comportamiento funcional, y sin degradar el comportamiento de `:hover` ya existente para escritorio.

El botón de opción heredado `.opt-btn` (reverso de tarjeta, reemplazado por la Modal_Pregunta según la spec `modal-pregunta-tarjeta` y ya no usado en el flujo real de respuesta) queda explícitamente fuera de alcance para no invertir esfuerzo en código muerto.

Esta funcionalidad cierra la Fase 4 (última fase) del plan de 8 specs de responsive design, bajo la prioridad ya acordada de "prioridad visual primero, dificultad después".

## Glossary

- **Sistema_Feedback_Tactil**: Conjunto de reglas CSS responsables de mostrar una respuesta visual inmediata cuando el jugador presiona o toca un Elemento_Interactivo.
- **Elemento_Interactivo**: Cualquiera de los siguientes elementos DOM objeto de esta funcionalidad: la Tarjeta, la Opcion_Modal o la Pastilla_HUD.
- **Tarjeta**: Elemento DOM con clase `.card` dentro de `#cardsRow` que representa un servicio AWS durante el combate, y que el jugador toca para seleccionarla y abrir la Modal_Pregunta.
- **Tarjeta_No_Interactiva**: Tarjeta que tiene la clase `.locked` o la clase `.failed`, y que por tanto no acepta selección del jugador.
- **Opcion_Modal**: Elemento DOM con clase `.qmodal-opt` dentro de la Modal_Pregunta, que representa una opción de respuesta seleccionable por el jugador.
- **Pastilla_HUD**: Elemento DOM con clase `.hud-pill` dentro de `#hud`, incluyendo el botón `#settingsBtn` (que también tiene la clase `.hud-pill`).
- **Estado_Presionado**: Estado visual que se activa mientras el jugador mantiene presionado (con el dedo, el mouse o cualquier dispositivo de puntero) un Elemento_Interactivo, y que se desactiva al soltar o cancelar la presión.
- **Patron_Presionado**: Patrón visual ya existente en `.btn-primary:active`/`.btn-secondary:active` (`transform:translateY(0px) scale(.98)`), usado como referencia de diseño para el Estado_Presionado de los demás Elementos_Interactivos.
- **Movimiento_Reducido**: Preferencia del sistema operativo/navegador `prefers-reduced-motion: reduce`, ya utilizada en el proyecto (por ejemplo en `.pip` y en `.qmodal-overlay`).
- **Codigo_Muerto_Opt_Btn**: El elemento `.opt-btn` (reverso de Tarjeta), no utilizado en el flujo real de respuesta vigente (reemplazado por Opcion_Modal según la spec `modal-pregunta-tarjeta`), y explícitamente fuera de alcance de esta funcionalidad.

## Requirements

### Requirement 1: Feedback táctil en la Tarjeta de combate

**User Story:** Como jugador en combate usando un dispositivo táctil, quiero ver una respuesta visual inmediata al tocar una Tarjeta, para percibir que mi toque fue registrado antes de que se abra la Modal_Pregunta.

#### Acceptance Criteria

1. WHILE el jugador mantiene presionada una Tarjeta que no es Tarjeta_No_Interactiva, THE Sistema_Feedback_Tactil SHALL aplicar el Patron_Presionado a esa Tarjeta.
2. WHEN el jugador deja de presionar una Tarjeta que no es Tarjeta_No_Interactiva, THE Sistema_Feedback_Tactil SHALL retirar el Patron_Presionado de esa Tarjeta.
3. IF el jugador presiona una Tarjeta_No_Interactiva, THEN THE Sistema_Feedback_Tactil SHALL mantener esa Tarjeta sin el Patron_Presionado.
4. WHILE el jugador mantiene presionada una Tarjeta que no es Tarjeta_No_Interactiva, THE Sistema_Feedback_Tactil SHALL mantener sin cambios el `clip-path` de la Tarjeta correspondiente a su firma facetada (gem-cut).

### Requirement 2: Feedback táctil en las Opciones de la Modal_Pregunta

**User Story:** Como jugador respondiendo una pregunta, quiero ver una respuesta visual inmediata al tocar una Opcion_Modal, para confirmar que mi selección fue registrada.

#### Acceptance Criteria

1. WHILE el jugador mantiene presionada una Opcion_Modal que no está deshabilitada, THE Sistema_Feedback_Tactil SHALL aplicar el Patron_Presionado a esa Opcion_Modal.
2. WHEN el jugador deja de presionar una Opcion_Modal que no está deshabilitada, THE Sistema_Feedback_Tactil SHALL retirar el Patron_Presionado de esa Opcion_Modal.
3. IF el jugador presiona una Opcion_Modal deshabilitada (atributo `disabled`), THEN THE Sistema_Feedback_Tactil SHALL mantener esa Opcion_Modal sin el Patron_Presionado.
4. WHILE el jugador mantiene presionada una Opcion_Modal, THE Sistema_Feedback_Tactil SHALL mantener sin cambios el color de fondo asociado a las clases `.correct` e `.incorrect` cuando dicha Opcion_Modal tenga alguna de esas clases.

### Requirement 3: Feedback táctil en las Pastillas del HUD

**User Story:** Como jugador usando un dispositivo táctil, quiero ver una respuesta visual inmediata al tocar el botón de ajustes de audio del HUD, para percibir que mi toque fue registrado.

#### Acceptance Criteria

1. WHILE el jugador mantiene presionado `#settingsBtn`, THE Sistema_Feedback_Tactil SHALL aplicar el Patron_Presionado a `#settingsBtn`.
2. WHEN el jugador deja de presionar `#settingsBtn`, THE Sistema_Feedback_Tactil SHALL retirar el Patron_Presionado de `#settingsBtn`.
3. WHERE una Pastilla_HUD distinta de `#settingsBtn` se vuelve interactiva (asociada a un manejador de eventos de puntero o de clic), THE Sistema_Feedback_Tactil SHALL aplicar el mismo Patron_Presionado definido para `#settingsBtn` a esa Pastilla_HUD mientras el jugador la mantenga presionada.
4. IF el navegador del jugador no admite la pseudo-clase `:active` o alguna de las propiedades CSS del Patron_Presionado, THEN THE Sistema_Feedback_Tactil SHALL dejar a `#settingsBtn` funcional ante el toque o clic, sin bloquear ni degradar la ejecución de su manejador de evento existente.

### Requirement 4: Preservación del comportamiento funcional y de escritorio

**User Story:** Como responsable del proyecto, quiero que el feedback táctil sea un cambio puramente visual, para no introducir regresiones en la lógica del juego ni en la experiencia de escritorio existente.

#### Acceptance Criteria

1. WHEN el Sistema_Feedback_Tactil aplica o retira el Patron_Presionado sobre un Elemento_Interactivo, THE Sistema_Feedback_Tactil SHALL dejar sin modificar los manejadores de eventos de clic o de puntero ya asociados a ese Elemento_Interactivo, sin que esto implique ninguna garantía sobre el orden o el momento de ejecución de dichos manejadores.
2. THE Sistema_Feedback_Tactil SHALL conservar, sin eliminarlos ni degradarlos, todos los estilos `:hover` ya existentes de la Tarjeta, la Opcion_Modal y la Pastilla_HUD.
3. WHILE un dispositivo de puntero con soporte de `hover` (por ejemplo mouse) permanece posicionado sobre un Elemento_Interactivo sin presionarlo, THE Sistema_Feedback_Tactil SHALL mantener el estilo `:hover` de ese Elemento_Interactivo sin sustituirlo por el Patron_Presionado.
4. THE Sistema_Feedback_Tactil SHALL excluir a `.opt-btn` (Codigo_Muerto_Opt_Btn) de cualquier regla nueva de Estado_Presionado.

### Requirement 5: Respeto de la preferencia de Movimiento_Reducido

**User Story:** Como jugador con la preferencia de accesibilidad de movimiento reducido activada, quiero que el feedback táctil no introduzca animaciones adicionales, para evitar transiciones que puedan resultarme incómodas.

#### Acceptance Criteria

1. IF el Sistema_Feedback_Tactil introduce una propiedad `transition` nueva para el Estado_Presionado de un Elemento_Interactivo, THEN THE Sistema_Feedback_Tactil SHALL anular la duración de esa `transition` a 0 milisegundos dentro de un bloque `@media (prefers-reduced-motion: reduce)`.
2. WHERE la preferencia Movimiento_Reducido está activa, THE Sistema_Feedback_Tactil SHALL seguir aplicando y retirando el Patron_Presionado (el cambio visual de `transform`/`filter` en sí) ante la presión y la liberación del Elemento_Interactivo, sin depender de una transición animada.
