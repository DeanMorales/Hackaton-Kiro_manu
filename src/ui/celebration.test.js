/* ===== Tests del módulo de celebración de hitos (src/ui/celebration.js) ===== */
import fc from 'fast-check';
import {
  generateParticles,
  CONFETTI_COLORS,
  PARTICLE_COUNT_MIN,
  PARTICLE_COUNT_MAX,
  SPEED_MIN,
  SPEED_MAX,
  buildFloorMessageElement,
} from './celebration.js';

// Feature: milestone-celebration-feedback, Property 1: Particle count within bounds

/**
 * Validates: Requirement 1.2
 *
 * Para cualquier ancho de pantalla w en [100, 4000], generateParticles(w)
 * debe retornar un array cuya longitud esté dentro del rango
 * [PARTICLE_COUNT_MIN, PARTICLE_COUNT_MAX].
 */
describe('generateParticles — cantidad de partículas dentro de los límites', () => {
  it('Property 1: para cualquier ancho w en [100, 4000], particles.length está en [PARTICLE_COUNT_MIN, PARTICLE_COUNT_MAX]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 4000 }),
        (w) => {
          const particles = generateParticles(w);
          return (
            particles.length >= PARTICLE_COUNT_MIN &&
            particles.length <= PARTICLE_COUNT_MAX
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: milestone-celebration-feedback, Property 2: Particle speed and color invariants

/**
 * Validates: Requirements 1.3, 1.4
 *
 * Para cualquier ancho de pantalla w en [100, 4000], cada partícula generada
 * debe tener:
 *   - speed en [SPEED_MIN, SPEED_MAX]
 *   - color incluido en CONFETTI_COLORS
 *   - x en [0, w]
 */
describe('generateParticles — invariantes de velocidad y color de cada partícula', () => {
  it('Property 2: para cualquier ancho w en [100, 4000], cada partícula tiene speed en [SPEED_MIN, SPEED_MAX], color en CONFETTI_COLORS y x en [0, w]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 4000 }),
        (w) => {
          const particles = generateParticles(w);
          return particles.every(({ speed, color, x }) =>
            speed >= SPEED_MIN &&
            speed <= SPEED_MAX &&
            CONFETTI_COLORS.includes(color) &&
            x >= 0 &&
            x <= w
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: milestone-celebration-feedback, Property 3: Floor message text encoding

/**
 * Validates: Requirement 2.1
 *
 * Para cualquier entero positivo N en [1, 9999], buildFloorMessageElement(N)
 * debe producir un elemento cuyo textContent sea exactamente `PISO ${N}`.
 */
describe('buildFloorMessageElement — codificación del texto del mensaje de piso', () => {
  it('Property 3: para cualquier entero positivo N en [1, 9999], el textContent del elemento es exactamente `PISO ${N}`', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        (n) => {
          const el = buildFloorMessageElement(n);
          return el.textContent === `PISO ${n}`;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Unit tests for showMilestoneCelebration (DOM + timers) ─────────────────
import { showMilestoneCelebration, FLOOR_MSG_DURATION_MS } from './celebration.js';

// Stub requestAnimationFrame globally so jsdom doesn't throw when
// animateConfetti tries to schedule frames.
vi.stubGlobal('requestAnimationFrame', (_cb) => { /* no-op */ });

// Helper: clean up any celebration DOM elements between tests.
function cleanupCelebrationDom() {
  document.querySelector('[data-confetti-overlay="true"]')?.remove();
  document.querySelector('[data-floor-message="true"]')?.remove();
}

// ─── Test 1: prefers-reduced-motion → no canvas ──────────────────────────────
/**
 * Validates: Requirement 1.6
 *
 * When the user-agent signals prefers-reduced-motion: reduce, the
 * Confetti_Overlay canvas must NOT be added to the DOM.
 */
describe('showMilestoneCelebration — prefers-reduced-motion suprime el Confetti_Overlay', () => {
  afterEach(() => {
    cleanupCelebrationDom();
    vi.unstubAllGlobals();
    // Re-stub rAF after unstubAllGlobals so subsequent tests still have it.
    vi.stubGlobal('requestAnimationFrame', (_cb) => { /* no-op */ });
  });

  it('no crea [data-confetti-overlay] cuando matchMedia reporta prefers-reduced-motion: reduce', () => {
    // Stub matchMedia to always return matches: true
    vi.stubGlobal('matchMedia', (_query) => ({ matches: true }));

    showMilestoneCelebration(15);

    expect(document.querySelector('[data-confetti-overlay]')).toBeNull();
  });
});

// ─── Test 2: Floor_Message z-index entre Confetti_Overlay y #bossScreen ──────
/**
 * Validates: Requirements 2.2, 2.6
 *
 * The Floor_Message div must have a z-index numerically greater than the
 * Confetti_Overlay (15) and less than #bossScreen (100).
 */
describe('showMilestoneCelebration — z-index del Floor_Message entre Confetti_Overlay y #bossScreen', () => {
  afterEach(() => {
    cleanupCelebrationDom();
  });

  it('el z-index del Floor_Message es > 15 (Confetti_Overlay) y < 100 (#bossScreen)', () => {
    showMilestoneCelebration(15);

    const floorMsg = document.querySelector('[data-floor-message="true"]');
    expect(floorMsg).not.toBeNull();

    const zIndex = parseInt(floorMsg.style.zIndex, 10);
    expect(zIndex).toBeGreaterThan(15);  // above Confetti_Overlay
    expect(zIndex).toBeLessThan(100);    // below #bossScreen
  });
});

// ─── Test 3: Floor_Message usa var(--font-display) y font-size >= 48px ───────
/**
 * Validates: Requirement 2.3
 *
 * The Floor_Message must use var(--font-display) as its fontFamily and have
 * a font-size of at least 48px.
 */
describe('showMilestoneCelebration — Floor_Message usa var(--font-display) y font-size >= 48px', () => {
  afterEach(() => {
    cleanupCelebrationDom();
  });

  it('el Floor_Message tiene fontFamily "var(--font-display)" y font-size >= 48px', () => {
    // Floor 5 is not a multiple of 15, so no sound — but the floor message
    // is always shown regardless of the floor number.
    showMilestoneCelebration(5);

    const floorMsg = document.querySelector('[data-floor-message="true"]');
    expect(floorMsg).not.toBeNull();

    expect(floorMsg.style.fontFamily).toBe('var(--font-display)');
    expect(parseInt(floorMsg.style.fontSize, 10)).toBeGreaterThanOrEqual(48);
  });
});

// ─── Test 4: Floor_Message eliminado tras FLOOR_MSG_DURATION_MS ──────────────
/**
 * Validates: Requirements 2.4, 2.5
 *
 * The Floor_Message element must be removed from the DOM after exactly
 * FLOOR_MSG_DURATION_MS milliseconds (verified with fake timers).
 */
describe('showMilestoneCelebration — Floor_Message eliminado tras FLOOR_MSG_DURATION_MS', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanupCelebrationDom();
    vi.useRealTimers();
  });

  it('el Floor_Message ya no está en el DOM después de FLOOR_MSG_DURATION_MS ms', () => {
    showMilestoneCelebration(15);

    // Confirm it exists right after creation
    expect(document.querySelector('[data-floor-message="true"]')).not.toBeNull();

    // Advance time past the removal timeout
    vi.advanceTimersByTime(FLOOR_MSG_DURATION_MS + 100);

    expect(document.querySelector('[data-floor-message="true"]')).toBeNull();
  });
});
