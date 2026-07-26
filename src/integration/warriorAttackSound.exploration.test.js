/* =====================================================================
   Prueba de EXPLORACIÓN de la condición del bug — Feature: sonido-ataque-guerrero
   Property 1 (Bug Condition): "El acierto reproduce el sonido de ataque del guerrero"
   Validates: Requirements 2.1, 2.2

   OBJETIVO: exponer contraejemplos que demuestren que el bug existe SOBRE EL
   CÓDIGO SIN ARREGLAR. Esta prueba codifica el comportamiento ESPERADO
   (Property 1): al acertar una carta durante un duelo activo, además del beep
   `sfx.correct()` debe reproducirse el archivo de ataque del guerrero
   `public/audio/guerrero/ataque/attack_sword.wav` (y en cada acierto, incluso
   consecutivos).

   RESULTADO ESPERADO EN CÓDIGO SIN ARREGLAR: FALLA (correcto). La falla
   confirma el bug. NO se debe arreglar la prueba ni el código en esta tarea.

   ----------------------------------------------------------------------
   Nota de arquitectura (importante):
   El diseño/bugfix.md se redactó contra el monolito `torre-de-las-nubes.html`
   (una `answerCard(idx, chosenIdx)` que solo llamaba a `sfx.correct()`). El
   proyecto ya está MODULARIZADO (`src/`), y la decisión de sonido del acierto
   vive hoy repartida entre:
     - `src/combat/fight.js` -> `answerCard(fight, idx, chosenIdx)` (lógica pura,
       sin sonido)
     - `src/main.js` -> `onAnswer(...)`: en acierto llama `sfx.correct()` y luego
       ejecuta la Animation_Sequence del guerrero 'ataque', cuyo sonido dispara
       `combatSfx.play('warrior', 'guerrero', 'ataque')`
     - `src/audio/combatSfx.js` -> `buildUrl('guerrero','ataque')` construye la
       ruta `/audio/guerrero/ataque/ataque.wav`.

   El archivo REAL en disco es `/audio/guerrero/ataque/attack_sword.wav` (todos
   los demás anims siguen la convención `{anim}/{anim}.wav`, pero 'ataque' no).
   Por eso, al acertar NUNCA se instancia `new Audio('.../attack_sword.wav')`:
   se instancia `.../ataque.wav` (que no existe) y el ataque del guerrero queda
   mudo. Esto coincide EXACTAMENTE con la Bug Condition del diseño:
   `isBugCondition(input)` = duringBossFight && chosenIdx === correctIdx &&
   NOT played("public/audio/guerrero/ataque/attack_sword.wav").

   Esta prueba, siguiendo el patrón de las pruebas de integración de este repo
   (que replican la orquestación de `onAnswer` de `src/main.js` con los módulos
   reales), reproduce las decisiones de sonido del acierto y espía `window.Audio`
   para detectar si `attack_sword.wav` se instancia.
   ===================================================================== */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startBossFight, answerCard } from '../combat/fight.js';
import { sfx } from '../audio/sfx.js';
import { combatSfx } from '../audio/combatSfx.js';

/* Registro de todas las URLs pasadas a `new Audio(...)` durante una acción. */
let audioSrcs = [];

/* MockAudio: mínimo HTMLAudioElement para jsdom. Registra el `src` de cada
   instanciación (lo que necesitamos para detectar `attack_sword.wav`) y no
   lanza ni deja rechazos de Promise sin manejar. */
class MockAudio {
  constructor(src) {
    this.src = src;
    audioSrcs.push(src);
    this.loop = false;
    this.volume = 1;
    this.currentTime = 0;
    this.preload = '';
  }
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
  cloneNode() { return new MockAudio(this.src); }
}

/* ¿Cuántas veces se instanció el archivo de ataque REAL del guerrero? */
function attackSwordInstantiations() {
  return audioSrcs.filter(
    (s) => typeof s === 'string' && s.includes('guerrero/ataque/attack_sword.wav')
  );
}

