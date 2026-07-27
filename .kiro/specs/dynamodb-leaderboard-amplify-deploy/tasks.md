# Implementation Plan: dynamodb-leaderboard-amplify-deploy

## Overview

Migrate the "Torre de las Nubes" leaderboard from `localStorage` to a global, DynamoDB-backed leaderboard exposed via API Gateway + Lambda. The frontend is served through AWS Amplify Hosting with CI/CD from GitHub `main`. The implementation follows a drop-in replacement pattern: `DynamoDBScoreStore` extends the existing `ScoreStore` interface, and `scoreManager.js` selects the store at module initialization time via `import.meta.env.VITE_SCORES_API_URL`.

---

## Tasks

- [x] 1. Set up project structure, Vite config, and Amplify build config
  - [x] 1.1 Create `vite.config.js` at the repository root with the production build-time guard
    - Import `defineConfig` and `loadEnv` from `vite`
    - In `production` mode, throw if `VITE_SCORES_API_URL` is absent or empty
    - In all other modes return an empty config object so `npm run dev` works without `.env.local`
    - _Requirements: 6.5, 8.1_

  - [x] 1.2 Create `amplify.yml` at the repository root
    - Define `preBuild` phase (`npm ci`), `build` phase (`npm run build`), artifacts pointing to `dist/**/*`, and cache for `node_modules/**/*`
    - _Requirements: 6.3, 6.4_

  - [x] 1.3 Ensure `.env.local` is in `.gitignore`
    - Verify or add `.env.local` to `.gitignore` so local API URLs are never committed
    - _Requirements: 6.8, 8.3_

- [x] 2. Implement `DynamoDBScoreStore` (frontend data layer)
  - [x] 2.1 Create `src/data/dynamoDBScoreStore.js` with constructor and `clear()`
    - Extend `ScoreStore` from `./scoreStore.js`
    - Constructor accepts `apiUrl`, strips trailing `/` characters before storing
    - `clear()` sends `DELETE {apiUrl}/scores`; swallows HTTP errors and network errors (log to console)
    - _Requirements: 1.1, 1.6, 1.7, 1.8, 1.9_

  - [ ]* 2.2 Write property test for constructor trailing-slash stripping (Property 3)
    - **Property 3: Constructor always strips trailing slashes from the API URL**
    - **Validates: Requirements 1.9**
    - Use `fc.string()` + append 0–3 trailing slashes; assert `apiUrl` stored has no trailing `/`
    - Tag: `// Feature: dynamodb-leaderboard-amplify-deploy, Property 3: Constructor always strips trailing slashes`

  - [x] 2.3 Implement `load()` on `DynamoDBScoreStore`
    - `GET {apiUrl}/scores`, parse JSON response, sort descending by `score`, return `Score[]`
    - On non-2xx response: log + return `[]`; on network error: log + return `[]`; on invalid JSON: log + return `[]`
    - _Requirements: 1.2, 1.3_

  - [ ]* 2.4 Write property test for `load()` descending sort (Property 1)
    - **Property 1: load() always returns scores in descending order**
    - **Validates: Requirements 1.2, 7.2**
    - Use `fc.array(fc.record({ id: fc.string(), score: fc.integer(), ... }), { minLength: 2 })` as mock fetch response
    - Assert every adjacent pair `(a, b)` satisfies `a.score >= b.score`
    - Tag: `// Feature: dynamodb-leaderboard-amplify-deploy, Property 1: load() always returns scores in descending order`

  - [x] 2.5 Implement `save(scores)` on `DynamoDBScoreStore`
    - If `scores` is empty, return immediately without any fetch
    - Find the Score with the maximum `timestamp` (ISO 8601 lexicographic comparison)
    - `POST {apiUrl}/scores` with that Score as JSON body
    - On non-2xx or network error: log + return; do not throw
    - _Requirements: 1.4, 1.5, 1.7, 1.8_

  - [ ]* 2.6 Write property test for `save()` posting max-timestamp score (Property 2)
    - **Property 2: save() posts the score with the maximum timestamp**
    - **Validates: Requirements 1.4**
    - Generate non-empty arrays with distinct ISO 8601 timestamps via `fc.uniqueArray`; spy on `fetch`; verify POST body matches max-timestamp entry
    - Tag: `// Feature: dynamodb-leaderboard-amplify-deploy, Property 2: save() posts the score with the maximum timestamp`

  - [ ]* 2.7 Write property test for save/load round-trip (Property 8)
    - **Property 8: save/load round-trip preserves score identity**
    - **Validates: Requirements 7.1, 7.3**
    - Mock `fetch` POST to return 201, mock GET to echo back the saved score; assert `load()` result contains element with `id === s.id`
    - Tag: `// Feature: dynamodb-leaderboard-amplify-deploy, Property 8: save/load round-trip preserves score identity`

  - [ ]* 2.8 Write property test for localStorage fallback making no HTTP requests (Property 9)
    - **Property 9: LocalStorageScoreStore path makes no HTTP requests**
    - **Validates: Requirements 7.4**
    - Instantiate `ScoreManager` without `VITE_SCORES_API_URL`; mock `fetch`; run `load/save/clear` sequence; assert `fetch` was never called
    - Tag: `// Feature: dynamodb-leaderboard-amplify-deploy, Property 9: LocalStorageScoreStore path makes no HTTP requests`

