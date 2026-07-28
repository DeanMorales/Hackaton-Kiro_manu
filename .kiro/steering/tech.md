# Stack técnico

## Estado actual (arquitectura modular con Vite)

- **JavaScript vanilla (ES6+) en módulos ES**: sin frameworks UI ni TypeScript. Cada archivo de `src/` es un ES module con `import`/`export`.
- **Vite** como build tool y servidor de desarrollo (`npm run dev`, `npm run build`, `npm run preview`).
- **Vitest + fast-check** para testing: cada módulo relevante tiene su archivo `*.test.js` junto al código, con tests unitarios y property-based tests (PBT) con un mínimo de 100 ejecuciones por propiedad.
- **Fuentes externas**: Google Fonts (Cinzel, Space Grotesk) vía `<link>` en `index.html`.
- **Renderizado**: mezcla de dos capas:
  - Canvas 2D (`<canvas id="gameCanvas">`, gestionado por `src/render/`) para el mundo del juego (torre, bloques, caballero, cielo, nubes) y la arena de combate (sprites del guerrero y los jefes).
  - DOM/CSS para overlays de UI (`src/ui/screens.js`), usando `clip-path` para el estilo "facetado" (gem-cut) definido en `index.html`.
- **Audio**: síntesis en tiempo real con Web Audio API más archivos de audio pregrabados para efectos de combate y música (`src/audio/`), servidos como assets estáticos desde `public/audio/`.
- **Sprites**: animaciones de personajes definidas en JSON (`public/sprites/`) y reproducidas por `src/render/spriteEngine.js`.
- **Bucle de juego**: `requestAnimationFrame` con `update(dt, ts)` + `render()`, orquestado desde `src/main.js`.
- **Estado global**: un objeto `state` mutable creado por `engine/tower.js` (`createTowerState`/`resetGame`) y pasado explícitamente entre módulos; no hay gestión de estado formal (sin Redux/eventos tipados) pero sí separación clara de responsabilidades por módulo.
- **Persistencia**: `localStorage` para el leaderboard local (`src/data/scoreStore.js`) y preferencias de audio/nombre de jugador.

## Convenciones de código vigentes

- camelCase para funciones y variables.
- Constantes en MAYÚSCULAS para datos estáticos (`AWS_SERVICES`, `QUESTIONS`, `BOSS_NAMES`, `DOOR_INTERVAL`, `BASE_PLATFORM_WIDTH`, etc.).
- CSS con variables (`:root { --var: ... }`) para la paleta de colores, definidas en `index.html`.
- Comentarios de encabezado `/* ===== NOMBRE_MODULO: descripción ===== */` al inicio de cada archivo de `src/`.
- Nombres de IDs/clases en kebab-case para DOM (`#gameCanvas`, `.hud-pill`, `.card-front`).
- Cada test de propiedad se etiqueta con un comentario `// Feature: <nombre-spec>, Property N: <texto de la propiedad>` que referencia el spec y la Correctness Property del `design.md` correspondiente.

## Herramientas y flujo de trabajo con Kiro

- **Specs dirigidos por requisitos** (`.kiro/specs/`): toda feature o bugfix no trivial pasa por `requirements.md` (formato EARS) → `design.md` (arquitectura, Correctness Properties) → `tasks.md` (plan de implementación incremental) antes de tocar código.
- **MCP de documentación de AWS** (`.kiro/settings/mcp.json`, servidor `awslabs.aws-documentation-mcp-server`): usado para consultar la documentación oficial de AWS al redactar y verificar las preguntas del banco `QUESTIONS`, de forma que el contenido de dificultad media/difícil se asemeje al temario real del examen AWS Certified Cloud Practitioner (CLF-C02).
- **Property-based testing (fast-check)** como práctica estándar para lógica de motor/combate: cada `design.md` define Correctness Properties explícitas, verificadas con PBT antes de considerar una tarea completa.

## El monolito histórico

`torre-de-las-nubes.html` (HTML + CSS + JS inline, sin build step) fue la versión original del proyecto. Permanece en el repositorio como referencia histórica pero está congelado: ningún spec ni tarea lo modifica. Toda evolución del juego ocurre exclusivamente en la arquitectura modular bajo `src/`.

## Cómo ejecutar / probar

- `npm install` (una vez) para instalar dependencias.
- `npm run dev` para el servidor de desarrollo con recarga en caliente.
- `npm run build` + servir `dist/` para producción.
- `npm test` para ejecutar la suite de Vitest (unitarios + PBT).
- `npm run check-circular` para verificar ausencia de imports circulares (requiere `madge`).
