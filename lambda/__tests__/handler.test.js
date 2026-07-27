/**
 * Tests for lambda/handler.js — handlePost implementation
 * Feature: dynamodb-leaderboard-amplify-deploy
 * Requirements: 3.3, 4.2, 4.3, 4.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// ─── Mock @aws-sdk/client-dynamodb ──────────────────────────────────────────

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: function DynamoDBClient() {
      this.send = mockSend;
    },
    QueryCommand: vi.fn(function QueryCommand(params) {
      this._type = 'QueryCommand';
      this.params = params;
    }),
    PutItemCommand: vi.fn(function PutItemCommand(params) {
      this._type = 'PutItemCommand';
      this.params = params;
    }),
    BatchWriteItemCommand: vi.fn(function BatchWriteItemCommand(params) {
      this._type = 'BatchWriteItemCommand';
      this.params = params;
    }),
  };
});

// Import the module AFTER mocks are set up
const { _handlePost } = await import('../handler.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds a minimal valid event object for POST /scores.
 * @param {object} body   - Raw body object (will be JSON-stringified)
 * @param {string} origin - Origin header value
 */
function makeEvent(body, origin = 'https://main.abc123.amplifyapp.com') {
  return {
    httpMethod: 'POST',
    headers: { Origin: origin },
    body: JSON.stringify(body),
  };
}

const VALID_BODY = {
  id: 'abc-123',
  score: 500,
  timestamp: '2024-01-15T14:30:00.000Z',
  name: 'Ana',
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSend.mockReset();
  mockSend.mockResolvedValue({}); // DynamoDB PutItem succeeds by default
  process.env.ALLOWED_ORIGIN = 'https://main.abc123.amplifyapp.com';
  process.env.TABLE_NAME = 'torre-nubes-scores';
});

// ─── Unit Tests ──────────────────────────────────────────────────────────────

