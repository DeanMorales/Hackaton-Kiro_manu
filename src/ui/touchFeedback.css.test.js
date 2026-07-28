import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Tests de verificación estática para el Patron_Presionado (Sistema_Feedback_Tactil)
 * añadido a `.card`, `.qmodal-opt` y `.hud-pill` (tareas 1-4 de touch-feedback-polish).
 *
 * Al igual que en hudLayout.css.test.js, jsdom no aplica el CSS embebido de forma que
 * podamos inspeccionar pseudo-clases como `:active` en tiempo de ejecución, por lo que
 * estas aserciones se hacen leyendo `index.html` como texto y comprobando con
 * expresiones regulares en lugar de intentar simular presión de puntero en jsdom.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');

/** Extrae el contenido del bloque @media (prefers-reduced-motion: reduce){...} que contiene .qmodal-overlay, balanceando llaves. */
function getReducedMotionMediaBlock() {
  // Puede haber varios bloques @media (prefers-reduced-motion: reduce) en el archivo
  // (por ejemplo el de .pip); localizamos específicamente el que contiene .qmodal-overlay.
  let searchFrom = 0;
  while (true) {
    const startIdx = INDEX_HTML.indexOf('@media (prefers-reduced-motion: reduce)', searchFrom);
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
    const block = INDEX_HTML.slice(blockStart, i);
    if (block.includes('.qmodal-overlay')) {
      return block;
    }
    searchFrom = i + 1;
  }
}

describe('Verificación estática de la hoja de estilos embebida (touch-feedback-polish)', () => {
  describe('Patron_Presionado en .card (R1.1, R1.2, R1.3, R1.4)', () => {
    it('declara .card:not(.locked):not(.failed):active con transform:scale(...)', () => {
      const match = INDEX_HTML.match(
        /\.card:not\(\.locked\):not\(\.failed\):active\s*\{([^}]*)\}/
      );
      expect(match).toBeTruthy();
      expect(match[1]).toMatch(/transform:\s*scale\([^)]+\)/);
    });

    it('la transición de .card incluye transform', () => {
      const match = INDEX_HTML.match(/(?<!\.locked|\.failed)\.card\s*\{([^}]*)\}/);
      expect(match).toBeTruthy();
      const cardRuleMatch = INDEX_HTML.match(/\.card\{([^}]*)\}/);
      expect(cardRuleMatch).toBeTruthy();
      expect(cardRuleMatch[1]).toMatch(/transition:[^;]*transform/);
    });

    it('no existe una regla .card:active genérica sin los dos :not()', () => {
      // No debe existir ":active" precedido inmediatamente por ".card" sin los :not()
      const genericActiveMatch = INDEX_HTML.match(/\.card:active\s*\{/);
      expect(genericActiveMatch).toBeNull();
    });
  });

  describe('clip-path e .card-inner sin cambios (R1.4, R4.3)', () => {
    it('.card-face conserva su clip-path exacto', () => {
      const match = INDEX_HTML.match(/\.card-face\s*\{([^}]*)\}/);
      expect(match).toBeTruthy();
      expect(match[1]).toMatch(
        /clip-path:\s*polygon\(12px 0,100% 0,100% calc\(100% - 12px\),calc\(100% - 12px\) 100%,0 100%,0 12px\)/
      );
    });

    it('.card-front y .card-back no declaran ningún clip-path propio (heredan de .card-face)', () => {
      const frontMatch = INDEX_HTML.match(/\.card-front\s*\{([^}]*)\}/);
      expect(frontMatch).toBeTruthy();
      expect(frontMatch[1]).not.toMatch(/clip-path/);

      const backMatch = INDEX_HTML.match(/\.card-back\s*\{([^}]*)\}/);
      expect(backMatch).toBeTruthy();
      expect(backMatch[1]).not.toMatch(/clip-path/);
    });

    it('.card-inner no recibe ninguna nueva regla :active y conserva transform-style:preserve-3d', () => {
      expect(INDEX_HTML).not.toMatch(/\.card-inner:active/);

      const innerMatch = INDEX_HTML.match(/\.card-inner\s*\{([^}]*)\}/);
      expect(innerMatch).toBeTruthy();
      expect(innerMatch[1]).toMatch(/transform-style:\s*preserve-3d/);
    });
  });

  describe('Patron_Presionado en .qmodal-opt (R2.1, R2.2, R2.3, R2.4)', () => {
    it('declara .qmodal-opt:not(:disabled):active con transform:scale(...) y sin background', () => {
      const match = INDEX_HTML.match(
        /\.qmodal-opt:not\(:disabled\):active\s*\{([^}]*)\}/
      );
      expect(match).toBeTruthy();
      expect(match[1]).toMatch(/transform:\s*scale\([^)]+\)/);
      expect(match[1]).not.toMatch(/background/);
    });

    it('.qmodal-opt.correct y .qmodal-opt.incorrect conservan su background actual sin cambios', () => {
      const correctMatch = INDEX_HTML.match(/\.qmodal-opt\.correct\s*\{([^}]*)\}/);
      expect(correctMatch).toBeTruthy();
      expect(correctMatch[1]).toMatch(/background:\s*rgba\(89,194,122,\.35\)/);

      const incorrectMatch = INDEX_HTML.match(/\.qmodal-opt\.incorrect\s*\{([^}]*)\}/);
      expect(incorrectMatch).toBeTruthy();
      expect(incorrectMatch[1]).toMatch(/background:\s*rgba\(226,73,58,\.35\)/);
    });

    it('.qmodal-opt:hover permanece intacto literalmente', () => {
      expect(INDEX_HTML).toMatch(
        /\.qmodal-opt:hover\{background:rgba\(255,255,255,\.12\);\}/
      );
    });
  });

  describe('Patron_Presionado en .hud-pill (R3.1, R3.2, R3.3)', () => {
    it('declara .hud-pill:active (no #settingsBtn:active) con filter y transform', () => {
      expect(INDEX_HTML).not.toMatch(/#settingsBtn:active/);

      const match = INDEX_HTML.match(/\.hud-pill:active\s*\{([^}]*)\}/);
      expect(match).toBeTruthy();
      expect(match[1]).toMatch(/filter:\s*brightness\([^)]+\)/);
      expect(match[1]).toMatch(/transform:\s*scale\([^)]+\)/);
    });

    it('la transición de .hud-pill incluye filter y transform', () => {
      const match = INDEX_HTML.match(/\.hud-pill\s*\{([^}]*)\}/);
      expect(match).toBeTruthy();
      const transitionMatch = match[1].match(/transition:([^;]*);/);
      expect(transitionMatch).toBeTruthy();
      expect(transitionMatch[1]).toMatch(/filter/);
      expect(transitionMatch[1]).toMatch(/transform/);
    });
  });

  describe('Extensión del bloque @media (prefers-reduced-motion: reduce) (R5.1, R5.2)', () => {
    it('contiene las 3 reglas nuevas con transition-duration:0ms junto a .qmodal-overlay', () => {
      const block = getReducedMotionMediaBlock();

      expect(block).toMatch(/\.qmodal-overlay\s*\{[^}]*transition-duration:\s*0ms;?[^}]*\}/);
      expect(block).toMatch(/\.card\s*\{[^}]*transition-duration:\s*0ms;?[^}]*\}/);
      expect(block).toMatch(/\.qmodal-opt\s*\{[^}]*transition-duration:\s*0ms;?[^}]*\}/);
      expect(block).toMatch(/\.hud-pill\s*\{[^}]*transition-duration:\s*0ms;?[^}]*\}/);
    });
  });

  describe('.opt-btn (Codigo_Muerto_Opt_Btn) excluido de cualquier regla nueva (R4.4)', () => {
    it('no recibe ninguna nueva regla :active con transform:scale o filter:brightness', () => {
      expect(INDEX_HTML).not.toMatch(/\.opt-btn:active/);
    });
  });
});

