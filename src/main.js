/* ===== MAIN: inicialización y bucle principal ===== */

import { sfx } from './audio/sfx.js';
import { music } from './audio/music.js';
import { combatSfx } from './audio/combatSfx.js';
import { showMilestoneCelebration } from './ui/celebration.js';
import { milestoneSfx } from './audio/milestoneSfx.js';
import * as engine from './engine/tower.js';
import * as combat from './combat/fight.js';
import * as render from './render/draw.js';
import * as ui from './ui/screens.js';
import { SpriteAnimationEngine } from './render/spriteEngine.js';
import { selectBoss, BOSS_ROSTER } from './data/bossRoster.js';
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
let combatUiState = null;

// Sprite_Animation_Engine instances (una por Sprite_Character), precargadas de
// forma asíncrona en paralelo con el resto de la inicialización del módulo (ver
// IIFE async más abajo, junto a `resize()`/`gameState = ...`). Ningún combate
// puede iniciarse (ver guard `spritesReady` en loop()) hasta que ambas queden listas.
let warriorEngine = null;
const bossEngines = new Map();
// Battle_Background images (una por BOSS_ROSTER entry), precargadas en paralelo
// con los Sprite_Animation_Engine. Mapea `entry.id -> HTMLImageElement` cargada.
// Se guarda en un Map local (no se muta BOSS_ROSTER) para no alterar el módulo
// compartido de datos con estado de carga que rompería re-imports en tests.
const backgroundImages = new Map();
let spritesReady = false;

/**
 * Precarga una imagen de fondo de combate (mejor esfuerzo: nunca lanza).
 * Sigue el mismo patrón de precarga best-effort que SpriteAnimationEngine.load
 * usa para las imágenes de sprites: si falla, se registra con console.error y
 * se resuelve igual, sin bloquear el resto de la inicialización.
 * @param {string} src
 * @returns {Promise<HTMLImageElement | null>}
 */
function loadBackgroundImage(src) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error(`[Main] Failed to load Battle_Background image "${src}"`);
        resolve(null);
      };
      img.src = src;
    } catch (err) {
      console.error(`[Main] Exception while preloading Battle_Background image "${src}"`, err);
      resolve(null);
    }
  });
}

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
    engine.resetPerfectStreak(gameState); // endless-tower-difficulty-cap: Requirement 3.3
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
      ui.updateBestScoreHud(scoreManager.getBestScore());
      
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
    // Celebración en fase de construcción solo para pisos múltiplos de 15 que NO sean puerta.
    // Los pisos-puerta (múltiplos de 5, incluyendo todos los múltiplos de 15) ya reciben
    // celebración desde endFight() con el delay de 1000 ms tras cerrar el boss screen.
    if (result.floorNum > 0 && result.floorNum % 15 === 0 && !result.isDoor) {
      showMilestoneCelebration(result.floorNum);
      milestoneSfx.playMilestoneAudio(result.floorNum);
    }
  }
}

function onCardClick(idx) {
  if (!fight || fight.resolved) return;
  if (combatUiState && combatUiState.reactionInProgress) return;
  const card = fight.cards[idx];
  if (card.locked) return;
  
  const cardEl = document.querySelectorAll('#cardsRow .card')[idx];
  ui.openQuestionModal(cardEl, card, onAnswer, idx, { resolved: fight.resolved });
}

function onAnswer(cardIdx, chosenIdx) {
  if (!fight || fight.resolved) return;
  
  const card = fight.cards[cardIdx];
  if (card.locked) return; // Verificar ANTES de llamar answerCard

  const result = combat.answerCard(fight, cardIdx, chosenIdx);
  
  if (!result) return;

  // El marcado visual de acierto/fallo y la deshabilitación de las opciones se
  // realizan dentro de la Modal_Pregunta (`openQuestionModal` en screens.js),
  // sobre los botones `.qmodal-opt`. Aquí solo aplicamos un bloqueo cosmético
  // temporal a la Tarjeta de la fila (clase `.locked` → cursor por defecto).
  const cardEl = document.querySelectorAll('#cardsRow .card')[cardIdx];
  cardEl.classList.add('locked');

  if (result.correct) {
    sfx.correct();
  } else {
    sfx.wrong();
  }

  ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
  // En acierto sin resolver el combate, diferimos la actualización de la barra del
  // jefe hasta que la Modal_Pregunta se cierre, para que el jugador PERCIBA el pip
  // cambiar a `pip lost` (con su pulso) una vez el fondo vuelve a ser visible.
  const deferBossBar = result.correct && result.outcome === null;
  if (!deferBossBar) {
    ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);
  }

  if (result.outcome === 'win') {
    engine.applyDuelWinSpeedBoost(gameState); // Requirement 2.1, 2.2, 2.3
    engine.registerDuelWinForStreak(gameState, result.perfect); // endless-tower-difficulty-cap: Requirement 1.1, 3.1, 3.2, 3.4 — usa gameState.doorsPassed AÚN NO incrementado (endFight lo incrementa después)
    sfx.win();
    playWinSequence();
  } else if (result.outcome === 'lose') {
    engine.resetPerfectStreak(gameState); // endless-tower-difficulty-cap: Requirement 3.3
    sfx.lose();
    playLoseSequence();
  } else if (result.correct) {
    playCorrectNonResolvingSequence(cardEl);
  } else {
    cardEl.classList.add('failed');
    playIncorrectNonResolvingSequence();
  }
}

