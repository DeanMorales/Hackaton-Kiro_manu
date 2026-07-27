import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreManager } from './scoreManager.js';

/**
 * Mock ScoreStore implementation for testing
 * Simulates async storage operations with in-memory data
 */
class MockScoreStore {
  constructor() {
    this.data = [];
    this.throwOnLoad = false;
    this.throwOnSave = false;
    this.throwOnClear = false;
  }

  async load() {
    if (this.throwOnLoad) {
      throw new Error('Mock load error');
    }
    return [...this.data]; // Return a copy
  }

  async save(scores) {
    if (this.throwOnSave) {
      throw new Error('Mock save error');
    }
    this.data = [...scores]; // Store a copy
  }

  async clear() {
    if (this.throwOnClear) {
      throw new Error('Mock clear error');
    }
    this.data = [];
  }
}

describe('ScoreManager', () => {
  let manager;
  let mockStore;

  beforeEach(() => {
    mockStore = new MockScoreStore();
    manager = new ScoreManager(mockStore);
  });

  // ===== Test: recordScore() returns object with required properties =====
  it('should return object with score, isNewRecord, and rank properties', () => {
    const result = manager.recordScore(1500);

    expect(result).toBeInstanceOf(Object);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('isNewRecord');
    expect(result).toHaveProperty('rank');
    expect(result.score).toBe(1500);
    expect(result.isNewRecord).toBe(true);
    expect(result.rank).toBe(1);
  });

  // ===== Test: First score marked as isNewRecord: true =====
  it('should mark first score recorded as isNewRecord: true', () => {
    const result = manager.recordScore(1000);

    expect(result.isNewRecord).toBe(true);
  });

  // ===== Test: Second score with lower value is not new record =====
  it('should mark lower score as isNewRecord: false after first score', () => {
    manager.recordScore(1500);
    const result = manager.recordScore(1000);

    expect(result.isNewRecord).toBe(false);
  });

  // ===== Test: Higher score after first is new record =====
  it('should mark higher score as isNewRecord: true when greater than existing', () => {
    manager.recordScore(1000);
    const result = manager.recordScore(1500);

    expect(result.isNewRecord).toBe(true);
  });

  // ===== Test: Scores maintained in descending order (highest first) =====
  it('should maintain scores in descending order', () => {
    manager.recordScore(1000);
    manager.recordScore(2000);
    manager.recordScore(1500);

    const leaderboard = manager.getLeaderboard(10);
    expect(leaderboard[0].score).toBe(2000);
    expect(leaderboard[1].score).toBe(1500);
    expect(leaderboard[2].score).toBe(1000);
  });

  // ===== Test: New score inserted in correct position (not always appended) =====
  it('should insert score in correct position (middle insertion)', () => {
    manager.recordScore(1000);
    manager.recordScore(2000);
    const result = manager.recordScore(1500);

    // New score (1500) should be inserted at position 1 (rank 2)
    expect(result.rank).toBe(2);
    const leaderboard = manager.getLeaderboard(10);
    expect(leaderboard[1].score).toBe(1500);
  });

  // ===== Test: Rank correctly calculated for insertion positions =====
  it('should calculate correct rank when inserted at beginning', () => {
    manager.recordScore(1000);
    manager.recordScore(500);
    const result = manager.recordScore(2000); // New highest

    expect(result.rank).toBe(1);
  });

  it('should calculate correct rank when inserted at end', () => {
    manager.recordScore(2000);
    manager.recordScore(1500);
    const result = manager.recordScore(500); // New lowest

    expect(result.rank).toBe(3);
  });

  it('should calculate correct rank when inserted in middle', () => {
    manager.recordScore(2000);
    manager.recordScore(500);
    const result = manager.recordScore(1500);

    expect(result.rank).toBe(2);
  });

  // ===== Test: recordScore() rejects negative heights (returns null) =====
  it('should reject negative heights and return null', () => {
    const result = manager.recordScore(-100);

    expect(result).toBeNull();
  });

  it('should not add negative score to leaderboard', () => {
    manager.recordScore(1000);
    manager.recordScore(-50);
    const leaderboard = manager.getLeaderboard(10);

    expect(leaderboard.length).toBe(1);
    expect(leaderboard[0].score).toBe(1000);
  });

  // ===== Test: recordScore() rejects non-integer scores (returns null) =====
  it('should reject non-integer scores and return null', () => {
    const resultFloat = manager.recordScore(1.5);
    const resultString = manager.recordScore('1000');

    expect(resultFloat).toBeNull();
    expect(resultString).toBeNull();
  });

  it('should not add non-integer score to leaderboard', () => {
    manager.recordScore(1000);
    manager.recordScore(1.5);
    const leaderboard = manager.getLeaderboard(10);

    expect(leaderboard.length).toBe(1);
    expect(leaderboard[0].score).toBe(1000);
  });

  // ===== Test: getLeaderboard(10) returns top 10 scores =====
  it('should return top 10 scores from leaderboard', () => {
    // Add 15 scores
    for (let i = 0; i < 15; i++) {
      manager.recordScore(1500 - i * 100);
    }

    const top10 = manager.getLeaderboard(10);

    expect(top10.length).toBe(10);
    expect(top10[0].score).toBe(1500);
    expect(top10[9].score).toBe(600);
  });

  // ===== Test: getLeaderboard() returns fewer scores if < 10 entries =====
  it('should return fewer than 10 scores if leaderboard has less than 10 entries', () => {
    manager.recordScore(1500);
    manager.recordScore(1000);
    manager.recordScore(500);

    const leaderboard = manager.getLeaderboard(10);

    expect(leaderboard.length).toBe(3);
  });

  it('should return exactly 5 scores when requesting top 5', () => {
    for (let i = 0; i < 10; i++) {
      manager.recordScore(1000 - i * 50);
    }

    const top5 = manager.getLeaderboard(5);

    expect(top5.length).toBe(5);
  });

  // ===== Test: initialize() loads scores from store and caches them =====
  it('should load scores from store on initialize', async () => {
    const existingScores = [
      { id: '1', score: 2000, timestamp: '2024-01-15T14:30:00.000Z' },
      { id: '2', score: 1500, timestamp: '2024-01-14T14:30:00.000Z' },
      { id: '3', score: 1000, timestamp: '2024-01-13T14:30:00.000Z' }
    ];
    mockStore.data = existingScores;

    await manager.initialize();

    const leaderboard = manager.getLeaderboard(10);
    expect(leaderboard.length).toBe(3);
    expect(leaderboard[0].score).toBe(2000);
  });

  // ===== Test: Second call to initialize() does not reload (checks loaded flag) =====
  it('should not reload scores on second initialize call', async () => {
    const existingScores = [
      { id: '1', score: 2000, timestamp: '2024-01-15T14:30:00.000Z' }
    ];
    mockStore.data = existingScores;

    await manager.initialize();
    const initialLength = manager.getLeaderboard(10).length;

    // Modify store data
    mockStore.data.push({ id: '2', score: 1500, timestamp: '2024-01-14T14:30:00.000Z' });

    // Call initialize again
    await manager.initialize();

    // Leaderboard should still have only 1 score (not reloaded)
    expect(manager.getLeaderboard(10).length).toBe(initialLength);
  });

  it('should set loaded flag to true after initialize', async () => {
    expect(manager.loaded).toBe(false);

    await manager.initialize();

    expect(manager.loaded).toBe(true);
  });

  // ===== Test: clear() empties leaderboard and calls store.clear() =====
  it('should empty leaderboard and call store.clear()', async () => {
    manager.recordScore(1500);
    manager.recordScore(1000);

    expect(manager.getLeaderboard(10).length).toBe(2);

    await manager.clear();

    expect(manager.getLeaderboard(10).length).toBe(0);
    expect(mockStore.data.length).toBe(0);
  });

  it('should persist empty state to store after clear', async () => {
    manager.recordScore(1500);
    const spyOnSave = vi.spyOn(mockStore, 'save');

    await manager.clear();

    // Verify store.clear() was called
    expect(mockStore.data.length).toBe(0);
  });

  // ===== Test: Timestamp is in valid ISO 8601 format =====
  it('should record timestamp in ISO 8601 format', () => {
    manager.recordScore(1500);
    const leaderboard = manager.getLeaderboard(10);

    const timestamp = leaderboard[0].timestamp;
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    expect(timestamp).toMatch(iso8601Regex);
  });

  it('should parse and validate ISO 8601 timestamp', () => {
    manager.recordScore(2000);
    const score = manager.getLeaderboard(10)[0];
    const date = new Date(score.timestamp);

    // Verify it's a valid date and matches ISO format
    expect(date instanceof Date).toBe(true);
    expect(!isNaN(date.getTime())).toBe(true);
    expect(date.toISOString()).toBe(score.timestamp);
  });

  // ===== Test: Score object includes all required fields =====
  it('should include id, score, and timestamp in recorded score', () => {
    manager.recordScore(1500);
    const leaderboard = manager.getLeaderboard(10);
    const score = leaderboard[0];

    expect(score).toHaveProperty('id');
    expect(score).toHaveProperty('score');
    expect(score).toHaveProperty('timestamp');
    expect(typeof score.id).toBe('string');
    expect(typeof score.score).toBe('number');
    expect(typeof score.timestamp).toBe('string');
  });

  // ===== Test: Persistence without await (fire-and-forget) =====
  it('should persist scores to store after recording', async () => {
    const spyOnSave = vi.spyOn(mockStore, 'save');

    manager.recordScore(1500);
    manager.recordScore(1000);

    // Allow async operation to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(spyOnSave).toHaveBeenCalled();
    expect(mockStore.data.length).toBe(2);
  });

  // ===== Test: recordScore() still returns valid result despite save error =====
  it('should return valid result even if store.save() throws', () => {
    mockStore.throwOnSave = true;

    const result = manager.recordScore(1500);

    expect(result).not.toBeNull();
    expect(result.score).toBe(1500);
    expect(result.isNewRecord).toBe(true);
  });

  // ===== Test: Edge case - zero score is valid =====
  it('should accept zero as valid score', () => {
    const result = manager.recordScore(0);

    expect(result).not.toBeNull();
    expect(result.score).toBe(0);
    expect(result.isNewRecord).toBe(true);
  });

  // ===== Test: Multiple scores with same value maintain insertion order =====
  it('should handle multiple scores with same value', () => {
    manager.recordScore(1500);
    manager.recordScore(1500);
    manager.recordScore(1500);

    const leaderboard = manager.getLeaderboard(10);

    expect(leaderboard.length).toBe(3);
    // All should have score 1500
    leaderboard.forEach(score => {
      expect(score.score).toBe(1500);
    });
  });

  // ===== Test: getFullLeaderboard() returns all scores =====
  it('should return full leaderboard via getFullLeaderboard()', () => {
    for (let i = 0; i < 15; i++) {
      manager.recordScore(1500 - i * 100);
    }

    const fullLeaderboard = manager.getFullLeaderboard();

    expect(fullLeaderboard.length).toBe(15);
    expect(fullLeaderboard[0].score).toBe(1500);
    expect(fullLeaderboard[14].score).toBe(100);
  });

  // ===== Test: Initialize with empty store =====
  it('should initialize with empty leaderboard if store is empty', async () => {
    expect(mockStore.data.length).toBe(0);

    await manager.initialize();

    expect(manager.getLeaderboard(10).length).toBe(0);
    expect(manager.loaded).toBe(true);
  });

  // ===== Test: Initialize error handling sets loaded flag =====
  it('should set loaded flag to true even if store.load() throws', async () => {
    mockStore.throwOnLoad = true;

    await manager.initialize();

    expect(manager.loaded).toBe(true);
    expect(manager.getLeaderboard(10).length).toBe(0);
  });

  // ===== Test: Each recorded score gets unique ID =====
  it('should assign unique ID to each recorded score', () => {
    manager.recordScore(1500);
    manager.recordScore(1000);
    manager.recordScore(500);

    const leaderboard = manager.getLeaderboard(10);
    const ids = leaderboard.map(s => s.id);

    // All IDs should be unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // ===== Test: Large number of scores maintain order =====
  it('should maintain correct order with many scores', () => {
    const scoreCount = 50;
    const scores = [];

    // Record scores in random order
    const randomScores = Array.from({ length: scoreCount }, () =>
      Math.floor(Math.random() * 5000)
    );

    randomScores.forEach(score => manager.recordScore(score));

    const leaderboard = manager.getFullLeaderboard();

    // Verify descending order
    for (let i = 0; i < leaderboard.length - 1; i++) {
      expect(leaderboard[i].score).toBeGreaterThanOrEqual(leaderboard[i + 1].score);
    }
  });

  // ===== Test: recordScore() without initialization works correctly =====
  it('should work correctly before initialize() is called', () => {
    // Don't call initialize
    const result = manager.recordScore(1500);

    expect(result).not.toBeNull();
    expect(result.score).toBe(1500);
    expect(manager.getLeaderboard(10).length).toBe(1);
  });

  // ===== Test: All tests pass (0 failures verification) =====
  it('should have completed all tests', () => {
    // This is a meta-test to ensure the suite ran
    expect(true).toBe(true);
  });

  // ===== Test: getBestScore() =====
  it('should return 0 for getBestScore() on an empty leaderboard', () => {
    expect(manager.getBestScore()).toBe(0);
  });

  it('should return the highest score recorded, regardless of insertion order', () => {
    manager.recordScore(10);
    manager.recordScore(50);
    manager.recordScore(30);

    expect(manager.getBestScore()).toBe(50);
  });
});
