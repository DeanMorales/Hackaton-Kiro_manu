import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Tests de ejemplo (verificación estática) para el bugfix
 * start-screen-mobile-overflow.
 *
 * Nota: al igual que en hudLayout.css.test.js, jsdom no calcula layout real,
 * por lo que estas aserciones se hacen leyendo `index.html` como texto y
 * comprobando con expresiones regulares en lugar de intentar medir el layout
 * resultante en jsdom.
 *
 * IMPORTANTE (ciclo explorar -> implementar del workflow de bugfix):
 * - Tarea 1 (Property 1: Bug Condition) se escribe y ejecuta ANTES del fix
 *   (tarea 3). Las aserciones de este bloque confirman la AUSENCIA de reglas
 *   móviles para los Panel_Element, lo que demuestra que el bug existe hoy.
 *   Estas mismas aserciones se invertirán en la tarea 3.2 para confirmar la
 *   PRESENCIA de las nuevas reglas con valores reducidos, una vez aplicado
 *   el fix.
 * - Tarea 2 (Property 2: Preservation) también se escribe y ejecuta ANTES
 *   del fix, y establece la línea base que debe seguir pasando sin cambios
 *   después del fix (tarea 3.3).
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

/** Construye el markup mínimo de #startScreen, replicando el marcado real de index.html. */
function buildStartScreenDom() {
  document.body.innerHTML = `
    <div id="startScreen" class="overlay">
      <div class="panel facet-cut">
        <div class="crest">🏰</div>
        <h1>Torre de las Nubes</h1>
        <p class="subtitle">Construye la torre piso a piso...</p>
        <ul class="rules">
          <li><strong>Toca, haz clic o presiona Espacio</strong> para soltar el bloque.</li>
        </ul>
        <p class="welcome-msg">¿Listo para conquistar nuevos niveles?</p>
        <div class="name-field facet-cut-sm">
          <input id="playerNameInput" type="text" maxlength="8"
                 autocomplete="off" spellcheck="false"
                 placeholder="Tu nombre (opcional)"
                 aria-label="Tu nombre (opcional)">
        </div>
        <p class="name-hint">Puedes jugar sin nombre; la experiencia será genérica.</p>
        <button id="startBtn" class="btn-primary">Comenzar a construir</button>
      </div>
    </div>
  `;
}

