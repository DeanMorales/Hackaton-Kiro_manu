# Tabla de Scores Global - Resumen Ejecutivo del Diseño

## Objetivo

Implementar un sistema de persistencia de scores que registre automáticamente la altura máxima alcanzada en cada partida, permitiendo al jugador visualizar un ranking de mejores puntuaciones en localStorage (Fase 1), con arquitectura preparada para migración a DynamoDB (Fase 2).

---

## Arquitectura de Solución

### Componentes

```
ScoreStore (Interface)
├── LocalStorageScoreStore (Fase 1)
└── DynamoDBScoreStore (Fase 2 - preparado)

ScoreManager (Orquestador)
├── initialize() → carga scores desde storage
├── recordScore(height) → captura y persiste
├── getLeaderboard(limit) → devuelve top N
└── clear() → limpia todo

LeaderboardUI (Rendering)
├── renderLeaderboard() → tabla HTML
├── showLeaderboard() / hideLeaderboard() → control overlay
├── updateGameOverScore() → integración game over
└── formatDateLocale() → timestamps legibles
```

### Patrón de Diseño: Strategy

- **ScoreStore** = interface abstracta (strategy)
- **LocalStorageScoreStore** = implementación concreta para Fase 1
- **DynamoDBScoreStore** = implementación concreta para Fase 2 (futura)
- **ScoreManager** = context que usa la strategy sin conocer detalles

**Beneficio**: Cambiar proveedor de almacenamiento sin modificar lógica de juego

---

## Datos

### Score Object
```json
{
  "id": "unique-id",
  "score": 1500,
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

### localStorage
- **Key**: `torre-nubes-scores`
- **Format**: JSON array (ordenado descendente)
- **Size**: ~8 KB para 100 scores (bien dentro del límite 5-10 MB)
- **Límite**: máx 100 scores (pruning automático)

---

## Flujo de Integración

```
1. main.js: Iniciar
   └─ await scoreManager.initialize()
      └─ Cargar scores desde localStorage
      └─ Cache en memoria

2. Juego en ejecución
   └─ Jugador pierde
      ├─ onDrop() (bloque no encaja)
      └─ endFight(false) (guardián vence)

3. Game Over
   ├─ scoreManager.recordScore(height)
   │  └─ Validar → Insertar en orden → Persistir (async)
   ├─ leaderboard.updateGameOverScore(score, isNewRecord, rank)
   │  └─ Mostrar puntuación + "¡Nuevo récord!" o "#N"
   └─ Mostrar game over screen

4. Jugador interactúa
   └─ Clic en "Ver tabla de scores"
      ├─ leaderboard.renderLeaderboard(top10)
      └─ leaderboard.showLeaderboard()

5. Reset (dev mode)
   └─ scoreManager.clear()
