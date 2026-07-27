/**
 * Tests for DynamoDBScoreStore
 *
 * Feature: dynamodb-leaderboard-amplify-deploy
 *
 * Covers:
 *   - Property 1: load() always returns scores in descending order
 *   - Property 2: save() posts the score with the maximum timestamp
 *   - Property 3: Constructor always strips trailing slashes from the API URL
 *   - Edge case: save([]) makes no fetch call
 *   - Edge case: load() on HTTP 500 → returns []
 *   - Edge case: load() on network error → returns []
 *   - Edge case: clear() on error → no throw
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DynamoDBScoreStore } from '../dynamoDBScoreStore.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Score-shaped object for testing.
 * Uses distinct ISO 8601 timestamps derived from a base offset so the array
 * covers a real spread of values.
 */
const scoreArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string(),
  score: fc.integer({ min: 0, max: 999_999_999 }),
  timestamp: fc
    .integer({ min: 0, max: 1_000_000 })
    .map(n => new Date(1_700_000_000_000 + n * 1000).toISOString()),
});

/** Non-empty array of scores with DISTINCT timestamps (required by Property 2). */
const nonEmptyDistinctTimestampArr = fc
  .uniqueArray(scoreArb, { minLength: 1, maxLength: 20, selector: s => s.timestamp })
  .filter(arr => arr.length >= 1);

/** Build an ok-looking Response whose .json() resolves to `data`. */
function mockOkResponse(data) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => data,
  };
}

/** Build a non-ok Response (e.g. 500). */
function mockErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    statusText: 'Server Error',
    json: async () => ({ error: 'fail' }),
  };
}

// ---------------------------------------------------------------------------
// Property 1 — load() always returns scores in descending order
// Feature: dynamodb-leaderboard-amplify-deploy, Property 1: load() always returns scores in descending order
// Validates: Requirements 1.2, 7.2
// ---------------------------------------------------------------------------

describe('DynamoDBScoreStore — Property 1: load() returns scores in descending order', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('load() result is sorted descending for any shuffled score array (min 100 runs)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(scoreArb, { minLength: 2, maxLength: 30 }),
        async (scores) => {
          // Shuffle the array so the API response is in arbitrary order
          const shuffled = [...scores].sort(() => Math.random() - 0.5);
          fetchSpy.mockResolvedValueOnce(mockOkResponse(shuffled));

          const store = new DynamoDBScoreStore('https://api.example.com');
          const result = await store.load();

          // Every adjacent pair must satisfy a[i].score >= a[i+1].score
          for (let i = 0; i < result.length - 1; i++) {
            if (result[i].score < result[i + 1].score) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2 — save() posts the score with the maximum timestamp
// Feature: dynamodb-leaderboard-amplify-deploy, Property 2: save() posts the score with the maximum timestamp
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------

describe('DynamoDBScoreStore — Property 2: save() posts the score with the max timestamp', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('the POST body matches the score with the lexicographically greatest timestamp (min 100 runs)', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyDistinctTimestampArr, async (scores) => {
        // Clear call history from previous iterations before each run
        fetchSpy.mockClear();
        fetchSpy.mockResolvedValueOnce(mockOkResponse({}));

        const store = new DynamoDBScoreStore('https://api.example.com');
        await store.save(scores);

        // Determine expected score (max timestamp via string comparison)
        const expected = scores.reduce((max, s) =>
          s.timestamp > max.timestamp ? s : max
        );

        // Verify fetch was called with POST and the correct body
        expect(fetchSpy).toHaveBeenCalledOnce();
        const [, init] = fetchSpy.mock.calls[0];
        expect(init.method).toBe('POST');
        const body = JSON.parse(init.body);
        expect(body.id).toBe(expected.id);
        expect(body.timestamp).toBe(expected.timestamp);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3 — Constructor always strips trailing slashes from the API URL
// Feature: dynamodb-leaderboard-amplify-deploy, Property 3: Constructor always strips trailing slashes
// Validates: Requirements 1.9
// ---------------------------------------------------------------------------

describe('DynamoDBScoreStore — Property 3: constructor strips trailing slashes', () => {
  it('stored apiUrl never ends with "/" regardless of trailing slashes in input (min 100 runs)', () => {
    fc.assert(
      fc.property(
        // Base URL (no trailing slash) + 0–3 trailing slashes appended
        fc.string({ minLength: 1 }),
        fc.integer({ min: 0, max: 3 }),
        (base, trailingCount) => {
          const url = base.replace(/\/+$/, '') + '/'.repeat(trailingCount);
          const store = new DynamoDBScoreStore(url);
          return !store.apiUrl.endsWith('/');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('DynamoDBScoreStore — Edge cases', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // save([]) must NOT call fetch at all
  it('save([]) makes no fetch call', async () => {
    const store = new DynamoDBScoreStore('https://api.example.com');
    await store.save([]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // load() on HTTP 500 → returns []
  it('load() returns [] when the server responds with HTTP 500', async () => {
    fetchSpy.mockResolvedValueOnce(mockErrorResponse(500));

    const store = new DynamoDBScoreStore('https://api.example.com');
    const result = await store.load();

    expect(result).toEqual([]);
  });

  // load() on network error → returns []
  it('load() returns [] when fetch throws (network error)', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Network failure'));

    const store = new DynamoDBScoreStore('https://api.example.com');
    const result = await store.load();

    expect(result).toEqual([]);
  });

  // clear() on error → must not throw
  it('clear() does not throw when fetch throws (network error)', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Network failure'));

    const store = new DynamoDBScoreStore('https://api.example.com');
    await expect(store.clear()).resolves.not.toThrow();
  });

  it('clear() does not throw when server returns a non-2xx status', async () => {
    fetchSpy.mockResolvedValueOnce(mockErrorResponse(503));

    const store = new DynamoDBScoreStore('https://api.example.com');
    await expect(store.clear()).resolves.not.toThrow();
  });
});
