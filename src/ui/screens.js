/* ===== UI: overlays y HUD del DOM ===== */
import { sfx } from '../audio/sfx.js';
import * as modalState from './modalState.js';

/* ===== UI: estado de la Modal_Pregunta (capa DOM) ===== */

/**
 * Estado del controlador puro de la Modal_Pregunta. Es la fuente de verdad de
 * qué Tarjeta está expandida (a lo sumo una a la vez).
 * @type {{expandedIdx: number|null}}
 */
let modalCtrlState = modalState.createModalState();

/**
 * Referencia al elemento DOM de la Tarjeta actualmente expandida. Lo conservan
 * las tareas de animación (FLIP) y cierre para medir y restaurar dimensiones.
 * @type {HTMLElement|null}
 */
let expandedCardEl = null;

/**
 * Animación WAAPI en curso (expansión o regreso), si la hay. La usan las tareas
 * de animación para cancelar una transición antes de iniciar otra.
 * @type {Animation|null}
 */
let currentAnimation = null;

/* ===== UI: helpers de animación de la Modal_Pregunta ===== */

/** Duración de animación por defecto (ms) si `--modal-anim-ms` no es parseable. */
const DEFAULT_ANIM_MS = 320;
/** Radio de desenfoque por defecto (px) si `--modal-blur` no es parseable. */
const DEFAULT_BLUR_PX = 8;
/** Curva de easing de la Animación_Expansión/Regreso (FLIP). */
const ANIM_EASING = 'cubic-bezier(.4,.2,.2,1)';

/**
 * Lee la configuración de animación desde las variables CSS de `:root`.
 * Cae a valores por defecto sensatos (320ms, 8px) si no son parseables.
 * @returns {{ durationMs: number, blurPx: number }}
 */
function readModalAnimConfig() {
  let durationMs = DEFAULT_ANIM_MS;
  let blurPx = DEFAULT_BLUR_PX;
  try {
    const cs = getComputedStyle(document.documentElement);
    const rawMs = cs.getPropertyValue('--modal-anim-ms').trim();
    const parsedMs = parseFloat(rawMs);
    if (Number.isFinite(parsedMs) && parsedMs > 0) durationMs = parsedMs;

    const rawBlur = cs.getPropertyValue('--modal-blur').trim();
    const parsedBlur = parseFloat(rawBlur);
    if (Number.isFinite(parsedBlur) && parsedBlur >= 0) blurPx = parsedBlur;
  } catch {
    // getComputedStyle no disponible (entorno de test): usar valores por defecto.
  }
  return { durationMs, blurPx };
}

/**
 * Indica si la preferencia Movimiento_Reducido está activa.
 * Guarda defensiva para entornos sin `matchMedia` (p. ej. jsdom antiguo).
 * @returns {boolean}
 */
function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Programa una callback en el siguiente fotograma, con degradación a ejecución
 * inmediata si `requestAnimationFrame` no está disponible (entornos de test).
 * @param {Function} cb
 */
function nextFrame(cb) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => cb());
  } else {
    cb();
  }
}

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
 * Abre la Modal_Pregunta para una Tarjeta: consulta el controlador puro, puebla
 * el contenido de la modal y muestra el overlay superpuesto sin alterar las demás
 * Tarjetas de la fila.
 *
 * Es un no-op si el controlador decide `ignore` (Tarjeta bloqueada o combate
 * resuelto): en ese caso la Tarjeta permanece en Estado_Original y no se muestra
 * la modal (R1.5). La animación de expansión (FLIP) y el desenfoque de fondo se
 * implementan en una tarea posterior; aquí solo se muestra/oculta el overlay.
 *
 * El texto de la pregunta y las opciones se escriben con `textContent` (nunca
 * `innerHTML`) para evitar inyección de HTML a partir de los datos de la pregunta.
 *
 * @param {HTMLElement} cardEl - Elemento DOM de la Tarjeta seleccionada.
 * @param {Object} card - Objeto carta con { question: {text, options, correct}, locked }.
 * @param {Function} onAnswer - Callback que recibe (cardIdx, chosenOptionIdx); se invoca una sola vez.
 * @param {number} cardIdx - Índice de la Tarjeta dentro de la fila de combate.
 * @param {{ resolved?: boolean }} [opts] - Opciones; `resolved` indica si el combate ya está resuelto.
 */
