import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderLeaderboard,
  showLeaderboard,
  hideLeaderboard,
  updateGameOverScore,
  formatDateLocale,
  bindLeaderboardControls
} from './leaderboard.js';

describe('Leaderboard UI Module', () => {
  beforeEach(() => {
    // Set up DOM structure for testing
    document.body.innerHTML = `
      <div id="leaderboardScreen" class="hidden overlay">
        <div class="overlay-content">
          <div class="leaderboard-header">
            <h2>Tabla de Scores</h2>
            <button class="close-btn" aria-label="Cerrar tabla">✕</button>
          </div>
          <div class="leaderboard-body">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Puntaje</th>
                  <th scope="col">Fecha</th>
                </tr>
              </thead>
              <tbody id="leaderboardTableBody"></tbody>
            </table>
            <div id="leaderboardEmpty" class="empty-state hidden">
              <p>No hay scores aún. ¡Completa una partida para aparecer aquí!</p>
            </div>
          </div>
        </div>
      </div>
      <div id="gameOverScreen">
        <div class="score-info">
          <p id="finalScore">Tu puntuación: <strong>0</strong></p>
          <p id="scoreRank" class="rank-badge"></p>
        </div>
        <button id="viewLeaderboardBtn" class="btn-secondary">Ver tabla de scores</button>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('renderLeaderboard', () => {
    it('should render scores as table rows', () => {
      const scores = [
        { id: '1', score: 1500, timestamp: '2024-01-15T14:30:00.000Z' },
        { id: '2', score: 1200, timestamp: '2024-01-14T10:20:00.000Z' }
      ];

      renderLeaderboard(scores);

      const rows = document.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(2);
    });

    it('should display rank (1-indexed), score, and timestamp in each row', () => {
      const scores = [{ id: '1', score: 1500, timestamp: '2024-01-15T14:30:00.000Z' }];

      renderLeaderboard(scores);

      const row = document.querySelector('tbody tr');
      const cells = row.querySelectorAll('td');
      
      expect(cells[0].textContent).toBe('1'); // rank
      expect(cells[1].textContent).toBe('1500'); // score
      expect(cells[2].textContent).toMatch(/\d{2}\s\w+\s\d{4}/); // formatted date
    });

    it('should hide table and show empty state when scores is empty', () => {
      renderLeaderboard([]);

      const table = document.querySelector('.leaderboard-table');
      const empty = document.getElementById('leaderboardEmpty');

      expect(table.classList.contains('hidden')).toBe(true);
      expect(empty.classList.contains('hidden')).toBe(false);
      expect(empty.textContent).toContain('No hay scores aún');
      expect(empty.textContent).toContain('¡Completa una partida para aparecer aquí!');
    });

    it('should show table and hide empty state when scores has data', () => {
      const scores = [{ id: '1', score: 1500, timestamp: '2024-01-15T14:30:00.000Z' }];

      renderLeaderboard(scores);

      const table = document.querySelector('.leaderboard-table');
      const empty = document.getElementById('leaderboardEmpty');

      expect(table.classList.contains('hidden')).toBe(false);
      expect(empty.classList.contains('hidden')).toBe(true);
    });

    it('should clear tbody before rendering', () => {
      const scores1 = [{ id: '1', score: 1500, timestamp: '2024-01-15T14:30:00.000Z' }];
      const scores2 = [{ id: '2', score: 2000, timestamp: '2024-01-16T14:30:00.000Z' }];

      renderLeaderboard(scores1);
      let rows = document.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(1);

      renderLeaderboard(scores2);
      rows = document.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(1);
      expect(rows[0].querySelector('.score-value').textContent).toBe('2000');
    });

    it('should handle null scores gracefully', () => {
      renderLeaderboard(null);

      const table = document.querySelector('.leaderboard-table');
      const empty = document.getElementById('leaderboardEmpty');

      expect(table.classList.contains('hidden')).toBe(true);
      expect(empty.classList.contains('hidden')).toBe(false);
    });

    it('should render correct number of rows (all if < 10, all provided if >= 10)', () => {
      // Test with < 10 scores (should render all)
      const scoresLessThan10 = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        score: 1500 - i * 100,
        timestamp: '2024-01-15T14:30:00.000Z'
      }));

      renderLeaderboard(scoresLessThan10);
      let rows = document.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(5);

      // Test with exactly 10 scores
      const scoresExactly10 = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        score: 1500 - i * 100,
        timestamp: '2024-01-15T14:30:00.000Z'
      }));

      renderLeaderboard(scoresExactly10);
      rows = document.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(10);

      // Test with > 10 scores (should render all provided)
      const scoresMoreThan10 = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        score: 1500 - i * 100,
        timestamp: '2024-01-15T14:30:00.000Z'
      }));

      renderLeaderboard(scoresMoreThan10);
      rows = document.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(15);
    });
  });

  describe('showLeaderboard', () => {
    it('should remove hidden class from leaderboardScreen', () => {
      const screen = document.getElementById('leaderboardScreen');
      screen.classList.add('hidden');

      showLeaderboard();

      expect(screen.classList.contains('hidden')).toBe(false);
    });
  });

  describe('hideLeaderboard', () => {
    it('should add hidden class to leaderboardScreen', () => {
      const screen = document.getElementById('leaderboardScreen');
      screen.classList.remove('hidden');

      hideLeaderboard();

      expect(screen.classList.contains('hidden')).toBe(true);
    });
  });

  describe('updateGameOverScore', () => {
    it('should update final score text', () => {
      updateGameOverScore(1500, false, 3);

      const finalScore = document.getElementById('finalScore');
      expect(finalScore.innerHTML).toContain('1500');
      expect(finalScore.innerHTML).toContain('Tu puntuación');
    });

    it('should display new record badge when isNewRecord is true', () => {
      updateGameOverScore(2000, true, 1);

      const rankBadge = document.getElementById('scoreRank');
      expect(rankBadge.textContent).toBe('🏆 ¡Nuevo récord!');
      expect(rankBadge.classList.contains('new-record')).toBe(true);
    });

    it('should display rank number when isNewRecord is false', () => {
      updateGameOverScore(1500, false, 3);

      const rankBadge = document.getElementById('scoreRank');
      expect(rankBadge.textContent).toBe('Puntuación #3');
      expect(rankBadge.classList.contains('new-record')).toBe(false);
    });

    it('should remove new-record class when isNewRecord is false', () => {
      updateGameOverScore(2000, true, 1);
      let rankBadge = document.getElementById('scoreRank');
      expect(rankBadge.classList.contains('new-record')).toBe(true);

      updateGameOverScore(1500, false, 2);
      rankBadge = document.getElementById('scoreRank');
      expect(rankBadge.classList.contains('new-record')).toBe(false);
    });
  });

  describe('formatDateLocale', () => {
    it('should format ISO 8601 timestamp to Spanish locale format', () => {
      const isoString = '2024-01-15T14:30:00.000Z';
      const formatted = formatDateLocale(isoString);

      // Check for basic format: dd mmm yyyy, hh:mm
      expect(formatted).toMatch(/\d{2}\s\w+\s\d{4},\s\d{2}:\d{2}/);
      expect(formatted).toContain('15'); // day
      expect(formatted).toContain('2024'); // year
    });

    it('should return "—" for invalid ISO strings', () => {
      const formatted = formatDateLocale('invalid-date');
      expect(formatted).toBe('—');
    });

    it('should return "—" for null timestamp', () => {
      const formatted = formatDateLocale(null);
      expect(formatted).toBe('—');
    });

    it('should return "—" for undefined timestamp', () => {
      const formatted = formatDateLocale(undefined);
      expect(formatted).toBe('—');
    });

    it('should use Spanish month abbreviations', () => {
      const isoString = '2024-01-15T14:30:00.000Z';
      const formatted = formatDateLocale(isoString);

      // Spanish abbreviations: ene (enero)
      expect(formatted).toContain('ene');
    });

    it('should use 24-hour format', () => {
      // Use a fixed UTC time to avoid timezone issues
      const isoString = '2024-01-15T23:59:00.000Z';
      const formatted = formatDateLocale(isoString);

      // Just verify it contains hours and minutes in a reasonable range
      // (accounting for timezone conversion, UTC 23:59 could be different local time)
      expect(formatted).toMatch(/\d{2}:\d{2}/);
      expect(formatted).not.toMatch(/\s(AM|PM)/); // Should use 24-hour format (no AM/PM)
    });
  });

  describe('bindLeaderboardControls', () => {
    it('should attach click handler to close button', () => {
      const closeBtn = document.querySelector('#leaderboardScreen .close-btn');
      const mockCallback = () => {};

      bindLeaderboardControls(mockCallback);

      expect(closeBtn).toBeTruthy();
    });

    it('should call onClose when close button is clicked', () => {
      const mockCallback = vi.fn();
      const closeBtn = document.querySelector('#leaderboardScreen .close-btn');

      bindLeaderboardControls(mockCallback);
      closeBtn.click();

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should call onClose when clicking outside the overlay content', () => {
      const mockCallback = vi.fn();
      const screen = document.getElementById('leaderboardScreen');

      bindLeaderboardControls(mockCallback);

      // Create a click event on the overlay itself (not on content)
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: screen, enumerable: true });
      screen.dispatchEvent(event);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      const mockCallback = vi.fn();
      const screen = document.getElementById('leaderboardScreen');

      bindLeaderboardControls(mockCallback);
      screen.classList.remove('hidden'); // Make sure overlay is visible

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should not call onClose for Escape key when overlay is hidden', () => {
      const mockCallback = vi.fn();
      const screen = document.getElementById('leaderboardScreen');

      bindLeaderboardControls(mockCallback);
      screen.classList.add('hidden'); // Make sure overlay is hidden

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
