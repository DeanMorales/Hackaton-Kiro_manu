import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as combat from '../combat/fight.js';
import * as ui from '../ui/screens.js';

/**
 * Integration Tests — Flujo de combate y reflejo de la barra de vida del jefe
 * (spec: barra-vida-jefe-no-refleja)
 *
 * Estas pruebas verifican el flujo completo del combate usando los MÓDULOS REALES
 * de producción sin mocks:
 *   - `combat.startBossFight` / `combat.answerCard` (src/combat/fight.js)
 *   - `ui.renderPips` / `ui.showBanner` (src/ui/screens.js)
 *
 * Sobre la temporización del banner de victoria:
 * `src/main.js` NO es importable de forma aislada en jsdom porque, al cargarse,
 * accede a `#gameCanvas` y a `canvas.getContext('2d')` (que jsdom no implementa) y
 * lanza "Canvas 2D no soportado", además de arrancar `requestAnimationFrame` y la
 * inicialización asíncrona del leaderboard. Por ello, siguiendo el enfoque del test
 * de integración existente (`leaderboard.integration.test.js`, que ejercita los
 * módulos directamente), reproducimos aquí la orquestación EXACTA de la rama `win`
 * de `onAnswer` (misma secuencia: `renderPips('bossHpBar', 0, ...)` inmediato y luego,
 * tras una pausa de 500 ms vía `setTimeout`, `showBanner('¡Guardián derrotado!', 'win')`).
 * Así validamos el ORDEN de operaciones de UI con temporizadores falsos sin depender
 * de la carga de main.js.
 */

// Réplica fiel de la constante usada en src/main.js -> onAnswer (rama 'win').
const BOSS_DEFEAT_PAUSE = 500; // ms

/**
 * Reproduce la orquestación de `onAnswer` de src/main.js para una respuesta,
 * usando las funciones reales de combate y de UI. Mantiene el mismo orden:
 * 1) answerCard, 2) repintar ambas barras, 3) según el resultado, banner (con la
 * pausa de 500 ms en la victoria).
 */
function simulateAnswer(fight, cardIdx, chosenIdx) {
  const result = combat.answerCard(fight, cardIdx, chosenIdx);

  // Repintado de barras (idéntico a main.js, tras answerCard).
  ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
  ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);

  if (result.outcome === 'win') {
    // El último decremento ya está pintado (bossHpBar en 0). Pausa breve y luego banner.
    setTimeout(() => {
      ui.showBanner('¡Guardián derrotado!', 'win');
      setTimeout(() => { /* endFight(true) */ }, 1300);
    }, BOSS_DEFEAT_PAUSE);
  } else if (result.outcome === 'lose') {
    ui.showBanner('¡Has caído ante el guardián!', 'lose');
  }

  return result;
}

/** Cuenta cuántas casillas (pips) de una barra están marcadas como perdidas ('lost'). */
function countLostPips(elId) {
  const el = document.getElementById(elId);
  return el.querySelectorAll('.pip.lost').length;
}

/** Cuenta el total de casillas (pips) dibujadas en una barra. */
function countPips(elId) {
  const el = document.getElementById(elId);
  return el.querySelectorAll('.pip').length;
}

/** Casillas llenas (no perdidas) de una barra. */
function countFilledPips(elId) {
  return countPips(elId) - countLostPips(elId);
}

