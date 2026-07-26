/* ===== Test de independencia cruzada entre combatSfx, music y sfx =====
   A diferencia de combatSfx.test.js / sfx.test.js (que prueban cada módulo
   de forma aislada), este archivo prueba específicamente la Property 8 del
   design.md: que intercalar operaciones de combatSfx con operaciones de
   music y de sfx nunca produce interferencia observable en ninguna
   dirección. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { combatSfx } from './combatSfx.js';
import { music } from './music.js';
import { sfx } from './sfx.js';

/**
 * MockAudio: mock mínimo de HTMLAudioElement, suficiente para que
 * `combatSfx.play(...)` y `music.init()` puedan ejecutarse por completo sin
 * un navegador real, sin lanzar excepciones y sin depender de archivos
 * .wav reales. No necesita simular ningún fallo para esta propiedad: solo
 * se usa para que las llamadas involucradas no lancen y no dejen
 * rechazos de Promise sin manejar.
 */
class MockAudio {
  constructor(url) {
    this.url = url;
    this.loop = false;
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener(_type, _listener) { /* no-op */ }
}

const MUSIC_PREF_KEY = 'torre-nubes-audio-pref';
const COMBAT_SFX_PREF_KEY = 'torre-nubes-combat-sfx-pref';

// Operaciones generables sobre combatSfx: play/setVolume/toggleMute.
const combatSfxOpArb = fc.oneof(
  fc.record({
    type: fc.constant('play'),
    role: fc.constantFrom('warrior', 'boss'),
    folderId: fc.constantFrom('guerrero', 'boss_1_titan_guerrero'),
    animName: fc.constantFrom('idle', 'ataque', 'herido'),
  }),
  fc.record({ type: fc.constant('setVolume'), value: fc.integer({ min: 0, max: 100 }) }),
  fc.record({ type: fc.constant('toggleMute') })
);

// Operaciones generables sobre music: solo setVolume/toggleMute (las
// operaciones de cambio de pantalla como enterBuildScreen/enterBossScreen
// no aportan nada nuevo al closed-form de getEffectiveVolumePercent()/
// isMuted() que esta prueba verifica, y complicarían el cálculo esperado
// sin cambiar la propiedad bajo prueba).
const musicOpArb = fc.oneof(
  fc.record({ type: fc.constant('setVolume'), value: fc.integer({ min: 0, max: 100 }) }),
  fc.record({ type: fc.constant('toggleMute') })
);

// Funciones restantes de sfx.js (sin `attack`, eliminado por esta feature):
// se ejercen simplemente para confirmar que no lanzan y que no afectan a
// music/combatSfx; no tienen estado observable propio que verificar aquí.
const sfxOpArb = fc.constantFrom('place', 'fall', 'correct', 'wrong', 'win', 'lose', 'door', 'flipCard', 'jump');

/**
 * applyMusicOpClosedForm(state, op): reducer puro que simula, sin tocar el
 * módulo real, el efecto de una operación de music sobre
 * { volumePercent, muted }, replicando exactamente la lógica de
 * music.setVolume/music.toggleMute (asignación directa de volumePercent,
 * inversión booleana de muted).
 */
function applyMusicOpClosedForm(state, op) {
  if (op.type === 'setVolume') {
    return { volumePercent: op.value, muted: state.muted };
  }
  if (op.type === 'toggleMute') {
    return { volumePercent: state.volumePercent, muted: !state.muted };
  }
  return state;
}

/**
 * applyCombatSfxOpClosedForm(state, op): mismo reducer puro que arriba,
 * para combatSfx. `play` no afecta volumePercent/muted en absoluto.
 */
function applyCombatSfxOpClosedForm(state, op) {
  if (op.type === 'setVolume') {
    return { volumePercent: op.value, muted: state.muted };
  }
  if (op.type === 'toggleMute') {
    return { volumePercent: state.volumePercent, muted: !state.muted };
  }
  return state;
}

// Feature: combat-animation-sfx, Property 8: Independencia total respecto a la música y a los efectos de sfx.js restantes
describe('combatSfx / music / sfx — independencia total entre módulos de audio', () => {
  it('Property 8: intercalar operaciones de combatSfx con operaciones de music y de sfx nunca altera el estado observable de music, y viceversa el estado observable de combatSfx nunca se ve afectado por operaciones de music/sfx', () => {
    vi.stubGlobal('Audio', MockAudio);

    try {
      fc.assert(
        fc.property(
          fc.array(combatSfxOpArb, { minLength: 0, maxLength: 15 }),
          fc.array(musicOpArb, { minLength: 0, maxLength: 15 }),
          fc.array(sfxOpArb, { minLength: 0, maxLength: 10 }),
          (combatSfxOps, musicOps, sfxOps) => {
            // Baseline limpio: descarta cualquier Stored_Preference previo
            // de ambos módulos y (re)inicializa cada uno desde cero, para no
            // heredar estado de una ejecución anterior de fc.property ni de
            // otras pruebas de este archivo.
            localStorage.removeItem(MUSIC_PREF_KEY);
            localStorage.removeItem(COMBAT_SFX_PREF_KEY);
            music.init();
            combatSfx.init();

            // Estado esperado en forma cerrada, calculado ÚNICAMENTE a
            // partir de la propia subsecuencia de cada módulo, ignorando
            // por completo las operaciones intercaladas de los otros dos.
            let expectedMusicState = {
              volumePercent: music.getEffectiveVolumePercent(),
              muted: music.isMuted(),
            };
            let expectedCombatSfxState = {
              volumePercent: combatSfx.getEffectiveVolumePercent(),
              muted: combatSfx.isMuted(),
            };

            // Intercalado a nivel de statement: en cada paso se consume (si
            // queda disponible) una operación de cada una de las tres
            // fuentes, en el orden combatSfx -> music -> sfx. Esto es
            // suficiente para demostrar ausencia de interferencia cruzada
            // sin necesitar un mezclador de secuencias más elaborado: cada
            // combinación de longitudes y de orden relativo ya queda
            // cubierta por fast-check al variar independientemente los tres
            // arrays a lo largo de las 100 ejecuciones.
            const maxLen = Math.max(combatSfxOps.length, musicOps.length, sfxOps.length);
            for (let i = 0; i < maxLen; i += 1) {
              if (i < combatSfxOps.length) {
                const op = combatSfxOps[i];
                if (op.type === 'play') {
                  combatSfx.play(op.role, op.folderId, op.animName);
                } else if (op.type === 'setVolume') {
                  combatSfx.setVolume(op.value);
                } else if (op.type === 'toggleMute') {
                  combatSfx.toggleMute();
                }
                expectedCombatSfxState = applyCombatSfxOpClosedForm(expectedCombatSfxState, op);
              }

              if (i < musicOps.length) {
                const op = musicOps[i];
                if (op.type === 'setVolume') {
                  music.setVolume(op.value);
                } else if (op.type === 'toggleMute') {
                  music.toggleMute();
                }
                expectedMusicState = applyMusicOpClosedForm(expectedMusicState, op);
              }

              if (i < sfxOps.length) {
                const eventName = sfxOps[i];
                // Confirma únicamente que invocar cualquier función restante
                // de sfx.js nunca lanza; su comportamiento interno (síntesis
                // Web Audio / reproducción de archivo) no es lo que esta
                // propiedad verifica.
                expect(() => sfx[eventName]()).not.toThrow();
              }
            }

            // El estado observable final de music coincide exactamente con
            // el que resultaría de haber ejecutado únicamente su propia
            // subsecuencia, ignorando las operaciones de combatSfx/sfx
            // intercaladas.
            expect(music.getEffectiveVolumePercent()).toBe(expectedMusicState.volumePercent);
            expect(music.isMuted()).toBe(expectedMusicState.muted);

            // Simétricamente, el estado observable final de combatSfx
            // coincide exactamente con el que resultaría de haber ejecutado
            // únicamente su propia subsecuencia, ignorando las operaciones
            // de music/sfx intercaladas.
            expect(combatSfx.getEffectiveVolumePercent()).toBe(expectedCombatSfxState.volumePercent);
            expect(combatSfx.isMuted()).toBe(expectedCombatSfxState.muted);
          }
        ),
        { numRuns: 100 }
      );
    } finally {
      vi.unstubAllGlobals();
      localStorage.removeItem(MUSIC_PREF_KEY);
      localStorage.removeItem(COMBAT_SFX_PREF_KEY);
    }
  });
});

/* ===== Pruebas unitarias (ejemplos concretos) de independencia combatSfx <-> music =====
   Complementan la Property 8 anterior con dos ejemplos concretos y
   directos: invocar operaciones de music no cambia el estado observable
   de combatSfx, y viceversa. */
describe('combatSfx / music — pruebas unitarias de independencia (ejemplos concretos)', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', MockAudio);
    localStorage.removeItem(MUSIC_PREF_KEY);
    localStorage.removeItem(COMBAT_SFX_PREF_KEY);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem(MUSIC_PREF_KEY);
    localStorage.removeItem(COMBAT_SFX_PREF_KEY);
  });

  it('music.setVolume(...)/music.toggleMute() no modifican combatSfx.getEffectiveVolumePercent()/combatSfx.isMuted()', () => {
    music.init();
    combatSfx.init();

    const volumeBefore = combatSfx.getEffectiveVolumePercent();
    const mutedBefore = combatSfx.isMuted();

    music.setVolume(80);
    music.toggleMute();

    expect(combatSfx.getEffectiveVolumePercent()).toBe(volumeBefore);
    expect(combatSfx.isMuted()).toBe(mutedBefore);
  });

  it('combatSfx.setVolume(...)/combatSfx.toggleMute() no modifican music.getEffectiveVolumePercent()/music.isMuted()', () => {
    music.init();
    combatSfx.init();

    const volumeBefore = music.getEffectiveVolumePercent();
    const mutedBefore = music.isMuted();

    combatSfx.setVolume(15);
    combatSfx.toggleMute();

    expect(music.getEffectiveVolumePercent()).toBe(volumeBefore);
    expect(music.isMuted()).toBe(mutedBefore);
  });
});
