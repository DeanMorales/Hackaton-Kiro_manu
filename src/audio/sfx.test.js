/* ===== Tests de la eliminación de `attack` en src/audio/sfx.js (tarea 3.3) ===== */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sfx } from './sfx.js';

/*
 * `AUDIO_MAP` no se exporta desde `src/audio/sfx.js` (solo se exporta `sfx`),
 * por lo que la comprobación de `AUDIO_MAP.attack === undefined` se realiza
 * mediante inspección estática del código fuente en lugar de una importación
 * directa, siguiendo el mismo patrón de `readFileSync` + `resolve`/`dirname`
 * usado en `src/ui/screens.modal.open.test.js`. No existe ningún otro
 * identificador llamado `attack` en este archivo, por lo que una búsqueda de
 * `attack:` en todo el texto fuente es suficiente y más simple que acotar la
 * búsqueda al literal del objeto `AUDIO_MAP`.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const SFX_SOURCE = readFileSync(resolve(__dirname, './sfx.js'), 'utf-8');

// _Requirements: 5.1, 5.2_
describe('src/audio/sfx.js — eliminación del mecanismo manual de sonido de ataque', () => {
  it('AUDIO_MAP no contiene una entrada `attack` (inspección estática del código fuente)', () => {
    expect(/attack\s*:/.test(SFX_SOURCE)).toBe(false);
  });

  it('el objeto exportado `sfx` no expone una propiedad `attack`', () => {
    expect(sfx.attack).toBeUndefined();
  });
});
