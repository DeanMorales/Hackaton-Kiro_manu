# Wireframes y Detalles Visuales - Tabla de Scores Global

## 1. Overlay del Leaderboard

```
┌──────────────────────────────────────────┐
│  Tabla de Scores                    [✕]  │
├──────────────────────────────────────────┤
│                                          │
│   #   Puntaje        Fecha               │
│  ────────────────────────────────────    │
│   1   2500 bloques   15 ene 2024, 14:30 │
│   2   2000 bloques   14 ene 2024, 14:30 │
│   3   1500 bloques   13 ene 2024, 14:30 │
│   4   1200 bloques   12 ene 2024, 10:15 │
│   5   950 bloques    11 ene 2024, 19:45 │
│   ...                                    │
│   10  500 bloques    05 ene 2024, 08:22 │
│                                          │
│                                          │
└──────────────────────────────────────────┘
     Presiona ESC para cerrar
```

**Estados**:
- **Normal**: 10 filas de scores
- **Empty**: Mensaje "No hay scores aún. ¡Completa una partida para aparecer aquí!"
- **Overflow**: scroll vertical si excede altura

---

## 2. Game Over Screen Integrado

```
┌────────────────────────────────────────────┐
│                                            │
│        🏰 GAME OVER 🏰                     │
│                                            │
│    Has caído de la torre                   │
│                                            │
│  Tu puntuación: 1500                       │
│  🏆 ¡Nuevo récord!                         │
│       (o "Puntuación #3" si no es record)  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  [Ver tabla de scores]               │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  [Reconstruir la torre]              │  │
│  └──────────────────────────────────────┘  │
│                                            │
└────────────────────────────────────────────┘
```

**Cambios desde requisitos**:
- Agregar línea "Tu puntuación: XXX" con número destacado
- Agregar badge con "¡Nuevo récord!" o "Puntuación #N"
- Nuevo botón "Ver tabla de scores" (antes del botón de reintentar)

---

## 3. CSS - Leaderboard Overlay

```css
/* Overlay container */
#leaderboardScreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  font-family: 'Space Grotesk', sans-serif;
  color: var(--text-primary);
}

#leaderboardScreen.hidden {
  display: none;
}

.overlay-content {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--accent-color);
  padding-bottom: 1rem;
}

.leaderboard-header h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--accent-color);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 200ms ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.close-btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.leaderboard-body {
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
}

/* Table */
.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.leaderboard-table.hidden {
  display: none;
}

.leaderboard-table thead {
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 2px solid var(--accent-color);
  position: sticky;
  top: 0;
}

.leaderboard-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--accent-color);
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 1px;
}

.leaderboard-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 200ms ease;
}

.leaderboard-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.leaderboard-table td {
  padding: 0.75rem;
  color: var(--text-primary);
}

.leaderboard-table td:first-child {
  font-weight: 700;
  color: var(--accent-color);
  width: 40px;
}

.leaderboard-table .score-value {
  font-weight: 600;
  color: #4aa3ff;
}

.leaderboard-table .score-date {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Empty state */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--text-secondary);
  font-size: 1rem;
  text-align: center;
}

.empty-state.hidden {
  display: none;
}

.empty-state p {
  margin: 0;
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 600px) {
  .overlay-content {
    width: 95%;
    padding: 1.5rem;
  }

  .leaderboard-table {
    font-size: 0.85rem;
  }

  .leaderboard-table th,
  .leaderboard-table td {
    padding: 0.5rem;
  }

  .leaderboard-header h2 {
    font-size: 1.5rem;
  }
}
```

---

## 4. Game Over Screen - CSS Modifications

```css
/* Score info section - agregar a gameOverScreen */
.score-info {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid var(--accent-color);
  border-radius: 4px;
}

.score-info p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

#finalScore {
  font-size: 1.3rem !important;
  font-weight: 700 !important;
}

#finalScore strong {
  color: var(--accent-color);
  font-size: 1.5rem;
}

#scoreRank {
  font-size: 1rem;
  font-weight: 600;
}

#scoreRank.new-record {
  color: #ffd700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Botón Ver Leaderboard */
#viewLeaderboardBtn {
  margin: 0.5rem 0;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4aa3ff, #5a9fff);
  border: 2px solid #4aa3ff;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 200ms ease;
}

#viewLeaderboardBtn:hover {
  background: linear-gradient(135deg, #5a9fff, #6aaffff);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 163, 255, 0.4);
}

#viewLeaderboardBtn:focus-visible {
  outline: 2px solid #4aa3ff;
  outline-offset: 2px;
}
```

---

## 5. Animation & Transitions

### Overlay Appearance

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

#leaderboardScreen:not(.hidden) .overlay-content {
  animation: slideIn 300ms ease-out;
}
```

### Row Hover Effect

```css
.leaderboard-table tbody tr {
  transition: all 200ms ease;
}

.leaderboard-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}
```

---

## 6. Color Palette

Usar variables CSS existentes del proyecto:

```css
:root {
  /* Colors */
  --accent-color: #4aa3ff;         /* Azul principal */
  --text-primary: #ffffff;         /* Blanco */
  --text-secondary: #b0b0b0;       /* Gris claro */
  --bg-dark: #1a1a2e;              /* Fondo oscuro */
  --bg-darker: #0f0f1e;            /* Fondo más oscuro */
  
  /* Para leaderboard específicamente */
  --score-gold: #ffd700;           /* Oro (new record) */
  --score-blue: #4aa3ff;           /* Azul (scores) */
}
```

---

## 7. Mobile Responsive Breakpoints

**Desktop (>768px)**:
- Overlay: 600px max-width
- Tabla: 10 filas visibles
- Font: 1rem base

**Tablet (600px - 768px)**:
- Overlay: 90% width
- Tabla: 8-10 filas con scroll
- Font: 0.95rem base

**Mobile (<600px)**:
- Overlay: 95% width
- Tabla: 5-7 filas con scroll
- Font: 0.9rem base
- Botones: full width

---

## 8. Dev Mode: Clear Leaderboard Button

Oculto en overlay (solo visible con flag dev):

```html
<div id="devControls" class="dev-controls hidden">
  <button id="clearLeaderboardBtn" class="btn-danger">
    🗑️ Limpiar Leaderboard (Dev)
  </button>
</div>
```

```css
.dev-controls {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.dev-controls.hidden {
  display: none;
}

.btn-danger {
  background: #ff6b61;
  border: 2px solid #ff5a50;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 200ms ease;
}

.btn-danger:hover {
  background: #ff5a50;
  box-shadow: 0 4px 12px rgba(255, 107, 97, 0.3);
}
```

**Activar Dev Mode**:
```javascript
// En main.js o console
window.__torreNubes.devMode = true;
// Mostrar botón
document.getElementById('devControls').classList.remove('hidden');
```

