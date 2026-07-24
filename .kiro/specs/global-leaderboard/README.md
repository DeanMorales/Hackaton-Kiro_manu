# Tabla de Scores Global - Documentación Completa

Bienvenido a la especificación técnica completa para la **Tabla de Scores Global** de Torre de las Nubes. Este documento sirve como índice y guía de navegación.

---

## 📑 Índice de Documentos

### 1. **requirements.md** - Requisitos Aprobados
Estado: ✅ APROBADO

Contiene los 9 requisitos detallados del sistema:
1. Captura y Registro de Score
2. Persistencia en localStorage
3. Visualización de Tabla de Scores
4. Integración con Game Over
5. Capacidad de Limpieza (Reset)
6. Soporte para Arquitectura Modular
7. Manejo de Errores y Validación
8. Performance y UX
9. Accesibilidad y Localización

**Uso**: Reference para validar que el diseño cubre todos los requisitos.

---

### 2. **design.md** - Diseño Técnico Completo (PRINCIPAL)
Estado: ✅ NUEVO

Documento técnico principal con 10 secciones:

1. **Overview** - Resumen ejecutivo
2. **Architecture** - Diagrama de flujo + componentes
3. **Components and Interfaces** - Código detallado de:
   - `ScoreStore` (interface abstracta)
   - `LocalStorageScoreStore` (implementación Fase 1)
   - `ScoreManager` (orquestador)
   - `leaderboard.js` (UI rendering)
4. **Data Models** - Schemas JSON + localStorage format
5. **UI Components** - HTML structure + overlay design
6. **Integration Flow** - Cómo se conecta todo (main.js)
7. **Error Handling** - Estrategias para 3 tipos de errores
8. **Testing Strategy** - Unit + integration tests
9. **Performance Considerations** - Async/sync, caching, timing
10. **Accesibility** - Semantic HTML, keyboard nav, a11y

**Uso**: Lectura principal para entender arquitectura y código.

---

### 3. **DESIGN_SUMMARY.md** - Resumen Ejecutivo
Estado: ✅ SÍNTESIS

Resumen de 1-2 páginas con:
- Objetivo
- Arquitectura en diagrama
- Componentes tabla
- Flujo integración
- Módulos a crear (tabla)
- Características principales
- Performance metrics
- Testing checklist
- Decisiones clave
- Validación vs requisitos

**Uso**: Quick reference, presentaciones, aprobación.

---

### 4. **wireframes.md** - Wireframes y UI/UX
Estado: ✅ VISUAL

8 secciones con diseño visual:

1. Overlay del leaderboard (ASCII art)
2. Game Over screen integrado
3. CSS - Leaderboard overlay (completo)
4. CSS - Game Over screen modifications
5. Animations & transitions
6. Color palette (variables CSS)
7. Mobile responsive breakpoints
8. Dev mode - Clear leaderboard button

**Uso**: Implementadores copian CSS, diseñadores validan UX.

---

### 5. **implementation-guide.md** - Guía Paso a Paso
Estado: ✅ ROADMAP

Instrucciones de implementación detalladas:

1. Archivo por archivo (qué crear, qué modificar)
2. Orden de implementación recomendado
3. Puntos de integración clave (dónde insertar código)
4. Configuración de límites (max 100 scores)
5. Dev mode (clear leaderboard)
6. Consideraciones de performance
7. Testing checklist
8. Errores comunes a evitar

**Uso**: Implementadores siguen este documento.

---

### 6. **sequences.md** - Diagramas de Secuencia
Estado: ✅ DIAGRAMAS

10 diagramas ASCII mostrando flujos temporales:

1. Inicialización del juego
2. Registrar score (game over)
3. Mostrar leaderboard en game over
4. Cerrar leaderboard
5. Limpiar leaderboard (dev mode)
6. Migración a DynamoDB (Fase 2 teórica)
7. Error handling - localStorage quota exceeded
8. Validación de score - rechazo
9. Empty leaderboard state
10. Timeline completo: partida → game over → tabla

Cada diagrama incluye:
- Duración (ms)
- Bloquea game loop: Sí/No
- Fallback strategy

**Uso**: Entender timing y flujos en detalle, debugging.

---

### 7. **DECISIONS.md** - Decisiones Justificadas
Estado: ✅ JUSTIFICACIONES

15 preguntas clave respondidas:

