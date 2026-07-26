/* ===== Tests del motor de la torre (src/engine/tower.js) ===== */
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import {
  createTowerState,
  resetGame,
  update,
  dropBlock,
  applyDuelWinSpeedBoost,
  triggerFall,
  newMovingBlock,
  topFloor,
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
