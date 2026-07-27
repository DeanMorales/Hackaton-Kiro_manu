# Requirements Document

## Introduction

Este documento define los requisitos para el sistema de feedback visual y sonoro que celebra los hitos del jugador al vencer a un jefe (boss) en "Torre de las Nubes". El objetivo es reforzar la satisfacción del jugador mediante una combinación de animación de confeti, mensaje de piso y efectos de audio épicos activados en múltiplos de pisos significativos.

El sistema se activa exclusivamente después de que el jugador gana un combate contra un guardián (boss), es decir, al ejecutarse la rama `won === true` de `endFight()` en `src/main.js`. El número de piso utilizado para determinar el hito es `gameState.floors.length - 1` (el piso alcanzado al vencer al boss).

## Glosario

- **Celebration_System**: El módulo/conjunto de funciones responsable de orquestar el feedback visual y sonoro de hito.
- **Confetti_Overlay**: El elemento DOM que renderiza la animación de partículas de confeti sobre el Canvas.
- **Floor_Message**: El elemento DOM que muestra el texto grande de número de piso (ej. "PISO 15") durante la celebración.
- **Milestone_Sound_Player**: El componente de audio responsable de reproducir los archivos MP3 de celebración.
- **AWS_Palette**: Los colores de la paleta de certificaciones AWS ya definidos en las variables CSS del juego (`--aws`, `--gold`, `--teal`, `--success`, `--danger`, `--ink`, más los colores de los servicios AWS).
- **Epic_Sound**: El archivo de audio `public/audio/sonidosUI/epic_ congratulations_30.mp3`, activado en múltiplos de 30 pisos.
- **Milestone_Sound**: El archivo de audio `public/audio/sonidosUI/every_10_floors.mp3`, activado en múltiplos de 15 pisos (pero no en múltiplos de 30).
- **Floor_Number**: El valor `gameState.floors.length - 1` en el momento de vencer al boss, representando el piso alcanzado.
- **endFight**: La función en `src/main.js` que se ejecuta al terminar un combate; es el único punto de entrada para activar el Celebration_System.
- **Build_Screen**: La pantalla de construcción de la torre a la que se regresa tras vencer al boss.

## Requisitos

### Requisito 1: Animación de confeti al vencer un boss

**User Story:** Como jugador, quiero ver una lluvia de confeti colorida al vencer a un guardián, para sentir que he logrado algo importante y recibir recompensa visual inmediata.

#### Criterios de Aceptación

1. WHEN el jugador vence a un boss, THE Celebration_System SHALL mostrar el Confetti_Overlay sobre toda la pantalla de juego durante un mínimo de 2000 ms y un máximo de 4000 ms.
2. WHEN el Confetti_Overlay se activa, THE Celebration_System SHALL generar entre 80 y 150 partículas de confeti distribuidas horizontalmente a lo largo del ancho de pantalla.
3. WHEN el Confetti_Overlay se activa, THE Celebration_System SHALL animar cada partícula con caída hacia abajo, rotación aleatoria y una velocidad de caída entre 2 y 6 píxeles por fotograma.
4. WHEN el Confetti_Overlay se activa, THE Celebration_System SHALL asignar a cada partícula un color de la AWS_Palette (seleccionado aleatoriamente de: `#ff9f2e`, `#d9b34d`, `#3fa1a1`, `#59c27a`, `#e2493a`, `#f3ecd8`, `#6b4226`).
5. WHEN el Confetti_Overlay finaliza su duración máxima, THE Celebration_System SHALL eliminar el Confetti_Overlay del DOM sin dejar elementos residuales.
6. IF el navegador señala `prefers-reduced-motion: reduce`, THEN THE Celebration_System SHALL omitir la animación de confeti (no mostrar el Confetti_Overlay).

### Requisito 2: Mensaje de número de piso al vencer un boss

**User Story:** Como jugador, quiero ver un mensaje grande con el número del piso que acabo de superar, para saber exactamente qué hito he alcanzado en mi ascenso.

#### Criterios de Aceptación

1. WHEN el jugador vence a un boss, THE Celebration_System SHALL mostrar el Floor_Message con el texto "PISO {N}", donde N es el Floor_Number actual.
2. WHEN el Floor_Message se muestra, THE Celebration_System SHALL posicionarlo centrado horizontal y verticalmente en pantalla con un z-index mayor que el Canvas y los elementos HUD, pero menor que los overlays de combate.
3. WHEN el Floor_Message se muestra, THE Celebration_System SHALL aplicar la fuente `var(--font-display)` (Cinzel) con un tamaño de al menos 48px y el color `var(--gold)`.
4. WHEN el Floor_Message se muestra, THE Celebration_System SHALL mantenerlo visible durante un mínimo de 1800 ms y un máximo de 3000 ms antes de eliminarlo del DOM.
5. WHEN el Floor_Message finaliza su duración, THE Celebration_System SHALL eliminar el elemento Floor_Message del DOM sin dejar elementos residuales.
6. WHEN el Floor_Message se muestra simultáneamente con el Confetti_Overlay, THE Celebration_System SHALL mostrar el Floor_Message por encima del confeti (z-index mayor que el Confetti_Overlay).

### Requisito 3: Sonido épico en múltiplos de 30 pisos

