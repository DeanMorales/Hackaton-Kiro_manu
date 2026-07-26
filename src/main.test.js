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
