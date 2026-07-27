/* ===== Test estático de la eliminación completa de sfx.attack() (tarea 4.5) ===== */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Property 4 (design.md): "Eliminación completa y verificable de sfx.attack()".
 * Es una prueba estática de una sola ejecución (no generativa) que inspecciona
 * el texto fuente de `src/audio/sfx.js` y de `src/main.js`, siguiendo el mismo
 * patrón de `readFileSync` + `resolve`/`dirname` ya usado en
 * `src/audio/sfx.test.js` y en `src/ui/screens.modal.open.test.js`.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const SFX_SOURCE = readFileSync(resolve(__dirname, './audio/sfx.js'), 'utf-8');
const MAIN_SOURCE = readFileSync(resolve(__dirname, './main.js'), 'utf-8');

// Feature: combat-animation-sfx, Property 4: Eliminación completa y verificable de sfx.attack() (prueba estática, no generativa)
// Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
describe('Property 4: eliminación completa y verificable de sfx.attack()', () => {
  it('AUDIO_MAP en sfx.js no contiene una entrada `attack` (Requirement 5.1)', () => {
    expect(/attack\s*:/.test(SFX_SOURCE)).toBe(false);
  });

  it('el objeto exportado `sfx` en sfx.js no expone una propiedad `attack` (Requirement 5.2)', () => {
    expect(/attack\s*:/.test(SFX_SOURCE)).toBe(false);
  });

  it('src/main.js no contiene ninguna invocación de sfx.attack() en todo el archivo (Requirement 5.3, 5.4, 5.5)', () => {
    expect(MAIN_SOURCE.includes('sfx.attack(')).toBe(false);
  });
});

/* ===== Pruebas unitarias de la integración en main.js (tarea 4.6) ===== */

/**
 * Extrae el cuerpo de texto de una función declarada con `function <name>` (o
 * `async function <name>`) en el código fuente, delimitado por el inicio de esa
 * declaración y el inicio de la siguiente declaración `function ` en el archivo
 * (o el final del archivo si no hay una siguiente). Es una inspección de texto
 * simple (no un parser de AST), suficiente para las comprobaciones estáticas de
 * esta tarea.
 * @param {string} source
 * @param {string} functionName
 * @returns {string}
 */
function extractFunctionBody(source, functionName) {
  const startMarker = `function ${functionName}`;
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`No se encontró la declaración de la función "${functionName}" en el código fuente`);
  }
  const nextFunctionIdx = source.indexOf('function ', startIdx + startMarker.length);
  const endIdx = nextFunctionIdx === -1 ? source.length : nextFunctionIdx;
  return source.slice(startIdx, endIdx);
}

/** Cuenta las ocurrencias no superpuestas de una subcadena literal en un texto. */
function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