export function openQuestionModal(cardEl, card, onAnswer, cardIdx, { resolved } = {}) {
  // El controlador puro decide si se abre; ignora Tarjetas bloqueadas o combate resuelto.
  const cards = [];
  cards[cardIdx] = card;
  const decision = modalState.computeOpen(modalCtrlState, cards, cardIdx, resolved);
  if (decision.action !== 'open') return;
  modalCtrlState = decision.state;
  expandedCardEl = cardEl;

  const overlay = document.getElementById('questionModalOverlay');
  if (!overlay) return;

  // Poblado del contenido (mismo texto y mismo orden de opciones que la Tarjeta).
  const content = modalState.buildModalContent(card);
  const qtextEl = overlay.querySelector('.qmodal-qtext');
  if (qtextEl) qtextEl.textContent = content.text;

  const optsWrap = overlay.querySelector('.qmodal-opts');
  if (optsWrap) {
    optsWrap.innerHTML = '';
    // Guarda de selección única: solo el primer clic efectivo dispara onAnswer.
    let answered = false;
    const optButtons = [];
    content.options.forEach((opt, oi) => {
      const b = document.createElement('button');
      b.className = 'qmodal-opt facet-cut-sm';
      b.textContent = opt;
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (answered) return;
        answered = true;
        // Marca la opción elegida según la respuesta correcta de la Tarjeta.
        if (card.question.correct === oi) {
          b.classList.add('correct');
        } else {
          b.classList.add('incorrect');
        }
        // Deshabilita todas las opciones: una única selección efectiva.
        optButtons.forEach((btn) => {
          btn.disabled = true;
        });
        onAnswer(cardIdx, oi);
      });
      optButtons.push(b);
      optsWrap.appendChild(b);
    });
  }

  // Muestra el overlay superpuesto y reproduce la Animación_Expansión (FLIP con
  // WAAPI) junto con la aparición del Desenfoque_Fondo. Las demás Tarjetas
  // permanecen intactas: la modal vive en una capa fija fuera de #cardsRow.
  const modalEl = overlay.querySelector('.question-modal');
  animateModalOpen(overlay, modalEl, cardEl);
}

/**
 * Reproduce la Animación_Expansión (FLIP) de la Modal_Pregunta y sincroniza la
 * aparición del Desenfoque_Fondo.
 *
 * Técnica FLIP: se mide el rectángulo de la Tarjeta origen (First) y el de la
 * modal ya en su posición final centrada (Last), se invierte con un `transform`
 * (translate + scale) y se reproduce hacia el estado destino (`transform:none`).
 * El desenfoque se anima en paralelo con la misma duración vía la transición CSS
 * definida sobre `.qmodal-overlay` (clase `.no-blur` de estado inicial 0 → final).
 *
 * Bajo Movimiento_Reducido se omite `.animate()` y se fija el estado destino
 * directamente (overlay visible, blur final) de forma inmediata (≤50 ms).
 *
 * @param {HTMLElement} overlay - El overlay `#questionModalOverlay`.
 * @param {HTMLElement|null} modalEl - El contenedor `.question-modal`.
 * @param {HTMLElement} cardEl - La Tarjeta origen desde la que se expande.
 */
function animateModalOpen(overlay, modalEl, cardEl) {
  // Cancela cualquier animación en curso antes de iniciar una nueva (R3.6).
  if (currentAnimation) {
    try { currentAnimation.cancel(); } catch { /* noop */ }
    currentAnimation = null;
  }

  // Muestra el overlay para que `.question-modal` adopte su layout final centrado.
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  // Estado destino directo bajo Movimiento_Reducido: overlay visible + blur final,
  // sin fotogramas intermedios de escala ni de blur (R3.5, R6.8).
  const reduced = prefersReducedMotion();
  const canAnimate =
    !reduced &&
    modalEl &&
    typeof modalEl.animate === 'function' &&
    typeof modalEl.getBoundingClientRect === 'function' &&
    typeof cardEl?.getBoundingClientRect === 'function';

  if (!canAnimate) {
    // Fija el estado destino: overlay con desenfoque final, sin transform residual.
    overlay.classList.remove('no-blur');
    if (modalEl) modalEl.style.transform = 'none';
    return;
  }

  const { durationMs } = readModalAnimConfig();

  // Arranca el Desenfoque_Fondo desde 0 (clase de estado inicial) para poder
  // animarlo hacia el valor final mediante la transición CSS del overlay.
  overlay.classList.add('no-blur');

  // FLIP: medir origen (Tarjeta) y destino (modal ya centrada).
  const first = cardEl.getBoundingClientRect();
  const last = modalEl.getBoundingClientRect();
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const sx = last.width ? first.width / last.width : 1;
  const sy = last.height ? first.height / last.height : 1;

  const animation = modalEl.animate(
    [
      {
        transformOrigin: 'top left',
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        opacity: 0.6,
      },
      { transform: 'none', opacity: 1 },
    ],
    { duration: durationMs, easing: ANIM_EASING, fill: 'both' }
  );
  currentAnimation = animation;

  // Sincroniza la aparición del Desenfoque_Fondo (0 → final) con la misma
  // duración retirando `.no-blur` en el siguiente fotograma para disparar la
  // transición CSS de `backdrop-filter`.
  nextFrame(() => {
    if (currentAnimation === animation) overlay.classList.remove('no-blur');
  });

  // Al terminar: retirar el transform y fijar el estado destino, ignorando un
  // `onfinish` obsoleto si ya se inició otra animación (R3.7).
  animation.onfinish = () => {
    if (currentAnimation !== animation) return;
    modalEl.style.transform = 'none';
    try { animation.cancel(); } catch { /* noop */ }
    overlay.classList.remove('no-blur');
    currentAnimation = null;
  };
}

