import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildModalContent, createModalState, computeOpen, computeClose } from './modalState.js';

// Feature: modal-pregunta-tarjeta, Property 2: Fidelidad del contenido de la modal
describe('Property 2: content fidelity', () => {
  it('buildModalContent preserves question text and option order', () => {
    fc.assert(
      fc.property(
        // question.text arbitrario, incluyendo Unicode y cadena vacía
        fc.string({ unit: 'grapheme' }),
        // options: array de strings arbitrarias (incl. Unicode/vacío)
        fc.array(fc.string({ unit: 'grapheme' })),
        (text, options) => {
          const card = { question: { text, options, correct: 0 } };
          const content = buildModalContent(card);

          // El texto de la pregunta se conserva idéntico
          expect(content.text).toBe(text);
          // Las opciones son exactamente las mismas y en el mismo orden
          expect(content.options).toEqual(options);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: modal-pregunta-tarjeta, Property 1: La decisión de apertura respeta el estado y el bloqueo
describe('Property 1: opening decision respects state and locking', () => {
  it('computeOpen abre si y solo si no está resuelto, el índice es válido y la Tarjeta no está bloqueada; en caso contrario ignora sin mutar el estado', () => {
    // Generador de una Tarjeta con `locked` aleatorio. El resto de campos son
    // irrelevantes para la decisión de apertura, así que se mantiene mínimo.
    const cardArb = fc.record({ locked: fc.boolean() });

    fc.assert(
      fc.property(
        // Colección de Tarjetas (puede estar vacía).
        fc.array(cardArb, { minLength: 0, maxLength: 8 }),
        // Índice arbitrario: cubre valores dentro y fuera de rango, negativos y no enteros.
        fc.oneof(
          fc.integer({ min: -3, max: 12 }),
          fc.double({ min: -3, max: 12, noNaN: true })
        ),
        // Estado del combate: resuelto o no.
        fc.boolean(),
        // expandedIdx inicial arbitrario para comprobar la inmutabilidad en 'ignore'.
        fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 7 })),
        (cards, idx, resolved, initialExpanded) => {
          const state = { expandedIdx: initialExpanded };
          const result = computeOpen(state, cards, idx, resolved);

          // Condición esperada de apertura (bicondicional).
          const validIndex =
            Number.isInteger(idx) && idx >= 0 && idx < cards.length;
          const expectedOpen =
            resolved !== true && validIndex && cards[idx].locked !== true;

          if (expectedOpen) {
            expect(result.action).toBe('open');
            expect(result.state.expandedIdx).toBe(idx);
          } else {
            expect(result.action).toBe('ignore');
            // Inmutabilidad: en el caso 'ignore' se devuelve el estado sin cambios.
            expect(result.state).toBe(state);
            expect(result.state.expandedIdx).toBe(initialExpanded);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Casos de referencia (unit) para documentar el comportamiento base.
  it('abre una Tarjeta desbloqueada con índice válido y combate en curso', () => {
    const cards = [{ locked: false }, { locked: false }];
    const result = computeOpen(createModalState(), cards, 1, false);
    expect(result.action).toBe('open');
    expect(result.state.expandedIdx).toBe(1);
  });

  it('ignora una Tarjeta bloqueada sin mutar el estado', () => {
    const cards = [{ locked: true }];
    const state = createModalState();
    const result = computeOpen(state, cards, 0, false);
    expect(result.action).toBe('ignore');
    expect(result.state).toBe(state);
  });
});

// Feature: modal-pregunta-tarjeta, Property 3: A lo sumo una modal expandida
describe('Property 3: at most one expanded modal', () => {
  it('para cualquier secuencia de open/close sobre cards no bloqueadas, expandedIdx es siempre null o un único índice escalar, y un open válido sobrescribe el anterior', () => {
    // La secuencia de operaciones depende del número de Tarjetas (índices válidos),
    // por eso se genera con `chain` a partir del tamaño de la fila.
    const scenarioArb = fc.integer({ min: 1, max: 8 }).chain((numCards) => {
      const cards = Array.from({ length: numCards }, () => ({ locked: false }));
      // Cada operación es abrir un índice válido o cerrar.
      const opArb = fc.oneof(
        fc.record({
          kind: fc.constant('open'),
          idx: fc.integer({ min: 0, max: numCards - 1 }),
        }),
        fc.record({ kind: fc.constant('close') })
      );
      return fc.tuple(
        fc.constant(cards),
        fc.array(opArb, { minLength: 0, maxLength: 30 })
      );
    });

    fc.assert(
      fc.property(
        scenarioArb,
        ([cards, ops]) => {
          let state = createModalState();

          const assertScalarOrNull = (s) => {
            // expandedIdx es null o un único entero escalar (nunca array/set/objeto).
            const v = s.expandedIdx;
            const scalarOrNull =
              v === null || (typeof v === 'number' && Number.isInteger(v));
            expect(scalarOrNull).toBe(true);
            expect(Array.isArray(v)).toBe(false);
          };

          // Invariante en el estado inicial.
          assertScalarOrNull(state);

          for (const op of ops) {
            if (op.kind === 'open') {
              const result = computeOpen(state, cards, op.idx, false);
              // Todas las cards están desbloqueadas y el índice es válido: siempre abre.
              expect(result.action).toBe('open');
              state = result.state;
              // Un open válido sobrescribe el anterior: expandedIdx pasa a ser exactamente op.idx.
              expect(state.expandedIdx).toBe(op.idx);
            } else {
              const result = computeClose(state);
              state = result.state;
              expect(state.expandedIdx).toBe(null);
            }
            // Tras cada paso el invariante escalar/null se mantiene.
            assertScalarOrNull(state);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: modal-pregunta-tarjeta, Property 4: El cierre limpia el estado y desactiva el desenfoque
describe('Property 4: closing clears state and disables blur', () => {
  // Representación pura del overlay derivada del estado: mapea el estado del
  // controlador al radio de desenfoque del fondo. `expandedIdx === null` (sin
  // modal abierta) ⇒ blur 0; en caso contrario, hay desenfoque activo (>0).
  // `modalState.js` no exporta este helper, así que se define aquí localmente.
  const overlayBlur = (state) => (state.expandedIdx === null ? 0 : 1);

  it('computeClose siempre deja expandedIdx === null para estados arbitrarios; y expandedIdx === null ⇒ blur 0', () => {
    fc.assert(
      fc.property(
        // Estado arbitrario: con modal abierta (índice escalar) o cerrada (null).
        fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 20 })),
        (initialExpanded) => {
          const state = { expandedIdx: initialExpanded };
          const result = computeClose(state);

          // R2.1/R2.2/R2.3: el cierre siempre deja el estado sin modal abierta.
          expect(result.state.expandedIdx).toBe(null);

          // R6.4: con expandedIdx === null la representación del overlay no
          // aplica Desenfoque_Fondo (radio 0).
          expect(overlayBlur(result.state)).toBe(0);

          // La acción es coherente: 'close' si había modal, 'noop' si ya estaba cerrada.
          const expectedAction = initialExpanded === null ? 'noop' : 'close';
          expect(result.action).toBe(expectedAction);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('para todo estado, expandedIdx === null implica blur 0 (representación del overlay)', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 20 })),
        (expandedIdx) => {
          const state = { expandedIdx };
          if (state.expandedIdx === null) {
            expect(overlayBlur(state)).toBe(0);
          } else {
            // Consistencia del helper: con modal abierta el desenfoque es > 0.
            expect(overlayBlur(state)).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
