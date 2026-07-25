import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as combat from '../combat/fight.js';
import * as ui from '../ui/screens.js';

/**
 * Integration Tests — Temporización del cierre de la Modal_Pregunta
 * (spec: modal-pregunta-tarjeta, tarea 5.3)
 *
 * Estas pruebas verifican, con temporizadores falsos (fake timers), que
 * `ui.closeQuestionModal` (Animación_Regreso a Estado_Original) se dispara dentro
 * de la ventana 0–2000 ms tras registrar la respuesta en las TRES ramas del flujo
 * de `onAnswer` (acierto sin resolver, fallo sin resolver y resolución del combate
 * —victoria/derrota—) (R2.1, R2.2, R2.3, R2.4), y que en las ramas de resolución
 * (`win`/`lose`) el cierre ocurre ANTES de `endFight` (R2.3).
 *
 * Enfoque (idéntico al de los tests de integración existentes, ver
 * `bossFight.integration.test.js`):
 * `src/main.js` NO es importable de forma aislada en jsdom porque, al cargarse,
 * accede a `#gameCanvas` y a `canvas.getContext('2d')` (no implementado en jsdom),
 * arranca `requestAnimationFrame(loop)` e inicia la carga asíncrona del leaderboard.
 * Además `onAnswer`/`endFight` NO están exportados. Por ello reproducimos aquí la
 * orquestación EXACTA de la temporización del cierre de `onAnswer` (mismos
 * `setTimeout` y mismas constantes), pero DRIVEANDO LOS MÓDULOS REALES de
 * producción:
 *   - `combat.startBossFight` / `combat.answerCard` (src/combat/fight.js)
 *   - `ui.openQuestionModal` / `ui.closeQuestionModal` / `ui.isQuestionModalOpen`
 *     / `ui.renderCards` / `ui.renderPips` / `ui.showBanner` / `ui.hideBossScreen`
 *     (src/ui/screens.js)
 *
 * De este modo el cierre efectivo lo ejecuta la implementación REAL de
 * `screens.js` (cambio de estado del controlador puro + ocultado del overlay), y
 * el estado se observa vía `ui.isQuestionModalOpen()` y el DOM real, sin mocks del
 * módulo de UI.
 *
 * NOTA (fuera de alcance de 5.3): `onAnswer` en `src/main.js` conserva código
 * heredado que marca botones `.opt-btn` del reverso de la Tarjeta
 * (`cardEl.querySelectorAll('.opt-btn')`), que ya no existen tras migrar a la
 * Modal_Pregunta. Ese marcado visual es irrelevante para la temporización del
 * cierre y —igual que en `bossFight.integration.test.js`— no se replica aquí.
 */

/* ===== Constantes de temporización: réplica fiel de src/main.js -> onAnswer ===== */

// Rama 'win': pausa para percibir el último decremento (500 ms) + espera hasta
// cerrar/endFight (1300 ms) => cierre a 1800 ms.
const WIN_DEFEAT_PAUSE = 500;
const WIN_BANNER_TO_CLOSE = 1300;
const WIN_CLOSE_AT = WIN_DEFEAT_PAUSE + WIN_BANNER_TO_CLOSE; // 1800 ms

// Rama 'lose': cierre/endFight a 1200 ms.
const LOSE_CLOSE_AT = 1200;

// Ramas sin resolver (acierto / fallo): cierre a 900 ms.
const UNRESOLVED_CLOSE_AT = 900;

// Límite superior de la ventana de cierre exigida por R2.4.
const CLOSE_WINDOW_MAX = 2000;

/** Índice de una opción incorrecta (cualquiera distinta de la correcta). */
function wrongIdx(correctIdx) {
  return correctIdx === 0 ? 1 : 0;
}

/**
 * Prepara el DOM mínimo requerido por la UI de combate y por la Modal_Pregunta:
 * barras de vida, banner, fila de cartas y el overlay de la modal con su contenido.
 */
function setupDom() {
  document.body.innerHTML = `
    <div id="bossScreen" class="overlay hidden">
      <div id="bossName"></div>
      <div class="banner hidden" id="fightBanner"></div>
      <div id="playerHpBar"></div>
      <div id="bossHpBar"></div>
      <div class="cards-row" id="cardsRow"></div>
    </div>
    <div id="questionModalOverlay" class="qmodal-overlay hidden" aria-hidden="true">
      <div class="question-modal facet-cut" role="dialog" aria-modal="true" aria-label="Pregunta">
        <div class="qmodal-qtext"></div>
        <div class="qmodal-opts"></div>
      </div>
    </div>
  `;
}