/**
 * Cierra la Modal_Pregunta: consulta el controlador puro, lanza la
 * Animación_Regreso (FLIP inverso hacia las dimensiones de la Tarjeta origen)
 * junto con la retirada del Desenfoque_Fondo, y al terminar oculta el overlay y
 * limpia el estado (`expandedIdx = null`).
 *
 * Cancela cualquier `currentAnimation` en curso (expansión o un regreso previo)
 * y arranca desde las dimensiones actuales medidas con `getBoundingClientRect()`
 * (R3.6). El `onfinish` comprueba la identidad de la animación vigente para no
 * pisar una animación más reciente (R3.7).
 *
 * Bajo Movimiento_Reducido —o en entornos sin `element.animate`/layout como
 * jsdom— se omite la animación y se fija el estado destino directamente (overlay
 * oculto, blur 0) en ≤50 ms (R3.5/R6.8).
 *
 * Es seguro invocarlo sin nada abierto: en ese caso actúa como un no-op que aun
 * así garantiza el overlay oculto y el estado limpio.
 */
export function closeQuestionModal() {
  // El controlador puro deja siempre expandedIdx = null (close o noop).
  const decision = modalState.computeClose(modalCtrlState);
  modalCtrlState = decision.state;

  const overlay = document.getElementById('questionModalOverlay');
  const cardEl = expandedCardEl;

  // No-op seguro: nada abierto o sin overlay. Aun así garantizamos el estado
  // destino (overlay oculto, blur 0, estado limpio).
  if (!overlay) {
    expandedCardEl = null;
    return;
  }
  if (!cardEl) {
    finalizeModalClose(overlay, overlay.querySelector('.question-modal'));
    return;
  }

  const modalEl = overlay.querySelector('.question-modal');
  animateModalClose(overlay, modalEl, cardEl);
}

/**
 * Reproduce la Animación_Regreso (FLIP inverso) de la Modal_Pregunta y sincroniza
 * la retirada del Desenfoque_Fondo (N → 0) con la misma duración.
 *
 * Técnica FLIP inversa: se mide el rectángulo actual de la modal (First = estado
 * expandido) y el de la Tarjeta origen (Last = destino), y se anima la modal con
 * un `transform` (translate + scale) desde su posición actual hacia las
 * dimensiones de la Tarjeta, atenuando la opacidad hacia ~.6. En paralelo se
 * añade `.no-blur` para que la transición CSS del `backdrop-filter` lleve el
 * desenfoque a 0. Al terminar se oculta el overlay y se limpia el estado.
 *
 * @param {HTMLElement} overlay - El overlay `#questionModalOverlay`.
 * @param {HTMLElement|null} modalEl - El contenedor `.question-modal`.
 * @param {HTMLElement} cardEl - La Tarjeta origen a cuyas dimensiones se regresa.
 */
