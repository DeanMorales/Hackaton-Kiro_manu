/* ===== Tests del módulo de datos de ambiente (src/data/environmentRoster.js) ===== */
import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  selectBiome,
  selectTimeOfDay,
  nextBiomeForSession,
  nextTimeOfDayForSession,
  BIOME_CATALOG,
  TIME_OF_DAY_CATALOG,
} from './environmentRoster.js';

// Feature: tower-ground-biome-background, Property 1: Rotación determinística en las primeras sesiones de cada catálogo
describe('selectBiome/selectTimeOfDay — rotación determinística en las primeras sesiones', () => {
  it('Property 1: selectBiome(sessionsStarted) para sessionsStarted en [0,4] devuelve siempre BIOME_CATALOG[sessionsStarted] de forma repetible', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4 }), (sessionsStarted) => {
        const expected = BIOME_CATALOG[sessionsStarted];

        // Llamadas repetidas con el mismo valor devuelven siempre la misma entrada.
        const results = [
          selectBiome(sessionsStarted),
          selectBiome(sessionsStarted),
          selectBiome(sessionsStarted),
        ];

        for (const result of results) {
          expect(result).toBe(expected);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: selectTimeOfDay(sessionsStarted) para sessionsStarted en [0,3] devuelve siempre TIME_OF_DAY_CATALOG[sessionsStarted] de forma repetible', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3 }), (sessionsStarted) => {
        const expected = TIME_OF_DAY_CATALOG[sessionsStarted];

        // Llamadas repetidas con el mismo valor devuelven siempre la misma entrada.
        const results = [
          selectTimeOfDay(sessionsStarted),
          selectTimeOfDay(sessionsStarted),
          selectTimeOfDay(sessionsStarted),
        ];

        for (const result of results) {
          expect(result).toBe(expected);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: tower-ground-biome-background, Property 2: Rotación aleatoria con repetición fuera del rango fijo
describe('selectBiome/selectTimeOfDay — rotación aleatoria con repetición fuera del rango fijo', () => {
  it('Property 2: selectBiome(sessionsStarted) para sessionsStarted >= 5 y N llamadas sucesivas pertenece siempre a BIOME_CATALOG y presenta al menos una repetición', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 1000 }),
        fc.integer({ min: 100, max: 500 }),
        (sessionsStarted, n) => {
          const results = [];
          for (let i = 0; i < n; i++) {
            results.push(selectBiome(sessionsStarted));
          }

          // Cada resultado pertenece siempre al conjunto de entradas de BIOME_CATALOG.
          for (const result of results) {
            expect(BIOME_CATALOG).toContain(result);
          }

          // Para N suficientemente grande, se observa al menos una repetición.
          const distinctCount = new Set(results).size;
          expect(distinctCount).toBeLessThan(results.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: selectTimeOfDay(sessionsStarted) para sessionsStarted >= 4 y N llamadas sucesivas pertenece siempre a TIME_OF_DAY_CATALOG y presenta al menos una repetición', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 1000 }),
        fc.integer({ min: 100, max: 500 }),
        (sessionsStarted, n) => {
          const results = [];
          for (let i = 0; i < n; i++) {
            results.push(selectTimeOfDay(sessionsStarted));
          }

          // Cada resultado pertenece siempre al conjunto de entradas de TIME_OF_DAY_CATALOG.
          for (const result of results) {
            expect(TIME_OF_DAY_CATALOG).toContain(result);
          }

          // Para N suficientemente grande, se observa al menos una repetición.
          const distinctCount = new Set(results).size;
          expect(distinctCount).toBeLessThan(results.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: tower-ground-biome-background, Property 3: Independencia entre Biome_Rotation y Time_Of_Day_Rotation
describe('nextBiomeForSession/nextTimeOfDayForSession — independencia entre ambas rotaciones', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Property 3: intercalar llamadas a nextTimeOfDayForSession() no altera la secuencia de resultados de nextBiomeForSession(), y viceversa', () => {
    // biomeSessionCounter/timeOfDaySessionCounter son singletons de módulo sin
    // función de reinicio expuesta (Requirement 9.2/9.3): no es posible reiniciarlos
    // entre casos de prueba, ni comparar dos ejecuciones separadas partiendo del
    // mismo estado. En su lugar, se mantiene un espejo local de cada contador que
    // solo avanza cuando ESTA prueba invoca la función de sesión correspondiente, y
    // se verifica en cada llamada que el resultado coincide exactamente con lo que
    // la función pura (selectBiome/selectTimeOfDay) produciría para ese valor de
    // contador — que las llamadas intercaladas a la otra rotación jamás pueden
    // alterar ese valor esperado (ni el contador que lo determina) demuestra la
    // independencia entre ambas rotaciones sin necesitar ningún reinicio.
    //
    // Math.random se fija a un valor determinista para que la rama aleatoria de
    // selectBiome/selectTimeOfDay (sessionsStarted fuera del rango fijo) también
    // sea predecible y la comparación de igualdad no sea flaky una vez ambos
    // contadores superan el tamaño de su catálogo.
    vi.spyOn(Math, 'random').mockReturnValue(0.42);

    let localBiomeCounter = 0;
    let localTimeOfDayCounter = 0;

    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('biome', 'timeOfDay'), { minLength: 2, maxLength: 100 }),
        (callSequence) => {
          for (const call of callSequence) {
            if (call === 'biome') {
              // Lo que nextBiomeForSession() DEBE producir si timeOfDay nunca la afecta:
              // el mismo valor que selectBiome() para el contador local, que solo
              // avanza en las llamadas 'biome' de esta secuencia intercalada.
              const expected = selectBiome(localBiomeCounter);
              const actual = nextBiomeForSession();
              expect(actual).toBe(expected);
              localBiomeCounter += 1;
            } else {
              const expected = selectTimeOfDay(localTimeOfDayCounter);
              const actual = nextTimeOfDayForSession();
              expect(actual).toBe(expected);
              localTimeOfDayCounter += 1;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ===== Pruebas unitarias de los catálogos y las selecciones puras ===== */
// _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 4.1, 5.1, 8.3, 8.5_
describe('BIOME_CATALOG / TIME_OF_DAY_CATALOG — forma y orden de los catálogos', () => {
  it('BIOME_CATALOG tiene exactamente 5 entradas en el orden Tundra, Sabana, Desierto, Bosque_Templado, Taiga', () => {
    expect(BIOME_CATALOG.length).toBe(5);
    expect(BIOME_CATALOG.map((entry) => entry.id)).toEqual([
      'tundra',
      'sabana',
      'desierto',
      'bosque_templado',
      'taiga',
    ]);
  });

  it('TIME_OF_DAY_CATALOG tiene exactamente 4 entradas en el orden Mañana, Día, Tarde, Noche', () => {
    expect(TIME_OF_DAY_CATALOG.length).toBe(4);
    expect(TIME_OF_DAY_CATALOG.map((entry) => entry.id)).toEqual([
      'manana',
      'dia',
      'tarde',
      'noche',
    ]);
  });
});

describe('BIOME_CATALOG / TIME_OF_DAY_CATALOG — unicidad de combinaciones visuales', () => {
  it('ninguna pareja de entradas de BIOME_CATALOG comparte la misma combinación de hillColor+groundColors+vegetationCue', () => {
    const signatures = BIOME_CATALOG.map(
      (entry) => `${entry.hillColor}|${entry.groundColors.join(',')}|${entry.vegetationCue}`
    );
    const distinctSignatures = new Set(signatures);
    expect(distinctSignatures.size).toBe(BIOME_CATALOG.length);
  });

  it('ninguna pareja de entradas de TIME_OF_DAY_CATALOG comparte la misma combinación de skyGradientStops+starVisibility+sunMoonCue', () => {
    const signatures = TIME_OF_DAY_CATALOG.map((entry) =>
      JSON.stringify({
        skyGradientStops: entry.skyGradientStops,
        starVisibility: entry.starVisibility,
        sunMoonCue: entry.sunMoonCue,
      })
    );
    const distinctSignatures = new Set(signatures);
    expect(distinctSignatures.size).toBe(TIME_OF_DAY_CATALOG.length);
  });
});

describe('BIOME_CATALOG / TIME_OF_DAY_CATALOG — casos concretos de vegetación y estrellas', () => {
  it('la entrada Desierto tiene vegetationCue === "none"', () => {
    const desierto = BIOME_CATALOG.find((entry) => entry.id === 'desierto');
    expect(desierto.vegetationCue).toBe('none');
  });

  it('la entrada Noche tiene starVisibility === true y las otras tres tienen starVisibility === false', () => {
    const noche = TIME_OF_DAY_CATALOG.find((entry) => entry.id === 'noche');
    expect(noche.starVisibility).toBe(true);

    const otras = TIME_OF_DAY_CATALOG.filter((entry) => entry.id !== 'noche');
    expect(otras).toHaveLength(3);
    for (const entry of otras) {
      expect(entry.starVisibility).toBe(false);
    }
  });

  it('Bosque_Templado y Taiga tienen vegetationCue distintos entre sí', () => {
    const bosqueTemplado = BIOME_CATALOG.find((entry) => entry.id === 'bosque_templado');
    const taiga = BIOME_CATALOG.find((entry) => entry.id === 'taiga');
    expect(bosqueTemplado.vegetationCue).not.toBe(taiga.vegetationCue);
  });
});

describe('selectBiome/selectTimeOfDay — casos concretos del rango fijo', () => {
  it('selectBiome(0)..selectBiome(4) devuelven respectivamente Tundra..Taiga', () => {
    expect(selectBiome(0)).toBe(BIOME_CATALOG[0]);
    expect(selectBiome(0).id).toBe('tundra');
    expect(selectBiome(1)).toBe(BIOME_CATALOG[1]);
    expect(selectBiome(1).id).toBe('sabana');
    expect(selectBiome(2)).toBe(BIOME_CATALOG[2]);
    expect(selectBiome(2).id).toBe('desierto');
    expect(selectBiome(3)).toBe(BIOME_CATALOG[3]);
    expect(selectBiome(3).id).toBe('bosque_templado');
    expect(selectBiome(4)).toBe(BIOME_CATALOG[4]);
    expect(selectBiome(4).id).toBe('taiga');
  });

  it('selectTimeOfDay(0)..selectTimeOfDay(3) devuelven respectivamente Mañana..Noche', () => {
    expect(selectTimeOfDay(0)).toBe(TIME_OF_DAY_CATALOG[0]);
    expect(selectTimeOfDay(0).id).toBe('manana');
    expect(selectTimeOfDay(1)).toBe(TIME_OF_DAY_CATALOG[1]);
    expect(selectTimeOfDay(1).id).toBe('dia');
    expect(selectTimeOfDay(2)).toBe(TIME_OF_DAY_CATALOG[2]);
    expect(selectTimeOfDay(2).id).toBe('tarde');
    expect(selectTimeOfDay(3)).toBe(TIME_OF_DAY_CATALOG[3]);
    expect(selectTimeOfDay(3).id).toBe('noche');
  });
});