/* ===== Orquestación de Combat_Reaction (Animation_Sequence) ===== */

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const MODAL_CLOSE_PAUSE_MS = {
  win: 500,
  lose: 1200,
  correctNonResolving: 900,
  incorrectNonResolving: 900,
};

function resumeIdleBoth() {
  playWarriorAnim('idle');
  playBossAnim('idle');
}

function playWarriorAnim(name, opts) {
  combatSfx.play('warrior', 'guerrero', name);
  return combatUiState.warriorEngine.play(name, opts);
}
function playBossAnim(name, opts) {
  combatSfx.play('boss', combatUiState.bossEntry.id, name);
  return combatUiState.bossEngine.play(name, opts);
}

/** Boss ataca (con alternancia si aplica) -> guerrero bloqueo/herido según Card_Attempt_State. */
async function playFailureReaction() {
  const { bossEntry } = combatUiState;
  const attackAnim = bossEntry.attackAnimations.length > 1
    ? bossEntry.attackAnimations[combatUiState.attackAlternateIndex % 2]
    : bossEntry.attackAnimations[0];
  if (bossEntry.attackAnimations.length > 1) combatUiState.attackAlternateIndex++;

  await playBossAnim(attackAnim, { once: true });
  const reactionAnim = combatUiState.failedAnswerCount === 0 ? 'bloqueo' : 'herido';
  combatUiState.failedAnswerCount++;
  await playWarriorAnim(reactionAnim, { once: true });
}

async function playWinSequence() {
  await wait(MODAL_CLOSE_PAUSE_MS.win);
  ui.closeQuestionModal();
  combatUiState.reactionInProgress = true;
  ui.setCardsInteractionLocked(true);
  await playWarriorAnim('ataque', { once: true });
  await playBossAnim('herido', { once: true });
  ui.showBanner('¡Guardián derrotado!', 'win');
  await playBossAnim('morir', { once: true });
  endFight(true);
}

async function playLoseSequence() {
  await wait(MODAL_CLOSE_PAUSE_MS.lose);
  ui.closeQuestionModal();
  combatUiState.reactionInProgress = true;
  ui.setCardsInteractionLocked(true);
  await playFailureReaction();
  ui.showBanner('¡Has caído ante el guardián!', 'lose');
  await playWarriorAnim('morir', { once: true });
  endFight(false);
}

async function playCorrectNonResolvingSequence(cardEl) {
  await wait(MODAL_CLOSE_PAUSE_MS.correctNonResolving);
  ui.closeQuestionModal();
  ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);
  combatUiState.reactionInProgress = true;
  ui.setCardsInteractionLocked(true);
  await playWarriorAnim('ataque', { once: true });
  await playBossAnim('herido', { once: true });
  if (fight && !fight.resolved) cardEl.classList.remove('locked');
  resumeIdleBoth();
  combatUiState.reactionInProgress = false;
  ui.setCardsInteractionLocked(false);
}

async function playIncorrectNonResolvingSequence() {
  await wait(MODAL_CLOSE_PAUSE_MS.incorrectNonResolving);
  ui.closeQuestionModal();
  combatUiState.reactionInProgress = true;
  ui.setCardsInteractionLocked(true);
  await playFailureReaction();
  resumeIdleBoth();
  combatUiState.reactionInProgress = false;
  ui.setCardsInteractionLocked(false);
}

