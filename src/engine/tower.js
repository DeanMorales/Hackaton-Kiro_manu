/* =========================================================
   ENGINE: estado y física de la torre
   ========================================================= */
export const DOOR_INTERVAL = 5;
export const BASE_WIDTH = 210;
export const MIN_WIDTH = 46;

// --- tower-progression-scaling: constantes de progresión ---
export const BASE_PLATFORM_WIDTH = BASE_WIDTH * 3; // 630px, Requirement 1.1
export const SPEED_INCREMENT_FACTOR = 1.30;          // Requirement 2/3
export const BASE_SPEED = 1.6;                       // Velocidad_Base original (sin *floors.length)

// Requirement 1.1 / 1.3 / 1.4: ancho fijo de la Plataforma Base
export function computeBasePlatformWidth() {
  return BASE_PLATFORM_WIDTH; // 630, constante pura sin inputs
}

// Requirement 2.1 / 2.2 / 3.1 / 3.2 / 3.3: incremento compuesto de velocidad
export function applySpeedBoost(currentSpeed) {
  return currentSpeed * SPEED_INCREMENT_FACTOR;
}

// --- funciones puras extraídas para PBT (Requirement 1.2) ---

export function computeOverlap(prevFloor, movingBlock) {
  const left = Math.max(movingBlock.x, prevFloor.x);
  const right = Math.min(movingBlock.x + movingBlock.width, prevFloor.x + prevFloor.width);
  return right - left;
}

export function decidesFall(overlap) {
  return overlap < 16;
}

export function computeNewFloor(prevFloor, movingBlock, isDoor, seed) {
  const left = Math.max(movingBlock.x, prevFloor.x);
  const right = Math.min(movingBlock.x + movingBlock.width, prevFloor.x + prevFloor.width);
  const overlap = right - left;
  return {
    bottom: prevFloor.top, top: prevFloor.top + movingBlock.height,
    x: left, width: overlap, height: movingBlock.height, isDoor, seed,
  };
}

export function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

// --- mutadores de estado equivalentes a los del monolito ---

export function createTowerState(width, height) {
  const baseFloor = {
    bottom: 0,
    top: 64,
    x: (width - computeBasePlatformWidth()) / 2,
    width: computeBasePlatformWidth(),
    height: 64,
    isDoor: false,
    seed: Math.random(),
  };
  
  const clouds = Array.from({length: 7}, (_, i) => ({
    x: Math.random() * 1,
    y: 40 + Math.random() * 260,
    r: 30 + Math.random() * 40,
    speed: 0.15 + Math.random() * 0.2,
    seed: Math.random() * 1000,
  }));

  return {
    screen: 'start', // start | build | boss | gameover | falling
    floors: [baseFloor],
    moving: null,
    moveSpeed: BASE_SPEED, // Requirement 1.5 / 3.4: velocidad persistente en el estado
    camElev: baseFloor.top,
    camElevTarget: baseFloor.top,
    anchorScreenY: height * 0.62,
    knight: {
      elev: baseFloor.top,
      animating: false,
      fromElev: 0,
      toElev: 0,
      animStart: 0,
      animDur: 340,
      falling: false,
      fallStart: 0,
      fallDur: 900,
      fallX: 0,
    },
    doorsPassed: 0,
    pendingBossLevel: 0,
    lastTs: 0,
    clouds,
    torchSeed: Math.random() * 1000,
  };
}

export function topFloor(state) {
  return state.floors[state.floors.length - 1];
}

export function newMovingBlock(state, afterFloor) {
  const h = 34 + Math.random() * 20; // 34-54
  const w = Math.max(MIN_WIDTH, Math.min(afterFloor.width, afterFloor.width - Math.random() * 10));
  return {
    x: afterFloor.x,
    y: 0,
    width: w,
    height: h,
    dir: 1,
    speed: state.moveSpeed, // Requirement 2.4: velocidad persistida en el estado
    minX: Math.max(0, afterFloor.x - 90),
    maxX: Math.min(/* width not available here, will be passed from main */ afterFloor.x + afterFloor.width + 90) - w,
  };
}

