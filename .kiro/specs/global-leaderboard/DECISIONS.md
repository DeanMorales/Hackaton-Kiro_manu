# Decisiones de Diseño - Tabla de Scores Global

## 1. ¿Por qué Strategy Pattern?

**Pregunta**: ¿Por qué no solo usar LocalStorageScoreStore directamente?

**Respuesta**:
- Phase 1: localStorage (local, no backend)
- Phase 2: DynamoDB (cloud, async)
- Con Strategy, el cambio es **trivial**: cambiar una línea en main.js
- Sin Strategy, refactorizar toda la lógica de juego

**Código Phase 1**:
```javascript
const scoreStore = new LocalStorageScoreStore();
const scoreManager = new ScoreManager(scoreStore);
```

**Código Phase 2** (cambio único):
```javascript
const scoreStore = new DynamoDBScoreStore(); // ← solo esta línea
const scoreManager = new ScoreManager(scoreStore); // ← idéntico
```

---

## 2. ¿Por qué fire-and-forget en save()?

**Pregunta**: ¿No deberíamos esperar (await) a que se persista?

**Respuesta**:

Si esperamos:
```javascript
// ❌ Bloquea game loop
await this.store.save(this.leaderboard);
console.log('Persisted');
```

Si no esperamos:
```javascript
// ✅ No bloquea game loop
this.store.save(this.leaderboard).catch(err => {
  console.error('[ScoreManager] Save failed:', err);
});
console.log('Persisted in background');
```

**Por qué es correcto**:
- localStorage es rápido (<1ms típicamente)
- El jugador no necesita esperar
- Error en persistencia no debe afectar experiencia
- Logging captura errores

**En Fase 2 con DynamoDB**:
- AWS latency: ~100-500ms
- Aún no queremos bloquear
- Sistema es resiliente

---

## 3. ¿Por qué máximo 100 scores?

**Pregunta**: ¿Por qué limitar? ¿No es mejor guardar todo?

**Respuesta**:

**Sin límite**:
- Usuario juega 1000 veces = ~80 KB de JSON
- localStorage típicamente 5-10 MB
- Después de 5 años, quizás 1 MB

**Con límite 100**:
- ~8 KB (manejable)
- ~2-3 meses de historial típico
- Pruning automático mantiene los mejores scores

**Estrategia de pruning**:
```javascript
_prune(scores) {
  if (scores.length <= this.maxScores) return scores;
  return scores.slice(0, this.maxScores); // keep top 100
}
```

**Es justo porque**:
- Leaderboard ya mostraba top 10
- Usuarios ven su progresión reciente
- Si necesita histórico completo, Fase 2 con DynamoDB lo permite

---

## 4. ¿Por qué ISO 8601 timestamps?

**Pregunta**: ¿No es suficiente Date.now() (ms desde epoch)?

**Opciones**:
```javascript
// Opción 1: Date.now() (timestamp numérico)
timestamp: 1705329000000

// Opción 2: ISO 8601 (legible, standard)
timestamp: "2024-01-15T14:30:00.000Z"
```

**Por qué ISO 8601**:
- Legible para humanos
- Standard internacional (no ambigüedad)
- Parsing consistente en cualquier lenguaje
- toISOString() es método nativo
- Validable con regex
- Fusible en dashboards/analytics (Fase 2)
- Sin confusión de zona horaria (siempre UTC con 'Z')

**Contra numérico**:
- Menos legible en localStorage inspector
- Requiere conversión para mostrar
- Menos portable entre sistemas

---

## 5. ¿Por qué DOM overlay en lugar de canvas?

**Pregunta**: ¿No sería más consistente renderizar tabla en canvas?

**Tabla en DOM** ✅:
- Accesible (screen reader compatible)
- Semantic HTML (`<table>`, `<thead>`)
- Responsive automático
- Keyboard navigation gratis
- Rápido para actualizar
- Fácil de estilizar
- Mejor a11y

**Tabla en canvas** ❌:
- Pixel-perfect pero no accesible
- Requiere reimplementar keyboard
- Difícil de hacer responsive
- Más código para lograr menos
- No beneficia juego (ya usa canvas para gameplay)

