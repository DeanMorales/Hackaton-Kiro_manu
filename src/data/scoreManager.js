import { LocalStorageScoreStore } from './scoreStore.js';
import { DynamoDBScoreStore } from './dynamoDBScoreStore.js';

/**
 * ScoreManager
 *
 * Business logic orchestrator for managing the leaderboard.
 * Handles score validation, ranking, caching, and persistence.
 *
 * Uses dependency injection to accept a ScoreStore instance,
 * allowing for flexible storage backends (localStorage, DynamoDB, etc.).
 */
export class ScoreManager {
  /**
   * Creates a ScoreManager instance
   * @param {ScoreStore} store - The storage provider instance
   */
  constructor(store) {
    this.store = store;
    this.leaderboard = []; // In-memory cache of scores
    this.loaded = false; // Flag to prevent duplicate loads
  }

  /**
   * Initializes the manager by loading scores from storage.
   * Must be called once at game start.
   * Sets the loaded flag to prevent duplicate loads.
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    // Prevent duplicate loads
    if (this.loaded) return;

    try {
      this.leaderboard = await this.store.load();
      this.loaded = true;
    } catch (err) {
      console.error('[ScoreManager] Initialization failed:', err);
      this.leaderboard = [];
      this.loaded = true;
    }
  }

  /**
   * Records a new score if valid.
   * Validates height, generates unique ID, creates score object,
   * determines if new record, inserts in descending order, and persists.
   *
   * @param {number} height - The height (score value) to record
   * @param {string} [name=''] - Optional player name to associate with the score
   * @returns {object|null} { score, isNewRecord, rank } or null if invalid
   */
  recordScore(height, name = '') {
    // Validate: must be non-negative integer
    if (!Number.isInteger(height) || height < 0) {
      console.error('[ScoreManager] Invalid score:', height);
      return null;
    }

    // Generate unique ID (timestamp-based with random suffix)
    const id = this._generateId();

    // Normalize the name: coerce to string; empty string means "anonymous".
    const playerName = typeof name === 'string' ? name : '';

    // Create score object
    const score = {
      id,
      name: playerName,
      score: height,
      timestamp: new Date().toISOString()
    };

    // Determine if this is a new record (highest score)
    const isNewRecord =
      this.leaderboard.length === 0 || height > this.leaderboard[0].score;

    // Find insertion position (maintain descending order)
    const insertIndex = this.leaderboard.findIndex(s => s.score < height);

    // Insert score in leaderboard
    if (insertIndex === -1) {
      // Score is lower than all existing scores, append to end
      this.leaderboard.push(score);
    } else {
      // Insert at correct position to maintain descending order
      this.leaderboard.splice(insertIndex, 0, score);
    }

    // Calculate rank (1-indexed position)
    const rank = insertIndex === -1 ? this.leaderboard.length : insertIndex + 1;

    // Persist scores without await (fire-and-forget pattern)
    this.store.save(this.leaderboard).catch(err => {
      console.error('[ScoreManager] Save failed:', err);
    });

    return {
      score: height,
      isNewRecord,
      rank
    };
  }

  /**
   * Retrieves the top N scores from the in-memory cache.
   *
   * @param {number} limit - Maximum number of scores to return (default: 10)
   * @returns {Array} Array of top N scores in descending order
   */
  getLeaderboard(limit = 10) {
    return this.leaderboard.slice(0, limit);
  }

  /**
   * Retrieves the entire leaderboard from cache.
   *
   * @returns {Array} All scores in descending order
   */
  getFullLeaderboard() {
    return this.leaderboard;
  }

  /**
   * Retrieves the single highest score across the entire leaderboard (all players,
   * all names), regardless of which player name recorded it.
   *
   * @returns {number} The highest score, or 0 if the leaderboard is empty.
   */
  getBestScore() {
    return this.leaderboard.length > 0 ? this.leaderboard[0].score : 0;
  }

  /**
   * Clears the leaderboard (empties memory cache and calls store.clear()).
   *
   * @returns {Promise<void>}
   */
  async clear() {
    this.leaderboard = [];
    await this.store.clear();
  }

  /**
   * Generates a unique ID for a score.
   * Uses timestamp + random string (timestamp-based UUID-like format).
   *
   * @private
   * @returns {string} Unique ID in format: {timestamp}-{randomString}
   */
  _generateId() {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 11);
    return `${timestamp}-${randomSuffix}`;
  }
}

const _apiUrl = import.meta.env.VITE_SCORES_API_URL;
export const scoreStore = (_apiUrl && _apiUrl.length > 0)
  ? new DynamoDBScoreStore(_apiUrl)
  : new LocalStorageScoreStore();
export const scoreManager = new ScoreManager(scoreStore);