**User Story:** Como jugador, quiero escuchar un sonido épico y especial cuando alcanzo un múltiplo de 30 pisos, para sentir que he conseguido un logro extraordinario en mi progreso.

#### Criterios de Aceptación

1. WHEN el jugador vence a un boss y el Floor_Number es múltiplo de 30 (30, 60, 90, 120, etc.), THE Milestone_Sound_Player SHALL reproducir el archivo Epic_Sound (`/audio/sonidosUI/epic_ congratulations_30.mp3`).
2. WHEN el Epic_Sound se reproduce, THE Milestone_Sound_Player SHALL iniciar la reproducción simultáneamente con la aparición del Confetti_Overlay y el Floor_Message.
3. WHEN el Floor_Number es múltiplo de 30, THE Milestone_Sound_Player SHALL reproducir únicamente el Epic_Sound y NO el Milestone_Sound del Requisito 4.
4. IF el archivo Epic_Sound no se puede cargar o reproducir, THEN THE Milestone_Sound_Player SHALL continuar la celebración visual sin sonido épico (degradación silenciosa).
5. THE Milestone_Sound_Player SHALL respetar el nivel de volumen y el estado de silencio configurados por el jugador en el panel de configuración de audio.

### Requisito 4: Sonido especial en múltiplos de 15 pisos (no múltiplos de 30)

**User Story:** Como jugador, quiero escuchar un sonido de celebración cuando alcanzo un múltiplo de 15 pisos que no sea múltiplo de 30, para reconocer los hitos intermedios de mi progreso.

#### Criterios de Aceptación

1. WHEN el jugador vence a un boss y el Floor_Number es múltiplo de 15 pero NO es múltiplo de 30 (15, 45, 75, 105, etc.), THE Milestone_Sound_Player SHALL reproducir el archivo Milestone_Sound (`/audio/sonidosUI/every_10_floors.mp3`).
2. WHEN el Milestone_Sound se reproduce, THE Milestone_Sound_Player SHALL iniciar la reproducción simultáneamente con la aparición del Confetti_Overlay y el Floor_Message.
3. WHEN el Floor_Number es múltiplo de 30, THE Milestone_Sound_Player SHALL NO reproducir el Milestone_Sound (el Epic_Sound tiene prioridad exclusiva según Requisito 3.3).
4. IF el archivo Milestone_Sound no se puede cargar o reproducir, THEN THE Milestone_Sound_Player SHALL continuar la celebración visual sin sonido de hito (degradación silenciosa).
5. THE Milestone_Sound_Player SHALL respetar el nivel de volumen y el estado de silencio configurados por el jugador en el panel de configuración de audio.

### Requisito 5: Activación exclusiva tras victoria en combate

**User Story:** Como desarrollador, quiero que el Celebration_System solo se active en el contexto correcto, para evitar interferencias con el flujo de juego existente.

#### Criterios de Aceptación

1. WHEN el jugador pierde un combate contra un boss, THE Celebration_System SHALL NOT activar el Confetti_Overlay, el Floor_Message ni ningún Milestone_Sound.
2. WHEN el jugador cae de la torre (game over por bloque), THE Celebration_System SHALL NOT activar el Confetti_Overlay, el Floor_Message ni ningún Milestone_Sound.
3. WHEN el Floor_Number al vencer al boss NO es múltiplo de 15, THE Celebration_System SHALL mostrar el Confetti_Overlay y el Floor_Message, pero NO reproducir ningún Milestone_Sound ni Epic_Sound.
4. WHILE el Confetti_Overlay está activo, THE Celebration_System SHALL permitir que el juego regrese a la Build_Screen y continúe normalmente (la celebración no bloquea el bucle de juego).
5. THE Celebration_System SHALL completar la reproducción de cualquier Milestone_Sound o Epic_Sound en curso incluso si el jugador comienza a construir antes de que el audio termine.

### Requisito 6: Integración con la arquitectura de audio existente

**User Story:** Como desarrollador, quiero que el Milestone_Sound_Player siga los mismos patrones del módulo `sfx.js` existente, para mantener consistencia arquitectónica y facilitar el mantenimiento.

#### Criterios de Aceptación

1. THE Milestone_Sound_Player SHALL precargar los archivos Epic_Sound y Milestone_Sound al inicializar el módulo, siguiendo el mismo patrón de precarga de `PRELOADED` en `src/audio/sfx.js`.
2. WHEN un archivo de audio de celebración falla al cargarse o reproducirse, THE Milestone_Sound_Player SHALL registrar el fallo con `console.error` y nunca propagar la excepción al llamador.
3. THE Milestone_Sound_Player SHALL exponer una función `playMilestoneAudio(floorNumber)` que encapsule la lógica de selección de sonido (Epic_Sound vs Milestone_Sound vs silencio) basada en el Floor_Number.
4. THE Milestone_Sound_Player SHALL integrarse en `src/audio/sfx.js` o en un nuevo módulo `src/audio/milestoneSfx.js`, manteniendo la separación de responsabilidades existente.
5. WHERE el sistema de configuración de audio del jugador está activo, THE Milestone_Sound_Player SHALL leer el volumen efectivo del contexto de audio compartido para aplicarlo a la reproducción de los archivos MP3 de celebración.
