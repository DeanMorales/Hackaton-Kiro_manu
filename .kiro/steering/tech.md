# Stack técnico

## Estado actual
- **Todo en un solo archivo**: `torre-de-las-nubes.html` contiene HTML, CSS (`<style>`) y JavaScript (`<script>`) inline.
- **Sin build step**: no hay bundler, transpilador ni gestor de paquetes. Se abre el archivo directamente en el navegador.
- **Sin dependencias externas de JS**: 100% JavaScript vanilla (ES6+, IIFE `(function(){...})()`).
- **Fuentes externas**: Google Fonts (Cinzel, Space Grotesk) vía `<link>`.
- **Renderizado**: mezcla de dos capas:
  - Canvas 2D (`<canvas id="gameCanvas">`) para el mundo del juego (torre, bloques, caballero, cielo, nubes).
  - DOM/CSS para overlays de UI (pantallas de inicio, combate de jefe, game over) usando `clip-path` para el estilo "facetado" (gem-cut).
- **Audio**: sintetizado en tiempo real con Web Audio API (osciladores tipo beep), sin archivos de audio.
- **Bucle de juego**: `requestAnimationFrame` con `update(dt, ts)` + `render()`.
- **Estado global**: un objeto `state` mutable compartido por closures dentro de la IIFE; no hay gestión de estado formal (sin Redux/eventos tipados).

## Convenciones de código existentes
- camelCase para funciones y variables.
- Constantes en MAYÚSCULAS para datos estáticos (`AWS_SERVICES`, `QUESTIONS`, `BOSS_NAMES`, `DOOR_INTERVAL`, etc.).
- CSS con variables (`:root { --var: ... }`) para la paleta de colores.
- Comentarios de sección con bloques `/* ===== ... ===== */` para separar módulos lógicos (DATA, SFX, CANVAS SETUP, GAME STATE, INPUT, BOSS FIGHT, UPDATE LOOP, RENDER, MAIN LOOP).
- Nombres de IDs/clases en kebab-case para DOM (`#gameCanvas`, `.hud-pill`, `.card-front`).

## Dirección de modernización (a futuro, incremental vía specs)
- Migrar a arquitectura modular en archivos ES modules (separar: data/preguntas, motor de física/torre, combate, render canvas, UI DOM, audio, main).
- Introducir un pequeño gestor de estado/eventos para desacoplar lógica de juego de renderizado y DOM.
- Mantener cero dependencias pesadas salvo que el usuario apruebe explícitamente añadir un bundler (Vite) u otras librerías.
- Cualquier cambio de arquitectura grande se documenta primero como spec (`.kiro/specs/`) antes de tocar código.

## Cómo ejecutar / probar
- No requiere instalación. Abrir `torre-de-las-nubes.html` directamente en el navegador (doble clic o "Abrir con" un navegador moderno).
- No hay tests automatizados ni linter configurados todavía.
