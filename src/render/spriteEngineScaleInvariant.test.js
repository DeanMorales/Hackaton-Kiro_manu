/* ===== Test estático: invariante de no-escalado en spriteEngine.js ===== */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Requirement 5.3 (design.md, combat-sprite-scaling): el escalado proporcional
 * de los Combat_Sprite se implementa íntegramente en `bossFightRender.js`
 * (computeSpriteScaleFactor, scaleDimensions, scaleOffset, computeDrawOrigin).
 * `src/render/spriteEngine.js` debe permanecer un motor de animación genérico,
 * sin ninguna referencia al ancho del canvas/ventana ni al Sprite_Scale_Factor.
 * Por eso se verifica leyendo el código fuente como texto y buscando los
 * patrones prohibidos con expresiones regulares, en una sola ejecución
 * (no generativa, sin fast-check), siguiendo el patrón de proceduralInvariant.test.js.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

const SPRITE_ENGINE_SRC = readFileSync(resolve(__dirname, './spriteEngine.js'), 'utf-8');

// Patrones que indicarían que spriteEngine.js conoce el escalado por ancho de canvas (Requirement 5.3).
const FORBIDDEN_PATTERNS = [
  { name: 'canvas.width', regex: /canvas\.width/ },
  { name: 'window.innerWidth', regex: /window\.innerWidth/ },
  { name: 'Sprite_Scale_Factor', regex: /Sprite_Scale_Factor/ },
  { name: 'scaleFactor', regex: /scaleFactor/ },
  { name: 'computeSpriteScaleFactor(', regex: /computeSpriteScaleFactor\s*\(/ },
];

// Feature: combat-sprite-scaling, Property: src/render/spriteEngine.js permanece ajeno al Sprite_Scale_Factor (Requirement 5.3)
describe('Invariante estructural: spriteEngine.js no conoce el escalado por ancho de canvas', () => {
  describe('src/render/spriteEngine.js', () => {
    FORBIDDEN_PATTERNS.forEach(({ name, regex }) => {
      it(`no contiene "${name}"`, () => {
        expect(regex.test(SPRITE_ENGINE_SRC)).toBe(false);
      });
    });
  });
});
