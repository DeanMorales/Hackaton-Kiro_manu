import { ScoreStore } from './scoreStore.js';

/**
 * DynamoDBScoreStore
 *
 * Implements the ScoreStore interface by communicating with a backend
 * API Gateway + Lambda + DynamoDB via HTTP requests.
 *
 * All HTTP and network errors are swallowed — the game continues operating
 * from ScoreManager's in-memory cache regardless of backend failures.
 */
export class DynamoDBScoreStore extends ScoreStore {
  /**
   * @param {string} apiUrl - Base URL of the API Gateway endpoint.
   *   Trailing slash(es) are stripped so endpoint paths are always well-formed.
   */
  constructor(apiUrl) {
    super();
    this.apiUrl = apiUrl.replace(/\/+$/, '');
  }

  /**
   * Loads scores from the remote API.
   * GET {apiUrl}/scores → Score[] sorted descending by .score.
   * Non-2xx responses and network/parse errors are logged and swallowed — never throws.
   * @returns {Promise<Score[]>}
   */
  async load() {
    try {
      const response = await fetch(`${this.apiUrl}/scores`, { method: 'GET' });
      if (!response.ok) {
        console.error(
          '[DynamoDBScoreStore] load() failed:',
          response.status,
          response.statusText
        );
        return [];
      }
      const scores = await response.json();
      return scores.slice().sort((a, b) => b.score - a.score);
    } catch (err) {
      console.error('[DynamoDBScoreStore] load() error:', err);
      return [];
    }
  }

  /**
   * Persists scores to the remote API.
   * Finds the score with the most recent timestamp and POSTs it to {apiUrl}/scores.
   * No-op on empty array. Non-2xx responses and network errors are logged and swallowed — never throws.
   * @param {Score[]} scores
   * @returns {Promise<void>}
   */
  async save(scores) {
    if (scores.length === 0) return;

    // ISO 8601 strings sort lexicographically in chronological order
    const mostRecent = scores.reduce((max, s) =>
      s.timestamp > max.timestamp ? s : max
    );

    try {
      const response = await fetch(`${this.apiUrl}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mostRecent),
      });
      if (!response.ok) {
        console.error(
          '[DynamoDBScoreStore] save() failed:',
          response.status,
          response.statusText
        );
        return;
      }
    } catch (err) {
      console.error('[DynamoDBScoreStore] save() network error:', err);
    }
  }

  /**
   * Deletes all scores from the remote API.
   * Sends DELETE to {apiUrl}/scores.
   * Non-2xx responses and network errors are logged and swallowed — never throws.
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      const response = await fetch(`${this.apiUrl}/scores`, { method: 'DELETE' });
      if (!response.ok) {
        console.error(
          '[DynamoDBScoreStore] clear() failed:',
          response.status,
          response.statusText
        );
      }
    } catch (err) {
      console.error('[DynamoDBScoreStore] clear() network error:', err);
    }
  }
}