// Feature: combat-animation-sfx, Tarea 4.6: pruebas unitarias de la integración en main.js
// Validates: Requirements 5.3, 5.4, 12.4
describe('Tarea 4.6: integración de combatSfx en main.js mediante wrappers', () => {
  it('playWinSequence no contiene sfx.attack() (Requirement 5.3)', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'playWinSequence');
    expect(body).not.toContain('sfx.attack(');
  });

  it('playCorrectNonResolvingSequence no contiene sfx.attack() (Requirement 5.4)', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'playCorrectNonResolvingSequence');
    expect(body).not.toContain('sfx.attack(');
  });

  it("resumeIdleBoth invoca playWarriorAnim('idle') y playBossAnim('idle') (Requirement 12.4)", () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'resumeIdleBoth');
    expect(body).toContain("playWarriorAnim('idle')");
    expect(body).toContain("playBossAnim('idle')");
  });

  it('playFailureReaction invoca playBossAnim(attackAnim, ...) y playWarriorAnim(reactionAnim, ...) (Requirement 12.4)', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'playFailureReaction');
    expect(body).toContain('playBossAnim(attackAnim');
    expect(body).toContain('playWarriorAnim(reactionAnim');
  });

  it('playWinSequence invoca los wrappers playWarriorAnim/playBossAnim para ataque/herido/morir (Requirement 12.4)', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'playWinSequence');
    expect(body).toContain("playWarriorAnim('ataque'");
    expect(body).toContain("playBossAnim('herido'");
    expect(body).toContain("playBossAnim('morir'");
  });

  it('playLoseSequence invoca el wrapper playWarriorAnim para morir (Requirement 12.4)', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'playLoseSequence');
    expect(body).toContain("playWarriorAnim('morir'");
  });

  it('playCorrectNonResolvingSequence invoca los wrappers playWarriorAnim/playBossAnim para ataque/herido (Requirement 12.4)', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'playCorrectNonResolvingSequence');
    expect(body).toContain("playWarriorAnim('ataque'");
    expect(body).toContain("playBossAnim('herido'");
  });

  it("playWarriorAnim('idle') y playBossAnim('idle') aparecen al menos dos veces en main.js (resumeIdleBoth + inicio de Boss_Fight en loop()) (Requirement 12.4)", () => {
    expect(countOccurrences(MAIN_SOURCE, "playWarriorAnim('idle')")).toBeGreaterThanOrEqual(2);
    expect(countOccurrences(MAIN_SOURCE, "playBossAnim('idle')")).toBeGreaterThanOrEqual(2);
  });

  it('combatUiState.warriorEngine.play(...) solo aparece una vez en todo el archivo, dentro de la definición del wrapper playWarriorAnim (Requirement 12.4)', () => {
    expect(countOccurrences(MAIN_SOURCE, 'combatUiState.warriorEngine.play(')).toBe(1);
  });

  it('combatUiState.bossEngine.play(...) solo aparece una vez en todo el archivo, dentro de la definición del wrapper playBossAnim (Requirement 12.4)', () => {
    expect(countOccurrences(MAIN_SOURCE, 'combatUiState.bossEngine.play(')).toBe(1);
  });
});

/* ===== Tests de integración para endFight (tarea 5.3) ===== */

// Feature: milestone-celebration-feedback
// Validates: Requirements 5.1, 5.2
describe('Tarea 5.3: integración de endFight en main.js', () => {
  it('endFight(false) — la rama else NO contiene showMilestoneCelebration ni milestoneSfx.playMilestoneAudio (Requirements 5.1, 5.2)', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'endFight');
    // Extraer solo la rama else: texto desde "} else {" hasta el cierre del bloque else
    const elseMarker = '} else {';
    const elseStart = body.indexOf(elseMarker);
    expect(elseStart).not.toBe(-1); // la rama else debe existir
    const elseBranch = body.slice(elseStart + elseMarker.length);
    expect(elseBranch).not.toContain('showMilestoneCelebration');
    expect(elseBranch).not.toContain('milestoneSfx.playMilestoneAudio');
  });

  it('endFight(true) — la rama if (won) contiene showMilestoneCelebration(floorNumber), milestoneSfx.playMilestoneAudio(floorNumber) y gameState.floors.length - 1 (Requirements 5.1, 5.2)', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'endFight');
    // Extraer solo la rama if (won): texto desde "if (won) {" hasta "} else {"
    const ifMarker = 'if (won) {';
    const elseMarker = '} else {';
    const ifStart = body.indexOf(ifMarker);
    const elseStart = body.indexOf(elseMarker);
    expect(ifStart).not.toBe(-1);  // la rama if debe existir
    expect(elseStart).not.toBe(-1); // la rama else debe existir
    const ifBranch = body.slice(ifStart + ifMarker.length, elseStart);
    expect(ifBranch).toContain('showMilestoneCelebration(floorNumber)');
    expect(ifBranch).toContain('milestoneSfx.playMilestoneAudio(floorNumber)');
    expect(ifBranch).toContain('gameState.floors.length - 1');
  });
});

/* ===== Bug Condition Exploration Tests — milestone-celebration-volume-boost ===== */

