/**
 * ScoreStore Interface (Abstract)
 * 
 * Defines the contract for any score storage provider.
 * This abstraction allows future migration from localStorage to DynamoDB
 * without changing game logic.
 */
export class ScoreStore {
  /**
   * Loads all scores from the storage source
   * @returns {Promise<Score[]>} Array of scores in descending order, or empty array
   */
  async load() {
    throw new Error('Must be implemented');
  }

  /**
   * Persists scores to the storage source
   * @param {Score[]} scores - Array of scores to save
   * @returns {Promise<void>}
   */
  async save(scores) {
    throw new Error('Must be implemented');
  }

  /**
   * Removes all scores from storage
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('Must be implemented');
  }
}

/**
 * LocalStorageScoreStore
 * 
 * Phase 1 implementation using browser localStorage.
 * Wraps synchronous operations in Promises for compatibility with the abstract interface
 * (prepares for future async DynamoDB implementation).
 */
export class LocalStorageScoreStore extends ScoreStore {
  constructor(key = 'torre-nubes-scores') {
    super();
    this.key = key;
    this.maxScores = 100; // limit of scores stored
  }

  /**
   * Loads scores from localStorage
   * @returns {Promise<Score[]>} Array of valid scores, empty array if no data or corrupted
   */
  async load() {
    try {
      const data = localStorage.getItem(this.key);
      if (!data) return [];

      const scores = JSON.parse(data);
      if (!Array.isArray(scores)) {
        console.warn('[ScoreStore] Corrupted data, ignoring');
        return [];
      }

      // Filter out invalid scores
      return scores.filter(s => this._isValidScore(s));
    } catch (err) {
      console.error('[ScoreStore] Load error:', err);
      return [];
    }
  }

  /**
   * Saves scores to localStorage
   * @param {Score[]} scores - Array of scores to persist
   * @returns {Promise<void>}
   */
  async save(scores) {
    try {
      // Prune if exceeds limit (keep top scores)
      const pruned = this._prune(scores);
      const json = JSON.stringify(pruned);
      localStorage.setItem(this.key, json);
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        console.error('[ScoreStore] localStorage quota exceeded');
      } else {
        console.error('[ScoreStore] Save error:', err);
      }
      // Do not throw - continue without persisting
    }
  }

  /**
   * Clears all scores from localStorage
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      localStorage.removeItem(this.key);
    } catch (err) {
      console.error('[ScoreStore] Clear error:', err);
    }
  }

  /**
   * Validates a score object structure and data
   * @private
   * @param {*} score - Object to validate
   * @returns {boolean} True if valid, false otherwise
   */
  _isValidScore(score) {
    return (
      score &&
      typeof score === 'object' &&
      Number.isInteger(score.score) &&
      score.score >= 0 &&
      // name es opcional para mantener compatibilidad con scores antiguos;
      // si está presente debe ser string.
      (score.name === undefined || typeof score.name === 'string') &&
      typeof score.timestamp === 'string' &&
      this._isValidISO8601(score.timestamp)
    );
  }

  /**
   * Validates ISO 8601 timestamp format
   * @private
   * @param {string} ts - Timestamp string to validate
   * @returns {boolean} True if valid ISO 8601, false otherwise
   */
  _isValidISO8601(ts) {
    const d = new Date(ts);
    return d instanceof Date && !isNaN(d) && d.toISOString() === ts;
  }

  /**
   * Prunes scores to maxScores limit if exceeded
   * @private
   * @param {Score[]} scores - Array of scores (assumed to be in descending order)
   * @returns {Score[]} Pruned array (keeps top maxScores)
   */
  _prune(scores) {
    if (scores.length <= this.maxScores) return scores;
    return scores.slice(0, this.maxScores);
  }
}
