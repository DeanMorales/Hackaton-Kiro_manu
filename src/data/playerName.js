/**
 * playerName.js — Lógica pura de captura, validación y persistencia del nombre
 * del jugador para la pantalla de bienvenida de "Torre de las Nubes".
 *
 * Este módulo no tiene dependencias externas (solo JavaScript vanilla ES6+) y su
 * lógica pura es testeable de forma aislada. La capa de UI (`src/ui/screens.js`)
 * y el wiring (`src/main.js`) consumen estas funciones.
 */

/** Clave de localStorage bajo la que se persiste el nombre (Requisito 5.1). */
export const STORAGE_KEY = 'playerName';

/**
 * Longitud máxima válida del nombre, contando espacios (Requisitos 3.3, 4.1, 4.2).
 * No existe longitud mínima distinta de 1.
 */
export const MAX_NAME_LENGTH = 8;

/**
 * Caracteres permitidos en un nombre: letras (incluye acentos y ñ mediante
 * \p{L}), dígitos (\p{Nd}) y espacios (Requisito 3.3).
 * Es una clase de un solo carácter; se usa para filtrar la entrada cruda.
 */
export const ALLOWED_CHARS = /[\p{L}\p{Nd} ]/u;

/** Detecta si hay al menos un carácter alfanumérico (letra o dígito). */
const ALPHANUMERIC = /[\p{L}\p{Nd}]/u;

/**
 * Elimina caracteres no permitidos, dejando solo letras (incluye acentos y ñ),
 * dígitos y espacios. Recorta el resultado a `MAX_NAME_LENGTH` (8) caracteres.
 * Coacciona cualquier entrada a cadena y nunca lanza excepción.
 *
 * Es idempotente: `sanitizeName(sanitizeName(x)) === sanitizeName(x)`.
 *
 * @param {*} raw - valor crudo (idealmente string, pero admite cualquier tipo)
 * @returns {string} nombre sanitizado (solo caracteres permitidos, longitud ≤ 8)
 */
export function sanitizeName(raw) {
  const str = raw == null ? '' : String(raw);
  let out = '';
  for (const ch of str) {
    if (out.length >= MAX_NAME_LENGTH) break;
    if (ALLOWED_CHARS.test(ch)) {
      out += ch;
    }
  }
  return out;
}

/**
 * Un nombre es válido si, tras sanitizar, tiene longitud entre 1 y
 * `MAX_NAME_LENGTH` (8) caracteres (contando espacios) y contiene al menos un
 * carácter alfanumérico. No hay longitud mínima distinta de 1.
 *
 * @param {*} raw - valor crudo a evaluar
 * @returns {boolean} true si el nombre sanitizado es válido
 */
export function isValidName(raw) {
  const name = sanitizeName(raw);
  return (
    name.length >= 1 &&
    name.length <= MAX_NAME_LENGTH &&
    ALPHANUMERIC.test(name)
  );
}

/**
 * Devuelve el nombre activo para la partida: el nombre sanitizado si la entrada
 * es válida, o la cadena vacía `''` en caso contrario (entrada vacía tras
 * sanitizar, o sin ningún carácter alfanumérico).
 *
 * Como `sanitizeName` recorta a `MAX_NAME_LENGTH` (8) caracteres, las entradas
 * de más de 8 caracteres se reducen a su prefijo sanitizado de 8 antes de
 * evaluar la validez. La cadena vacía representa "jugar sin nombre".
 *
 * Es idempotente sobre nombres válidos:
 * `commitName(commitName(x)) === commitName(x)`. Así, hacer clic en "Comenzar a
 * construir" sin cambiar un nombre válido ya presente conserva ese nombre
 * (Requisitos 10.3, 10.4).
 *
 * @param {*} raw - valor crudo del campo de nombre (admite cualquier tipo)
 * @returns {string} nombre activo sanitizado, o `''` si la entrada no es válida
 */
export function commitName(raw) {
  return isValidName(raw) ? sanitizeName(raw) : '';
}