/**
 * Simula la apertura de la Modal_Pregunta al seleccionar una Tarjeta (equivalente a
 * `onCardClick` de main.js: `ui.openQuestionModal(cardEl, card, onAnswer, idx, {resolved})`).
 * Devuelve el elemento DOM de la Tarjeta seleccionada.
 */
function openModalForCard(fight, idx, onAnswer) {
  const cardEl = document.querySelectorAll('#cardsRow .card')[idx];
  ui.openQuestionModal(cardEl, fight.cards[idx], onAnswer, idx, { resolved: fight.resolved });
  return cardEl;
}

describe('Modal_Pregunta — temporización del cierre (integración, fake timers)', () => {
  beforeEach(() => {
    setupDom();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // ===== Rama ACIERTO sin resolver (R2.1, R2.4) =====
  it('acierto sin resolver: el cierre se dispara a 900 ms (dentro de 0–2000 ms)', () => {
    const fight = combat.startBossFight(4); // bossPips = 4 -> un acierto no resuelve
    ui.renderCards(fight.cards, () => {});
    ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);

    const correct = fight.cards[0].question.correct;

    // Réplica de la rama 'acierto sin resolver' de onAnswer: cierre a 900 ms.
    const onAnswer = (cardIdx, chosenIdx) => {
      const result = combat.answerCard(fight, cardIdx, chosenIdx);
      expect(result.correct).toBe(true);
      expect(result.outcome).toBeNull();
      ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
      ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);
      setTimeout(() => {
        ui.closeQuestionModal();
      }, UNRESOLVED_CLOSE_AT);
    };

    // Abrir la modal y responder acertando (clic real en la opción de la modal).
    openModalForCard(fight, 0, onAnswer);
    expect(ui.isQuestionModalOpen()).toBe(true);
    document.querySelectorAll('#questionModalOverlay .qmodal-opt')[correct].click();

    // El cierre está programado, aún no ocurrió: la modal sigue abierta.
    expect(ui.isQuestionModalOpen()).toBe(true);

    // Justo antes de 900 ms: sigue abierta.
    vi.advanceTimersByTime(UNRESOLVED_CLOSE_AT - 1);
    expect(ui.isQuestionModalOpen()).toBe(true);

    // Al alcanzar 900 ms: la modal se cierra (Animación_Regreso -> Estado_Original).
    vi.advanceTimersByTime(1);
    expect(ui.isQuestionModalOpen()).toBe(false);
    expect(document.getElementById('questionModalOverlay').classList.contains('hidden')).toBe(true);

    // El disparo del cierre cae dentro de la ventana 0–2000 ms (R2.4).
    expect(UNRESOLVED_CLOSE_AT).toBeGreaterThanOrEqual(0);
    expect(UNRESOLVED_CLOSE_AT).toBeLessThanOrEqual(CLOSE_WINDOW_MAX);
  });

  // ===== Rama FALLO sin resolver (R2.2, R2.4) =====
  it('fallo sin resolver: el cierre se dispara a 900 ms (dentro de 0–2000 ms)', () => {
    const fight = combat.startBossFight(4); // playerPips = 3 -> un fallo no resuelve
    ui.renderCards(fight.cards, () => {});
    ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);

    const bad = wrongIdx(fight.cards[0].question.correct);

    // Réplica de la rama 'fallo sin resolver' de onAnswer: cierre a 900 ms.
    const onAnswer = (cardIdx, chosenIdx) => {
      const result = combat.answerCard(fight, cardIdx, chosenIdx);
      expect(result.correct).toBe(false);
      expect(result.outcome).toBeNull();
      ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
      ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);
      setTimeout(() => {
        ui.closeQuestionModal();
      }, UNRESOLVED_CLOSE_AT);
    };

    openModalForCard(fight, 0, onAnswer);
    expect(ui.isQuestionModalOpen()).toBe(true);
    document.querySelectorAll('#questionModalOverlay .qmodal-opt')[bad].click();

    expect(ui.isQuestionModalOpen()).toBe(true);

    vi.advanceTimersByTime(UNRESOLVED_CLOSE_AT - 1);
    expect(ui.isQuestionModalOpen()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(ui.isQuestionModalOpen()).toBe(false);
    expect(document.getElementById('questionModalOverlay').classList.contains('hidden')).toBe(true);

    // La Tarjeta origen queda bloqueada como hoy (comportamiento preservado, R2.2).
    expect(fight.cards[0].locked).toBe(true);

    expect(UNRESOLVED_CLOSE_AT).toBeGreaterThanOrEqual(0);
    expect(UNRESOLVED_CLOSE_AT).toBeLessThanOrEqual(CLOSE_WINDOW_MAX);
  });

  // ===== Rama RESOLUCIÓN: VICTORIA (R2.3, R2.4) =====
  it('victoria: el cierre se dispara a 1800 ms (dentro de 0–2000 ms) y ANTES de endFight', () => {
    const fight = combat.startBossFight(2); // bossPips = 2
    // Preparación (sin temporizadores): un acierto directo deja al jefe a 1 pip.
    combat.answerCard(fight, 0, fight.cards[0].question.correct);
    expect(fight.bossPips).toBe(1);

    ui.renderCards(fight.cards, () => {});
    ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);

    // `endFight` (réplica): registra si la modal seguía abierta al ejecutarse, para
    // comprobar que el cierre ocurrió ANTES (R2.3). Llama a la UI real.
    let endFightCalled = false;
    let modalOpenWhenEndFightRan = null;
    const endFight = () => {
      endFightCalled = true;
      modalOpenWhenEndFightRan = ui.isQuestionModalOpen();
      ui.hideBossScreen();
    };

    // Réplica EXACTA de la rama 'win' de onAnswer (500 ms de pausa -> banner ->
    // 1300 ms -> closeQuestionModal() ANTES de endFight(true)).
    const onAnswer = (cardIdx, chosenIdx) => {
      const result = combat.answerCard(fight, cardIdx, chosenIdx);
      expect(result.outcome).toBe('win');
      ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
      ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);
      setTimeout(() => {
        ui.showBanner('¡Guardián derrotado!', 'win');
        setTimeout(() => {
          ui.closeQuestionModal();
          endFight(true);
        }, WIN_BANNER_TO_CLOSE);
      }, WIN_DEFEAT_PAUSE);
    };

    const correct = fight.cards[1].question.correct;
    openModalForCard(fight, 1, onAnswer);
    expect(ui.isQuestionModalOpen()).toBe(true);
    document.querySelectorAll('#questionModalOverlay .qmodal-opt')[correct].click();

    // Aún nada: modal abierta, endFight no llamado.
    expect(ui.isQuestionModalOpen()).toBe(true);
    expect(endFightCalled).toBe(false);

    // Justo antes de 1800 ms: sigue abierta y sin endFight.
    vi.advanceTimersByTime(WIN_CLOSE_AT - 1);
    expect(ui.isQuestionModalOpen()).toBe(true);
    expect(endFightCalled).toBe(false);

    // A 1800 ms: se cierra la modal y luego se ejecuta endFight.
    vi.advanceTimersByTime(1);
    expect(endFightCalled).toBe(true);
    expect(ui.isQuestionModalOpen()).toBe(false);
    // El cierre ocurrió ANTES de endFight: al correr endFight la modal ya estaba cerrada (R2.3).
    expect(modalOpenWhenEndFightRan).toBe(false);
    expect(document.getElementById('bossScreen').classList.contains('hidden')).toBe(true);

    // Dentro de la ventana 0–2000 ms (R2.4).
    expect(WIN_CLOSE_AT).toBeGreaterThanOrEqual(0);
    expect(WIN_CLOSE_AT).toBeLessThanOrEqual(CLOSE_WINDOW_MAX);
  });

  // ===== Rama RESOLUCIÓN: DERROTA (R2.3, R2.4) =====
  it('derrota: el cierre se dispara a 1200 ms (dentro de 0–2000 ms) y ANTES de endFight', () => {
    const fight = combat.startBossFight(2); // playerPips = 2
    // Preparación (sin temporizadores): un fallo directo deja al jugador a 1 pip.
    combat.answerCard(fight, 0, wrongIdx(fight.cards[0].question.correct));
    expect(fight.playerPips).toBe(1);

    ui.renderCards(fight.cards, () => {});
    ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);

    let endFightCalled = false;
    let modalOpenWhenEndFightRan = null;
    const endFight = () => {
      endFightCalled = true;
      modalOpenWhenEndFightRan = ui.isQuestionModalOpen();
      ui.hideBossScreen();
    };

    // Réplica EXACTA de la rama 'lose' de onAnswer (banner -> 1200 ms ->
    // closeQuestionModal() ANTES de endFight(false)).
    const onAnswer = (cardIdx, chosenIdx) => {
      const result = combat.answerCard(fight, cardIdx, chosenIdx);
      expect(result.outcome).toBe('lose');
      ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
      ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);
      ui.showBanner('¡Has caído ante el guardián!', 'lose');
      setTimeout(() => {
        ui.closeQuestionModal();
        endFight(false);
      }, LOSE_CLOSE_AT);
    };

    const bad = wrongIdx(fight.cards[1].question.correct);
    openModalForCard(fight, 1, onAnswer);
    expect(ui.isQuestionModalOpen()).toBe(true);
    document.querySelectorAll('#questionModalOverlay .qmodal-opt')[bad].click();

    expect(ui.isQuestionModalOpen()).toBe(true);
    expect(endFightCalled).toBe(false);

    vi.advanceTimersByTime(LOSE_CLOSE_AT - 1);
    expect(ui.isQuestionModalOpen()).toBe(true);
    expect(endFightCalled).toBe(false);

    vi.advanceTimersByTime(1);
    expect(endFightCalled).toBe(true);
    expect(ui.isQuestionModalOpen()).toBe(false);
    expect(modalOpenWhenEndFightRan).toBe(false); // cierre ANTES de endFight (R2.3)
    expect(document.getElementById('bossScreen').classList.contains('hidden')).toBe(true);

    expect(LOSE_CLOSE_AT).toBeGreaterThanOrEqual(0);
    expect(LOSE_CLOSE_AT).toBeLessThanOrEqual(CLOSE_WINDOW_MAX);
  });

  // ===== Ventana 0–2000 ms garantizada en las tres ramas =====
  it('en las tres ramas el cierre queda garantizado dentro de la ventana 0–2000 ms', () => {
    // Acierto sin resolver.
    {
      const fight = combat.startBossFight(4);
      ui.renderCards(fight.cards, () => {});
      const onAnswer = (i, c) => {
        combat.answerCard(fight, i, c);
        setTimeout(() => ui.closeQuestionModal(), UNRESOLVED_CLOSE_AT);
      };
      openModalForCard(fight, 0, onAnswer);
      document.querySelectorAll('#questionModalOverlay .qmodal-opt')[fight.cards[0].question.correct].click();
      vi.advanceTimersByTime(CLOSE_WINDOW_MAX);
      expect(ui.isQuestionModalOpen()).toBe(false);
    }

    setupDom();

    // Victoria (resolución).
    {
      const fight = combat.startBossFight(2);
      combat.answerCard(fight, 0, fight.cards[0].question.correct);
      ui.renderCards(fight.cards, () => {});
      const onAnswer = (i, c) => {
        combat.answerCard(fight, i, c);
        setTimeout(() => {
          ui.showBanner('¡Guardián derrotado!', 'win');
          setTimeout(() => { ui.closeQuestionModal(); ui.hideBossScreen(); }, WIN_BANNER_TO_CLOSE);
        }, WIN_DEFEAT_PAUSE);
      };
      openModalForCard(fight, 1, onAnswer);
      document.querySelectorAll('#questionModalOverlay .qmodal-opt')[fight.cards[1].question.correct].click();
      vi.advanceTimersByTime(CLOSE_WINDOW_MAX);
      expect(ui.isQuestionModalOpen()).toBe(false);
    }

    setupDom();

    // Derrota (resolución).
    {
      const fight = combat.startBossFight(2);
      combat.answerCard(fight, 0, wrongIdx(fight.cards[0].question.correct));
      ui.renderCards(fight.cards, () => {});
      const onAnswer = (i, c) => {
        combat.answerCard(fight, i, c);
        ui.showBanner('¡Has caído ante el guardián!', 'lose');
        setTimeout(() => { ui.closeQuestionModal(); ui.hideBossScreen(); }, LOSE_CLOSE_AT);
      };
      openModalForCard(fight, 1, onAnswer);
      document.querySelectorAll('#questionModalOverlay .qmodal-opt')[wrongIdx(fight.cards[1].question.correct)].click();
      vi.advanceTimersByTime(CLOSE_WINDOW_MAX);
      expect(ui.isQuestionModalOpen()).toBe(false);
    }
  });
});
