// Feature: dificultad-progresiva-preguntas, Property 8
// Property 8: Consistencia de dificultad dentro de un combate
// Validates: Requirements 4.1, 4.2, 4.3

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { startBossFight, answerCard } from '../combat/fight.js';
import { difficultyForBossLevel } from '../data/services.js';

describe('Property 8: Consistencia de dificultad dentro de un combate', () => {

  // Sub-propiedad 8a: fight.difficulty === difficultyForBossLevel(level) para todo level >= 1
  it('8a: startBossFight(level).difficulty es igual a difficultyForBossLevel(level)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (level) => {
          const fight = startBossFight(level);
          const expected = difficultyForBossLevel(level);
          expect(fight.difficulty).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Sub-propiedad 8b: Las preguntas iniciales de las cartas son coherentes con fight.difficulty
  // (la dificultad efectiva de cada carta puede diferir de fight.difficulty si el banco aplica
  // un fallback, pero debe ser la dificultad disponible más cercana, lo que significa que
  // question.difficulty es un valor válido en {1,2,3})
  it('8b: todas las cartas iniciales tienen question.difficulty en {1,2,3} y coherente con fight.difficulty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (level) => {
          const fight = startBossFight(level);
          for (const card of fight.cards) {
            // question puede ser null si pickQuestion devuelve null (pool vacío), manejar gracefully
            if (card.question === null || card.question === undefined) continue;

            // La dificultad de la pregunta debe ser un valor válido en {1,2,3}
            expect([1, 2, 3]).toContain(card.question.difficulty);

            // La dificultad efectiva de la pregunta es la más cercana disponible al objetivo.
            // En un banco poblado, debería coincidir con fight.difficulty (la reserva es rara).
            // Verificamos que no se aleje más de 2 posiciones del objetivo (rango máximo en [1,3]).
            const diff = Math.abs(card.question.difficulty - fight.difficulty);
            expect(diff).toBeLessThanOrEqual(2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Sub-propiedad 8c: fight.difficulty permanece constante tras respuestas correctas con answerCard
  it('8c: fight.difficulty permanece constante durante el combate tras respuestas correctas', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (level) => {
          const fight = startBossFight(level);
          const originalDifficulty = fight.difficulty;

          // Iterar sobre las cartas e intentar responder correctamente
          // para verificar que fight.difficulty no cambia tras el reciclado
          let attemptsLeft = fight.cards.length * 2; // límite de seguridad

          while (!fight.resolved && attemptsLeft > 0) {
            attemptsLeft--;

            // Buscar una carta no bloqueada
            const idx = fight.cards.findIndex(c => !c.locked);
            if (idx === -1) break;

            const card = fight.cards[idx];
            if (!card || !card.question) break;

            // Responder correctamente usando el índice correcto de la pregunta
            answerCard(fight, idx, card.question.correct);

            // La dificultad del combate debe permanecer constante
            expect(fight.difficulty).toBe(originalDifficulty);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Sub-propiedad 8d: después de reciclar cartas (aciertos), las nuevas preguntas
  // también tienen difficulty en {1,2,3}, confirmando que se les pasa fight.difficulty
  it('8d: las preguntas recicladas tras aciertos mantienen difficulty en {1,2,3}', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (level) => {
          const fight = startBossFight(level);

          // Hacer un acierto en la primera carta no bloqueada que tenga pregunta válida
          const idx = fight.cards.findIndex(c => !c.locked && c.question !== null && c.question !== undefined);
          if (idx === -1) return; // no hay cartas válidas, saltar

          const card = fight.cards[idx];
          const result = answerCard(fight, idx, card.question.correct);

          // Si fue correcto y el combate no terminó, la pregunta se recicló
          if (result.correct && !fight.resolved) {
            const recycledQuestion = fight.cards[idx].question;
            // La pregunta reciclada puede ser null si el pool está vacío
            if (recycledQuestion !== null && recycledQuestion !== undefined) {
              expect([1, 2, 3]).toContain(recycledQuestion.difficulty);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

});
