# Requirements Document

## Introduction

Esta especificación detalla los requisitos para mejorar la pantalla de inicio de "Torre de las Nubes" con un sistema de captura y almacenamiento de nombre del jugador. La mejora permite que el juego reconozca y personalice la experiencia del jugador, mostrando su nombre al final del juego junto con la puntuación alcanzada.

## Glossary

- **Jugador**: La persona que está jugando "Torre de las Nubes".
- **Pantalla de Bienvenida**: La pantalla inicial que se muestra al abrir el juego, anterior a la construcción de la torre.
- **Nombre del Jugador**: Cadena de texto que identifica al jugador, almacenada de forma persistente en el navegador.
- **Storage Persistente**: Almacenamiento en el navegador (localStorage) que persiste entre sesiones.
- **Pantalla de Game Over**: La pantalla que se muestra cuando el jugador pierde.
- **Score Final**: La puntuación del jugador al finalizar la partida, basada en el piso alcanzado.
- **Estética Tower Game**: Estilo visual del juego existente con temática AWS.

## Requirements

### Requirement 1: Pantalla de Bienvenida Completa

**User Story:** Como jugador, quiero ver una pantalla de bienvenida que abarque toda la pantalla, de modo que la experiencia visual sea inmersiva desde el inicio.

#### Acceptance Criteria

1. WHEN el juego se carga, THE Welcome_Screen SHALL ocupar el 100 por ciento del ancho y alto del viewport del navegador
2. WHILE la pantalla de bienvenida está activa, THE game canvas SHALL ser visible de fondo pero no interactivo
3. THE Welcome_Screen SHALL tener un fondo que respete la estética tower game con tonos azul oscuro y gradientes consistentes

---

### Requirement 2: Mensaje de Bienvenida y Descripción del Juego

**User Story:** Como jugador nuevo, quiero leer un mensaje de bienvenida clara y una descripción del juego antes de empezar, para entender qué voy a jugar.

#### Acceptance Criteria

1. THE Welcome_Screen SHALL mostrar el título Torre de las Nubes de forma prominente usando la fuente Cinzel de peso 700 o superior
2. WHEN la pantalla de bienvenida se carga, THE Welcome_Screen SHALL mostrar el mensaje: ¿Listo para conquistar nuevos niveles y llevar tu conocimiento de AWS al límite?
3. THE Welcome_Screen SHALL mostrar este mensaje con color dorado para mantener consistencia visual
4. THE Welcome_Screen layout SHALL preservar la estructura existente de reglas y botón de inicio

---

### Requirement 3: Campo de Entrada para Nombre Opcional

**User Story:** Como jugador, quiero poder escribir mi nombre (opcional) en la pantalla de bienvenida, para que el juego me reconozca por mi nombre.

#### Acceptance Criteria

1. WHEN la pantalla de bienvenida se carga, THE Welcome_Screen SHALL mostrar un campo de entrada de texto para el nombre del jugador
2. THE Name_Input_Field SHALL tener un placeholder que diga Tu nombre (opcional)
3. THE Name_Input_Field SHALL permitir al jugador escribir caracteres alfanuméricos y espacios, limitado a un máximo de 8 caracteres mediante el atributo maxlength igual a 8
4. THE Name_Input_Field SHALL estar posicionado de forma visible en la pantalla de bienvenida, encima del botón Comenzar a construir
5. THE Name_Input_Field styling SHALL ser consistente con la estética facetada del juego, usando clip-path o bordes dorados con tonos oscuros

---

### Requirement 4: Validación de Longitud Máxima del Nombre

**User Story:** Como diseñador de la experiencia del usuario, quiero que el nombre sea corto y opcional, de modo que la captura del nombre sea sin fricción y no bloquee el flujo del juego.

#### Acceptance Criteria

1. IF el jugador ingresa un nombre, THEN THE Name_Validator SHALL verificar que la longitud saneada sea entre 1 y 8 caracteres incluyendo espacios
2. WHEN el jugador ingresa un nombre con más de 8 caracteres, THE Name_Validator SHALL recortar el nombre a un máximo de 8 caracteres
3. THE System SHALL no mostrar un mensaje de error de validación si el campo está vacío
4. WHEN el campo de nombre está vacío y el jugador hace clic en Comenzar a construir, THE System SHALL permitir que continúe sin nombre, sin bloquear el flujo

---

### Requirement 5: Persistencia del Nombre en Storage Local

**User Story:** Como jugador, quiero que mi nombre sea almacenado cuando lo escriba, para que se recuerde incluso si recargo la página.

#### Acceptance Criteria

1. WHEN el jugador escribe su nombre en el campo de entrada, THE System SHALL guardar el nombre en localStorage bajo la clave playerName
2. WHEN el navegador recarga la página, THE System SHALL restaurar el nombre anterior del localStorage y mostrarlo en el campo de entrada
3. IF el nombre en el campo no es válido, es decir está vacío o excede 8 caracteres tras el saneamiento, THEN localStorage no será actualizado con un valor inválido
4. THE System SHALL mantener el nombre en localStorage durante toda la sesión del navegador y sesiones futuras, hasta que el jugador lo cambie explícitamente

