# Tabla de Scores Global - Diseño Técnico

## Overview

El sistema de tabla de scores capturará y persistirá automáticamente la altura máxima alcanzada en cada partida, permitiendo al jugador visualizar un ranking de sus mejores puntuaciones. La arquitectura usa el patrón **Strategy** para desacoplar la lógica de juego de los detalles de almacenamiento, permitiendo una migración futura a DynamoDB sin cambios en la lógica central.

**Alcance Fase 1**: localStorage (sincrónico, navegador local)
**Preparación para Fase 2**: Interfaz abstracta lista para DynamoDB (asincrónico)

---

## Architecture

### Componentes Principales

```
src/data/
├── scoreStore.js        (interfaces + LocalStorageScoreStore)
└── scoreManager.js      (lógica de negocio, orquestador)

src/ui/
├── leaderboard.js       (renderización DOM + overlay)
└── screens.js           (integración en pantallas existentes)

src/main.js             (wiring, inicialización)
```

### Diagrama de Flujo

```
┌─ Game Loop ─────────────────────────────────┐
│                                              │
│  1. Juego en ejecución (phase: "build")     │
│  2. Jugador cae / pierde                     │
│  3. Game Over triggered (phase: "gameover") │
│                                              │
└──→ ScoreManager.recordScore(height, ts)    │
     ├─→ valida score                         │
     ├─→ storage.save([...scores])            │
     └─→ UI updateada                         │
         ├─ mostrar "New Record!" o ranking   │
         └─ opción de ver leaderboard         │
```

---

## Components and Interfaces

### 1. ScoreStore Interface (Abstract)

Define el contrato para cualquier proveedor de almacenamiento:

```javascript
// src/data/scoreStore.js
export class ScoreStore {
  /**
   * Carga todos los scores desde la fuente
   * @returns {Promise<Score[]>} Array ordenado (descendente) de scores
   */
  async load() {
    throw new Error('Must be implemented');
  }

  /**
   * Persiste scores en la fuente
   * @param {Score[]} scores - Array de scores a guardar
   * @returns {Promise<void>}
   */
  async save(scores) {
    throw new Error('Must be implemented');
  }

  /**
   * Elimina todos los scores
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('Must be implemented');
  }
}
```

### 2. LocalStorageScoreStore (Fase 1)

Implementación concreta usando localStorage. Envuelve operaciones síncronas en Promises para compatibilidad con interfaz asincrónica:

```javascript
export class LocalStorageScoreStore extends ScoreStore {
  constructor(key = 'torre-nubes-scores') {
    super();
    this.key = key;
    this.maxScores = 100; // límite de scores almacenados
  }

  async load() {
    try {
      const data = localStorage.getItem(this.key);
      if (!data) return [];
      
      const scores = JSON.parse(data);
      if (!Array.isArray(scores)) {
        console.warn('[ScoreStore] Corrupted data, ignoring');
        return [];
      }

      return scores.filter(s => this._isValidScore(s));
    } catch (err) {
      console.error('[ScoreStore] Load error:', err);
      return [];
    }
  }

  async save(scores) {
    try {
      // Prune si excede límite (mantener los más recientes/altos)
      const pruned = this._prune(scores);
      const json = JSON.stringify(pruned);
      localStorage.setItem(this.key, json);
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        console.error('[ScoreStore] localStorage quota exceeded');
      } else {
        console.error('[ScoreStore] Save error:', err);
      }
      // No lanzar excepción; continuar sin persisitir
    }
  }

  async clear() {
    try {
      localStorage.removeItem(this.key);
    } catch (err) {
      console.error('[ScoreStore] Clear error:', err);
    }
  }

  _isValidScore(score) {
    return (
      score &&
      typeof score === 'object' &&
      Number.isInteger(score.score) &&
      score.score >= 0 &&
      typeof score.timestamp === 'string' &&
      this._isValidISO8601(score.timestamp)
    );
  }

  _isValidISO8601(ts) {
    const d = new Date(ts);
    return d instanceof Date && !isNaN(d) && d.toISOString() === ts;
  }

  _prune(scores) {
    if (scores.length <= this.maxScores) return scores;
    // Mantener top maxScores (ya están ordenados descendente)
    return scores.slice(0, this.maxScores);
  }
}
```

### 3. ScoreManager (Orquestador)

Lógica central: captura, validación, persistencia y recuperación de scores:

```javascript
// src/data/scoreManager.js
export class ScoreManager {
  constructor(store) {
    this.store = store;
    this.leaderboard = []; // cache en memoria
    this.loaded = false;
  }

  /**
   * Carga scores desde store (llamar una sola vez al iniciar)
   */
  async initialize() {
    if (this.loaded) return;
    try {
      this.leaderboard = await this.store.load();
      this.loaded = true;
    } catch (err) {
      console.error('[ScoreManager] Initialization failed:', err);
      this.leaderboard = [];
      this.loaded = true;
    }
  }

  /**
   * Registra un nuevo score
   * @param {number} height - altura alcanzada
   * @returns {object} { score, isNewRecord, rank }
   */
  recordScore(height) {
    // Validación
    if (!Number.isInteger(height) || height < 0) {
      console.error('[ScoreManager] Invalid score:', height);
      return null;
    }

    const score = {
      score: height,
      timestamp: new Date().toISOString(),
      id: this._generateId()
    };

    // Determinar si es nuevo récord
    const isNewRecord = this.leaderboard.length === 0 || 
                        height > this.leaderboard[0].score;

    // Insertar en orden descendente
    const idx = this.leaderboard.findIndex(s => s.score < height);
    if (idx === -1) {
      this.leaderboard.push(score);
    } else {
      this.leaderboard.splice(idx, 0, score);
    }

    // Persistir (asincrónico, sin bloquear)
    this.store.save(this.leaderboard).catch(err => {
      console.error('[ScoreManager] Save failed:', err);
    });

    return {
      score: height,
      isNewRecord,
      rank: idx === -1 ? this.leaderboard.length : idx + 1
    };
  }

  /**
   * Obtiene top N scores
   * @param {number} limit
   * @returns {Score[]}
   */
  getLeaderboard(limit = 10) {
    return this.leaderboard.slice(0, limit);
  }

  /**
   * Obtiene todo el leaderboard
   */
  getFullLeaderboard() {
    return this.leaderboard;
  }

  /**
   * Limpia todos los scores
   */
  async clear() {
    this.leaderboard = [];
    await this.store.clear();
  }

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

// Singleton para usar en todo el juego
export const scoreStore = new LocalStorageScoreStore();
export const scoreManager = new ScoreManager(scoreStore);
```

---

## Data Models

### Score Object Schema

```javascript
{
  id: string,                    // Unique identifier
  score: number,                 // Height in blocks (non-negative integer)
  timestamp: string              // ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
}
```

**Ejemplo**:
```json
{
  "id": "1705329000000-a1b2c3d4e",
  "score": 1500,
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

### localStorage Format

**Key**: `torre-nubes-scores`

**Value**: JSON array de Score objects (ordenado descendente por `score`):

```json
[
  { "id": "...", "score": 1500, "timestamp": "2024-01-15T14:30:00.000Z" },
  { "id": "...", "score": 1200, "timestamp": "2024-01-14T10:20:00.000Z" },
  { "id": "...", "score": 950, "timestamp": "2024-01-13T19:45:00.000Z" }
]
```

**Límites**:
- Máximo 100 scores almacenados (pruning automático si se excede)
- Tamaño aproximado por score: ~80 bytes → 100 scores ≈ 8 KB (muy por debajo del límite de localStorage 5-10 MB)

---

## UI Components

### 1. Leaderboard Overlay (DOM)

Renderizado como overlay similar a `bossScreen` y `gameOverScreen`:

```html
<!-- En index.html, dentro de <body> -->
<div id="leaderboardScreen" class="overlay hidden">
  <div class="overlay-content">
    <div class="leaderboard-header">
      <h2>Tabla de Scores</h2>
      <button class="close-btn" aria-label="Cerrar tabla">✕</button>
    </div>
    
    <div class="leaderboard-body">
      <table class="leaderboard-table" role="table" aria-label="Top 10 scores">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Puntaje</th>
            <th scope="col">Fecha</th>
          </tr>
        </thead>
        <tbody id="leaderboardTableBody">
          <!-- Filas generadas dinámicamente -->
        </tbody>
      </table>
      
      <div id="leaderboardEmpty" class="empty-state hidden">
        <p>No hay scores aún. ¡Completa una partida para aparecer aquí!</p>
      </div>
    </div>
  </div>
</div>
```

### 2. Game Over Score Display

Integrado en `gameOverScreen`:

```html
<!-- Dentro de #gameOverScreen -->
<div class="score-info">
  <p id="finalScore">Tu puntuación: <strong>0</strong></p>
  <p id="scoreRank" class="rank-badge"></p>
  <!-- "¡Nuevo récord!" o "Puntuación #3" -->
