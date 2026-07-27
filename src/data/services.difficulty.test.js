import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { difficultyForBossLevel, difficultyLabel } from './services.js';

describe('difficultyForBossLevel - propiedades del mapeo de dificultad', () => {
  // Feature: dificultad-progresiva-preguntas, Property 1: Mapeo acotado en [1,3]
  // Validates: Requirements 2.6
  it('Property 1: el resultado siempre está en {1,2,3} para todo nivel >= 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (level) => {
          const d = difficultyForBossLevel(level);
          expect([1, 2, 3]).toContain(d);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: dificultad-progresiva-preguntas, Property 2: Mapeo monótono no decreciente
  // Validates: Requirements 2.5
  it('Property 2: a <= b implica difficultyForBossLevel(a) <= difficultyForBossLevel(b)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (x, y) => {
          const a = Math.min(x, y);
          const b = Math.max(x, y);
          expect(difficultyForBossLevel(a)).toBeLessThanOrEqual(difficultyForBossLevel(b));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: dificultad-progresiva-preguntas, Property 3: Mapeo conforme a los puntos especificados
  // Validates: Requirements 2.2, 2.3, 2.4
  it('Property 3: 1->1, 2->2 y niveles >=3 -> 3', () => {
    expect(difficultyForBossLevel(1)).toBe(1);
    expect(difficultyForBossLevel(2)).toBe(2);

    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 1_000_000 }),
        (level) => {
          expect(difficultyForBossLevel(level)).toBe(3);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: dificultad-progresiva-preguntas, Property 9: Etiqueta de dificultad correcta
// Validates: Requirements 5.1
describe('Property 9: difficultyLabel devuelve la etiqueta correcta para {1,2,3}', () => {
  it('1 → "Fácil", 2 → "Media", 3 → "Difícil"', () => {
    expect(difficultyLabel(1)).toBe('Fácil');
    expect(difficultyLabel(2)).toBe('Media');
    expect(difficultyLabel(3)).toBe('Difícil');
  });
  it('valores fuera de {1,2,3} devuelven "Fácil" por defecto', () => {
    expect(difficultyLabel(0)).toBe('Fácil');
    expect(difficultyLabel(4)).toBe('Fácil');
    expect(difficultyLabel(undefined)).toBe('Fácil');
  });
});