function endFight(won) {
  ui.hideBossScreen();
  fight = null;
  combatUiState = null;
  if (won) {
    gameState.doorsPassed += 1;
    gameState.screen = 'build';
    gameState.pendingBossLevel = 0;
    music.enterBuildScreen();
    const floorNumber = gameState.floors.length - 1;
    // Solo celebrar en pisos múltiplos de 15 (cada 3 puertas)
    if (floorNumber > 0 && floorNumber % 15 === 0) {
      setTimeout(() => {
        showMilestoneCelebration(floorNumber);
        milestoneSfx.playMilestoneAudio(floorNumber);
      }, 400);
    }
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
      ui.updateBestScoreHud(scoreManager.getBestScore());
      
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
    ui.showAudioSettingsPanel(
      music.getEffectiveVolumePercent(), music.isMuted(),
      combatSfx.getEffectiveVolumePercent(), combatSfx.isMuted(),
      milestoneSfx.getBoost()
    );
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

function onCombatSfxVolumeChange(percent) {
  combatSfx.setVolume(percent);
}

function onToggleCombatSfxMute() {
  combatSfx.toggleMute();
  ui.setCombatSfxMuteButtonState(combatSfx.isMuted());
}

function onCloseAudioSettings() {
  ui.hideAudioSettingsPanel();
}

function onCelebrationBoostChange(value) {
  milestoneSfx.setBoost(value);
  ui.setCelebrationBoostDisplay(value);
}

// engine.update() señala `shouldStartBoss` una única vez, exactamente en el frame
// en que la animación de subida del caballero termina (ver engine/tower.js: la
// rama `if (state.knight.animating)` solo emite la señal en la transición
// true->false, y `gameState.pendingBossLevel` no se reinicia hasta que loop() lo
// consume). Si en ese frame los Sprite_Animation_Engine aún no están listos
// (`spritesReady === false`), la señal se perdería para siempre si no la
// retuviéramos aquí: `pendingStartBossLevel` la retiene hasta que loop() pueda
// consumirla, sin necesidad de tocar el mecanismo de `pendingBossLevel` en
// engine/tower.js.
let pendingStartBossLevel = null;

function loop(ts) {
  const dt = gameState.lastTs ? Math.min(48, ts - gameState.lastTs) : 16;
  gameState.lastTs = ts;
  gameState.lastDt = dt;

  const updateResult = engine.update(gameState, dt, ts, W);

  if (updateResult.shouldStartBoss) {
    pendingStartBossLevel = updateResult.level;
  }

  if (pendingStartBossLevel !== null && spritesReady) {
    const lvl = pendingStartBossLevel;
    pendingStartBossLevel = null;
    const bossEntry = selectBoss(gameState.doorsPassed);
    fight = combat.startBossFight(lvl);
    combatUiState = {
      bossEntry,
      warriorEngine,
      bossEngine: bossEngines.get(bossEntry.id),
      backgroundImage: backgroundImages.get(bossEntry.id),
      failedAnswerCount: 0,
      attackAlternateIndex: 0,
      reactionInProgress: false,
    };
    playWarriorAnim('idle');
    playBossAnim('idle');
    ui.showBossScreen(`${bossEntry.displayName} — Nivel ${lvl}`, fight.cardCount);
    ui.updateDifficultyIndicator(fight.difficulty);   // R5.1, R5.2
    ui.renderPips('playerHpBar', fight.playerPips, fight.playerPipsMax);
    ui.renderPips('bossHpBar', fight.bossPips, fight.bossPipsMax);
    ui.renderCards(fight.cards, onCardClick);
    gameState.screen = 'boss';
    gameState.pendingBossLevel = 0;
    music.enterBossScreen();
  }

  render.render(ctx, W, H, gameState, combatUiState);
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
  onCombatSfxVolumeChange,
  onToggleCombatSfxMute,
  onCloseSettings: onCloseAudioSettings,
  onCelebrationBoostChange,
});
music.init();
combatSfx.init();
milestoneSfx.init(() => ({ volume: music.getEffectiveVolumePercent() / 100, muted: music.isMuted() }));

// Precarga de los Sprite_Animation_Engine (Warrior_Sprite + los 5 Boss_Sprite),
// en paralelo con el resto de la inicialización del módulo. `loop()` ya se
// dispara vía requestAnimationFrame antes de que estas Promises puedan
// resolver; el guard `spritesReady` en loop() evita construir `combatUiState`
// hasta que esta IIFE complete.
(async () => {
  try {
    warriorEngine = await SpriteAnimationEngine.load('/sprites/guerrero/guerrero.json', '/sprites/guerrero');
    await Promise.all([
      ...BOSS_ROSTER.map(async (entry) => {
        bossEngines.set(entry.id, await SpriteAnimationEngine.load(entry.jsonPath, '/sprites/bosses/' + entry.id));
      }),
      ...BOSS_ROSTER.map(async (entry) => {
        backgroundImages.set(entry.id, await loadBackgroundImage(entry.background));
      }),
    ]);
    spritesReady = true;
  } catch (err) {
    console.error('[Main] Failed to preload Sprite_Animation_Engine instances:', err);
  }
})();

// Initialize ScoreManager and bind leaderboard controls
(async () => {
  try {
    await scoreManager.initialize();
    ui.updateBestScoreHud(scoreManager.getBestScore());
    
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
