/* ===== Tests del módulo de combate (src/combat/fight.js) ===== */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { startBossFight, answerCard, MAX_CARD_COUNT } from './fight.js';
import * as fightModule from './fight.js';
import { BOSS_NAMES } from '../data/services.js';
import { renderPips } from '../ui/screens.js';

describe('startBossFight — umbrales iniciales', () => {
  // Feature: combate-cartas-escaladas, Property 8: Umbrales iniciales válidos y según fórmula
  // Actualizada por el bugfix "barra-vida-jefe-no-refleja": la vida del jefe es ahora
  // un punto por carta (bossPips === cardCount) en lugar de ceil(cardCount / 2).
  it('Property 8: los umbrales iniciales son válidos y siguen la fórmula del diseño', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (level) => {
        const fight = startBossFight(level);
        const { cardCount, bossPips, bossPipsMax, playerPips } = fight;

        // Vida del jefe = un punto de vida por carta (un acierto por carta).
        expect(bossPips).toBe(cardCount);
        expect(bossPipsMax).toBe(cardCount);
        // Tolerancia del jugador (sin cambios): cardCount - ceil(cardCount / 2) + 1.
        expect(playerPips).toBe(cardCount - Math.ceil(cardCount / 2) + 1);
        // 1 <= bossPips <= cardCount
        expect(bossPips).toBeGreaterThanOrEqual(1);
        expect(bossPips).toBeLessThanOrEqual(cardCount);
        // playerPips >= 1
        expect(playerPips).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});
describe('startBossFight — escalado de cardCount', () => {
  // Feature: combate-cartas-escaladas, Property 9: cardCount válido, acotado y monótono
  it('Property 9: cardCount es entero en 1..7, monótono no decreciente respecto al nivel y se satura en 7', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: 1, max: 100 }), fc.integer({ min: 1, max: 100 })),
        ([x, y]) => {
          const a = Math.min(x, y);
          const b = Math.max(x, y);

          const ca = startBossFight(a).cardCount;
          const cb = startBossFight(b).cardCount;

          // Ambos son enteros válidos acotados en el rango 1..MAX_CARD_COUNT
          expect(Number.isInteger(ca)).toBe(true);
          expect(Number.isInteger(cb)).toBe(true);
          expect(ca).toBeGreaterThanOrEqual(1);
          expect(ca).toBeLessThanOrEqual(MAX_CARD_COUNT);
          expect(cb).toBeGreaterThanOrEqual(1);
          expect(cb).toBeLessThanOrEqual(MAX_CARD_COUNT);

          // Monótono no decreciente: a <= b implica cardCount(a) <= cardCount(b)
          expect(ca).toBeLessThanOrEqual(cb);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: combate-cartas-escaladas, Property 9: cardCount válido, acotado y monótono
  it('Property 9: para cualquier nivel >= 7 el cardCount se satura en MAX_CARD_COUNT', () => {
    fc.assert(
      fc.property(fc.integer({ min: 7, max: 100 }), (level) => {
        expect(startBossFight(level).cardCount).toBe(MAX_CARD_COUNT);
      }),
      { numRuns: 100 }
    );
  });
});
describe('startBossFight — unicidad de servicios', () => {
  // Feature: combate-cartas-escaladas, Property 10: Servicios únicos por combate
  it('Property 10: los servicios de las cartas son únicos y hay exactamente cardCount', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (level) => {
        const fight = startBossFight(level);
        const ids = fight.cards.map(c => c.service.id);

        // Hay exactamente cardCount ids (una por carta)
        expect(ids.length).toBe(fight.cardCount);
        // Todos los service.id son únicos: el tamaño del Set coincide con cardCount
        expect(new Set(ids).size === fight.cardCount).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
describe('startBossFight — forma del estado de combate', () => {
  // Feature: combate-cartas-escaladas, Property 11: Forma del estado de combate
  it('Property 11: el estado devuelto expone los campos esperados y cards.length coincide con cardCount', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (level) => {
        const fight = startBossFight(level);

        // Todos los campos de la forma del estado están presentes
        expect(fight).toHaveProperty('cardCount');
        expect(fight).toHaveProperty('playerPips');
        expect(fight).toHaveProperty('bossPips');
        expect(fight).toHaveProperty('cards');
        expect(fight).toHaveProperty('bossLabel');

        // cards es un arreglo y su longitud coincide con cardCount
        expect(Array.isArray(fight.cards)).toBe(true);
        expect(fight.cards.length).toBe(fight.cardCount);
      }),
      { numRuns: 100 }
    );
  });
});
describe('startBossFight — formato de la etiqueta del jefe', () => {
  // Feature: combate-cartas-escaladas, Property 12: Formato de la etiqueta del jefe
  it('Property 12: bossLabel es "{nombre del guardián} — Nivel {level}" con un nombre no vacío', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (level) => {
        const fight = startBossFight(level);

        // Nombre esperado del guardián: se satura en el último nombre disponible.
        const expectedName = BOSS_NAMES[Math.min(level, BOSS_NAMES.length) - 1];

        // El nombre del guardián debe ser una cadena no vacía.
        expect(typeof expectedName).toBe('string');
        expect(expectedName.length).toBeGreaterThan(0);

        // bossLabel es la concatenación del nombre con el sufijo " — Nivel {level}".
        expect(fight.bossLabel).toBe(expectedName + ' — Nivel ' + level);

        // Y siempre termina con el sufijo de nivel esperado.
        expect(fight.bossLabel.endsWith(' — Nivel ' + level)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
describe('answerCard — bloqueo de cartas al fallar', () => {
  // Feature: combate-cartas-escaladas, Property 1: Fallar bloquea la carta de forma permanente; acertar no la bloquea
  it('Property 1: solo las respuestas incorrectas bloquean la carta y ninguna carta bloqueada vuelve a desbloquearse', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 20 }),
        (level, actions) => {
          const fight = startBossFight(level);
          const cardCount = fight.cardCount;

          // Conjunto de cartas ya bloqueadas observadas a lo largo de la secuencia.
          const everLocked = new Set();

          for (const [rawIdx, rawChosen] of actions) {
            // Mapear a un índice de carta válido para que la acción sea significativa.
            const idx = rawIdx % cardCount;
            const card = fight.cards[idx];
            const optionCount = card.question.options.length;
            const chosenIdx = rawChosen % optionCount;

            // Estado previo a la acción (capturado ANTES de que answerCard refresque la pregunta).
            const wasResolved = fight.resolved;
            const wasLocked = card.locked;
            const wasCorrect = chosenIdx === card.question.correct;

            // Registrar todas las cartas actualmente bloqueadas antes de la acción.
            const lockedBefore = fight.cards
              .map((c, i) => (c.locked ? i : -1))
              .filter(i => i !== -1);
            lockedBefore.forEach(i => everLocked.add(i));

            answerCard(fight, idx, chosenIdx);

            // (a) Si la carta estaba desbloqueada y el combate no estaba resuelto:
            //     - acertar NO la bloquea (sigue disponible para otra pregunta),
            //     - fallar la bloquea de forma permanente.
            if (!wasResolved && !wasLocked) {
              if (wasCorrect) {
                expect(fight.cards[idx].locked).toBe(false);
              } else {
                expect(fight.cards[idx].locked).toBe(true);
              }
            }

            // (b) Ninguna carta previamente bloqueada vuelve a estar desbloqueada:
            //     el bloqueo es monótono (una vez bloqueada, permanece bloqueada).
            for (const i of everLocked) {
              expect(fight.cards[i].locked).toBe(true);
            }

            // Actualizar el registro con las cartas bloqueadas tras la acción.
            fight.cards.forEach((c, i) => {
              if (c.locked) everLocked.add(i);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
describe('answerCard — no-op ante carta bloqueada o combate resuelto', () => {
  // Feature: combate-cartas-escaladas, Property 2: Responder una carta bloqueada o un combate resuelto no altera el estado
  it('Property 2: responder una carta ya bloqueada no altera el estado y retorna un resultado neutro', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.nat(),
        fc.nat(),
        (level, rawIdx, rawChosen) => {
          const fight = startBossFight(level);
          const cardCount = fight.cardCount;

          // Elegir una carta válida y bloquearla respondiéndola una vez.
          const idx = rawIdx % cardCount;
          const firstOptionCount = fight.cards[idx].question.options.length;
          // Forzar una respuesta incorrecta para evitar dañar al jefe innecesariamente;
          // aun así el combate podría resolverse si el jugador se queda sin pips.
          const wrongChoice = (fight.cards[idx].question.correct + 1) % firstOptionCount;
          answerCard(fight, idx, wrongChoice);

          // Si el combate se resolvió al bloquear la carta, este caso no aplica
          // (se cubre en el escenario de "combate resuelto"): salir como éxito.
          if (fight.resolved) return true;

          // Snapshot del estado relevante tras bloquear la carta.
          const snapshot = {
            playerPips: fight.playerPips,
            bossPips: fight.bossPips,
            resolved: fight.resolved,
            locked: fight.cards.map(c => c.locked),
          };

          // Responder de nuevo la MISMA carta ya bloqueada con cualquier opción.
          const optionCount = fight.cards[idx].question.options.length;
          const chosenIdx = rawChosen % optionCount;
          const result = answerCard(fight, idx, chosenIdx);

          // El estado relevante permanece idéntico (no-op).
          expect(fight.playerPips).toBe(snapshot.playerPips);
          expect(fight.bossPips).toBe(snapshot.bossPips);
          expect(fight.resolved).toBe(snapshot.resolved);
          expect(fight.cards.map(c => c.locked)).toEqual(snapshot.locked);

          // El resultado devuelto es neutro según el diseño (combate no resuelto).
          expect(result).toEqual({ correct: false, resolved: false, outcome: null, perfect: null });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: combate-cartas-escaladas, Property 2: Responder una carta bloqueada o un combate resuelto no altera el estado
  it('Property 2: responder cuando el combate está resuelto no altera el estado', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.nat(),
        fc.nat(),
        (level, rawIdx, rawChosen) => {
          const fight = startBossFight(level);
          const cardCount = fight.cardCount;

          // Llevar el combate a resolved === true forzando una victoria:
          // responder siempre con la opción correcta hasta que el jefe caiga.
          for (let i = 0; i < cardCount && !fight.resolved; i++) {
            if (fight.cards[i].locked) continue;
            answerCard(fight, i, fight.cards[i].question.correct);
          }

          // Con cartas suficientes para superar bossPips (= cardCount),
          // el combate debe estar resuelto tras responder correctamente.
          expect(fight.resolved).toBe(true);

          // Snapshot del estado tras la resolución.
          const snapshot = {
            playerPips: fight.playerPips,
            bossPips: fight.bossPips,
            resolved: fight.resolved,
            locked: fight.cards.map(c => c.locked),
          };

          // Intentar responder cualquier índice con el combate ya resuelto.
          const idx = rawIdx % cardCount;
          const optionCount = fight.cards[idx].question.options.length;
          const chosenIdx = rawChosen % optionCount;
          answerCard(fight, idx, chosenIdx);

          // El estado relevante permanece idéntico (no-op).
          expect(fight.playerPips).toBe(snapshot.playerPips);
          expect(fight.bossPips).toBe(snapshot.bossPips);
          expect(fight.resolved).toBe(snapshot.resolved);
          expect(fight.cards.map(c => c.locked)).toEqual(snapshot.locked);
        }
      ),
      { numRuns: 100 }
    );
  });
});
describe('answerCard — la pregunta solo cambia al acertar', () => {
  // Feature: combate-cartas-escaladas, Property 3: La pregunta de una carta solo se sustituye al acertar sin resolver el combate
  it('Property 3: si la pregunta de una carta cambia, fue por un acierto en carta desbloqueada con el combate en curso', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 20 }),
        (level, actions) => {
          const fight = startBossFight(level);
          const cardCount = fight.cardCount;

          for (const [rawIdx, rawChosen] of actions) {
            // Mapear a un índice de carta válido y a una opción válida.
            const idx = rawIdx % cardCount;
            const card = fight.cards[idx];
            const optionCount = card.question.options.length;
            const chosenIdx = rawChosen % optionCount;

            // Referencia y condiciones ANTES de responder.
            const before = card.question;
            const wasResolved = fight.resolved;
            const wasLocked = card.locked;
            const wasCorrect = chosenIdx === card.question.correct;

            answerCard(fight, idx, chosenIdx);

            const after = fight.cards[idx].question;

            // La pregunta solo puede cambiar como consecuencia de un acierto válido:
            // carta desbloqueada y combate no resuelto antes de responder.
            if (before !== after) {
              expect(wasResolved).toBe(false);
              expect(wasLocked).toBe(false);
              expect(wasCorrect).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
describe('answerCard — aplicación del daño y resultado de la respuesta', () => {
  // Feature: combate-cartas-escaladas, Property 4: Aplicación correcta del daño y del resultado de la respuesta
  it('Property 4: responder una carta no bloqueada aplica el daño correcto y reporta el resultado esperado', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.nat(),
        fc.nat(),
        // forceMode: 0 = usar chosenIdx libre, 1 = forzar respuesta correcta, 2 = forzar incorrecta
        fc.integer({ min: 0, max: 2 }),
        (level, rawIdx, rawChosen, forceMode) => {
          const fight = startBossFight(level);
          const cardCount = fight.cardCount;

          // Combate recién iniciado: outcome null y todas las cartas desbloqueadas.
          const idx = rawIdx % cardCount;
          const card = fight.cards[idx];
          const optionCount = card.question.options.length;
          const correctIdx = card.question.correct;

          // Elegir la opción según el modo para garantizar cobertura de ambos casos.
          let chosenIdx;
          if (forceMode === 1) {
            // Forzar respuesta correcta.
            chosenIdx = correctIdx;
          } else if (forceMode === 2) {
            // Forzar respuesta incorrecta (opción distinta a la correcta).
            chosenIdx = (correctIdx + 1) % optionCount;
          } else {
            // chosenIdx libre acotado al número de opciones.
            chosenIdx = rawChosen % optionCount;
          }

          const expectedCorrect = chosenIdx === correctIdx;

          // Estado antes de responder.
          const bossPipsBefore = fight.bossPips;
          const playerPipsBefore = fight.playerPips;

          const result = answerCard(fight, idx, chosenIdx);

          // El resultado reporta correctamente si la respuesta fue acertada.
          expect(result.correct).toBe(expectedCorrect);

          if (expectedCorrect) {
            // Acierto: bossPips baja en 1 (clamp en 0), playerPips sin cambios.
            expect(fight.bossPips).toBe(Math.max(0, bossPipsBefore - 1));
            expect(fight.playerPips).toBe(playerPipsBefore);
          } else {
            // Fallo: playerPips baja en 1 (clamp en 0), bossPips sin cambios.
            expect(fight.playerPips).toBe(Math.max(0, playerPipsBefore - 1));
            expect(fight.bossPips).toBe(bossPipsBefore);
          }

          // Los contadores nunca quedan por debajo de 0.
          expect(fight.bossPips).toBeGreaterThanOrEqual(0);
          expect(fight.playerPips).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
describe('answerCard — victoria estable', () => {
  // Feature: combate-cartas-escaladas, Property 5: bossPips en 0 produce victoria estable
  it('Property 5: al llevar bossPips a 0 respondiendo correctamente se gana y la victoria es estable ante acciones posteriores', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 20 }),
        (level, extraActions) => {
          const fight = startBossFight(level);
          const cardCount = fight.cardCount;

          // Conducir el combate a la victoria respondiendo SIEMPRE correctamente
          // (se deriva la opción de card.question.correct). Con la vida del jefe =
          // cardCount aciertos, responder cartas correctas garantiza ganar.
          let winResult = null;
          for (let i = 0; i < cardCount && !fight.resolved; i++) {
            if (fight.cards[i].locked) continue;
            const res = answerCard(fight, i, fight.cards[i].question.correct);
            // El movimiento que resuelve el combate es la jugada ganadora.
            if (res.resolved) {
              winResult = res;
              break;
            }
          }

          // El movimiento ganador reporta victoria y el combate queda resuelto.
          expect(winResult).not.toBeNull();
          expect(winResult.outcome).toBe('win');
          expect(winResult.resolved).toBe(true);
          expect(fight.resolved).toBe(true);
          expect(fight.bossPips).toBe(0);

          // Estabilidad: tras la resolución, cualquier secuencia de acciones adicionales
          // no debe alterar la victoria. Snapshot del estado ganador.
          const bossPipsAfterWin = fight.bossPips;
          const playerPipsAfterWin = fight.playerPips;

          for (const [rawIdx, rawChosen] of extraActions) {
            const idx = rawIdx % cardCount;
            const optionCount = fight.cards[idx].question.options.length;
            const chosenIdx = rawChosen % optionCount;

            const res = answerCard(fight, idx, chosenIdx);

            // Post-resolución, answerCard es no-op: retorna outcome null y resolved true.
            expect(res).toEqual({ correct: false, resolved: true, outcome: null, perfect: null });

            // La victoria se mantiene estable: resolved sigue true y los pips no cambian.
            expect(fight.resolved).toBe(true);
            expect(fight.bossPips).toBe(bossPipsAfterWin);
            expect(fight.playerPips).toBe(playerPipsAfterWin);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
describe('answerCard — derrota estable', () => {
  // Feature: combate-cartas-escaladas, Property 6: playerPips en 0 (con bossPips > 0) produce derrota estable
  it('Property 6: al llevar playerPips a 0 respondiendo incorrectamente se pierde (con bossPips > 0) y la derrota es estable ante acciones posteriores', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 20 }),
        (level, extraActions) => {
          const fight = startBossFight(level);
          const cardCount = fight.cardCount;

          // Conducir el combate a la derrota respondiendo SIEMPRE incorrectamente.
          // Con playerDefeatThreshold = cardCount - ceil(cardCount/2) + 1 fallos el
          // jugador pierde. Como los fallos nunca reducen bossPips, al perder bossPips > 0.
          let loseResult = null;
          for (let i = 0; i < cardCount && !fight.resolved; i++) {
            if (fight.cards[i].locked) continue;
            const card = fight.cards[i];
            const wrong = (card.question.correct + 1) % card.question.options.length;
            const res = answerCard(fight, i, wrong);
            // El movimiento que resuelve el combate es la jugada perdedora.
            if (res.resolved) {
              loseResult = res;
              break;
            }
          }

          // El movimiento perdedor reporta derrota y el combate queda resuelto.
          expect(loseResult).not.toBeNull();
          expect(loseResult.outcome).toBe('lose');
          expect(loseResult.resolved).toBe(true);
          expect(fight.resolved).toBe(true);
          expect(fight.playerPips).toBe(0);
          // Requisito 2.5: la derrota exige bossPips > 0 (los fallos no dañan al jefe).
          expect(fight.bossPips).toBeGreaterThan(0);

          // Estabilidad: tras la resolución, cualquier secuencia de acciones adicionales
          // no debe alterar la derrota. Snapshot del estado perdedor.
          const bossPipsAfterLose = fight.bossPips;
          const playerPipsAfterLose = fight.playerPips;

          for (const [rawIdx, rawChosen] of extraActions) {
            const idx = rawIdx % cardCount;
            const optionCount = fight.cards[idx].question.options.length;
            const chosenIdx = rawChosen % optionCount;

            const res = answerCard(fight, idx, chosenIdx);

            // Post-resolución, answerCard es no-op: retorna outcome null y resolved true.
            expect(res).toEqual({ correct: false, resolved: true, outcome: null, perfect: null });

            // La derrota se mantiene estable: resolved sigue true y los pips no cambian.
            expect(fight.resolved).toBe(true);
            expect(fight.bossPips).toBe(bossPipsAfterLose);
            expect(fight.playerPips).toBe(playerPipsAfterLose);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
describe('answerCard — resolución garantizada del combate', () => {
  // Feature: combate-cartas-escaladas, Property 7: Todo combate se resuelve a más tardar en la última carta
  it('Property 7: al responder todas las cartas exactamente una vez el combate queda resuelto con un resultado definido', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        // Un booleano por posible carta que decide si se responde correcta (true) o incorrectamente (false).
        // Se cicla si hay menos booleanos que cartas.
        fc.array(fc.boolean(), { minLength: 0, maxLength: MAX_CARD_COUNT }),
        (level, answerCorrectly) => {
          const fight = startBossFight(level);
          const cardCount = fight.cardCount;

          // Invariante inicial tras el bugfix "barra-vida-jefe-no-refleja":
          //   bossPips === cardCount (un acierto por carta) y
          //   playerPips === cardCount - ceil(cardCount / 2) + 1 (tolerancia del jugador).
          // Cada respuesta decrementa exactamente uno de los dos contadores; como los
          // aciertos refrescan la carta (se puede volver a responder) y los fallos la
          // bloquean, todo combate se resuelve si se sigue respondiendo.
          expect(fight.bossPips).toBe(cardCount);
          expect(fight.playerPips).toBe(cardCount - Math.ceil(cardCount / 2) + 1);

          // Rastrear el resultado del movimiento que resuelve el combate.
          let resolvingOutcome = null;

          // Responder cartas desbloqueadas hasta que el combate se resuelva. Con la vida
          // del jefe = cardCount, una sola pasada ya no garantiza la resolución, por lo
          // que se itera sobre las cartas disponibles con un tope de seguridad.
          const maxAnswers = cardCount * (MAX_CARD_COUNT + 2) + 10;
          let answerIndex = 0;
          for (let guard = 0; guard < maxAnswers && !fight.resolved; guard++) {
            // Elegir la primera carta desbloqueada disponible.
            const i = fight.cards.findIndex(c => !c.locked);
            if (i === -1) break; // sin cartas disponibles (no debería ocurrir antes de resolver)

            const card = fight.cards[i];
            const optionCount = card.question.options.length;
            const correctIdx = card.question.correct;

            // Decidir la opción según el booleano correspondiente (ciclando si es necesario).
            const wantCorrect =
              answerCorrectly.length > 0
                ? answerCorrectly[answerIndex % answerCorrectly.length]
                : true;
            const chosenIdx = wantCorrect ? correctIdx : (correctIdx + 1) % optionCount;
            answerIndex++;

            const res = answerCard(fight, i, chosenIdx);
            if (res.resolved) {
              resolvingOutcome = res.outcome;
              break;
            }
          }

          // El combate queda resuelto con un resultado definido.
          expect(fight.resolved).toBe(true);
          // El resultado del movimiento resolutorio es 'win' o 'lose'.
          expect(['win', 'lose']).toContain(resolvingOutcome);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('fight.js — superficie de exports del módulo', () => {
  // Feature: combate-cartas-escaladas, Requisitos 1.4 y 1.5:
  // refreshCardQuestion se eliminó porque contradice el intento único por carta.
  it('no exporta refreshCardQuestion (fue eliminada del módulo)', () => {
    // El export ya no debe existir en el módulo de combate.
    expect(fightModule.refreshCardQuestion).toBeUndefined();

    // Verificación de cordura: los exports vigentes siguen presentes.
    expect(typeof fightModule.startBossFight).toBe('function');
    expect(typeof fightModule.answerCard).toBe('function');
  });
});

describe('startBossFight — ejemplos y bordes (unit)', () => {
  // Feature: combate-cartas-escaladas
  // Tests de ejemplo/borde (no property). Validan Requisitos 4.2, 4.3, 4.4, 5.2, 5.3.

  // --- cardCount: caso base y bordes de saturación (Requisitos 4.3 y 4.4) ---

  it('Requisito 4.3: en el nivel 1 el combate tiene exactamente 1 carta', () => {
    expect(startBossFight(1).cardCount).toBe(1);
  });

  it('Requisito 4.4: cardCount crece con el nivel hasta 6', () => {
    // Justo antes del tope: cada nivel produce su propio número de cartas.
    expect(startBossFight(6).cardCount).toBe(6);
  });

  it('Requisito 4.4: en el nivel 7 el cardCount alcanza el máximo de 7 cartas', () => {
    expect(startBossFight(7).cardCount).toBe(7);
  });

  it('Requisito 4.4: en el nivel 8 el cardCount se satura en 7 (no supera el máximo)', () => {
    expect(startBossFight(8).cardCount).toBe(7);
  });

  it('Requisito 4.4: para un nivel muy alto (100) el cardCount sigue saturado en 7', () => {
    expect(startBossFight(100).cardCount).toBe(7);
  });

  // --- Tabla de umbrales por cardCount (Requisitos 4.2, 5.2, 5.3) ---
  // Cada fila es [level, bossPips esperado, playerPips esperado].
  // Actualizada por el bugfix "barra-vida-jefe-no-refleja": la vida del jefe es
  // ahora un punto por carta (bossPips === cardCount === level para 1..7). La
  // tolerancia del jugador (playerPips = cardCount - ceil(cardCount/2) + 1) no cambia.
  const thresholdTable = [
    { level: 1, bossPips: 1, playerPips: 1 },
    { level: 2, bossPips: 2, playerPips: 2 },
    { level: 3, bossPips: 3, playerPips: 2 },
    { level: 4, bossPips: 4, playerPips: 3 },
    { level: 5, bossPips: 5, playerPips: 3 },
    { level: 6, bossPips: 6, playerPips: 4 },
    { level: 7, bossPips: 7, playerPips: 4 },
  ];

  for (const { level, bossPips, playerPips } of thresholdTable) {
    it(`Requisitos 4.2/5.2/5.3: nivel ${level} produce bossPips=${bossPips} y playerPips=${playerPips}`, () => {
      const fight = startBossFight(level);
      // El nivel coincide con el cardCount para 1..7 (aún sin saturación).
      expect(fight.cardCount).toBe(level);
      // Umbral del jefe: aciertos necesarios para vencerlo.
      expect(fight.bossPips).toBe(bossPips);
      // Umbral del jugador: fallos tolerables antes de perder.
      expect(fight.playerPips).toBe(playerPips);
    });
  }

  // --- bossLabel: nombre del guardián dentro y fuera del rango de BOSS_NAMES ---

  it('bossLabel usa el guardián correspondiente cuando el nivel está dentro del rango de BOSS_NAMES', () => {
    // Nivel 3 está dentro del rango (BOSS_NAMES tiene 12 entradas).
    const level = 3;
    const fight = startBossFight(level);
    const expectedName = BOSS_NAMES[level - 1];
    expect(fight.bossLabel).toBe(expectedName + ' — Nivel ' + level);
  });

  it('bossLabel usa el último guardián cuando el nivel excede la cantidad de BOSS_NAMES', () => {
    // Nivel que supera la longitud del arreglo de nombres: debe reutilizar el último.
    const level = BOSS_NAMES.length + 5;
    const fight = startBossFight(level);
    const lastName = BOSS_NAMES[BOSS_NAMES.length - 1];

    // El nombre del último guardián no está vacío.
    expect(lastName.length).toBeGreaterThan(0);
    // La etiqueta usa el último guardián y conserva el nivel real (no acotado).
    expect(fight.bossLabel).toBe(lastName + ' — Nivel ' + level);
  });

  it('bossLabel para el nivel 100 usa el último guardián con nombre no vacío', () => {
    const level = 100;
    const fight = startBossFight(level);
    const lastName = BOSS_NAMES[BOSS_NAMES.length - 1];

    expect(lastName.length).toBeGreaterThan(0);
    expect(fight.bossLabel).toBe(lastName + ' — Nivel ' + level);
  });
});

/* =========================================================================
 * Bugfix: barra-vida-jefe-no-refleja
 * Property 1 (Bug Condition / Expected Behavior):
 *   La vida del jefe equivale al número de cartas y se refleja visiblemente.
 *
 * PRUEBA DE EXPLORACIÓN DE LA CONDICIÓN DEL BUG.
 * Esta prueba codifica el comportamiento ESPERADO (correcto) y DEBE FALLAR
 * sobre el código sin corregir: hoy `startBossFight` fija la vida del jefe en
 * `Math.ceil(cardCount / 2)` en lugar de `cardCount`. El fallo confirma el bug.
 *
 * Cuando se implemente la corrección (tarea 3.1), esta misma prueba pasará
 * y validará que `bossPips === cardCount` y `bossPipsMax === cardCount`.
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3, 2.4
 * ========================================================================= */
describe('startBossFight — Bugfix Property 1: vida del jefe = número de cartas', () => {
  // Property 1 (Bug Condition): para todo level >= 1, la vida (inicial y máxima)
  // del jefe debe ser igual al número de cartas = min(level, MAX_CARD_COUNT).
  it('Property 1: para todo level >= 1, bossPips === cardCount y bossPipsMax === cardCount', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (level) => {
        const fight = startBossFight(level);
        const cardCount = Math.min(level, MAX_CARD_COUNT);

        // La vida del jefe equivale a un punto por carta (un acierto por carta).
        expect(fight.bossPips).toBe(cardCount);
        expect(fight.bossPipsMax).toBe(cardCount);
      }),
      { numRuns: 100 }
    );
  });

  // Ejemplos deterministas concretos (refuerzo de la propiedad).
  // Se indica entre paréntesis el valor buggy actual para documentar el contraejemplo.
  const examples = [
    { level: 2, expected: 2 },   // hoy 1
    { level: 4, expected: 4 },   // hoy 2
    { level: 6, expected: 6 },   // hoy 3
    { level: 7, expected: 7 },   // hoy 4
    { level: 100, expected: 7 }, // hoy 4 (saturado en MAX_CARD_COUNT)
  ];

  for (const { level, expected } of examples) {
    it(`Property 1 (ejemplo): nivel ${level} → bossPips = ${expected} y bossPipsMax = ${expected}`, () => {
      const fight = startBossFight(level);
      expect(fight.bossPips).toBe(expected);
      expect(fight.bossPipsMax).toBe(expected);
    });
  }

  // Un acierto por carta derrota al jefe: responder correctamente exactamente
  // cardCount cartas lleva bossPips a 0 (ni antes ni después).
  it('Property 1: derrotar al jefe requiere un acierto por carta (cardCount aciertos)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (level) => {
        const fight = startBossFight(level);
        const cardCount = Math.min(level, MAX_CARD_COUNT);

        let correctAnswers = 0;
        for (let i = 0; i < cardCount && !fight.resolved; i++) {
          answerCard(fight, i, fight.cards[i].question.correct);
          correctAnswers++;
        }

        // Con la vida del jefe = cardCount, se necesitan exactamente cardCount aciertos.
        expect(correctAnswers).toBe(cardCount);
        expect(fight.bossPips).toBe(0);
        expect(fight.resolved).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

/* =========================================================================
 * Bugfix: barra-vida-jefe-no-refleja
 * Property 2 (Preservation):
 *   Tolerancia del jugador y mecánica de combate inalteradas.
 *
 * PRUEBAS DE PRESERVACIÓN (metodología de observación primero).
 * Estas pruebas capturan el comportamiento OBSERVADO en el código SIN corregir
 * para las entradas NO buggy (todo lo ajeno a la vida del jefe) y DEBEN PASAR
 * tanto antes como después de la corrección. La corrección solo cambia
 * `bossPips`/`bossPipsMax`; nada de lo aquí verificado debe cambiar.
 *
 * Comportamiento base observado (código sin corregir):
 *   - playerPips === playerPipsMax === cardCount - ceil(cardCount / 2) + 1
 *     (nivel 4 → 3, nivel 6 → 4, nivel 7 → 4).
 *   - cardCount === min(level, MAX_CARD_COUNT).
 *   - answerCard al fallar: bloquea la carta de forma permanente y reduce
 *     playerPips en 1.
 *   - answerCard al acertar sin resolver: refresca la pregunta y NO bloquea.
 *   - playerPips === 0 produce outcome === 'lose'.
 *   - renderPips dibuja `total` casillas: las primeras `current` llenas y el
 *     resto con la clase `lost` (estilo de barra inalterado).
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * ========================================================================= */

/**
 * Fórmula de tolerancia del jugador observada en el código sin corregir.
 * Debe permanecer idéntica tras la corrección (Req 3.4).
 */
function expectedPlayerPips(cardCount) {
  return cardCount - Math.ceil(cardCount / 2) + 1;
}

describe('startBossFight — Bugfix Property 2 (Preservation): tolerancia del jugador', () => {
  // Req 3.4: la vida/tolerancia del jugador no cambia con la corrección.
  it('Property 2: para todo level >= 1, playerPips === playerPipsMax === cardCount - ceil(cardCount/2) + 1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (level) => {
        const fight = startBossFight(level);
        const cardCount = Math.min(level, MAX_CARD_COUNT);
        const expected = expectedPlayerPips(cardCount);

        expect(fight.playerPips).toBe(expected);
        expect(fight.playerPipsMax).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  // Ejemplos deterministas de la tolerancia del jugador observada (refuerzo).
  const playerExamples = [
    { level: 1, expected: 1 },
    { level: 2, expected: 2 },
    { level: 4, expected: 3 },
    { level: 6, expected: 4 },
    { level: 7, expected: 4 },
    { level: 100, expected: 4 }, // saturado en MAX_CARD_COUNT (7)
  ];

  for (const { level, expected } of playerExamples) {
    it(`Property 2 (ejemplo): nivel ${level} → playerPips = ${expected} y playerPipsMax = ${expected}`, () => {
      const fight = startBossFight(level);
      expect(fight.playerPips).toBe(expected);
      expect(fight.playerPipsMax).toBe(expected);
    });
  }
});

describe('startBossFight — Bugfix Property 2 (Preservation): forma del estado', () => {
  // Req 3.6 (fuera del alcance de la vida del jefe): cardCount, cards y bossLabel
  // conservan su forma y valores; la corrección no los toca.
  it('Property 2: cardCount === min(level, 7), cards.length === cardCount y bossLabel intacto', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (level) => {
        const fight = startBossFight(level);
        const cardCount = Math.min(level, MAX_CARD_COUNT);
        const expectedName = BOSS_NAMES[Math.min(level, BOSS_NAMES.length) - 1];

        // cardCount inalterado.
        expect(fight.cardCount).toBe(cardCount);

        // cards: arreglo con exactamente cardCount cartas, todas desbloqueadas al inicio.
        expect(Array.isArray(fight.cards)).toBe(true);
        expect(fight.cards.length).toBe(cardCount);
        for (const card of fight.cards) {
          expect(card.locked).toBe(false);
          expect(card).toHaveProperty('service');
          expect(card).toHaveProperty('question');
        }

        // bossLabel: formato inalterado.
        expect(fight.bossLabel).toBe(expectedName + ' — Nivel ' + level);

        // resolved inicia en false.
        expect(fight.resolved).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

describe('answerCard — Bugfix Property 2 (Preservation): mecánica de combate inalterada', () => {
  // Reqs 3.1, 3.3: para cualquier secuencia de respuestas, al fallar se bloquea la
  // carta y baja playerPips en 1; al acertar sin resolver se refresca la pregunta y
  // NO se bloquea. El bloqueo es monótono (nunca se desbloquea).
  it('Property 2: fallar bloquea la carta y resta 1 pip al jugador; acertar sin resolver refresca la pregunta y no bloquea', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 30 }),
        (level, actions) => {
          const fight = startBossFight(level);
          const cardCount = fight.cardCount;

          for (const [rawIdx, rawChosen] of actions) {
            const idx = rawIdx % cardCount;
            const card = fight.cards[idx];
            const optionCount = card.question.options.length;
            const chosenIdx = rawChosen % optionCount;

            // Estado capturado ANTES de responder (answerCard puede refrescar la pregunta).
            const wasResolved = fight.resolved;
            const wasLocked = card.locked;
            const wasCorrect = chosenIdx === card.question.correct;
            const playerPipsBefore = fight.playerPips;
            const questionBefore = card.question;

            answerCard(fight, idx, chosenIdx);

            if (wasResolved) {
              // Combate resuelto: no-op sobre el daño del jugador y el bloqueo.
              expect(fight.playerPips).toBe(playerPipsBefore);
              expect(fight.cards[idx].locked).toBe(wasLocked);
              continue;
            }

            if (wasLocked) {
              // Carta ya bloqueada: no-op (sigue bloqueada, sin daño al jugador).
              expect(fight.cards[idx].locked).toBe(true);
              expect(fight.playerPips).toBe(playerPipsBefore);
              continue;
            }

            if (wasCorrect) {
              // Acierto en carta desbloqueada: no daña al jugador y no bloquea la carta.
              expect(fight.playerPips).toBe(playerPipsBefore);
              expect(fight.cards[idx].locked).toBe(false);
              // Al acertar sin resolver el combate, la pregunta se refresca.
              if (!fight.resolved) {
                expect(fight.cards[idx].question).not.toBe(questionBefore);
              }
            } else {
              // Fallo en carta desbloqueada: bloqueo permanente y -1 pip al jugador.
              expect(fight.cards[idx].locked).toBe(true);
              expect(fight.playerPips).toBe(Math.max(0, playerPipsBefore - 1));
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Req 3.2: quedarse sin vida (playerPips === 0) resuelve el combate como derrota.
  it('Property 2: respondiendo siempre mal, al llegar playerPips a 0 el outcome es "lose" y bossPips > 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (level) => {
        const fight = startBossFight(level);
        const cardCount = fight.cardCount;

        let loseResult = null;
        for (let i = 0; i < cardCount && !fight.resolved; i++) {
          if (fight.cards[i].locked) continue;
          const card = fight.cards[i];
          const wrong = (card.question.correct + 1) % card.question.options.length;
          const res = answerCard(fight, i, wrong);
          if (res.resolved) {
            loseResult = res;
            break;
          }
        }

        // Los fallos nunca dañan al jefe: al agotar la vida del jugador se pierde.
        expect(loseResult).not.toBeNull();
        expect(loseResult.outcome).toBe('lose');
        expect(fight.resolved).toBe(true);
        expect(fight.playerPips).toBe(0);
        expect(fight.bossPips).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('renderPips — Bugfix Property 2 (Preservation): estilo de las barras', () => {
  // Req 3.5: la barra dibuja `total` casillas; las primeras `current` llenas y el
  // resto con la clase `lost`. La corrección no modifica renderPips ni su estilo.
  it('Property 2: renderPips dibuja `total` pips con las primeras `current` llenas y el resto con clase "lost"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12 }),
        fc.integer({ min: 0, max: 12 }),
        (total, rawCurrent) => {
          const current = Math.min(rawCurrent, total);

          // Contenedor de barra recreado en cada iteración.
          const el = document.createElement('div');
          el.id = 'pipBarPreservationTest';
          document.body.appendChild(el);

          try {
            renderPips('pipBarPreservationTest', current, total);

            const pips = el.querySelectorAll('.pip');
            // Se dibuja exactamente `total` casillas.
            expect(pips.length).toBe(total);

            pips.forEach((pip, i) => {
              if (i < current) {
                // Casilla restante: llena (sin clase `lost`).
                expect(pip.classList.contains('lost')).toBe(false);
              } else {
                // Casilla consumida: marcada como `lost`.
                expect(pip.classList.contains('lost')).toBe(true);
              }
            });
          } finally {
            el.remove();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