describe('handlePost — unit tests', () => {

  describe('JSON parsing', () => {
    it('returns 400 when body is not valid JSON', async () => {
      const event = {
        httpMethod: 'POST',
        headers: { Origin: process.env.ALLOWED_ORIGIN },
        body: '{ bad json @@',
      };
      const res = await _handlePost(event);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Invalid JSON body');
    });

    it('returns 400 when body is null/empty (missing required fields)', async () => {
      const event = {
        httpMethod: 'POST',
        headers: { Origin: process.env.ALLOWED_ORIGIN },
        body: null,
      };
      // null body → parsed as empty object → missing required fields → 400
      const res = await _handlePost(event);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('id validation', () => {
    it('returns 400 when id is missing', async () => {
      const { id: _, ...bodyWithoutId } = VALID_BODY;
      const res = await _handlePost(makeEvent(bodyWithoutId));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('id is invalid');
    });

    it('returns 400 when id is empty string', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, id: '' }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('id is invalid');
    });

    it('returns 400 when id is 101 characters', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, id: 'a'.repeat(101) }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('id is invalid');
    });

    it('returns 400 when id is a number', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, id: 42 }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('id is invalid');
    });

    it('accepts id of exactly 1 character', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, id: 'x' }));
      expect(res.statusCode).toBe(201);
    });

    it('accepts id of exactly 100 characters', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, id: 'z'.repeat(100) }));
      expect(res.statusCode).toBe(201);
    });
  });

  describe('score validation', () => {
    it('returns 400 when score is missing', async () => {
      const { score: _, ...body } = VALID_BODY;
      const res = await _handlePost(makeEvent(body));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('score is invalid');
    });

    it('returns 400 when score is a float', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, score: 3.14 }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('score is invalid');
    });

    it('returns 400 when score is negative', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, score: -1 }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('score is invalid');
    });

    it('returns 400 when score exceeds 999999999', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, score: 1000000000 }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('score is invalid');
    });

    it('returns 400 when score is a string', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, score: '500' }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('score is invalid');
    });

    it('accepts score of 0 (lower boundary)', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, score: 0 }));
      expect(res.statusCode).toBe(201);
    });

    it('accepts score of 999999999 (upper boundary)', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, score: 999999999 }));
      expect(res.statusCode).toBe(201);
    });
  });

  describe('timestamp validation', () => {
    it('returns 400 when timestamp is missing', async () => {
      const { timestamp: _, ...body } = VALID_BODY;
      const res = await _handlePost(makeEvent(body));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('timestamp is invalid');
    });

    it('returns 400 when timestamp is empty string', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, timestamp: '' }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('timestamp is invalid');
    });

    it('returns 400 when timestamp is a number', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, timestamp: 12345 }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('timestamp is invalid');
    });

    it('accepts any non-empty string as timestamp', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, timestamp: '2024-06-01' }));
      expect(res.statusCode).toBe(201);
    });
  });

  describe('successful POST', () => {
    it('returns 201 with the plain item on success', async () => {
      const res = await _handlePost(makeEvent(VALID_BODY));
      expect(res.statusCode).toBe(201);
      const item = JSON.parse(res.body);
      expect(item.id).toBe(VALID_BODY.id);
      expect(item.score).toBe(VALID_BODY.score);
      expect(item.timestamp).toBe(VALID_BODY.timestamp);
      expect(item.name).toBe(VALID_BODY.name);
    });

    it('always sets gameId to "global" in the returned item', async () => {
      const res = await _handlePost(makeEvent({ ...VALID_BODY, gameId: 'other' }));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).gameId).toBe('global');
    });

    it('defaults name to empty string when name is absent', async () => {
      const { name: _, ...bodyNoName } = VALID_BODY;
      const res = await _handlePost(makeEvent(bodyNoName));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).name).toBe('');
    });

    it('calls PutItemCommand with gameId="global" regardless of input gameId', async () => {
      const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');
      PutItemCommand.mockClear();
      await _handlePost(makeEvent({ ...VALID_BODY, gameId: 'cheating' }));
      expect(PutItemCommand).toHaveBeenCalledOnce();
      const callArg = PutItemCommand.mock.calls[0][0];
      expect(callArg.Item.gameId.S).toBe('global');
    });

    it('returns CORS headers in response', async () => {
      const res = await _handlePost(makeEvent(VALID_BODY));
      expect(res.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(res.headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(res.headers).toHaveProperty('Access-Control-Allow-Headers');
    });
  });

  describe('DynamoDB error handling', () => {
    it('returns 500 and logs error when DynamoDB throws', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB unavailable'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await _handlePost(makeEvent(VALID_BODY));
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).error).toBe('Internal server error');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

// ─── Property-Based Tests ────────────────────────────────────────────────────

describe('handlePost — property-based tests', () => {

  /**
   * Property 4: Lambda always adds gameId="global" regardless of input
   * Validates: Requirements 3.3, 4.2
   *
   * Feature: dynamodb-leaderboard-amplify-deploy, Property 4:
   * For any valid POST body (including bodies that contain a gameId field
   * with any value), the Lambda POST handler SHALL call PutItem with
   * gameId = "global" on the stored item.
   */
  it('Property 4: always stores gameId="global" regardless of input gameId', async () => {
    const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id:        fc.string({ minLength: 1, maxLength: 100 }),
          score:     fc.integer({ min: 0, max: 999999999 }),
          timestamp: fc.string({ minLength: 1 }),
          name:      fc.option(fc.string(), { nil: undefined }),
          // gameId can be anything — must always be overwritten to "global"
          gameId:    fc.option(fc.string(), { nil: undefined }),
        }),
        async (body) => {
          PutItemCommand.mockClear();
          mockSend.mockResolvedValueOnce({});

          const event = makeEvent(body);
          const res = await _handlePost(event);

          // Valid inputs must always produce 201
          expect(res.statusCode).toBe(201);

          // The returned plain item must have gameId = "global"
          const item = JSON.parse(res.body);
          expect(item.gameId).toBe('global');

          // PutItem must be called with gameId = "global"
          expect(PutItemCommand).toHaveBeenCalledOnce();
          const putArg = PutItemCommand.mock.calls[0][0];
          expect(putArg.Item.gameId.S).toBe('global');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Lambda POST handler rejects all invalid inputs with 400
   * Validates: Requirements 4.3
   *
   * Feature: dynamodb-leaderboard-amplify-deploy, Property 5:
   * For any POST body that violates at least one validation rule, the Lambda
   * SHALL return HTTP 400 with a JSON body containing an error field.
   */
  it('Property 5: rejects invalid bodies with 400 + error field', async () => {
    // Generator for bodies with an invalid id
    const invalidIdArb = fc.record({
      id:        fc.oneof(
        fc.constant(''),                        // empty string
        fc.constant(null),                      // null
        fc.integer(),                           // number
        fc.string({ minLength: 101 })           // too long
      ),
      score:     fc.integer({ min: 0, max: 999999999 }),
      timestamp: fc.string({ minLength: 1 }),
    });

    // Generator for bodies with an invalid score
    const invalidScoreArb = fc.record({
      id:        fc.string({ minLength: 1, maxLength: 100 }),
      score:     fc.oneof(
        fc.constant(-1),                        // below min
        fc.constant(1000000000),                // above max
        // Use a float that is non-integer: map integer to float with fractional part
        fc.integer({ min: 1, max: 1000 }).map(n => n + 0.5),
        fc.constant('100'),                     // string
        fc.constant(null),                      // null
      ),
      timestamp: fc.string({ minLength: 1 }),
    });

    // Generator for bodies with an invalid timestamp
    const invalidTimestampArb = fc.record({
      id:        fc.string({ minLength: 1, maxLength: 100 }),
      score:     fc.integer({ min: 0, max: 999999999 }),
      timestamp: fc.oneof(
        fc.constant(''),    // empty string
        fc.constant(null),  // null
        fc.integer(),       // number
      ),
    });

    for (const arb of [invalidIdArb, invalidScoreArb, invalidTimestampArb]) {
      await fc.assert(
        fc.asyncProperty(arb, async (body) => {
          const event = makeEvent(body);
          const res = await _handlePost(event);
          expect(res.statusCode).toBe(400);
          const parsed = JSON.parse(res.body);
          expect(parsed).toHaveProperty('error');
          expect(typeof parsed.error).toBe('string');
          expect(parsed.error.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    }
  });
});
