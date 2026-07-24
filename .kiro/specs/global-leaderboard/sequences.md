# Diagramas de Secuencia - Tabla de Scores Global

## 1. Inicialización del Juego

```
main.js                    scoreManager           scoreStore             localStorage
   |                           |                       |                      |
   |--- import modules ------->|                       |                      |
   |                           |                       |                      |
   |--- initialize() --------->|                       |                      |
   |                           |--- load() ----------->|                      |
   |                           |                       |--- getItem() ------->|
   |                           |                       |<--- JSON array ------|
   |                           |                       |                      |
   |                           |<--- scores[] ---------|                      |
   |                           |                       |                      |
   |<--- ready --------------|                       |                      |
   |                           |                      |
   |--- bindControls --------->| (setup complete)    |
   |                           |
```

**Duración**: ~1-5ms
**Bloquea juego**: No (aunque se espera with await)
**Fallback**: Si localStorage no disponible, cargar array vacío

---

## 2. Registrar Score (Game Over)

```
GameLoop              onDrop/endFight      scoreManager         scoreStore        localStorage
   |                       |                     |                  |                |
   |-- Game Over --------->|                     |                  |                |
   |                       |                     |                  |                |
   |                       |--- recordScore(h) ->|                  |                |
   |                       |                     |                  |                |
   |                       |                     |-- validate --    |                |
   |                       |                     |   - height >= 0  |                |
   |                       |                     |   - ISO8601 ts   |                |
   |                       |                     |                  |                |
   |                       |                     |-- insert in      |                |
   |                       |                     |   order desc     |                |
   |                       |                     |                  |                |
   |                       |<- result (sync) -|                  |                |
   |                       |  {score, isNew,  |                  |                |
   |                       |   rank}          |                  |                |
   |                       |                  |                  |                |
   |                       |--- updateUI ---> | (sync complete)  |                |
   |                       |                  |                  |                |
   |                       |                  |--- save() async ->|                |
   |                       |                  |  (no wait)        |--- setItem() ->|
   |                       |                  |                  |               |
   |-- Render UI --------- |                  |                  |               |
   | (continues)           |                  |                  |               |
   |                       |                  |                  |<- success ---|
   |                       |                  |<-- void ---------|               |
   |                       |                  |                  |               |
```

**Duración**: 
- recordScore (sync): <1ms
- save (async): <1ms but non-blocking
- Total impact on game loop: 0ms (fire-and-forget)

**Flujo**:
1. Captura altura
2. Validación local
3. Inserta en array en memoria
4. Devuelve resultado inmediatamente
5. Persiste en background (no bloquea)

---

## 3. Mostrar Leaderboard en Game Over

```
Player clicks "Ver Tabla"    leaderboard.js           DOM                 scoreManager
   |                              |                     |                      |
   |-- click event ------------->|                      |                      |
   |                              |                      |                      |
   |                              |--- getLeaderboard()->|                      |
   |                              |                      |--- request score 10 -|
   |                              |                      |<- top 10 array ------|
   |                              |                      |                      |
   |                              |--- renderTable() --->|                      |
   |                              |                      |-- create tbody tr -- |
   |                              |                      |-- populate cells --- |
   |                              |                      |-- set visibility -- |
   |                              |                      |                      |
   |                              |<-- DOM ready -------|                      |
   |                              |                      |                      |
   |                              |--- show overlay() -->|                      |
   |                              |                      |-- remove 'hidden' - |
   |                              |                      |-- trigger animation |
   |                              |                      |                      |
   |<-- Table visible -----------|                      |                      |
   |                              |                      |                      |
```

**Duración**: ~5-10ms (rendering 10 filas)
**No bloquea**: Game loop sigue corriendo

---

## 4. Cerrar Leaderboard

```
Player presses ESC / clicks X    leaderboard.js           DOM
   |                                  |                     |
   |-- keyboard/click event -------->|                      |
   |                                  |                      |
   |                                  |--- hideLeaderboard->|
   |                                  |                     |-- add 'hidden'
   |                                  |                     |-- trigger animation
   |                                  |                     |
   |                                  |<-- done ----------|
   |<-- Overlay hidden --------------|                      |
   |                                  |                      |
```

**Duración**: <1ms (DOM manipulation)
**Keyboard support**: Escape, Tab, Focus visible

---

## 5. Limpiar Leaderboard (Dev Mode)

```
Developer (console)          scoreManager              scoreStore          localStorage
   |                              |                         |                    |
   |-- clearLeaderboard() ------->|                         |                    |
   |                              |                         |                    |
   |                              |-- confirmation popup -- |                    |
   |                              |                         |                    |
   |<-- user confirms ------------|                         |                    |
   |                              |                         |                    |
   |                              |-- clear leaderboard --->|                    |
   |                              |    (empty array)        |                    |
   |                              |                         |--- removeItem() -->|
   |                              |                         |                    |
   |                              |<-- void -----------|                        |
   |                              |                   |                        |
   |<-- "Leaderboard cleared" ----|                   |<-- success -----------|
   |                              |                   |                        |
```

**Duración**: <1ms (+ user confirmation time)
**Safety**: Confirmación antes de borrar

---

## 6. Migración a DynamoDB (Fase 2 - Teórico)

