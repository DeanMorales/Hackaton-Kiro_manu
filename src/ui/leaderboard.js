/* ===== UI: Leaderboard overlay y score display ===== */

/**
 * Renderiza la tabla de leaderboard con scores.
 * Si el array de scores está vacío, oculta la tabla y muestra el mensaje de estado vacío.
 * Si hay datos, muestra la tabla con los scores en filas ordenadas.
 * @param {Array} scores - Array de objetos { id, score, timestamp }
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

    const rankCell = document.createElement('td');
    rankCell.textContent = String(idx + 1);

    // El nombre se escribe vía textContent para evitar inyección de HTML.
    const nameCell = document.createElement('td');
    nameCell.className = 'score-name';
    const name = typeof score.name === 'string' ? score.name.trim() : '';
    nameCell.textContent = name || 'Anónimo';
    if (!name) nameCell.classList.add('score-name-anon');

    const scoreCell = document.createElement('td');
    scoreCell.className = 'score-value';
    scoreCell.textContent = String(score.score);

    const dateCell = document.createElement('td');
    dateCell.className = 'score-date';
    dateCell.textContent = formatDateLocale(score.timestamp);

    row.append(rankCell, nameCell, scoreCell, dateCell);
    tbody.appendChild(row);
  });
}

/**
 * Muestra el overlay del leaderboard removiendo la clase 'hidden'.
 */
export function showLeaderboard() {
  document.getElementById('leaderboardScreen').classList.remove('hidden');
}

/**
 * Oculta el overlay del leaderboard añadiendo la clase 'hidden'.
 */
export function hideLeaderboard() {
  document.getElementById('leaderboardScreen').classList.add('hidden');
}

/**
 * Actualiza la información de score en la pantalla de game over.
 * Muestra el score final y el rango o indicador de nuevo récord.
 * @param {number} height - Altura/score del jugador
 * @param {boolean} isNewRecord - Si es un nuevo récord
 * @param {number} rank - Posición en el leaderboard (1-indexed)
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
 * Formatea un timestamp ISO 8601 a formato legible en español.
 * Retorna un string como "15 ene 2024, 14:30" o "—" si la fecha es inválida.
 * @param {string} isoString - Timestamp en formato ISO 8601
 * @returns {string} Fecha formateada o "—" si es inválida
 */
export function formatDateLocale(isoString) {
  // Handle null/undefined explicitly
  if (isoString === null || isoString === undefined) {
    return '—';
  }
  
  try {
    const d = new Date(isoString);
    if (!(d instanceof Date) || isNaN(d)) {
      return '—';
    }
    
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
 * Vincula los controles del leaderboard:
 * - Click en botón de cerrar
 * - Click fuera del contenido (en el overlay)
 * - Tecla Escape
 * @param {Function} onClose - Callback a ejecutar cuando se cierre
 */
export function bindLeaderboardControls(onClose) {
  const closeBtn = document.querySelector('#leaderboardScreen .close-btn');
  const screen = document.getElementById('leaderboardScreen');

  // Botón de cerrar
  if (closeBtn) {
    closeBtn.addEventListener('click', onClose);
  }

  // Click fuera del contenido
  screen.addEventListener('click', (e) => {
    if (e.target === screen) {
      onClose();
    }
  });

  // Tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !screen.classList.contains('hidden')) {
      onClose();
    }
  });
}