function animateModalClose(overlay, modalEl, cardEl) {
  // Cancela cualquier animación en curso antes de iniciar el regreso (R3.6).
  if (currentAnimation) {
    try { currentAnimation.cancel(); } catch { /* noop */ }
    currentAnimation = null;
  }

  // Estado destino directo bajo Movimiento_Reducido o en entornos sin WAAPI/layout
  // (jsdom): ocultar overlay y fijar blur 0 sin fotogramas intermedios (R3.5, R6.8).
  const reduced = prefersReducedMotion();
  const canAnimate =
    !reduced &&
    modalEl &&
    typeof modalEl.animate === 'function' &&
    typeof modalEl.getBoundingClientRect === 'function' &&
    typeof cardEl?.getBoundingClientRect === 'function';

  if (!canAnimate) {
    finalizeModalClose(overlay, modalEl);
    return;
  }

  const { durationMs } = readModalAnimConfig();

  // FLIP inverso: medir posición actual de la modal (First) y destino = Tarjeta (Last),
  // arrancando desde las dimensiones actuales medidas (R3.6).
  const first = modalEl.getBoundingClientRect();
  const last = cardEl.getBoundingClientRect();
  const dx = last.left - first.left;
  const dy = last.top - first.top;
  const sx = first.width ? last.width / first.width : 1;
  const sy = first.height ? last.height / first.height : 1;

  const animation = modalEl.animate(
    [
      { transformOrigin: 'top left', transform: 'none', opacity: 1 },
      {
        transformOrigin: 'top left',
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        opacity: 0.6,
      },
    ],
    { duration: durationMs, easing: ANIM_EASING, fill: 'both' }
  );
  currentAnimation = animation;

  // Retira el Desenfoque_Fondo (N → 0) en paralelo con la misma duración, añadiendo
  // `.no-blur` en el siguiente fotograma para disparar la transición CSS del overlay.
  nextFrame(() => {
    if (currentAnimation === animation) overlay.classList.add('no-blur');
  });

  // Al terminar: ocultar el overlay y limpiar el estado, ignorando un `onfinish`
  // obsoleto si ya se inició otra animación más reciente (R3.7).
  animation.onfinish = () => {
    if (currentAnimation !== animation) return;
    try { animation.cancel(); } catch { /* noop */ }
    currentAnimation = null;
    finalizeModalClose(overlay, modalEl);
  };
}

/**
 * Fija el estado destino de cierre de la Modal_Pregunta de forma inmediata:
 * oculta el overlay (`.hidden`), retira el Desenfoque_Fondo (`.no-blur`, blur 0),
 * marca `aria-hidden="true"`, limpia el `transform` residual de la modal y
 * restablece el estado del controlador DOM (`expandedCardEl = null`).
 *
 * La Modal_Pregunta y la Tarjeta expandida nunca reciben desenfoque: el
 * `backdrop-filter` solo afecta al contenido situado detrás del overlay, y aquí
 * el overlay se oculta por completo, de modo que no queda filtro residual (R6.2/6.3).
 *
 * @param {HTMLElement} overlay - El overlay `#questionModalOverlay`.
 * @param {HTMLElement|null} modalEl - El contenedor `.question-modal`.
 */
function finalizeModalClose(overlay, modalEl) {
  overlay.classList.add('hidden', 'no-blur');
  overlay.setAttribute('aria-hidden', 'true');
  if (modalEl) modalEl.style.transform = 'none';
  expandedCardEl = null;
}

/**
 * Indica si la Modal_Pregunta está abierta actualmente.
 * @returns {boolean} `true` si hay una Tarjeta en Estado_Expandido.
 */
export function isQuestionModalOpen() {
  return modalCtrlState.expandedIdx !== null;
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

/* ===== UI: bloqueo de cartas durante una Combat_Reaction ===== */

/**
 * Habilita o deshabilita la interacción con las cartas de combate mientras una
 * Combat_Reaction está en curso. No afecta a las cartas que ya tienen la clase
 * `locked` permanente (combate ya resuelto para esa carta): esas permanecen
 * deshabilitadas independientemente de `isLocked`.
 * @param {boolean} isLocked - `true` para deshabilitar los botones `.opt-btn` y marcar
 *   la carta con `reaction-locked`; `false` para volver a habilitarlos.
 */
export function setCardsInteractionLocked(isLocked) {
  document.querySelectorAll('#cardsRow .card').forEach(cardEl => {
    if (cardEl.classList.contains('locked')) return;
    const buttons = cardEl.querySelectorAll('.opt-btn');
    if (isLocked) {
      cardEl.classList.add('reaction-locked');
      buttons.forEach(b => b.disabled = true);
    } else {
      cardEl.classList.remove('reaction-locked');
      buttons.forEach(b => b.disabled = false);
    }
  });
}