**Decisión**: DOM overlay para tabla, canvas solo para mundo del juego.

---

## 6. ¿Por qué localStorage en Fase 1 y no IndexedDB?

**Opciones**:
- localStorage: simple, síncrono, 5-10 MB
- IndexedDB: potente, asincrónico, hasta 50+ MB

**localStorage Fase 1**:
- Requerimiento: datos simples, sin sincronización
- 100 scores = ~8 KB ✅ (bien dentro del límite)
- No requiere async boilerplate
- Más simple para Fase 1
- Compatible con Strategy pattern (DynamoDB en Fase 2)

**IndexedDB sería overkill**:
- Array de 100 objetos simples no justifica IndexedDB
- Complejidad sin beneficio
- localStorage es suficiente para Fase 1

---

## 7. ¿Cuándo se captura el score: al perder o al game over?

**Pregunta**: ¿Registrar altura cuando "caes" o cuando aparece "Game Over"?

**Decisión**: Registrar en **ambos puntos** (onDrop y endFight):

```javascript
// Punto 1: Bloque no encaja
if (result.type === 'fell') {
  const height = result.floorNum;
  scoreManager.recordScore(height);
}

// Punto 2: Guardián vence al jugador
function endFight(won) {
  if (!won) {
    const height = gameState.floors.length - 1;
    scoreManager.recordScore(height);
  }
}
```

**Por qué dos puntos**:
- Cada forma de morir captura correctamente
- No hace daño registrar si alguno se llama dos veces (recordScore es idempotente para la misma altura+timestamp)
- Cubre todas las rutas hacia game over

---

## 8. ¿Por qué "Puntuación #N" en lugar de solo mostrar score?

**Requisito 4.2**: Mostrar si es nuevo récord o ranking

**Decisión**: Badge dinámico:

```javascript
if (isNewRecord) {
  rankBadge.textContent = '🏆 ¡Nuevo récord!';
} else {
  rankBadge.textContent = `Puntuación #${rank}`;
}
```

**Por qué**:
- Motivación: nuevo récord es celebración
- Context: saber si es #1, #5, #50 da perspectiva
- UX: información relevante sin clutter

---

## 9. ¿Por qué Promises para operaciones síncronas?

**LocalStorageScoreStore**:
```javascript
async load() {  // ← Devuelve Promise
  try {
    const data = localStorage.getItem(this.key);
    return JSON.parse(data);  // ← Pero operación es sincrónica
  } catch (err) {
    return [];
  }
}
```

**Por qué**:
- Compatibilidad con Fase 2 (DynamoDB = async verdadero)
- Código en ScoreManager usa await uniformemente
- Interfaz consistente para ambos providers

**Alternativa rechazada**: 
- Métodos síncronos en Fase 1, async en Fase 2 → refactorizar main.js

---

## 10. ¿Cómo se prioriza entre renderizar leaderboard y game loop?

**Pregunta**: ¿Renderizar tabla bloquea frames?

**Respuesta**: No, porque:

```javascript
// En game loop (60 FPS = 16.67ms/frame)
render(ctx, W, H, gameState);  // ~15ms para canvas
requestAnimationFrame(loop);