/**
 * simulateCorrectAnswerSounds(fight, cardIdx): replica FIELMENTE las decisiones
 * de sonido de la rama de acierto de `onAnswer` en `src/main.js`:
 *   1) `combat.answerCard(fight, idx, chosenIdx)` con la opción correcta.
 *   2) `sfx.correct()` (feedback inmediato — beep del Synthesizer).
 *   3) la Animation_Sequence 'ataque' del guerrero (playWinSequence /
 *      playCorrectNonResolvingSequence -> playWarriorAnim('ataque')), cuyo
 *      sonido lo produce `combatSfx.play('warrior', 'guerrero', 'ataque')`.
 */
function simulateCorrectAnswerSounds(fight, cardIdx) {
  const correctIdx = fight.cards[cardIdx].question.correct;
  const result = answerCard(fight, cardIdx, correctIdx);
  sfx.correct();
  combatSfx.play('warrior', 'guerrero', 'ataque');
  return result;
}

/* Replica `resumeIdleBoth()` de main.js tras un acierto que no resuelve el
   duelo: el guerrero vuelve a 'idle'. Necesario entre aciertos consecutivos
   porque `combatSfx.play` es no-op si el mismo sonido ya está activo. */
function simulateWarriorReturnToIdle() {
  combatSfx.play('warrior', 'guerrero', 'idle');
}

describe('Exploración Bug Condition — sonido de ataque del guerrero al acertar (Property 1)', () => {
  beforeEach(() => {
    audioSrcs = [];
    vi.stubGlobal('Audio', MockAudio);
    combatSfx.init();
    // Aislamiento de pruebas: combatSfx mantiene `activeSounds` a nivel de
    // módulo y su init() NO limpia los sonidos activos. Sin este reseteo, la
    // primera prueba deja al guerrero en la animación 'ataque', y el primer
    // 'ataque' de la prueba de aciertos consecutivos caería en el no-op de
    // "misma animación ya activa" (Requirement 4.4), instanciando 1 sonido en
    // vez de 2. Reseteamos el estado activo de ambos roles con un
    // folderId/animName "reset" que ninguna simulación puede generar, para que
    // cada prueba arranque hermética (mismo patrón que combatSfx.test.js).
    combatSfx.play('warrior', '__reset__', '__reset__');
    combatSfx.play('boss', '__reset__', '__reset__');
    vi.spyOn(sfx, 'correct');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // Bug Condition acotada: duringBossFight = true AND chosenIdx = correctIdx.
  it('acierto simple durante un duelo: reproduce sfx.correct() Y ADEMÁS attack_sword.wav', () => {
    const fight = startBossFight(3); // bossPips = 3 -> un solo acierto no resuelve
    audioSrcs = [];

    const result = simulateCorrectAnswerSounds(fight, 0);

    // El acierto se procesó (condición del bug satisfecha).
    expect(result.correct).toBe(true);
    // Se dispara el beep de acierto...
    expect(sfx.correct).toHaveBeenCalled();
    // ...Y ADEMÁS debe instanciarse el archivo de ataque real del guerrero.
    // En el código SIN ARREGLAR esto FALLA: se instancia '.../ataque.wav',
    // nunca '.../attack_sword.wav'.
    expect(attackSwordInstantiations().length).toBeGreaterThanOrEqual(1);
  });

  // Property 1 incluye explícitamente aciertos consecutivos.
  it('aciertos consecutivos: attack_sword.wav se instancia en CADA acierto', () => {
    const fight = startBossFight(4); // bossPips = 4 -> dos aciertos no resuelven
    audioSrcs = [];

    // Primer acierto -> ataque -> vuelta a idle (como en main.js).
    const r1 = simulateCorrectAnswerSounds(fight, 0);
    simulateWarriorReturnToIdle();
    // Segundo acierto sobre la misma carta (la pregunta se refrescó al acertar).
    const r2 = simulateCorrectAnswerSounds(fight, 0);

    expect(r1.correct).toBe(true);
    expect(r2.correct).toBe(true);
    // Debe sonar el ataque real en ambos aciertos (dos instanciaciones).
    // En el código SIN ARREGLAR esto FALLA: cero instanciaciones de
    // attack_sword.wav.
    expect(attackSwordInstantiations().length).toBeGreaterThanOrEqual(2);
  });
});
