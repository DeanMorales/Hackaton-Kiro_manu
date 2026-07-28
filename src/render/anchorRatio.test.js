/* ===== Tests del módulo Anchor_Ratio (src/render/anchorRatio.js) ===== */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  DEFAULT_VERTICAL_ANCHOR_RATIO,
  LANDSCAPE_VERTICAL_ANCHOR_RATIO,
  LANDSCAPE_HEIGHT_THRESHOLD,
  isLandscapeMobileMode,
  computeVerticalAnchorRatio,
} from './anchorRatio.js';

const arbPositive = fc.double({ min: 0.001, max: 10000, noNaN: true, noDefaultInfinity: true });

describe('isLandscapeMobileMode', () => {
  // Feature: landscape-orientation-support, Property 1: Detección correcta de Landscape_Mobile_Mode en el cuadrante landscape móvil
  it('Property 1: para todo W>0, H>0 con W>H y H<=520, isLandscapeMobileMode(W,H) es true', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: LANDSCAPE_HEIGHT_THRESHOLD, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (H, extra) => {
          // W estrictamente mayor que H, construido de forma determinista y shrinkable.
          const W = H + extra + 0.001;
          expect(isLandscapeMobileMode(W, H)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: landscape-orientation-support, Property 2: Landscape_Mobile_Mode desactivado cuando W <= H, para cualquier H
  it('Property 2: para todo W>0, H>0 con W<=H, isLandscapeMobileMode(W,H) es false', () => {
    fc.assert(
      fc.property(arbPositive, arbPositive, (a, b) => {
        const W = Math.min(a, b);
        const H = Math.max(a, b);
        expect(isLandscapeMobileMode(W, H)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: landscape-orientation-support, Property 3: Landscape_Mobile_Mode desactivado en landscape con suficiente alto (tablet/escritorio)
  it('Property 3: para todo W>0, H>0 con W>H y H>520, isLandscapeMobileMode(W,H) es false', () => {
    fc.assert(
      fc.property(
        fc.double({ min: LANDSCAPE_HEIGHT_THRESHOLD + 0.001, max: 10000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (H, extra) => {
          const W = H + extra + 0.001;
          expect(isLandscapeMobileMode(W, H)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  describe('casos límite (unit)', () => {
    it('isLandscapeMobileMode(800, 520) es true (umbral exacto)', () => {
      expect(isLandscapeMobileMode(800, 520)).toBe(true);
    });

    it('isLandscapeMobileMode(800, 521) es false (justo sobre el umbral)', () => {
      expect(isLandscapeMobileMode(800, 521)).toBe(false);
    });

    it('isLandscapeMobileMode(400, 400) es false (W === H)', () => {
      expect(isLandscapeMobileMode(400, 400)).toBe(false);
    });
  });
});

describe('computeVerticalAnchorRatio', () => {
  // Feature: landscape-orientation-support, Property 4: El ratio resuelto es exactamente 0.75 en Landscape_Mobile_Mode
  it('Property 4: donde isLandscapeMobileMode(W,H) es true, computeVerticalAnchorRatio(W,H) === 0.75 exactamente', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: LANDSCAPE_HEIGHT_THRESHOLD, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (H, extra) => {
          const W = H + extra + 0.001;
          expect(isLandscapeMobileMode(W, H)).toBe(true);
          expect(computeVerticalAnchorRatio(W, H)).toBe(LANDSCAPE_VERTICAL_ANCHOR_RATIO);
          expect(computeVerticalAnchorRatio(W, H)).toBe(0.75);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: landscape-orientation-support, Property 5: El ratio resuelto es exactamente 0.62 fuera de Landscape_Mobile_Mode (no-regresión)
  it('Property 5: donde isLandscapeMobileMode(W,H) es false, computeVerticalAnchorRatio(W,H) === 0.62 exactamente', () => {
    fc.assert(
      fc.property(arbPositive, arbPositive, (a, b) => {
        const W = Math.min(a, b);
        const H = Math.max(a, b);
        fc.pre(!isLandscapeMobileMode(W, H));
        expect(computeVerticalAnchorRatio(W, H)).toBe(DEFAULT_VERTICAL_ANCHOR_RATIO);
        expect(computeVerticalAnchorRatio(W, H)).toBe(0.62);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: landscape-orientation-support, Property 6: Camera_Anchor y Combat_Ground_Anchor siempre comparten el mismo ratio
  it('Property 6: dos llamadas independientes a computeVerticalAnchorRatio(W,H) devuelven el mismo valor', () => {
    fc.assert(
      fc.property(arbPositive, arbPositive, (W, H) => {
        const a = computeVerticalAnchorRatio(W, H);
        const b = computeVerticalAnchorRatio(W, H);
        expect(a).toBe(b);
      }),
      { numRuns: 100 }
    );
  });
});
