# Requirements Document

## Introduction

"Torre de las Nubes — Duelo AWS" es actualmente un único archivo HTML (`torre-de-las-nubes.html`) con HTML, CSS y JavaScript inline, ejecutado sin build step ni dependencias externas de JS. Esta spec cubre la migración estructural de esa base de código a una arquitectura de módulos JavaScript separados (ES modules), organizados por responsabilidad (datos, motor de torre, combate, render en canvas, UI/DOM, audio, y bucle principal), tal como se sugiere en el steering `structure.md` del proyecto.

Esta es una migración estructural, no una nueva feature de gameplay: el comportamiento observable del juego (mecánicas, reglas, textos, dificultad) y su apariencia visual (colores, layout, animaciones, estilo "facetado") deben permanecer exactamente iguales antes y después de la migración. El objetivo es obtener mejor control y mantenibilidad para incorporar features futuras de forma incremental vía nuevas specs.

Tras consulta con el usuario, la estrategia de carga de módulos elegida es un bundler ligero (Vite) para el entorno de desarrollo y build de producción, en lugar de ES modules nativos servidos directamente vía `file://`.

## Glossary

- **Game**: la aplicación "Torre de las Nubes — Duelo AWS" en su conjunto, resultante tras la migración.
- **Monolith_File**: el archivo `torre-de-las-nubes.html` actual, que contiene HTML, CSS y JS inline en una IIFE.
- **Module**: un archivo JavaScript ES module (`.js` con `import`/`export`) que agrupa responsabilidades relacionadas dentro de `src/`.
- **Data_Module**: el módulo responsable de los datos estáticos del juego (`AWS_SERVICES`, `QUESTIONS`, `BOSS_NAMES`) y las funciones auxiliares puras de selección/barajado (`shuffle`, `pickQuestion`).
- **Engine_Module**: el módulo responsable del estado y la física de la torre (pisos, bloque en movimiento, colisión/overlap, cámara, animación del caballero, generación del siguiente bloque).
- **Combat_Module**: el módulo responsable de la lógica del duelo contra el guardián (estado de combate, resolución de respuestas, cálculo de vidas/pips, condiciones de victoria/derrota).
- **Render_Module**: el módulo responsable de dibujar el mundo del juego en el elemento canvas (cielo, nubes, torre, bloque en movimiento, caballero).
- **UI_Module**: el módulo responsable de manipular el DOM de overlays y HUD (pantalla de inicio, pantalla de combate, pantalla de game over, HUD de piso/puerta, renderizado de cartas y barras de vida).
- **Audio_Module**: el módulo responsable de la síntesis de efectos de sonido mediante Web Audio API (`beep`, objeto `sfx`).
- **Main_Module**: el módulo responsable de inicializar la aplicación, conectar (wiring) los demás módulos entre sí, y ejecutar el bucle principal (`requestAnimationFrame`, `update`, `render`).
- **Build_Tool**: la herramienta Vite usada para servir el proyecto en desarrollo y generar los artefactos de producción.
- **Behavior_Parity**: la propiedad de que, para una misma secuencia de entradas del usuario y semilla de aleatoriedad equivalente, el Game post-migración produce las mismas transiciones de estado, textos, valores numéricos y estructura DOM/canvas que el Monolith_File.

## Requirements

### Requirement 1: Preservación de comportamiento funcional

**User Story:** Como jugador que ya conoce el juego, quiero que el juego migrado se comporte exactamente igual que la versión actual, para que mi experiencia de juego no cambie ni se rompa por la reestructuración interna del código.

#### Acceptance Criteria