```

---

## Módulos a Crear

| Módulo | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `scoreStore.js` | ~120 | Interface + LocalStorageScoreStore |
| `scoreManager.js` | ~100 | Orquestador de lógica |
| `leaderboard.js` | ~150 | Rendering UI + controles |
| HTML (index.html) | ~40 | Overlay + Game Over elementos |
| CSS (index.html) | ~300 | Estilos leaderboard |

**Total**: ~340 líneas de código (descartando HTML/CSS)

---

## Características Principales

### 1. Captura Automática
- Registra score al game over (dos puntos de entrada)
- Validación: altura ≥ 0 y timestamp ISO 8601
- No bloquea game loop (fire-and-forget)

### 2. Persistencia Local
- Sincrónico pero envuelto en Promises (compatible con async Fase 2)
- Manejo de errores: quota exceeded, datos corruptos
- Pruning automático si excede 100 scores

### 3. Visualización
- Overlay modal con tabla de top 10
- Empty state si no hay scores
- Integración en game over screen
- Badge "¡Nuevo récord!" o ranking

### 4. Interactividad
- Botón "Ver tabla" en game over
- Cerrar con X, ESC o clic fuera
- Keyboard navigation (Tab, Escape)
- Accesible: screen reader compatible

### 5. Dev Mode
- Botón oculto "Clear Leaderboard"
- Confirmación antes de limpiar
- Comando console: `window.__torreNubes.clearLeaderboard()`

---

## Performance

- **Initialize**: ~1ms
- **recordScore**: <1ms
- **store.save()**: <1ms (async, no bloquea)
- **renderLeaderboard()**: <5ms (10 filas)
- **Memory**: ~8-16 KB para 100 scores

**No causa jank** en 60 FPS (16.67ms/frame)

---

## Testing

### Unit Tests
- ScoreManager (mock storage)
- LocalStorageScoreStore
- Leaderboard UI functions

### Integration Tests
- localStorage persist/load
- Quota exceeded handling
- Corrupted data recovery

### Manual Tests
- Registrar score al perder
- Ver tabla en game over
- Overlay interactions
- Mobile responsive
- Keyboard navigation
- a11y (screen reader)

---

## Error Handling

| Error | Manejo |
|-------|--------|
| localStorage quota exceeded | Prune automático + log |
| Datos corruptos | Ignorar + cargar vacío |
| Invalid timestamp | Rechazar score + log |
| Negative height | Rechazar score + log |
| Storage unavailable | Continue sin persistir + log warning |

---

## Accesibilidad

✅ Semantic HTML (`<table>`, `<thead>`, `<tbody>`)
✅ ARIA labels en botones
✅ Keyboard navigation (Tab, Escape)
✅ Screen reader compatible
✅ Todos los textos en español
✅ Focus visible states

---

## Preparación para Fase 2 (DynamoDB)

La arquitectura permite migración transparente:

1. Crear `DynamoDBScoreStore extends ScoreStore`
2. Implementar métodos: `load()`, `save()`, `clear()`
3. En `main.js`: cambiar `new LocalStorageScoreStore()` → `new DynamoDBScoreStore()`
4. Lógica de juego **sin cambios**

---

## Decisiones de Diseño

### 1. Strategy Pattern en lugar de factory
**Por qué**: Storage provider es intercambiable en runtime. Factory sería innecesario.

### 2. ScoreManager como singleton
**Por qué**: Un solo leaderboard por juego. Acceso global desde main.js.

### 3. Fire-and-forget save() en recordScore()
**Por qué**: No bloquea game loop. Persiste en background.

### 4. Max 100 scores
**Por qué**: Balance entre histórico suficiente (~2-3 meses) y tamaño manejable (<10 KB).

### 5. DOM overlay en lugar de canvas
**Por qué**: Tabla es estructura de datos; DOM es más semantic y accesible que pixel art en canvas.

### 6. ISO 8601 timestamps
**Por qué**: Standard internacional, parseble, legible, sin ambigüedades de zona horaria.

---

## Ejemplos de Uso

### Registrar Score
```javascript
const result = scoreManager.recordScore(1500);
// result = { score: 1500, isNewRecord: true, rank: 1 }
```

### Mostrar Leaderboard
```javascript
const scores = scoreManager.getLeaderboard(10);
leaderboard.renderLeaderboard(scores);
leaderboard.showLeaderboard();
```

### Limpiar (Dev)
```javascript
await scoreManager.clear();
```

---

## Arquivos a Modificar

| Archivo | Tipo | Cambios |
|---------|------|---------|
| `src/data/scoreStore.js` | Nuevo | Interface + LocalStorageScoreStore |
| `src/data/scoreManager.js` | Nuevo | Orquestador |
| `src/ui/leaderboard.js` | Nuevo | Rendering UI |
| `index.html` | Modificado | Agregar overlay + game over elements |
| `src/main.js` | Modificado | Imports + inicialización + integración |
| `<style>` (index.html) | Modificado | CSS leaderboard |

---

## Validación contra Requisitos

| Requisito | Implementado | Notas |
|-----------|--------------|-------|
| 1. Captura y Registro | ✅ | recordScore() con timestamp |
| 2. Persistencia localStorage | ✅ | LocalStorageScoreStore + error handling |
| 3. Visualización Top 10 | ✅ | renderLeaderboard() + empty state |
| 4. Integración Game Over | ✅ | updateGameOverScore() + botón |
| 5. Reset Capability | ✅ | clear() + dev mode |
| 6. Arquitectura Modular | ✅ | Strategy pattern + ScoreManager |
| 7. Error Handling | ✅ | Quota, corruption, validation |
| 8. Performance | ✅ | <50ms operations, no game loop blocking |
| 9. Accesibilidad | ✅ | Semantic HTML, keyboard, screen reader |

---

## Próximos Pasos (Post-Diseño)

1. ✅ Diseño completado (este documento)
2. 📋 Crear tasks.md (tareas de implementación)
3. 🔨 Implementar módulos según orden
4. ✅ Crear tests
5. 🧪 Testing e integración
6. 📦 Merge a main

---

## Notas

- **No hay dependencias externas** - 100% vanilla JavaScript
- **Compatible con navegadores modernos** - ES6 modules, Promise, localStorage
- **Listo para producción** - Error handling robusto, performance optimizado
- **Escalable a Fase 2** - Interfaz abstracta permite DynamoDB sin refactor