- [x] 3. Checkpoint — Verify DynamoDBScoreStore unit tests
  - Ensure all tests in `src/data/__tests__/dynamoDBScoreStore.test.js` pass. Ask the user if questions arise.

- [x] 4. Update `src/data/scoreManager.js` — dynamic store selection
  - [x] 4.1 Add dynamic store selection at the bottom of `scoreManager.js`
    - Add `import { DynamoDBScoreStore } from './dynamoDBScoreStore.js';` at the top (after existing imports)
    - Replace the existing singleton exports with: read `import.meta.env.VITE_SCORES_API_URL`; if truthy, export `scoreStore = new DynamoDBScoreStore(apiUrl)`; otherwise export `scoreStore = new LocalStorageScoreStore()`
    - Export `scoreManager = new ScoreManager(scoreStore)` in both paths
    - Do not modify the `ScoreManager` class body in any way
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 4.2 Write unit tests for dynamic store selection
    - Test: when env var is a non-empty string → `scoreStore` is instance of `DynamoDBScoreStore`
    - Test: when env var is `undefined`, `null`, or `""` → `scoreStore` is instance of `LocalStorageScoreStore`
    - _Requirements: 2.1, 2.2_

- [x] 5. Implement Lambda function `torre-nubes-scores-api`
  - [x] 5.1 Create `lambda/handler.js` with routing skeleton and CORS header logic
    - Implement `buildCorsHeaders(requestOrigin)` using `process.env.ALLOWED_ORIGIN`
    - Route `event.httpMethod` to `handleGet`, `handlePost`, `handleDelete`, `handleOptions`, default 405
    - Implement `handleOptions` returning 204 with CORS headers
    - _Requirements: 4.5, 5.1, 5.2, 5.3, 5.5_

  - [ ]* 5.2 Write property test for CORS headers present on all valid-origin responses (Property 6)
    - **Property 6: Every Lambda response includes the three CORS headers**
    - **Validates: Requirements 5.2, 5.5**
    - For each method (GET, POST, DELETE, OPTIONS) with `Origin === ALLOWED_ORIGIN`, mock DynamoDB success; assert all three headers present in response
    - Tag: `// Feature: dynamodb-leaderboard-amplify-deploy, Property 6: Every Lambda response includes the three CORS headers`

  - [ ]* 5.3 Write property test for mismatched Origin rejection (Property 7)
    - **Property 7: Mismatched Origin is rejected**
    - **Validates: Requirements 5.4**
    - Generate `fc.string()` values not equal to `ALLOWED_ORIGIN`; assert response is 403 or `Access-Control-Allow-Origin` is absent/empty
    - Tag: `// Feature: dynamodb-leaderboard-amplify-deploy, Property 7: Mismatched Origin is rejected`

  - [x] 5.4 Implement `handleGet` in `lambda/handler.js`
    - `QueryCommand` on `gameId-score-index` GSI with `gameId = "global"`, `ScanIndexForward: false`, `Limit: 10`
    - Return 200 with JSON array and CORS headers
    - On DynamoDB error: log to CloudWatch, return 500 with `{ error: "Internal server error" }`
    - _Requirements: 4.1, 4.6_

  - [x] 5.5 Implement `handlePost` with input validation in `lambda/handler.js`
    - Parse body JSON; validate `id` (string 1–100 chars), `score` (integer 0–999999999), `timestamp` (non-empty string)
    - On validation failure: return 400 with `{ error: "<field> is invalid: <reason>" }`
    - Overwrite `gameId = "global"` regardless of input; call `PutItem`; return 201 with saved item and CORS headers
    - On DynamoDB error: return 500 with `{ error: "Internal server error" }`
    - _Requirements: 3.3, 4.2, 4.3, 4.6_

  - [ ]* 5.6 Write property test for `handlePost` always writing gameId="global" (Property 4)
    - **Property 4: Lambda always adds gameId="global" regardless of input**
    - **Validates: Requirements 3.3, 4.2**
    - Use `fc.record` with optional `gameId` field containing any string; assert `PutItem` is called with `gameId = "global"` on every valid body
    - Tag: `// Feature: dynamodb-leaderboard-amplify-deploy, Property 4: Lambda always adds gameId="global" regardless of input`

  - [ ]* 5.7 Write property test for `handlePost` rejecting all invalid inputs with 400 (Property 5)
    - **Property 5: Lambda POST handler rejects all invalid inputs with 400**
    - **Validates: Requirements 4.3**
    - Generate bodies that violate at least one rule (empty `id`, `id` > 100 chars, non-integer `score`, out-of-range `score`, missing `timestamp`); assert response is 400 with `error` field
    - Tag: `// Feature: dynamodb-leaderboard-amplify-deploy, Property 5: Lambda POST handler rejects all invalid inputs with 400`

  - [x] 5.8 Implement `handleDelete` in `lambda/handler.js`
    - Query all items with `gameId = "global"` (paginate with `LastEvaluatedKey` until exhausted)
    - Delete in 25-item `BatchWriteItem` chunks
    - Return 204 with no body and CORS headers
    - On partial or full DynamoDB error: log + return 500
    - _Requirements: 4.4, 4.6_

