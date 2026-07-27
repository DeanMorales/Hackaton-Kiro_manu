# Requirements Document

## Introduction

Esta feature, "dificultad-progresiva-preguntas", introduce dificultad progresiva en las preguntas de opción múltiple del juego "Torre de las Nubes — Duelo AWS". Hoy, cada pregunta del banco `QUESTIONS` (indexado por servicio de AWS) se selecciona de forma aleatoria y todas se tratan como equivalentes, sin importar cuántos pisos ha subido el jugador ni contra qué guardián combate. El objetivo es que, a medida que el jugador avanza (pisos más altos / jefes posteriores), las preguntas presentadas sean más difíciles, ofreciendo una curva de aprendizaje y un reto crecientes.

Para lograrlo, cada pregunta del banco recibirá un nivel de dificultad, el juego mapeará el progreso del jugador (nivel de jefe) a un nivel de dificultad objetivo, y la selección de preguntas respetará ese nivel objetivo con reglas claras de reserva (fallback) cuando no existan preguntas suficientes en el nivel deseado. Todos los servicios de AWS del banco se tratan por igual: cada servicio definido en `AWS_SERVICES` (la lista completa de servicios del examen AWS Certified Cloud Practitioner, CLF-C02) debe contar con la misma cobertura mínima de preguntas por nivel de dificultad, y ningún servicio recibe prioridad o mayor peso sobre otro al seleccionar qué servicios aparecen en un combate. Todo el contenido de cara al usuario permanece en español para mantener la consistencia del juego. La implementación se mantiene en JavaScript vanilla, organizada en módulos ES bajo `src/`, sin añadir dependencias externas de tiempo de ejecución.

## Glossary

- **Juego**: La aplicación "Torre de las Nubes — Duelo AWS" que se ejecuta en el navegador. Su implementación vigente reside en los módulos ES bajo `src/` (por ejemplo, `src/data/services.js`); el monolito congelado `torre-de-las-nubes.html` no se modifica.
- **AWS_SERVICES**: La lista de servicios de AWS definida en `src/data/services.js`, que cubre todos los servicios del Examen_Cloud_Practitioner (CLF-C02) agrupados por dominio (Cómputo, Almacenamiento, Bases de datos, Redes, Seguridad, Administración, Integración, Analítica, IA/ML, Herramientas de desarrollo, Migración y Facturación). Cada servicio se identifica por un id único.
- **Banco_De_Preguntas**: La estructura de datos `QUESTIONS`, indexada por identificador de servicio de AWS, que contiene las preguntas de opción múltiple para todos los servicios definidos en AWS_SERVICES (es decir, todos los servicios del Examen_Cloud_Practitioner, CLF-C02), sin limitarse a un subconjunto fijo de servicios.
- **Pregunta**: Un elemento del Banco_De_Preguntas compuesto por un enunciado, un arreglo de opciones y el índice de la opción correcta.
- **Nivel_De_Dificultad**: Un valor entero ordinal que clasifica la dificultad de una Pregunta. Los valores válidos son 1 (fácil), 2 (media) y 3 (difícil).
- **Nivel_De_Jefe**: El entero mayor o igual a 1 que identifica el combate actual contra un guardián, calculado a partir de la cantidad de puertas superadas (una puerta cada 5 pisos).
- **Selector_De_Preguntas**: El componente lógico (equivalente a la función `pickQuestion`) responsable de elegir una Pregunta para una carta de combate.
- **Mapeador_De_Dificultad**: El componente lógico que traduce un Nivel_De_Jefe a un Nivel_De_Dificultad objetivo.
- **Nivel_De_Dificultad_Objetivo**: El Nivel_De_Dificultad que el Mapeador_De_Dificultad determina para un Nivel_De_Jefe dado.
- **Carta**: Un elemento de la interfaz de combate que muestra un servicio de AWS y su Pregunta asociada.
- **Combate**: El duelo por turnos contra un guardián que se activa al cruzar una puerta.
- **Examen_Cloud_Practitioner (CLF-C02)**: El examen AWS Certified Cloud Practitioner (código CLF-C02), cuyo temario se organiza en cuatro dominios de contenido —Conceptos de la Nube (~24%), Seguridad y Cumplimiento (~30%), Tecnología y Servicios en la Nube (~34%) y Facturación, Precios y Soporte (~12%)— y cuyas preguntas son de opción múltiple o de respuesta múltiple, orientadas a escenarios y enfocadas en la comprensión fundamental de los servicios de AWS y su propuesta de valor.

## Requirements

### Requirement 1: Clasificación de dificultad en el banco de preguntas

**User Story:** Como diseñador del juego, quiero que cada pregunta tenga un nivel de dificultad asignado, para poder ofrecer preguntas más difíciles a medida que el jugador avanza.

#### Acceptance Criteria