1. ¿Por qué Strategy Pattern?
2. ¿Por qué fire-and-forget save()?
3. ¿Por qué máximo 100 scores?
4. ¿Por qué ISO 8601 timestamps?
5. ¿Por qué DOM overlay en lugar de canvas?
6. ¿Por qué localStorage en Fase 1?
7. ¿Cuándo capturar el score?
8. ¿Por qué "Puntuación #N"?
9. ¿Por qué Promises para operaciones síncronas?
10. ¿Cómo se prioriza renderizado?
11. ¿Qué pasa si localStorage quota se excede?
12. ¿Por qué no usar localStorage.length?
13. ¿Cómo testear sin localStorage real?
14. ¿Por qué no fecha local en lugar de ISO?
15. ¿Por qué singleton para scoreManager?

Cada respuesta incluye:
- Opciones consideradas
- Razón de la decisión
- Implicaciones

**Uso**: Arquitectos/lead devs entienden "el por qué", futuro maintainers saben qué cambiar.

---

## 🎯 Para Diferentes Roles

### Product Manager / Stakeholder
1. Lee: **DESIGN_SUMMARY.md** (5 min)
   - Validar que requisitos estén cubiertos
2. Lee: **wireframes.md** (Overlay section) (5 min)
   - Ver cómo se vería

**Tiempo total**: 10 minutos

---

### Arquitecto / Lead Developer
1. Lee: **DESIGN_SUMMARY.md** (10 min)
2. Lee: **design.md** sections 1-3 (Architecture, Components) (20 min)
3. Revisa: **DECISIONS.md** (15 min)
4. Revisa: **sequences.md** (10 min)

**Tiempo total**: 55 minutos

---

### Implementador (Frontend)
1. Lee: **implementation-guide.md** (15 min)
   - Entiende qué crear, en qué orden
2. Lee: **design.md** sections 3-4 (Components, Data Models) (20 min)
   - Entiende interfaces exactas
3. Copia: **wireframes.md** CSS (5 min)
4. Sigue: **implementation-guide.md** paso a paso (2-4 horas)
5. Refiere: **design.md** section 8 (Testing) para tests (1 hora)

**Tiempo total**: Lectura 1h, Implementación 3-5h

---

### QA / Tester
1. Lee: **requirements.md** (10 min)
   - Criterios de aceptación
2. Lee: **implementation-guide.md** → Testing Checklist (5 min)
3. Refiere: **DECISIONS.md** → Error Handling para edge cases (10 min)

**Tiempo total**: 25 minutos + testing manual 2-4 horas

---

### Futuro Maintainer (Fase 2)
1. Lee: **DESIGN_SUMMARY.md** (quick context) (5 min)
2. Lee: **sequences.md** section 6 (DynamoDB migration) (5 min)
3. Lee: **DECISIONS.md** section 1 (Strategy Pattern) (5 min)
4. Refiere: **design.md** section 2 (Architecture) para modificar (10 min)

**Acción**: Implementar `DynamoDBScoreStore extends ScoreStore`

---

## 📋 Checklist de Diseño

### Cobertura de Requisitos
- ✅ Req 1: Captura y registro
- ✅ Req 2: Persistencia localStorage
- ✅ Req 3: Visualización Top 10
- ✅ Req 4: Game Over integration
- ✅ Req 5: Reset capability
- ✅ Req 6: Arquitectura modular
- ✅ Req 7: Error handling
- ✅ Req 8: Performance <50ms
- ✅ Req 9: Accesibilidad

### Completitud del Diseño
- ✅ Arquitectura (diagrama + componentes)
- ✅ Interfaces (signatures exactas)
- ✅ Data models (schemas JSON)
- ✅ UI design (HTML + CSS)
- ✅ Integration points (dónde se conecta)
- ✅ Error handling (3 estrategias)
- ✅ Performance (timing análisis)
- ✅ Testing (unit + integration)
- ✅ Decisions (15 decisiones justificadas)
- ✅ Implementation guide (paso a paso)

### Preparación para Desarrollo
- ✅ Código de ejemplo (pseudocódigo completo)
- ✅ Wireframes (visual + HTML)
- ✅ CSS (completo, listo para copiar)
- ✅ Secuencias (timing diagrams)
- ✅ Errores comunes (lista)
- ✅ Testing checklist (manual + automated)

---

## 🚀 Siguientes Pasos

Después de este diseño aprobado:

1. **Crear `tasks.md`** 
   - Tareas concretas de implementación
   - Asignación de puntos/story
   - Dependencias entre tareas

2. **Fase de Desarrollo**
   - Seguir `implementation-guide.md`
   - Implementar módulos en orden
   - Testing continuo

3. **Code Review**
   - Validar contra `design.md`
   - Chequear `DECISIONS.md` para justificaciones
   - Verificar performance (timing de `sequences.md`)

