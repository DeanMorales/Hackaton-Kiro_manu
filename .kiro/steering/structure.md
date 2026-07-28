# Estructura del proyecto

## Estado actual (arquitectura modular)

```
Hackaton-Kiro/
├── README.md
├── CONTRIBUTING.md
├── index.html                 ← punto de entrada HTML (Vite)
├── package.json                ← dependencias y scripts (Vite, Vitest, fast-check)
├── torre-de-las-nubes.html    ← monolito histórico, CONGELADO (ver nota abajo)
├── src/
│   ├── data/          # AWS_SERVICES, banco de preguntas (QUESTIONS), bossRoster, playerName, scoreManager/scoreStore
│   ├── audio/         # sfx.js, music.js, combatSfx.js, milestoneSfx.js (Web Audio API + archivos de audio)
│   ├── engine/        # tower.js — estado y física de la torre (pisos, bloque en movimiento, velocidad, plataformas)
│   ├── combat/        # fight.js — lógica del duelo contra el guardián (cartas, pips, dificultad)
│   ├── render/        # draw.js, bossFightRender.js, spriteEngine.js — dibujo en canvas
│   ├── ui/            # screens.js, leaderboard.js, celebration.js, modalState.js — overlays DOM y HUD
│   ├── integration/   # tests de integración entre módulos
│   └── main.js        # bucle principal, wiring de todos los módulos
├── public/
│   └── sprites/, audio/  # assets estáticos servidos por Vite
└── .kiro/
    ├── steering/      ← este directorio (contexto persistente)
    └── specs/         ← specs de features/bugfix (una carpeta por spec, con requirements.md/design.md/tasks.md)
```

Cada módulo de `src/` sigue el patrón "lógica pura, sin efectos secundarios de UI": `engine/`, `combat/` y `data/` no tocan el DOM ni el audio directamente; esas responsabilidades viven en `ui/`, `render/`, `audio/` y se orquestan desde `main.js`.

## Nota histórica: el monolito (`torre-de-las-nubes.html`)

El proyecto comenzó como un único archivo HTML con CSS y JavaScript inline (todo en un `<script>` IIFE). Ese archivo (`torre-de-las-nubes.html`) permanece en el repositorio pero está **congelado**: no se modifica ni se mantiene en paralelo con `src/`. Toda la lógica de juego vigente vive exclusivamente en la arquitectura modular bajo `src/`. La migración completa se documentó en el spec `modular-architecture-migration`.

## Convención para specs (`.kiro/specs/`)

Cada feature o bugfix nuevo vive en `.kiro/specs/{nombre-en-kebab-case}/` con:
- `requirements.md`
- `design.md`
- `tasks.md`

Los specs se crean incrementalmente: no se reescribe código de juego sin pasar primero por un spec aprobado, salvo cambios triviales explícitamente solicitados fuera del flujo de spec. Los specs de tipo bugfix siguen la metodología de "bug condition": un test que falla ANTES del fix (confirmando el bug) y tests de preservación que ya pasan antes del fix (documentando el comportamiento a proteger).

## Convención de módulos (vigente)

- `src/data/`: servicios AWS, banco de preguntas por dificultad/dominio del examen, roster de jefes, gestión de nombre de jugador y de puntuaciones.
- `src/engine/`: única fuente de verdad del estado de la torre (`state`), funciones puras extraídas para property-based testing.
- `src/combat/`: estado y lógica del duelo, sin dependencias de `engine/` ni del DOM.
- `src/render/`: todo el dibujo en `<canvas>` (mundo de juego y arena de combate).
- `src/ui/`: toda la manipulación de overlays/HUD del DOM.
- `src/audio/`: síntesis y reproducción de efectos de sonido y música.
- `src/main.js`: el único módulo que importa y conecta (wiring) todos los demás; contiene el bucle principal (`requestAnimationFrame`).
