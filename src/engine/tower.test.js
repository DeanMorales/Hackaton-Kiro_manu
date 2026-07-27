/* ===== Tests del motor de la torre (src/engine/tower.js) ===== */
import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  createTowerState,
  resetGame,
  update,
  dropBlock,
  applyDuelWinSpeedBoost,
  applySpeedBoost,
  applySpeedBoostWithCap,
  registerDuelWinForStreak,
  resetPerfectStreak,
  triggerFall,
  newMovingBlock,
  isReliefPlatformFloor,
  topFloor,
  BASE_SPEED,
  SPEED_CAP,
  SPEED_INCREMENT_FACTOR,
  STABLE_PHASE_DUEL_THRESHOLD,
  PERFECT_STREAK_BONUS_WIDTH,
  PERFECT_STREAK_BONUS_INTERVAL,
  RELIEF_PLATFORM_INTERVAL,
  RELIEF_PLATFORM_WIDTH_MULTIPLIER,
  BASE_PLATFORM_WIDTH,
  MIN_WIDTH,
} from './tower.js';
import * as environmentRoster from '../data/environmentRoster.js';
import { BIOME_CATALOG, TIME_OF_DAY_CATALOG } from '../data/environmentRoster.js';

// Feature: tower-ground-biome-background, Property 4: Inmutabilidad de Active_Biome y Active_Time_Of_Day durante la sesión
describe('createTowerState — inmutabilidad de activeBiome/activeTimeOfDay durante la sesión', () => {
  it('Property 4: cualquier secuencia de update/dropBlock/applyDuelWinSpeedBoost/triggerFall/newMovingBlock deja activeBiome y activeTimeOfDay exactamente iguales', () => {
    const dtArb = fc.integer({ min: 1, max: 48 }); // Requirement 6.2/6.3: dt válido, igual al Math.min(48, ...) usado en main.js
    const nowArb = fc.integer({ min: 0, max: 1_000_000 });
    const widthArb = fc.integer({ min: 300, max: 1200 });
    const heightArb = fc.integer({ min: 300, max: 1200 });

    const opArb = fc.oneof(
      fc.record({ type: fc.constant('update'), dt: dtArb, now: nowArb, width: widthArb }),
      fc.record({ type: fc.constant('dropBlock'), width: widthArb }),
      fc.record({ type: fc.constant('applyDuelWinSpeedBoost') }),
      fc.record({ type: fc.constant('triggerFall'), now: nowArb }),
      fc.record({ type: fc.constant('newMovingBlock'), width: widthArb })
    );

    fc.assert(
      fc.property(
        widthArb,
        heightArb,
        fc.array(opArb, { maxLength: 30 }),
        (width, height, ops) => {
          const state = createTowerState(width, height);

          // Sesión recién creada por createTowerState: capturar Active_Biome/
          // Active_Time_Of_Day antes de aplicar ninguna operación.
          const biomeBefore = state.activeBiome;
          const timeOfDayBefore = state.activeTimeOfDay;

          // Forzar screen = 'build' para que dropBlock/update ejerciten su lógica
          // real (no-op temprano) en lugar de quedarse siempre en el 'start'
          // inicial; la propiedad debe cumplirse igual si las operaciones son
          // no-ops o si tienen efecto real.
          state.screen = 'build';

          for (const op of ops) {
            switch (op.type) {
              case 'update':
                update(state, op.dt, op.now, op.width);
                break;
              case 'dropBlock':
                dropBlock(state, op.width);
                break;
              case 'applyDuelWinSpeedBoost':
                applyDuelWinSpeedBoost(state);
                break;
              case 'triggerFall':
                triggerFall(state, op.now);
                break;
              case 'newMovingBlock': {
                const after = topFloor(state);
                if (after) state.moving = newMovingBlock(state, after, op.width);
                break;
              }
              default:
                break;
            }
          }

          // Ninguna de estas funciones lee ni escribe activeBiome/activeTimeOfDay:
          // deben seguir siendo exactamente la misma entrada de catálogo (misma
          // identidad de objeto) tras cualquier secuencia de llamadas.
          expect(state.activeBiome).toBe(biomeBefore);
          expect(state.activeTimeOfDay).toBe(timeOfDayBefore);
          expect(state.activeBiome).toEqual(biomeBefore);
          expect(state.activeTimeOfDay).toEqual(timeOfDayBefore);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Requirements: 6.1, 6.4 — pruebas unitarias de la integración de
// activeBiome/activeTimeOfDay en createTowerState/resetGame
describe('createTowerState/resetGame — integración con environmentRoster', () => {
  it('createTowerState devuelve activeBiome perteneciente a BIOME_CATALOG y activeTimeOfDay perteneciente a TIME_OF_DAY_CATALOG', () => {
    const state = createTowerState(800, 600);

    expect(BIOME_CATALOG).toContain(state.activeBiome);
    expect(TIME_OF_DAY_CATALOG).toContain(state.activeTimeOfDay);
  });

  it('resetGame llamado dos veces sucesivas sobre el mismo state re-invoca la selección de bioma/momento del día', () => {
    const marker = (label) => ({ __marker: label });
    const biomeMarks = [marker('biome-0'), marker('biome-1'), marker('biome-2')];
    const timeMarks = [marker('time-0'), marker('time-1'), marker('time-2')];

    const biomeSpy = vi.spyOn(environmentRoster, 'nextBiomeForSession')
      .mockReturnValueOnce(biomeMarks[0])
      .mockReturnValueOnce(biomeMarks[1])
      .mockReturnValueOnce(biomeMarks[2]);
    const timeOfDaySpy = vi.spyOn(environmentRoster, 'nextTimeOfDayForSession')
      .mockReturnValueOnce(timeMarks[0])
      .mockReturnValueOnce(timeMarks[1])
      .mockReturnValueOnce(timeMarks[2]);

    // createTowerState: 1ra invocación de cada selección
    const state = createTowerState(800, 600);
    expect(state.activeBiome).toBe(biomeMarks[0]);
    expect(state.activeTimeOfDay).toBe(timeMarks[0]);
    expect(biomeSpy).toHaveBeenCalledTimes(1);
    expect(timeOfDaySpy).toHaveBeenCalledTimes(1);

    // 1ra llamada a resetGame: 2da invocación de cada selección, reemplaza ambos campos
    resetGame(state, 800, 600);
    expect(state.activeBiome).toBe(biomeMarks[1]);
    expect(state.activeTimeOfDay).toBe(timeMarks[1]);
    expect(biomeSpy).toHaveBeenCalledTimes(2);
    expect(timeOfDaySpy).toHaveBeenCalledTimes(2);

    // 2da llamada sucesiva a resetGame: 3ra invocación de cada selección, reemplaza ambos campos de nuevo
    resetGame(state, 800, 600);
    expect(state.activeBiome).toBe(biomeMarks[2]);
    expect(state.activeTimeOfDay).toBe(timeMarks[2]);
    expect(biomeSpy).toHaveBeenCalledTimes(3);
    expect(timeOfDaySpy).toHaveBeenCalledTimes(3);

    biomeSpy.mockRestore();
    timeOfDaySpy.mockRestore();
  });
});

// Feature: endless-tower-difficulty-cap, Property 3: Reiniciar la partida restablece velocidad, racha y contadores de Fase_Estable a sus valores base
describe('resetGame — reinicio completo de velocidad/racha/contadores de Fase_Estable', () => {
  it('Property 3: para cualquier estado previo arbitrario, resetGame restablece moveSpeed, doorsPassed, perfectStreak, streakWidthBonus y stableFloorsBuilt a sus valores base', () => {
    const widthArb = fc.integer({ min: 300, max: 1200 });
    const heightArb = fc.integer({ min: 300, max: 1200 });
    const moveSpeedArb = fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true });
    const doorsPassedArb = fc.nat({ max: 200 });
    const perfectStreakArb = fc.nat({ max: 200 });
    const streakWidthBonusArb = fc.nat({ max: 2000 });
    const stableFloorsBuiltArb = fc.nat({ max: 200 });

    fc.assert(
      fc.property(
        widthArb,
        heightArb,
        moveSpeedArb,
        doorsPassedArb,
        perfectStreakArb,
        streakWidthBonusArb,
        stableFloorsBuiltArb,
        (width, height, moveSpeed, doorsPassed, perfectStreak, streakWidthBonus, stableFloorsBuilt) => {
          const state = createTowerState(width, height);

          // Simula un estado arbitrario alcanzado tras una secuencia válida de
          // Duelos Ganados/perdidos y pisos construidos, mutando directamente
          // los campos relevantes (los setters dedicados de racha/plataformas
          // aún no existen en este punto del plan de implementación).
          state.moveSpeed = moveSpeed;
          state.doorsPassed = doorsPassed;
          state.perfectStreak = perfectStreak;
          state.streakWidthBonus = streakWidthBonus;
          state.stableFloorsBuilt = stableFloorsBuilt;

          resetGame(state, width, height);

          expect(state.moveSpeed).toBe(BASE_SPEED);
          expect(state.doorsPassed).toBe(0);
          expect(state.perfectStreak).toBe(0);
          expect(state.streakWidthBonus).toBe(0);
          expect(state.stableFloorsBuilt).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: endless-tower-difficulty-cap, Property 1: El Tope_Velocidad se alcanza exactamente al 5º Duelo Ganado y se mantiene constante después
describe('applyDuelWinSpeedBoost — alcance exacto y estabilidad del Tope_Velocidad', () => {
  it('Property 1: para cualquier N >= 5 Duelos Ganados consecutivos, moveSpeed es exactamente SPEED_CAP tras el 5º y permanece en SPEED_CAP en cualquier llamada adicional', () => {
    const widthArb = fc.integer({ min: 300, max: 1200 });
    const heightArb = fc.integer({ min: 300, max: 1200 });
    const nArb = fc.integer({ min: 5, max: 60 });

    fc.assert(
      fc.property(
        widthArb,
        heightArb,
        nArb,
        (width, height, n) => {
          const state = createTowerState(width, height);
          state.moveSpeed = BASE_SPEED;
          state.doorsPassed = 0;

          // Fase 1: exactamente STABLE_PHASE_DUEL_THRESHOLD (5) Duelos Ganados,
          // replicando el orden real de main.js (applyDuelWinSpeedBoost primero,
          // luego doorsPassed += 1).
          for (let i = 0; i < STABLE_PHASE_DUEL_THRESHOLD; i++) {
            applyDuelWinSpeedBoost(state);
            state.doorsPassed += 1;
          }

          // Tras el 5º Duelo Ganado, el Tope_Velocidad SHALL alcanzarse exactamente.
          expect(state.moveSpeed).toBe(SPEED_CAP);

          // Fase 2: (n - 5) Duelos Ganados adicionales; moveSpeed SHALL permanecer
          // exactamente igual a SPEED_CAP en cada uno, sin volver a multiplicarse.
          for (let i = STABLE_PHASE_DUEL_THRESHOLD; i < n; i++) {
            applyDuelWinSpeedBoost(state);
            state.doorsPassed += 1;
            expect(state.moveSpeed).toBe(SPEED_CAP);
          }

          expect(state.moveSpeed).toBe(SPEED_CAP);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: endless-tower-difficulty-cap, Property 2: El comportamiento previo al Tope_Velocidad es idéntico al de tower-progression-scaling
describe('applyDuelWinSpeedBoost — equivalencia con el comportamiento pre-tope de tower-progression-scaling', () => {
  it('Property 2: para cualquier N entre 1 y 4 Duelos Ganados consecutivos, moveSpeed es idéntico (tolerancia 0.001) a BASE_SPEED * Math.pow(SPEED_INCREMENT_FACTOR, N)', () => {
    const widthArb = fc.integer({ min: 300, max: 1200 });
    const heightArb = fc.integer({ min: 300, max: 1200 });
    const nArb = fc.integer({ min: 1, max: 4 });

    fc.assert(
      fc.property(
        widthArb,
        heightArb,
        nArb,
        (width, height, n) => {
          const state = createTowerState(width, height);
          state.moveSpeed = BASE_SPEED;
          state.doorsPassed = 0;

          for (let i = 0; i < n; i++) {
            applyDuelWinSpeedBoost(state);
            state.doorsPassed += 1;
          }

          const expected = BASE_SPEED * Math.pow(SPEED_INCREMENT_FACTOR, n);

          expect(Math.abs(state.moveSpeed - expected)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: endless-tower-difficulty-cap, Property 6: La Racha_Perfecta se incrementa solo con Duelos Perfectos consecutivos y se reinicia ante cualquier interrupción
describe('registerDuelWinForStreak/resetPerfectStreak — actualización de la Racha_Perfecta', () => {
  it('Property 6: para cualquier secuencia de resultados de Duelo, perfectStreak final es exactamente la racha de perfect-win consecutivos al final', () => {
    const widthArb = fc.integer({ min: 300, max: 1200 });
    const heightArb = fc.integer({ min: 300, max: 1200 });
    const resultsArb = fc.array(
      fc.constantFrom('perfect-win', 'imperfect-win', 'lose', 'fall'),
      { minLength: 1, maxLength: 40 }
    );

    fc.assert(
      fc.property(
        widthArb,
        heightArb,
        resultsArb,
        (width, height, results) => {
          const state = createTowerState(width, height);
          state.doorsPassed = 0; // no relevante para esta propiedad (Fase_Estable cubierta por Properties 7/8)

          for (const result of results) {
            if (result === 'perfect-win') {
              registerDuelWinForStreak(state, true);
            } else if (result === 'imperfect-win') {
              registerDuelWinForStreak(state, false);
            } else {
              // 'lose' o 'fall'
              resetPerfectStreak(state);
            }
          }

          let expectedTrailingRun = 0;
          for (let i = results.length - 1; i >= 0; i--) {
            if (results[i] === 'perfect-win') {
              expectedTrailingRun += 1;
            } else {
              break;
            }
          }

          expect(state.perfectStreak).toBe(expectedTrailingRun);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: endless-tower-difficulty-cap, Property 7: El Bono_Racha_Perfecta se otorga exactamente cada 3 Duelos Perfectos consecutivos dentro de la Fase_Estable, es acumulativo y nunca se revierte
describe('registerDuelWinForStreak — otorgamiento acumulativo e irreversible del Bono_Racha_Perfecta', () => {
  it('Property 7: para cualquier secuencia dentro de la Fase_Estable, streakWidthBonus final es exactamente b0 + PERFECT_STREAK_BONUS_WIDTH por cada racha completa de PERFECT_STREAK_BONUS_INTERVAL Duelos Perfectos consecutivos en TODA la secuencia (irreversible ante reinicios), y es no decreciente en todo momento', () => {
    const doorsPassedArb = fc.integer({ min: STABLE_PHASE_DUEL_THRESHOLD, max: STABLE_PHASE_DUEL_THRESHOLD + 50 });
    const b0Arb = fc.nat({ max: 500 });
    const perfectSeqArb = fc.array(fc.boolean(), { minLength: 1, maxLength: 30 });

    fc.assert(
      fc.property(
        doorsPassedArb,
        b0Arb,
        perfectSeqArb,
        (doorsPassed, b0, perfectSeq) => {
          const state = createTowerState(800, 600);
          // Fase_Estable activa durante toda la secuencia: registerDuelWinForStreak
          // no muta doorsPassed, por lo que este valor permanece fijo.
          state.doorsPassed = doorsPassed;
          state.streakWidthBonus = b0;

          let previousBonus = state.streakWidthBonus;
          for (const perfect of perfectSeq) {
            registerDuelWinForStreak(state, perfect);
            // Invariante: streakWidthBonus nunca disminuye, ni siquiera en los
            // pasos donde perfectStreak se reinicia a 0.
            expect(state.streakWidthBonus).toBeGreaterThanOrEqual(previousBonus);
            previousBonus = state.streakWidthBonus;
          }

          // Oráculo independiente: recorre toda la secuencia acumulando el bono
          // otorgado en CADA racha de PERFECT_STREAK_BONUS_INTERVAL Duelos Perfectos
          // consecutivos, sin revertirlo en los reinicios (el bono es irreversible
          // y acumulativo a lo largo de TODA la secuencia, no solo de su racha final).
          let runningStreak = 0;
          let totalBonusEarned = 0;
          for (const perfect of perfectSeq) {
            if (perfect) {
              runningStreak += 1;
              if (runningStreak % PERFECT_STREAK_BONUS_INTERVAL === 0) {
                totalBonusEarned += PERFECT_STREAK_BONUS_WIDTH;
              }
            } else {
              runningStreak = 0;
            }
          }

          const expectedBonus = b0 + totalBonusEarned;

          expect(state.streakWidthBonus).toBe(expectedBonus);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: endless-tower-difficulty-cap, Property 8: Ningún Duelo Perfecto anterior a la Fase_Estable otorga Bono_Racha_Perfecta, aunque sí incrementa la racha
describe('registerDuelWinForStreak — ausencia de Bono_Racha_Perfecta antes de la Fase_Estable', () => {
  it('Property 8: para cualquier secuencia de N >= 3 Duelos Perfectos consecutivos con doorsPassed < STABLE_PHASE_DUEL_THRESHOLD constante, streakWidthBonus no cambia y perfectStreak alcanza N', () => {
    const doorsPassedArb = fc.integer({ min: 0, max: STABLE_PHASE_DUEL_THRESHOLD - 1 });
    const b0Arb = fc.nat({ max: 500 });
    const nArb = fc.integer({ min: 3, max: 30 });

    fc.assert(
      fc.property(
        doorsPassedArb,
        b0Arb,
        nArb,
        (doorsPassed, b0, n) => {
          const state = createTowerState(800, 600);
          // Fuera de la Fase_Estable durante toda la secuencia: doorsPassed
          // permanece constante (ningún Duelo Ganado adicional lo incrementa
          // entre estas llamadas).
          state.doorsPassed = doorsPassed;
          state.streakWidthBonus = b0;

          for (let i = 0; i < n; i++) {
            registerDuelWinForStreak(state, true);
          }

          expect(state.streakWidthBonus).toBe(b0);
          expect(state.perfectStreak).toBe(n);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: endless-tower-difficulty-cap, Property 4: Las Plataformas_Respiro solo ocurren en la Fase_Estable, exactamente cada 5 pisos construidos desde su inicio
describe('isReliefPlatformFloor — elegibilidad determinística de Plataforma_Respiro', () => {
  it('Property 4: para cualquier stableFloorsBuiltBeforeThisFloor >= 0, isReliefPlatformFloor devuelve true si y solo si (stableFloorsBuiltBeforeThisFloor + 1) % RELIEF_PLATFORM_INTERVAL === 0', () => {
    const stableFloorsBuiltArb = fc.integer({ min: 0, max: 500 });

    fc.assert(
      fc.property(
        stableFloorsBuiltArb,
        (stableFloorsBuiltBeforeThisFloor) => {
          const expected = (stableFloorsBuiltBeforeThisFloor + 1) % RELIEF_PLATFORM_INTERVAL === 0;

          expect(isReliefPlatformFloor(stableFloorsBuiltBeforeThisFloor)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('casos concretos: 5º, 10º piso construido en la Fase_Estable son Plataforma_Respiro, otros no', () => {
    expect(isReliefPlatformFloor(4)).toBe(true); // 5º piso
    expect(isReliefPlatformFloor(9)).toBe(true); // 10º piso
    expect(isReliefPlatformFloor(3)).toBe(false);
    expect(isReliefPlatformFloor(0)).toBe(false);
  });
});

// Feature: endless-tower-difficulty-cap, Property 5: El ancho de una Plataforma_Respiro es exactamente el doble del ancho que tendría sin ese mecanismo, acotado a 630px
describe('newMovingBlock — ancho exacto de una Plataforma_Respiro', () => {
  it('Property 5: para cualquier ancho base, bono de racha y valor de Math.random estable, el ancho con Plataforma_Respiro es exactamente Math.min(BASE_PLATFORM_WIDTH, widthSinRelief * RELIEF_PLATFORM_WIDTH_MULTIPLIER)', () => {
    const afterFloorWidthArb = fc.integer({ min: MIN_WIDTH, max: BASE_PLATFORM_WIDTH });
    const streakWidthBonusArb = fc.nat({ max: 300 });
    const randomStubArb = fc.float({ min: 0, max: Math.fround(0.999), noNaN: true });

    fc.assert(
      fc.property(
        afterFloorWidthArb,
        streakWidthBonusArb,
        randomStubArb,
        (afterFloorWidth, streakWidthBonus, randomStub) => {
          const afterFloor = { x: 0, width: afterFloorWidth };
          const state = createTowerState(800, 600);
          state.doorsPassed = STABLE_PHASE_DUEL_THRESHOLD; // Fase_Estable activa
          state.streakWidthBonus = streakWidthBonus;

          const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(randomStub);
          try {
            // Piso NO elegible como Plataforma_Respiro (stableFloorsBuilt = 0 -> (0+1)%5 !== 0)
            state.stableFloorsBuilt = 0;
            const widthWithoutRelief = newMovingBlock(state, afterFloor, 2000).width;

            // Piso elegible como Plataforma_Respiro (stableFloorsBuilt = 4 -> (4+1)%5 === 0)
            state.stableFloorsBuilt = 4;
            const widthWithRelief = newMovingBlock(state, afterFloor, 2000).width;

            expect(widthWithRelief).toBe(
              Math.min(BASE_PLATFORM_WIDTH, widthWithoutRelief * RELIEF_PLATFORM_WIDTH_MULTIPLIER)
            );
          } finally {
            randomSpy.mockRestore();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Requirements: 2.2, 4.2 — pruebas unitarias concretas de newMovingBlock/dropBlock
// con Plataforma_Respiro y Bono_Racha_Perfecta combinados
describe('newMovingBlock — casos concretos de Plataforma_Respiro combinada con Bono_Racha_Perfecta', () => {
  let randomSpy;

  afterEach(() => {
    if (randomSpy) {
      randomSpy.mockRestore();
      randomSpy = undefined;
    }
  });

  it('piso NO elegible como Plataforma_Respiro y sin bono de racha produce el ancho normal sin cambios', () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const state = createTowerState(800, 600);
    state.doorsPassed = STABLE_PHASE_DUEL_THRESHOLD; // Fase_Estable activa
    state.stableFloorsBuilt = 0; // isReliefPlatformFloor(0) === false (no elegible)
    state.streakWidthBonus = 0; // sin bono de racha

    const afterFloor = { x: 0, width: 400 };
    const expectedWidth = Math.max(MIN_WIDTH, Math.min(400, 400 - 0 * 10)); // 400

    const block = newMovingBlock(state, afterFloor, 2000);

    expect(isReliefPlatformFloor(state.stableFloorsBuilt)).toBe(false);
    expect(block.width).toBe(expectedWidth);
    expect(block.width).toBe(400);
  });

  it('piso elegible como Plataforma_Respiro sin bono de racha duplica el ancho normal, acotado a 630px', () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const state = createTowerState(800, 600);
    state.doorsPassed = STABLE_PHASE_DUEL_THRESHOLD; // Fase_Estable activa
    state.stableFloorsBuilt = 4; // isReliefPlatformFloor(4) === true (5º piso de la Fase_Estable)
    state.streakWidthBonus = 0; // sin bono de racha

    const afterFloor = { x: 0, width: 400 };
    const expectedWidth = Math.min(BASE_PLATFORM_WIDTH, 400 * RELIEF_PLATFORM_WIDTH_MULTIPLIER); // min(630, 800) = 630

    const block = newMovingBlock(state, afterFloor, 2000);

    expect(isReliefPlatformFloor(state.stableFloorsBuilt)).toBe(true);
    expect(block.width).toBe(expectedWidth);
    expect(block.width).toBe(630);
  });

  it('piso elegible como Plataforma_Respiro CON streakWidthBonus > 0 vigente duplica el ancho YA incrementado por el bono, acotado a 630px', () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const state = createTowerState(800, 600);
    state.doorsPassed = STABLE_PHASE_DUEL_THRESHOLD; // Fase_Estable activa
    state.stableFloorsBuilt = 4; // isReliefPlatformFloor(4) === true
    state.streakWidthBonus = 50; // Bono_Racha_Perfecta vigente

    // afterFloor.width deliberadamente pequeño para que el resultado NO se sature
    // en 630px, demostrando mejor la composición bono + duplicado.
    const afterFloor = { x: 0, width: 200 };
    const canvasWidth = 2000;

    const widthWithBonus = Math.min(afterFloor.width + state.streakWidthBonus, canvasWidth); // 250
    const expectedWidth = Math.min(BASE_PLATFORM_WIDTH, widthWithBonus * RELIEF_PLATFORM_WIDTH_MULTIPLIER); // min(630, 500) = 500

    const block = newMovingBlock(state, afterFloor, canvasWidth);

    expect(isReliefPlatformFloor(state.stableFloorsBuilt)).toBe(true);
    expect(block.width).toBe(expectedWidth);
    expect(block.width).toBe(500);
  });
});

// Feature: endless-tower-difficulty-cap, Property 9: El Tope_Velocidad y los mecanismos de ancho (Plataforma_Respiro, Bono_Racha_Perfecta) son completamente independientes entre sí
describe('Tope_Velocidad vs mecanismos de ancho — independencia total', () => {
  // Ejecuta una secuencia de 'win'/'reliefCheck' registrando el ancho de cada
  // MovingBlock generado; el estado de velocidad ('moveSpeedInit') es el único
  // parámetro que varía entre las dos simulaciones paralelas de la primera mitad
  // de esta propiedad.
  function runSequenceForWidth(ops, moveSpeedInit, afterFloorWidth, canvasWidth) {
    const state = createTowerState(800, 600);
    state.moveSpeed = moveSpeedInit;
    state.doorsPassed = 0;
    state.streakWidthBonus = 0;
    state.stableFloorsBuilt = 0;
    const afterFloor = { x: 0, width: afterFloorWidth };
    const widths = [];

    for (const op of ops) {
      if (op === 'win') {
        // Requirement 4.3: Duelo Ganado real — aplica el tope de velocidad,
        // registra la racha perfecta (valor fijo) y avanza doorsPassed.
        applyDuelWinSpeedBoost(state);
        registerDuelWinForStreak(state, true);
        state.doorsPassed += 1;
      } else {
        // 'reliefCheck': construye el siguiente MovingBlock (equivalente al
        // paso de dropBlock que genera el bloque para el próximo piso) y
        // avanza stableFloorsBuilt como lo haría dropBlock tras colocar el piso.
        const block = newMovingBlock(state, afterFloor, canvasWidth);
        widths.push(block.width);
        if (state.doorsPassed >= STABLE_PHASE_DUEL_THRESHOLD) {
          state.stableFloorsBuilt += 1;
        }
      }
    }

    return widths;
  }

  // Ejecuta la misma secuencia registrando state.moveSpeed tras cada 'win'; el
  // estado de ancho ('streakWidthBonusInit'/'stableFloorsBuiltInit') es el único
  // parámetro que varía entre las dos simulaciones paralelas de la segunda mitad
  // de esta propiedad.
  function runSequenceForSpeed(ops, streakWidthBonusInit, stableFloorsBuiltInit, afterFloorWidth, canvasWidth) {
    const state = createTowerState(800, 600);
    state.moveSpeed = BASE_SPEED;
    state.doorsPassed = 0;
    state.streakWidthBonus = streakWidthBonusInit;
    state.stableFloorsBuilt = stableFloorsBuiltInit;
    const afterFloor = { x: 0, width: afterFloorWidth };
    const speeds = [];

    for (const op of ops) {
      if (op === 'win') {
        applyDuelWinSpeedBoost(state);
        speeds.push(state.moveSpeed);
        registerDuelWinForStreak(state, true);
        state.doorsPassed += 1;
      } else {
        newMovingBlock(state, afterFloor, canvasWidth);
        if (state.doorsPassed >= STABLE_PHASE_DUEL_THRESHOLD) {
          state.stableFloorsBuilt += 1;
        }
      }
    }

    return speeds;
  }

  it('Property 9: el ancho de cada MovingBlock generado no depende de moveSpeed, y moveSpeed tras cada Duelo Ganado no depende de streakWidthBonus/stableFloorsBuilt/ancho de piso', () => {
    const opsArb = fc.array(fc.constantFrom('win', 'reliefCheck'), { minLength: 1, maxLength: 20 });
    const otherMoveSpeedArb = fc.float({ min: Math.fround(0.1), max: Math.fround(50), noNaN: true });
    const randomStubArb = fc.float({ min: 0, max: Math.fround(0.999), noNaN: true });
    const afterFloorWidthArb = fc.integer({ min: MIN_WIDTH, max: BASE_PLATFORM_WIDTH });
    const canvasWidthArb = fc.integer({ min: 300, max: 2000 });
    const otherStreakWidthBonusArb = fc.nat({ max: 500 });
    const otherStableFloorsBuiltArb = fc.nat({ max: 200 });

    fc.assert(
      fc.property(
        opsArb,
        otherMoveSpeedArb,
        randomStubArb,
        afterFloorWidthArb,
        canvasWidthArb,
        otherStreakWidthBonusArb,
        otherStableFloorsBuiltArb,
        (ops, otherMoveSpeed, randomStub, afterFloorWidth, canvasWidth, otherStreakWidthBonus, otherStableFloorsBuilt) => {
          // --- Mitad 1: el ancho no depende de moveSpeed ---
          // Se fija Math.random al mismo valor en ambas simulaciones para que
          // cualquier diferencia entre los arrays de anchos solo pueda originarse
          // en el moveSpeed inicial distinto (que es lo que se quiere refutar).
          const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(randomStub);
          let widthsA;
          let widthsB;
          try {
            widthsA = runSequenceForWidth(ops, BASE_SPEED, afterFloorWidth, canvasWidth);
            widthsB = runSequenceForWidth(ops, otherMoveSpeed, afterFloorWidth, canvasWidth);
          } finally {
            randomSpy.mockRestore();
          }

          expect(widthsB).toEqual(widthsA);

          // --- Mitad 2: moveSpeed no depende de streakWidthBonus/stableFloorsBuilt/ancho de piso ---
          // Aquí no es necesario estabilizar Math.random: applySpeedBoostWithCap
          // y registerDuelWinForStreak son puramente deterministas respecto de
          // moveSpeed/doorsPassed, y newMovingBlock nunca escribe en moveSpeed.
          const speedsA = runSequenceForSpeed(ops, 0, 0, afterFloorWidth, canvasWidth);
          const speedsB = runSequenceForSpeed(ops, otherStreakWidthBonus, otherStableFloorsBuilt, afterFloorWidth, canvasWidth);

          expect(speedsB).toEqual(speedsA);
        }
      ),
      { numRuns: 100 }
    );
  });
});
