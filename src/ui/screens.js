/* ===== UI: overlays y HUD del DOM ===== */
import { sfx } from '../audio/sfx.js';

/**
 * Actualiza el HUD con el número de piso actual y la cuenta regresiva hasta la próxima puerta.
 * @param {number} floorNum - Número del piso actual (0-indexed desde el piso base).
 * @param {number} doorIn - Cuántos pisos faltan hasta la próxima puerta.
 */
export function updateHud(floorNum, doorIn) {
  document.getElementById('floorNum').textContent = String(floorNum);
  document.getElementById('doorIn').textContent = String(doorIn);
}

/**
 * Muestra la pantalla de inicio.
 */
export function showStartScreen() {
  document.getElementById('startScreen').classList.remove('hidden');
}

/**
 * Oculta la pantalla de inicio.
 */
export function hideStartScreen() {
  document.getElementById('startScreen').classList.add('hidden');
}

/**
 * Muestra la pantalla de game over con título y detalle.
 * @param {string} title - Título del mensaje de game over.
 * @param {string} detail - Detalle explicativo del game over.
 */
export function showGameOverScreen(title, detail) {
  document.getElementById('gameOverTitle').textContent = title;
  document.getElementById('gameOverDetail').textContent = detail;
  document.getElementById('gameOverScreen').classList.remove('hidden');
}

/**
 * Oculta la pantalla de game over.
 */
export function hideGameOverScreen() {
  document.getElementById('gameOverScreen').classList.add('hidden');
}

/**
 * Muestra la pantalla de combate contra el jefe.
 * @param {string} bossLabel - Etiqueta del jefe (nombre + nivel).
 * @param {number} cardCount - Número de cartas en el combate.
 */
export function showBossScreen(bossLabel, cardCount) {
  document.getElementById('bossName').textContent = bossLabel;
  document.getElementById('fightBanner').classList.add('hidden');
  document.getElementById('bossScreen').classList.remove('hidden');
}

/**
 * Oculta la pantalla de combate contra el jefe.
 */
export function hideBossScreen() {
  document.getElementById('bossScreen').classList.add('hidden');
}

/**
 * Renderiza las barras de vida (pips) de un combatiente.
 * @param {string} elId - ID del elemento contenedor de la barra de vida.
 * @param {number} current - Número de pips actuales (restantes).
 * @param {number} total - Número total de pips.
 */
export function renderPips(elId, current, total) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'pip' + (i >= current ? ' lost' : '');
    el.appendChild(d);
  }
}

/**
 * Renderiza las cartas de servicio AWS en la fila de cartas del combate.
 * @param {Array} cards - Array de objetos carta con { service: {abbr, name, color}, question, locked }.
 * @param {Function} onCardClick - Callback que recibe el índice de la carta clicada.
 */
export function renderCards(cards, onCardClick) {
  const row = document.getElementById('cardsRow');
  row.innerHTML = '';
  cards.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.idx = idx;
    el.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front" style="background:linear-gradient(160deg, ${card.service.color}, ${shade(card.service.color, -30)})">
          <div class="abbr">${card.service.abbr}</div>
          <div class="svcname">${card.service.name}</div>
          <div class="tap-hint">toca para responder</div>
        </div>
        <div class="card-face card-back">
          <div class="qtext"></div>
          <div class="opts"></div>
        </div>
      </div>`;
    el.addEventListener('click', () => onCardClick(idx));
    row.appendChild(el);
  });
}

/**
 * Renderiza el reverso de una carta con la pregunta y las opciones.
 * @param {HTMLElement} cardEl - Elemento DOM de la carta.
 * @param {Object} card - Objeto carta con { question: {text, options}, locked }.
 * @param {Function} onAnswer - Callback que recibe (cardIdx, chosenOptionIdx).
 * @param {number} cardIdx - Índice de la carta.
 */
export function renderCardBack(cardEl, card, onAnswer, cardIdx) {
  if (!cardEl.classList.contains('flipped')) {
    // flip to reveal question
    sfx.flipCard();
    cardEl.classList.add('flipped');
    const back = cardEl.querySelector('.card-back');
    back.querySelector('.qtext').textContent = card.question.text;
    const optsWrap = back.querySelector('.opts');
    optsWrap.innerHTML = '';
    card.question.options.forEach((opt, oi) => {
      const b = document.createElement('button');
      b.className = 'opt-btn';
      b.textContent = opt;
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onAnswer(cardIdx, oi);
      });
      optsWrap.appendChild(b);
    });
  }
}

/**
 * Muestra un banner de resultado en la pantalla de combate.
 * @param {string} text - Texto del banner.
 * @param {string} kind - Tipo de banner ('win' o 'lose').
 */
export function showBanner(text, kind) {
  const b = document.getElementById('fightBanner');
  b.textContent = text;
  b.className = 'banner ' + kind;
}

/**
 * Conecta los listeners de input (clic/toque, teclado, botones) con sus callbacks.
 * @param {Object} handlers - Objeto con { onDrop, onStart, onRetry }.
 */
export function bindInputHandlers({ onDrop, onStart, onRetry }) {
  const canvas = document.getElementById('gameCanvas');
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onDrop();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      onDrop();
    }
  });
  document.getElementById('startBtn').addEventListener('click', onStart);
  document.getElementById('retryBtn').addEventListener('click', onRetry);
}

/**
 * Muestra un mensaje visible de incompatibilidad de navegador.
 * @param {string} reason - Razón de la incompatibilidad (ej. "Canvas 2D no soportado").
 */
export function showIncompatibilityMessage(reason) {
  const startScreen = document.getElementById('startScreen');
  startScreen.innerHTML = `
    <div class="panel facet-cut">
      <div class="crest">⚠️</div>
      <h1>Navegador no compatible</h1>
      <p class="subtitle">Lo sentimos, tu navegador no soporta las tecnologías requeridas para ejecutar este juego.</p>
      <p class="subtitle"><strong>Razón:</strong> ${reason}</p>
      <p class="subtitle">Por favor, intenta con un navegador moderno como Chrome, Firefox, Edge o Safari en su última versión.</p>
    </div>
  `;
  startScreen.classList.remove('hidden');
}

/* ===== UTILIDADES INTERNAS ===== */

/**
 * Calcula un tono más oscuro o más claro de un color hexadecimal.
 * @param {string} hex - Color en formato hexadecimal (#RRGGBB).
 * @param {number} percent - Porcentaje de cambio (positivo más claro, negativo más oscuro).
 * @returns {string} Color resultante en formato hexadecimal.
 */
function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + percent,
    g = ((num >> 8) & 0x00ff) + percent,
    b = (num & 0x0000ff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}
