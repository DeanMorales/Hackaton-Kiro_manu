/* ===== Tests del módulo de render (src/render/draw.js) ===== */
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { drawSky, drawGround, elevToScreen, render } from './draw.js';
import { BIOME_CATALOG, TIME_OF_DAY_CATALOG } from '../data/environmentRoster.js';
import { createTowerState } from '../engine/tower.js';
import { startBossFight } from '../combat/fight.js';

/**
 * Crea un mock de CanvasRenderingContext2D con spies (vi.fn()) para los
 * métodos usados por drawSky/drawSunMoonCue/drawCloud/drawTower/drawFacetedBlock/
 * drawTorch/drawKnight, siguiendo el patrón de mocking descrito en la tarea 5.3.
 * Se extiende (tarea 7.2) con los métodos adicionales que necesita render()
 * al ejercitar las ramas de drawTower/drawKnight (save/translate/rotate/stroke/
 * strokeRect/quadraticCurveTo/font/textAlign/fillText).
 */
function createMockCtx() {
  const gradient = { addColorStop: vi.fn() };
  return {
    fillStyle: null,
    strokeStyle: null,
    lineWidth: 1,
    font: null,
    textAlign: null,
    globalAlpha: 1,
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  };
}

const W = 800;
const H = 600;
const CLOUDS = [
  { x: 0.1, y: 40, r: 30, speed: 1, seed: 1 },
  { x: 0.5, y: 60, r: 24, speed: 0.6, seed: 2 },
  { x: 0.9, y: 20, r: 36, speed: 1.4, seed: 3 },
];

describe('drawSky — no lanza para ninguna combinación de Biome × Time_Of_Day', () => {
  BIOME_CATALOG.forEach((biome) => {
    TIME_OF_DAY_CATALOG.forEach((timeOfDay) => {
      it(`no lanza para biome="${biome.id}" y timeOfDay="${timeOfDay.id}"`, () => {
        const ctx = createMockCtx();
        expect(() => drawSky(ctx, W, H, CLOUDS, biome, timeOfDay)).not.toThrow();
      });
    });
  });
});

describe('drawSky — bucle de estrellas condicionado a starVisibility', () => {
  it('dibuja estrellas (fillRect adicionales) cuando activeTimeOfDay es Noche', () => {
    const ctx = createMockCtx();
    const noche = TIME_OF_DAY_CATALOG.find((t) => t.id === 'noche');
    const biome = BIOME_CATALOG[0];

    drawSky(ctx, W, H, CLOUDS, biome, noche);

    // El fondo del cielo ya invoca fillRect una vez; con starVisibility=true
    // el bucle de estrellas invoca fillRect ~40 veces más.
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(1);
  });

  it.each(['manana', 'dia', 'tarde'])(
    'no dibuja estrellas cuando activeTimeOfDay es "%s"',
    (timeOfDayId) => {
      const ctx = createMockCtx();
      const timeOfDay = TIME_OF_DAY_CATALOG.find((t) => t.id === timeOfDayId);
      const biome = BIOME_CATALOG[0];

      drawSky(ctx, W, H, CLOUDS, biome, timeOfDay);

      // Sin estrellas, fillRect solo se invoca una vez (el fondo del cielo).
      expect(ctx.fillRect.mock.calls.length).toBe(1);
    }
  );
});