1. THE Banco_De_Preguntas SHALL asociar a cada Pregunta un Nivel_De_Dificultad con valor 1, 2 o 3.
2. THE Banco_De_Preguntas SHALL contener, para cada servicio de AWS definido en AWS_SERVICES, al menos 8 Preguntas de Nivel_De_Dificultad 1, al menos 10 Preguntas de Nivel_De_Dificultad 2 y al menos 5 Preguntas de Nivel_De_Dificultad 3.
3. THE Banco_De_Preguntas SHALL mantener todos los enunciados y opciones de las Preguntas en español.
4. IF una Pregunta carece de un Nivel_De_Dificultad asignado, THEN THE Juego SHALL tratar esa Pregunta como Nivel_De_Dificultad 1.
5. THE Banco_De_Preguntas SHALL aplicar la misma cobertura mínima de Preguntas por Nivel_De_Dificultad a cada servicio definido en AWS_SERVICES, sin exigir a ningún servicio una cantidad de Preguntas mayor que a otro.
6. WHEN el Juego selecciona qué servicios de AWS aparecen en un Combate, THE Juego SHALL elegir los servicios de forma aleatoria uniforme entre los servicios definidos en AWS_SERVICES, sin priorizar ni asignar mayor peso a ningún servicio sobre otro.

### Requirement 2: Mapeo de progreso a dificultad objetivo

**User Story:** Como jugador, quiero que las preguntas se vuelvan más difíciles conforme subo la torre y enfrento jefes posteriores, para que el reto crezca con mi progreso.

#### Acceptance Criteria

1. WHEN inicia un Combate, THE Mapeador_De_Dificultad SHALL calcular un Nivel_De_Dificultad_Objetivo a partir del Nivel_De_Jefe.
2. THE Mapeador_De_Dificultad SHALL asignar Nivel_De_Dificultad_Objetivo 1 cuando el Nivel_De_Jefe sea 1.
3. THE Mapeador_De_Dificultad SHALL asignar Nivel_De_Dificultad_Objetivo 2 cuando el Nivel_De_Jefe sea 2.
4. THE Mapeador_De_Dificultad SHALL asignar Nivel_De_Dificultad_Objetivo 3 cuando el Nivel_De_Jefe sea mayor o igual a 3.
5. THE Mapeador_De_Dificultad SHALL producir un Nivel_De_Dificultad_Objetivo que sea monótonamente no decreciente respecto al Nivel_De_Jefe.
6. THE Mapeador_De_Dificultad SHALL producir un Nivel_De_Dificultad_Objetivo dentro del rango de 1 a 3 inclusive para todo Nivel_De_Jefe mayor o igual a 1.

### Requirement 3: Selección de preguntas por dificultad objetivo

**User Story:** Como jugador, quiero que las cartas de un combate muestren preguntas acordes al nivel de dificultad de ese combate, para percibir una progresión coherente.

#### Acceptance Criteria

1. WHEN el Selector_De_Preguntas elige una Pregunta para una Carta, THE Selector_De_Preguntas SHALL recibir un Nivel_De_Dificultad_Objetivo.
2. WHERE existe al menos una Pregunta del servicio solicitado con Nivel_De_Dificultad igual al Nivel_De_Dificultad_Objetivo, THE Selector_De_Preguntas SHALL devolver una Pregunta cuyo Nivel_De_Dificultad sea igual al Nivel_De_Dificultad_Objetivo.
3. IF no existe ninguna Pregunta del servicio solicitado con Nivel_De_Dificultad igual al Nivel_De_Dificultad_Objetivo, THEN THE Selector_De_Preguntas SHALL devolver una Pregunta del servicio solicitado con el Nivel_De_Dificultad disponible más cercano y menor al Nivel_De_Dificultad_Objetivo.
4. IF no existe ninguna Pregunta del servicio solicitado con Nivel_De_Dificultad menor o igual al Nivel_De_Dificultad_Objetivo, THEN THE Selector_De_Preguntas SHALL devolver una Pregunta del servicio solicitado con el Nivel_De_Dificultad disponible más cercano y mayor al Nivel_De_Dificultad_Objetivo.
5. THE Selector_De_Preguntas SHALL devolver siempre una Pregunta válida del servicio solicitado mientras ese servicio tenga al menos una Pregunta en el Banco_De_Preguntas.
6. WHEN el Selector_De_Preguntas devuelve una Pregunta, THE Selector_De_Preguntas SHALL preservar el índice de la opción correcta tras reordenar (barajar) las opciones presentadas.

### Requirement 4: Consistencia de la dificultad dentro de un combate

**User Story:** Como jugador, quiero que todas las cartas de un mismo combate mantengan un nivel de dificultad coherente, para que la experiencia de un duelo sea uniforme.

#### Acceptance Criteria