---

### Requirement 6: Mostrar Nombre en la Pantalla de Game Over

**User Story:** Como jugador, quiero ver mi nombre en la pantalla de Game Over junto con mi puntuación, para que el resultado sea personalizado.

#### Acceptance Criteria

1. WHEN el jugador pierde y se muestra la pantalla de Game Over, IF el jugador proporcionó un nombre válido, THEN THE GameOver_Screen SHALL mostrar el nombre en el mensaje
2. IF el jugador no proporcionó nombre o el nombre es vacío, THEN THE GameOver_Screen SHALL mostrar solo el piso alcanzado sin personalización
3. THE Name_Display on the GameOver_Screen SHALL usar la misma tipografía y color dorado que el título principal para mantener consistencia visual
4. THE Name_Display SHALL estar ubicado en el mensaje de detalle de la pantalla de Game Over, de forma legible

---

### Requirement 7: Opción de Cambiar Nombre al Reintentar

**User Story:** Como jugador, quiero poder cambiar mi nombre cuando recargo la página del navegador, sin perder la funcionalidad del juego.

#### Acceptance Criteria

1. WHEN el jugador recarga la página, THE Sistema SHALL cargar la pantalla de bienvenida nuevamente
2. THE Name_Input_Field SHALL mostrar el nombre anterior del localStorage como valor inicial
3. WHEN el jugador cambia el nombre en el campo de entrada, THE New_Name SHALL reemplazar el anterior en localStorage cuando se inicia una nueva partida
4. WHEN el jugador borra el nombre completamente y hace clic en Comenzar a construir, THE System SHALL permitir jugar sin nombre

---

### Requirement 8: Jugar sin Nombre

**User Story:** Como jugador ocasional, quiero poder jugar sin agregar mi nombre, para una experiencia sin fricción.

#### Acceptance Criteria

1. WHEN el campo de nombre está vacío y el jugador hace clic en Comenzar a construir, THE System SHALL permitir que inicie el juego normalmente
2. WHEN el jugador completa una partida sin nombre, THE GameOver_Screen SHALL mostrar un mensaje genérico sin personalización
3. THE Comenzar a construir button SHALL estar habilitado incluso si el campo de nombre está vacío, sin mensajes de validación
4. THE System SHALL mostrar una indicación visual sutil que informa al jugador que jugar sin nombre resulta en una experiencia genérica

---

### Requirement 9: Estética Consistente con el Juego

**User Story:** Como diseñador visual, quiero asegurar que la pantalla de bienvenida mejorada mantenga la identidad visual de la torre de las nubes.

#### Acceptance Criteria

1. THE Welcome_Screen fondo SHALL usar gradientes y colores de la paleta CSS existente
2. THE Name_Input_Field SHALL aplicar el clip-path facetado o estilos visuales similares a otros elementos de UI
3. THE Name_Input_Field border AND background SHALL usar tonos consistentes con la estética existente
4. THE Welcome_Screen layout SHALL mantener la estructura de título, descripción de reglas, campo de nombre, y botón de inicio de forma balanceada
5. WHILE en pantalla móvil, THE Name_Input_Field SHALL adaptarse responsivamente, manteniendo legibilidad

---

### Requirement 10: Reintentar sin Agregar Nombre de Nuevo

**User Story:** Como jugador que ya proporcionó su nombre, quiero reintentar rápidamente sin tener que volver a escribir mi nombre en cada intento.

#### Acceptance Criteria

1. WHEN el jugador hace clic en Reconstruir la torre en la pantalla de Game Over, THE Sistema SHALL volver a la pantalla de bienvenida
2. THE Name_Input_Field SHALL mostrar el nombre guardado anteriormente del localStorage
3. WHEN el jugador hace clic directamente en Comenzar a construir sin cambiar el nombre, THE Stored_Name SHALL ser usado automáticamente para la siguiente partida
4. IF el jugador borra el campo completamente y hace clic en Comenzar a construir, THEN THE System SHALL iniciar el juego sin nombre, sin usar el nombre almacenado anteriormente

---

### Requirement 11: Compatibilidad con Navegadores Modernos

**User Story:** Como equipo de desarrollo, quiero asegurar que la feature funcione en navegadores modernos sin dependencias pesadas.

#### Acceptance Criteria

1. THE Enhanced_Welcome_Screen SHALL funcionar sin dependencias externas de JavaScript, solo vanilla JS ES6 más
2. THE localStorage API SHALL ser usado, ampliamente soportado en navegadores modernos
3. WHEN se prueba en Firefox, Chrome, Safari, Edge versiones recientes, THE Enhanced_Welcome_Screen SHALL renderizar y funcionar correctamente
4. THE clip-path CSS property SHALL funcionar en todos los navegadores modernos sin polyfills

