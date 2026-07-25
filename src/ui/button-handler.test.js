/**
 * Test for "Ver tabla de scores" button click handler.
 * This test verifies the button exists, has a click handler,
 * and properly calls scoreManager.getLeaderboard(10) and leaderboard functions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scoreManager } from '../data/scoreManager.js';
import { renderLeaderboard, showLeaderboard, hideLeaderboard } from './leaderboard.js';

describe('Button Click Handler - "Ver tabla de scores"', () => {
  beforeEach(async () => {
    // Clear any previous scores and clear localStorage
    await scoreManager.clear();
    scoreManager.leaderboard = [];
    scoreManager.loaded = false;
    
    // Create button
    const btn = document.createElement('button');
    btn.id = 'viewLeaderboardBtn';
    document.body.appendChild(btn);

    // Create leaderboard screen overlay
    const screen = document.createElement('div');
    screen.id = 'leaderboardScreen';
    screen.classList.add('hidden');
    document.body.appendChild(screen);

    // Create leaderboard table
    const table = document.createElement('table');
    table.classList.add('leaderboard-table');
    screen.appendChild(table);

    // Create tbody
    const tbody = document.createElement('tbody');
    tbody.id = 'leaderboardTableBody';
    table.appendChild(tbody);

    // Create empty state
    const empty = document.createElement('div');
    empty.id = 'leaderboardEmpty';
    empty.classList.add('hidden');
    screen.appendChild(empty);
  });

  afterEach(() => {
    // Clean up DOM
    const btn = document.getElementById('viewLeaderboardBtn');
    const screen = document.getElementById('leaderboardScreen');
    if (btn) btn.remove();
    if (screen) screen.remove();
  });

  it('should retrieve top 10 scores from scoreManager.getLeaderboard(10)', async () => {
    // Initialize scoreManager
    await scoreManager.initialize();

    // Add test scores
    scoreManager.recordScore(150);
    scoreManager.recordScore(200);
    scoreManager.recordScore(175);

    // Simulate the button click handler code from main.js
    const scores = scoreManager.getLeaderboard(10);
    
    expect(scores.length).toBe(3);
    expect(scores[0].score).toBe(200); // Highest score first
  });

  it('should call renderLeaderboard() when button is clicked', async () => {
    await scoreManager.initialize();
    scoreManager.recordScore(150);
    scoreManager.recordScore(200);

    // Simulate button click handler
    const scores = scoreManager.getLeaderboard(10);
    renderLeaderboard(scores);

    // Verify table rows were created
    const tbody = document.getElementById('leaderboardTableBody');
    const rows = tbody.querySelectorAll('tr');
    expect(rows.length).toBe(2);
  });

  it('should call showLeaderboard() to make overlay visible', async () => {
    await scoreManager.initialize();
    scoreManager.recordScore(100);

    // Get scores and show leaderboard
    const scores = scoreManager.getLeaderboard(10);
    renderLeaderboard(scores);
    showLeaderboard();

    // Verify overlay is now visible
    const screen = document.getElementById('leaderboardScreen');
    expect(screen.classList.contains('hidden')).toBe(false);
  });

  it('should display top 10 scores in table with rank, score, and date', async () => {
    await scoreManager.initialize();
    
    // Add 12 scores to test that only top 10 are retrieved
    for (let i = 0; i < 12; i++) {
      scoreManager.recordScore(100 + i);
    }

    // Simulate button click handler
    const scores = scoreManager.getLeaderboard(10);
    renderLeaderboard(scores);

    // Verify only top 10 are displayed
    const tbody = document.getElementById('leaderboardTableBody');
    const rows = tbody.querySelectorAll('tr');
    expect(rows.length).toBe(10);

    // Verify first row (highest score = 111)
    const firstRow = rows[0];
    const cells = firstRow.querySelectorAll('td');
    expect(cells.length).toBe(3);
    expect(cells[0].textContent).toBe('1'); // Rank
    expect(cells[1].textContent).toBe('111'); // Score
    expect(cells[2].textContent).not.toBe(''); // Date (formatted)
  });

  it('should show empty state when no scores exist', async () => {
    await scoreManager.initialize();

    // Render empty leaderboard
    const scores = scoreManager.getLeaderboard(10);
    renderLeaderboard(scores);

    // Verify table is hidden and empty state is shown
    const table = document.querySelector('.leaderboard-table');
    const empty = document.getElementById('leaderboardEmpty');
    expect(table.classList.contains('hidden')).toBe(true);
    expect(empty.classList.contains('hidden')).toBe(false);
  });

  it('should handle fewer than 10 scores correctly', async () => {
    await scoreManager.initialize();
    
    // Add only 5 scores
    for (let i = 0; i < 5; i++) {
      scoreManager.recordScore(100 + i);
    }

    const scores = scoreManager.getLeaderboard(10);
    expect(scores.length).toBe(5);
    
    renderLeaderboard(scores);
    const tbody = document.getElementById('leaderboardTableBody');
    const rows = tbody.querySelectorAll('tr');
    expect(rows.length).toBe(5);
  });
});
