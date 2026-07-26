import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  openQuestionModal,
  closeQuestionModal,
  isQuestionModalOpen,
} from './screens.js';

/**
 * Tests de ejemplo (jsdom) para el estado tras el cierre de la Modal_Pregunta
 * (tarea 4.2). En jsdom `element.animate` no existe, por lo que `screens.js`
 * aplica el estado destino de forma síncrona (ruta `finalizeModalClose`), lo que
 * permite comprobar el estado final tras `closeQuestionModal` sin timers.
 *
 * Cubre:
 * - R6.2: al regresar a Estado_Original, el overlay retira el Desenfoque_Fondo
 *   (queda oculto y con `no-blur`, `aria-hidden="true"`).
 * - R6.3: la Modal_Pregunta nunca conserva filtro/backdrop-filter propio.
 * - R4.3: el orden de las Tarjetas de `#cardsRow` es idéntico al previo a la expansión.
 */
describe('screens.js — estado tras cerrar la Modal_Pregunta (jsdom)', () => {
  /** Construye una carta de combate mínima con pregunta y opciones. */
  function makeCard(abbr, correct = 0) {
    return {
      service: { abbr, name: `Servicio ${abbr}`, color: '#123456' },
      question: {
        text: `¿Qué hace ${abbr}?`,
        options: ['Opción A', 'Opción B', 'Opción C'],
        correct,
      },
      locked: false,
    };
  }

  beforeEach(() => {
    // Shell DOM: overlay de la modal (hermano de #bossScreen) + fila de tarjetas.
    document.body.innerHTML = `
      <div id="app">
        <div id="cardsRow" class="cards-row"></div>
        <div id="questionModalOverlay" class="qmodal-overlay hidden" aria-hidden="true">
          <div class="question-modal facet-cut" role="dialog" aria-modal="true" aria-label="Pregunta">
            <div class="qmodal-qtext"></div>
            <div class="qmodal-opts"></div>
          </div>
        </div>
      </div>
    `;

    // Puebla #cardsRow con varias .card, cada una con su dataset.idx.
    const row = document.getElementById('cardsRow');
    ['EC2', 'S3', 'LAMBDA', 'DYNAMO'].forEach((abbr, idx) => {
      const el = document.createElement('div');
      el.className = 'card';
      el.dataset.idx = String(idx);
      row.appendChild(el);
    });
  });

  afterEach(() => {
    // Garantiza que el estado del controlador DOM quede limpio entre tests.
    closeQuestionModal();
    document.body.innerHTML = '';
  });

  /** Devuelve la secuencia de `dataset.idx` de las tarjetas de #cardsRow. */
  function cardOrder() {
    return Array.from(document.querySelectorAll('#cardsRow .card')).map(
      (el) => el.dataset.idx
    );
  }

  it('tras closeQuestionModal el overlay queda oculto, con no-blur y aria-hidden="true" (R6.2)', () => {
    const cardEl = document.querySelector('#cardsRow .card[data-idx="1"]');
    const card = makeCard('S3');

    openQuestionModal(cardEl, card, () => {}, 1);
    expect(isQuestionModalOpen()).toBe(true);

    closeQuestionModal();

    const overlay = document.getElementById('questionModalOverlay');
    expect(overlay.classList.contains('hidden')).toBe(true);
    expect(overlay.classList.contains('no-blur')).toBe(true);
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(isQuestionModalOpen()).toBe(false);
  });

  it('la .question-modal no conserva filtro/backdrop-filter propio tras el cierre (R6.3)', () => {
    const cardEl = document.querySelector('#cardsRow .card[data-idx="0"]');
    const card = makeCard('EC2');

    openQuestionModal(cardEl, card, () => {}, 0);
    closeQuestionModal();

    const modalEl = document.querySelector('.question-modal');
    // El desenfoque se aplica vía backdrop-filter del overlay, nunca como filtro
    // propio de la modal: no debe quedar filtro inline residual.
    expect(modalEl.style.filter).toBe('');
    expect(modalEl.style.backdropFilter).toBe('');
  });

  it('el orden de dataset.idx en #cardsRow es idéntico al previo a la expansión (R4.3)', () => {
    const before = cardOrder();
    expect(before).toEqual(['0', '1', '2', '3']);

    const cardEl = document.querySelector('#cardsRow .card[data-idx="2"]');
    const card = makeCard('LAMBDA');

    openQuestionModal(cardEl, card, () => {}, 2);
    // La modal vive fuera de #cardsRow: el orden no cambia durante la expansión.
    expect(cardOrder()).toEqual(before);

    closeQuestionModal();

    // El orden y el conteo se conservan tras el regreso a Estado_Original.
    const after = cardOrder();
    expect(after).toEqual(before);
    expect(after).toHaveLength(before.length);
  });
});