describe('Tarea 1 — Exploración de la condición de bug (código CON fix, tarea 3.2)', () => {
  describe('Property 1: Expected Behavior — Reducción móvil presente en Panel_Element', () => {
    it('.crest tiene una regla dentro de @media (max-width:520px) con font-size <40px', () => {
      const mobileBlock = getMobileMediaBlock();
      const crestMatch = mobileBlock.match(/\.crest\s*\{([^}]*)\}/);
      expect(crestMatch).toBeTruthy();
      const fontSizeMatch = crestMatch[1].match(/font-size:\s*([\d.]+)px/);
      expect(fontSizeMatch).toBeTruthy();
      expect(parseFloat(fontSizeMatch[1])).toBeLessThan(40);
    });

    it('.panel h1 tiene una regla dentro de @media (max-width:520px) con font-size <26px', () => {
      const mobileBlock = getMobileMediaBlock();
      const panelH1Match = mobileBlock.match(/\.panel\s+h1\s*\{([^}]*)\}/);
      expect(panelH1Match).toBeTruthy();
      const fontSizeMatch = panelH1Match[1].match(/font-size:\s*([\d.]+)px/);
      expect(fontSizeMatch).toBeTruthy();
      expect(parseFloat(fontSizeMatch[1])).toBeLessThan(26);
    });

    it('.subtitle tiene una regla dentro de @media (max-width:520px) con font-size <14.5px', () => {
      const mobileBlock = getMobileMediaBlock();
      const subtitleMatch = mobileBlock.match(/\.subtitle\s*\{([^}]*)\}/);
      expect(subtitleMatch).toBeTruthy();
      const fontSizeMatch = subtitleMatch[1].match(/font-size:\s*([\d.]+)px/);
      expect(fontSizeMatch).toBeTruthy();
      expect(parseFloat(fontSizeMatch[1])).toBeLessThan(14.5);
    });

    it('.rules li tiene una regla dentro de @media (max-width:520px) con font-size <13.5px', () => {
      const mobileBlock = getMobileMediaBlock();
      const rulesLiMatch = mobileBlock.match(/\.rules\s+li\s*\{([^}]*)\}/);
      expect(rulesLiMatch).toBeTruthy();
      const fontSizeMatch = rulesLiMatch[1].match(/font-size:\s*([\d.]+)px/);
      expect(fontSizeMatch).toBeTruthy();
      expect(parseFloat(fontSizeMatch[1])).toBeLessThan(13.5);
    });

    it('.btn-primary tiene una regla dentro de @media (max-width:520px) con font-size <15px y padding horizontal <30px', () => {
      const mobileBlock = getMobileMediaBlock();
      const btnPrimaryMatch = mobileBlock.match(/\.btn-primary\s*\{([^}]*)\}/);
      expect(btnPrimaryMatch).toBeTruthy();

      const fontSizeMatch = btnPrimaryMatch[1].match(/font-size:\s*([\d.]+)px/);
      expect(fontSizeMatch).toBeTruthy();
      expect(parseFloat(fontSizeMatch[1])).toBeLessThan(15);

      const paddingMatch = btnPrimaryMatch[1].match(/padding:\s*([\d.]+)px\s+([\d.]+)px/);
      expect(paddingMatch).toBeTruthy();
      expect(parseFloat(paddingMatch[2])).toBeLessThan(30);
    });
  });
});