4. **QA & Testing**
   - Seguir `implementation-guide.md` → Testing Checklist
   - Validar criterios de aceptación vs `requirements.md`

5. **Deployment & Monitoring**
   - localStorage quota monitoring
   - Error logging (browser console warnings)
   - User feedback (¿es útil el leaderboard?)

6. **Fase 2 (Futuro)**
   - Refiere `sequences.md` section 6
   - Implementar `DynamoDBScoreStore`
   - Cambiar una línea en `main.js`
   - El resto del código: sin cambios

---

## 📊 Estadísticas del Diseño

| Métrica | Valor |
|---------|-------|
| Requisitos cubiertos | 9/9 (100%) |
| Documentos | 8 |
| Páginas equivalentes | ~40 |
| Líneas de código (pseudocódigo) | ~350 |
| Módulos a crear | 3 |
| Módulos a modificar | 2 |
| Componentes UI | 2 |
| Test cases propuestos | 15+ |
| Decisiones justificadas | 15 |
| Diagramas de secuencia | 10 |

---

## 🔗 Referencias Cruzadas

**Design.md → Wireframes.md**:
- Design section 4 (UI Components) → Wireframes section 3 (CSS)

**Design.md → Implementation-guide.md**:
- Design section 3 (Components) → Implementation-guide.md Archivo 1-3

**Requirements.md → DESIGN_SUMMARY.md**:
- Final table "Validación contra requisitos"

**Sequences.md → DECISIONS.md**:
- Sequence 2 (recordScore) → Decision 2 (fire-and-forget)
- Sequence 6 (DynamoDB) → Decision 1 (Strategy Pattern)

---

## 💡 Notas Importantes

### Arquitectura Preparada para Fase 2
- No es especulativo: DynamoDB (Req 6) es diseño central
- Strategy Pattern permite cambio trivial
- Código no requiere refactor

### Performance No-Bloqueante
- Todas las operaciones <5ms (excepto save async)
- Fire-and-forget para persistencia
- No impacta game loop 60 FPS

### Testing Cuidadoso
- Mocks para localStorage (tests rápidos)
- Integration tests locales
- No hay tests e2e (no hay backend en Fase 1)

### Accesibilidad Nativa
- Semantic HTML (no necesita ARIA patches)
- Keyboard nav gratis (Escape, Tab, Focus)
- Screen reader compatible

---

## ✅ Validación del Diseño

Este diseño ha sido revisado contra:
- ✅ Requisitos del proyecto (requirements.md)
- ✅ Arquitectura existente (src/ modular)
- ✅ Convenciones de código (camelCase, constantes MAYÚSCULAS)
- ✅ Performance targets (<50ms, no game loop block)
- ✅ Accesibilidad (WCAG 2.1 AA)
- ✅ Escalabilidad (Fase 2 DynamoDB)

---

## 📞 Preguntas Frecuentes

**P: ¿Qué pasa si localStorage no está disponible?**
A: Cargar array vacío, continuar sin persisiencia. El juego funciona, solo sin histórico. Ver design.md section 7.

**P: ¿Puedo mostrar más de top 10?**
A: Sí, cambiar parámetro en `leaderboard.renderLeaderboard(scoreManager.getLeaderboard(50))`. Ver implementation-guide.md.

**P: ¿Cómo migro a DynamoDB?**
A: Crear `DynamoDBScoreStore`, cambiar una línea en main.js. Ver sequences.md section 6.

**P: ¿Puedo agregar más campos (rank, nivel, etc.)?**
A: Sí, extender Score object schema. Ver design.md section 4 Data Models.

**P: ¿Por qué no usar TypeScript?**
A: Proyecto es vanilla JS (sin build). TypeScript sería cambio de arquitectura. Futura decisión.

**P: ¿Hay tests automatizados?**
A: Tests propuestos (Vitest + mocks). Ver design.md section 8 Testing Strategy.

---

## 📝 Versión del Documento

- **Versión**: 1.0 Completa
- **Estado**: ✅ Listo para Desarrollo
- **Fecha**: Enero 2024
- **Autor**: Diseño Técnico - Torre de las Nubes
- **Revisores**: Requisitos aprobados en requirements.md

---

## Fin de Índice

**Comienza por**: 
1. Si eres stakeholder: lee `DESIGN_SUMMARY.md`
2. Si eres arquitecto: lee `design.md` sections 1-3
3. Si eres desarrollador: lee `implementation-guide.md`
4. Si eres tester: lee `requirements.md` + implementation-guide.md Testing Checklist

¡Éxito en la implementación! 🎮