1. WHEN inicia un Combate, THE Juego SHALL usar el mismo Nivel_De_Dificultad_Objetivo para seleccionar la Pregunta de cada Carta de ese Combate.
2. WHEN una Carta se recicla tras una respuesta correcta durante un Combate, THE Juego SHALL seleccionar la nueva Pregunta usando el Nivel_De_Dificultad_Objetivo vigente de ese Combate.
3. WHILE un Combate está en curso, THE Juego SHALL mantener constante el Nivel_De_Dificultad_Objetivo de ese Combate.

### Requirement 5: Indicación visual del nivel de dificultad

**User Story:** Como jugador, quiero ver el nivel de dificultad del combate actual, para entender por qué las preguntas se vuelven más retadoras.

#### Acceptance Criteria

1. WHEN se muestra la pantalla de Combate, THE Juego SHALL mostrar una indicación en español del Nivel_De_Dificultad_Objetivo vigente usando las etiquetas "Fácil" para el nivel 1, "Media" para el nivel 2 y "Difícil" para el nivel 3.
2. WHEN cambia el Nivel_De_Dificultad_Objetivo entre Combates sucesivos, THE Juego SHALL actualizar la indicación de dificultad mostrada para reflejar el nuevo nivel.
3. IF la indicación de dificultad no puede mostrarse, THEN THE Juego SHALL continuar el Combate sin la indicación de dificultad.

### Requirement 6: Preservación del comportamiento existente del juego

**User Story:** Como jugador, quiero que la mecánica de apilar bloques y de combate siga funcionando igual que antes, para que la dificultad progresiva no rompa el resto del juego.

#### Acceptance Criteria

1. THE Juego SHALL conservar la mecánica existente de conteo de puertas de una puerta cada 5 pisos.
2. THE Juego SHALL conservar la relación existente entre el Nivel_De_Jefe y la cantidad de Cartas del Combate.
3. THE Juego SHALL conservar el comportamiento existente en el que una respuesta correcta daña al jefe y una respuesta incorrecta daña al jugador.
4. THE Juego SHALL mantener la implementación en JavaScript vanilla dentro de los módulos ES bajo `src/` sin añadir dependencias externas de tiempo de ejecución.
5. THE Juego SHALL conservar el monolito congelado `torre-de-las-nubes.html` sin modificarlo como parte de esta feature.

### Requirement 7: Semejanza de las preguntas de dificultad media y difícil con el examen Cloud Practitioner (CLF-C02)

**User Story:** Como jugador que estudia para la certificación AWS Certified Cloud Practitioner, quiero que las preguntas de dificultad media y difícil se asemejen al examen real, para practicar con material representativo del examen.

#### Acceptance Criteria

1. THE Banco_De_Preguntas SHALL asignar a cada Pregunta de Nivel_De_Dificultad 2 uno de los cuatro dominios de contenido del Examen_Cloud_Practitioner (CLF-C02): Conceptos de la Nube, Seguridad y Cumplimiento, Tecnología y Servicios en la Nube, o Facturación, Precios y Soporte.
2. THE Banco_De_Preguntas SHALL asignar a cada Pregunta de Nivel_De_Dificultad 3 uno de los cuatro dominios de contenido del Examen_Cloud_Practitioner (CLF-C02): Conceptos de la Nube, Seguridad y Cumplimiento, Tecnología y Servicios en la Nube, o Facturación, Precios y Soporte.
3. THE Banco_De_Preguntas SHALL redactar cada Pregunta de Nivel_De_Dificultad 2 y de Nivel_De_Dificultad 3 con un enunciado orientado a escenario que evalúe la comprensión fundamental de los servicios de AWS o su propuesta de valor, conforme al estilo del Examen_Cloud_Practitioner (CLF-C02).
4. THE Banco_De_Preguntas SHALL presentar cada Pregunta de Nivel_De_Dificultad 2 y de Nivel_De_Dificultad 3 como una Pregunta de opción múltiple con exactamente 4 opciones y un único índice de opción correcta, de forma consistente con el formato existente del Banco_De_Preguntas.
5. THE Banco_De_Preguntas SHALL mantener en español los enunciados y las opciones de todas las Preguntas de Nivel_De_Dificultad 2 y de Nivel_De_Dificultad 3.
6. WHERE una Pregunta es de Nivel_De_Dificultad 1, THE Banco_De_Preguntas SHALL permitir un enunciado introductorio o de definición sin exigir el formato de escenario del Examen_Cloud_Practitioner (CLF-C02).
7. THE Banco_De_Preguntas SHALL incluir, a lo largo de todo el conjunto de Preguntas de Nivel_De_Dificultad 2 y de Nivel_De_Dificultad 3 de todos los servicios definidos en AWS_SERVICES, al menos una Pregunta asociada a cada uno de los cuatro dominios de contenido del Examen_Cloud_Practitioner (CLF-C02), sin requerir una asignación de dominio por servicio más allá de lo establecido en los criterios anteriores.
