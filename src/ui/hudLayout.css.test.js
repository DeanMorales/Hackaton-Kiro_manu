import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Tests de ejemplo (verificación estática) para el ajuste responsive del HUD
 * (tareas 4.1-4.4 de hud-responsive-layout).
 *
 * Nota: al igual que en screens.cardLayout.test.js/screens.modal.open.test.js,
 * jsdom no calcula layout real, por lo que estas aserciones se hacen leyendo
 * `index.html` como texto y comprobando con expresiones regulares en lugar de
 * intentar medir el layout resultante en jsdom.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');

/** Extrae el contenido del bloque @media (max-width:520px){...} balanceando llaves. */
function getMobileMediaBlock() {
  const startIdx = INDEX_HTML.indexOf('@media (max-width:520px)');
  expect(startIdx).toBeGreaterThan(-1);
  let depth = 0;
  let i = INDEX_HTML.indexOf('{', startIdx);
  const blockStart = i + 1;
  for (; i < INDEX_HTML.length; i++) {
    if (INDEX_HTML[i] === '{') depth++;
    else if (INDEX_HTML[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return INDEX_HTML.slice(blockStart, i);
}

describe('Verificación estática de la hoja de estilos embebida (hud-responsive-layout)', () => {
  describe('regla móvil .hud-pill reducida presente dentro del breakpoint (R1.1, R2.1, R2.3)', () => {
    it('declara font-size >= 11 y <= 14, y padding con componentes vertical/horizontal > 0', () => {
      const mobileBlock = getMobileMediaBlock();

      const hudPillMatch = mobileBlock.match(/\.hud-pill\s*\{([^}]*)\}/);
      expect(hudPillMatch).toBeTruthy();
      const rule = hudPillMatch[1];

      const fontSizeMatch = rule.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
      expect(fontSizeMatch).toBeTruthy();
      const fontSize = parseFloat(fontSizeMatch[1]);
      expect(fontSize).toBeGreaterThanOrEqual(11);
      expect(fontSize).toBeLessThanOrEqual(14);

      const paddingMatch = rule.match(
        /padding:\s*(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px/
      );
      expect(paddingMatch).toBeTruthy();
      const [, vertical, horizontal] = paddingMatch;
      expect(parseFloat(vertical)).toBeGreaterThan(0);
      expect(parseFloat(horizontal)).toBeGreaterThan(0);
    });
  });

  describe('regla de escritorio .hud-pill intacta (R3.1)', () => {
    it('la regla .hud-pill{...} fuera de @media conserva font-size:14px y padding:7px 16px', () => {
      const desktopHudPillMatch = INDEX_HTML.match(/\.hud-pill\s*\{([^}]*)\}/);
      expect(desktopHudPillMatch).toBeTruthy();
      const rule = desktopHudPillMatch[1];

      expect(rule).toMatch(/font-size:\s*14px/);
      expect(rule).toMatch(/padding:\s*7px\s+16px/);
    });
  });

  describe('regla #hud fuera de @media sin cambios (R1.4, R3.2)', () => {
    it('#hud conserva display:flex, justify-content:center, gap:10px, pointer-events:none, flex-wrap:wrap y padding:0 10px', () => {
      const hudMatch = INDEX_HTML.match(/#hud\s*\{([^}]*)\}/);
      expect(hudMatch).toBeTruthy();
      const rule = hudMatch[1];

      expect(rule).toMatch(/display:flex/);
      expect(rule).toMatch(/justify-content:center/);
      expect(rule).toMatch(/gap:10px/);
      expect(rule).toMatch(/pointer-events:none/);
      expect(rule).toMatch(/flex-wrap:wrap/);
      expect(rule).toMatch(/padding:0\s*10px/);
    });

    it('ninguna de las propiedades de #hud es sobrescrita dentro de @media (max-width:520px)', () => {
      const mobileBlock = getMobileMediaBlock();
      const hudRuleInMobile = mobileBlock.match(/#hud\s*\{/);
      expect(hudRuleInMobile).toBeNull();
    });
  });

  describe('#settingsBtn conserva <button> y pointer-events:auto (R4.4)', () => {
    it('declara #settingsBtn como elemento <button> con pointer-events:auto en su style inline', () => {
      const settingsBtnMatch = INDEX_HTML.match(
        /<button[^>]*\bid="settingsBtn"[^>]*>/
      );
      expect(settingsBtnMatch).toBeTruthy();
      const tag = settingsBtnMatch[0];

      expect(tag).toMatch(/^<button/);
      const styleMatch = tag.match(/style="([^"]*)"/);
      expect(styleMatch).toBeTruthy();
      expect(styleMatch[1]).toMatch(/pointer-events:auto/);
    });
  });
});