/*
 * Nota de QA manual (no automatizable) — touch-feedback-polish
 *
 * jsdom no renderiza layout ni aplica pseudo-clases de interacción táctil real
 * (`:active` en respuesta a un toque físico, temporización de "tap" vs "hold",
 * etc.), por lo que las siguientes verificaciones quedan fuera del alcance de
 * los tests automatizados anteriores y deben confirmarse manualmente en un
 * dispositivo táctil real o en la emulación táctil de las herramientas de
 * desarrollador del navegador:
 *
 *   (a) Tarjeta no bloqueada (`.card` sin `.locked` ni `.failed`): al presionar
 *       con el dedo, la tarjeta debe encogerse ligeramente (transform:scale(.97))
 *       de forma inmediata y suave, y volver a su tamaño normal al soltar.
 *
 *   (b) Tarjeta `.locked` / `.failed`: al presionar, NO debe apreciarse ningún
 *       efecto de encogimiento (confirmar visualmente la ausencia del
 *       Patron_Presionado en estos estados).
 *
 *   (c) Opcion_Modal (`.qmodal-opt`) habilitada y deshabilitada: al presionar
 *       una opción habilitada debe verse el encogimiento sin cambio de color de
 *       fondo; al presionar una opción deshabilitada (`:disabled`) no debe
 *       apreciarse ningún efecto.
 *
 *   (d) `#settingsBtn` (u otra Pastilla_HUD interactiva que use `.hud-pill`):
 *       al presionar debe verse tanto el aclarado (filter:brightness) como el
 *       encogimiento (transform:scale) de forma simultánea y fluida.
 *
 *   (e) Con `prefers-reduced-motion: reduce` activado en el sistema operativo
 *       o navegador: repetir las verificaciones (a)-(d) y confirmar que las
 *       transiciones son instantáneas (sin animación perceptible), ya que
 *       `transition-duration:0ms` debería eliminar el suavizado pero mantener
 *       el cambio de estado visual final.
 */
