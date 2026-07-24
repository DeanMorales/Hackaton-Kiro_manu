# Guía de Implementación - Tabla de Scores Global

## Archivo por Archivo

### 1. `src/data/scoreStore.js` (Nuevo)

**Responsabilidad**: Define interfaz de almacenamiento y la implementación concreta para localStorage.

**Líneas estimadas**: ~120

**Debe exportar**:
- `ScoreStore` (clase abstracta)
- `LocalStorageScoreStore` (clase concreta)

**Depende de**: Nada (módulo puro)

**Usado por**: `scoreManager.js`

---

### 2. `src/data/scoreManager.js` (Nuevo)

**Responsabilidad**: Orquestador de lógica de scores, validación, persistencia y ranking.

**Líneas estimadas**: ~100

**Debe exportar**:
- `ScoreManager` (clase)
- `scoreStore` (instancia singleton de `LocalStorageScoreStore`)
- `scoreManager` (instancia singleton de `ScoreManager`)

**Depende de**: `scoreStore.js`

**Usado por**: `main.js`, `screens.js`

---

### 3. `src/ui/leaderboard.js` (Nuevo)

**Responsabilidad**: Rendering del overlay de leaderboard, formateo de datos, bindings de controles.

**Líneas estimadas**: ~150

**Debe exportar**:
- `renderLeaderboard(scores)` - Renderiza tabla
- `showLeaderboard()` - Muestra overlay
- `hideLeaderboard()` - Oculta overlay
- `updateGameOverScore(height, isNewRecord, rank)` - Actualiza info en game over
- `formatDateLocale(isoString)` - Formatea timestamp
- `bindLeaderboardControls(onClose)` - Vincula eventos
- `clearLeaderboard()` - Dev mode only

**Depende de**: DOM (HTML elements)

**Usado por**: `main.js`, integraciones en pantallas

---

### 4. `index.html` - Cambios

**Agregar dentro de `<body>`**:

```html
<!-- Leaderboard overlay -->
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
          <!-- Generado dinámicamente -->
        </tbody>
      </table>
      
      <div id="leaderboardEmpty" class="empty-state hidden">
        <p>No hay scores aún. ¡Completa una partida para aparecer aquí!</p>
      </div>
    </div>
  </div>
</div>
```

**En `#gameOverScreen`, agregar antes del botón "Reconstruir"**:

```html
<div class="score-info">
  <p id="finalScore">Tu puntuación: <strong>0</strong></p>
  <p id="scoreRank" class="rank-badge"></p>
</div>

<button id="viewLeaderboardBtn" class="btn-secondary">
  Ver tabla de scores
</button>
```

---

### 5. `index.html` - Cambios en `<style>`

**Agregar al final del `<style>`**:

Ver file `wireframes.md` - sección "CSS - Leaderboard Overlay" y "Game Over Screen - CSS Modifications"

---

### 6. `src/ui/screens.js` - Cambios

**Modificación**: Exportar función para mostrar el score en game over (puede ser una nueva función o integrada en `showGameOverScreen`)

**Agregar**:
```javascript
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
```

O mejor aún, importar desde `leaderboard.js` en `main.js`

---

### 7. `src/main.js` - Cambios

**Imports**: Agregar al inicio
```javascript
import { scoreManager } from './data/scoreManager.js';
import * as leaderboard from './ui/leaderboard.js';
```

**Inicialización**: En la sección de setup (después de crear gameState)
```javascript
// Initialize leaderboard
(async () => {
  await scoreManager.initialize();
  leaderboard.bindLeaderboardControls(() => leaderboard.hideLeaderboard());
  
  // Bind view leaderboard button in game over screen
  const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
  if (viewLeaderboardBtn) {
    viewLeaderboardBtn.addEventListener('click', () => {
      const scores = scoreManager.getLeaderboard(10);
      leaderboard.renderLeaderboard(scores);
      leaderboard.showLeaderboard();
    });
  }
})();
```

**En función `endFight()` o donde se dispare game over**:

Antes de `showGameOverScreen()`:

```javascript
function endFight(won) {
  ui.hideBossScreen();
  fight = null;
  if (won) {
    gameState.doorsPassed += 1;
    gameState.screen = 'build';
    gameState.pendingBossLevel = 0;
  } else {
    gameState.screen = 'falling';
    engine.triggerFall(gameState, performance.now());
    sfx.fall();
    setTimeout(() => {
      // ====== AGREGAR AQUI ======
      const height = gameState.floors.length - 1;
      const result = scoreManager.recordScore(height);
      
      if (result) {
        leaderboard.updateGameOverScore(
          result.score,
          result.isNewRecord,
          result.rank
        );
      }
      // ==========================
      
      ui.showGameOverScreen(
        'El guardián te ha vencido',
        `Caíste en la puerta del piso ${height}. ¡Vuelve a intentarlo!`
      );
      gameState.screen = 'gameover';
    }, gameState.knight.fallDur + 250);
  }
}
```

