import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderCards,
  openQuestionModal,
  closeQuestionModal,
} from './screens.js';

/*
 * Tests de ejemplo (jsdom) para la disposición de las Cards de combate en el
 * breakpoint móvil (tareas 3.1-3.4, 4.1-4.2 de combat-cards-mobile-layout).
 *
 * Nota sobre las aserciones de CSS: al igual que en screens.modal.open.test.js,
 * jsdom no calcula layout real (getBoundingClientRect() devuelve ceros salvo que
 * se mockee), por lo que las aserciones de la regla CSS de "4 por fila" se hacen
 * leyendo `index.html` como texto y comprobando con expresiones regulares, en
 * lugar de intentar medir el layout resultante en jsdom.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');

/** Construye una Tarjeta de ejemplo con pregunta y opciones. */
function makeCard(overrides = {}) {
  return {
    service: { abbr: 'EC2', name: 'Elastic Compute', color: '#ff9900' },
    question: {
      text: '¿Qué servicio ofrece capacidad de cómputo escalable?',
      options: ['Amazon EC2', 'Amazon S3', 'Amazon RDS', 'AWS IAM'],
      correct: 0,
    },
    locked: false,
    ...overrides,
  };
}

/** Construye `count` Cards sintéticas para pasar a renderCards. */
function makeCards(count) {
  return Array.from({ length: count }, () => makeCard());
}

/** Construye el DOM mínimo requerido: fila de tarjetas vacía + overlay de la modal. */
function buildDom() {
  document.body.innerHTML = `
    <div id="cardsRow" class="cards-row"></div>
    <div id="questionModalOverlay" class="qmodal-overlay hidden" aria-hidden="true">
      <div class="question-modal facet-cut" role="dialog" aria-modal="true" aria-label="Pregunta">
        <div class="qmodal-qtext"></div>
        <div class="qmodal-opts"></div>
      </div>
    </div>
  `;
}

/** Devuelve el orden actual de `dataset.idx` de las Tarjetas en `#cardsRow`. */
function cardsRowOrder() {
  return Array.from(document.querySelectorAll('#cardsRow .card')).map(
    (el) => el.dataset.idx
  );
}

