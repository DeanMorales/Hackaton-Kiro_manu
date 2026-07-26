import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  openQuestionModal,
  closeQuestionModal,
  isQuestionModalOpen,
} from './screens.js';

/*
 * Tests de ejemplo (jsdom) para la apertura de la Modal_Pregunta (tarea 3.3).
 *
 * Nota sobre las aserciones de CSS (R1.3, R1.4, R3.3, R6.1):
 * jsdom NO aplica la hoja de estilos de `index.html` cuando construimos el DOM a
 * mano, y su `getComputedStyle` no evalúa `clamp()` ni `var()` de forma fiable.
 * Por ello, el enfoque más robusto para verificar los valores de configuración y
 * los tamaños de fuente mínimos es leer `index.html` como texto y extraer los
 * valores numéricos declarados, comprobando que caen dentro de los rangos exigidos
 * por los requisitos. Así el test valida la fuente de verdad real (el CSS del shell)
 * en lugar de un valor recomputado poco fiable.
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

/** Construye el DOM mínimo requerido: overlay de la modal + fila de tarjetas. */
function buildDom(cardCount = 3) {
  const cards = Array.from({ length: cardCount }, (_, i) => {
    return `<div class="card" data-idx="${i}"><div class="card-inner"></div></div>`;
  }).join('');

  document.body.innerHTML = `
    <div id="cardsRow" class="cards-row">${cards}</div>
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

describe('openQuestionModal (Modal_Pregunta) — apertura, contenido y accesibilidad', () => {
  beforeEach(() => {
    buildDom(3);
    // Reinicia el estado del controlador DOM entre tests (deja expandedIdx = null).
    closeQuestionModal();
  });

  afterEach(() => {
    // Deja el estado limpio y restaura cualquier mock/espía global.
    closeQuestionModal();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    delete window.matchMedia;
    delete Element.prototype.animate;
  });

  describe('contenido y tipografía (R1.3, R1.4)', () => {
    it('declara un tamaño de fuente mínimo de .qmodal-qtext (18px) estrictamente mayor que 11.5px', () => {
      const match = INDEX_HTML.match(
        /\.qmodal-qtext\{[^}]*font-size:\s*clamp\(\s*(\d+(?:\.\d+)?)px/
      );
      expect(match).toBeTruthy();
      const minPx = parseFloat(match[1]);
      expect(minPx).toBe(18);
      expect(minPx).toBeGreaterThan(11.5);
    });

    it('declara un tamaño de fuente mínimo de .qmodal-opt (15px) estrictamente mayor que 10.5px', () => {
      const match = INDEX_HTML.match(
        /\.qmodal-opt\{[^}]*font-size:\s*clamp\(\s*(\d+(?:\.\d+)?)px/
      );
      expect(match).toBeTruthy();
      const minPx = parseFloat(match[1]);
      expect(minPx).toBe(15);
      expect(minPx).toBeGreaterThan(10.5);
    });

    it('puebla el texto de la pregunta y todas las opciones en el mismo orden que la Tarjeta (R1.2)', () => {
      const card = makeCard();
      const cardEl = document.querySelector('#cardsRow .card[data-idx="1"]');

      openQuestionModal(cardEl, card, vi.fn(), 1, { resolved: false });

      const qtext = document.querySelector('.qmodal-qtext');
      expect(qtext.textContent).toBe(card.question.text);

      const opts = Array.from(document.querySelectorAll('.qmodal-opt'));
      expect(opts).toHaveLength(card.question.options.length);
      expect(opts.map((b) => b.textContent)).toEqual(card.question.options);
      expect(isQuestionModalOpen()).toBe(true);
    });
  });

  describe('selección única (R1.6)', () => {
    it('deshabilita todas las opciones y llama onAnswer una sola vez tras el primer clic', () => {
      const card = makeCard();
      const cardEl = document.querySelector('#cardsRow .card[data-idx="0"]');
      const onAnswer = vi.fn();

      openQuestionModal(cardEl, card, onAnswer, 0, { resolved: false });

      const opts = Array.from(document.querySelectorAll('.qmodal-opt'));
      opts[2].click();

      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith(0, 2);
      expect(opts.every((b) => b.disabled)).toBe(true);

      // Un segundo clic (en cualquier opción) no vuelve a invocar onAnswer.
      opts[0].click();
      opts[2].click();
      expect(onAnswer).toHaveBeenCalledTimes(1);
    });

    it('marca la opción elegida como .correct o .incorrect según la respuesta', () => {
      const card = makeCard({
        question: { text: 'P', options: ['A', 'B'], correct: 1 },
      });
      const cardEl = document.querySelector('#cardsRow .card[data-idx="0"]');

      openQuestionModal(cardEl, card, vi.fn(), 0, { resolved: false });

      const opts = Array.from(document.querySelectorAll('.qmodal-opt'));
      opts[0].click(); // opción incorrecta (correct === 1)
      expect(opts[0].classList.contains('incorrect')).toBe(true);
      expect(opts[0].classList.contains('correct')).toBe(false);
    });
  });

  describe('estabilidad de la fila y capa superpuesta (R4.2, R4.5)', () => {
    it('no altera el orden de dataset.idx en #cardsRow al abrir la modal', () => {
      const before = cardsRowOrder();
      const card = makeCard();
      const cardEl = document.querySelector('#cardsRow .card[data-idx="2"]');

      openQuestionModal(cardEl, card, vi.fn(), 2, { resolved: false });

      expect(cardsRowOrder()).toEqual(before);
    });

    it('renderiza .question-modal dentro de #questionModalOverlay y no dentro de #cardsRow', () => {
      const card = makeCard();
      const cardEl = document.querySelector('#cardsRow .card[data-idx="0"]');

      openQuestionModal(cardEl, card, vi.fn(), 0, { resolved: false });

      const overlay = document.getElementById('questionModalOverlay');
      const modal = document.querySelector('.question-modal');
      expect(overlay.contains(modal)).toBe(true);
      expect(document.querySelector('#cardsRow .question-modal')).toBeNull();
      // El overlay deja de estar oculto al abrir.
      expect(overlay.classList.contains('hidden')).toBe(false);
      expect(overlay.getAttribute('aria-hidden')).toBe('false');
    });
  });

  describe('movimiento reducido (R3.5, R6.8)', () => {
    it('con prefers-reduced-motion: reduce, aplica el estado destino sin invocar element.animate', () => {
      // matchMedia mockeado a `reduce` activo.
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      // Espía sobre animate: jsdom no lo implementa, así que lo añadimos como
      // función para poder verificar que NO se invoca bajo movimiento reducido.
      const animateSpy = vi.fn();
      Element.prototype.animate = animateSpy;

      const card = makeCard();
      const cardEl = document.querySelector('#cardsRow .card[data-idx="0"]');
      openQuestionModal(cardEl, card, vi.fn(), 0, { resolved: false });

      expect(animateSpy).not.toHaveBeenCalled();
      // El estado destino se aplica igualmente: overlay visible y modal poblada.
      const overlay = document.getElementById('questionModalOverlay');
      expect(overlay.classList.contains('hidden')).toBe(false);
      expect(document.querySelector('.qmodal-qtext').textContent).toBe(
        card.question.text
      );
      expect(isQuestionModalOpen()).toBe(true);
    });
  });

  describe('rangos de configuración (R3.3, R6.1)', () => {
    it('declara --modal-anim-ms dentro del rango [200, 600] ms', () => {
      const match = INDEX_HTML.match(/--modal-anim-ms:\s*(\d+(?:\.\d+)?)ms/);
      expect(match).toBeTruthy();
      const ms = parseFloat(match[1]);
      expect(ms).toBeGreaterThanOrEqual(200);
      expect(ms).toBeLessThanOrEqual(600);
    });

    it('declara --modal-blur dentro del rango [2, 12] px', () => {
      const match = INDEX_HTML.match(/--modal-blur:\s*(\d+(?:\.\d+)?)px/);
      expect(match).toBeTruthy();
      const px = parseFloat(match[1]);
      expect(px).toBeGreaterThanOrEqual(2);
      expect(px).toBeLessThanOrEqual(12);
    });
  });

  describe('Tarjeta bloqueada (R1.5)', () => {
    it('no abre la modal si la Tarjeta está bloqueada', () => {
      const card = makeCard({ locked: true });
      const cardEl = document.querySelector('#cardsRow .card[data-idx="0"]');

      openQuestionModal(cardEl, card, vi.fn(), 0, { resolved: false });

      expect(isQuestionModalOpen()).toBe(false);
      const overlay = document.getElementById('questionModalOverlay');
      expect(overlay.classList.contains('hidden')).toBe(true);
    });
  });
});
