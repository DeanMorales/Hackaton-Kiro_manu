/* ===== RENDER: dibujo del mundo de juego en canvas ===== */

import * as bossFightRender from './bossFightRender.js';
import { DEFAULT_VERTICAL_ANCHOR_RATIO, computeVerticalAnchorRatio } from './anchorRatio.js';

export function elevToScreen(camElev, elev, H, ratio = DEFAULT_VERTICAL_ANCHOR_RATIO) {
  return H * ratio - (elev - camElev);
}

export function drawSky(ctx, W, H, clouds, activeBiome, activeTimeOfDay) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  activeTimeOfDay.skyGradientStops.forEach(([offset, color]) => g.addColorStop(offset, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // sun/moon cue
  drawSunMoonCue(ctx, W, H, activeTimeOfDay.sunMoonCue);

  // stars
  if (activeTimeOfDay.starVisibility) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97 + 31) % W;
      const sy = (i * 53 + 17) % (H * 0.5);
      const tw = 0.5 + 0.5 * Math.sin((performance.now() / 600) + i);
      ctx.globalAlpha = 0.25 + 0.4 * tw;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // clouds drift with camera slightly (parallax)
  ctx.fillStyle = activeTimeOfDay.cloudColor;
  clouds.forEach(c => {
    const cx = ((c.x * W) + (performance.now() * 0.006 * c.speed)) % (W + 160) - 80;
    drawCloud(ctx, cx, c.y, c.r);
  });

  // distant hills
  ctx.fillStyle = activeBiome.hillColor;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 40) {
    ctx.lineTo(x, H - 70 - 18 * Math.sin(x * 0.01 + 2));
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

export function drawSunMoonCue(ctx, W, H, cue) {
  const cx = cue.xRatio * W, cy = cue.yRatio * H;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cue.radius * 2.2);
  grad.addColorStop(0, cue.color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, cue.radius * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cue.color;
  ctx.beginPath(); ctx.arc(cx, cy, cue.radius * 0.55, 0, Math.PI * 2); ctx.fill();
}

export function drawCloud(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.6, cy + r * 0.1, r * 0.5, 0, Math.PI * 2);
  ctx.arc(cx - r * 0.55, cy + r * 0.15, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

export function seededRand(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

export function drawFacetedBlock(ctx, x, yTop, w, h, seed, palette, isDoor) {
  // base gradient
  const g = ctx.createLinearGradient(x, yTop, x + w, yTop + h);
  g.addColorStop(0, palette[0]);
  g.addColorStop(1, palette[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x, yTop, w, h);

  // low-poly facet triangles for texture
  const cols = Math.max(2, Math.round(w / 34));
  const cellW = w / cols;
  for (let i = 0; i < cols; i++) {
    const fx = x + i * cellW;
    const jitter = (seededRand(seed + i) - 0.5) * h * 0.4;
    ctx.fillStyle = (i % 2 === 0) ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)';
    ctx.beginPath();
    ctx.moveTo(fx, yTop);
    ctx.lineTo(fx + cellW, yTop + jitter * 0.2);
    ctx.lineTo(fx + cellW * 0.5, yTop + h * 0.5 + jitter);
    ctx.closePath();
    ctx.fill();
  }
  // mortar edge
  ctx.strokeStyle = 'rgba(20,24,34,.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, yTop + 1, w - 2, h - 2);

  if (isDoor) {
    const dw = Math.min(w * 0.42, 60), dh = Math.min(h * 0.86, 70);
    const dx = x + w / 2 - dw / 2, dy = yTop + h - dh;
    ctx.fillStyle = '#6b4226';
    ctx.beginPath();
    ctx.moveTo(dx, dy + dh);
    ctx.lineTo(dx, dy + dh * 0.35);
    ctx.quadraticCurveTo(dx, dy, dx + dw / 2, dy);
    ctx.quadraticCurveTo(dx + dw, dy, dx + dw, dy + dh * 0.35);
    ctx.lineTo(dx + dw, dy + dh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#f2a641';
    ctx.beginPath(); ctx.arc(dx + dw * 0.78, dy + dh * 0.55, 2.6, 0, Math.PI * 2); ctx.fill();
    // small flag to signal a boss awaits
    ctx.fillStyle = '#e2493a';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, yTop - 26); ctx.lineTo(x + w / 2, yTop - 2);
    ctx.moveTo(x + w / 2, yTop - 26); ctx.lineTo(x + w / 2 + 18, yTop - 19); ctx.lineTo(x + w / 2, yTop - 12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + w / 2, yTop - 26); ctx.lineTo(x + w / 2, yTop - 2); ctx.stroke();
  }

  // torches at floor edges
  drawTorch(ctx, x - 6, yTop + h * 0.3, seed);
  drawTorch(ctx, x + w - 6, yTop + h * 0.3, seed + 7);
}

export function drawTorch(ctx, tx, ty, seed) {
  ctx.fillStyle = '#5b3a24';
  ctx.fillRect(tx - 2, ty, 4, 16);
  const flick = 0.6 + 0.4 * Math.sin(performance.now() / 120 + seed);
  const grad = ctx.createRadialGradient(tx, ty - 6, 0, tx, ty - 6, 12 * flick);
  grad.addColorStop(0, 'rgba(255,196,102,.9)');
  grad.addColorStop(1, 'rgba(255,196,102,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(tx, ty - 6, 12 * flick, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2a641';
  ctx.beginPath();
  ctx.moveTo(tx, ty - 2 - 8 * flick);
  ctx.quadraticCurveTo(tx + 5, ty - 6, tx, ty - 14 * flick);
  ctx.quadraticCurveTo(tx - 5, ty - 6, tx, ty - 2 - 8 * flick);
  ctx.fill();
}

// ── Gradiente de color para los bloques apilados ──────────────────────────────
// El gradiente oscila como péndulo infinito cada 30 pisos, empezando en #FFFFFF:
//   Pisos   1-30 : #FFFFFF → #2E3A46
//   Pisos  31-60 : #2E3A46 → #FFFFFF
//   Pisos  61-90 : #FFFFFF → #2E3A46  …y así sin límite.
const AWS_GRADIENT = [
  '#2E3A46','#26387D','#1D35B5','#1533EC','#0E48C8',
  '#075DA5','#007281','#19578A','#313B92','#4A209B',
  '#864867','#C37134','#FF9900','#FFBB55','#FFDDAA','#FFFFFF',
];
const AWS_GRADIENT_MAX_FLOOR = 30; // pisos por ciclo de gradiente

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF];
}

function lerpRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Devuelve el color hex para un piso dado (1-indexed).
 * El gradiente oscila infinitamente cada AWS_GRADIENT_MAX_FLOOR pisos,
 * empezando en #FFFFFF (dirección opuesta al array):
 *   ciclo par  (0, 2, 4…): AWS_GRADIENT[last] → AWS_GRADIENT[0]  (#FFFFFF → #2E3A46)
 *   ciclo impar (1, 3, 5…): AWS_GRADIENT[0] → AWS_GRADIENT[last] (#2E3A46 → #FFFFFF)
 */
export function getFloorColor(floorIndex) {
  const stops    = AWS_GRADIENT.length;          // 16
  const cycle    = AWS_GRADIENT_MAX_FLOOR;       // 30 pisos por ciclo
  // posición dentro del ciclo actual (0 … cycle-1)
  const pos0     = (floorIndex - 1) % cycle;
  // número de ciclo completo (0-based)
  const cycleNum = Math.floor((floorIndex - 1) / cycle);
  // t normalizado 0→1 dentro del ciclo
  let t = pos0 / (cycle - 1);
  // ciclos pares van #FFFFFF→#2E3A46 (t invertido respecto al array)
  // ciclos impares van #2E3A46→#FFFFFF (dirección normal del array)
  if (cycleNum % 2 === 0) t = 1 - t;
  // mapear t al array de paradas
  const pos  = t * (stops - 1);
  const lo   = Math.floor(pos);
  const hi   = Math.min(stops - 1, lo + 1);
  const frac = pos - lo;
  return rgbToHex(lerpRgb(hexToRgb(AWS_GRADIENT[lo]), hexToRgb(AWS_GRADIENT[hi]), frac));
}

/**
 * Genera una paleta [colorClaro, colorOscuro] para drawFacetedBlock.
 */
export function floorPalette(floorIndex) {
  const base = getFloorColor(floorIndex);
  const [r, g, b] = hexToRgb(base);
  const dark = rgbToHex([Math.round(r * 0.65), Math.round(g * 0.65), Math.round(b * 0.65)]);
  return [base, dark];
}

/**
 * Dibuja la banda de suelo (Ground_Visual) que ancla la torre al fondo,
 * desde el borde inferior de baseFloor hasta el borde inferior del canvas,
 * ocupando todo el ancho visible.
 */
export function drawGround(ctx, W, H, camElev, baseFloor, activeBiome, ratio = DEFAULT_VERTICAL_ANCHOR_RATIO) {
  if (!baseFloor) return;
  const groundY = elevToScreen(camElev, baseFloor.bottom, H, ratio);
  const bandTop = Math.min(groundY, H);
  if (bandTop >= H) return;

  const g = ctx.createLinearGradient(0, bandTop, 0, H);
  g.addColorStop(0, activeBiome.groundColors[0]);
  g.addColorStop(1, activeBiome.groundColors[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, bandTop, W, H - bandTop);

  drawVegetationCues(ctx, W, bandTop, H, activeBiome.vegetationCue);
}

/**
 * Distribuye señales de vegetación (Requirement 8.1, 8.2, 8.4, 8.5) a lo ancho
 * de la banda del Ground_Visual. No-op para 'none' (Tundra/Desierto).
 */
function drawVegetationCues(ctx, W, bandTop, H, cue) {
  if (cue === 'none') return;
  const count = Math.max(6, Math.round(W / 90));
  for (let i = 0; i < count; i++) {
    const fx = (i + 0.5) * (W / count);
    const jitter = seededRand(i * 13.7) * (H - bandTop) * 0.4;
    const fy = bandTop + jitter;
    drawVegetationCue(ctx, fx, fy, cue, i);
  }
}

/**
 * Dibuja una única señal de vegetación en (x, y), low-poly, consistente con
 * el estilo de facetas de drawFacetedBlock. `seed` varía tamaño/forma.
 */
function drawVegetationCue(ctx, x, y, cue, seed) {
  if (cue === 'dryGrassTufts') {
    // Sabana: 3 briznas finas y altas, tono seco amarillento
    const s = 9 + seededRand(seed) * 7;
    ctx.fillStyle = '#c9a227';
    for (let i = 0; i < 3; i++) {
      const lean = (seededRand(seed + i * 3.1) - 0.5) * s * 0.9;
      const baseOffset = (i - 1) * s * 0.3;
      const tipX = x + baseOffset + lean;
      const tipY = y - s * (0.85 + seededRand(seed + i * 1.7) * 0.35);
      const baseW = 1.4 + seededRand(seed + i * 2.2) * 0.9;
      ctx.beginPath();
      ctx.moveTo(x + baseOffset - baseW, y);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(x + baseOffset + baseW, y);
      ctx.closePath();
      ctx.fill();
    }
  } else if (cue === 'bushes') {
    // Bosque_Templado: clump redondeado (dos semicírculos superpuestos), verde
    ctx.fillStyle = '#2f6b2f';
    const r = 7 + seededRand(seed) * 5;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    const r2 = r * (0.6 + seededRand(seed + 4.4) * 0.3);
    const dx = (seededRand(seed + 5.5) - 0.5) * r * 1.1;
    ctx.beginPath();
    ctx.arc(x + dx, y, r2, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  } else if (cue === 'conifers') {
    // Taiga: silueta de pino apilado (3 triángulos escalonados), verde oscuro,
    // distinta de la forma redondeada de 'bushes'
    ctx.fillStyle = '#1f3d2f';
    const h = 16 + seededRand(seed) * 9;
    const w = h * 0.52;
    const tiers = 3;
    for (let t = 0; t < tiers; t++) {
      const tierH = h / tiers;
      const tierTop = y - h + t * tierH;
      const tierW = w * (1 - t * 0.22);
      ctx.beginPath();
      ctx.moveTo(x, tierTop);
      ctx.lineTo(x - tierW / 2, tierTop + tierH * 1.3);
      ctx.lineTo(x + tierW / 2, tierTop + tierH * 1.3);
      ctx.closePath();
      ctx.fill();
    }
    // tronco corto
    ctx.fillStyle = '#3a2a1f';
    ctx.fillRect(x - w * 0.06, y - h * 0.12, w * 0.12, h * 0.14);
  }
}

export function drawTower(ctx, W, H, camElev, floors, ratio = DEFAULT_VERTICAL_ANCHOR_RATIO) {
  floors.forEach((f, i) => {
    const yTop = elevToScreen(camElev, f.top, H, ratio);
    const yBot = elevToScreen(camElev, f.bottom, H, ratio);
    if (yBot < -60 || yTop > H + 60) return;
    // i=0 es la plataforma base; i>=1 son pisos colocados con gradiente AWS.
    const palette = i === 0
      ? ['#3a4554', '#2a3340']
      : floorPalette(i);
    drawFacetedBlock(ctx, f.x, yTop, f.width, yBot - yTop, f.seed * 1000, palette, f.isDoor);
  });
}

export function drawMovingBlock(ctx, W, H, camElev, screen, floors, moving, knightAnimating, ratio = DEFAULT_VERTICAL_ANCHOR_RATIO) {
  if (screen !== 'build' || !moving || knightAnimating) return;
  const tf = floors[floors.length - 1];
  const m = moving;
  const yTop = elevToScreen(camElev, tf.top + m.height, H, ratio);
  const DOOR_INTERVAL = 5;
  const nextIsDoor = floors.length % DOOR_INTERVAL === 0;
  // El bloque muestra el color que tendrá una vez apilado: floors.length es su índice 1-based.
  const palette = nextIsDoor ? ['#e8c96b', '#b9932f'] : floorPalette(floors.length);
  drawFacetedBlock(ctx, m.x, yTop, m.width, m.height, 42, palette, false);
  if (nextIsDoor) {
    ctx.fillStyle = 'rgba(242,166,65,.9)';
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('¡puerta!', m.x + m.width / 2, yTop - 4);
  }
}

export function drawKnight(ctx, topFloorRef, knight, camElev, H, ratio = DEFAULT_VERTICAL_ANCHOR_RATIO) {
  if (!topFloorRef) return;
  let cx = topFloorRef.x + topFloorRef.width / 2;
  let feetY;
  let wobble = 0;

  if (knight.falling) {
    const t = Math.min(1, (performance.now() - knight.fallStart) / knight.fallDur);
    feetY = elevToScreen(camElev, knight.elev, H, ratio) + t * t * 260;
    cx += t * 70;
    wobble = t * Math.PI * 1.4;
    ctx.globalAlpha = 1 - t * 0.7;
  } else {
    feetY = elevToScreen(camElev, knight.elev, H, ratio);
  }

  ctx.save();
  ctx.translate(cx, feetY);
  if (wobble) ctx.rotate(wobble);

  // legs
  ctx.fillStyle = '#1a2036';
  ctx.fillRect(-13, -26, 10, 26);
  ctx.fillRect(3, -26, 10, 26);
  // body
  const bodyGrad = ctx.createLinearGradient(-18, -72, 18, -26);
  bodyGrad.addColorStop(0, '#4fb3b3'); bodyGrad.addColorStop(1, '#1f6363');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-16, -72); ctx.lineTo(16, -72); ctx.lineTo(19, -58); ctx.lineTo(15, -26); ctx.lineTo(-15, -26); ctx.lineTo(-19, -58);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d9b34d'; ctx.lineWidth = 2; ctx.stroke();
  // shoulders
  ctx.fillStyle = '#d9b34d';
  ctx.beginPath(); ctx.moveTo(-24, -64); ctx.lineTo(-14, -72); ctx.lineTo(-14, -52); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(24, -64); ctx.lineTo(14, -72); ctx.lineTo(14, -52); ctx.closePath(); ctx.fill();
  // sword
  ctx.save(); ctx.translate(20, -58); ctx.rotate(0.35);
  ctx.fillStyle = '#dfe6ea'; ctx.fillRect(-3, -40, 6, 40);
  ctx.fillStyle = '#d9b34d'; ctx.fillRect(-7, 0, 14, 5);
  ctx.restore();
  // head
  const headGrad = ctx.createLinearGradient(-12, -96, 12, -72);
  headGrad.addColorStop(0, '#e8c98a'); headGrad.addColorStop(1, '#b5895a');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(0, -98); ctx.lineTo(12, -90); ctx.lineTo(10, -74); ctx.lineTo(-10, -74); ctx.lineTo(-12, -90);
  ctx.closePath(); ctx.fill();

  ctx.restore();
  ctx.globalAlpha = 1;
}

export function render(ctx, W, H, gameState, combatUiState) {
  const ratio = computeVerticalAnchorRatio(W, H);
  drawSky(ctx, W, H, gameState.clouds, gameState.activeBiome, gameState.activeTimeOfDay);
  drawGround(ctx, W, H, gameState.camElev, gameState.floors[0], gameState.activeBiome, ratio);
  drawTower(ctx, W, H, gameState.camElev, gameState.floors, ratio);
  drawMovingBlock(ctx, W, H, gameState.camElev, gameState.screen, gameState.floors, gameState.moving, gameState.knight.animating, ratio);
  if (gameState.screen === 'build' || gameState.screen === 'falling') {
    const topFloorRef = gameState.floors[gameState.floors.length - 1];
    drawKnight(ctx, topFloorRef, gameState.knight, gameState.camElev, H, ratio);
  }
  if (gameState.screen === 'boss' && combatUiState) {
    bossFightRender.updateCombatants(gameState.lastDt || 0, combatUiState.warriorEngine, combatUiState.bossEngine);
    bossFightRender.drawBattleBackground(ctx, W, H, combatUiState.backgroundImage);
    bossFightRender.drawCombatants(ctx, W, H, combatUiState.warriorEngine, combatUiState.bossEngine);
  }
}