```
NEW: DynamoDBScoreStore extends ScoreStore

main.js                         scoreManager           scoreStore (DynamoDB)    AWS Lambda
   |                                |                         |                    |
   |-- new DynamoDBScoreStore ----->|                         |                    |
   |                                |                         |                    |
   |-- initialize() ------->|        |                         |                    |
   |                        |        |--- load() (async) ----->|                    |
   |                        |        |                         |--- query table -->|
   |                        |        |                         |<-- items -----|
   |                        |        |                         |<--- scores array|
   |                        |        |<-- scores[] ------------|                    |
   |                        |<------| (Promise resolved)       |                    |
   |                        |        |                         |                    |
   |<-- ready --------------|        |                         |                    |
   |                        |        |                         |                    |
   |-- recordScore(h) ----->|        |                         |                    |
   |                        |        |-- save() (async) ------>|                    |
   |                        |        |                         |--- putItem() ---->|
   |                        |        |<-- void -----------|                      |
   |                        |<------| (Promise resolved)       |                    |
   |                        |        |                         |<-- success -----|
   |<-- result (immediate)|  (user doesn't wait)  |                    |
   |                        |        |                         |                    |

KEY: Lógica de juego NO cambia
     Solo storage provider es intercambiable
```

**Transición**:
1. Cambiar `new LocalStorageScoreStore()` → `new DynamoDBScoreStore()`
2. Resto del código idéntico
3. Cambio transparente para el juego

---

## 7. Manejo de Errores - localStorage Quota Exceeded

```
recordScore(h)              scoreManager         scoreStore          localStorage
   |                             |                    |                   |
   |-- recordScore ----->|       |                    |                   |
   |                     |       |-- save(scores) --->|                   |
   |                     |       |                    |-- setItem() ----->|
   |                     |       |                    |                   |
   |                     |       |                    |<-- QuotaExceeded  |
   |                     |       |<-- Error ----------|                   |
   |                     |       |                    |                   |
   |                     |       |-- prune() -----    |                   |
   |                     |       |   keep top 50      |                   |
   |                     |       |                    |                   |
   |                     |       |-- save(pruned) --->|                   |
   |                     |       |                    |-- setItem() ----->|
   |                     |       |                    |<-- success -----|
   |                     |       |<-- void ----------|                   |
   |                     |       |                    |                   |
   |                     |  .catch(err) {            |                   |
   |                     |    console.error(err)     |                   |
   |                     |  }                        |                   |
   |                     |                           |                   |
   |<-- result (normal)-|  (non-blocking fallback)  |                   |
   |                     |  Juego continúa normal   |                   |
   |                     |  Solo log de error       |                   |
   |                     |                           |                   |
```

**Fallback**: Automatic pruning + logging, el juego no se quiebra

---

## 8. Validación de Score - Rechazo

```
recordScore(-100)           scoreManager         result
   |                             |                   |
   |-- recordScore(-100) ------->|                   |
   |                             |-- validate:       |
   |                             |   height < 0?     |
   |                             |   YES! Reject     |
   |                             |                   |
   |                             |-- log error ---   |
   |                             |                   |
   |                             |-- return null --->|
   |                             |                   |
   |<-- null -------------------|                   |
   |                             |                   |
   |-- check result             |                   |
   |   if (!result) {            |                   |
   |     don't update UI        |                   |
   |   }                        |                   |
   |                             |                   |
```

**Validaciones**:
- Number.isInteger(height)
- height >= 0
- ISO8601 timestamp
- Array.isArray(data)

---

## 9. Estado: Empty Leaderboard

```
renderLeaderboard([])       leaderboard.js          DOM
   |                             |                   |
   |-- renderLeaderboard ------->|                   |
   |    (empty array)            |                   |
   |                             |-- check length   |
   |                             |   length === 0   |
   |                             |                   |
   |                             |-- hide table --->|
   |                             |   add 'hidden'   |
   |                             |                   |
   |                             |-- show empty --->|
   |                             |   remove hidden  |
   |                             |   "No hay scores"|
   |                             |                   |
   |<-- rendered ------->|       |                   |
   |                             |                   |
```

**Empty State**: Mensaje legible "No hay scores aún. Completa una partida..."

---

## 10. Timeline Completo: Partida → Game Over → Ver Tabla

```
TIMINGS:

T=0ms      Game Over triggered
T=<1ms     recordScore() executes (sync)
           ├─ Validate score
           ├─ Insert in leaderboard array
           └─ Return {score, isNewRecord, rank}
           
T=<1ms     updateGameOverScore() (sync)
           └─ Populate DOM with score info

T=0-5ms    showGameOverScreen() renders

T=5-10ms   save() to localStorage (async, background)
           └─ Player doesn't wait

T=200ms    Player sees game over with score + ranking
           └─ Ready to click "Ver tabla"

T=200-500ms Player clicks "Ver tabla"
           ├─ getLeaderboard(10) → cache hit <1ms
           ├─ renderLeaderboard() → DOM gen <5ms
           ├─ showLeaderboard() → animate overlay
           └─ Table visible

T=1000ms   Player might click "Cerrar" or press ESC
           ├─ hideLeaderboard()
           └─ Overlay hidden (smooth)

T=...ms    Player clicks "Reconstruir"
           └─ Reset game state, continue

KEY: Total blocking time = 0ms (all async after recordScore)
     User experience: instant
```

---

## Resumen de Secuencias

| Secuencia | Duración | Bloquea | Fallback |
|-----------|----------|--------|----------|
| Initialize | ~1ms | brief | empty array |
| recordScore | <1ms | NO | returns null |
| save async | <1ms | NO | non-blocking |
| renderLeaderboard | <5ms | NO | DOM efficient |
| showLeaderboard | <1ms | NO | CSS animation |
| hideLeaderboard | <1ms | NO | instant |
| clearLeaderboard | <1ms | NO | after confirm |
| Error: quota | <1ms | NO | auto-prune |
| Error: corrupt | <1ms | NO | load empty |

---

## Conclusión

**El sistema es no-bloqueante**: 
- Todas las operaciones síncronas críticas son <1ms
- Persistencia es async (fire-and-forget)
- Rendering es eficiente (DOM mínimo)
- No impacta game loop (60 FPS)