describe('Combate del jefe — flujo de integración (barra de vida)', () => {
  beforeEach(() => {
    // DOM mínimo requerido por renderPips y showBanner.
    document.body.innerHTML = `
      <div id="bossScreen" class="hidden">
        <div id="bossName"></div>
        <div id="fightBanner" class="banner hidden"></div>
        <div id="playerHpBar"></div>
        <div id="bossHpBar"></div>
        <div id="cardsRow"></div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ===== Req 2.3: decremento perceptible por acierto (una casilla pasa a 'lost') =====
  it('muestra un decremento perceptible en #bossHpBar por cada acierto (nivel >= 2)', () => {
    const fight = combat.startBossFight(4); // 4 cartas -> bossPips = 4
    expect(fight.bossPips).toBe(4);
    expect(fight.bossPipsMax).toBe(4);

    // Pintado inicial: 4 casillas, todas llenas.
    ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);
    expect(countPips('bossHpBar')).toBe(4);
    expect(countLostPips('bossHpBar')).toBe(0);

    // Acierto que NO resuelve el combate.
    const correctIdx = fight.cards[0].question.correct;
    const result = simulateAnswer(fight, 0, correctIdx);

    expect(result.correct).toBe(true);
    expect(result.outcome).toBeNull();
    expect(fight.bossPips).toBe(3);

    // La barra refleja el decremento: sigue con 4 casillas y exactamente 1 perdida.
    expect(countPips('bossHpBar')).toBe(4);
    expect(countLostPips('bossHpBar')).toBe(1);
    expect(countFilledPips('bossHpBar')).toBe(3);
  });

  it('acumula un decremento por acierto a lo largo de varios aciertos', () => {
    const fight = combat.startBossFight(6); // 6 cartas -> bossPips = 6
    ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);

    // Tres aciertos consecutivos en cartas distintas: bossPips 6 -> 3.
    for (let i = 0; i < 3; i++) {
      const correctIdx = fight.cards[i].question.correct;
      simulateAnswer(fight, i, correctIdx);
      // Tras cada acierto, el nº de casillas perdidas iguala al nº de aciertos.
      expect(countLostPips('bossHpBar')).toBe(i + 1);
      expect(countPips('bossHpBar')).toBe(6);
    }
    expect(fight.bossPips).toBe(3);
    expect(countFilledPips('bossHpBar')).toBe(3);
  });

  // ===== Req 2.4: golpe mortal — barra a 0 primero, banner tras la pausa =====
  it('golpe mortal: la barra queda en 0 casillas llenas y el banner aparece tras la pausa', () => {
    vi.useFakeTimers();
    try {
      const fight = combat.startBossFight(2); // 2 cartas -> bossPips = 2
      ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);

      // Primer acierto: bossPips 2 -> 1 (combate continúa).
      simulateAnswer(fight, 0, fight.cards[0].question.correct);
      expect(fight.bossPips).toBe(1);
      expect(countLostPips('bossHpBar')).toBe(1);

      // Segundo acierto: golpe mortal, bossPips 1 -> 0 (outcome 'win').
      const result = simulateAnswer(fight, 1, fight.cards[1].question.correct);
      expect(result.outcome).toBe('win');
      expect(fight.bossPips).toBe(0);

      // INMEDIATAMENTE tras el golpe mortal: la barra ya está en 0 casillas llenas...
      expect(countPips('bossHpBar')).toBe(2);
      expect(countFilledPips('bossHpBar')).toBe(0);
      expect(countLostPips('bossHpBar')).toBe(2);

      // ...pero el banner de victoria AÚN no aparece (todavía no pasó la pausa).
      const banner = document.getElementById('fightBanner');
      expect(banner.textContent).not.toContain('¡Guardián derrotado!');

      // Avanzar hasta justo antes de completar la pausa: sigue sin banner.
      vi.advanceTimersByTime(BOSS_DEFEAT_PAUSE - 1);
      expect(banner.textContent).not.toContain('¡Guardián derrotado!');

      // Al completarse la pausa, aparece el banner de victoria.
      vi.advanceTimersByTime(1);
      expect(banner.textContent).toBe('¡Guardián derrotado!');
      expect(banner.className).toContain('win');

      // La barra sigue vaciada (0 llenas) cuando aparece el banner.
      expect(countFilledPips('bossHpBar')).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // ===== Req 3.4 / 3.6: la vida del jugador y el flujo fuera del combate no se afectan =====
  it('la vida del jugador no se ve afectada al acertar (tolerancia preservada)', () => {
    const fight = combat.startBossFight(6);
    // Tolerancia del jugador según la fórmula preservada: cardCount - ceil(cardCount/2) + 1.
    const expectedPlayerPips = 6 - Math.ceil(6 / 2) + 1; // = 4
    expect(fight.playerPips).toBe(expectedPlayerPips);
    expect(fight.playerPipsMax).toBe(expectedPlayerPips);

    ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
    expect(countLostPips('playerHpBar')).toBe(0);

    // Acertar varias veces no toca la vida del jugador.
    for (let i = 0; i < 3; i++) {
      simulateAnswer(fight, i, fight.cards[i].question.correct);
    }
    expect(fight.playerPips).toBe(expectedPlayerPips);
    expect(countLostPips('playerHpBar')).toBe(0);
    expect(countFilledPips('playerHpBar')).toBe(expectedPlayerPips);
  });

  it('la corrección de la vida del jefe no altera la forma del estado fuera de combate', () => {
    // startBossFight NO toca el DOM ni ningún estado global: solo devuelve un objeto plano.
    const before = document.body.innerHTML;
    const fight = combat.startBossFight(5);

    // Forma de retorno intacta (cardCount, cards, bossLabel, resolved) + pips esperados.
    expect(fight.cardCount).toBe(5);
    expect(fight.cards).toHaveLength(5);
    expect(typeof fight.bossLabel).toBe('string');
    expect(fight.resolved).toBe(false);
    expect(fight.bossPips).toBe(5);
    expect(fight.bossPipsMax).toBe(5);

    // El DOM no fue modificado por startBossFight (responsabilidad exclusiva de la UI).
    expect(document.body.innerHTML).toBe(before);
  });

  // ===== Preservación: fallar sigue dañando al jugador y bloqueando la carta =====
  it('al fallar, se daña al jugador y se bloquea la carta (comportamiento preservado)', () => {
    const fight = combat.startBossFight(4);
    ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
    ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);

    const initialPlayerPips = fight.playerPips;
    const correctIdx = fight.cards[0].question.correct;
    const wrongIdx = correctIdx === 0 ? 1 : 0; // cualquier opción distinta a la correcta

    const result = simulateAnswer(fight, 0, wrongIdx);

    expect(result.correct).toBe(false);
    expect(fight.playerPips).toBe(initialPlayerPips - 1);
    expect(fight.cards[0].locked).toBe(true);
    // El jefe NO recibe daño al fallar.
    expect(fight.bossPips).toBe(fight.bossPipsMax);
    expect(countLostPips('bossHpBar')).toBe(0);
    // La barra del jugador refleja el daño (una casilla perdida).
    expect(countLostPips('playerHpBar')).toBe(1);
  });
});
