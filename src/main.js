/* ===== MAIN: inicialización y bucle principal ===== */

import { sfx } from './audio/sfx.js';
import * as engine from './engine/tower.js';
import * as combat from './combat/fight.js';
import * as render from './render/draw.js';
import * as ui from './ui/screens.js';
import { scoreManager, scoreStore } from './data/scoreManager.js';
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
    sfx.fall();
    setTimeout(() => {
      // Registrar score cuando el jugador cae
      const scoreResult = scoreManager.recordScore(result.floorNum);
      if (scoreResult) {
        updateGameOverScore(
          scoreResult.score,
          scoreResult.isNewRecord,
          scoreResult.rank
        );
      }
      
      ui.showGameOverScreen('Has caído de la torre', `Llegaste hasta el piso ${result.floorNum}. El bloque no encajó a tiempo.`);
      gameState.screen = 'gameover';
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
  
  const result = combat.answerCard(fight, cardIdx, chosenIdx);
  
  if (!result) return;

  // Marcar visualmente la respuesta correcta/incorrecta
  const cardEl = document.querySelectorAll('#cardsRow .card')[cardIdx];
  cardEl.classList.add('locked');
  const buttons = cardEl.querySelectorAll('.opt-btn');
  buttons.forEach(b => b.disabled = true);
  
  buttons[chosenIdx].classList.add(result.correct ? 'correct' : 'incorrect');
  if (!result.correct) {
    buttons[card.question.correct].classList.add('correct');
  }

  if (result.correct) {
    sfx.correct();
  } else {
    sfx.wrong();
  }

  ui.renderPips('playerHpBar', fight.playerPips, fight.cardCount);
  ui.renderPips('bossHpBar', fight.bossPips, fight.cardCount);

  if (result.outcome === 'win') {
    sfx.win();
    ui.showBanner('¡Guardián derrotado!', 'win');
    setTimeout(() => { endFight(true); }, 1300);
  } else if (result.outcome === 'lose') {
    sfx.lose();
    ui.showBanner('¡Has caído ante el guardián!', 'lose');
    setTimeout(() => { endFight(false); }, 1200);
  } else {
    // Flip back con nueva pregunta después de una pausa
    setTimeout(() => {
      if (!fight || fight.resolved) return;
      combat.refreshCardQuestion(fight, cardIdx);
      cardEl.classList.remove('flipped');
      setTimeout(() => { cardEl.classList.remove('locked'); }, 560);
    }, 950);
  }
}

function endFight(won) {
  ui.hideBossScreen();
  fight = null;
  if (won) {
    gameState.doorsPassed += 1;
    gameState.screen = 'build';
    gameState.pendingBossLevel = 0;
  } else {
    gameState.screen = 'falling';
    engine.triggerFall(gameState, performance.now());
    sfx.fall();
    setTimeout(() => {
      // Registrar score cuando el jugador pierde contra el guardián
      const scoreResult = scoreManager.recordScore(gameState.floors.length - 1);
      if (scoreResult) {
        updateGameOverScore(
          scoreResult.score,
          scoreResult.isNewRecord,
          scoreResult.rank
        );
      }
      
      ui.showGameOverScreen('El guardián te ha vencido', `Caíste en la puerta del piso ${gameState.floors.length - 1}. ¡Vuelve a intentarlo!`);
      gameState.screen = 'gameover';
    }, gameState.knight.fallDur + 250);
  }
}

function onStart() {
  ui.hideStartScreen();
  engine.resetGame(gameState, W, H);
  gameState.screen = 'build';
}

function onRetry() {
  ui.hideGameOverScreen();
  engine.resetGame(gameState, W, H);
  gameState.screen = 'build';
}

function loop(ts) {
  const dt = gameState.lastTs ? Math.min(48, ts - gameState.lastTs) : 16;
  gameState.lastTs = ts;

  const updateResult = engine.update(gameState, dt, ts, W);
  
  if (updateResult.shouldStartBoss) {
    const lvl = updateResult.level;
    fight = combat.startBossFight(lvl);
    ui.showBossScreen(fight.bossLabel, fight.cardCount);
    ui.renderPips('playerHpBar', fight.playerPips, fight.cardCount);
    ui.renderPips('bossHpBar', fight.bossPips, fight.cardCount);
    ui.renderCards(fight.cards, onCardClick);
    gameState.screen = 'boss';
    gameState.pendingBossLevel = 0;
  }

  render.render(ctx, W, H, gameState);
  requestAnimationFrame(loop);
}

// Inicialización
resize();
gameState = engine.createTowerState(W, H);
ui.bindInputHandlers({ onDrop, onStart, onRetry });

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