1. WHEN el jugador interactúa con el Game migrado mediante clic, toque o la barra espaciadora, THE Game SHALL producir el mismo resultado (colocación de bloque, caída, o rechazo de acción) que el Monolith_File ante la misma secuencia de entradas y la misma semilla de aleatoriedad equivalente, conforme a Behavior_Parity.
2. THE Engine_Module SHALL calcular, para cualquier secuencia de pisos existentes y cualquier bloque en movimiento con posición y ancho arbitrarios, el mismo valor de overlap, el mismo ancho de nuevo piso y la misma decisión de caída que la lógica equivalente del Monolith_File.
3. THE Data_Module SHALL producir, para cualquier combinación válida de identificador de servicio AWS y texto a evitar, una pregunta cuyo texto pertenece al banco de preguntas de ese servicio, con las cuatro opciones originales presentes en algún orden, y con el índice de respuesta correcta apuntando a la opción que era correcta antes de barajar.
4. WHEN el jugador alcanza un piso puerta, THE Game SHALL iniciar un combate contra un guardián con el mismo número de cartas, mismo nombre de guardián y misma cantidad de vidas (pips) que produce el Monolith_File para ese mismo nivel.
5. WHEN el jugador responde correctamente una carta de combate, THE Combat_Module SHALL reducir en uno los pips del guardián, igual que en el Monolith_File.
6. WHEN el jugador responde incorrectamente una carta de combate, THE Combat_Module SHALL reducir en uno sus propios pips, igual que en el Monolith_File.
7. WHEN los pips del guardián llegan a cero, THE Game SHALL declarar victoria y reanudar la fase de construcción, igual que en el Monolith_File.
8. WHEN los pips del jugador llegan a cero, THE Game SHALL declarar derrota y mostrar la pantalla de game over, igual que en el Monolith_File.
9. IF el jugador falla al encajar un bloque en movimiento, THEN THE Game SHALL activar la secuencia de caída y mostrar la pantalla de game over con el mismo texto y el mismo número de piso alcanzado que produce el Monolith_File.
10. IF el Data_Module recibe un texto a evitar para un servicio cuyo banco de preguntas contiene más de una pregunta, THEN THE Data_Module SHALL aplicar la misma lógica de reintento que el Monolith_File para intentar devolver una pregunta con texto distinto al texto a evitar.

### Requirement 2: Preservación de apariencia visual

**User Story:** Como jugador, quiero que el juego migrado se vea visualmente idéntico al actual, para no percibir ninguna diferencia estética tras la migración interna del código.

#### Acceptance Criteria

1. THE Game SHALL renderizar el mismo árbol DOM (elementos, ids, clases, jerarquía/orden y contenido de texto estático) para `#hud`, `#startScreen`, `#bossScreen` y `#gameOverScreen` que el Monolith_File.
2. THE Game SHALL aplicar exactamente las mismas reglas CSS (variables de color, tipografías, `clip-path`, animaciones, media queries) que el Monolith_File, sin adiciones, eliminaciones ni modificaciones de valores.
3. WHEN el Render_Module dibuja cada fotograma, THE Render_Module SHALL dibujar en el canvas el cielo, las nubes, la torre, el bloque en movimiento y el caballero usando las mismas fórmulas de posición, color y forma, y el mismo orden de capas (z-order), que las funciones de dibujo equivalentes del Monolith_File.
4. THE Game SHALL cargar las mismas fuentes externas (Google Fonts Cinzel y Space Grotesk), con los mismos pesos y estilos, que el Monolith_File.
5. IF las fuentes externas (Google Fonts Cinzel y Space Grotesk) no logran cargarse, THEN THE Game SHALL recurrir a las mismas fuentes de reserva (fallback) que especifica el Monolith_File (`serif` para `--font-display`, `sans-serif` para `--font-body`).

### Requirement 3: Separación de módulos por responsabilidad

**User Story:** Como desarrollador que mantiene el proyecto, quiero que el código quede organizado en módulos separados por responsabilidad, para poder ubicar y modificar funcionalidad específica sin tener que navegar un único archivo gigante.

#### Acceptance Criteria