</div>

<button id="viewLeaderboardBtn" class="btn-secondary">
  Ver tabla de scores
</button>
```

### 3. Leaderboard Module (src/ui/leaderboard.js)


```javascript
// src/ui/leaderboard.js

/**
 * Renderiza la tabla de leaderboard con scores
 */
export function renderLeaderboard(scores) {
  const tbody = document.getElementById('leaderboardTableBody');
  const empty = document.getElementById('leaderboardEmpty');
  const table = document.querySelector('.leaderboard-table');

  if (!scores || scores.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  tbody.innerHTML = '';
  table.classList.remove('hidden');
  empty.classList.add('hidden');

  scores.forEach((score, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td class="score-value">${score.score}</td>
      <td class="score-date">${formatDateLocale(score.timestamp)}</td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Muestra overlay del leaderboard
 */
export function showLeaderboard() {
  document.getElementById('leaderboardScreen').classList.remove('hidden');
}

/**
 * Oculta overlay del leaderboard
 */
export function hideLeaderboard() {
  document.getElementById('leaderboardScreen').classList.add('hidden');
}

/**
 * Actualiza info de score en game over screen
 */
export function updateGameOverScore(height, isNewRecord, rank) {
  const finalScore = document.getElementById('finalScore');
  const rankBadge = document.getElementById('scoreRank');

  finalScore.innerHTML = `Tu puntuación: <strong>${height}</strong>`;

  if (isNewRecord) {
    rankBadge.textContent = '🏆 ¡Nuevo récord!';
    rankBadge.classList.add('new-record');
  } else {
    rankBadge.textContent = `Puntuación #${rank}`;
    rankBadge.classList.remove('new-record');
  }
}

/**
 * Formatea timestamp a formato legible en español
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Ej: "15 ene 2024, 14:30"
 */
export function formatDateLocale(isoString) {
  try {
    const d = new Date(isoString);
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return d.toLocaleDateString('es-ES', options);
  } catch (err) {
    return '—';
  }
}

/**
 * Vincula controles del leaderboard
 */
export function bindLeaderboardControls(onClose) {
  const closeBtn = document.querySelector('#leaderboardScreen .close-btn');
  const screen = document.getElementById('leaderboardScreen');

  if (closeBtn) {
    closeBtn.addEventListener('click', onClose);
  }

  // Cerrar si hace clic fuera del contenido
  screen.addEventListener('click', (e) => {
    if (e.target === screen) {
      onClose();
    }
  });

  // Escape para cerrar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !screen.classList.contains('hidden')) {
      onClose();
    }
  });
}
```

---

## Integration Flow

### 1. Inicialización (main.js)

```javascript
import { scoreManager } from './data/scoreManager.js';
import * as leaderboard from './ui/leaderboard.js';

// En main.js, al iniciar:
(async () => {
  await scoreManager.initialize();
  leaderboard.bindLeaderboardControls(() => leaderboard.hideLeaderboard());
  
  // Vincular botón del leaderboard en game over
  document.getElementById('viewLeaderboardBtn')?.addEventListener('click', () => {
    const scores = scoreManager.getLeaderboard(10);
    leaderboard.renderLeaderboard(scores);
    leaderboard.showLeaderboard();
  });
})();
```

### 2. Captura de Score (Game Over)

Cuando el jugador pierde, en `endFight()` o `onDrop()`:

```javascript
function triggerGameOver(floorNum, reason) {
  const height = floorNum;
  
  // Registrar score
  const result = scoreManager.recordScore(height);
  
  if (result) {
    // Actualizar UI con score y ranking
    leaderboard.updateGameOverScore(
      result.score,
      result.isNewRecord,
      result.rank
    );
  }

  // Mostrar pantalla de game over (código existente)
  ui.showGameOverScreen(title, detail);
  gameState.screen = 'gameover';
}
```

### 3. Reset Capability (Dev Mode)

Botón oculto o comando secreto para limpiar:

```javascript
// En UI, dentro de overlay oculto o console command
export async function clearLeaderboard() {
  const confirmed = confirm(
    '¿Limpiar tabla de scores? Esta acción no se puede deshacer.'
  );
  
  if (confirmed) {
    await scoreManager.clear();
    const empty = document.getElementById('leaderboardEmpty');
    const table = document.querySelector('.leaderboard-table');
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    console.log('[Leaderboard] Cleared');
  }
}

// En main.js, exponer para dev mode:
window.__torreNubes = window.__torreNubes || {};
window.__torreNubes.clearLeaderboard = leaderboard.clearLeaderboard;
```

---

## Error Handling

### 1. localStorage Quota Exceeded

```javascript
// En scoreStore.save()
try {
  localStorage.setItem(this.key, json);
} catch (err) {
  if (err.name === 'QuotaExceededError') {
    console.error('[ScoreStore] localStorage quota exceeded, pruning...');
    // Automáticamente prune si fue por tamaño
    const pruned = this._prune(scores);
    try {
      localStorage.setItem(this.key, JSON.stringify(pruned));
    } catch (retryErr) {
      console.error('[ScoreStore] Still cannot save after pruning');
    }
  }
}
```

### 2. Corrupted Data

```javascript
// En scoreStore.load()
try {
  const scores = JSON.parse(data);
  if (!Array.isArray(scores)) {
    console.warn('[ScoreStore] Data corrupted, not an array');
    return [];
  }
  return scores.filter(s => this._isValidScore(s));
} catch (err) {
  console.error('[ScoreStore] JSON parse error:', err);
  return [];
}
```

### 3. Invalid Score Values

```javascript
// En scoreManager.recordScore()
if (!Number.isInteger(height) || height < 0) {
  console.error('[ScoreManager] Invalid score:', height);
  return null;
}
```

---

## Testing Strategy

### Testable Criteria (No PBT aplicable)

El sistema de leaderboard no es adecuado para property-based testing porque:
- **Lógica de almacenamiento**: localStorage es una API determinística (read/write/delete)
- **No hay variación de entrada significativa**: scores son números simples
- **Persistencia**: testing requiere interacción con localStorage (lado effects)

**Enfoque**: Unit tests con mocks + integration tests locales

### Unit Tests (Vitest)

```javascript
// src/data/scoreManager.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from './scoreManager.js';

// Mock ScoreStore
class MockScoreStore {
  constructor() {
    this.data = [];
  }
  async load() { return this.data; }
  async save(scores) { this.data = scores; }
  async clear() { this.data = []; }
}

describe('ScoreManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ScoreManager(new MockScoreStore());
  });

  it('should record a score and mark as new record', () => {
    const result = manager.recordScore(1500);
    expect(result.isNewRecord).toBe(true);
    expect(result.rank).toBe(1);
  });

  it('should maintain descending order', () => {
    manager.recordScore(1500);
    manager.recordScore(2000);
    manager.recordScore(1000);
    
    const lb = manager.getLeaderboard();
    expect(lb[0].score).toBe(2000);
    expect(lb[1].score).toBe(1500);
    expect(lb[2].score).toBe(1000);
  });

  it('should reject invalid scores', () => {
    expect(manager.recordScore(-100)).toBeNull();
    expect(manager.recordScore(1.5)).toBeNull();
  });

  it('should calculate correct rank', () => {
    manager.recordScore(1500);
    const result = manager.recordScore(1000);
    expect(result.rank).toBe(2);
  });
});