/**
 * Persiste el nombre en `localStorage[STORAGE_KEY]` solo si es válido.
 *
 * Guarda `sanitizeName(raw)` bajo la clave `STORAGE_KEY` únicamente cuando
 * `isValidName(raw)` es `true`. Si la entrada es inválida (vacía tras sanitizar
 * o sin ningún carácter alfanumérico), no toca el storage (Requisito 5.3).
 *
 * Captura cualquier excepción de `localStorage` (modo privado, cuota excedida,
 * storage deshabilitado) registrando un `console.warn` y devolviendo `false`
 * sin propagar el error, de modo que el juego siga siendo jugable sin nombre
 * (Requisitos 5.4, 7.3). Sigue el patrón defensivo de `scoreStore.js`.
 *
 * @param {*} raw - valor crudo del campo de nombre (admite cualquier tipo)
 * @returns {boolean} `true` si se persistió el nombre; `false` si la entrada
 *   era inválida o si ocurrió un error de almacenamiento
 */
export function persistIfValid(raw) {
  if (!isValidName(raw)) return false;
  try {
    localStorage.setItem(STORAGE_KEY, sanitizeName(raw));
    return true;
  } catch (err) {
    console.warn('[playerName] No se pudo persistir el nombre:', err);
    return false;
  }
}

/**
 * Lee el nombre almacenado en `localStorage[STORAGE_KEY]`.
 *
 * Normaliza el valor leído a cadena. Devuelve `''` si la clave no existe, si el
 * valor almacenado no es utilizable, o si `localStorage` lanza una excepción
 * (modo privado, storage deshabilitado). En ese último caso registra un
 * `console.warn` sin propagar el error (Requisitos 5.2, 7.2, 10.2). Sigue el
 * patrón defensivo de `scoreStore.js`.
 *
 * @returns {string} el nombre almacenado normalizado a cadena, o `''`
 */
export function loadStoredName() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored == null) return '';
    return String(stored);
  } catch (err) {
    console.warn('[playerName] No se pudo leer el nombre almacenado:', err);
    return '';
  }
}

/**
 * Texto en español que describe cada causa de derrota, en dos variantes:
 * `withName` se combina con el nombre del jugador (empieza en minúscula para
 * encadenarse tras el nombre) y `generic` es la frase autónoma sin nombre.
 * Causa `'fall'` = caída de la torre; causa `'boss'` = derrota ante el guardián.
 */
const GAME_OVER_CAUSES = {
  fall: {
    withName: 'caíste de la torre',
    generic: 'Caíste de la torre',
  },
  boss: {
    withName: 'fuiste derrotado ante el guardián',
    generic: 'Fuiste derrotado ante el guardián',
  },
};

/**
 * Compone el texto de detalle de la pantalla de Game Over en español,
 * personalizándolo según haya o no un nombre activo (Requisitos 6.1, 6.2, 8.2).
 *
 * - Si el nombre activo es válido (no vacío tras `commitName`), el detalle
 *   incluye el nombre y el piso alcanzado.
 * - Si el nombre activo es vacío, el detalle es genérico: solo menciona el piso,
 *   sin bloque de nombre, y `playerName` se devuelve como `''`.
 *
 * Soporta las causas `'fall'` (caída de la torre) y `'boss'` (derrota ante el
 * guardián). Para cualquier otra causa se usa `'fall'` como valor por defecto.
 * El piso se coacciona a entero no negativo; entradas no numéricas se tratan
 * como `0`.
 *
 * @param {*} playerName - nombre activo de la partida (puede ser `''` o inválido)
 * @param {number} floor - piso alcanzado
 * @param {'fall'|'boss'} cause - causa de la derrota
 * @returns {{ detail: string, playerName: string }} detalle listo para mostrar y
 *   nombre sanitizado (o `''` si no hay nombre activo)
 */
export function formatGameOverDetail(playerName, floor, cause) {
  const activeName = commitName(playerName);
  const causeInfo = GAME_OVER_CAUSES[cause] || GAME_OVER_CAUSES.fall;

  const parsedFloor = Math.trunc(Number(floor));
  const safeFloor = Number.isFinite(parsedFloor) && parsedFloor > 0 ? parsedFloor : 0;

  const detail = activeName
    ? `${activeName}, ${causeInfo.withName} en el piso ${safeFloor}.`
    : `${causeInfo.generic} en el piso ${safeFloor}.`;

  return { detail, playerName: activeName };
}
