# Implementation Plan

## Overview

Este es un cambio puramente CSS: añadir, dentro del bloque `@media (max-width:520px)` ya existente en `index.html`, reglas que reduzcan `font-size` de `.crest`, `.panel h1`, `.subtitle`, `.rules li`, y `padding`/`font-size` de `.btn-primary`, sin modificar `.overlay-content`, `.panel{padding}` (ya existente), ni ningún archivo `.js`. No hay funciones puras ni transformaciones de datos sobre las que aplicar property-based testing (ver design.md, sección "Validation Approach"), por lo que no se incluyen tareas de PBT/fast-check. La verificación combina tests estáticos (regex sobre `index.html`, patrón `hudLayout.css.test.js`), tests DOM/jsdom para confirmar que no se rompe la funcionalidad de `#startBtn`/`#playerNameInput`, y una nota de QA manual para la verificación visual real.

- [x] 1. Escribir test de exploración de la condición de bug (código SIN fix)
  - **Property 1: Bug Condition** - Ausencia de reducción móvil en Panel_Element
  - **IMPORTANTE**: Escribir este test ANTES de implementar el fix
  - **OBJETIVO**: Confirmar mediante lectura estática de `index.html` que ninguno de los cinco selectores (`.crest`, `.panel h1`, `.subtitle`, `.rules li`, `.btn-primary`) tiene una regla dentro del bloque `@media (max-width:520px)` en el código actual, lo que demuestra que la condición de bug definida en design.md (`isBugCondition`) se cumple hoy para estos selectores
  - Crear `src/ui/startScreenLayout.css.test.js`, leyendo `index.html` como texto (mismo patrón `readFileSync`/`getMobileMediaBlock` que `src/ui/hudLayout.css.test.js`)
  - Escribir 5 aserciones (una por selector) que confirmen que el bloque `@media (max-width:520px){...}` NO contiene reglas `.crest{...}`, `.panel h1{...}`, `.subtitle{...}`, `.rules li{...}`, `.btn-primary{...}`
  - Ejecutar el test suite sobre el código SIN FIX
  - **RESULTADO ESPERADO**: Las 5 aserciones PASAN sobre el código sin fix (confirman que el bug existe: no hay reducción móvil para estos selectores). Después del fix (tarea 3), estas mismas aserciones deberán invertirse/actualizarse para reflejar la presencia de las nuevas reglas (ver tarea 3.2)
  - Documentar en el propio test (comentario) que esta comprobación es el "antes" del ciclo explorar→implementar
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Escribir tests de preservación (ANTES de implementar el fix)
  - **Property 2: Preservation** - Estilos de escritorio y overlays no basados en `.panel` sin cambios
  - **IMPORTANTE**: Seguir la metodología de observación primero
  - Observar en `index.html` (código sin fix) los valores actuales fuera de `@media`: `.crest{font-size:40px;...}`, `.panel h1{...font-size:26px;...}`, `.subtitle{...font-size:14.5px;...}`, `.rules li{...font-size:13.5px;...}`, `.btn-primary{...padding:13px 30px;...font-size:15px;...}`
  - En `src/ui/startScreenLayout.css.test.js`, escribir aserciones estáticas (regex) que confirmen esos valores exactos fuera de `@media`
  - Escribir aserciones adicionales que confirmen que `.panel{padding:26px 20px 22px}` dentro de `@media (max-width:520px)` y `.overlay-content` (dentro y fuera de `@media`) permanecen con su contenido actual
  - Escribir un test DOM/jsdom (mismo patrón `buildDom` que `screens.audioSettings.test.js`) que construya el markup de `#startScreen` con `#startBtn` y `#playerNameInput`, y confirme que ambos elementos conservan sus IDs, tag (`<button>`/`<input>`) y clase (`.btn-primary`) actuales
  - Ejecutar todos estos tests sobre el código SIN FIX
  - **RESULTADO ESPERADO**: Todos los tests PASAN sobre el código sin fix (confirman el comportamiento base a preservar)
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