export function resetGame(state, width, height) {
  const baseFloor = {
    bottom: 0,
    top: 64,
    x: (width - computeBasePlatformWidth()) / 2,
    width: computeBasePlatformWidth(),
    height: 64,
    isDoor: false,
    seed: Math.random(),
  };
  
  state.screen = 'start';
  state.floors = [baseFloor];
  state.moveSpeed = BASE_SPEED; // Requirement 3.4: reiniciar velocidad al reconstruir
  state.camElevTarget = baseFloor.top;
  state.camElev = baseFloor.top;
  state.anchorScreenY = height * 0.62;
  state.knight.elev = baseFloor.top;
  state.knight.animating = false;
  state.knight.falling = false;
  state.doorsPassed = 0;
  state.pendingBossLevel = 0;
  state.moving = newMovingBlock(state, baseFloor);
  state.clouds = Array.from({length: 7}, (_, i) => ({
    x: Math.random() * 1,
    y: 40 + Math.random() * 260,
    r: 30 + Math.random() * 40,
    speed: 0.15 + Math.random() * 0.2,
    seed: Math.random() * 1000,
  }));
  
  // Fix maxX now that we have width
  state.moving.maxX = Math.min(width, baseFloor.x + baseFloor.width + 90) - state.moving.width;
}

export function updateDoorCounter(state) {
  const placed = state.floors.length - 1;
  let remain = DOOR_INTERVAL - (placed % DOOR_INTERVAL);
  if (remain === DOOR_INTERVAL && placed === 0) remain = DOOR_INTERVAL;
  return { placed, remain };
}

export function dropBlock(state, width) {
  if (state.screen !== 'build') return null;
  if (!state.moving) return null;
  if (state.knight.animating || state.knight.falling) return null;

  const prev = topFloor(state);
  const moving = state.moving;
  const overlap = computeOverlap(prev, moving);

  if (decidesFall(overlap)) {
    return { type: 'fell', floorNum: state.floors.length - 1 };
  }

  const willBeDoor = state.floors.length % DOOR_INTERVAL === 0;
  const newFloor = computeNewFloor(prev, moving, willBeDoor, Math.random());
  state.floors.push(newFloor);

  // knight climbs to the new floor
  state.knight.animating = true;
  state.knight.fromElev = state.knight.elev;
  state.knight.toElev = newFloor.top;
  state.knight.animStart = performance.now();
  state.pendingBossLevel = newFloor.isDoor ? (state.doorsPassed + 1) : 0;

  // prepare next moving block
  const nextMoving = newMovingBlock(state, newFloor);
  nextMoving.maxX = Math.min(width, newFloor.x + newFloor.width + 90) - nextMoving.width;
  state.moving = nextMoving;

  return {
    type: 'placed',
    floor: newFloor,
    isDoor: willBeDoor,
    willTriggerBoss: willBeDoor,
    floorNum: state.floors.length - 1,
    doorIn: updateDoorCounter(state).remain,
  };
}

// Requirement 2.1 / 2.2 / 2.3: aplicar incremento de velocidad tras ganar un duelo
export function applyDuelWinSpeedBoost(state) {
  state.moveSpeed = applySpeedBoost(state.moveSpeed);
  return state.moveSpeed;
}

export function triggerFall(state, now) {
  state.screen = 'falling';
  state.knight.falling = true;
  state.knight.fallStart = now;
  state.knight.fallX = 0;
}

export function update(state, dt, now, width) {
  // camera smoothing
  const tf = topFloor(state);
  if (tf) state.camElevTarget = tf.top;
  state.camElev += (state.camElevTarget - state.camElev) * Math.min(1, dt * 0.006);

  if (state.screen === 'build' && state.moving && !state.knight.animating) {
    const m = state.moving;
    m.x += m.dir * m.speed * (dt / 16);
    if (m.x < m.minX) { m.x = m.minX; m.dir = 1; }
    if (m.x > m.maxX) { m.x = m.maxX; m.dir = -1; }
  }

  if (state.knight.animating) {
    const t = Math.min(1, (now - state.knight.animStart) / state.knight.animDur);
    state.knight.elev = state.knight.fromElev + (state.knight.toElev - state.knight.fromElev) * easeOutQuad(t);
    if (t >= 1) {
      state.knight.animating = false;
      // Return indication that boss should start if pending
      if (state.pendingBossLevel > 0) {
        return { shouldStartBoss: true, level: state.pendingBossLevel };
      }
    }
  }

  return { shouldStartBoss: false };
}
