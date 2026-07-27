# Design Document — dynamodb-leaderboard-amplify-deploy

## Overview

This feature migrates the "Torre de las Nubes — Duelo AWS" leaderboard from device-local `localStorage` to a shared, global leaderboard backed by AWS DynamoDB. A new `DynamoDBScoreStore` class implements the existing `ScoreStore` interface and communicates with the backend through an API Gateway REST API + Lambda function. The frontend is hosted on AWS Amplify Hosting with automated CI/CD from GitHub `main`.

The design is strictly a **drop-in replacement**: `ScoreManager` is untouched. The selection between `LocalStorageScoreStore` and `DynamoDBScoreStore` is resolved at module initialization time in `scoreManager.js` by reading `import.meta.env.VITE_SCORES_API_URL`. When the variable is absent, the game falls back transparently to local storage.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| `DynamoDBScoreStore` extends `ScoreStore` | Maintains dependency-injection contract; `ScoreManager` doesn't change |
| `save()` posts only the most-recent-timestamp score | The backend represents one score per submission; the array held by `ScoreManager` is a local cache. Only the newest entry needs persistence. |
| All HTTP errors are silently swallowed | Network failures must never crash the game; the in-memory cache continues to work |
| `gameId = "global"` partition key on GSI | Groups all scores for this single-game deployment under one queryable partition |
| CORS restricted to Amplify domain | Prevents unauthorized frontends from writing to the shared leaderboard |
| Build-time guard in `vite.config.js` | Fails fast in CI/CD rather than silently deploying an app that falls back to localStorage in production |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Vite + ES Modules)                             │
│                                                          │
│  main.js                                                 │
│    └── scoreManager (singleton from scoreManager.js)     │
│          └── scoreStore (DynamoDBScoreStore OR           │
│                           LocalStorageScoreStore)        │
│                                                          │
│  DynamoDBScoreStore                                      │
│    ├── GET  {apiUrl}/scores  ─────────────────────────┐  │
│    ├── POST {apiUrl}/scores  ─────────────────────────┤  │
│    └── DELETE {apiUrl}/scores ────────────────────────┤  │
└───────────────────────────────────────────────────────┼──┘
                                                        │
                          HTTPS / CORS                  │
                                                        ▼
┌────────────────────────────────────────────────────────┐
│  AWS API Gateway REST API (stage: prod)                │
│  Resource: /scores                                     │
│  Methods: GET, POST, DELETE, OPTIONS                   │
└───────────────────────────┬────────────────────────────┘
                            │ Lambda Proxy Integration
                            ▼
┌────────────────────────────────────────────────────────┐
│  AWS Lambda  torre-nubes-scores-api                    │
│  Node.js 20.x  /  arm64                               │
│                                                        │
│  GET    → QueryCommand(GSI, gameId="global", Limit=10) │
│  POST   → validates body → PutItem (gameId="global")   │
│  DELETE → Query all → BatchWriteItem (delete)          │
│  OPTIONS→ 204 + CORS headers                           │
└───────────────────────────┬────────────────────────────┘
                            │ IAM Role
                            ▼
┌────────────────────────────────────────────────────────┐
│  AWS DynamoDB   torre-nubes-scores                     │
│  PK: id (String)                                       │
│  GSI: gameId-score-index                               │
│       PK: gameId (String)  SK: score (Number)          │
│       Projection: ALL                                  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  AWS Amplify Hosting (CI/CD)                           │
│  Trigger: push to GitHub main                          │
│  amplify.yml → npm ci → npm run build → dist/          │
│  Env: VITE_SCORES_API_URL (injected at build time)     │
└────────────────────────────────────────────────────────┘
```

### Environment Variable Flow

```
Amplify Console (prod) ──VITE_SCORES_API_URL──► vite build
                                                    │
                                             embedded in JS bundle
                                                    │
                                       import.meta.env.VITE_SCORES_API_URL
                                                    │
                              ┌─────────────────────┴──────────────────────┐
                              │ truthy?                                      │
                           YES │                                          NO │
                              ▼                                             ▼
                  DynamoDBScoreStore(apiUrl)             LocalStorageScoreStore()
```

---

## Components and Interfaces

### 1. `src/data/dynamoDBScoreStore.js` (new file)

```js
import { ScoreStore } from './scoreStore.js';

