/* ===== MAIN: inicialización y bucle principal ===== */

import { sfx } from './audio/sfx.js';
import { music } from './audio/music.js';
import * as engine from './engine/tower.js';
import * as combat from './combat/fight.js';
import * as render from './render/draw.js';
import * as ui from './ui/screens.js';
import { scoreManager, scoreStore } from './data/scoreManager.js';
import {
  commitName,
  formatGameOverDetail,
  sanitizeName,
  persistIfValid,
  loadStoredName
} from './data/playerName.js';
import {
  renderLeaderboard,
  showLeaderboard,
  hideLeaderboard,
  updateGameOverScore,
  formatDateLocale,
  bindLeaderboardControls
} from './ui/leaderboard.js';

// Verificación de compatibilidad del navegador
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

if (!ctx) {
  ui.showIncompatibilityMessage('Canvas 2D no está soportado en este navegador.');
  throw new Error('Canvas 2D no soportado');
}

if (!window.AudioContext && !window.webkitAudioContext) {
  console.warn('Web Audio API no disponible, el juego continuará sin sonido.');
}

let W = 0, H = 0;
let gameState = null;
let fight = null;

function resize() {
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = W;
  canvas.height = H;
}

function onDrop() {
  if (gameState.screen !== 'build') return;
  if (!gameState.moving) return;
  if (gameState.knight.animating || gameState.knight.falling) return;

  const result = engine.dropBlock(gameState, W);
  if (!result) return;

  if (result.type === 'fell') {
    engine.triggerFall(gameState, performance.now());
    music.enterFallingScreen();
    sfx.fall();
    setTimeout(() => {
      // Registrar score cuando el jugador cae (con el nombre activo de la partida)
      const scoreResult = scoreManager.recordScore(result.floorNum, gameState.playerName);
      if (scoreResult) {
        updateGameOverScore(
          scoreResult.score,
          scoreResult.isNewRecord,
          scoreResult.rank
        );
      }
      
      // Detalle personalizado con el nombre activo (causa 'fall': caída de la torre).
      const overResult = formatGameOverDetail(gameState.playerName, result.floorNum, 'fall');
      ui.showGameOverScreen('Has caído de la torre', overResult.detail, overResult.playerName);
      gameState.screen = 'gameover';
      music.enterInactiveScreen();
    }, gameState.knight.fallDur + 250);
  } else if (result.type === 'placed') {
    sfx.place();
    sfx.jump();
    if (result.isDoor) sfx.door();
    ui.updateHud(result.floorNum, result.doorIn);
  }
}

function onCardClick(idx) {
  if (!fight || fight.resolved) return;
  const card = fight.cards[idx];
  if (card.locked) return;
  
  const cardEl = document.querySelectorAll('#cardsRow .card')[idx];
  ui.renderCardBack(cardEl, card, onAnswer, idx);
}

function onAnswer(cardIdx, chosenIdx) {
  if (!fight || fight.resolved) return;
  
  const card = fight.cards[cardIdx];
  if (card.locked) return; // Verificar ANTES de llamar answerCard
  
  // Índice de la opción correcta ANTES de que answerCard pueda refrescar la pregunta.
  const correctOptionIdx = card.question.correct;

  const result = combat.answerCard(fight, cardIdx, chosenIdx);
  
  if (!result) return;

  // Marcar visualmente la respuesta correcta/incorrecta. Se bloquea temporalmente para
  // evitar clics dobles durante la animación.
  const cardEl = document.querySelectorAll('#cardsRow .card')[cardIdx];
  cardEl.classList.add('locked');
  const buttons = cardEl.querySelectorAll('.opt-btn');
  buttons.forEach(b => b.disabled = true);

  buttons[chosenIdx].classList.add(result.correct ? 'correct' : 'incorrect');
  if (!result.correct) {
    buttons[correctOptionIdx].classList.add('correct');
  }

  if (result.correct) {
    sfx.correct();
  } else {
    sfx.wrong();
  }

  ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
  ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);

  if (result.outcome === 'win') {
    sfx.win();
    // El último decremento ya se pintó arriba (renderPips deja #bossHpBar en 0).
    // Introducimos una breve pausa para que el jugador perciba la barra vaciarse
    // ANTES de mostrar el banner de victoria. El temporizador hacia endFight(true)
    // (~1300 ms) se mide desde el banner para no acortar el flujo total.
    const BOSS_DEFEAT_PAUSE = 500; // ms: pausa para percibir el último decremento
    setTimeout(() => {
      ui.showBanner('¡Guardián derrotado!', 'win');
      setTimeout(() => { endFight(true); }, 1300);
    }, BOSS_DEFEAT_PAUSE);
  } else if (result.outcome === 'lose') {
    sfx.lose();
    ui.showBanner('¡Has caído ante el guardián!', 'lose');
    setTimeout(() => { endFight(false); }, 1200);
  } else if (result.correct) {
    // Acierto sin resolver el combate: la carta NO queda bloqueada. Tras mostrar el
    // acierto, se voltea de vuelta al frente y se rehabilita para responder otra
    // pregunta (answerCard ya refrescó `card.question`).
    setTimeout(() => {
      cardEl.classList.remove('flipped');
      // Al terminar el giro, reactivar la carta para un nuevo intento.
      setTimeout(() => {
        if (!fight || fight.resolved) return;
        cardEl.classList.remove('locked');
        buttons.forEach(b => b.disabled = false);
      }, 560); // coincide con la duración de la transición de giro (.55s)
    }, 900);
  }
  // Si se falla, la carta queda bloqueada (clase `locked` y opciones deshabilitadas)
  // de forma permanente hasta que el combate se resuelva.
}

