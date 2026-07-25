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
 * Muestra la pantalla de game over con título, detalle y, opcionalmente, el nombre del jugador.
 * El nombre se escribe vía `textContent` para evitar inyección de HTML. Si el nombre es
 * vacío o falsy, el elemento `#gameOverPlayerName` se vacía y se oculta.
 * @param {string} title - Título del mensaje de game over.
 * @param {string} detail - Detalle explicativo del game over.
 * @param {string} [playerName] - Nombre opcional del jugador a mostrar.
 */
export function showGameOverScreen(title, detail, playerName) {
  const titleEl = document.getElementById('gameOverTitle');
  if (titleEl) titleEl.textContent = title;

  const detailEl = document.getElementById('gameOverDetail');
  if (detailEl) detailEl.textContent = detail;

  const nameEl = document.getElementById('gameOverPlayerName');
  if (nameEl) {
    const name = playerName || '';
    if (name) {
      nameEl.textContent = name;
      nameEl.classList.remove('hidden');
    } else {
      nameEl.textContent = '';
      nameEl.classList.add('hidden');
    }
  }

  const screenEl = document.getElementById('gameOverScreen');
  if (screenEl) screenEl.classList.remove('hidden');
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
 *
 * Actualiza en tiempo real: cuando el número de casillas no cambia (mismo `total`),
 * reutiliza los elementos `.pip` existentes y solo alterna la clase `lost`. Esto
 * permite que las transiciones/animaciones CSS se apliquen al pip que se pierde
 * (feedback perceptible) en lugar de recrear todo el DOM en cada actualización.
 * Cuando `total` cambia (nuevo combate), se reconstruye la barra desde cero.
 *
 * @param {string} elId - ID del elemento contenedor de la barra de vida.
 * @param {number} current - Número de pips actuales (restantes).
 * @param {number} total - Número total de pips.
 */
export function renderPips(elId, current, total) {
  const el = document.getElementById(elId);
  if (!el) return;

  const existing = el.querySelectorAll('.pip');

  // Actualización en el lugar: el número de casillas coincide, así que solo
  // cambiamos el estado de cada pip para que las transiciones CSS animen la pérdida.
  if (existing.length === total) {
    existing.forEach((pip, i) => {
      const shouldBeLost = i >= current;
      const wasLost = pip.classList.contains('lost');
      if (shouldBeLost && !wasLost) {
        // Pip recién perdido: marcar como perdido y disparar un pulso breve.
        pip.classList.add('lost', 'just-lost');
        setTimeout(() => pip.classList.remove('just-lost'), 400);
      } else if (!shouldBeLost && wasLost) {
        // Restaurar (p. ej. al reiniciar un combate con el mismo número de casillas).
        pip.classList.remove('lost', 'just-lost');
      }
    });
    return;
  }

  // Reconstrucción completa cuando cambia el número de casillas (nuevo combate).
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
    } else if (e.key === 'Enter') {
      // Enter inicia la partida mientras la pantalla de bienvenida está visible.
      const startScreen = document.getElementById('startScreen');
      if (startScreen && !startScreen.classList.contains('hidden')) {
        e.preventDefault();
        onStart();
      }
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

/**
 * Muestra el panel de configuración de audio, reflejando el volumen y el estado de mute vigentes.
 * @param {number} volumePercent - Volumen efectivo actual (0-100) a reflejar en el slider.
 * @param {boolean} isMuted - Estado de silencio actual a reflejar en el botón de mute.
 */
export function showAudioSettingsPanel(volumePercent, isMuted) {
  document.getElementById('volumeSlider').value = volumePercent;
  setMuteButtonState(isMuted);
  document.getElementById('audioSettingsPanel').classList.remove('hidden');
}

/**
 * Oculta el panel de configuración de audio.
 */
export function hideAudioSettingsPanel() {
  document.getElementById('audioSettingsPanel').classList.add('hidden');
}

/**
 * Indica si el panel de configuración de audio está visible actualmente.
 * @returns {boolean} `true` si el panel no tiene la clase 'hidden'.
 */
export function isAudioSettingsPanelVisible() {
  return !document.getElementById('audioSettingsPanel').classList.contains('hidden');
}

/**
 * Actualiza el texto y el atributo aria-pressed del botón de mute según el estado de silencio.
 * @param {boolean} isMuted - Estado de silencio a reflejar.
 */
export function setMuteButtonState(isMuted) {
  const btn = document.getElementById('muteToggleBtn');
  btn.textContent = isMuted ? 'Activar música' : 'Silenciar música';
  btn.setAttribute('aria-pressed', String(isMuted));
}

/**
 * Conecta los listeners del panel de configuración de audio con sus callbacks.
 * @param {Object} handlers - Objeto con { onToggleSettings, onVolumeChange, onToggleMute, onCloseSettings }.
 */
export function bindAudioSettingsHandlers({ onToggleSettings, onVolumeChange, onToggleMute, onCloseSettings }) {
  document.getElementById('settingsBtn').addEventListener('click', onToggleSettings);
  document.getElementById('volumeSlider').addEventListener('input', (e) => onVolumeChange(Number(e.target.value)));
  document.getElementById('muteToggleBtn').addEventListener('click', onToggleMute);
  document.getElementById('closeAudioSettingsBtn').addEventListener('click', onCloseSettings);
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

/* ===== UI: campo de nombre del jugador (pantalla de bienvenida) ===== */

/**
 * Conecta el campo de nombre del jugador con la lógica de sanitización y persistencia.
 * Pre-rellena `#playerNameInput` con el nombre almacenado y, en cada evento `input`,
 * sanitiza el valor visible y lo persiste. Degrada silenciosamente si el campo no existe.
 * @param {{ getStored: Function, sanitize: Function, persist: Function }} deps - Dependencias inyectadas:
 *   `getStored()` devuelve el nombre guardado, `sanitize(raw)` limpia el valor y `persist(raw)` lo almacena.
 */
export function bindPlayerNameInput(deps) {
  const input = document.getElementById('playerNameInput');
  if (!input) return;

  // Pre-rellena el campo con el nombre almacenado previamente.
  input.value = deps.getStored();

  // Al escribir: sanitiza el valor visible y persiste el nombre.
  input.addEventListener('input', () => {
    const raw = input.value;
    input.value = deps.sanitize(raw);
    deps.persist(input.value);
  });
}

/**
 * Devuelve el valor crudo actual del campo de nombre del jugador.
 * @returns {string} El valor actual de `#playerNameInput`, o `''` si el campo no existe.
 */
export function getPlayerNameInputValue() {
  const input = document.getElementById('playerNameInput');
  return input ? input.value : '';
}
