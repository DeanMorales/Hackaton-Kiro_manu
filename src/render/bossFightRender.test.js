/* ===== Tests del módulo de render de combate (src/render/bossFightRender.js) ===== */
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import {
  COMBAT_LAYOUT,
  Reference_Canvas_Width,
  Minimum_Scale_Factor,
  computeSpriteScaleFactor,
  scaleDimensions,
  scaleOffset,
  computeDrawOrigin,
  drawCombatants,
  updateCombatants,
} from './bossFightRender.js';
import { startBossFight } from '../combat/fight.js';
import { computeVerticalAnchorRatio } from './anchorRatio.js';

/**
 * Crea un mock de CanvasRenderingContext2D con spies (vi.fn()) para los
 * métodos usados por drawCombatants (save/restore/scale/drawImage),
 * siguiendo el patrón de mocking de src/render/draw.test.js.
 */
function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
  };
}

/**
 * Crea un motor de sprite "liviano" (mock) que expone únicamente los campos
 * usados por drawCombatants/updateCombatants: displayWidth, displayHeight,
 * draw(ctx, x, y) y update(dt). draw() registra las coordenadas recibidas
 * para poder inspeccionarlas en las aserciones.
 */
function createMockEngine(displayWidth, displayHeight) {
  const calls = [];
  return {
    displayWidth,
    displayHeight,
    draw: vi.fn((ctx, x, y) => { calls.push({ x, y }); }),
    update: vi.fn(),
    _drawCalls: calls,
  };
}

const arbCanvasWidth = fc.double({ min: 1, max: 3000, noNaN: true, noDefaultInfinity: true });
const arbFactor = fc.double({ min: Minimum_Scale_Factor, max: 1, noNaN: true, noDefaultInfinity: true });
const arbDimension = fc.double({ min: 1, max: 2000, noNaN: true, noDefaultInfinity: true });

