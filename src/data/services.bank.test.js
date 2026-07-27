// Feature: dificultad-progresiva-preguntas
//
// Pruebas por ejemplo (data-driven) sobre el banco de preguntas REAL.
// Recorren una sola vez todos los servicios de AWS_SERVICES y sus preguntas.
// No usan fast-check: son invariantes sobre el dato concreto del banco.
//
// Cubren las tareas 5.13, 5.14 y 5.15:
//  - 5.13  Mínimos por nivel para TODOS los servicios (R1.2, R1.5)
//  - 5.14  Property 12: etiqueta de dominio y formato en niveles 2 y 3 (R7.1, R7.2, R7.4)
//  - 5.15  Property 11: cobertura de los cuatro dominios CLF-C02 (R7.7)

import { describe, it, expect } from 'vitest';
import { QUESTIONS, AWS_SERVICES, CLF_DOMAINS } from './services.js';

// ---------------------------------------------------------------------------
// Task 5.13 — Mínimos del banco para TODOS los servicios (Requirements 1.2, 1.5)
// ---------------------------------------------------------------------------
describe('Banco de preguntas - mínimos por nivel para TODOS los servicios (R1.2, R1.5)', () => {
  // Data-driven: it.each genera un caso por servicio, de modo que un fallo
  // identifica exactamente el servicio con déficit de contenido.
  it.each(AWS_SERVICES.map((s) => [s.id, s]))(
    'servicio "%s" cumple los mínimos: >=8 nivel 1, >=10 nivel 2, >=5 nivel 3',
    (serviceId) => {
      const pool = QUESTIONS[serviceId];
      expect(pool, `QUESTIONS["${serviceId}"] debe existir`).toBeDefined();
      expect(Array.isArray(pool), `QUESTIONS["${serviceId}"] debe ser un arreglo`).toBe(true);

      const level1 = pool.filter((q) => (q.d || 1) === 1).length;
      const level2 = pool.filter((q) => q.d === 2).length;
      const level3 = pool.filter((q) => q.d === 3).length;

      expect(level1, `"${serviceId}" nivel 1 (tiene ${level1}, requiere >=8)`).toBeGreaterThanOrEqual(8);
      expect(level2, `"${serviceId}" nivel 2 (tiene ${level2}, requiere >=10)`).toBeGreaterThanOrEqual(10);
      expect(level3, `"${serviceId}" nivel 3 (tiene ${level3}, requiere >=5)`).toBeGreaterThanOrEqual(5);
    }
  );
});

// ---------------------------------------------------------------------------
// Task 5.14 — Property 12: etiqueta de dominio válida y formato en niveles 2 y 3
// Validates: Requirements 7.1, 7.2, 7.4
// ---------------------------------------------------------------------------
describe('Property 12: etiqueta de dominio válida y formato en niveles 2 y 3 (R7.1, R7.2, R7.4)', () => {
  const validDomains = Object.keys(CLF_DOMAINS); // conceptos, seguridad, tecnologia, facturacion

  it('toda pregunta con d >= 2 tiene dom válido, 4 opciones y c entero en [0,3]', () => {
    for (const service of AWS_SERVICES) {
      const pool = QUESTIONS[service.id] || [];
      pool.forEach((q, idx) => {
        if (q.d >= 2) {
          const where = `servicio "${service.id}" pregunta #${idx} (d=${q.d})`;

          // R7.1/R7.2: dom definido y dentro del conjunto canónico
          expect(q.dom, `${where}: dom debe estar definido`).toBeDefined();
          expect(
            validDomains,
            `${where}: dom="${q.dom}" no es un dominio CLF-C02 válido`
          ).toContain(q.dom);

          // R7.4: exactamente 4 opciones e índice correcto entero en [0,3]
          expect(Array.isArray(q.o), `${where}: o debe ser un arreglo`).toBe(true);
          expect(q.o.length, `${where}: debe tener 4 opciones`).toBe(4);
          expect(Number.isInteger(q.c), `${where}: c debe ser entero`).toBe(true);
          expect(q.c, `${where}: c debe ser >= 0`).toBeGreaterThanOrEqual(0);
          expect(q.c, `${where}: c debe ser <= 3`).toBeLessThanOrEqual(3);
        }
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Task 5.15 — Property 11: cobertura de los cuatro dominios CLF-C02 (R7.7)
// ---------------------------------------------------------------------------
describe('Property 11: cobertura de los cuatro dominios CLF-C02 en niveles 2 y 3 (R7.7)', () => {
  it('el conjunto de dom en preguntas d >= 2 contiene los cuatro dominios canónicos', () => {
    const covered = new Set();
    for (const service of AWS_SERVICES) {
      const pool = QUESTIONS[service.id] || [];
      for (const q of pool) {
        if (q.d >= 2 && q.dom) covered.add(q.dom);
      }
    }

    for (const domain of ['conceptos', 'seguridad', 'tecnologia', 'facturacion']) {
      expect(covered, `el dominio "${domain}" debe estar cubierto por alguna pregunta de nivel 2/3`).toContain(domain);
    }
  });
});