describe('renderCards — disposición de Cards en Card_Row (combat-cards-mobile-layout)', () => {
  beforeEach(() => {
    buildDom();
    closeQuestionModal();
  });

  afterEach(() => {
    closeQuestionModal();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('sin wrappers para distintos Card_Count (R3.1, R1.*, R2.*)', () => {
    it.each([1, 4, 5, 6, 7])(
      'todos los hijos de #cardsRow son .card, hijos directos, para Card_Count = %i',
      (count) => {
        renderCards(makeCards(count), vi.fn());

        const row = document.getElementById('cardsRow');
        const children = Array.from(row.children);

        expect(children).toHaveLength(count);
        children.forEach((child) => {
          expect(child.classList.contains('card')).toBe(true);
          expect(child.parentElement).toBe(row);
        });
      }
    );
  });

  describe('orden y dataset.idx preservados para Card_Count > 4 (R1.5, R4.4)', () => {
    it.each([5, 6, 7])(
      'dataset.idx es "0","1",... estrictamente creciente para Card_Count = %i',
      (count) => {
        renderCards(makeCards(count), vi.fn());

        const idxs = cardsRowOrder();
        expect(idxs).toEqual(
          Array.from({ length: count }, (_, i) => String(i))
        );

        const numericIdxs = idxs.map(Number);
        for (let i = 1; i < numericIdxs.length; i++) {
          expect(numericIdxs[i]).toBeGreaterThan(numericIdxs[i - 1]);
        }
      }
    );
  });

  describe('Card_Click_Handler funciona para índices >= 4 (R4.1)', () => {
    it('onCardClick recibe el índice correcto para índices 0, 4 y 5 con Card_Count = 6', () => {
      const onCardClick = vi.fn();
      renderCards(makeCards(6), onCardClick);

      const cardsEl = document.querySelectorAll('#cardsRow .card');
      cardsEl[0].dispatchEvent(new window.Event('click', { bubbles: true }));
      cardsEl[4].dispatchEvent(new window.Event('click', { bubbles: true }));
      cardsEl[5].dispatchEvent(new window.Event('click', { bubbles: true }));

      expect(onCardClick).toHaveBeenCalledTimes(3);
      expect(onCardClick).toHaveBeenNthCalledWith(1, 0);
      expect(onCardClick).toHaveBeenNthCalledWith(2, 4);
      expect(onCardClick).toHaveBeenNthCalledWith(3, 5);
    });

    it('onCardClick recibe el índice correcto para índices 0, 4 y 6 con Card_Count = 7', () => {
      const onCardClick = vi.fn();
      renderCards(makeCards(7), onCardClick);

      const cardsEl = document.querySelectorAll('#cardsRow .card');
      cardsEl[0].dispatchEvent(new window.Event('click', { bubbles: true }));
      cardsEl[4].dispatchEvent(new window.Event('click', { bubbles: true }));
      cardsEl[6].dispatchEvent(new window.Event('click', { bubbles: true }));

      expect(onCardClick).toHaveBeenCalledTimes(3);
      expect(onCardClick).toHaveBeenNthCalledWith(1, 0);
      expect(onCardClick).toHaveBeenNthCalledWith(2, 4);
      expect(onCardClick).toHaveBeenNthCalledWith(3, 6);
    });
  });

  describe('dataset.idx no cambia tras abrir/cerrar Modal_Pregunta para índice >= 4 (R4.2)', () => {
    it('el orden de dataset.idx antes y después de open+close es idéntico (6 cartas, índice 5)', () => {
      renderCards(makeCards(6), vi.fn());

      const before = cardsRowOrder();
      const card = makeCard();
      const cardEl = document.querySelector('#cardsRow .card[data-idx="5"]');

      openQuestionModal(cardEl, card, vi.fn(), 5, { resolved: false });
      closeQuestionModal();

      const after = cardsRowOrder();
      expect(after).toEqual(before);
    });
  });
});

describe('Verificación estática de la hoja de estilos embebida (combat-cards-mobile-layout)', () => {
  describe('regla móvil de 4 por fila presente (R1.1-R1.4, R3.2)', () => {
    it('el bloque @media (max-width:520px) contiene la regla .card con max-width y aspect-ratio esperados', () => {
      const mediaMatch = INDEX_HTML.match(
        /@media\s*\(max-width:\s*520px\)\s*\{([\s\S]*?)\n\s{0,2}\}\s*\n\s*(?:@media|<\/style>)/
      );
      // Fallback: capturar desde el inicio del media query hasta el cierre del bloque
      // usando balanceo simple si el patrón anterior no encaja con el formato real.
      const mediaBlock = mediaMatch
        ? mediaMatch[1]
        : (() => {
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
          })();

      const cardRuleMatch = mediaBlock.match(/\.card\{([^}]*)\}/);
      expect(cardRuleMatch).toBeTruthy();
      const cardRule = cardRuleMatch[1];

      expect(cardRule).toMatch(
        /max-width:\s*calc\(\(100%\s*-\s*3\s*\*\s*14px\)\s*\/\s*4\)/
      );
      expect(cardRule).toMatch(/aspect-ratio:\s*118\s*\/\s*168/);
    });

    it('la regla .cards-row/#cardsRow fuera de @media conserva display:flex, flex-wrap:wrap, gap:14px y justify-content:center', () => {
      const cardsRowRuleMatch = INDEX_HTML.match(/\.cards-row\{([^}]*)\}/);
      expect(cardsRowRuleMatch).toBeTruthy();
      const rule = cardsRowRuleMatch[1];

      expect(rule).toMatch(/display:flex/);
      expect(rule).toMatch(/flex-wrap:wrap/);
      expect(rule).toMatch(/gap:14px/);
      expect(rule).toMatch(/justify-content:center/);
    });
  });

  describe('regla de escritorio intacta (R3.1)', () => {
    it('la regla .card{width:150px; height:190px; ...} fuera de @media (max-width:520px) permanece sin cambios', () => {
      const desktopCardMatch = INDEX_HTML.match(
        /\.cards-row\{[^}]*\}\s*\.card\{([^}]*)\}/
      );
      expect(desktopCardMatch).toBeTruthy();
      const rule = desktopCardMatch[1];

      expect(rule).toMatch(/width:150px/);
      expect(rule).toMatch(/height:190px/);
    });
  });
});