// Feature: tower-ground-biome-background, Property 5: El Ground_Visual siempre cubre todo el ancho hasta el borde inferior del canvas
describe('drawGround — cobertura del Ground_Visual', () => {
  it('Property 5: para cualquier W>0, H>0, camElev y baseFloor visible, el rectángulo de relleno tiene x=0, width=W y su borde inferior coincide con H', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2000 }),
        fc.integer({ min: 1, max: 2000 }),
        fc.integer({ min: -500, max: 500 }),
        // `delta` garantiza, por construcción, que elevToScreen(camElev, bottom, H) < H:
        // bottom se deriva de camElev/H de forma que el borde inferior en pantalla de
        // baseFloor quede siempre por encima del borde inferior del canvas.
        fc.integer({ min: 1, max: 5000 }),
        fc.constantFrom(...BIOME_CATALOG),
        (W, H, camElev, delta, activeBiome) => {
          const bottom = camElev - H * 0.38 + delta;
          const baseFloor = { top: bottom - 40, bottom };

          // Precondición del enunciado de la propiedad: el borde inferior en pantalla
          // de baseFloor está por encima (< H) del borde inferior del canvas.
          const groundY = elevToScreen(camElev, baseFloor.bottom, H);
          expect(groundY).toBeLessThan(H);

          const ctx = createMockCtx();
          drawGround(ctx, W, H, camElev, baseFloor, activeBiome);

          // drawGround dibuja la banda de suelo con el PRIMER fillRect (antes de las
          // señales de vegetación, que pueden invocar fillRect adicionalmente — p.ej.
          // el tronco de los conifers — pero siempre después de la banda principal).
          expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(0);
          const [x, y, width, height] = ctx.fillRect.mock.calls[0];

          expect(x).toBe(0);
          expect(width).toBe(W);
          // Sin hueco entre el final de la banda y el borde inferior del canvas.
          expect(y + height).toBeCloseTo(H, 6);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('drawGround — pruebas unitarias', () => {
  it('es un no-op (no lanza, no invoca fillRect) cuando baseFloor es undefined', () => {
    const ctx = createMockCtx();
    const activeBiome = BIOME_CATALOG[0];

    expect(() => drawGround(ctx, W, H, 0, undefined, activeBiome)).not.toThrow();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('es un no-op (no lanza, no invoca fillRect) cuando baseFloor es null', () => {
    const ctx = createMockCtx();
    const activeBiome = BIOME_CATALOG[0];

    expect(() => drawGround(ctx, W, H, 0, null, activeBiome)).not.toThrow();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('es un no-op cuando el bandTop calculado es >= H (baseFloor fuera de vista, scrolleado)', () => {
    const camElev = 0;
    // bottom elegido para que elevToScreen(camElev, bottom, H) quede muy por debajo de H.
    const baseFloor = { top: -540, bottom: -500 };
    const activeBiome = BIOME_CATALOG[0];

    // Confirma la precondición: bandTop (acotado a H) es >= H.
    const groundY = elevToScreen(camElev, baseFloor.bottom, H);
    const bandTop = Math.min(groundY, H);
    expect(bandTop).toBeGreaterThanOrEqual(H);

    const ctx = createMockCtx();
    expect(() => drawGround(ctx, W, H, camElev, baseFloor, activeBiome)).not.toThrow();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  BIOME_CATALOG.forEach((biome) => {
    it(`no lanza para el bioma "${biome.id}" con un baseFloor visible`, () => {
      const camElev = 0;
      // bottom elegido para que elevToScreen(camElev, bottom, H) quede por encima de H (visible).
      const baseFloor = { top: -60, bottom: -20 };
      const ctx = createMockCtx();

      expect(() => drawGround(ctx, W, H, camElev, baseFloor, biome)).not.toThrow();
    });
  });
});

// Feature: tower-ground-biome-background — integración de drawGround/drawTower en render()
describe('render() — integración de drawSky/drawGround/drawTower', () => {
  it.each(['build', 'boss', 'falling'])(
    'no lanza cuando gameState.screen es "%s" (combatUiState=null)',
    (screen) => {
      const ctx = createMockCtx();
      const gameState = createTowerState(W, H);
      gameState.screen = screen;

      expect(() => render(ctx, W, H, gameState, null)).not.toThrow();
    }
  );

  it('invoca el fillRect de la banda de suelo (drawGround) antes del primer fillRect de un bloque de la torre (drawTower/drawFacetedBlock)', () => {
    const ctx = createMockCtx();
    const gameState = createTowerState(W, H);
    gameState.screen = 'build';
    const baseFloor = gameState.floors[0];

    render(ctx, W, H, gameState, null);

    const calls = ctx.fillRect.mock.calls;
    expect(calls.length).toBeGreaterThan(1);

    // La banda de suelo (drawGround) es un rectángulo de ancho completo (W) que
    // empieza en x=0; el bloque base de la torre (drawFacetedBlock, vía drawTower)
    // usa el x/width propios de baseFloor, que son más angostos que W y no
    // arrancan en x=0 (baseFloor.x = (W - width)/2 > 0 para una torre recién creada).
    const groundIdx = calls.findIndex(([x, , width]) => x === 0 && width === W);
    const towerBlockIdx = calls.findIndex(
      ([x, , width]) => x === baseFloor.x && width === baseFloor.width
    );

    expect(groundIdx).toBeGreaterThanOrEqual(0);
    expect(towerBlockIdx).toBeGreaterThanOrEqual(0);
    expect(groundIdx).toBeLessThan(towerBlockIdx);
  });
});

// Feature: tower-ground-biome-background, Property 7: El combate, la puntuación y la física de pisos no son alterados por esta feature
describe('drawSky/drawGround/render — no interferencia con combate/física de pisos', () => {
  it('Property 7: invocar cualquier combinación de drawSky/drawGround/render no altera fight ni el estado de la torre', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 300, max: 1200 }),
        fc.integer({ min: 300, max: 1200 }),
        fc.constantFrom('drawSky', 'drawGround', 'render'),
        fc.constantFrom('drawSky', 'drawGround', 'render'),
        fc.constantFrom('drawSky', 'drawGround', 'render'),
        (level, width, height, callA, callB, callC) => {
          const fight = startBossFight(level);
          const state = createTowerState(width, height);

          const fightBefore = structuredClone({
            cardCount: fight.cardCount,
            playerPips: fight.playerPips,
            bossPips: fight.bossPips,
            resolved: fight.resolved,
            cards: fight.cards,
          });
          const stateBefore = structuredClone({
            floors: state.floors,
            doorsPassed: state.doorsPassed,
            moveSpeed: state.moveSpeed,
            knight: state.knight,
          });

          const ctx = createMockCtx();
          const invoke = (name) => {
            if (name === 'drawSky') {
              drawSky(ctx, width, height, state.clouds, state.activeBiome, state.activeTimeOfDay);
            } else if (name === 'drawGround') {
              drawGround(ctx, width, height, state.camElev, state.floors[0], state.activeBiome);
            } else if (name === 'render') {
              render(ctx, width, height, state, null);
            }
          };
          invoke(callA);
          invoke(callB);
          invoke(callC);

          expect(fight.cardCount).toEqual(fightBefore.cardCount);
          expect(fight.playerPips).toEqual(fightBefore.playerPips);
          expect(fight.bossPips).toEqual(fightBefore.bossPips);
          expect(fight.resolved).toEqual(fightBefore.resolved);
          expect(fight.cards).toEqual(fightBefore.cards);

          expect(state.floors).toEqual(stateBefore.floors);
          expect(state.doorsPassed).toEqual(stateBefore.doorsPassed);
          expect(state.moveSpeed).toEqual(stateBefore.moveSpeed);
          expect(state.knight).toEqual(stateBefore.knight);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: landscape-orientation-support — elevToScreen y el parámetro ratio
import { computeVerticalAnchorRatio } from './anchorRatio.js';

describe('elevToScreen — Property 7 y 8 (parámetro ratio)', () => {
  it('Property 7: elevToScreen preserva las distancias relativas de elevación, para cualquier ratio', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -5000, max: 5000 }),
        fc.integer({ min: -5000, max: 5000 }),
        fc.integer({ min: -5000, max: 5000 }),
        fc.integer({ min: 1, max: 5000 }),
        fc.constantFrom(0.62, 0.75),
        (camElev, elev1, elev2, H, ratio) => {
          const y1 = elevToScreen(camElev, elev1, H, ratio);
          const y2 = elevToScreen(camElev, elev2, H, ratio);
          expect(y1 - y2).toBeCloseTo(elev2 - elev1, 9);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: El cambio de ratio nunca altera los tamaños fijos en píxeles dibujados', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -5000, max: 5000 }),
        fc.integer({ min: -5000, max: 5000 }),
        fc.integer({ min: 1, max: 5000 }),
        (camElev, elev, H) => {
          const ratioA = 0.62;
          const ratioB = 0.75;
          const yA = elevToScreen(camElev, elev, H, ratioA);
          const yB = elevToScreen(camElev, elev, H, ratioB);

          // Solo el origen (anchor) se desplaza según el ratio; ningún tamaño
          // fijo en píxeles (como los offsets hardcodeados de drawKnight,
          // p.ej. -13,-26) depende de H*ratio, así que la diferencia entre
          // ambos orígenes debe ser exactamente H*(ratioB - ratioA).
          expect(yB - yA).toBeCloseTo(H * (ratioB - ratioA), 9);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('elevToScreen — unit tests de no-regresión y ejemplos concretos (tareas 2.3, 2.4, 2.5)', () => {
  it('con 3 argumentos (sin ratio), usa el default 0.62: elevToScreen(camElev, elev, H) === H*0.62 - (elev-camElev)', () => {
    const camElev = 40;
    const elev = 15;
    const H = 600;

    expect(elevToScreen(camElev, elev, H)).toBeCloseTo(H * 0.62 - (elev - camElev), 9);
  });

  it('landscape móvil (W=667, H=375): computeVerticalAnchorRatio === 0.75 y elevToScreen lo usa correctamente', () => {
    const W = 667;
    const H = 375;
    const camElev = 20;
    const elev = 5;

    const ratio = computeVerticalAnchorRatio(W, H);
    expect(ratio).toBe(0.75);
    expect(elevToScreen(camElev, elev, H, ratio)).toBeCloseTo(H * 0.75 - (elev - camElev), 9);
  });

  it('desktop/portrait (W=800, H=600): computeVerticalAnchorRatio === 0.62 y coincide con el default de 3 argumentos', () => {
    const W = 800;
    const H = 600;
    const camElev = 20;
    const elev = 5;

    const ratio = computeVerticalAnchorRatio(W, H);
    expect(ratio).toBe(0.62);
    expect(elevToScreen(camElev, elev, H, ratio)).toBeCloseTo(elevToScreen(camElev, elev, H), 9);
  });
});