// src/ui/leaderboard.test.js
describe('Leaderboard UI', () => {
  it('should display empty state when no scores', () => {
    renderLeaderboard([]);
    const empty = document.getElementById('leaderboardEmpty');
    expect(empty.classList.contains('hidden')).toBe(false);
  });

  it('should render top 10 with correct formatting', () => {
    const scores = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      score: 1500 - i * 100,
      timestamp: new Date().toISOString()
    }));
    
    renderLeaderboard(scores);
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBe(10);
  });

  it('should format timestamps correctly', () => {
    const ts = '2024-01-15T14:30:00.000Z';
    const formatted = formatDateLocale(ts);
    expect(formatted).toMatch(/\d{2}\s\w+\s\d{4}/); // DD mmm YYYY format
  });
});
```

### Integration Tests

```javascript
// src/integration/leaderboard.integration.test.js
describe('Leaderboard Integration (localStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist and load scores across sessions', async () => {
    const store = new LocalStorageScoreStore();
    const mgr = new ScoreManager(store);
    
    await mgr.initialize();
    mgr.recordScore(1500);
    mgr.recordScore(2000);
    
    // Simulate new session
    const mgr2 = new ScoreManager(new LocalStorageScoreStore());
    await mgr2.initialize();
    
    expect(mgr2.getLeaderboard().length).toBe(2);
    expect(mgr2.getLeaderboard()[0].score).toBe(2000);
  });

  it('should handle localStorage quota exceeded gracefully', async () => {
    const store = new LocalStorageScoreStore();
    
    // Mock: simular quota exceeded
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function() {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    };

    const mgr = new ScoreManager(store);
    const result = mgr.recordScore(1500);
    
    // No debe lanzar excepción
    expect(result).not.toBeNull();
    
    Storage.prototype.setItem = originalSetItem;
  });
});
```

### Test Fixtures

```javascript
// src/test/fixtures/scores.js
export const FIXTURE_SCORES = [
  {
    id: '1705329000000-a1b2c3d4e',
    score: 2500,
    timestamp: '2024-01-15T14:30:00.000Z'
  },
  {
    id: '1705242600000-f5g6h7i8j',
    score: 2000,
    timestamp: '2024-01-14T14:30:00.000Z'
  },
  {
    id: '1705156200000-k9l0m1n2o',
    score: 1500,
    timestamp: '2024-01-13T14:30:00.000Z'
  }
];

