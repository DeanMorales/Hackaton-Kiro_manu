# 🏰 Torre de las Nubes — Duelo AWS

Juego de navegador tipo "stack tower": construye una torre piso a piso mientras tu caballero asciende. Cada 5 pisos aparece una puerta que activa un duelo por turnos contra un "guardián" temático de AWS, resuelto respondiendo preguntas de opción múltiple sobre servicios de AWS (EC2, S3, Lambda, DynamoDB, VPC, IAM, y más).

## 📋 Índice

- [👥 Equipo](#-equipo)
- [🧭 ¿Por qué Kiro?](#-por-qué-kiro)
  - [Desarrollo dirigido por specs](#desarrollo-dirigido-por-specs-spec-driven-development)
  - [El MCP de documentación de AWS](#el-mcp-de-documentación-de-aws)
  - [El uso correcto de specs para features y para bugs](#el-uso-correcto-de-specs-para-features-y-para-bugs)
  - [La importancia del steering](#la-importancia-del-steering)
- [🎯 Objetivos del proyecto](#-objetivos-del-proyecto)
- [🏆 Formulario de descripción del proyecto (para el concurso)](#-formulario-de-descripción-del-proyecto-para-el-concurso)
- [📋 Prerrequisitos](#-prerrequisitos)
- [🚀 Inicio Rápido](#-inicio-rápido)
- [🎮 Ejecución](#-ejecución)
- [📜 Scripts disponibles](#-scripts-disponibles)
- [📁 Estructura del proyecto](#-estructura-del-proyecto)
- [🛠️ Tecnologías](#️-tecnologías)
- [🎥 Evidencia del proyecto](#-evidencia-del-proyecto-capturas-y-video)
- [🌐 Compatibilidad](#-compatibilidad)
- [🤝 Contribuir](#-contribuir)
- [📝 Licencia](#-licencia)

## 👥 Equipo

**Hackathon Kiro - Equipo 81**

Para contribuir al proyecto, lee primero [CONTRIBUTING.md](./CONTRIBUTING.md) que contiene las guías de colaboración y flujo de trabajo con Git.

## 🧭 ¿Por qué Kiro?

Kiro no se usó solo como "un autocompletado más inteligente". Se usó como el proceso de trabajo del equipo: cada cambio no trivial en este repositorio nació como un spec antes de ser código, y Kiro estuvo configurado con acceso directo a documentación oficial de AWS para que el contenido educativo del juego fuera confiable. A continuación explicamos cómo, con evidencia concreta del propio repositorio.

### Desarrollo dirigido por specs (Spec-Driven Development)

Este repositorio tiene **19 specs** bajo `.kiro/specs/`, cada uno en su propia carpeta con `requirements.md`/`bugfix.md`, `design.md` y `tasks.md`. Ninguno de estos cambios se escribió primero como código y se documentó después: el flujo fue siempre requisitos → diseño → tareas.

Para **features nuevas**, el flujo de Kiro exige:
1. `requirements.md` en formato EARS (Easy Approach to Requirements Syntax, con cláusulas `WHEN`/`THE ... SHALL`/`IF ... THEN`), incluyendo un glosario de términos del dominio.
2. `design.md`, que traduce esos requisitos en arquitectura concreta y define **Correctness Properties** explícitas: propiedades que el código debe cumplir para todo input válido, no solo para un ejemplo.
3. `tasks.md`, un plan de implementación incremental donde cada tarea es pequeña, verificable, y (cuando aplica) incluye su propio test de propiedad antes de considerarse completa.

Ejemplos reales de specs de feature en este repo: `dificultad-progresiva-preguntas` (dificultad progresiva de las preguntas según el piso/jefe), `endless-tower-difficulty-cap` (límite de dificultad en la torre infinita), `combat-animation-sfx` (animaciones y efectos de sonido de combate), `modal-pregunta-tarjeta` (rediseño del modal de preguntas) y `global-leaderboard` (tabla de puntuaciones global).

Para **bugfixes**, Kiro usa un flujo distinto y deliberadamente más estricto: la metodología de **"bug condition"**. En vez de arrancar con requisitos de una funcionalidad nueva, un `bugfix.md` documenta tres bloques obligatorios:
- **Current Behavior (Defect)**: qué hace el código hoy, mal, con criterios numerados y verificables.
- **Expected Behavior (Correct)**: qué debería hacer en su lugar.
- **Unchanged Behavior (Regression Prevention)**: comportamiento correcto existente que la corrección NO debe romper.

En la práctica esto significa escribir primero un test que **debe fallar** contra el código sin corregir (demostrando que el bug es real y no una suposición), y solo después escribir el fix, verificado además contra tests de preservación que protegen el comportamiento correcto que ya existía. Ejemplos reales en este repo: `barra-vida-jefe-no-refleja` (la barra de vida del jefe no reflejaba los aciertos porque la vida inicial se calculaba mal, `ceil(cardCount / 2)` en lugar de un punto de vida por carta) y `relief-platform-width-collapse` (colapso del ancho de las plataformas de alivio).

Para un proyecto de hackathon construido bajo presión de tiempo, esto se traduce en una ventaja poco común: cada cambio queda documentado con su razón de ser, sus criterios de aceptación exactos, y property-based tests que se ejecutaron antes de dar por completada la tarea — en lugar de la deuda de documentación y de tests que suele acumularse cuando se corre contra el reloj.

### El MCP de documentación de AWS

El archivo `.kiro/settings/mcp.json` de este proyecto configura un servidor MCP (Model Context Protocol) llamado `aws-docs`, que ejecuta `awslabs.aws-documentation-mcp-server` vía `uvx`:

```json
{
  "mcpServers": {
    "aws-docs": {
      "command": "uvx",
      "args": ["awslabs.aws-documentation-mcp-server@latest"],
      "env": { "FASTMCP_LOG_LEVEL": "ERROR" },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Esto le da a Kiro acceso directo a la documentación oficial de AWS al momento de redactar contenido. Se usó específicamente para construir y verificar el banco de preguntas (`QUESTIONS` en `src/data/services.js`), de forma que las preguntas de dificultad media y difícil no se inventaran "de memoria" sino que estuvieran ancladas en documentación real de cada servicio — reduciendo el riesgo de información sutilmente incorrecta o desactualizada sobre AWS, algo que le importa mucho a una herramienta de estudio.

El spec `dificultad-progresiva-preguntas` documenta explícitamente esta exigencia: las preguntas de nivel medio y difícil deben redactarse "con un enunciado orientado a escenario... conforme al estilo del Examen Cloud Practitioner (CLF-C02)", y el banco de preguntas debe cubrir, a lo largo de todos los servicios, los cuatro dominios reales del examen AWS Certified Cloud Practitioner (CLF-C02): **Conceptos de la Nube** (~24%), **Seguridad y Cumplimiento** (~30%), **Tecnología y Servicios en la Nube** (~34%) y **Facturación, Precios y Soporte** (~12%).

### El uso correcto de specs para features y para bugs

Usar el flujo equivocado para cada situación es fácil y costoso: aplicar un flujo de feature completo (con Correctness Properties de diseño) a un bug de una línea es sobre-ingeniería; y "arreglar" una mecánica nueva sin especificar primero su diseño y sus casos límite es sub-especificación que termina en re-trabajo.

Kiro separa ambos casos deliberadamente:
- El flujo de **feature** (requirements-first) invierte el esfuerzo en decidir el comportamiento y sus criterios de aceptación *antes* de que exista código, lo que evita construir mecánicas nuevas sobre supuestos no verificados.
- El flujo de **bugfix** invierte el esfuerzo en **demostrar** que el bug existe (con un test que falla en el código actual) antes de tocar nada, y luego en demostrar que la corrección no rompe nada más (tests de preservación). Esto evita tanto los fixes superficiales que no atacan la causa real, como las correcciones que arreglan un síntoma y rompen otro.

En este repositorio, esa distinción se ve en la mezcla real de specs: la mayoría son features (`sonido-ataque-guerrero`, `boss-fight-sprite-animations`, `tower-progression-scaling`, `background-music-controls`, entre otros) y un subconjunto está marcado explícitamente como bugfix (`barra-vida-jefe-no-refleja`, `relief-platform-width-collapse`), cada uno con su `.config.kiro` indicando `"specType": "bugfix"`.

### La importancia del steering

Los archivos en `.kiro/steering/` (`product.md`, `structure.md`, `tech.md`) funcionan como la memoria persistente del proyecto: Kiro los lee al empezar cada sesión de trabajo, así que decisiones arquitectónicas importantes no hay que re-explicarlas — ni arriesgarse a violarlas por accidente — en cada conversación nueva.

El ejemplo más concreto de esto es el propio historial del proyecto: `Torre de las Nubes` comenzó como un único archivo HTML monolítico (`torre-de-las-nubes.html`, con CSS y JavaScript inline en un IIFE). El spec `modular-architecture-migration` documentó la migración completa a una arquitectura modular con módulos ES y Vite bajo `src/`. Una vez migrado, `torre-de-las-nubes.html` quedó **congelado**: ningún spec ni tarea posterior lo modifica, y `structure.md` y `tech.md` lo dejan explícito para que ninguna sesión futura de Kiro (ni ningún miembro del equipo) intente "arreglar" o duplicar lógica ahí por error.

De hecho, `structure.md` y `tech.md` fueron actualizados como parte de este mismo esfuerzo de documentación, para reflejar con precisión la arquitectura modular ya completada (las subcarpetas reales de `src/`, las convenciones de testing con Vitest + fast-check, etc.). Es un buen ejemplo de que el steering no es un artefacto que se escribe una vez y se olvida, sino un documento vivo que se mantiene al día junto con el código.

## 🎯 Objetivos del proyecto

Queremos ayudar a que la gente repase sus conocimientos de AWS de una forma entretenida y hasta un poco adictiva, construyendo confianza real de cara a un examen del nivel del AWS Certified Cloud Practitioner. La idea no es solo "poner preguntas en una pantalla": es que subir la torre y enfrentar a cada guardián se sienta como un reto que quieres superar, y que al hacerlo salgas con la sensación de que sí entendiste el servicio de AWS que acabas de repasar, no solo de que memorizaste una respuesta.

## 🏆 Formulario de descripción del proyecto (para el concurso)

### ¿En cuál reto o vertical enfocaron su proyecto?

- [x] Videojuegos
- [ ] Aplicaciones web
- [ ] Agentes especializados
- [ ] Productividad para desarrolladores

### ¿Qué problema soluciona su proyecto?

Estudiar para una certificación como el AWS Certified Cloud Practitioner suele reducirse a leer documentación densa o hacer baterías de preguntas sueltas, sin ningún elemento que sostenga la motivación a lo largo del repaso. Torre de las Nubes convierte ese repaso en un juego: construir la torre y ganar duelos contra guardianes exige responder correctamente preguntas de opción múltiple sobre servicios reales de AWS, con una dificultad que progresa a medida que el jugador avanza (los pisos más altos y los jefes posteriores presentan preguntas de nivel medio y difícil, organizadas según los cuatro dominios reales del temario CLF-C02: Conceptos de la Nube, Seguridad y Cumplimiento, Tecnología y Servicios en la Nube, y Facturación/Precios/Soporte). El resultado es una forma de repaso activo, con retroalimentación inmediata (aciertos dañan al jefe, errores dañan al jugador) que mantiene el interés del estudiante en vez de depender solo de su fuerza de voluntad.

### ¿Por qué consideras(n) que su proyecto debería ser el ganador? ¿Cuáles son sus mayores fortalezas?

- **Rigor de desarrollo poco común para el tamaño del equipo**: 19 specs documentados, cada uno con requisitos formales (EARS), diseño con Correctness Properties explícitas, y tareas verificadas con tests unitarios y property-based tests (Vitest + fast-check) antes de darse por completadas. Los bugs se corrigieron con la metodología de "bug condition" (test que falla antes del fix, tests de preservación después), no a base de parches ad-hoc.
- **Contenido educativo verificado, no inventado**: el banco de preguntas se redactó y verificó usando el MCP de documentación oficial de AWS, alineando las preguntas de dificultad media/difícil con el estilo real del examen CLF-C02 y sus cuatro dominios de contenido.
- **Un bucle de juego genuinamente atractivo como mecanismo de estudio**: la combinación de construir la torre (mecánica de habilidad, tipo stack tower) con duelos de preguntas contra jefes temáticos de AWS da al repaso una tensión y un ritmo que una lista de flashcards no tiene.
- **Atención a compatibilidad y experiencia del jugador ya en marcha**: soporte explícito para las últimas versiones de Chrome, Firefox, Edge y Safari (escritorio y móvil), con degradación elegante si Web Audio API no está disponible.

### Comentarios adicionales

Este proyecto nació de la idea de que repasar para una certificación de AWS no tiene por qué sentirse como una obligación aburrida. Nos importa que quien juegue Torre de las Nubes termine cada sesión con un poco más de confianza real sobre los servicios que acaba de repasar, y que llegar a la cima de la torre se sienta como una recompensa genuina, no solo como una partida más. Gracias por revisar nuestro proyecto.

## 📋 Prerrequisitos

- **Node.js** versión 18.x o superior
- Gestor de paquetes: `npm` (incluido con Node.js) o `yarn`/`pnpm`

## 🚀 Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone git@github.com:DeanMorales/Hackaton-Kiro_manu.git
cd Hackaton-Kiro_manu
```

### 2. Instalar dependencias

```bash
npm install
```

## 🎮 Ejecución

### Modo desarrollo

Inicia el servidor de desarrollo con recarga automática:

```bash
npm run dev
```

El juego estará disponible en `http://localhost:5173/` (o el puerto que indique la terminal).

### Build de producción

Genera los archivos estáticos optimizados para producción:

```bash
npm run build
```

Los archivos se generan en el directorio `dist/`.

### Previsualizar el build

Sirve el build de producción localmente para probarlo:

```bash
npm run preview
```

### Método anterior (ya no soportado)

⚠️ **Importante**: El método anterior de abrir `torre-de-las-nubes.html` directamente con doble clic **ya no está soportado** tras la migración a módulos ES y Vite.

Las dos rutas válidas de ejecución son:
1. **Modo desarrollo**: `npm run dev` (recomendado para desarrollo)
2. **Build + servidor estático**: `npm run build` + servir el directorio `dist/` con cualquier servidor de archivos estáticos

## 📜 Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Genera el build de producción
- `npm run preview` - Previsualiza el build de producción
- `npm test` - Ejecuta los tests (Vitest)
- `npm run check-circular` - Verifica que no haya imports circulares (requiere `madge` instalado)

## 📁 Estructura del proyecto

```
Hackaton-Kiro/
├── README.md
├── CONTRIBUTING.md
├── index.html                 ← punto de entrada HTML (Vite)
├── package.json                ← dependencias y scripts (Vite, Vitest, fast-check)
├── torre-de-las-nubes.html    ← monolito histórico, CONGELADO (no se modifica)
├── src/
│   ├── data/          # AWS_SERVICES, banco de preguntas (QUESTIONS), bossRoster, playerName, scoreManager/scoreStore
│   ├── audio/         # sfx.js, music.js, combatSfx.js, milestoneSfx.js (Web Audio API + archivos de audio)
│   ├── engine/        # tower.js — estado y física de la torre (pisos, bloque en movimiento, velocidad, plataformas)
│   ├── combat/        # fight.js — lógica del duelo contra el guardián (cartas, pips, dificultad)
│   ├── render/        # draw.js, bossFightRender.js, spriteEngine.js — dibujo en canvas
│   ├── ui/            # screens.js, leaderboard.js, celebration.js, modalState.js — overlays DOM y HUD
│   ├── integration/   # tests de integración entre módulos
│   └── main.js        # bucle principal, wiring de todos los módulos
├── public/            # sprites/, audio/ — assets estáticos servidos por Vite
└── .kiro/
    ├── steering/      # contexto persistente (product.md, structure.md, tech.md)
    └── specs/         # specs de features/bugfix (requirements.md o bugfix.md, design.md, tasks.md)
```

Cada módulo de `src/` sigue el patrón "lógica pura, sin efectos secundarios de UI": `engine/`, `combat/` y `data/` no tocan el DOM ni el audio directamente; esas responsabilidades viven en `ui/`, `render/`, `audio/` y se orquestan desde `main.js`.

## 🛠️ Tecnologías

- **JavaScript vanilla (ES6+) en módulos ES**: sin frameworks UI ni TypeScript.
- **Vite**: build tool y servidor de desarrollo.
- **Vitest + fast-check**: framework de testing y de property-based testing. Cada módulo relevante de lógica de motor/combate tiene su archivo `*.test.js` con tests unitarios y property-based tests (mínimo 100 ejecuciones por propiedad), y cada `design.md` de un spec define Correctness Properties explícitas que se verifican con estos tests antes de considerar una tarea completa.
- **Canvas 2D**: renderizado del mundo del juego (torre, bloques, caballero) y de la arena de combate.
- **Web Audio API**: síntesis de efectos de sonido en tiempo real, combinada con archivos de audio pregrabados para combate y música.

## 🎥 Evidencia del proyecto (capturas y video)

### Capturas de pantalla

### Video

## 🌐 Compatibilidad

El juego funciona en las últimas versiones estables de:
- Chrome (escritorio y Android)
- Firefox
- Edge
- Safari (escritorio e iOS)

Requiere soporte para Canvas 2D y ES modules nativos. Web Audio API es opcional (el juego funciona sin sonido si no está disponible).

## 🤝 Contribuir

Lee nuestra [Guía de Contribución](./CONTRIBUTING.md) para conocer:
- Flujo de trabajo con Git (branching strategy)
- Convención de commits
- Proceso de Pull Requests
- Code review
- Mejores prácticas del equipo

## 📝 Licencia

Este proyecto fue desarrollado para el Hackathon Kiro.

---

**¿Preguntas?** Contacta al equipo o abre un issue en GitHub.
