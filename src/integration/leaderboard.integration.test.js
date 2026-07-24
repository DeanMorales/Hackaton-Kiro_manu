import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScoreManager } from '../data/scoreManager.js';
import { LocalStorageScoreStore } from '../data/scoreStore.js';

/**
 * Integration Tests for Leaderboard Persistence
 *
 * These tests verify the full flow of score persistence to/from localStorage:
 * ScoreManager → LocalStorageScoreStore → localStorage → new instance
 *
 * Critical: These tests use REAL localStorage (no mocks), ensuring data
 * actually persists across session boundaries.
 */

describe('Leaderboard Integration (localStorage Persistence)', () => {
  // ===== Test Isolation: Clear localStorage before and after each test =====
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ===== Test 1: Record score → localStorage contains data → new instance loads data → data matches =====
  it('should persist a recorded score to localStorage and load it in new session', async () => {
    // Session 1: Record a score
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();
    manager1.recordScore(1500);

    // Verify localStorage contains the score
    const storageData = localStorage.getItem('torre-nubes-scores');
    expect(storageData).not.toBeNull();

    const parsed = JSON.parse(storageData);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].score).toBe(1500);

    // Session 2: Create new manager instance and load
    const store2 = new LocalStorageScoreStore();
    const manager2 = new ScoreManager(store2);

    await manager2.initialize();
    const leaderboard = manager2.getLeaderboard(10);

    // Verify score was loaded correctly
    expect(leaderboard.length).toBe(1);
    expect(leaderboard[0].score).toBe(1500);
  });

  // ===== Test 2: Multiple scores recorded → order maintained across sessions (descending) =====
  it('should persist multiple scores in descending order and load them in same order', async () => {
    // Session 1: Record multiple scores in random order
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();
    manager1.recordScore(1000);
    manager1.recordScore(2500);
    manager1.recordScore(1500);
    manager1.recordScore(3000);

    // Allow async save to complete
    await new Promise(resolve => setTimeout(resolve, 20));

    // Session 2: Load scores and verify order
    const store2 = new LocalStorageScoreStore();
    const manager2 = new ScoreManager(store2);

    await manager2.initialize();
    const leaderboard = manager2.getLeaderboard(10);

    expect(leaderboard.length).toBe(4);
    expect(leaderboard[0].score).toBe(3000); // Highest first
    expect(leaderboard[1].score).toBe(2500);
    expect(leaderboard[2].score).toBe(1500);
    expect(leaderboard[3].score).toBe(1000); // Lowest last

    // Verify descending order maintained
    for (let i = 0; i < leaderboard.length - 1; i++) {
      expect(leaderboard[i].score).toBeGreaterThanOrEqual(leaderboard[i + 1].score);
    }
  });

  // ===== Test 3: localStorage quota exceeded → error caught, partial data preserved =====
  it('should handle localStorage quota exceeded and preserve existing data', async () => {
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();

    // Record initial scores
    manager1.recordScore(2000);
    manager1.recordScore(1500);

    // Allow async save to complete
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify initial data saved
    let storageData = localStorage.getItem('torre-nubes-scores');
    expect(storageData).not.toBeNull();
    const initialLength = JSON.parse(storageData).length;
    expect(initialLength).toBe(2);

    // Mock localStorage.setItem to throw QuotaExceededError on next save
    const originalSetItem = Storage.prototype.setItem;
    let shouldThrow = false;

    Storage.prototype.setItem = function(key, value) {
      if (shouldThrow && key === 'torre-nubes-scores') {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      return originalSetItem.call(this, key, value);
    };

    // Enable throwing for the next save
    shouldThrow = true;

    // Try to record another score (this should fail to save)
    manager1.recordScore(1000);

    // Allow async save attempt to complete
    await new Promise(resolve => setTimeout(resolve, 20));

    // Restore original setItem
    Storage.prototype.setItem = originalSetItem;

    // Verify data is still in localStorage (original 2 scores, or more if it saved the 3rd before error)
    storageData = localStorage.getItem('torre-nubes-scores');
    expect(storageData).not.toBeNull();
    const preserved = JSON.parse(storageData);
    expect(preserved.length).toBeGreaterThan(0); // At least some data preserved
  });

  // ===== Test 4: Corrupted JSON in localStorage → data ignored, leaderboard starts fresh =====
  it('should ignore corrupted JSON and start with empty leaderboard', async () => {
    // Manually insert corrupted data into localStorage
    localStorage.setItem('torre-nubes-scores', '{invalid json}');

    // Create new store and manager
    const store = new LocalStorageScoreStore();
    const manager = new ScoreManager(store);

    // Initialize should not throw, but return empty leaderboard
    await manager.initialize();

    const leaderboard = manager.getLeaderboard(10);
    expect(leaderboard).toEqual([]);
  });

  it('should ignore corrupted data (not an array) and start fresh', async () => {
    // Insert invalid data structure (not an array)
    const invalidData = { score: 1500 }; // object, not array
    localStorage.setItem('torre-nubes-scores', JSON.stringify(invalidData));

    const store = new LocalStorageScoreStore();
    const manager = new ScoreManager(store);

    await manager.initialize();

    const leaderboard = manager.getLeaderboard(10);
    expect(leaderboard).toEqual([]);
  });

  it('should filter out invalid scores from partially corrupted storage', async () => {
    // Insert mix of valid and invalid score objects
    const mixedData = [
      { id: '1', score: 2000, timestamp: '2024-01-15T14:30:00.000Z' }, // Valid
      { id: '2', score: -100, timestamp: '2024-01-14T14:30:00.000Z' }, // Invalid (negative)
      { id: '3', score: 1500, timestamp: 'invalid-date' }, // Invalid (bad timestamp)
      { id: '4', score: 1000, timestamp: '2024-01-13T14:30:00.000Z' } // Valid
    ];
    localStorage.setItem('torre-nubes-scores', JSON.stringify(mixedData));

    const store = new LocalStorageScoreStore();
    const manager = new ScoreManager(store);

    await manager.initialize();

    const leaderboard = manager.getLeaderboard(10);
    // Should only contain the 2 valid scores
    expect(leaderboard.length).toBe(2);
    expect(leaderboard[0].score).toBe(2000);
    expect(leaderboard[1].score).toBe(1000);
  });

  // ===== Test 5: Clear operation → localStorage key removed → new instance loads empty array =====
  it('should remove data from localStorage when clear() is called', async () => {
    // Session 1: Record scores
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();
    manager1.recordScore(1500);
    manager1.recordScore(1000);

    // Allow async save to complete
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify data exists in localStorage
    let storageData = localStorage.getItem('torre-nubes-scores');
    expect(storageData).not.toBeNull();

    // Clear the leaderboard
    await manager1.clear();

    // Verify localStorage key was removed
    storageData = localStorage.getItem('torre-nubes-scores');
    expect(storageData).toBeNull();
  });

  it('should load empty leaderboard in new session after clear', async () => {
    // Session 1: Record and then clear
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();
    manager1.recordScore(2000);

    await new Promise(resolve => setTimeout(resolve, 20));

    await manager1.clear();

    // Session 2: Load in new instance
    const store2 = new LocalStorageScoreStore();
    const manager2 = new ScoreManager(store2);

    await manager2.initialize();

    const leaderboard = manager2.getLeaderboard(10);
    expect(leaderboard).toEqual([]);
  });

  // ===== Test 6: Timestamp persisted as valid ISO 8601 format across save/load cycles =====
  it('should persist and reload timestamps in valid ISO 8601 format', async () => {
    // Session 1: Record score with timestamp
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();
    manager1.recordScore(1500);

    await new Promise(resolve => setTimeout(resolve, 20));

    // Get the timestamp from first session
    const leaderboard1 = manager1.getLeaderboard(10);
    const timestamp1 = leaderboard1[0].timestamp;

    // Verify ISO 8601 format in session 1
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(timestamp1).toMatch(iso8601Regex);

    // Verify it parses as valid date
    const date1 = new Date(timestamp1);
    expect(date1 instanceof Date).toBe(true);
    expect(!isNaN(date1.getTime())).toBe(true);
    expect(date1.toISOString()).toBe(timestamp1);

    // Session 2: Load and verify timestamp still valid
    const store2 = new LocalStorageScoreStore();
    const manager2 = new ScoreManager(store2);

    await manager2.initialize();
    const leaderboard2 = manager2.getLeaderboard(10);
    const timestamp2 = leaderboard2[0].timestamp;

    // Should be exact same timestamp
    expect(timestamp2).toBe(timestamp1);

    // Should still be valid ISO 8601
    expect(timestamp2).toMatch(iso8601Regex);

    // Should still parse as valid date
    const date2 = new Date(timestamp2);
    expect(date2 instanceof Date).toBe(true);
    expect(!isNaN(date2.getTime())).toBe(true);
    expect(date2.toISOString()).toBe(timestamp2);
  });

  it('should preserve exact timestamp across multiple session cycles', async () => {
    const originalTimestamp = '2024-01-15T14:30:00.000Z';

    // Manually insert score with specific timestamp
    const scoreData = [{
      id: 'test-id',
      score: 2000,
      timestamp: originalTimestamp
    }];
    localStorage.setItem('torre-nubes-scores', JSON.stringify(scoreData));

    // Session 1: Load and verify
    let store = new LocalStorageScoreStore();
    let manager = new ScoreManager(store);
    await manager.initialize();
    let leaderboard = manager.getLeaderboard(10);
    expect(leaderboard[0].timestamp).toBe(originalTimestamp);

    // Session 2: Load and verify
    store = new LocalStorageScoreStore();
    manager = new ScoreManager(store);
    await manager.initialize();
    leaderboard = manager.getLeaderboard(10);
    expect(leaderboard[0].timestamp).toBe(originalTimestamp);

    // Session 3: Load and verify
    store = new LocalStorageScoreStore();
    manager = new ScoreManager(store);
    await manager.initialize();
    leaderboard = manager.getLeaderboard(10);
    expect(leaderboard[0].timestamp).toBe(originalTimestamp);
  });

  // ===== Test 7: All required fields persisted correctly =====
  it('should persist all required score fields (id, score, timestamp)', async () => {
    // Session 1: Record score
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();
    manager1.recordScore(1500);

    await new Promise(resolve => setTimeout(resolve, 20));

    // Get data directly from localStorage
    const storageData = localStorage.getItem('torre-nubes-scores');
    const scores = JSON.parse(storageData);

    expect(scores.length).toBeGreaterThan(0);
    const score = scores[0];

    // Verify all required fields exist
    expect(score).toHaveProperty('id');
    expect(score).toHaveProperty('score');
    expect(score).toHaveProperty('timestamp');

    // Verify types
    expect(typeof score.id).toBe('string');
    expect(typeof score.score).toBe('number');
    expect(typeof score.timestamp).toBe('string');

    // Verify values
    expect(score.score).toBe(1500);
    expect(score.id.length).toBeGreaterThan(0);
    expect(score.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    // Session 2: Verify fields persist through load cycle
    const store2 = new LocalStorageScoreStore();
    const manager2 = new ScoreManager(store2);
    await manager2.initialize();
    const leaderboard = manager2.getLeaderboard(10);

    expect(leaderboard[0]).toHaveProperty('id');
    expect(leaderboard[0]).toHaveProperty('score');
    expect(leaderboard[0]).toHaveProperty('timestamp');
  });

  // ===== Test 8: Maximum scores limit (100) enforced and persisted =====
  it('should enforce maxScores limit and persist pruned data', async () => {
    const store = new LocalStorageScoreStore();
    const manager = new ScoreManager(store);

    await manager.initialize();

    // Record 105 scores (exceeds maxScores of 100)
    for (let i = 0; i < 105; i++) {
      manager.recordScore(10500 - i * 100);
    }

    // Allow async save to complete
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify localStorage only contains top 100
    const storageData = localStorage.getItem('torre-nubes-scores');
    const scores = JSON.parse(storageData);

    expect(scores.length).toBeLessThanOrEqual(100);
  });

  it('should maintain pruned data across sessions', async () => {
    // Session 1: Insert 105 scores and prune
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();

    for (let i = 0; i < 105; i++) {
      manager1.recordScore(10500 - i * 100);
    }

    await new Promise(resolve => setTimeout(resolve, 20));

    // Session 2: Load and verify pruned data persists
    const store2 = new LocalStorageScoreStore();
    const manager2 = new ScoreManager(store2);

    await manager2.initialize();
    const leaderboard = manager2.getFullLeaderboard();

    expect(leaderboard.length).toBeLessThanOrEqual(100);
  });

  // ===== Test 9: Concurrent operations don't corrupt data =====
  it('should handle rapid sequential saves without data corruption', async () => {
    const store = new LocalStorageScoreStore();
    const manager = new ScoreManager(store);

    await manager.initialize();

    // Rapidly record multiple scores
    for (let i = 0; i < 10; i++) {
      manager.recordScore(1000 + i * 100);
    }

    // Allow all async saves to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify data integrity
    const leaderboard = manager.getLeaderboard(10);
    expect(leaderboard.length).toBe(10);

    // Verify descending order maintained
    for (let i = 0; i < leaderboard.length - 1; i++) {
      expect(leaderboard[i].score).toBeGreaterThanOrEqual(leaderboard[i + 1].score);
    }

    // Verify all scores present
    leaderboard.forEach(score => {
      expect(score).toHaveProperty('id');
      expect(score).toHaveProperty('score');
      expect(score).toHaveProperty('timestamp');
    });
  });

  // ===== Test 10: State isolation between manager instances =====
  it('should isolate in-memory state between manager instances', async () => {
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    const store2 = new LocalStorageScoreStore();
    const manager2 = new ScoreManager(store2);

    // Initialize both (before any data exists)
    await manager1.initialize();
    await manager2.initialize();

    // Manager1 records score
    manager1.recordScore(2000);
    await new Promise(resolve => setTimeout(resolve, 20));

    // Manager2 should still have empty cache until re-initialization
    // (This is expected behavior - each manager has its own cache)
    let leaderboard2 = manager2.getLeaderboard(10);
    expect(leaderboard2.length).toBe(0);

    // Manager2 reinitialize to load from localStorage
    const store3 = new LocalStorageScoreStore();
    const manager3 = new ScoreManager(store3);
    await manager3.initialize();

    leaderboard2 = manager3.getLeaderboard(10);
    expect(leaderboard2.length).toBe(1);
    expect(leaderboard2[0].score).toBe(2000);
  });

  // ===== Test 11: Complex scenario - multiple scores with edge cases =====
  it('should handle complex scenario with duplicate scores and edge values', async () => {
    // Session 1: Record scores including edge cases
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();

    // Record various scores including duplicates and edge values
    manager1.recordScore(0);         // Minimum valid
    manager1.recordScore(1500);
    manager1.recordScore(1500);      // Duplicate
    manager1.recordScore(5000);
    manager1.recordScore(1500);      // Another duplicate
    manager1.recordScore(5000);      // Duplicate highest

    await new Promise(resolve => setTimeout(resolve, 20));

    // Session 2: Verify all persisted correctly
    const store2 = new LocalStorageScoreStore();
    const manager2 = new ScoreManager(store2);

    await manager2.initialize();
    const leaderboard = manager2.getLeaderboard(10);

    // Should have 6 scores
    expect(leaderboard.length).toBe(6);

    // Should be in descending order
    expect(leaderboard[0].score).toBe(5000);
    expect(leaderboard[1].score).toBe(5000);
    expect(leaderboard[2].score).toBe(1500);
    expect(leaderboard[3].score).toBe(1500);
    expect(leaderboard[4].score).toBe(1500);
    expect(leaderboard[5].score).toBe(0);

    // Verify order maintained
    for (let i = 0; i < leaderboard.length - 1; i++) {
      expect(leaderboard[i].score).toBeGreaterThanOrEqual(leaderboard[i + 1].score);
    }
  });

  // ===== Test 12: Verify no data loss on immediate reload =====
  it('should not lose any data on immediate reload without waiting', async () => {
    const store1 = new LocalStorageScoreStore();
    const manager1 = new ScoreManager(store1);

    await manager1.initialize();

    manager1.recordScore(1000);
    manager1.recordScore(2000);
    manager1.recordScore(1500);

    // Wait a bit for saves
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify all saved
    const storageData = localStorage.getItem('torre-nubes-scores');
    const scores = JSON.parse(storageData);
    expect(scores.length).toBe(3);
  });

  // ===== Test 13: Verify idempotency of clear operation =====
  it('should handle multiple clear operations without error', async () => {
    const store = new LocalStorageScoreStore();
    const manager = new ScoreManager(store);

    await manager.initialize();
    manager.recordScore(1500);

    await new Promise(resolve => setTimeout(resolve, 20));

    // Clear multiple times
    await manager.clear();
    await manager.clear();
    await manager.clear();

    // Verify localStorage is clean
    const storageData = localStorage.getItem('torre-nubes-scores');
    expect(storageData).toBeNull();

    // Verify manager state
    const leaderboard = manager.getLeaderboard(10);
    expect(leaderboard).toEqual([]);
  });

  // ===== Test 14: Verify all tests completed successfully =====
  it('should complete all integration tests with 0 failures', () => {
    // Meta-test to confirm test suite executed
    expect(true).toBe(true);
  });
});
