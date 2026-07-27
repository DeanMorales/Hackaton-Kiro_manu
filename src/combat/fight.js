/* ===== COMBAT: duelo contra el guardián ===== */
import { AWS_SERVICES, BOSS_NAMES, shuffle, pickQuestion } from '../data/services.js';

/**
 * Número máximo de cartas que puede tener un combate, sin importar el nivel.
 * `cardCount` se acota a este valor: niveles >= 7 siempre producen 7 cartas.
 */
export const MAX_CARD_COUNT = 7;

/**
 * Calcula la configuración inicial de un combate contra el guardián para un nivel dado.
 *
 * A diferencia del monolito, esta función NO toca el DOM (no llama a
 * `document.getElementById`, `renderPips` ni `renderCards`) ni muta `state.screen`.
 * Esas responsabilidades ahora viven en Main_Module/UI_Module.
 *
 * Forma de retorno (plana): `{ cardCount, playerPips, bossPips, resolved, cards, bossLabel }`
 * - `cardCount`, `playerPips`, `bossPips`, `resolved`, `cards` tienen la misma forma
 *   que el objeto `fight` del monolito.
 * - `bossLabel` es un campo adicional (no existía en `fight` del monolito, se calculaba
 *   inline al setear `bossName.textContent`) con el texto `"{BOSS_NAMES[...]} — Nivel {level}"`,
 *   incluido aquí para que quien llame (Main_Module) pueda pasar el resto de los campos
 *   como estado de combate y además leer `.bossLabel` para la UI.
 *
 * @param {number} level - Nivel actual del jugador (>= 1).
 * @returns {{cardCount:number, playerPips:number, bossPips:number, resolved:boolean, cards:Array<{service:object, question:object, locked:boolean}>, bossLabel:string}}
 */
export function startBossFight(level){
  const cardCount = Math.min(level, MAX_CARD_COUNT);
  // Vida del jefe = un punto de vida por carta: se requiere un acierto por carta
  // para derrotarlo y la barra dibuja tantas casillas como cartas tenga el combate.
  const bossPipsInit = cardCount;
  // Tolerancia de fallos del jugador: se calcula de forma independiente de la vida
  // del jefe para conservar EXACTAMENTE el mismo valor previo a la corrección.
  const playerDefeatThreshold = cardCount - Math.ceil(cardCount / 2) + 1;
  const services = shuffle(AWS_SERVICES).slice(0, cardCount);
  const cards = services.map(s => ({ service: s, question: pickQuestion(s.id, null), locked: false }));
  const bossLabel = BOSS_NAMES[Math.min(level, BOSS_NAMES.length) - 1] + ` — Nivel ${level}`;
  return {
    cardCount,
    playerPips: playerDefeatThreshold,
    bossPips: bossPipsInit,
    // Máximos iniciales de vida: sirven para dibujar las barras de pips con el
    // número correcto de casillas. La vida del jefe equivale a cardCount; la del
    // jugador conserva la tolerancia previa a la corrección.
    playerPipsMax: playerDefeatThreshold,
    bossPipsMax: bossPipsInit,
    resolved: false,
    // endless-tower-difficulty-cap: Requirement 3.1/3.2 — rastrea si el Duelo tuvo al menos un fallo
    failedAnyCard: false,
    cards,
    bossLabel,
  };
}

/**
 * Procesa la respuesta del jugador a una carta de combate.
 *
 * Muta el estado de combate (`fight.playerPips`, `fight.bossPips`, `fight.resolved`,
 * `cards[idx].locked`, `cards[idx].question`) pero NO toca el DOM ni dispara audio directamente.
 *
 * Mecánica de intento:
 * - ACERTAR: reduce `bossPips` en 1 y NO bloquea la carta. Si el combate sigue en curso,
 *   se refresca la pregunta de la carta (`pickQuestion`) para que el jugador pueda volver a
 *   responderla con una pregunta distinta del mismo servicio.
 * - FALLAR: bloquea la carta de forma permanente (`locked = true`) y reduce `playerPips` en 1.
 *
 * @param {Object} fight - Estado del combate actual.
 * @param {number} idx - Índice de la carta respondida.
 * @param {number} chosenIdx - Índice de la opción elegida por el jugador.
 * @returns {{correct: boolean, resolved: boolean, outcome: 'win'|'lose'|null}}
 */
export function answerCard(fight, idx, chosenIdx) {
  if (fight.resolved) return { correct: false, resolved: true, outcome: null, perfect: null };

  // Salvaguarda de índice inválido: si la carta no existe, no-op defensivo (sin mutar).
  const card = fight.cards[idx];
  if (card === undefined) return { correct: false, resolved: fight.resolved, outcome: null, perfect: null };

  if (card.locked) return { correct: false, resolved: false, outcome: null, perfect: null };

  const correct = chosenIdx === card.question.correct;

  if (correct) {
    // Acertar daña al jefe; la carta NO se bloquea (se refresca más abajo si el combate sigue).
    fight.bossPips = Math.max(0, fight.bossPips - 1);
  } else {
    // Fallar bloquea la carta de forma permanente y daña al jugador.
    card.locked = true;
    fight.playerPips = Math.max(0, fight.playerPips - 1);
    // endless-tower-difficulty-cap: Requirement 3.2 — un solo fallo basta para que el Duelo no sea perfecto
    fight.failedAnyCard = true;
  }

  let outcome = null;
  if (fight.bossPips <= 0) {
    fight.resolved = true;
    outcome = 'win';
  } else if (fight.playerPips <= 0) {
    fight.resolved = true;
    outcome = 'lose';
  }

  // Al acertar sin resolver el combate, refrescar la pregunta para volver a responder la carta.
  if (correct && !fight.resolved) {
    card.question = pickQuestion(card.service.id, card.question.text);
  }

  // endless-tower-difficulty-cap: Requirement 3.1/3.2 — `perfect` solo aplica a un Duelo Ganado:
  // es `true`/`false` según si hubo algún fallo durante el combate, y `null` cuando el Duelo
  // se pierde o aún no se resuelve (el concepto de "perfecto" no aplica en esos casos).
  return { correct, resolved: fight.resolved, outcome, perfect: outcome === 'win' ? !fight.failedAnyCard : null };
}
