import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateDifficultyIndicator } from '../ui/screens.js';

/**
 * Integration Tests — Indicador visual de dificultad (#bossDifficulty)
 * (spec: dificultad-progresiva-preguntas, Tasks 9.1 y 9.2)
 *
 * Task 9.1 — Validates: Requirements 5.1, 5.2
 * Task 9.2 — Validates: Requirement 5.3
 *
 * Se usa el módulo real `updateDifficultyIndicator` de src/ui/screens.js
 * y un DOM mínimo montado en jsdom (provisto por vitest con environment: 'jsdom').
 * El módulo sfx importado por screens.js ya envuelve toda reproducción de audio
 * en try/catch, por lo que no requiere mock explícito en entorno jsdom.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Task 9.1: Prueba de integración del indicador visual (R5.1, R5.2)
// ─────────────────────────────────────────────────────────────────────────────
describe('Indicador visual de dificultad — #bossDifficulty (R5.1, R5.2)', () => {
  beforeEach(() => {
    // Montar el markup mínimo de #bossScreen con el nodo #bossDifficulty.
    document.body.innerHTML = `
      <div id="bossScreen">
        <div id="bossName">Guardián</div>
        <div id="bossDifficulty"></div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('muestra "Dificultad: Fácil" y data-level="1" para nivel 1 (R5.1)', () => {
    updateDifficultyIndicator(1);
    const el = document.getElementById('bossDifficulty');
    expect(el.textContent).toBe('Dificultad: Fácil');
    expect(el.dataset.level).toBe('1');
  });

  it('muestra "Dificultad: Media" y data-level="2" para nivel 2 (R5.1)', () => {
    updateDifficultyIndicator(2);
    const el = document.getElementById('bossDifficulty');
    expect(el.textContent).toBe('Dificultad: Media');
    expect(el.dataset.level).toBe('2');
  });

  it('muestra "Dificultad: Difícil" y data-level="3" para nivel 3 (R5.1)', () => {
    updateDifficultyIndicator(3);
    const el = document.getElementById('bossDifficulty');
    expect(el.textContent).toBe('Dificultad: Difícil');
    expect(el.dataset.level).toBe('3');
  });

  it('actualiza el texto al cambiar de nivel entre combates sucesivos (R5.2)', () => {
    const el = document.getElementById('bossDifficulty');

    // Combate 1 — nivel 1 → Fácil
    updateDifficultyIndicator(1);
    expect(el.textContent).toBe('Dificultad: Fácil');
    expect(el.dataset.level).toBe('1');

    // Combate 2 — nivel 2 → Media (el texto cambia)
    updateDifficultyIndicator(2);
    expect(el.textContent).toBe('Dificultad: Media');
    expect(el.dataset.level).toBe('2');

    // Combate 3 — nivel >= 3 → Difícil (el texto cambia de nuevo)
    updateDifficultyIndicator(3);
    expect(el.textContent).toBe('Dificultad: Difícil');
    expect(el.dataset.level).toBe('3');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 9.2: Degradación elegante sin nodo #bossDifficulty (R5.3)
// ─────────────────────────────────────────────────────────────────────────────
describe('Degradación elegante del indicador — sin #bossDifficulty (R5.3)', () => {
  beforeEach(() => {
    // DOM vacío: no existe el nodo #bossDifficulty.
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('no lanza cuando #bossDifficulty no existe en el DOM (R5.3)', () => {
    expect(() => updateDifficultyIndicator(1)).not.toThrow();
  });

  it('no lanza con cualquier valor de dificultad cuando falta el nodo (R5.3)', () => {
    expect(() => updateDifficultyIndicator(2)).not.toThrow();
    expect(() => updateDifficultyIndicator(3)).not.toThrow();
  });

  it('completa silenciosamente y el flujo puede continuar sin el indicador (R5.3)', () => {
    // La función retorna undefined (sin excepción) y no altera el DOM vacío.
    const result = updateDifficultyIndicator(1);
    expect(result).toBeUndefined();
    expect(document.body.innerHTML).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 9.3: Pruebas de humo — preservación del comportamiento (R6.1, R6.2, R6.3)
// ─────────────────────────────────────────────────────────────────────────────
import { describe as describeSmoke, it as itSmoke, expect as expectSmoke } from 'vitest';
import { startBossFight, answerCard, MAX_CARD_COUNT } from '../combat/fight.js';

describeSmoke('Humo — preservación de cardCount (R6.2)', () => {
  it('cardCount === Math.min(level, MAX_CARD_COUNT) para nivel 1', () => {
    const fight = startBossFight(1);
    expectSmoke(fight.cardCount).toBe(Math.min(1, MAX_CARD_COUNT));
  });

  it('cardCount === Math.min(level, MAX_CARD_COUNT) para nivel 5', () => {
    const fight = startBossFight(5);
    expectSmoke(fight.cardCount).toBe(Math.min(5, MAX_CARD_COUNT));
  });

  it('cardCount === Math.min(level, MAX_CARD_COUNT) para nivel 7 (tope MAX)', () => {
    const fight = startBossFight(7);
    expectSmoke(fight.cardCount).toBe(Math.min(7, MAX_CARD_COUNT));
  });

  it('cardCount se satura en MAX_CARD_COUNT para nivel 20', () => {
    const fight = startBossFight(20);
    expectSmoke(fight.cardCount).toBe(MAX_CARD_COUNT);
  });
});

describeSmoke('Humo — mecánica de respuestas: acierto reduce bossPips, fallo reduce playerPips (R6.3)', () => {
  it('un acierto reduce bossPips en 1 y no altera playerPips', () => {
    const fight = startBossFight(3);
    const bossBefore = fight.bossPips;
    const playerBefore = fight.playerPips;

    // Responder con la opción correcta en la primera carta
    const correctIdx = fight.cards[0].question.correct;
    const result = answerCard(fight, 0, correctIdx);

    expectSmoke(result.correct).toBe(true);
    expectSmoke(fight.bossPips).toBe(bossBefore - 1);
    expectSmoke(fight.playerPips).toBe(playerBefore);
  });

  it('un fallo reduce playerPips en 1 y no altera bossPips', () => {
    const fight = startBossFight(3);
    const bossBefore = fight.bossPips;
    const playerBefore = fight.playerPips;

    // Responder con una opción incorrecta en la primera carta
    const correctIdx = fight.cards[0].question.correct;
    const wrongIdx = (correctIdx + 1) % 4;
    const result = answerCard(fight, 0, wrongIdx);

    expectSmoke(result.correct).toBe(false);
    expectSmoke(fight.bossPips).toBe(bossBefore);
    expectSmoke(fight.playerPips).toBe(playerBefore - 1);
  });

  it('la carta queda bloqueada tras un fallo', () => {
    const fight = startBossFight(2);
    const correctIdx = fight.cards[0].question.correct;
    const wrongIdx = (correctIdx + 1) % 4;

    answerCard(fight, 0, wrongIdx);
    expectSmoke(fight.cards[0].locked).toBe(true);
  });

  it('la carta NO queda bloqueada tras un acierto (con combate no resuelto)', () => {
    const fight = startBossFight(5); // 5 cartas → el jefe tiene 5 pips, un acierto no lo resuelve
    const correctIdx = fight.cards[0].question.correct;

    answerCard(fight, 0, correctIdx);
    expectSmoke(fight.cards[0].locked).toBe(false);
  });
});
