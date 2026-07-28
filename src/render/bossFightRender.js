/* ===== RENDER: Boss_Fight_Renderer =====
   Capa de dibujo específica de screen === 'boss'. Usa el Sprite_Animation_Engine
   (src/render/spriteEngine.js) para dibujar el Warrior_Sprite y el Boss_Sprite en
   el área de combate del canvas. Responsable únicamente de dibujar el estado
   actual: no decide cuándo cambiar de animación (eso vive en la orquestación de
   src/main.js). */

import { computeVerticalAnchorRatio } from './anchorRatio.js';

/**
 * Layout del área de combate, expresado como fracciones de W/H para que se
 * adapte a cualquier tamaño de canvas.
 */
export const COMBAT_LAYOUT = {
  warriorXRatio: 0.24, // centro del guerrero, como fracción del ancho del área de combate
  bossXRatio: 0.76,    // centro del boss, como fracción del ancho del área de combate
};

/** Desplazamiento vertical fijo (en píxeles) aplicado a ambos personajes al dibujar. */
const VERTICAL_OFFSET_PX = 70;

/** Desplazamiento vertical ADICIONAL exclusivo del Boss_Sprite (a sumar sobre VERTICAL_OFFSET_PX). */
const BOSS_EXTRA_VERTICAL_OFFSET_PX = 91;
/** Desplazamiento horizontal exclusivo del Boss_Sprite (negativo = hacia la izquierda). */
const BOSS_HORIZONTAL_OFFSET_PX = -100;
/** Desplazamiento horizontal exclusivo del Warrior_Sprite (positivo = hacia la derecha). */
const WARRIOR_HORIZONTAL_OFFSET_PX = 40;

/**
 * Ancho de canvas, en píxeles, para el cual `displayWidth`/`displayHeight` de
 * Sprite_Metadata fueron calibrados sin necesitar reducción (comportamiento de
 * escritorio actual).
 */
export const Reference_Canvas_Width = 800;

/**
 * Valor mínimo permitido para el Sprite_Scale_Factor, por debajo del cual un
 * Combat_Sprite dejaría de ser legible.
 */
export const Minimum_Scale_Factor = 0.55;

/**
 * Calcula el Sprite_Scale_Factor a partir del ancho actual del canvas `W`.
 *
 * - Si `W >= Reference_Canvas_Width`, devuelve `1` (sin reducción, paridad de
 *   escritorio).
 * - En otro caso, devuelve `W / Reference_Canvas_Width` clampado al rango
 *   `[Minimum_Scale_Factor, 1]`.
 * - `W <= 0` (entrada inválida, no debería ocurrir en producción) se trata
 *   como un ancho muy pequeño y se clampa a `Minimum_Scale_Factor` sin lanzar.
 *
 * Función pura, determinista y sin efectos secundarios.
 *
 * @param {number} W - ancho del canvas.
 * @returns {number} factor de escala dentro de `[Minimum_Scale_Factor, 1]`.
 */
export function computeSpriteScaleFactor(W) {
  if (W >= Reference_Canvas_Width) return 1;
  const ratio = W / Reference_Canvas_Width;
  return Math.min(1, Math.max(Minimum_Scale_Factor, ratio));
}

/**
 * Calcula las dimensiones de dibujo escaladas (Scaled_Display_Width/Height)
 * multiplicando `width`/`height` por `factor`.
 *
 * Función pura: recibe y devuelve valores planos, sin leer ni mutar ninguna
 * instancia de `SpriteAnimationEngine` (Requirement 2.2).
 *
 * @param {{ width: number, height: number }} dimensions - `displayWidth`/`displayHeight` de Sprite_Metadata.
 * @param {number} factor - Sprite_Scale_Factor a aplicar.
 * @returns {{ width: number, height: number }} dimensiones escaladas.
 */
export function scaleDimensions({ width, height }, factor) {
  return {
    width: width * factor,
    height: height * factor,
  };
}

/**
 * Escala un Combat_Layout_Offset (desplazamiento fijo en píxeles) por el
 * mismo Sprite_Scale_Factor usado para las dimensiones (Requirement 3.3).
 *
 * Función pura.
 *
 * @param {number} offsetPx - desplazamiento fijo sin escalar.
 * @param {number} factor - Sprite_Scale_Factor a aplicar.
 * @returns {number} desplazamiento escalado.
 */
export function scaleOffset(offsetPx, factor) {
  return offsetPx * factor;
}

