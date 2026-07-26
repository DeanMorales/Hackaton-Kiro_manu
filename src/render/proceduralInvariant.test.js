/* ===== Test estático: invariante procedural (sin carga de assets de imagen) ===== */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Property 6 (design.md, tower-ground-biome-background) es un invariante
 * sobre el CÓDIGO FUENTE, no sobre una entrada variable: toda la variación
 * visual de Biome/Time_Of_Day debe producirse exclusivamente mediante
 * operaciones de canvas (createLinearGradient, createRadialGradient,
 * fillRect, beginPath/arc/fill) y aritmética sobre colores, nunca cargando
 * assets de imagen externos. Por eso se verifica leyendo el código fuente
 * como texto y buscando los patrones prohibidos con expresiones regulares,
 * en una sola ejecución (no generativa, sin fast-check).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

const ENVIRONMENT_ROSTER_SRC = readFileSync(
  resolve(__dirname, '../data/environmentRoster.js'),
  'utf-8'
);
const DRAW_SRC = readFileSync(resolve(__dirname, './draw.js'), 'utf-8');

// Patrones que indicarían carga/uso de assets de imagen (Requirements 1.2, 7.4, 8.6).
const FORBIDDEN_PATTERNS = [
  { name: 'new Image(', regex: /new\s+Image\s*\(/ },
  { name: '.src =', regex: /\.src\s*=/ },
  { name: 'drawImage(', regex: /drawImage\s*\(/ },
  { name: 'fetch(', regex: /fetch\s*\(/ },
];

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'];

// Feature: tower-ground-biome-background, Property 6: Ausencia de carga de assets de imagen (invariante procedural)
describe('Property 6: Ausencia de carga de assets de imagen (invariante procedural)', () => {
  describe('src/data/environmentRoster.js', () => {
    FORBIDDEN_PATTERNS.forEach(({ name, regex }) => {
      it(`no contiene "${name}"`, () => {
        expect(regex.test(ENVIRONMENT_ROSTER_SRC)).toBe(false);
      });
    });

    IMAGE_EXTENSIONS.forEach((ext) => {
      it(`no contiene la extensión de imagen "${ext}"`, () => {
        expect(ENVIRONMENT_ROSTER_SRC.includes(ext)).toBe(false);
      });
    });
  });

  describe('src/render/draw.js (drawSky, drawGround, drawVegetationCues, drawSunMoonCue, drawVegetationCue)', () => {
    FORBIDDEN_PATTERNS.forEach(({ name, regex }) => {
      it(`no contiene "${name}"`, () => {
        expect(regex.test(DRAW_SRC)).toBe(false);
      });
    });

    IMAGE_EXTENSIONS.forEach((ext) => {
      it(`no contiene la extensión de imagen "${ext}"`, () => {
        expect(DRAW_SRC.includes(ext)).toBe(false);
      });
    });
  });
});
