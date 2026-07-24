/* ===== COMBAT: duelo contra el guardián ===== */
import { AWS_SERVICES, BOSS_NAMES, shuffle, pickQuestion } from '../data/services.js';

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
  const cardCount = Math.min(level, 4);
  const services = shuffle(AWS_SERVICES).slice(0, cardCount);
  const cards = services.map(s => ({ service: s, question: pickQuestion(s.id, null), locked: false }));
  const bossLabel = BOSS_NAMES[Math.min(level, 4) - 1] + ` — Nivel ${level}`;
  return {
    cardCount,
    playerPips: cardCount,
    bossPips: cardCount,
    resolved: false,
    cards,
    bossLabel,
  };
}

/**
 * Procesa la respuesta del jugador a una carta de combate.
 * 
 * Muta el estado de combate (`fight.playerPips`, `fight.bossPips`, `fight.resolved`, `cards[idx].locked`)
 * pero NO toca el DOM ni dispara audio directamente.
 * 
 * @param {Object} fight - Estado del combate actual.
 * @param {number} idx - Índice de la carta respondida.
 * @param {number} chosenIdx - Índice de la opción elegida por el jugador.
 * @returns {{correct: boolean, resolved: boolean, outcome: 'win'|'lose'|null}}
 */
export function answerCard(fight, idx, chosenIdx) {
  if (fight.resolved) return { correct: false, resolved: true, outcome: null };
  
  const card = fight.cards[idx];
  if (card.locked) return { correct: false, resolved: false, outcome: null };
  
  card.locked = true;
  const correct = chosenIdx === card.question.correct;

  if (correct) {
    fight.bossPips = Math.max(0, fight.bossPips - 1);
  } else {
    fight.playerPips = Math.max(0, fight.playerPips - 1);
  }

  let outcome = null;
  if (fight.bossPips <= 0) {
    fight.resolved = true;
    outcome = 'win';
  } else if (fight.playerPips <= 0) {
    fight.resolved = true;
    outcome = 'lose';
  }

  return { correct, resolved: fight.resolved, outcome };
}

/**
 * Refresca la pregunta de una carta con una nueva del mismo servicio, evitando repetir la pregunta anterior.
 * 
 * @param {Object} fight - Estado del combate actual.
 * @param {number} idx - Índice de la carta a refrescar.
 */
export function refreshCardQuestion(fight, idx) {
  const card = fight.cards[idx];
  card.question = pickQuestion(card.service.id, card.question.text);
  card.locked = false;
}
