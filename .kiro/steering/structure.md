# Estructura del proyecto

## Estado actual (monolito de un archivo)
```
Hackaton-Kiro_manu/
├── README.md
├── torre-de-las-nubes.html   ← HTML + CSS + JS, todo inline
└── .kiro/
    ├── steering/              ← este directorio (contexto persistente)
    └── specs/                 ← specs de features/bugfix (se crean bajo demanda)
```

## Mapa interno de `torre-de-las-nubes.html`
El archivo sigue un orden consistente que debe respetarse al editar o al planear una futura modularización:

1. **`<head>`**: metadatos, fuentes, `<style>` con variables CSS y todas las reglas (HUD, overlays, arena de combate, cartas, animaciones, media queries).
2. **`<body>`**: estructura DOM estática de las pantallas:
   - `#app` → `canvas#gameCanvas` (mundo de juego)
   - `#hud` (piso actual, contador de puerta)
   - `#startScreen` (reglas + botón iniciar)
   - `#bossScreen` (arena, barras de vida, `#cardsRow`)
   - `#gameOverScreen` (título, detalle, botón reintentar)
3. **`<script>` (IIFE)**, en este orden:
   - **DATA**: `AWS_SERVICES`, `QUESTIONS` (banco de preguntas por servicio), `BOSS_NAMES`, helpers `shuffle`/`pickQuestion`.
   - **SFX**: `beep()` + objeto `sfx` (Web Audio API).
   - **CANVAS SETUP**: `canvas`, `ctx`, `resize()`.
   - **GAME STATE**: constantes (`DOOR_INTERVAL`, `BASE_WIDTH`, `MIN_WIDTH`) y objeto `state` (torre, bloque en movimiento, cámara, caballero, nubes).
   - **INPUT**: `dropBlock()`, `triggerFall()`, `showGameOver()`, listeners de puntero/teclado/botones.
   - **BOSS FIGHT**: `fight` (estado del combate), `startBossFight()`, `renderPips()`, `renderCards()`, `onCardClick()`, `answerCard()`, `showBanner()`, `endFight()`.
   - **UPDATE LOOP**: `easeOutQuad()`, `update(dt, now)`.
   - **RENDER**: `drawSky()`, `drawCloud()`, `drawFacetedBlock()`, `drawTorch()`, `drawTower()`, `drawMovingBlock()`, `drawKnight()`, `render()`.
   - **MAIN LOOP**: `loop(ts)` + arranque (`resize()`, `requestAnimationFrame(loop)`).

## Convención para specs (`.kiro/specs/`)
Cada feature o bugfix nuevo vive en `.kiro/specs/{nombre-en-kebab-case}/` con:
- `requirements.md`
- `design.md`
- `tasks.md`

Los specs se crean incrementalmente: no se reescribe el archivo del juego sin pasar primero por un spec aprobado, salvo cambios triviales explícitamente solicitados fuera del flujo de spec.

## Convención al añadir nuevos módulos (una vez se modularice)
Cuando el proyecto pase de un solo HTML a múltiples archivos (ver `tech.md`), la estructura sugerida es:
```
src/
├── data/          (servicios AWS, preguntas)
├── engine/        (torre, física de bloques, cámara)
├── combat/        (lógica de duelo con el jefe)
├── render/        (dibujo en canvas)
├── ui/            (overlays DOM, HUD)
├── audio/         (sfx)
└── main.js        (bucle principal, wiring)
```
Esta migración solo se ejecuta cuando exista un spec explícito para ello.