// Usuario hace clic "Ver tabla" (en otro frame)
leaderboard.renderLeaderboard(scores);  // <5ms para DOM
```

**Timings**:
- Canvas render: ~15ms
- DOM table render: <5ms
- Total: <20ms (una frame cabe entera)

**Si fuera más lento**:
- Usar requestIdleCallback
- O split en múltiples frames
- Pero no es necesario para 10 filas

---

## 11. ¿Qué pasa si localStorage quota se excede?

**Escenario**: Usuario tiene muchísima data (5+ MB)

```javascript
async save(scores) {
  try {
    localStorage.setItem(this.key, json);
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      // Intentar pruning más agresivo
      const pruned = this._prune(scores);
      try {
        localStorage.setItem(this.key, JSON.stringify(pruned));
      } catch (retryErr) {
        console.error('Still cannot save after pruning');
        // Continuar sin persistir (en memoria funciona)
      }
    }
  }
}
```

**Fallback**:
1. Intenta guardar normalmente
2. Si excede quota, prune desde 100 a 50
3. Si aún no cabe, solo logging (en memoria funciona)
4. El juego NO se quiebra

---

## 12. ¿Por qué no usar localStorage.length?

**Pregunta**: ¿Cómo saber si localStorage está disponible?

**Solución**:
```javascript
function isLocalStorageAvailable() {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (err) {
    return false;
  }
}
```

**En scoreStore.js**:
```javascript
async load() {
  try {
    const data = localStorage.getItem(this.key);
    // ...
  } catch (err) {
    console.warn('[ScoreStore] localStorage unavailable');
    return [];  // Fallback: cargar vacío
  }
}
```

---

## 13. ¿Cómo se testea sin usar localStorage real?

**Mock Pattern**:
```javascript
class MockScoreStore extends ScoreStore {
  constructor() {
    super();
    this.data = [];
  }
  async load() { return this.data; }
  async save(scores) { this.data = scores; }
  async clear() { this.data = []; }
}

// En tests
const mockStore = new MockScoreStore();
const manager = new ScoreManager(mockStore);
```

**Beneficios**:
- Tests rápidos (no I/O real)
- Determinísticos (sin variación)
- Fácil de breakear
- No afecta localStorage del usuario

---

## 14. ¿Por qué no usar fecha local en lugar de ISO 8601?

**Opciones**:
```javascript
// Opción 1: ISO 8601 (UTC, unambiguo)
timestamp: "2024-01-15T14:30:00.000Z"

// Opción 2: Fecha local (confuso)
timestamp: "2024-01-15T14:30:00.000" // ¿Qué zona horaria?
```

**Con ISO 8601**:
- `toISOString()` es método estándar
- `new Date(isoString)` parsing automático
- Fusible con APIs (Fase 2 DynamoDB)
- Sin confusión de zona horaria

**Formato de display** (separado de storage):
```javascript
// Storage: ISO 8601
timestamp: "2024-01-15T14:30:00.000Z"

// Display: locale-aware
formatDateLocale(timestamp) 
  // → "15 ene 2024, 14:30" (en español)
```

---

## 15. ¿Por qué singleton para scoreManager?

**Pregunta**: ¿No deberías pasar scoreManager como parámetro?

**Decisión**: Singleton exportado desde `scoreManager.js`:

```javascript
export const scoreManager = new ScoreManager(scoreStore);
```

**Uso en main.js**:
```javascript
import { scoreManager } from './data/scoreManager.js';

await scoreManager.initialize();
scoreManager.recordScore(height);
```

**Por qué singleton**:
- Un solo leaderboard por juego
- Acceso global desde múltiples módulos (main, ui, etc.)
- Simpler API que dependency injection para caso de uso simple

**Si fuera más complejo**:
- Usar Event Bus o State Manager
- Inyección de dependencias
- Pero para este caso, singleton es pragmático

---

## Resumen de Decisiones

| Decisión | Opción Elegida | Razón |
|----------|---|---|
| Patrón | Strategy | Preparado para Fase 2 |
| Persistencia | fire-and-forget | No bloquea game loop |
| Máx scores | 100 | Balance histórico/tamaño |
| Timestamps | ISO 8601 | Standard, legible, portable |
| Tabla UI | DOM | Accesible + responsive |
| Storage Fase 1 | localStorage | Simple, suficiente para 100 scores |
| Captura | 2 puntos | Cubre todas las rutas |
| Badge | Dinámico | Motivación + contexto |
| Promises | Síncronas envueltas | Interfaz uniforme |
| Renderizado | Sin bloqueo | <5ms para 10 filas |
| Quota | Auto-prune | Graceful fallback |
| Testing | Mocks | Tests rápidos, determinísticos |
| Display | Locale-aware | Español consistente |
| Scope | Singleton | Pragmático para este caso |