1. THE Game SHALL organizar su código fuente en un directorio `src/` de modo que Data_Module, Engine_Module, Combat_Module, Render_Module, UI_Module, Audio_Module y Main_Module correspondan cada uno a al menos un archivo ES module (`.js`) identificable dentro de `src/`.
2. THE Data_Module SHALL contener exclusivamente `AWS_SERVICES`, `QUESTIONS`, `BOSS_NAMES` y las funciones puras `shuffle` y `pickQuestion`, sin acceso al DOM, canvas ni Web Audio API.
3. THE Engine_Module SHALL contener exclusivamente el estado y la lógica de la torre (pisos, bloque en movimiento, cámara, animación del caballero, colisión/overlap), sin manipular directamente el DOM ni el canvas.
4. THE Combat_Module SHALL contener exclusivamente el estado y la lógica de resolución del combate (pips, cartas, condiciones de victoria/derrota), sin manipular directamente el DOM ni el canvas.
5. THE Render_Module SHALL contener exclusivamente las funciones de dibujo sobre el elemento canvas, sin manipular elementos DOM de overlays ni HUD.
6. THE UI_Module SHALL contener exclusivamente las funciones que crean, actualizan o alternan la visibilidad de elementos DOM de overlays y HUD, sin contener lógica de física de la torre ni de resolución de combate.
7. THE Audio_Module SHALL contener exclusivamente la función `beep` y el objeto `sfx` de síntesis de audio, sin dependencias de Data_Module, Engine_Module, Combat_Module, Render_Module ni UI_Module.
8. THE Main_Module SHALL ser el único módulo responsable de inicializar el canvas, conectar los demás módulos entre sí, y ejecutar el bucle principal (`requestAnimationFrame`, `update`, `render`), sin contener lógica de física de la torre, resolución de combate, dibujo en canvas ni manipulación directa de overlays/HUD del DOM.
9. THE Game SHALL comunicar datos y funciones entre Data_Module, Engine_Module, Combat_Module, Render_Module, UI_Module, Audio_Module y Main_Module exclusivamente mediante declaraciones `import`/`export` de ES modules, sin depender de variables globales implícitas ni de `window`, y sin que existan dependencias circulares de `import` entre módulos.

### Requirement 4: Estrategia de carga de módulos y build

**User Story:** Como desarrollador, quiero un flujo de desarrollo y build simple basado en Vite, para poder ejecutar el juego durante el desarrollo y generar una versión de producción sin dependencias de runtime adicionales.

#### Acceptance Criteria

1. THE Game SHALL usar Vite como Build_Tool para servir la aplicación durante el desarrollo mediante un servidor local.
2. THE Game SHALL usar Vite para generar un build de producción compuesto por archivos estáticos (HTML, JS, CSS) sin necesidad de un servidor con lógica de backend.
3. THE Game SHALL declarar Vite y sus dependencias asociadas exclusivamente como dependencias de desarrollo (`devDependencies`), sin agregar dependencias de runtime al Game.
4. IF el proyecto no contaba con un archivo `package.json` antes de esta migración, THEN THE Game SHALL incluir uno nuevo que declare al menos un script para iniciar el servidor de desarrollo (por convención `dev`) y un script para generar el build de producción (por convención `build`), ambos ejecutables mediante el gestor de paquetes del proyecto.
5. IF el proceso de build de producción encuentra un error de sintaxis o de resolución de módulos, THEN THE Build_Tool SHALL detener el build sin generar un conjunto completo de archivos de salida, y SHALL indicar el fallo mediante un código de salida distinto de cero en la línea de comandos.
6. WHEN los archivos estáticos del build de producción se sirven mediante cualquier servidor de archivos estáticos, THE Game SHALL ejecutarse correctamente sin requerir un proceso de backend, entorno Node.js, ni ninguna otra dependencia de runtime en el momento de servir dichos archivos.

### Requirement 5: Convenciones de nombres y estilo

**User Story:** Como desarrollador que mantiene el proyecto, quiero que el código modularizado siga las mismas convenciones de nombres y estilo que ya se usaban en el Monolith_File, para mantener consistencia y previsibilidad al leer el código.

#### Acceptance Criteria

1. THE Game SHALL usar camelCase para nombres de funciones y variables en todos los Module.
2. THE Game SHALL usar MAYÚSCULAS_CON_GUION_BAJO para constantes de datos estáticos y de configuración en todos los Module, igual que `AWS_SERVICES`, `QUESTIONS`, `BOSS_NAMES`, `DOOR_INTERVAL`, `BASE_WIDTH` y `MIN_WIDTH` en el Monolith_File.
3. THE Game SHALL usar kebab-case para ids y clases de elementos DOM en todos los Module, igual que en el Monolith_File.
4. THE Game SHALL incluir en cada Module un comentario de encabezado de sección con el formato `/* ===== ... ===== */` que identifique el área de responsabilidad del Module según el Glossary, siguiendo el mismo estilo de bloque usado en el Monolith_File.

### Requirement 6: Documentación del nuevo flujo de ejecución