**También en `onDrop()` cuando el bloque cae**:

```javascript
function onDrop() {
  // ... código existente ...
  
  if (result.type === 'fell') {
    engine.triggerFall(gameState, performance.now());
    sfx.fall();
    setTimeout(() => {
      // ====== AGREGAR AQUI ======
      const height = result.floorNum;
      const scoreResult = scoreManager.recordScore(height);
      
      if (scoreResult) {
        leaderboard.updateGameOverScore(
          scoreResult.score,
          scoreResult.isNewRecord,
          scoreResult.rank
        );
      }
      // ==========================
      
      ui.showGameOverScreen(
        'Has caído de la torre',
        `Llegaste hasta el piso ${height}. El bloque no encajó a tiempo.`
      );
      gameState.screen = 'gameover';
    }, gameState.knight.fallDur + 250);
  }
}
```

---

## Orden de Implementación Recomendado

1. **Crear `scoreStore.js`**
   - Interfaz `ScoreStore`
   - Clase `LocalStorageScoreStore` con métodos `load`, `save`, `clear`
   - Tests unitarios

2. **Crear `scoreManager.js`**
   - Clase `ScoreManager` con métodos `initialize`, `recordScore`, `getLeaderboard`, `clear`
   - Exportar singletons
   - Tests unitarios con mocks

3. **Crear `leaderboard.js`**
   - Funciones de rendering: `renderLeaderboard`, `showLeaderboard`, `hideLeaderboard`
   - Formateo: `formatDateLocale`
   - Controles: `bindLeaderboardControls`, `updateGameOverScore`
   - Tests de componentes

4. **Modificar `index.html`**
   - Agregar overlay HTML
   - Agregar elementos en game over screen
   - Agregar CSS

5. **Modificar `src/main.js`**
   - Importar módulos
   - Inicializar scoreManager y leaderboard
   - Integrar recordScore en puntos de game over

6. **Testing e Integración**
   - Correr tests unitarios
   - Probar en navegador
   - Verificar persistencia localStorage
   - Verificar UI rendering

---

## Puntos de Integración Clave

### Captura de Score

**Dos puntos donde se registra score**:

1. **Cuando el bloque no encaja** (`onDrop()` → `result.type === 'fell'`)
   ```
   height = result.floorNum (número de piso)
   ```

2. **Cuando el guardián vence al jugador** (`endFight(won)` con `won = false`)
   ```
   height = gameState.floors.length - 1
   ```

### Display en Game Over

- Mostrar altura alcanzada
- Mostrar si es nuevo récord o ranking
- Botón para ver tabla completa
- Interactividad de overlay

---

## Configuración de Limites

**En `scoreStore.js`**:
```javascript
this.maxScores = 100; // Limitar a últimos 100 scores
```

**Estrategia de pruning**: FIFO cuando se alcanza el límite (mantener los más nuevos/altos)

---

## Dev Mode - Limpiar Leaderboard

```javascript
// En consola del navegador:
window.__torreNubes = window.__torreNubes || {};
window.__torreNubes.clearLeaderboard = async () => {
  await scoreManager.clear();
  console.log('Leaderboard cleared');
  // Actualizar UI si está visible
  leaderboard.renderLeaderboard([]);
};

// Llamar: window.__torreNubes.clearLeaderboard();
```

---

## Consideraciones de Performance

- **No bloquear game loop**: `recordScore()` no debe esperar `save()`
- **Cache en memoria**: leer siempre de `scoreManager.leaderboard`
- **Rendering DOM**: generar tabla solo cuando se abre overlay
- **Pruning automático**: si localStorage excede ~8KB, trimear automáticamente

---

## Testing Checklist

- [ ] Unit tests: ScoreManager (mocks)
- [ ] Unit tests: LocalStorageScoreStore
- [ ] Unit tests: Leaderboard UI functions
- [ ] Integration test: localStorage persist/load
- [ ] Manual test: Registrar score al perder
- [ ] Manual test: Ver tabla en game over
- [ ] Manual test: Cerrar overlay con ESC
- [ ] Manual test: Mobile responsive
- [ ] Manual test: a11y - screen reader
- [ ] Manual test: Keyboard navigation

---

## Errores Comunes a Evitar

1. **No inicializar scoreManager** → `await scoreManager.initialize()` en main.js
2. **Bloquear game loop** → No usar `await` en `recordScore()`
3. **Olvidar actualizar UI** → Siempre llamar `leaderboard.updateGameOverScore()`
4. **Heights negativos** → Validar que `height >= 0` siempre
5. **Timestamps inválidos** → Usar siempre `new Date().toISOString()`
6. **localStorage quota exceeded** → Manejar gracefully (pruning + log)

