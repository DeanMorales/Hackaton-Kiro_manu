/* ===== RENDER: Boss_Fight_Renderer =====
   Capa de dibujo específica de screen === 'boss'. Usa el Sprite_Animation_Engine
   (src/render/spriteEngine.js) para dibujar el Warrior_Sprite y el Boss_Sprite en
   el área de combate del canvas. Responsable únicamente de dibujar el estado
   actual: no decide cuándo cambiar de animación (eso vive en la orquestación de
   src/main.js). */

/**
 * Layout del área de combate, expresado como fracciones de W/H para que se
 * adapte a cualquier tamaño de canvas.
 */
export const COMBAT_LAYOUT = {
  warriorXRatio: 0.24, // centro del guerrero, como fracción del ancho del área de combate
  bossXRatio: 0.76,    // centro del boss, como fracción del ancho del área de combate
  groundYRatio: 0.62,  // línea base compartida, como fracción de H
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
  const groundY = H * COMBAT_LAYOUT.groundYRatio;

  warriorEngine.draw(
    ctx,
    W * COMBAT_LAYOUT.warriorXRatio - warriorEngine.displayWidth / 2 + WARRIOR_HORIZONTAL_OFFSET_PX,
    groundY - warriorEngine.displayHeight + VERTICAL_OFFSET_PX
  );
  bossEngine.draw(
    ctx,
    W * COMBAT_LAYOUT.bossXRatio - bossEngine.displayWidth / 2 + BOSS_HORIZONTAL_OFFSET_PX,
    groundY - bossEngine.displayHeight + VERTICAL_OFFSET_PX + BOSS_EXTRA_VERTICAL_OFFSET_PX
  );
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
