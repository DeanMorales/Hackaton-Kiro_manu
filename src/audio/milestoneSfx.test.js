/* ===== Tests del módulo de efectos de sonido de hitos (src/audio/milestoneSfx.js) ===== */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { selectMilestoneSound, computeEffectiveVolume, milestoneSfx, PRELOADED } from './milestoneSfx.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname_tests = dirname(__filename);
const MILESTONE_SFX_SOURCE = readFileSync(resolve(__dirname_tests, './milestoneSfx.js'), 'utf-8');

afterEach(() => {
  vi.unstubAllGlobals();
});

// Feature: milestone-celebration-feedback, Property 4: Sound selection — multiples of 30

/**
 * Validates: Requirements 3.1, 3.3, 4.3
 *
 * Para cualquier múltiplo de 30, selectMilestoneSound debe retornar 'epic'.
 */
describe('selectMilestoneSound — múltiplos de 30 producen "epic"', () => {
  it('Property 4: para cualquier n múltiplo de 30 en [30, 9990], selectMilestoneSound(n) === "epic"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 333 }).map((n) => n * 30),
        (n) => {
          return selectMilestoneSound(n) === 'epic';
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: milestone-celebration-feedback, Property 5: Sound selection — multiples of 15, not 30

/**
 * Validates: Requirement 4.1
 *
 * Para cualquier múltiplo de 15 que NO sea múltiplo de 30,
 * selectMilestoneSound debe retornar 'milestone'.
 */
describe('selectMilestoneSound — múltiplos de 15 (no de 30) producen "milestone"', () => {
  it('Property 5: para cualquier n múltiplo de 15 pero no de 30, selectMilestoneSound(n) === "milestone"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 666 }).map((n) => n * 15).filter((n) => n % 30 !== 0),
        (n) => {
          return selectMilestoneSound(n) === 'milestone';
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: milestone-celebration-feedback, Property 6: Sound selection — non-multiples of 15

/**
 * Validates: Requirement 5.3
 *
 * Para cualquier entero positivo que NO sea múltiplo de 15,
 * selectMilestoneSound debe retornar 'none'.
 */
describe('selectMilestoneSound — no múltiplos de 15 producen "none"', () => {
  it('Property 6: para cualquier n en [1, 9998] que no sea múltiplo de 15, selectMilestoneSound(n) === "none"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9998 }).filter((n) => n % 15 !== 0),
        (n) => {
          return selectMilestoneSound(n) === 'none';
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: milestone-celebration-feedback, Property 7: Volume application

/**
 * Validates: Requirements 3.5, 4.5, 6.5
 *
 * Para cualquier volumePercent en [0, 100] y muted booleano,
 * computeEffectiveVolume debe retornar muted ? 0 : volumePercent / 100.
 */
describe('computeEffectiveVolume — aplicación de volumen', () => {
  it('Property 7: para cualquier volumePercent en [0, 100] y muted booleano, retorna muted ? 0 : volumePercent/100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.boolean(),
        (volumePercent, muted) => {
          const expected = muted ? 0 : volumePercent / 100;
          const actual = computeEffectiveVolume(volumePercent, muted);
          return Math.abs(actual - expected) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ===== Unit tests para milestoneSfx (precarga y manejo de errores) ===== */

// Validates: Requirements 6.1, 3.4, 4.4
describe('milestoneSfx — PRELOADED map precarga ambos archivos de audio (inspección estática)', () => {
  it('el código fuente contiene PRELOADED.set( para epic_ congratulations_30.mp3', () => {
    expect(MILESTONE_SFX_SOURCE).toContain('PRELOADED.set(');
    expect(MILESTONE_SFX_SOURCE).toContain('epic_ congratulations_30.mp3');
  });

  it('el código fuente contiene PRELOADED.set( para every_10_floors.mp3', () => {
    expect(MILESTONE_SFX_SOURCE).toContain('PRELOADED.set(');
    expect(MILESTONE_SFX_SOURCE).toContain('every_10_floors.mp3');
  });
});

// Validates: Requirements 6.2, 3.4, 4.4
describe('milestoneSfx.playMilestoneAudio — fallo de Audio.play() llama console.error y no propaga excepción', () => {
  it('cuando .play() rechaza la Promise, console.error es llamado y no se lanza ninguna excepción', async () => {
    class MockAudioFailing {
      constructor() {
        this.volume = 1;
        this.preload = '';
      }
      play() {
        return Promise.reject(new Error('play failed'));
      }
      cloneNode() {
        return new MockAudioFailing();
      }
      addEventListener() {}
    }

    // Clear PRELOADED so the fallback `new Audio(...)` path is used,
    // which will construct a MockAudioFailing instance (the stub below).
    PRELOADED.clear();

    vi.stubGlobal('Audio', MockAudioFailing);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    milestoneSfx.init(() => ({ volume: 1, muted: false }));

    expect(() => {
      milestoneSfx.playMilestoneAudio(15);
    }).not.toThrow();

    // Settle any pending promise microtasks
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// Validates: Requirement 5.3
describe('milestoneSfx.playMilestoneAudio — número de piso no múltiplo de 15 no instancia Audio', () => {
  it('playMilestoneAudio(7) no construye ninguna instancia de Audio', () => {
    let constructorCallCount = 0;

    class MockAudioTracked {
      constructor() {
        constructorCallCount += 1;
        this.volume = 1;
        this.preload = '';
      }
      play() {
        return Promise.resolve();
      }
      cloneNode() {
        return new MockAudioTracked();
      }
      addEventListener() {}
    }

    vi.stubGlobal('Audio', MockAudioTracked);
    constructorCallCount = 0; // reset after stub (module may have run preload already)

    milestoneSfx.playMilestoneAudio(7);

    expect(constructorCallCount).toBe(0);
  });
});

/* ===== Bug Condition Exploration Tests — milestone-celebration-volume-boost ===== */

/**
 * Bug Condition — Bug 1: playMilestoneAudio sin boost
 *
 * Validates: Requirements 1.1, 1.2
 *
 * CRÍTICO: Estos tests DEBEN FALLAR en el código sin corregir.
 * El fallo confirma que el bug existe.
 * NO corregir el código ni los tests cuando fallen.
 *
 * Contraejemplo esperado:
 *   playMilestoneAudio(15) con volume=0.06, muted=false
 *   → audioEl.volume = 0.06 (sin boost) en lugar de 0.09 (con boost 1.5×)
 */
describe('Bug Condition — Bug 1: playMilestoneAudio sin boost', () => {
  it('playMilestoneAudio(15) con volume=0.06, muted=false debe asignar audioEl.volume === 0.09 (Math.min(1, 0.06 * 1.5)); en código sin corregir falla porque asigna 0.06', () => {
    // Limpiar PRELOADED para forzar la ruta new Audio(...)
    PRELOADED.clear();

    let capturedVolume = null;

    class MockAudio {
      constructor() {
        this.volume = 1;
        this.preload = '';
      }
      set volume(v) {
        capturedVolume = v;
        this._volume = v;
      }
      get volume() {
        return this._volume ?? 1;
      }
      play() {
        return Promise.resolve();
      }
      cloneNode() {
        return new MockAudio();
      }
      addEventListener() {}
    }

    vi.stubGlobal('Audio', MockAudio);

    // Configurar: volumen base de música 6% (0.06), no silenciado
    milestoneSfx.init(() => ({ volume: 0.06, muted: false }));
    milestoneSfx.playMilestoneAudio(15);

    const DEFAULT_BOOST = 1.5;
    const expectedVolume = Math.min(1, 0.06 * DEFAULT_BOOST); // 0.09

    // En código sin corregir: capturedVolume === 0.06 (sin boost aplicado)
    // El test FALLA porque 0.06 !== 0.09 → confirma el Bug 1
    expect(capturedVolume).toBeCloseTo(expectedVolume, 5);
  });

  it('milestoneSfx.setBoost no debe existir como undefined en código sin corregir (confirma ausencia de la API de boost)', () => {
    // En código sin corregir: typeof milestoneSfx.setBoost === 'undefined' → true
    // El test FALLA porque la condición que comprobamos es la AUSENCIA de la API:
    // una vez corregido, setBoost debe ser una función.
    expect(typeof milestoneSfx.setBoost).toBe('function');
  });
});

/* ===== Property 2: Preservation Tests — milestone-celebration-volume-boost ===== */

/**
 * Property 2: Preservation — Mute y pisos sin sonido
 *
 * Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6
 *
 * Observación sobre código NO corregido:
 *   - Tests de mute y pisos sin sonido DEBEN PASAR (confirman baseline a preservar).
 *   - Tests de boost ceiling y round-trip FALLAN en código sin corregir (esperado —
 *     confirman que setBoost/getBoost aún no existen y deben añadirse).
 */
describe('Property 2: Preservation — mute y pisos sin sonido', () => {
  /**
   * PBT: para cualquier volume ∈ [0, 1] y muted = true,
   * playMilestoneAudio(15) asigna audioEl.volume === 0 (mute siempre gana).
   *
   * En código sin corregir: el cálculo es computeEffectiveVolume(volume*100, true) → 0.
   * Este test DEBE PASAR en código sin corregir (baseline a preservar).
   *
   * Validates: Requirement 3.2
   */
  it('PBT: para cualquier volume ∈ [0,1] y muted=true, playMilestoneAudio(15) → audioEl.volume === 0 (mute siempre gana)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (volume) => {
          PRELOADED.clear();
          let capturedVolume = null;

          class MockAudioMute {
            constructor() {
              this._volume = 1;
              this.preload = '';
            }
            get volume() { return this._volume; }
            set volume(v) {
              capturedVolume = v;
              this._volume = v;
            }
            play() { return Promise.resolve(); }
            cloneNode() { return new MockAudioMute(); }
            addEventListener() {}
          }

          vi.stubGlobal('Audio', MockAudioMute);
          milestoneSfx.init(() => ({ volume, muted: true }));
          milestoneSfx.playMilestoneAudio(15);

          return capturedVolume === 0;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * PBT: para cualquier floorNumber donde floorNumber % 15 !== 0,
   * playMilestoneAudio(floorNumber) no construye ninguna instancia de Audio.
   *
   * En código sin corregir: early return cuando selectMilestoneSound === 'none'.
   * Este test DEBE PASAR en código sin corregir (baseline a preservar).
   *
   * Validates: Requirement 3.1
   */
  it('PBT: para cualquier floorNumber no múltiplo de 15, playMilestoneAudio no instancia Audio', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }).filter((n) => n % 15 !== 0),
        (floorNumber) => {
          let constructorCount = 0;

          class MockAudioCounted {
            constructor() {
              constructorCount += 1;
              this._volume = 1;
              this.preload = '';
            }
            get volume() { return this._volume; }
            set volume(v) { this._volume = v; }
            play() { return Promise.resolve(); }
            cloneNode() { return new MockAudioCounted(); }
            addEventListener() {}
          }

          // Limpiamos PRELOADED para asegurarnos de que cualquier Audio creado
          // sea capturado por el MockAudio (no por cloneNode del preload).
          PRELOADED.clear();
          vi.stubGlobal('Audio', MockAudioCounted);
          constructorCount = 0; // reset después del stub

          milestoneSfx.playMilestoneAudio(floorNumber);

          return constructorCount === 0;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * PBT: para cualquier volume ∈ [0, 1], boost ∈ [1.0, 3.0], muted = false,
   * el volumen resultante es ≤ 1.0 Y ≥ volume (boost nunca reduce; techo a 1.0).
   *
   * NOTA: Este test FALLARÁ en código sin corregir porque setBoost no existe.
   * Eso es esperado — confirma que la API de boost debe añadirse.
   * Una vez implementado el fix, debe pasar.
   *
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  it('PBT: para cualquier volume ∈ [0,1], boost ∈ [1.0,3.0], muted=false → volumen ≤ 1.0 y ≥ volume (boost ceiling) [FALLA en código sin corregir — esperado]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 1.0, max: 3.0, noNaN: true }),
        (volume, boost) => {
          PRELOADED.clear();
          let capturedVolume = null;

          class MockAudioBoost {
            constructor() {
              this._volume = 1;
              this.preload = '';
            }
            get volume() { return this._volume; }
            set volume(v) {
              capturedVolume = v;
              this._volume = v;
            }
            play() { return Promise.resolve(); }
            cloneNode() { return new MockAudioBoost(); }
            addEventListener() {}
          }

          vi.stubGlobal('Audio', MockAudioBoost);

          // setBoost no existe en código sin corregir → TypeError
          // El test falla aquí, confirmando que la API debe añadirse
          milestoneSfx.setBoost(boost);
          milestoneSfx.init(() => ({ volume, muted: false }));
          milestoneSfx.playMilestoneAudio(15);

          if (capturedVolume === null) return false;
          return capturedVolume <= 1.0 && capturedVolume >= volume;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * PBT: round-trip de boost: para cualquier boost ∈ [1.0, 3.0] (paso 0.1),
   * setBoost(boost) seguido de getBoost() retorna el mismo valor.
   *
   * NOTA: Este test FALLARÁ en código sin corregir porque setBoost/getBoost
   * no existen. Eso es esperado — confirman que la API debe implementarse.
   *
   * Validates: Requirements 2.7, 2.8
   */
  it('PBT: round-trip boost — setBoost(v) seguido de getBoost() retorna v [FALLA en código sin corregir — esperado]', () => {
    fc.assert(
      fc.property(
        // paso 0.1: generamos enteros [10, 30] y dividimos entre 10 → [1.0, 3.0]
        fc.integer({ min: 10, max: 30 }).map((n) => n / 10),
        (boost) => {
          // En código sin corregir: milestoneSfx.setBoost es undefined → TypeError
          milestoneSfx.setBoost(boost);
          const retrieved = milestoneSfx.getBoost();
          return Math.abs(retrieved - boost) < 0.0001;
        }
      ),
      { numRuns: 20 }
    );
  });
});