function endFight(won) {
  ui.hideBossScreen();
  fight = null;
  if (won) {
    gameState.doorsPassed += 1;
    gameState.screen = 'build';
    gameState.pendingBossLevel = 0;
    music.enterBuildScreen();
  } else {
    gameState.screen = 'falling';
    engine.triggerFall(gameState, performance.now());
    music.enterFallingScreen();
    sfx.fall();
    setTimeout(() => {
      // Registrar score cuando el jugador pierde contra el guardián (con el nombre activo)
      const scoreResult = scoreManager.recordScore(gameState.floors.length - 1, gameState.playerName);
      if (scoreResult) {
        updateGameOverScore(
          scoreResult.score,
          scoreResult.isNewRecord,
          scoreResult.rank
        );
      }
      
      // Detalle personalizado con el nombre activo (causa 'boss': derrota ante el guardián).
      const overResult = formatGameOverDetail(gameState.playerName, gameState.floors.length - 1, 'boss');
      ui.showGameOverScreen('El guardián te ha vencido', overResult.detail, overResult.playerName);
      gameState.screen = 'gameover';
      music.enterInactiveScreen();
    }, gameState.knight.fallDur + 250);
  }
}

function onStart() {
  // Recalcula el nombre activo a partir del valor visible del campo antes de iniciar la partida.
  gameState.playerName = commitName(ui.getPlayerNameInputValue());
  ui.hideStartScreen();
  engine.resetGame(gameState, W, H);
  music.notifyUserInteraction();
  music.enterBuildScreen();
  gameState.screen = 'build';
}

function onRetry() {
  // Vuelve a la pantalla de bienvenida (el campo ya está pre-rellenado) para que el
  // jugador pueda ajustar su nombre; el nombre activo se recalcula en el próximo onStart().
  ui.hideGameOverScreen();
  ui.showStartScreen();
}

function onToggleAudioSettings() {
  music.notifyUserInteraction();
  if (ui.isAudioSettingsPanelVisible()) {
    ui.hideAudioSettingsPanel();
  } else {
    ui.showAudioSettingsPanel(music.getEffectiveVolumePercent(), music.isMuted());
  }
}

function onVolumeChange(percent) {
  music.notifyUserInteraction();
  music.setVolume(percent);
}

function onToggleMute() {
  music.notifyUserInteraction();
  music.toggleMute();
  ui.setMuteButtonState(music.isMuted());
}

function onCloseAudioSettings() {
  ui.hideAudioSettingsPanel();
}

function loop(ts) {
  const dt = gameState.lastTs ? Math.min(48, ts - gameState.lastTs) : 16;
  gameState.lastTs = ts;

  const updateResult = engine.update(gameState, dt, ts, W);
  
  if (updateResult.shouldStartBoss) {
    const lvl = updateResult.level;
    fight = combat.startBossFight(lvl);
    ui.showBossScreen(fight.bossLabel, fight.cardCount);
    ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
    ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);
    ui.renderCards(fight.cards, onCardClick);
    gameState.screen = 'boss';
    gameState.pendingBossLevel = 0;
    music.enterBossScreen();
  }

  render.render(ctx, W, H, gameState);
  requestAnimationFrame(loop);
}

// Inicialización
resize();
gameState = engine.createTowerState(W, H);
gameState.playerName = '';
ui.bindInputHandlers({ onDrop, onStart, onRetry });
// Conecta el campo de nombre: pre-rellena con el nombre almacenado y persiste al escribir.
ui.bindPlayerNameInput({ getStored: loadStoredName, sanitize: sanitizeName, persist: persistIfValid });
ui.bindAudioSettingsHandlers({
  onToggleSettings: onToggleAudioSettings,
  onVolumeChange,
  onToggleMute,
  onCloseSettings: onCloseAudioSettings
});
music.init();

// Initialize ScoreManager and bind leaderboard controls
(async () => {
  try {
    await scoreManager.initialize();
    
    // Bind leaderboard overlay close controls
    bindLeaderboardControls(() => hideLeaderboard());
    
    // Wire up "Ver tabla de scores" button in game over screen
    const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
    if (viewLeaderboardBtn) {
      viewLeaderboardBtn.style.display = 'block';
      viewLeaderboardBtn.addEventListener('click', () => {
        const scores = scoreManager.getLeaderboard(10);
        renderLeaderboard(scores);
        showLeaderboard();
      });
    }
    
    // Expose clearLeaderboard for dev use
    window.__torreNubes = window.__torreNubes || {};
    window.__torreNubes.clearLeaderboard = async () => {
      const confirmed = confirm(
        '¿Limpiar tabla de scores? Esta acción no se puede deshacer.'
      );
      if (confirmed) {
        await scoreManager.clear();
        const empty = document.getElementById('leaderboardEmpty');
        const table = document.querySelector('.leaderboard-table');
        table.classList.add('hidden');
        empty.classList.remove('hidden');
        console.log('[Leaderboard] Cleared');
      }
    };
    
  } catch (err) {
    console.error('[Main] Failed to initialize leaderboard system:', err);
  }
})();

window.addEventListener('resize', resize);
requestAnimationFrame(loop);
