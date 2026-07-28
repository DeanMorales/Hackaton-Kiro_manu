/* ===== RENDER: Anchor_Ratio =====
   Módulo puro y compartido que centraliza la detección de Landscape_Mobile_Mode
   y la resolución del Vertical_Anchor_Ratio. Es la única fuente de verdad para
   el umbral y los dos valores de ratio, consumida tanto por Tower_Camera
   (src/render/draw.js, vía elevToScreen) como por Combat_Ground_Anchor
   (src/render/bossFightRender.js, vía drawCombatants), garantizando que ambos
   subsistemas compartan siempre el mismo ratio para el mismo W/H. */

/** Vertical_Anchor_Ratio usado cuando Landscape_Mobile_Mode NO está activo. */
export const DEFAULT_VERTICAL_ANCHOR_RATIO = 0.62;

/** Vertical_Anchor_Ratio usado cuando Landscape_Mobile_Mode SÍ está activo. */
export const LANDSCAPE_VERTICAL_ANCHOR_RATIO = 0.75;

/**
 * Umbral de alto de viewport (en píxeles), en landscape, por debajo o igual
 * al cual el viewport se considera móvil a efectos de Landscape_Mobile_Mode,
 * en lugar de tablet/escritorio.
 */
export const LANDSCAPE_HEIGHT_THRESHOLD = 520;

/**
 * Landscape_Mobile_Mode: activo cuando `W` es mayor que `H` (orientación
 * landscape) AND `H` es menor o igual a `LANDSCAPE_HEIGHT_THRESHOLD`
 * (viewport lo bastante bajo como para considerarse móvil en vez de
 * tablet/escritorio).
 *
 * `W <= 0` o `H <= 0` (no debería ocurrir en producción, ya que el canvas
 * siempre reporta dimensiones positivas) se evalúan con la misma comparación
 * aritmética sin lanzar excepción; el resultado para esos casos degenerados
 * queda fuera de alcance.
 *
 * Función pura, sin efectos secundarios.
 *
 * @param {number} W - ancho del canvas.
 * @param {number} H - alto del canvas.
 * @returns {boolean} `true` si Landscape_Mobile_Mode está activo.
 */
export function isLandscapeMobileMode(W, H) {
  return W > H && H <= LANDSCAPE_HEIGHT_THRESHOLD;
}

/**
 * Vertical_Anchor_Ratio a usar para el frame actual, dado el ancho/alto
 * actuales del canvas. Única fuente de verdad compartida por Tower_Camera
 * (elevToScreen, vía render()) y Combat_Ground_Anchor (drawCombatants()).
 *
 * Función pura, determinista y sin efectos secundarios.
 *
 * @param {number} W - ancho del canvas.
 * @param {number} H - alto del canvas.
 * @returns {number} `LANDSCAPE_VERTICAL_ANCHOR_RATIO` (0.75) si
 *   Landscape_Mobile_Mode está activo, si no `DEFAULT_VERTICAL_ANCHOR_RATIO`
 *   (0.62).
 */
export function computeVerticalAnchorRatio(W, H) {
  return isLandscapeMobileMode(W, H)
    ? LANDSCAPE_VERTICAL_ANCHOR_RATIO
    : DEFAULT_VERTICAL_ANCHOR_RATIO;
}
