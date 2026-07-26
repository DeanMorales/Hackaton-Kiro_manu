/* =====================================================================
   Pruebas de PRESERVACIÓN basadas en propiedades — Feature: sonido-ataque-guerrero
   Property 2 (Preservation): "Comportamiento inalterado para entradas no-bug"
   Validates: Requirements 3.1, 3.2, 3.3, 3.4

   OBJETIVO: capturar el comportamiento base que el arreglo NO debe alterar,
   observándolo SOBRE EL CÓDIGO SIN ARREGLAR. Estas pruebas deben PASAR ahora
   (confirman la línea base) y deben SEGUIR pasando tras aplicar el arreglo de
   la tarea 3 (confirman que no hay regresiones).

   Propiedad formal (bugfix.md / design.md):
     PARA TODO X DONDE NOT isBugCondition(X) DO
       ASSERT answerCard(X) = answerCard'(X)
   donde:
     - isBugCondition(X) = X.duringBossFight = true AND X.chosenIdx = X.correctIdx
     - F  (answerCard)  = versión original (al acertar solo suena sfx.correct + el
                          sonido de la animación 'ataque' del guerrero)
     - F' (answerCard') = versión corregida (al acertar, además, reproduce
                          public/audio/guerrero/ataque/attack_sword.wav)
   El ÚNICO delta del arreglo ocurre en la rama de ACIERTO DURANTE UN DUELO ACTIVO
   (la Bug Condition). Por tanto, para toda entrada NO-bug, F(X) y F'(X) son
   idénticas: ni el manejo de fallos, ni la resolución del duelo, ni los demás
   sonidos, ni las interacciones fuera del duelo cambian.

   ----------------------------------------------------------------------
   Nota de arquitectura (igual que en la prueba de exploración):
   El proyecto está MODULARIZADO (`src/`). La lógica pura de la respuesta vive en
   `src/combat/fight.js` -> `answerCard(fight, idx, chosenIdx)` (sin sonido), y la
   orquestación de sonido vive en `src/main.js` -> `onAnswer(...)`:
     - acierto  -> `sfx.correct()` + animación 'ataque' del guerrero
                   (`combatSfx.play('warrior','guerrero','ataque')`)
     - fallo    -> `sfx.wrong()`   + reacción de fallo (ataque del jefe +
                   'bloqueo'/'herido' del guerrero) — NUNCA 'ataque' del guerrero
     - win      -> `sfx.win()`  + secuencia de victoria
     - lose     -> `sfx.lose()` + secuencia de derrota
   Estas pruebas replican FIELMENTE esas decisiones de sonido síncronas usando los
   MÓDULOS REALES de producción (`answerCard`, `sfx`, `combatSfx`) y espían
   `window.Audio` para detectar cualquier instanciación del sonido de ataque del
   guerrero (`/audio/guerrero/ataque/...`), que NO debe ocurrir en entradas no-bug.
   ===================================================================== */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { startBossFight, answerCard } from '../combat/fight.js';
import { sfx } from '../audio/sfx.js';
import { combatSfx } from '../audio/combatSfx.js';
import { BOSS_ROSTER } from '../data/bossRoster.js';

/* Registro de todas las URLs pasadas a `new Audio(...)` durante una acción. */
let audioSrcs = [];
/* Si es true, `MockAudio.play()` devuelve una promesa RECHAZADA (simula bloqueo
   de autoplay / archivo no disponible) para ejercitar la degradación elegante. */
let rejectPlay = false;

/* MockAudio: mínimo HTMLAudioElement para jsdom. Registra el `src` de cada
   instanciación y nunca lanza ni deja rechazos de Promise sin manejar por su cuenta. */
class MockAudio {
  constructor(src) {
    this.src = src;
    audioSrcs.push(src);
    this.loop = false;
    this.volume = 1;
    this.currentTime = 0;
    this.preload = '';
  }
  play() { return rejectPlay ? Promise.reject(new Error('bloqueado')) : Promise.resolve(); }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
  cloneNode() { return new MockAudio(this.src); }
}

/* Instanciaciones del archivo de ataque REAL del guerrero (delta del arreglo). */
function attackSwordInstantiations() {
  return audioSrcs.filter(
    (s) => typeof s === 'string' && s.includes('guerrero/ataque/attack_sword.wav')
  );
}

/* Cualquier sonido de la animación 'ataque' del guerrero (ataque.wav o
   attack_sword.wav): NO debe reproducirse en ninguna entrada no-bug. */
function warriorAttackInstantiations() {
  return audioSrcs.filter(
    (s) => typeof s === 'string' && s.includes('/audio/guerrero/ataque/')
  );
}