**User Story:** Como desarrollador o colaborador nuevo, quiero que el README documente claramente cómo ejecutar el juego tras la migración, para no depender de abrir el archivo HTML directamente con doble clic.

#### Acceptance Criteria

1. WHEN la migración a módulos ES y Vite se completa, THE Game SHALL incluir en `README.md` los prerrequisitos (Node.js y gestor de paquetes) y las instrucciones de instalación de dependencias, el comando para iniciar el entorno de desarrollo, el comando para generar el build de producción, y el comando o método para servir/previsualizar dicho build de producción.
2. WHEN la migración a módulos ES y Vite se completa, THE Game SHALL documentar en `README.md` que el método anterior de abrir `torre-de-las-nubes.html` directamente con doble clic deja de estar soportado, y SHALL indicar las dos rutas válidas de ejecución: (a) modo desarrollo mediante el servidor local de Vite, o (b) generar el build de producción y servirlo mediante un servidor de archivos estáticos.
3. THE Game SHALL documentar en `README.md` la versión mínima de Node.js requerida para instalar dependencias y ejecutar los scripts de desarrollo y build.

### Requirement 7: Compatibilidad de navegador

**User Story:** Como jugador, quiero poder seguir jugando desde un navegador moderno estándar, para no necesitar configuración especial ni un navegador poco común.

#### Acceptance Criteria

1. THE Game SHALL limitar las APIs de navegador que utiliza a las ya usadas por el Monolith_File (Canvas 2D, Web Audio API, CSS `clip-path`, ES modules nativos del navegador), sin agregar ninguna API de navegador adicional a esa lista.
2. IF se requiere que el Game use una API de navegador no incluida en la lista del criterio 1, THEN THE Game SHALL limitarse a APIs clasificadas como "ampliamente disponibles" (widely available) según la documentación pública de compatibilidad de navegadores (por ejemplo MDN o caniuse.com) para las últimas dos versiones estables de Chrome, Firefox, Edge y Safari.
3. THE Game SHALL exhibir Behavior_Parity (mismo comportamiento funcional y mismo renderizado visual, según los Requirement 1 y 2) al ejecutarse en las últimas versiones estables de escritorio de Chrome, Firefox, Edge y Safari.
4. THE Game SHALL exhibir Behavior_Parity al ejecutarse en las últimas versiones estables de Chrome para Android y Safari para iOS, dado que el Requirement 1 contempla entradas táctiles.
5. IF el navegador del jugador no soporta alguna de las APIs listadas en el criterio 1, THEN THE Game SHALL mostrar un mensaje visible indicando que el navegador no es compatible, en lugar de fallar silenciosamente, mostrar una pantalla en blanco, o quedar en un estado sin respuesta.

### Requirement 8: Restricción de dependencias y alcance tecnológico

**User Story:** Como responsable del proyecto, quiero que la migración no introduzca frameworks, TypeScript ni dependencias de runtime pesadas sin mi aprobación explícita, para mantener el proyecto simple y con la menor cantidad de piezas móviles posible.

#### Acceptance Criteria

1. THE Game SHALL implementarse en JavaScript vanilla (ES6+), sin introducir TypeScript, evidenciado por la ausencia de archivos `.ts`/`.tsx` y de `tsconfig.json` en el código fuente.
2. THE Game SHALL implementarse sin frameworks de UI (por ejemplo React, Vue, Svelte) ni bibliotecas de gestión de estado, verificable mediante la ausencia de dichos paquetes en `package.json` y la ausencia de sentencias `import` que los referencien en el código fuente.
3. THE Game SHALL declarar en `package.json` cero dependencias de runtime (`dependencies`) nuevas más allá de las ya usadas por el Monolith_File (fuentes de Google Fonts vía `<link>`, que no constituyen un paquete de `package.json`).
4. Vite y sus dependencias asociadas, requeridas por el Requirement 4, SHALL considerarse ya aprobadas por el usuario como `devDependencies` de esta migración, y no están sujetas a la aprobación adicional del criterio 5.
5. IF se requiere agregar cualquier dependencia nueva de runtime (`dependencies`) o de desarrollo (`devDependencies`) distinta de Vite y sus dependencias asociadas, THEN THE Game SHALL abstenerse de incorporarla hasta obtener aprobación explícita del usuario.
