/* ===== Pruebas de propiedad del Selector_De_Preguntas (src/data/services.js) =====
   Feature: dificultad-progresiva-preguntas
   Cubre las Propiedades 4, 5, 6, 7 y 10 del diseño.
   Estrategia:
   - Property 4 y 7: se ejercitan contra el banco real `QUESTIONS` vía `pickQuestion`
     (garantías de forma y preservación del índice correcto).
   - Property 5, 6 y 10: se ejercitan con pools sintéticos (mocks) vía
     `resolveEffectiveDifficulty`, que es donde vive la lógica de reserva por nivel. */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveEffectiveDifficulty, pickQuestion, QUESTIONS } from './services.js';

const NUM_RUNS = 100;

// Ids de servicios reales del banco (todos tienen al menos una pregunta).
const SERVICE_IDS = Object.keys(QUESTIONS);

// Construye un objeto Pregunta sintético con la dificultad dada.
// Si `d` es null/undefined, la pregunta se crea SIN el campo `d`
// (para probar el trato como Nivel_De_Dificultad 1, R1.4).
function mockQuestion(d, tag){
  const base = {
    q: `pregunta-${tag}`,
    o: ['a', 'b', 'c', 'd'],
    c: 0,
  };
  if(d !== null && d !== undefined) base.d = d;
  return base;
}

describe('Selector_De_Preguntas — resolveEffectiveDifficulty / pickQuestion', () => {

  // Feature: dificultad-progresiva-preguntas, Property 4: El selector siempre
  // devuelve una pregunta válida del servicio (4 opciones y correct en [0,3]).
  // Validates: Requirements 3.5, 3.1
  it('Property 4: pickQuestion siempre devuelve una pregunta válida del servicio', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SERVICE_IDS),
        fc.constantFrom(1, 2, 3),
        (serviceId, target) => {
          const result = pickQuestion(serviceId, null, target);
          expect(result).not.toBeNull();
          expect(Array.isArray(result.options)).toBe(true);
          expect(result.options).toHaveLength(4);
          expect(Number.isInteger(result.correct)).toBe(true);
          expect(result.correct).toBeGreaterThanOrEqual(0);
          expect(result.correct).toBeLessThanOrEqual(3);
          expect(result.options[result.correct]).toBeDefined();
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  // Feature: dificultad-progresiva-preguntas, Property 5: Coincidencia exacta de
  // dificultad cuando existe una pregunta en el nivel objetivo.
  // Validates: Requirements 3.2
  it('Property 5: coincidencia exacta de dificultad cuando el nivel objetivo existe', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(1, 2, 3),
        // subconjunto de niveles presentes que SIEMPRE incluye el objetivo
        fc.subarray([1, 2, 3]),
        (target, extraLevels) => {
          const levels = Array.from(new Set([target, ...extraLevels]));
          const pool = levels.map((d, i) => mockQuestion(d, `${d}-${i}`));
          const eff = resolveEffectiveDifficulty(pool, target);
          expect(eff).toBe(target);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  // Feature: dificultad-progresiva-preguntas, Property 6: Reserva al nivel
  // disponible más cercano (más cercano MENOR, si no existe, más cercano MAYOR).
  // Validates: Requirements 3.3, 3.4
  it('Property 6: reserva al nivel disponible más cercano cuando falta el objetivo', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(1, 2, 3),
        // subconjunto NO vacío de niveles distintos del objetivo
        fc.subarray([1, 2, 3], { minLength: 1 }),
        (target, candidateLevels) => {
          const present = candidateLevels.filter(d => d !== target);
          // Precondición: el objetivo no está presente y hay al menos un nivel.
          fc.pre(present.length > 0);

          const pool = present.map((d, i) => mockQuestion(d, `${d}-${i}`));
          const eff = resolveEffectiveDifficulty(pool, target);

          // Nivel esperado: más cercano MENOR; si no hay, más cercano MAYOR.
          const lower = present.filter(d => d < target);
          const higher = present.filter(d => d > target);
          const expected = lower.length > 0
            ? Math.max(...lower)
            : Math.min(...higher);

          expect(eff).toBe(expected);

          // No debe existir un nivel disponible estrictamente más cercano.
          const distChosen = Math.abs(eff - target);
          const lowerDist = lower.length > 0 ? target - Math.max(...lower) : Infinity;
          if(lower.length > 0){
            expect(distChosen).toBe(lowerDist);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  // Feature: dificultad-progresiva-preguntas, Property 7: Preservación del índice
  // de la opción correcta tras barajar las opciones.
  // Validates: Requirements 3.6
  it('Property 7: options[correct] preserva la opción correcta original tras barajar', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SERVICE_IDS),
        fc.constantFrom(1, 2, 3),
        (serviceId, target) => {
          const result = pickQuestion(serviceId, null, target);
          expect(result).not.toBeNull();

          // Localizar la pregunta de origen en el pool por su enunciado.
          const pool = QUESTIONS[serviceId];
          const source = pool.find(q => q.q === result.text);
          expect(source).toBeDefined();

          // La opción marcada como correcta tras el barajado debe ser
          // idéntica a la opción correcta de la pregunta de origen.
          expect(result.options[result.correct]).toBe(source.o[source.c]);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  // Feature: dificultad-progresiva-preguntas, Property 10: Preguntas sin `d` se
  // tratan como Nivel_De_Dificultad 1 (coincidencia exacta y reserva).
  // Validates: Requirements 1.4
  it('Property 10: preguntas sin campo `d` se tratan como nivel 1', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(1, 2, 3),
        // niveles explícitos adicionales que pueden acompañar a las preguntas sin `d`
        fc.subarray([2, 3]),
        fc.integer({ min: 1, max: 3 }), // cantidad de preguntas sin `d`
        (target, explicitLevels, noDCount) => {
          // Pool: `noDCount` preguntas sin `d` (= nivel 1) + niveles explícitos (2/3).
          const pool = [];
          for(let i = 0; i < noDCount; i++){
            pool.push(mockQuestion(undefined, `nod-${i}`));
          }
          explicitLevels.forEach((d, i) => pool.push(mockQuestion(d, `exp-${d}-${i}`)));

          const eff = resolveEffectiveDifficulty(pool, target);

          // Niveles presentes: 1 (por las preguntas sin `d`) más los explícitos.
          const present = new Set([1, ...explicitLevels]);

          // El resultado esperado replica la lógica de reserva tratando sin-`d` como 1.
          let expected;
          if(present.has(target)){
            expected = target;
          } else {
            expected = null;
            for(let d = target - 1; d >= 1; d--){ if(present.has(d)){ expected = d; break; } }
            if(expected === null){
              for(let d = target + 1; d <= 3; d++){ if(present.has(d)){ expected = d; break; } }
            }
          }

          expect(eff).toBe(expected);

          // Verificación directa del trato como nivel 1:
          // con objetivo 1, siempre hay coincidencia exacta gracias a las sin-`d`.
          const effTarget1 = resolveEffectiveDifficulty(pool, 1);
          expect(effTarget1).toBe(1);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