export class DynamoDBScoreStore extends ScoreStore {
  constructor(apiUrl)            // trims trailing '/'
  async load()                   // GET {apiUrl}/scores → Score[] sorted desc
  async save(scores)             // POST most-recent Score; no-op on empty
  async clear()                  // DELETE {apiUrl}/scores
}
```

**`load()` algorithm:**
1. `fetch(`${this.apiUrl}/scores`, { method: 'GET' })`
2. If response not ok → log → return `[]`
3. Parse JSON → sort descending by `.score` → return
4. Any thrown error → log → return `[]`

**`save(scores)` algorithm:**
1. If `scores.length === 0` → return immediately
2. Find the score with the maximum `timestamp` (ISO 8601 string comparison — ISO 8601 lexicographic order equals chronological order)
3. `fetch(`${this.apiUrl}/scores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mostRecent) })`
4. If response not ok → log → return (no throw)
5. Any thrown error → log → return

**`clear()` algorithm:**
1. `fetch(`${this.apiUrl}/scores`, { method: 'DELETE' })`
2. If response not ok → log → return
3. Any thrown error → log → return

**Constructor:**
```js
constructor(apiUrl) {
  super();
  this.apiUrl = apiUrl.replace(/\/+$/, '');
}
```

### 2. `src/data/scoreManager.js` (modified — singleton exports only)

The class `ScoreManager` and its file content are untouched except for the last two export lines, which become:

```js
import { DynamoDBScoreStore } from './dynamoDBScoreStore.js';

// ... existing ScoreManager class definition unchanged ...

const apiUrl = import.meta.env.VITE_SCORES_API_URL;
export const scoreStore = (apiUrl && apiUrl.length > 0)
  ? new DynamoDBScoreStore(apiUrl)
  : new LocalStorageScoreStore();
export const scoreManager = new ScoreManager(scoreStore);
```

All other modules (`main.js`, `ui/leaderboard.js`, etc.) import `{ scoreManager, scoreStore }` from this file without any changes.

### 3. `vite.config.js` (new or updated — build-time guard)

```js
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (mode === 'production' && !env.VITE_SCORES_API_URL) {
    throw new Error(
      '[Build] VITE_SCORES_API_URL is required for production builds. ' +
      'Set it in the Amplify Console environment variables.'
    );
  }

  return {};
});
```

This guard runs only in `production` mode (`npm run build`), so local `npm run dev` without `.env.local` continues to work normally.

### 4. `amplify.yml` (new file — repo root)

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - 'node_modules/**/*'
```

### 5. Lambda `torre-nubes-scores-api` (Node.js 20.x, arm64)

The Lambda handles all four methods on a single `/scores` resource via API Gateway Lambda Proxy Integration.

**Routing logic:**
```
event.httpMethod
  GET     → handleGet(event)
  POST    → handlePost(event)
  DELETE  → handleDelete(event)
  OPTIONS → handleOptions(event)
  default → 405
```

**`handleGet`:**
- `QueryCommand`: `TableName`, `IndexName: "gameId-score-index"`, `KeyConditionExpression: "gameId = :g"`, `ExpressionAttributeValues: { ":g": "global" }`, `ScanIndexForward: false`, `Limit: 10`
- Returns `{ statusCode: 200, body: JSON.stringify(items), headers: corsHeaders }`

**`handlePost`:**
- Parse body JSON; validate: `id` is string 1–100 chars, `score` is integer 0–999999999, `timestamp` is non-empty string
- On invalid: return `{ statusCode: 400, body: JSON.stringify({ error: "..." }) }`
- Add `gameId: "global"` (overwrite any existing value)
- `PutItem`: `TableName`, `Item: { id, name, score, timestamp, gameId }`
- Returns `{ statusCode: 201, body: JSON.stringify(item), headers: corsHeaders }`

**`handleDelete`:**
- `QueryCommand` to get all items with `gameId = "global"` (paginated if needed)
- `BatchWriteItem` to delete all (25-item chunks as per DynamoDB API limit)
- Returns `{ statusCode: 204, body: '', headers: corsHeaders }`

**`handleOptions`:**
- Returns `{ statusCode: 204, body: '', headers: corsHeaders }`

**CORS headers object:**
```js
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN; // set in Lambda env vars

function buildCorsHeaders(requestOrigin) {
  const origin = requestOrigin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
```

If `origin` is empty string (mismatched), the browser will block the response due to missing or empty `Access-Control-Allow-Origin`. For the explicit 403 behavior on mismatch, the handler can alternatively return `{ statusCode: 403 }` before executing business logic when origin doesn't match.

**IAM Role permissions:**
- `dynamodb:PutItem` on `arn:aws:dynamodb:{region}:{account}:table/torre-nubes-scores`
- `dynamodb:Query` on `arn:aws:dynamodb:{region}:{account}:table/torre-nubes-scores` and on the GSI ARN (`table/torre-nubes-scores/index/gameId-score-index`)
- `dynamodb:DeleteItem` on `arn:aws:dynamodb:{region}:{account}:table/torre-nubes-scores`
- CloudWatch Logs: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

### 6. DynamoDB Table `torre-nubes-scores`

| Attribute | Type | Role |
|---|---|---|
| `id` | String | Table primary key (PK) |
| `gameId` | String | GSI partition key |
| `score` | Number | GSI sort key |
| `name` | String | Player name (optional) |
| `timestamp` | String | ISO 8601 timestamp |

**GSI: `gameId-score-index`**
- PK: `gameId` (String)
- SK: `score` (Number)
- Projection: ALL
- Billing: On-demand (same as table)

---

## Data Models

### Score object (shared between frontend and backend)

```ts
interface Score {
  id: string;         // Unique identifier, format: "{timestamp}-{randomSuffix}"
  name: string;       // Player name; empty string means anonymous
  score: number;      // Integer in [0, 999999999]; represents floors climbed
  timestamp: string;  // ISO 8601 (e.g., "2024-01-15T14:30:00.000Z")
}
```

### POST /scores request body

```ts
// Minimum required fields (name is optional)
interface PostScoreBody {
  id: string;         // 1–100 characters
  score: number;      // Integer, 0–999999999
  timestamp: string;  // Non-empty string
  name?: string;      // Optional
}
```

### Lambda response envelope

```ts
// API Gateway Lambda Proxy response
interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;       // JSON-serialized string
}
```

### Environment variables

| Variable | Location | Purpose |
|---|---|---|
| `VITE_SCORES_API_URL` | Amplify Console / `.env.local` | API Gateway URL injected at build time by Vite |
| `ALLOWED_ORIGIN` | Lambda environment | Amplify app domain for CORS validation |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

PBT is applicable here because `DynamoDBScoreStore` and the Lambda handler contain pure transformation logic (sorting, timestamp selection, input validation, CORS header injection) that varies meaningfully with inputs. The HTTP layer can be mocked to keep tests fast and deterministic.

The property-based testing library for this project is **fast-check** (already a `devDependency` in `package.json`).

---

### Property 1: load() always returns scores in descending order

*For any* array of Score objects returned by the API (any length ≥ 2, any score values), `DynamoDBScoreStore.load()` SHALL return an array where for every adjacent pair `(a, b)`, `a.score >= b.score`.

**Validates: Requirements 1.2, 7.2**

---

### Property 2: save() posts the score with the maximum timestamp

*For any* non-empty array of Score objects with distinct ISO 8601 timestamps, `DynamoDBScoreStore.save(scores)` SHALL issue exactly one POST request whose JSON body corresponds to the score with the lexicographically greatest (most recent) timestamp.

**Validates: Requirements 1.4**

---

### Property 3: Constructor always strips trailing slashes from the API URL

*For any* URL string (with zero, one, or multiple trailing `/` characters), the `DynamoDBScoreStore` constructor SHALL store a URL with no trailing `/`, so that all fetch calls use well-formed endpoint paths.

**Validates: Requirements 1.9**

---

### Property 4: Lambda always adds gameId="global" regardless of input

*For any* valid POST body (including bodies that contain a `gameId` field with any value), the Lambda POST handler SHALL call `PutItem` with `gameId = "global"` on the stored item.

**Validates: Requirements 3.3, 4.2**

---

### Property 5: Lambda POST handler rejects all invalid inputs with 400

*For any* POST body that violates at least one validation rule (id empty or > 100 chars, score not an integer or outside [0, 999999999], timestamp absent or empty), the Lambda SHALL return HTTP 400 with a JSON body containing an `error` field.

**Validates: Requirements 4.3**

---

### Property 6: Every Lambda response includes the three CORS headers

*For any* HTTP method (GET, POST, DELETE, OPTIONS) and *for any* valid Origin that matches `ALLOWED_ORIGIN`, the Lambda response SHALL include `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` in its headers.

**Validates: Requirements 5.2, 5.5**

---

### Property 7: Mismatched Origin is rejected

*For any* request Origin value that does not equal the configured `ALLOWED_ORIGIN`, the Lambda SHALL either return HTTP 403 or return a response where `Access-Control-Allow-Origin` is absent or empty, so that the browser blocks cross-origin access.

**Validates: Requirements 5.4**

---

### Property 8: save/load round-trip preserves score identity

*For any* valid Score `s` whose `s.score` value would place it in the top 10 of the current leaderboard, calling `save([s])` followed by `load()` SHALL return an array that contains an element with `id === s.id`.

**Validates: Requirements 7.1, 7.3**

---

### Property 9: LocalStorageScoreStore path makes no HTTP requests

*For any* sequence of `load()`, `save(scores)`, and `clear()` calls on a `ScoreManager` initialized with `VITE_SCORES_API_URL` absent or empty, `fetch` SHALL never be called.

**Validates: Requirements 7.4**

---

## Error Handling

### Frontend (`DynamoDBScoreStore`)

| Scenario | Behavior |
|---|---|
| Network error (fetch throws) | Catch → `console.error` → return `[]` (load) or `undefined` (save/clear) |
| HTTP response not ok (4xx, 5xx) | Check `response.ok` → `console.error` → return `[]` / `undefined` |
| Invalid JSON in GET response | Catch JSON.parse error → `console.error` → return `[]` |
| `save([])` called | Return immediately, no fetch |
| `VITE_SCORES_API_URL` absent | `LocalStorageScoreStore` is used — no fetch ever called |

The game continues operating from `ScoreManager`'s in-memory cache regardless of backend failures. The leaderboard may be stale but gameplay is unaffected.

### Lambda (backend)

| Scenario | Behavior |
|---|---|
| Invalid POST body | 400 with `{ "error": "<field> is invalid: <reason>" }` |
| DynamoDB error | 500 with `{ "error": "Internal server error" }` + CloudWatch log |
| Unknown HTTP method | 405 with `{ "error": "Method not allowed" }` |
| Origin mismatch | 403 (or empty CORS header) — no business logic executed |
| BatchDelete partial failure | Log error, return 500 |

### Build pipeline

| Scenario | Behavior |
|---|---|
| `VITE_SCORES_API_URL` not set in production build | `vite.config.js` throws before any bundling → pipeline fails |
| Test failures | `npm test` exits non-zero → Amplify pipeline fails |

---

## Testing Strategy

### Unit Tests (Vitest + fast-check)

Located in `src/data/__tests__/dynamoDBScoreStore.test.js` and `lambda/__tests__/handler.test.js`.

**DynamoDBScoreStore tests:**
- Property 1: generate random Score arrays (fc.array of fc.record), mock fetch to return them unsorted, verify load() output is sorted descending
- Property 2: generate non-empty Score arrays with distinct timestamps, spy on fetch, verify POST body matches score with max timestamp
- Property 3: generate URL strings with 0–3 trailing slashes (fc.string + fc.constantFrom), verify no trailing slash in captured fetch URLs
- Property 8: generate valid Score with score ≥ 1, mock GET to return that score, verify load() returns element with matching id
- Property 9: instantiate with empty apiUrl → LocalStorageScoreStore path; mock fetch, run operations, verify no fetch calls
- Edge cases: save([]) → no fetch; load() on 500 → []; load() on network error → []; clear() on error → no throw

**Lambda handler tests (with mocked `@aws-sdk/client-dynamodb`):**
- Property 4: fc.record with optional gameId field, call POST handler, verify PutItem called with gameId="global"
- Property 5: generate invalid bodies, call POST handler, verify 400 + error field
- Property 6: for each method, mock DynamoDB success, verify all three CORS headers present
- Property 7: fc.string for Origin not equal to ALLOWED_ORIGIN, verify 403 or missing header
- Example: GET returns 200 + JSON array; DELETE calls BatchWrite + returns 204; OPTIONS returns 204

### Integration Tests (manual / CI optional)

These require live AWS resources and are not part of the automated `npm test` suite:
- `GET /scores` returns valid JSON array from DynamoDB
- `POST /scores` with valid body creates item visible in subsequent GET
- `DELETE /scores` empties the leaderboard
- CORS preflight `OPTIONS /scores` returns correct headers

### Smoke Checks (manual)

- DynamoDB table exists with correct schema and GSI
- Lambda configured with Node.js 20.x, arm64, correct IAM role
- API Gateway stage `prod` deployed, endpoint accessible
- Amplify app connected to GitHub `main`, `VITE_SCORES_API_URL` configured

### Local Development Verification

1. Without `.env.local`: `npm run dev` → game loads, leaderboard shows localStorage data, zero console errors
2. With `.env.local` containing valid `VITE_SCORES_API_URL`: `npm run dev` → game loads, leaderboard fetches from DynamoDB
3. Build guard: running `npm run build` without `VITE_SCORES_API_URL` in env → build fails with descriptive error message

### Test Configuration

- **fast-check runs**: minimum 100 iterations per property test
- **Tag format**: each property test includes a comment `// Feature: dynamodb-leaderboard-amplify-deploy, Property N: <property text>`
- **Test command**: `npm test` (runs `vitest run`)