- [x] 3. Fix para el desajuste móvil del panel de inicio

  - [x] 3.1 Implementar la reducción de tamaño de Panel_Element en el breakpoint móvil
    - En `index.html`, dentro del bloque `@media (max-width:520px){...}` ya existente (el mismo que contiene `.card`, `.hud-pill`, `.welcome-msg`, etc.), añadir las siguientes reglas nuevas: `.crest{font-size:30px;}`, `.panel h1{font-size:20px;}`, `.subtitle{font-size:13px;}`, `.rules li{font-size:12px;}`, `.btn-primary{padding:11px 20px; font-size:13.5px;}`
    - No modificar `.panel{padding:26px 20px 22px}` (ya existente), ni `.overlay-content`, ni ningún selector con `id` específico de otros overlays (`#gameOverDetail`, `#finalScore`, `#scoreRank`, etc.)
    - No modificar ningún archivo `.js`
    - No modificar los valores de `.crest`, `.panel h1`, `.subtitle`, `.rules li`, `.btn-primary` fuera de `@media (max-width:520px)`
    - _Bug_Condition: isBugCondition(input) donde input.viewportWidth <= 520 AND input.selector es un Panel_Element AND input.currentFontSizeOrPadding = input.desktopFontSizeOrPadding_
    - _Expected_Behavior: cada Panel_Element recibe un font-size/padding estrictamente menor al de escritorio dentro de @media (max-width:520px)_
    - _Preservation: valores de escritorio y .panel{padding}/.overlay-content sin cambios_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3_

  - [x] 3.2 Verificar que el test de exploración ahora refleja el fix
    - **Property 1: Expected Behavior** - Reducción móvil presente en Panel_Element
    - **IMPORTANTE**: Actualizar las 5 aserciones de la tarea 1 en `src/ui/startScreenLayout.css.test.js` para que, en lugar de confirmar la AUSENCIA de las reglas, confirmen su PRESENCIA con valores estrictamente menores a los de escritorio (`.crest` <40px, `.panel h1` <26px, `.subtitle` <14.5px, `.rules li` <13.5px, `.btn-primary` font-size <15px y padding horizontal <30px)
    - Ejecutar el test suite sobre el código CON FIX
    - **RESULTADO ESPERADO**: Todas las aserciones PASAN (confirman que el bug está corregido)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Verificar que los tests de preservación siguen pasando
    - **Property 2: Preservation** - Estilos de escritorio y overlays no basados en `.panel` sin cambios
    - **IMPORTANTE**: Re-ejecutar los MISMOS tests de la tarea 2 (no escribir tests nuevos)
    - Ejecutar los tests de preservación de la tarea 2 sobre el código CON FIX
    - **RESULTADO ESPERADO**: Todos los tests PASAN (confirman que no hay regresiones en escritorio/tablet, `.overlay-content`, `.panel{padding}`, ni en la funcionalidad de `#startBtn`/`#playerNameInput`)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

- [x] 4. Checkpoint - Asegurar que todos los tests pasan
  - Ejecutar `npm test` (o `vitest run`) y confirmar que la suite completa pasa, preguntar al usuario si surgen dudas

- [x] 5. Nota de QA manual (informativa, no automatizable)
  - Documentar que se requiere verificación visual manual antes de considerar este bugfix completamente validado: confirmar que el panel de `#startScreen` (crest, título, subtítulo, reglas, campo de nombre, botón) se muestra completo, legible y sin desbordar el ancho del viewport, en al menos tres anchos: 320px, 375px y 520px
  - jsdom no calcula layout real (`getBoundingClientRect()` devuelve ceros salvo mock explícito), por lo que esto no puede cubrirse con tests automatizados; esta tarea es informativa y no requiere cambios de código
  - Verificar además visualmente que `#gameOverScreen` y `#audioSettingsPanel` (que comparten `.panel h1`, `.subtitle`, `.rules li` si aplica, `.btn-primary`) no se ven degradados por la reducción de tamaño heredada
  - _Requirements: 2.6_

## Notes

- No se incluyen tareas de property-based testing (fast-check): design.md justifica explícitamente que este es un cambio CSS puro sin funciones puras ni transformaciones de datos sobre las que formular propiedades universales.
- `.overlay-content`, `.panel{padding:26px 20px 22px}` (ya existente), `#gameOverDetail`/`#finalScore`/`#scoreRank` y todos los archivos `.js` nunca se modifican.
- Los selectores `.panel h1`, `.subtitle`, `.rules li` y `.btn-primary` son compartidos con `#gameOverScreen`/`#audioSettingsPanel`; la herencia de la reducción de tamaño en esos overlays es intencional (ver "Nota de alcance sobre selectores compartidos" en design.md) y se confirma visualmente en la tarea 5.
- Recordatorio del workflow de bugfix: las tareas 1 y 2 se escriben y ejecutan ANTES de implementar el fix (tarea 3), sobre el código sin corregir, para confirmar la condición de bug y establecer la línea base de preservación.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5"] }
  ]
}
```