export const INVALID_SCORES = [
  { score: -100, timestamp: new Date().toISOString() },  // negative
  { score: 1.5, timestamp: new Date().toISOString() },   // float
  { score: 'high', timestamp: new Date().toISOString() }, // not number
  { score: 1000, timestamp: 'invalid-date' }              // bad timestamp
];
```

---

## Performance Considerations

### 1. Async/Sync Decisions

**Fase 1 (localStorage)**:
- `load()`, `save()`, `clear()` retornan Promises (aunque sean síncronos)
- Permite compatibilidad con Fase 2 (DynamoDB = async verdadero)
- `recordScore()` llama a `store.save()` sin await (fire-and-forget) para no bloquear game loop

**Código**:
```javascript
recordScore(height) {
  // ... validación y lógica ...
  
  // No esperar: guardar en background
  this.store.save(this.leaderboard).catch(err => {
    console.error('[ScoreManager] Save failed:', err);
  });

  return { score: height, isNewRecord, rank };
}
```

### 2. Caching en Memoria

- Leaderboard siempre cacheado en `scoreManager.leaderboard`
- Una sola lectura de localStorage al iniciar (`initialize()`)
- Todas las lecturas posteriores usan cache en memoria (O(1))

### 3. Timing de Operaciones

- **initialize()**: ~1ms (lectura localStorage + parsing)
- **recordScore()**: <1ms (validación + inserción array)
- **store.save()**: <1ms sincrónico, pero no bloquea (await omitido)
- **renderLeaderboard()**: <5ms (generación de 10 filas DOM)

**No causa jank** en game loop (60 FPS = ~16.67ms/frame)

### 4. Límites de Almacenamiento

- **Max 100 scores**: ~8 KB en localStorage (bien dentro del límite 5-10 MB)
- **Pruning automático**: si excede 100, mantener top 100 (FIFO cuando iguales)

---

## Accesibility

### Semantic HTML

```html
<table role="table" aria-label="Top 10 scores">
  <thead>
    <tr>
      <th scope="col">#</th>
      <th scope="col">Puntaje</th>
      <th scope="col">Fecha</th>
    </tr>
  </thead>
  <tbody id="leaderboardTableBody">
    <!-- filas -->
  </tbody>
</table>
```

### Keyboard Navigation

- **Tab**: navega entre botones (Cerrar, Ver Leaderboard)
- **Escape**: cierra overlay
- **Focus visible**: botones tienen estilos de focus claros

### Screen Reader Support

- Todos los labels en español
- `aria-label` descriptivos en botones
- Tabla semántica con `<thead>` y `scope="col"`

### Localization

- Todos los textos en español (consistent con producto)
- Formato de fecha: locale-aware (`es-ES`)
- Números con separadores decimales españoles (si aplica)

---

## Summary

**Módulos a Crear**:
1. `src/data/scoreStore.js` - Interface + LocalStorageScoreStore
2. `src/data/scoreManager.js` - Orquestador
3. `src/ui/leaderboard.js` - Renderización y controles
4. HTML (index.html) - Overlay + Game Over Score Display
5. CSS - Estilos del leaderboard

**Integración**:
- `main.js` - Inicialización y wiring
- `ui/screens.js` - Actualizar game over screen

**Testing**:
- Unit tests para ScoreManager (mocks)
- Integration tests para persistencia
- Component tests para UI

**Performance**: <5ms operaciones, sin impacto en game loop

**Listo para Fase 2**: Interface abstracta permite swap a DynamoDB sin cambios de lógica