/**
 * Calcula el origen de dibujo `(x, y)`, en coordenadas de pantalla (píxeles
 * reales), a partir de la línea de suelo compartida, el ratio horizontal del
 * Combat_Sprite, sus dimensiones ya escaladas y sus Combat_Layout_Offset sin
 * escalar (el escalado de los offsets se aplica internamente mediante
 * `scaleOffset`, Requirement 3.3).
 *
 * - `y` posiciona los pies del Combat_Sprite sobre `groundY`, calculado a
 *   partir de `scaledHeight` (Requirement 3.1).
 * - `x` centra el Combat_Sprite sobre `canvasWidth * xRatio`, calculado a
 *   partir de `scaledWidth` (Requirement 3.2).
 *
 * Función pura, sin efectos secundarios.
 *
 * @param {object} params
 * @param {number} params.groundY - línea de suelo compartida (`H * computeVerticalAnchorRatio(W, H)`).
 * @param {number} params.canvasWidth - ancho actual del canvas (`W`).
 * @param {number} params.xRatio - ratio horizontal del Combat_Sprite (`warriorXRatio`/`bossXRatio`).
 * @param {number} params.scaledWidth - `Scaled_Display_Width` del Combat_Sprite.
 * @param {number} params.scaledHeight - `Scaled_Display_Height` del Combat_Sprite.
 * @param {number} params.horizontalOffsetPx - Combat_Layout_Offset horizontal sin escalar.
 * @param {number} params.verticalOffsetPx - Combat_Layout_Offset vertical sin escalar.
 * @param {number} params.scaleFactor - Sprite_Scale_Factor a aplicar a los offsets.
 * @returns {{ x: number, y: number }} coordenadas de pantalla en píxeles reales.
 */
export function computeDrawOrigin({
  groundY,
  canvasWidth,
  xRatio,
  scaledWidth,
  scaledHeight,
  horizontalOffsetPx,
  verticalOffsetPx,
  scaleFactor,
}) {
  const y = groundY - scaledHeight + scaleOffset(verticalOffsetPx, scaleFactor);
  const x = canvasWidth * xRatio - scaledWidth / 2 + scaleOffset(horizontalOffsetPx, scaleFactor);
  return { x, y };
}

/**
 * Dibuja el fondo de combate (Battle_Background) estirado a pantalla completa
 * (Requirement 4.4).
 *
 * No-op seguro (no lanza) si `backgroundImage` es null/undefined, o si es un
 * HTMLImageElement que todavía no completó su carga (`!backgroundImage.complete`)
 * — evita dibujar una imagen a medio cargar o lanzar con dimensiones inválidas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W - ancho del canvas.
 * @param {number} H - alto del canvas.
 * @param {HTMLImageElement | null | undefined} backgroundImage
 */
export function drawBattleBackground(ctx, W, H, backgroundImage) {
  if (!backgroundImage) return;
  if (backgroundImage.complete === false) return;
  ctx.drawImage(backgroundImage, 0, 0, W, H);
}

/**
 * Dibuja el guerrero a la izquierda y el boss a la derecha (Requirement 3.1/3.2),
 * usando cada uno su propia instancia de Sprite_Animation_Engine y compartiendo
 * la misma línea base (`groundY`).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W - ancho del canvas.
 * @param {number} H - alto del canvas.
 * @param {import('./spriteEngine.js').SpriteAnimationEngine} warriorEngine
 * @param {import('./spriteEngine.js').SpriteAnimationEngine} bossEngine
 */
export function drawCombatants(ctx, W, H, warriorEngine, bossEngine) {
  const factor = computeSpriteScaleFactor(W);
  const groundY = H * computeVerticalAnchorRatio(W, H);

  const warriorDims = scaleDimensions(
    { width: warriorEngine.displayWidth, height: warriorEngine.displayHeight },
    factor
  );
  const warriorOrigin = computeDrawOrigin({
    groundY,
    canvasWidth: W,
    xRatio: COMBAT_LAYOUT.warriorXRatio,
    scaledWidth: warriorDims.width,
    scaledHeight: warriorDims.height,
    horizontalOffsetPx: WARRIOR_HORIZONTAL_OFFSET_PX,
    verticalOffsetPx: VERTICAL_OFFSET_PX,
    scaleFactor: factor,
  });

  ctx.save();
  ctx.scale(factor, factor);
  warriorEngine.draw(ctx, warriorOrigin.x / factor, warriorOrigin.y / factor);
  ctx.restore();

  const bossDims = scaleDimensions(
    { width: bossEngine.displayWidth, height: bossEngine.displayHeight },
    factor
  );
  const bossOrigin = computeDrawOrigin({
    groundY,
    canvasWidth: W,
    xRatio: COMBAT_LAYOUT.bossXRatio,
    scaledWidth: bossDims.width,
    scaledHeight: bossDims.height,
    horizontalOffsetPx: BOSS_HORIZONTAL_OFFSET_PX,
    verticalOffsetPx: VERTICAL_OFFSET_PX + BOSS_EXTRA_VERTICAL_OFFSET_PX,
    scaleFactor: factor,
  });

  ctx.save();
  ctx.scale(factor, factor);
  bossEngine.draw(ctx, bossOrigin.x / factor, bossOrigin.y / factor);
  ctx.restore();
}

/**
 * Avanza ambos motores de animación un paso de tiempo `dt`, independientemente
 * de si hay una Combat_Reaction en curso para alguno de los dos (Requirement 2.4).
 *
 * @param {number} dt - milisegundos transcurridos desde el último tick.
 * @param {import('./spriteEngine.js').SpriteAnimationEngine} warriorEngine
 * @param {import('./spriteEngine.js').SpriteAnimationEngine} bossEngine
 */
export function updateCombatants(dt, warriorEngine, bossEngine) {
  warriorEngine.update(dt);
  bossEngine.update(dt);
}