/* Modelo del delta del arreglo: reproduce el .wav real del ataque del guerrero.
   Solo se invoca en la rama de ACIERTO DURANTE UN DUELO (la Bug Condition), por lo
   que jamás se ejecuta para entradas no-bug. */
function playAttackSword() {
  try {
    const a = new Audio('/audio/guerrero/ataque/attack_sword.wav');
    a.volume = 0.6;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch (_e) { /* degradación elegante */ }
}

/* Réplica de `playFailureReaction()` de src/main.js: el jefe ataca y el guerrero
   reacciona con 'bloqueo' (primer fallo) o 'herido'. NUNCA reproduce 'ataque'. */
function playFailureReaction(bossEntry, uiState, rec = null) {
  const attackAnim = bossEntry.attackAnimations.length > 1
    ? bossEntry.attackAnimations[uiState.attackAlternateIndex % 2]
    : bossEntry.attackAnimations[0];
  if (bossEntry.attackAnimations.length > 1) uiState.attackAlternateIndex++;
  combatSfx.play('boss', bossEntry.id, attackAnim);
  if (rec) rec(`combat:boss:${attackAnim}`);
  const reactionAnim = uiState.failedAnswerCount === 0 ? 'bloqueo' : 'herido';
  uiState.failedAnswerCount++;
  combatSfx.play('warrior', 'guerrero', reactionAnim);
  if (rec) rec(`combat:warrior:${reactionAnim}`);
}

/**
 * orchestrateAnswerSounds: replica FIELMENTE las decisiones de sonido síncronas de
 * `onAnswer` en src/main.js (y de sus secuencias de reacción), usando los módulos
 * reales `sfx` y `combatSfx`. Devuelve `{ skipped, result }`.
 *
 * `fixed=true` aplica el delta del arreglo (reproducir attack_sword.wav allí donde
 * el guerrero ejecuta 'ataque', es decir, SOLO en la rama de acierto durante duelo).
 */
function orchestrateAnswerSounds(fight, bossEntry, uiState, cardIdx, chosenIdx, { fixed = false, log = null } = {}) {
  const rec = (ev) => { if (log) log.push(ev); };

  // Guardas equivalentes a los early-return de onAnswer: fuera de un duelo activo
  // (fight inexistente/resuelto) o carta bloqueada, no hay procesamiento ni sonido.
  if (!fight || fight.resolved) return { skipped: true, result: null };
  const card = fight.cards[cardIdx];
  if (!card || card.locked) return { skipped: true, result: null };

  const result = answerCard(fight, cardIdx, chosenIdx);
  if (!result) return { skipped: true, result: null };

  // Feedback inmediato (beep sintetizado).
  if (result.correct) { sfx.correct(); rec('sfx:correct'); }
  else { sfx.wrong(); rec('sfx:wrong'); }

  // El sonido de 'ataque' del guerrero solo ocurre al ACERTAR (rama Bug Condition);
  // ahí es donde el arreglo añade attack_sword.wav.
  const playWarriorAttack = () => {
    combatSfx.play('warrior', 'guerrero', 'ataque');
    rec('combat:warrior:ataque');
    if (fixed) { playAttackSword(); rec('file:attack_sword'); }
  };
  const playCombat = (role, folder, anim) => { combatSfx.play(role, folder, anim); rec(`combat:${role}:${anim}`); };

  if (result.outcome === 'win') {
    sfx.win(); rec('sfx:win');
    playWarriorAttack();
    playCombat('boss', bossEntry.id, 'herido');
    playCombat('boss', bossEntry.id, 'morir');
  } else if (result.outcome === 'lose') {
    sfx.lose(); rec('sfx:lose');
    playFailureReaction(bossEntry, uiState, rec);
    playCombat('warrior', 'guerrero', 'morir');
  } else if (result.correct) {
    playWarriorAttack();
    playCombat('boss', bossEntry.id, 'herido');
    // resumeIdleBoth()
    playCombat('warrior', 'guerrero', 'idle');
    playCombat('boss', bossEntry.id, 'idle');
  } else {
    playFailureReaction(bossEntry, uiState, rec);
    // resumeIdleBoth()
    playCombat('warrior', 'guerrero', 'idle');
    playCombat('boss', bossEntry.id, 'idle');
  }

  return { skipped: false, result };
}

function freshUiState() {
  return { attackAlternateIndex: 0, failedAnswerCount: 0 };
}

/* Índice de una opción INCORRECTA (garantiza chosenIdx !== correctIdx). Las
   preguntas tienen 4 opciones (services.js -> pickQuestion). */
function wrongIndexFor(correctIdx, k) {
  return (correctIdx + 1 + (k % 3)) % 4;
}

describe('Preservación — comportamiento inalterado para entradas no-bug (Property 2)', () => {
  beforeEach(() => {
    audioSrcs = [];
    rejectPlay = false;
    vi.stubGlobal('Audio', MockAudio);
    combatSfx.init();
    vi.spyOn(sfx, 'correct');
    vi.spyOn(sfx, 'wrong');
    vi.spyOn(sfx, 'win');
    vi.spyOn(sfx, 'lose');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ===== Requirement 3.1: al FALLAR se resta un pip al jugador y suena sfx.wrong,
  // SIN sonido de ataque del guerrero. =====
  it('Req 3.1 — fallar resta un pip al jugador, suena sfx.wrong y NO suena el ataque del guerrero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 12 }),   // nivel (>=2 -> tolera al menos un fallo sin perder)
        fc.integer({ min: 0, max: 6 }),    // índice de carta (se acota a cardCount)
        fc.integer({ min: 0, max: 2 }),    // selector de opción incorrecta
        (level, rawIdx, k) => {
          audioSrcs = [];
          const fight = startBossFight(level);
          const cardIdx = rawIdx % fight.cardCount;
          const card = fight.cards[cardIdx];
          const correctIdx = card.question.correct;
          const chosenIdx = wrongIndexFor(correctIdx, k);

          const playerBefore = fight.playerPips;
          const bossBefore = fight.bossPips;

          const { result } = orchestrateAnswerSounds(fight, BOSS_ROSTER[0], freshUiState(), cardIdx, chosenIdx);

          // Se procesó como fallo (entrada no-bug: chosenIdx !== correctIdx).
          expect(result.correct).toBe(false);
          // Se resta exactamente un pip al jugador; el jefe NO recibe daño.
          expect(fight.playerPips).toBe(playerBefore - 1);
          expect(fight.bossPips).toBe(bossBefore);
          // La carta queda bloqueada de forma permanente.
          expect(card.locked).toBe(true);
          // Suena sfx.wrong, NO sfx.correct.
          expect(sfx.wrong).toHaveBeenCalled();
          expect(sfx.correct).not.toHaveBeenCalled();
          // NUNCA se reproduce el sonido de ataque del guerrero (ni ataque.wav ni attack_sword.wav).
          expect(warriorAttackInstantiations().length).toBe(0);
          expect(attackSwordInstantiations().length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ===== Requirement 3.2: la lógica de resolución del duelo (pips + derrota del
  // jugador) se conserva al fallar hasta perder. answerCard es pura y el arreglo
  // NO la toca, por lo que la mecánica se preserva. =====
  it('Req 3.2 — fallar repetidamente resuelve el duelo como derrota igual que antes, sin ataque del guerrero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        (level) => {
          audioSrcs = [];
          const fight = startBossFight(level);
          const bossEntry = BOSS_ROSTER[0];
          const uiState = freshUiState();
          const tolerancia = fight.playerPips; // nº de fallos permitidos antes de perder

          let lastResult = null;
          // Fallar en cartas sucesivas hasta agotar la tolerancia del jugador.
          for (let i = 0; i < tolerancia; i++) {
            const cardIdx = i % fight.cardCount;
            const card = fight.cards[cardIdx];
            if (card.locked || fight.resolved) continue;
            const chosenIdx = wrongIndexFor(card.question.correct, i);
            lastResult = orchestrateAnswerSounds(fight, bossEntry, uiState, cardIdx, chosenIdx).result;
          }

          // El jugador termina derrotado (playerPips en 0) y el duelo resuelto.
          expect(fight.playerPips).toBe(0);
          expect(fight.resolved).toBe(true);
          if (lastResult) expect(lastResult.outcome).toBe('lose');
          // El jefe nunca recibió daño y el guerrero jamás ejecutó 'ataque'.
          expect(fight.bossPips).toBe(fight.bossPipsMax);
          expect(warriorAttackInstantiations().length).toBe(0);
          expect(attackSwordInstantiations().length).toBe(0);
          // Al perder suena sfx.lose (y sfx.wrong por cada fallo), nunca sfx.correct.
          expect(sfx.lose).toHaveBeenCalled();
          expect(sfx.correct).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 60 }
    );
  });

  // ===== Requirement 3.3 + Preservación de "fuera del duelo": cualquier interacción
  // sin un duelo activo (fight resuelto / carta bloqueada) es un no-op y no dispara
  // el ataque del guerrero. =====
  it('Req 3.3 — fuera de un duelo activo (resuelto o carta bloqueada) no hay mutación ni ataque del guerrero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 0, max: 6 }),
        fc.integer({ min: 0, max: 3 }),
        (level, rawIdx, chosenIdx) => {
          audioSrcs = [];
          const fight = startBossFight(level);
          const cardIdx = rawIdx % fight.cardCount;

          // Forzamos un estado "fuera de duelo activo": duelo ya resuelto.
          fight.resolved = true;
          const snapshot = {
            playerPips: fight.playerPips,
            bossPips: fight.bossPips,
            locked: fight.cards[cardIdx].locked,
          };

          const { skipped, result } = orchestrateAnswerSounds(
            fight, BOSS_ROSTER[0], freshUiState(), cardIdx, chosenIdx
          );

          // No se procesa nada: sin mutación de estado y sin sonidos de combate.
          expect(skipped).toBe(true);
          expect(result).toBeNull();
          expect(fight.playerPips).toBe(snapshot.playerPips);
          expect(fight.bossPips).toBe(snapshot.bossPips);
          expect(fight.cards[cardIdx].locked).toBe(snapshot.locked);
          expect(warriorAttackInstantiations().length).toBe(0);
          expect(attackSwordInstantiations().length).toBe(0);
          expect(sfx.correct).not.toHaveBeenCalled();
          expect(sfx.wrong).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ===== Requirement 3.4: si la reproducción de audio es bloqueada/falla, el duelo
  // prosigue sin lanzar una excepción que lo interrumpa. =====
  it('Req 3.4 — con Audio.play() rechazado, procesar una entrada no-bug no lanza excepción', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 12 }),
        fc.integer({ min: 0, max: 6 }),
        fc.integer({ min: 0, max: 2 }),
        (level, rawIdx, k) => {
          audioSrcs = [];
          rejectPlay = true; // toda reproducción de audio será rechazada
          const fight = startBossFight(level);
          const cardIdx = rawIdx % fight.cardCount;
          const card = fight.cards[cardIdx];
          const chosenIdx = wrongIndexFor(card.question.correct, k);

          // La orquestación no debe propagar ninguna excepción pese al fallo de audio.
          expect(() =>
            orchestrateAnswerSounds(fight, BOSS_ROSTER[0], freshUiState(), cardIdx, chosenIdx)
          ).not.toThrow();

          // El fallo se procesó igualmente (la mecánica del duelo no se interrumpe).
          expect(card.locked).toBe(true);
        }
      ),
      { numRuns: 60 }
    );
  });

  // ===== Equivalencia directa answerCard(X) = answerCard'(X) para entradas no-bug:
  // ejecutar la orquestación ORIGINAL (F) y la CORREGIDA (F') sobre duelos frescos
  // equivalentes y comprobar que producen la MISMA firma observable (mismos sonidos
  // de combate, misma cuenta de ataque del guerrero, mismos deltas de estado). =====
  it('Property 2 — F(X) = F\'(X) para entradas no-bug (misma firma observable)', () => {
    /**
     * Ejecuta un fallo en la carta 0 y devuelve la firma observable: la secuencia de
     * DECISIONES de sonido (log) + los deltas de estado + el resultado. El log captura
     * la decisión de la orquestación (F vs F') de forma independiente de la
     * deduplicación interna de `combatSfx`, que es estado de módulo compartido entre
     * ejecuciones y no forma parte del contrato de comportamiento.
     */
    function runFail(level, fixed) {
      const fight = startBossFight(level);
      const bossEntry = BOSS_ROSTER[0];
      const card = fight.cards[0];
      const chosenIdx = wrongIndexFor(card.question.correct, 0);
      const playerBefore = fight.playerPips;
      const bossBefore = fight.bossPips;
      const log = [];

      const { result } = orchestrateAnswerSounds(fight, bossEntry, freshUiState(), 0, chosenIdx, { fixed, log });

      return {
        log,
        playerDelta: playerBefore - fight.playerPips,
        bossDelta: bossBefore - fight.bossPips,
        correct: result.correct,
        outcome: result.outcome,
        resolved: fight.resolved,
      };
    }

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), (level) => {
        const original = runFail(level, false);  // F
        const fixed = runFail(level, true);       // F'
        // Para entradas no-bug, el delta del arreglo (attack_sword.wav) solo se
        // añadiría junto a un 'combat:warrior:ataque', que NUNCA ocurre al fallar.
        // Por tanto F y F' producen la MISMA secuencia de decisiones y el mismo estado.
        expect(fixed).toEqual(original);
        expect(fixed.log).not.toContain('combat:warrior:ataque');
        expect(fixed.log).not.toContain('file:attack_sword');
      }),
      { numRuns: 100 }
    );
  });
});