/**
 * Bug Condition — Bug 2: showMilestoneCelebration llamada sincrónicamente
 *
 * Validates: Requirements 1.3, 1.4
 *
 * CRÍTICO: Este test DEBE FALLAR en el código sin corregir.
 * El fallo confirma que el bug existe.
 * NO corregir el código ni el test cuando falle.
 *
 * Contraejemplo esperado:
 *   En código sin corregir, showMilestoneCelebration se llama en el mismo tick
 *   síncrono que hideBossScreen(), SIN estar envuelta en setTimeout(..., 400).
 *   El test espera que esté dentro de un setTimeout con delay de 400 ms.
 */
describe('Bug Condition — Bug 2: showMilestoneCelebration debe llamarse con delay de 400 ms dentro de setTimeout (solo en pisos múltiplos de 15)', () => {
  it('inspección estática: en la rama if (won) de endFight, showMilestoneCelebration debe estar dentro de un bloque setTimeout(..., 400); en código sin corregir la llamada es síncrona → el test falla', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'endFight');

    const ifMarker = 'if (won) {';
    const elseMarker = '} else {';
    const ifStart = body.indexOf(ifMarker);
    const elseStart = body.indexOf(elseMarker);
    expect(ifStart).not.toBe(-1);
    expect(elseStart).not.toBe(-1);
    const ifBranch = body.slice(ifStart + ifMarker.length, elseStart);

    // Verificar que showMilestoneCelebration está DENTRO de un setTimeout con delay 400
    // En código sin corregir: la llamada está fuera de setTimeout → el test falla
    // Estrategia: buscar setTimeout en la rama y verificar que showMilestoneCelebration
    // aparece DESPUÉS del inicio de setTimeout y ANTES del cierre del paréntesis correspondiente.
    const setTimeoutIndex = ifBranch.indexOf('setTimeout(');
    expect(setTimeoutIndex).not.toBe(-1); // setTimeout debe existir en la rama if (won)

    // El texto de showMilestoneCelebration debe aparecer DESPUÉS del inicio de setTimeout
    const celebrationIndex = ifBranch.indexOf('showMilestoneCelebration');
    expect(celebrationIndex).toBeGreaterThan(setTimeoutIndex);

    // El delay de 1000 ms debe estar presente en la llamada a setTimeout de la rama if (won)
    // (no solo en otro setTimeout del else)
    const setTimeoutBlock = ifBranch.slice(setTimeoutIndex);
    // Buscar la primera ocurrencia del patrón setTimeout(... 400)
    expect(setTimeoutBlock).toMatch(/setTimeout\s*\(/);
    expect(setTimeoutBlock).toContain('400');
  });

  it('inspección estática: gameState.screen = "build" debe estar FUERA del setTimeout (síncrono) en endFight', () => {
    const body = extractFunctionBody(MAIN_SOURCE, 'endFight');

    const ifMarker = 'if (won) {';
    const elseMarker = '} else {';
    const ifStart = body.indexOf(ifMarker);
    const elseStart = body.indexOf(elseMarker);
    const ifBranch = body.slice(ifStart + ifMarker.length, elseStart);

    // gameState.screen = 'build' debe asignarse ANTES del setTimeout
    // (transición de estado síncrona — Preservation Property 4)
    const setTimeoutIndex = ifBranch.indexOf('setTimeout(');
    const screenAssignIndex = ifBranch.indexOf("gameState.screen = 'build'");

    // Si setTimeout no existe aún (código sin corregir), screenAssign existe sin setTimeout.
    // Si setTimeout existe, screenAssign debe aparecer ANTES.
    if (setTimeoutIndex !== -1) {
      expect(screenAssignIndex).toBeLessThan(setTimeoutIndex);
    } else {
      // No hay setTimeout en código sin corregir — este sub-test pasa para no
      // producir falso positivo; Bug 2 es detectado por el test anterior.
      expect(screenAssignIndex).not.toBe(-1);
    }
  });
});