- [x] 6. Checkpoint — Verify Lambda unit tests
  - Ensure all tests in `lambda/__tests__/handler.test.js` pass. Ask the user if questions arise.

- [x] 7. Wire everything together and verify integration
  - [x] 7.1 Create `lambda/package.json` declaring `@aws-sdk/client-dynamodb` as a dependency
    - Specify Node.js 20.x engine and include the Lambda entry point (`handler.js`)
    - _Requirements: 4.7_

  - [ ]* 7.2 Write integration smoke tests for the complete data flow
    - Test: `scoreManager.js` module selects `DynamoDBScoreStore` when env var is set (module-level integration)
    - Test: `save()` + `load()` against a mocked API returns a consistent leaderboard array
    - _Requirements: 2.1, 7.1, 7.3_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Run `npm test` (vitest run). Ensure all tests in both `src/data/__tests__/` and `lambda/__tests__/` pass. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for an MVP; all core implementation tasks must be completed
- Each task references specific requirements for traceability
- Checkpoints validate the build incrementally and catch regressions early
- The Lambda (`lambda/handler.js`) is deployed manually to AWS via the Console or CLI — Amplify CI/CD deploys only the frontend
- AWS infrastructure (DynamoDB table, Lambda, API Gateway, Amplify app, IAM role) must be provisioned manually before running integration or smoke tests; those are not automated coding tasks
- `VITE_SCORES_API_URL` must be set in the Amplify Console for the `main` branch before the first production build
- `ALLOWED_ORIGIN` must be set in the Lambda environment variables after the Amplify app domain is known
- Property tests use a minimum of 100 fast-check iterations; each test file includes the `// Feature: dynamodb-leaderboard-amplify-deploy` tag

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "5.2", "5.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "5.4", "5.5"] },
    { "id": 4, "tasks": ["2.6", "2.7", "2.8", "5.6", "5.7", "5.8"] },
    { "id": 5, "tasks": ["4.1", "7.1"] },
    { "id": 6, "tasks": ["4.2", "7.2"] }
  ]
}
```
