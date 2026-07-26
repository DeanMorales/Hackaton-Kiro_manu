/* ===== UI: controlador puro de la Modal_Pregunta ===== */
/**
 * Controlador de estado de la Modal_Pregunta, sin dependencias del DOM.
 *
 * Aísla la lógica de decisión (qué Tarjeta está expandida, rechazo de Tarjetas
 * bloqueadas o de combate resuelto, y construcción del contenido de la modal)
 * para poder verificarla con tests basados en propiedades.
 *
 * Modelo de estado:
 *   ModalState = { expandedIdx: number | null }
 *
 * La cardinalidad escalar de `expandedIdx` impone estructuralmente el invariante
 * de "a lo sumo una modal abierta" (R1.7): nunca hay más de un índice expandido.
 */

/**
 * Crea el estado inicial del controlador (ninguna modal abierta).
 *
 * @returns {{ expandedIdx: null }}
 */
export function createModalState() {
  return { expandedIdx: null };
}

/**
 * Decide la apertura de la Modal_Pregunta para la Tarjeta `idx`.
 *
 * Devuelve `action:'open'` con `expandedIdx = idx` si y solo si:
 *   - `resolved` es falso (el combate no está resuelto),
 *   - `idx` es un índice válido dentro de `cards`, y
 *   - `cards[idx].locked` es falso (la Tarjeta no está bloqueada).
 * En cualquier otro caso devuelve `action:'ignore'` sin mutar el estado recibido.
 * Una apertura válida sobrescribe cualquier `expandedIdx` previo, garantizando
 * a lo sumo una modal abierta a la vez.
 *
 * @param {{expandedIdx:number|null}} state - Estado actual del controlador.
 * @param {Array<{locked?:boolean}>} cards - Colección de Tarjetas del combate.
 * @param {number} idx - Índice de la Tarjeta a expandir.
 * @param {boolean} resolved - Si el combate ya está resuelto.
 * @returns {{ state: {expandedIdx:number|null}, action: 'open'|'ignore' }}
 */
export function computeOpen(state, cards, idx, resolved) {
  const validIndex =
    Array.isArray(cards) &&
    Number.isInteger(idx) &&
    idx >= 0 &&
    idx < cards.length;
  const card = validIndex ? cards[idx] : undefined;
  const canOpen =
    resolved !== true &&
    validIndex &&
    card !== undefined &&
    card !== null &&
    card.locked !== true;

  if (!canOpen) {
    // Estado sin cambios: se devuelve el mismo estado recibido.
    return { state, action: 'ignore' };
  }

  // Apertura válida: nuevo estado con el índice expandido (sobrescribe el previo).
  return { state: { expandedIdx: idx }, action: 'open' };
}

/**
 * Decide el cierre de la Modal_Pregunta. Siempre deja `expandedIdx = null`.
 *
 * Devuelve `action:'close'` si había una modal abierta, o `action:'noop'` si ya
 * estaba cerrada. En ambos casos el estado resultante tiene `expandedIdx === null`,
 * lo que implica que el fondo recupera su nitidez (blur 0).
 *
 * @param {{expandedIdx:number|null}} state - Estado actual del controlador.
 * @returns {{ state: {expandedIdx:null}, action: 'close'|'noop' }}
 */
export function computeClose(state) {
  const wasOpen = state != null && state.expandedIdx !== null && state.expandedIdx !== undefined;
  return { state: { expandedIdx: null }, action: wasOpen ? 'close' : 'noop' };
}

/**
 * Construye el modelo de contenido de la Modal_Pregunta a partir de una Tarjeta,
 * preservando el texto de la pregunta y el orden de las opciones.
 *
 * Es una proyección de solo lectura de `card.question`: copia `card.question.text`
 * y `[...card.question.options]` sin reordenar y sin persistir `correct`.
 *
 * @param {{question:{text:string, options:string[]}}} card - Tarjeta de combate.
 * @returns {{ text: string, options: string[] }}
 */
export function buildModalContent(card) {
  const question = card.question;
  return {
    text: question.text,
    options: [...question.options],
  };
}
