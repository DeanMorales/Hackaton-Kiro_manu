/* ===== CELEBRATION SYSTEM — Visual feedback for milestone floors ===== */

// Duración del overlay de celebración en milisegundos
export const CONFETTI_DURATION_MS = 3500;

// Duración del mensaje de piso en milisegundos
export const FLOOR_MSG_DURATION_MS = 2400;

// Paleta fija de certificaciones AWS (colores por dominio del diccionario de servicios)
const BURST_COLORS = [
  '#ff9f2e', // Cómputo (EC2, Lambda, Fargate…)
  '#57b46b', // Almacenamiento (S3, EFS, Glacier…)
  '#4aa3ff', // Bases de datos (RDS, DynamoDB…)
  '#9b8bff', // Redes (VPC, CloudFront, ELB…)
  '#ff6b61', // Seguridad (IAM, KMS, WAF…)
  '#2ec4b6', // Gobernanza (CloudWatch, CloudFormation…)
  '#ff7eb6', // Integración (SNS, SQS, EventBridge…)
  '#f4c542', // Analítica (Athena, Kinesis, QuickSight…)
  '#d16bff', // ML / IA (SageMaker, Rekognition, Polly…)
  '#45c9d6', // Herramientas de desarrollo (CodeCommit, CodePipeline…)
  '#d98e4a', // Migración (Snow Family, DMS…)
  '#a8d84a', // Facturación (Cost Explorer, Budgets…)
];

// ─── Internal helpers ────────────────────────────────────────────────────────

function makeColorPicker() {
  // Orden aleatorio en cada burst para mezclar toda la paleta AWS
  const shuffled = BURST_COLORS.slice().sort(() => Math.random() - 0.5);
  let index = 0;
  return {
    next() {
      const c = shuffled[index % shuffled.length];
      index++;
      return c;
    }
  };
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function createConfettiOverlay() {
  try {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-confetti-overlay', 'true');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '70';
    canvas.style.pointerEvents = 'none';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[Celebration] No se pudo obtener contexto 2D para el canvas de celebración.');
      return null;
    }

    document.body.appendChild(canvas);
    return canvas;
  } catch (err) {
    console.error('[Celebration] Error al crear el canvas de celebración:', err);
    return null;
  }
}

function removeConfettiOverlay() {
  const canvas = document.querySelector('[data-confetti-overlay="true"]');
  if (canvas) canvas.remove();
}

function burst(x, y, colorPicker) {
  const count = Math.floor(Math.random() * 20) + 30;
  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const velocity = Math.random() * 6 + 2;
    particles.push({
      x,
      y,
      r: Math.random() * 4 + 2,
      c: colorPicker.next(),
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      alpha: 1,
      decay: Math.random() * 0.02 + 0.015,
    });
  }
  return particles;
}

function animateBursts(canvas, endTime) {
  const ctx = canvas.getContext('2d');
  const colorPicker = makeColorPicker();
  let particles = [];

  function scheduleNextBurst() {
    if (Date.now() >= endTime) return;
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    particles = particles.concat(burst(x, y, colorPicker));
    setTimeout(scheduleNextBurst, Math.random() * 1500 + 500);
  }

  // Bursts iniciales en tres puntos de pantalla para feedback inmediato
  particles = particles.concat(burst(canvas.width / 2, canvas.height / 3, colorPicker));
  particles = particles.concat(burst(canvas.width / 4, canvas.height / 2, colorPicker));
  particles = particles.concat(burst(canvas.width * 3 / 4, canvas.height / 2, colorPicker));
  scheduleNextBurst();

  function frame() {
    if (!canvas.parentNode) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= p.decay) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI, false);
      ctx.fillStyle = p.c;
      ctx.fill();
      ctx.closePath();
    }
    ctx.globalAlpha = 1;

    if (Date.now() >= endTime && particles.length === 0) {
      removeConfettiOverlay();
      return;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

export function buildFloorMessageElement(floorNumber) {
  const div = document.createElement('div');
  div.textContent = `PISO ${floorNumber}`;
  div.style.fontFamily = 'var(--font-display)';
  div.style.fontSize = '64px';
  div.style.color = 'var(--gold)';
  div.style.position = 'fixed';
  div.style.top = '50%';
  div.style.left = '50%';
  div.style.transform = 'translate(-50%, -50%)';
  div.style.zIndex = '75';
  div.style.textAlign = 'center';
  div.style.pointerEvents = 'none';
  div.style.textShadow = '0 0 24px rgba(217,179,77,0.8), 0 2px 8px rgba(0,0,0,0.9)';
  return div;
}

function createFloorMessage(floorNumber) {
  const el = buildFloorMessageElement(floorNumber);
  el.setAttribute('data-floor-message', 'true');
  document.body.appendChild(el);
  setTimeout(removeFloorMessage, FLOOR_MSG_DURATION_MS);
}

function removeFloorMessage() {
  const el = document.querySelector('[data-floor-message="true"]');
  if (el) el.remove();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function showMilestoneCelebration(floorNumber) {
  if (!prefersReducedMotion()) {
    removeConfettiOverlay(); // evitar stacking si ya hay una animación activa
    const canvas = createConfettiOverlay();
    if (canvas) {
      animateBursts(canvas, Date.now() + CONFETTI_DURATION_MS);
    }
  }

  removeFloorMessage();
  createFloorMessage(floorNumber);
}

// Exports de compatibilidad con tests existentes
export const CONFETTI_COLORS = BURST_COLORS;
export const PARTICLE_COUNT_MIN = 30;
export const PARTICLE_COUNT_MAX = 50;
export const SPEED_MIN = 2;
export const SPEED_MAX = 8;

export function generateParticles(screenWidth) {
  const colorPicker = makeColorPicker();
  return burst(Math.random() * screenWidth, 0, colorPicker);
}