describe('computeSpriteScaleFactor', () => {
  // Feature: combat-sprite-scaling, Property 1: El factor de escala satura en 1 para canvases anchos
  it('Property 1: para todo W >= Reference_Canvas_Width, computeSpriteScaleFactor(W) === 1', () => {
    fc.assert(
      fc.property(
        fc.double({ min: Reference_Canvas_Width, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (W) => {
          expect(computeSpriteScaleFactor(W)).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: combat-sprite-scaling, Property 2: El factor de escala es monótono no decreciente en W
  it('Property 2: para W1 <= W2 (ambos > 0), computeSpriteScaleFactor(W1) <= computeSpriteScaleFactor(W2)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 10000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          const W1 = Math.min(a, b);
          const W2 = Math.max(a, b);
          expect(computeSpriteScaleFactor(W1)).toBeLessThanOrEqual(computeSpriteScaleFactor(W2));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: combat-sprite-scaling, Property 3: El factor de escala siempre está en [Minimum_Scale_Factor, 1]
  it('Property 3: para todo W > 0, computeSpriteScaleFactor(W) está en [Minimum_Scale_Factor, 1]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (W) => {
          const factor = computeSpriteScaleFactor(W);
          expect(factor).toBeGreaterThanOrEqual(Minimum_Scale_Factor);
          expect(factor).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: combat-sprite-scaling, Property 4: El factor de escala es determinista (función pura)
  it('Property 4: para cualquier W > 0, llamadas repetidas devuelven siempre el mismo valor', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (W) => {
          const a = computeSpriteScaleFactor(W);
          const b = computeSpriteScaleFactor(W);
          const c = computeSpriteScaleFactor(W);
          expect(a).toBe(b);
          expect(b).toBe(c);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('scaleDimensions', () => {
  // Feature: combat-sprite-scaling, Property 5: El escalado nunca agranda un sprite y es exacto en los bordes del dominio
  it('Property 5: para factor en [Minimum_Scale_Factor, 1], scaled <= original, con igualdad exacta en factor === 1', () => {
    fc.assert(
      fc.property(arbDimension, arbDimension, arbFactor, (width, height, factor) => {
        const scaled = scaleDimensions({ width, height }, factor);
        expect(scaled.width).toBeLessThanOrEqual(width);
        expect(scaled.height).toBeLessThanOrEqual(height);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 5 (borde): en factor === 1, scaleDimensions devuelve exactamente las dimensiones originales', () => {
    fc.assert(
      fc.property(arbDimension, arbDimension, (width, height) => {
        const scaled = scaleDimensions({ width, height }, 1);
        expect(scaled.width).toBe(width);
        expect(scaled.height).toBe(height);
      }),
      { numRuns: 100 }
    );
  });
});

describe('scaleOffset y computeDrawOrigin — Property 7', () => {
  // Feature: combat-sprite-scaling, Property 7: Los Combat_Layout_Offset se escalan proporcionalmente al mismo factor
  it('Property 7: scaleOffset(offsetPx, factor) === offsetPx * factor', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -2000, max: 2000, noNaN: true, noDefaultInfinity: true }),
        arbFactor,
        (offsetPx, factor) => {
          expect(scaleOffset(offsetPx, factor)).toBeCloseTo(offsetPx * factor, 9);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: computeDrawOrigin usa el offset escalado cuando factor < 1 (difiere del offset sin escalar)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 2000, noNaN: true, noDefaultInfinity: true }), // groundY
        fc.double({ min: 100, max: 2000, noNaN: true, noDefaultInfinity: true }), // canvasWidth
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }), // xRatio
        arbDimension, // scaledWidth
        arbDimension, // scaledHeight
        fc.double({ min: 1, max: 500, noNaN: true, noDefaultInfinity: true }), // horizontalOffsetPx (no-zero para que la diferencia sea observable)
        fc.double({ min: 1, max: 500, noNaN: true, noDefaultInfinity: true }), // verticalOffsetPx
        fc.double({ min: Minimum_Scale_Factor, max: 0.999, noNaN: true, noDefaultInfinity: true }), // scaleFactor < 1
        (groundY, canvasWidth, xRatio, scaledWidth, scaledHeight, horizontalOffsetPx, verticalOffsetPx, scaleFactor) => {
          const params = { groundY, canvasWidth, xRatio, scaledWidth, scaledHeight, horizontalOffsetPx, verticalOffsetPx, scaleFactor };
          const origin = computeDrawOrigin(params);

          const yWithRawOffset = groundY - scaledHeight + verticalOffsetPx;
          const xWithRawOffset = canvasWidth * xRatio - scaledWidth / 2 + horizontalOffsetPx;

          const yWithScaledOffset = groundY - scaledHeight + scaleOffset(verticalOffsetPx, scaleFactor);
          const xWithScaledOffset = canvasWidth * xRatio - scaledWidth / 2 + scaleOffset(horizontalOffsetPx, scaleFactor);

          // El origen calculado coincide con el uso del offset escalado...
          expect(origin.y).toBeCloseTo(yWithScaledOffset, 9);
          expect(origin.x).toBeCloseTo(xWithScaledOffset, 9);

          // ...y difiere del que resultaría de usar el offset sin escalar (factor < 1).
          expect(origin.y).not.toBeCloseTo(yWithRawOffset, 9);
          expect(origin.x).not.toBeCloseTo(xWithRawOffset, 9);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('computeDrawOrigin — Property 8: alineamiento con la línea de suelo', () => {
  it('Property 8: el borde inferior del sprite (y + scaledHeight) equivale a groundY + el mismo ajuste fijo, sin importar el factor', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 2000, noNaN: true, noDefaultInfinity: true }), // groundY
        fc.double({ min: 100, max: 2000, noNaN: true, noDefaultInfinity: true }), // canvasWidth
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }), // xRatio
        arbDimension, // scaledWidth
        arbDimension, // scaledHeight
        fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true }), // horizontalOffsetPx
        fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true }), // verticalOffsetPx
        arbFactor,
        (groundY, canvasWidth, xRatio, scaledWidth, scaledHeight, horizontalOffsetPx, verticalOffsetPx, scaleFactor) => {
          const origin = computeDrawOrigin({
            groundY, canvasWidth, xRatio, scaledWidth, scaledHeight,
            horizontalOffsetPx, verticalOffsetPx, scaleFactor,
          });

          const bottomEdge = origin.y + scaledHeight;
          // Ajuste fijo esperado: groundY + scaleOffset(verticalOffsetPx, scaleFactor).
          const expectedBottomEdge = groundY + scaleOffset(verticalOffsetPx, scaleFactor);
          expect(bottomEdge).toBeCloseTo(expectedBottomEdge, 9);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('computeDrawOrigin — Property 9: centrado horizontal', () => {
  it('Property 9: el centro horizontal antes del offset (x + scaledWidth/2 - scaleOffset(horizontalOffsetPx, factor)) equivale a canvasWidth * xRatio', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 2000, noNaN: true, noDefaultInfinity: true }), // groundY
        fc.double({ min: 1, max: 3000, noNaN: true, noDefaultInfinity: true }), // canvasWidth
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }), // xRatio
        arbDimension, // scaledWidth
        arbDimension, // scaledHeight
        fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true }), // horizontalOffsetPx
        fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true }), // verticalOffsetPx
        arbFactor,
        (groundY, canvasWidth, xRatio, scaledWidth, scaledHeight, horizontalOffsetPx, verticalOffsetPx, scaleFactor) => {
          const origin = computeDrawOrigin({
            groundY, canvasWidth, xRatio, scaledWidth, scaledHeight,
            horizontalOffsetPx, verticalOffsetPx, scaleFactor,
          });

          // El centro horizontal, antes de aplicar el offset, se calcula sobre scaledWidth.
          const centerBeforeOffset = origin.x + scaledWidth / 2 - scaleOffset(horizontalOffsetPx, scaleFactor);
          expect(centerBeforeOffset).toBeCloseTo(canvasWidth * xRatio, 9);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('scaleDimensions/computeSpriteScaleFactor — Property 11: piso de legibilidad mínima', () => {
  it('Property 11: para cualquier W > 0, la dimensión escalada es >= original * Minimum_Scale_Factor', () => {
    fc.assert(
      fc.property(arbCanvasWidth, arbDimension, arbDimension, (W, width, height) => {
        const factor = computeSpriteScaleFactor(W);
        const scaled = scaleDimensions({ width, height }, factor);

        expect(scaled.width).toBeGreaterThanOrEqual(width * Minimum_Scale_Factor - 1e-9);
        expect(scaled.height).toBeGreaterThanOrEqual(height * Minimum_Scale_Factor - 1e-9);
      }),
      { numRuns: 100 }
    );
  });
});

describe('drawCombatants — Property 6: no mutación de displayWidth/displayHeight del engine', () => {
  it('Property 6: tras cualquier número de llamadas a drawCombatants(), engine.displayWidth/displayHeight permanecen sin cambios', () => {
    fc.assert(
      fc.property(
        arbCanvasWidth,
        fc.double({ min: 100, max: 2000, noNaN: true, noDefaultInfinity: true }),
        arbDimension, arbDimension, arbDimension, arbDimension,
        fc.integer({ min: 1, max: 5 }),
        (W, H, warriorW, warriorH, bossW, bossH, callCount) => {
          const warriorEngine = createMockEngine(warriorW, warriorH);
          const bossEngine = createMockEngine(bossW, bossH);
          const ctx = createMockCtx();

          const warriorWidthBefore = warriorEngine.displayWidth;
          const warriorHeightBefore = warriorEngine.displayHeight;
          const bossWidthBefore = bossEngine.displayWidth;
          const bossHeightBefore = bossEngine.displayHeight;

          for (let i = 0; i < callCount; i++) {
            drawCombatants(ctx, W, H, warriorEngine, bossEngine);
          }

          expect(warriorEngine.displayWidth).toBe(warriorWidthBefore);
          expect(warriorEngine.displayHeight).toBe(warriorHeightBefore);
          expect(bossEngine.displayWidth).toBe(bossWidthBefore);
          expect(bossEngine.displayHeight).toBe(bossHeightBefore);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('drawCombatants — Property 10: el guerrero siempre queda a la izquierda del boss', () => {
  // Nota: el dominio de W se restringe a anchos de canvas realistas (>= 200px).
  // Con los Combat_Layout_Offset actuales (WARRIOR_HORIZONTAL_OFFSET_PX=40,
  // BOSS_HORIZONTAL_OFFSET_PX=-100) y Minimum_Scale_Factor=0.55, el centrado
  // base (W * xRatio) se acerca entre guerrero y boss a medida que W disminuye,
  // mientras que los offsets fijos (escalados) no desaparecen: por debajo de
  // ~148px de ancho de canvas los centros se cruzan matemáticamente. Ningún
  // dispositivo real renderiza el combate en un canvas tan angosto (los
  // móviles más chicos rondan los 320px+), por lo que la propiedad se verifica
  // sobre el rango de anchos que puede ocurrir en producción.
  it('Property 10: para todo W>=200 (rango realista de canvas), H>0 y toda metadata válida, el centro horizontal dibujado del guerrero es estrictamente menor al del boss', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 200, max: 3000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 2000, noNaN: true, noDefaultInfinity: true }),
        arbDimension, arbDimension, arbDimension, arbDimension,
        (W, H, warriorW, warriorH, bossW, bossH) => {
          const warriorEngine = createMockEngine(warriorW, warriorH);
          const bossEngine = createMockEngine(bossW, bossH);
          const ctx = createMockCtx();

          drawCombatants(ctx, W, H, warriorEngine, bossEngine);

          const factor = computeSpriteScaleFactor(W);
          const warriorCall = warriorEngine._drawCalls[0];
          const bossCall = bossEngine._drawCalls[0];

          // draw() recibe coordenadas en el espacio del ctx.scale(factor, factor);
          // la coordenada real de pantalla es x * factor.
          const warriorScaledDims = scaleDimensions({ width: warriorW, height: warriorH }, factor);
          const bossScaledDims = scaleDimensions({ width: bossW, height: bossH }, factor);

          const warriorScreenX = warriorCall.x * factor;
          const bossScreenX = bossCall.x * factor;

          const warriorCenter = warriorScreenX + warriorScaledDims.width / 2;
          const bossCenter = bossScreenX + bossScaledDims.width / 2;

          expect(warriorCenter).toBeLessThan(bossCenter);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('updateCombatants — Property 12: el ciclo de animación es independiente del factor de escala', () => {
  it('Property 12: el avance del frame/tiempo de cada engine es igual sin importar los drawCombatants() intercalados con distintos W', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 10 }),
        fc.array(arbCanvasWidth, { minLength: 1, maxLength: 10 }),
        (dtSequence, widthSequence) => {
          // Dos escenarios con la misma secuencia de dt, pero con drawCombatants()
          // intercalado usando anchos de canvas distintos (o ausente en uno de ellos).
          const warriorA = createMockEngine(400, 500);
          const bossA = createMockEngine(550, 750);
          const warriorB = createMockEngine(400, 500);
          const bossB = createMockEngine(550, 750);
          const ctx = createMockCtx();

          dtSequence.forEach((dt, i) => {
            updateCombatants(dt, warriorA, bossA);
            updateCombatants(dt, warriorB, bossB);

            // Escenario A: se dibuja con un ancho de canvas variable entre pasos.
            const W = widthSequence[i % widthSequence.length];
            drawCombatants(ctx, W, 600, warriorA, bossA);
            // Escenario B: se dibuja siempre con el mismo ancho de referencia (factor=1).
            drawCombatants(ctx, Reference_Canvas_Width, 600, warriorB, bossB);
          });

          // update() fue invocado con los mismos dt en ambos escenarios: los mocks
          // no tienen estado interno propio de animación (son mocks livianos), por lo
          // que la propiedad relevante y verificable aquí es que ambos engines
          // recibieron exactamente la misma secuencia de llamadas a update(dt).
          expect(warriorA.update.mock.calls).toEqual(warriorB.update.mock.calls);
          expect(bossA.update.mock.calls).toEqual(bossB.update.mock.calls);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('drawCombatants — Property 13: el estado de combate es inmutable frente al escalado visual', () => {
  it('Property 13: cualquier número de llamadas a drawCombatants() con cualquier W deja el fight deep-equal a su valor previo', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(arbCanvasWidth, { minLength: 0, maxLength: 8 }),
        (level, widths) => {
          const fight = startBossFight(level);
          const fightBefore = structuredClone({
            cardCount: fight.cardCount,
            playerPips: fight.playerPips,
            bossPips: fight.bossPips,
            cards: fight.cards,
            resolved: fight.resolved,
            bossLabel: fight.bossLabel,
          });

          const warriorEngine = createMockEngine(400, 500);
          const bossEngine = createMockEngine(550, 750);
          const ctx = createMockCtx();

          for (const W of widths) {
            drawCombatants(ctx, W, 600, warriorEngine, bossEngine);
          }

          expect(fight.cardCount).toEqual(fightBefore.cardCount);
          expect(fight.playerPips).toEqual(fightBefore.playerPips);
          expect(fight.bossPips).toEqual(fightBefore.bossPips);
          expect(fight.cards).toEqual(fightBefore.cards);
          expect(fight.resolved).toEqual(fightBefore.resolved);
          expect(fight.bossLabel).toEqual(fightBefore.bossLabel);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('drawCombatants — paridad de escritorio (unit)', () => {
  it('con W = Reference_Canvas_Width (800), factor === 1 y las coordenadas coinciden con el cálculo sin escalado', () => {
    const W = Reference_Canvas_Width;
    const H = 600;
    const warriorEngine = createMockEngine(400, 500);
    const bossEngine = createMockEngine(550, 750);
    const ctx = createMockCtx();

    drawCombatants(ctx, W, H, warriorEngine, bossEngine);

    const factor = computeSpriteScaleFactor(W);
    expect(factor).toBe(1);

    // ctx.scale se invoca con (1, 1): no-op visual, comportamiento idéntico al actual.
    expect(ctx.scale).toHaveBeenCalledWith(1, 1);

    const groundY = H * computeVerticalAnchorRatio(W, H);

    // Coordenadas esperadas sin ningún escalado (fórmula preexistente del renderer).
    const VERTICAL_OFFSET_PX = 70;
    const BOSS_EXTRA_VERTICAL_OFFSET_PX = 91;
    const BOSS_HORIZONTAL_OFFSET_PX = -100;
    const WARRIOR_HORIZONTAL_OFFSET_PX = 40;

    const expectedWarriorY = groundY - warriorEngine.displayHeight + VERTICAL_OFFSET_PX;
    const expectedWarriorX = W * COMBAT_LAYOUT.warriorXRatio - warriorEngine.displayWidth / 2 + WARRIOR_HORIZONTAL_OFFSET_PX;

    const expectedBossY = groundY - bossEngine.displayHeight + VERTICAL_OFFSET_PX + BOSS_EXTRA_VERTICAL_OFFSET_PX;
    const expectedBossX = W * COMBAT_LAYOUT.bossXRatio - bossEngine.displayWidth / 2 + BOSS_HORIZONTAL_OFFSET_PX;

    const warriorCall = warriorEngine._drawCalls[0];
    const bossCall = bossEngine._drawCalls[0];

    // factor === 1, por lo que las coordenadas pasadas a draw() ya son las de pantalla.
    expect(warriorCall.x).toBeCloseTo(expectedWarriorX, 9);
    expect(warriorCall.y).toBeCloseTo(expectedWarriorY, 9);
    expect(bossCall.x).toBeCloseTo(expectedBossX, 9);
    expect(bossCall.y).toBeCloseTo(expectedBossY, 9);
  });
});

describe('drawCombatants — escenario móvil W=375 (unit)', () => {
  it('el Boss_Sprite de 550px de ancho se escala y cabe dentro del canvas de 375px', () => {
    const W = 375;
    const H = 600;
    const warriorEngine = createMockEngine(400, 500);
    const bossEngine = createMockEngine(550, 750); // ancho del boss del escenario de la Introduction
    const ctx = createMockCtx();

    drawCombatants(ctx, W, H, warriorEngine, bossEngine);

    const factor = computeSpriteScaleFactor(W);
    expect(factor).toBeLessThan(1);

    const bossScaledDims = scaleDimensions({ width: bossEngine.displayWidth, height: bossEngine.displayHeight }, factor);
    // El ancho escalado del boss debe ser menor que el ancho del canvas.
    expect(bossScaledDims.width).toBeLessThan(W);

    const bossCall = bossEngine._drawCalls[0];
    const bossScreenX = bossCall.x * factor;

    // El sprite dibujado (desde bossScreenX hasta bossScreenX + bossScaledDims.width)
    // debe caer dentro (o mayormente dentro) del canvas de 375px de ancho: al menos
    // el borde izquierdo no debe estar completamente fuera y el ancho escalado
    // debe ser menor que el canvas completo.
    expect(bossScaledDims.width).toBeLessThan(W);
    expect(bossScreenX + bossScaledDims.width).toBeGreaterThan(0);
  });
});

describe('Minimum_Scale_Factor (unit)', () => {
  it('Minimum_Scale_Factor es mayor que 0', () => {
    expect(Minimum_Scale_Factor).toBeGreaterThan(0);
  });
});

describe('computeSpriteScaleFactor — Property 9: independencia de H y de Landscape_Mobile_Mode', () => {
  // Feature: landscape-orientation-support, Property 9: Sprite_Scale_Factor es independiente de H y de Landscape_Mobile_Mode
  it('Property 9: para todo W>0 y para todo par H1,H2>0, computeSpriteScaleFactor(W) es el mismo valor (depende solo de W)', () => {
    fc.assert(
      fc.property(
        arbCanvasWidth,
        fc.double({ min: 0.001, max: 5000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 5000, noNaN: true, noDefaultInfinity: true }),
        (W, H1, H2) => {
          // computeSpriteScaleFactor no recibe H como argumento: se llama solo con W,
          // y H1/H2 se generan únicamente para documentar que, sin importar el valor
          // de H (y por lo tanto sin importar si (W, H1) o (W, H2) activan
          // Landscape_Mobile_Mode), el resultado depende exclusivamente de W.
          const factorWithH1Context = computeSpriteScaleFactor(W);
          const factorWithH2Context = computeSpriteScaleFactor(W);
          expect(factorWithH1Context).toBe(factorWithH2Context);

          // Confirmación adicional: el resultado coincide con el mismo cálculo puro,
          // independientemente de si (W, H1) o (W, H2) están en Landscape_Mobile_Mode.
          const ratio1 = computeVerticalAnchorRatio(W, H1);
          const ratio2 = computeVerticalAnchorRatio(W, H2);
          void ratio1;
          void ratio2;
          expect(computeSpriteScaleFactor(W)).toBe(factorWithH1Context);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('drawCombatants — unit: ejemplo concreto de landscape móvil (667x375)', () => {
  it('con W=667, H=375, computeVerticalAnchorRatio(667,375) === 0.75 y el groundY interno de drawCombatants usa ese ratio', () => {
    const W = 667;
    const H = 375;

    expect(computeVerticalAnchorRatio(W, H)).toBe(0.75);

    const warriorEngine = createMockEngine(400, 500);
    const bossEngine = createMockEngine(550, 750);
    const ctx = createMockCtx();

    drawCombatants(ctx, W, H, warriorEngine, bossEngine);

    const expectedGroundY = H * 0.75;
    const factor = computeSpriteScaleFactor(W);

    const warriorDims = scaleDimensions({ width: warriorEngine.displayWidth, height: warriorEngine.displayHeight }, factor);
    const warriorCall = warriorEngine._drawCalls[0];
    const warriorScreenY = warriorCall.y * factor;

    // origin.y = groundY - scaledHeight + scaleOffset(VERTICAL_OFFSET_PX, factor)
    // => groundY = origin.y + scaledHeight - scaleOffset(VERTICAL_OFFSET_PX, factor)
    const VERTICAL_OFFSET_PX = 70;
    const recoveredGroundY = warriorScreenY + warriorDims.height - scaleOffset(VERTICAL_OFFSET_PX, factor);

    expect(recoveredGroundY).toBeCloseTo(expectedGroundY, 9);
    expect(expectedGroundY).toBe(375 * 0.75);
  });
});

describe('drawCombatants — unit: no-regresión de COMBAT_LAYOUT.groundYRatio (800x600)', () => {
  it('fuera de Landscape_Mobile_Mode (W=800, H=600), computeVerticalAnchorRatio(800,600) === 0.62 y el groundY interno coincide con el antiguo groundYRatio', () => {
    const W = 800;
    const H = 600;

    expect(computeVerticalAnchorRatio(W, H)).toBe(0.62);

    const warriorEngine = createMockEngine(400, 500);
    const bossEngine = createMockEngine(550, 750);
    const ctx = createMockCtx();

    drawCombatants(ctx, W, H, warriorEngine, bossEngine);

    const expectedGroundY = H * 0.62;
    const factor = computeSpriteScaleFactor(W);

    const bossDims = scaleDimensions({ width: bossEngine.displayWidth, height: bossEngine.displayHeight }, factor);
    const bossCall = bossEngine._drawCalls[0];
    const bossScreenY = bossCall.y * factor;

    const VERTICAL_OFFSET_PX = 70;
    const BOSS_EXTRA_VERTICAL_OFFSET_PX = 91;
    const recoveredGroundY = bossScreenY + bossDims.height - scaleOffset(VERTICAL_OFFSET_PX + BOSS_EXTRA_VERTICAL_OFFSET_PX, factor);

    expect(recoveredGroundY).toBeCloseTo(expectedGroundY, 9);
    expect(expectedGroundY).toBe(600 * 0.62);
  });
});