describe('Tarea 2 — Tests de preservación (ANTES de implementar el fix)', () => {
  describe('Property 2: Preservation — Estilos de escritorio intactos fuera de @media', () => {
    it('.crest fuera de @media conserva font-size:40px', () => {
      const crestMatch = INDEX_HTML.match(/\.crest\s*\{([^}]*)\}/);
      expect(crestMatch).toBeTruthy();
      expect(crestMatch[1]).toMatch(/font-size:\s*40px/);
    });

    it('.panel h1 fuera de @media conserva font-size:26px', () => {
      const panelH1Match = INDEX_HTML.match(/\.panel\s+h1\s*\{([^}]*)\}/);
      expect(panelH1Match).toBeTruthy();
      expect(panelH1Match[1]).toMatch(/font-size:\s*26px/);
    });

    it('.subtitle fuera de @media conserva font-size:14.5px', () => {
      const subtitleMatch = INDEX_HTML.match(/\.subtitle\s*\{([^}]*)\}/);
      expect(subtitleMatch).toBeTruthy();
      expect(subtitleMatch[1]).toMatch(/font-size:\s*14\.5px/);
    });

    it('.rules li fuera de @media conserva font-size:13.5px', () => {
      const rulesLiMatch = INDEX_HTML.match(/\.rules\s+li\s*\{([^}]*)\}/);
      expect(rulesLiMatch).toBeTruthy();
      expect(rulesLiMatch[1]).toMatch(/font-size:\s*13\.5px/);
    });

    it('.btn-primary fuera de @media conserva padding:13px 30px y font-size:15px', () => {
      const btnPrimaryMatch = INDEX_HTML.match(/\.btn-primary\s*\{([^}]*)\}/);
      expect(btnPrimaryMatch).toBeTruthy();
      expect(btnPrimaryMatch[1]).toMatch(/padding:\s*13px\s+30px/);
      expect(btnPrimaryMatch[1]).toMatch(/font-size:\s*15px/);
    });
  });

  describe('Property 2: Preservation — .panel{padding} móvil y .overlay-content sin cambios', () => {
    it('.panel{padding:26px 20px 22px} dentro de @media (max-width:520px) sigue presente sin modificar', () => {
      const mobileBlock = getMobileMediaBlock();
      const panelMatch = mobileBlock.match(/\.panel\s*\{([^}]*)\}/);
      expect(panelMatch).toBeTruthy();
      expect(panelMatch[1]).toMatch(/padding:\s*26px\s+20px\s+22px/);
    });

    it('.overlay-content fuera de @media conserva max-width:520px y padding:34px 30px 28px', () => {
      const overlayContentMatch = INDEX_HTML.match(/\.overlay-content\s*\{([^}]*)\}/);
      expect(overlayContentMatch).toBeTruthy();
      expect(overlayContentMatch[1]).toMatch(/max-width:\s*520px/);
      expect(overlayContentMatch[1]).toMatch(/padding:\s*34px\s+30px\s+28px/);
    });

    it('.overlay-content dentro de @media (max-width:520px) conserva max-width:95% !important y padding:26px 20px 22px', () => {
      const mobileBlock = getMobileMediaBlock();
      const overlayContentMobileMatch = mobileBlock.match(/\.overlay-content\s*\{([^}]*)\}/);
      expect(overlayContentMobileMatch).toBeTruthy();
      expect(overlayContentMobileMatch[1]).toMatch(/max-width:\s*95%\s*!important/);
      expect(overlayContentMobileMatch[1]).toMatch(/padding:\s*26px\s+20px\s+22px/);
    });
  });

  describe('Property 2: Preservation — #startBtn y #playerNameInput conservan IDs/tag/clase (DOM/jsdom)', () => {
    it('#startBtn sigue siendo un <button> con id="startBtn" y clase .btn-primary', () => {
      buildStartScreenDom();

      const startBtn = document.getElementById('startBtn');
      expect(startBtn).not.toBeNull();
      expect(startBtn.tagName).toBe('BUTTON');
      expect(startBtn.classList.contains('btn-primary')).toBe(true);
    });

    it('#playerNameInput sigue siendo un <input> con id="playerNameInput"', () => {
      buildStartScreenDom();

      const playerNameInput = document.getElementById('playerNameInput');
      expect(playerNameInput).not.toBeNull();
      expect(playerNameInput.tagName).toBe('INPUT');
      expect(playerNameInput.type).toBe('text');
    });
  });
});

/*
 * Tarea 5 — Nota de QA manual (informativa, no automatizable)
 * Requirements: 2.6
 *
 * jsdom no calcula layout real (no hay motor de renderizado/reflow), por lo
 * que la verificación de que el panel de #startScreen no desborda el ancho
 * del viewport en anchos móviles NO puede cubrirse con tests automatizados
 * en este proyecto. Esta nota documenta el paso de verificación manual
 * pendiente antes de considerar el bugfix completamente validado:
 *
 * 1. Verificar visualmente, en un navegador real (o DevTools con "device
 *    toolbar"), que el panel de #startScreen se muestra completo, legible y
 *    sin desbordar el ancho del viewport en, al menos, estos tres anchos:
 *      - 320px (móviles pequeños, p.ej. iPhone SE)
 *      - 375px (móviles estándar, p.ej. iPhone 12/13/14)
 *      - 520px (límite del breakpoint @media (max-width:520px))
 *    Elementos a revisar dentro del panel: crest, título (h1), subtítulo,
 *    reglas (.rules li), campo de nombre (#playerNameInput) y botón
 *    (#startBtn / .btn-primary).
 *
 * 2. Verificar visualmente que #gameOverScreen y #audioSettingsPanel, que
 *    comparten selectores con #startScreen (.panel h1, .subtitle,
 *    .rules li si aplica, .btn-primary), NO se ven degradados por la
 *    reducción de tamaño de fuente/padding heredada del fix aplicado en la
 *    tarea 3 (p.ej. texto cortado, botones demasiado pequeños para tocar,
 *    espaciados incorrectos).
 *
 * Esta tarea no requiere cambios de código ni añade tests automatizados.
 */
