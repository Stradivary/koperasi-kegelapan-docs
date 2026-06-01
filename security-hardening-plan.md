# Security Hardening Implementation Plan

## Overview

This plan addresses 22 identified vulnerabilities across authentication, authorization, API security, client-side security, and infrastructure. Work is organized into 5 phases, ordered by impact and dependency.

**Estimated total effort:** ~8-12 days for a single developer familiar with the codebase.

---

## Phase 1: JWT Signing & Auth Middleware (Critical - Days 1-3)

This single phase eliminates the root cause behind ~70% of the attack surface.

### Task 1.1: Implement HMAC-SHA256 JWT Signing

**File:** `api/src/routes/auth.ts`

**Changes:**
1. Replace `buildAccessToken()` to use HMAC-SHA256 signing with `SESSION_MASTER_KEY`
2. Change `alg` from `"none"` to `"HS256"`
3. Generate signature: `HMAC-SHA256(base64(header) + "." + base64(payload), masterKey)`
4. Add `exp` claim (e.g., 1 hour for access tokens)

```typescript
// Before
function buildAccessToken(payload) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify({ ...payload, iat: now() }));
  return `${header}.${body}.unsigned`;
}

// After
function buildAccessToken(payload, masterKey: string) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const body = btoa(JSON.stringify({ ...payload, iat: now(), exp }));
  const data = `${header}.${body}`;
  const sig = createHmac("sha256", masterKey).update(data).digest("base64url");
  return `${data}.${sig}`;
}
```

**Acceptance criteria:**
- All issued tokens are signed
- Tokens include `exp` claim
- Existing unsigned tokens are rejected after deployment

---

### Task 1.2: Create Token Verification Middleware

**New file:** `api/src/middleware/verifyToken.ts`

**Responsibilities:**
1. Extract Bearer token from Authorization header
2. Verify HMAC-SHA256 signature against `SESSION_MASTER_KEY`
3. Check `exp` claim (reject expired tokens)
4. Attach decoded payload to Hono context (`c.set("auth", payload)`)
5. Return 401 on missing/invalid/expired tokens

```typescript
export const verifyToken = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required" }, 401);
  }
  const token = authHeader.slice(7);
  const payload = verifyJwt(token, c.env.SESSION_MASTER_KEY);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  c.set("auth", payload);
  await next();
});
```

---

### Task 1.3: Apply Auth Middleware to All Protected Routes

**File:** `api/src/index.ts`

**Changes:**
1. Apply `verifyToken` middleware to all `/api/*` routes EXCEPT `/api/auth/token` and `/api/auth/refresh`
2. Update `tokenExtract.ts` to use verified payload from context instead of re-parsing

```typescript
// Exempt auth endpoints from token verification
app.use("/api/*", corsMiddleware);
app.use("/api/*", deviceBlockCheck);

// Auth routes (no token required)
app.route("/api/auth", authRoutes);

// All other routes require valid token
app.use("/api/*", verifyToken);
app.route("/api/session-grant", sessionGrantRoute);
app.route("/api/policy", policyRoute);
// ... etc
```

---

### Task 1.4: Update superadminAuth to Use Verified Token

**File:** `src/server/superadminAuth.ts`

**Changes:**
- Remove manual token parsing (now handled by middleware)
- Read `accountId` from verified context
- Keep the DB role check (defense in depth)

---

### Task 1.5: Implement Refresh Token Endpoint

**New route:** `POST /api/auth/refresh`

**Logic:**
1. Accept `{ refreshToken, sessionId }` in body
2. Hash the refresh token, look up session by `sessionId`
3. Verify hash matches, session not revoked, not expired
4. Issue new access token + rotate refresh token (invalidate old hash)
5. Return new `{ accessToken, refreshToken, expiresAt }`

**Security:**
- Detect refresh token reuse (compromised token detection) - revoke all device sessions
- Rate limit: 10 requests/minute per sessionId

---

## Phase 2: CORS & Rate Limiting (High - Days 3-4)

### Task 2.1: Tighten CORS Origins

**File:** `api/src/middleware/cors.ts`

**Changes:**
- Replace `*.pages.dev` wildcard with specific project URL (e.g., `koperasi-kegelapan.pages.dev`)
- Remove `*.workers.dev` entirely (use specific worker URL)
- Keep localhost for dev

```typescript
// Before
if (origin.endsWith(".pages.dev")) return origin;
if (origin.endsWith(".workers.dev")) return origin;

// After
const ALLOWED_PAGES = [
  "https://koperasi-kegelapan.pages.dev",
  "https://develop.koperasi-kegelapan-app.pages.dev", // staging preview
];
if (ALLOWED_PAGES.includes(origin)) return origin;
```

---

### Task 2.2: Add Rate Limiting to Auth Endpoints

**New file:** `api/src/middleware/authRateLimit.ts`

**Design:**
- Sliding window: 5 failed attempts per username per 15 minutes
- After 5 failures: return 429 with `Retry-After: 900`
- Successful login resets the counter
- Key: `username` (not IP, since Workers don't reliably expose client IP)

**Apply to:** `/api/auth/token` and `/api/auth/refresh`

---

### Task 2.3: Add Rate Limiting to All API Routes

**File:** `api/src/index.ts`

**Design:**
- Global rate limit: 120 req/min per `accountId` (from verified token)
- Unauthenticated routes (auth): 30 req/min per connecting IP (via `CF-Connecting-IP` header)

---

## Phase 3: Input Validation & Security Headers (Medium - Days 5-7)

### Task 3.1: Add Zod Schemas for All API Routes

**New file:** `api/src/schemas/` directory

Create schemas for each route:

```
api/src/schemas/
├── auth.ts          # { username: string, password: string, tenantSlug?: string, deviceFingerprint?: {...} }
├── accounts.ts      # create, update, patch schemas
├── sync.ts          # push payload, pull query params
├── reconcile.ts     # { terminalId: number, events: Event[] }
├── session-grant.ts # query params validation
├── policy.ts        # query params
└── superadmin.ts    # tenant create, account create, etc.
```

**Pattern:**
```typescript
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1).max(100).trim(),
  password: z.string().min(1).max(128),
  tenantSlug: z.string().min(3).max(50).optional(),
  deviceFingerprint: z.object({
    hash: z.string().length(64),
    userAgent: z.string().max(500),
    platform: z.string().max(100),
  }).optional(),
});
```

**Apply via helper:**
```typescript
function validate<T>(schema: z.ZodSchema<T>, data: unknown): T | Response {
  const result = schema.safeParse(data);
  if (!result.success) {
    return c.json({ error: "Validation failed", details: result.error.flatten() }, 400);
  }
  return result.data;
}
```

---

### Task 3.2: Add Security Headers

**Option A (Cloudflare Pages `_headers` file):**

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/index.html
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://koperasi-kegelapan-api.ahmad-muzaki-st.workers.dev; img-src 'self' data:;
```

**Option B (Worker middleware):**

```typescript
export const securityHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});
```

---

### Task 3.3: Sanitize Error Responses

**All route files**

**Changes:**
- Replace `return c.json({ error: msg }, 500)` with generic messages
- Log detailed errors server-side (Cloudflare Logpush or console)
- Never expose stack traces, DB errors, or internal paths to clients

```typescript
// Before
catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  return c.json({ error: msg }, 500);
}

// After
catch (e) {
  console.error("reconcile error:", e);
  return c.json({ error: "Internal server error" }, 500);
}
```

---

## Phase 4: Client-Side Security (Medium - Days 7-9)

### Task 4.1: Remove Hardcoded Master Key from Client

**Files:**
- `src/lib/localSessionGrant.ts` - remove `LOCAL_MASTER_KEY`
- `src/hooks/useSessionGrant.ts` - remove `LOCAL_MASTER_SEED`

**Replacement strategy:**
- Local-only tenants: derive a key from the admin's password hash (already stored in IndexedDB) using HKDF. This means the key is never hardcoded - it's derived at runtime from user credentials.
- Online tenants: always fetch session grants from server. Remove local fallback for online mode.

```typescript
// New approach for local tenants
async function deriveLocalSessionKey(adminPasswordHash: string, tenantId: string): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", ENC.encode(adminPasswordHash), "HKDF", false, ["deriveBits"]
  );
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: ENC.encode(tenantId), info: ENC.encode("local-session-v2") },
    keyMaterial, 256
  ));
}
```

---

### Task 4.2: Encrypt Sensitive IndexedDB Data

**File:** `src/lib/indexeddb.ts`

**Changes:**
- Derive an encryption key from the user's session (e.g., HKDF from access token hash)
- Encrypt session grants and tokens before storing in IndexedDB
- Decrypt on read

**Scope:** Encrypt these stores:
- `sessionGrantCache` (contains crypto keys)
- `authTokenCache` (contains access tokens)
- `localAccounts` (contains password hashes)

**Note:** This is defense-in-depth. If XSS is achieved, the attacker likely has access to the decryption key in memory too. But it prevents offline extraction from DevTools/disk.

---

### Task 4.3: Move Token Storage to Memory-Only (with sessionStorage fallback)

**File:** `src/lib/api.ts`

**Changes:**
- Remove `localStorage.setItem(ACCESS_TOKEN_LS_KEY, token)`
- Keep in-memory cache only
- Use `sessionStorage` as fallback (cleared on tab close)
- Rely on refresh token (httpOnly cookie in future) for persistence

**Trade-off:** Users will need to re-authenticate after closing the tab. This is acceptable for a financial application.

---

### Task 4.4: Strengthen Password Policy

**Files:**
- `api/src/routes/accounts.ts`
- `src/server/superadminAccounts.ts`
- `src/server/superadminTenants.ts`
- `src/hooks/useLocalSetup.ts`

**New policy:**
- Minimum 8 characters (keep)
- At least 1 uppercase, 1 lowercase, 1 digit
- Maximum 128 characters (keep)
- Consistent across all entry points (server + client)

```typescript
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

function validatePassword(password: string): string | null {
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must be 8-128 chars with at least 1 uppercase, 1 lowercase, and 1 digit";
  }
  return null;
}
```

---

## Phase 5: Infrastructure & Cleanup (Low - Days 9-11)

### Task 5.1: Ensure Seed Credentials Don't Exist in Production

**File:** `src/db/seed.ts`

**Changes:**
- Add environment check: skip seeding if `NODE_ENV === "production"`
- Add a migration that checks for `username = "superadmin"` with the default hash and forces a password change
- Document in deployment runbook

---

### Task 5.2: Add Tenant Isolation Enforcement to Sync

**File:** `api/src/routes/sync.ts`

**Changes:**
- Currently logs a warning on tenantId mismatch between token and payload
- Change to hard reject: `return c.json({ error: "tenant_mismatch" }, 403)`

```typescript
// Before
if (tokenPayload.tenantId !== body.tenantId) {
  logger.warn("tenantId mismatch", { token: tokenPayload.tenantId, body: body.tenantId });
}

// After
if (tokenPayload.tenantId !== body.tenantId) {
  return c.json({ error: "tenant_mismatch" }, 403);
}
```

---

### Task 5.3: Improve Device Fingerprint (Defense in Depth)

**File:** `src/lib/deviceFingerprint.ts`

**Changes:**
- Add server-side device binding: on first login, store the fingerprint hash server-side
- On subsequent requests, if the fingerprint changes for the same deviceId, flag for review
- This doesn't prevent forgery but adds a detection layer

---

### Task 5.4: Add Cloudflare WAF Rules

**Location:** Cloudflare Dashboard / Terraform

**Rules:**
- Block requests without valid `Origin` header to API routes
- Challenge requests from known bot ASNs
- Rate limit by IP at the edge (backup for in-app rate limiting)

---

### Task 5.5: Remove Seed Credentials & Add Production Checklist

**New file:** `docs/production-security-checklist.md`

Contents:
- [ ] `SESSION_MASTER_KEY` is a 32+ byte random value (not the dev default)
- [ ] Seed accounts don't exist in production D1
- [ ] CORS origins are restricted to production domains only
- [ ] Cloudflare WAF rules are active
- [ ] SonarCloud has no critical/high findings
- [ ] npm audit shows no high/critical vulnerabilities

---

## Dependency Graph

```
Phase 1 (JWT + Auth Middleware)
  ├── Task 1.1 (Sign JWTs)
  ├── Task 1.2 (Verify middleware) ← depends on 1.1
  ├── Task 1.3 (Apply to routes) ← depends on 1.2
  ├── Task 1.4 (Update superadmin) ← depends on 1.2
  └── Task 1.5 (Refresh endpoint) ← depends on 1.1

Phase 2 (CORS + Rate Limit) ← can start after 1.3
  ├── Task 2.1 (Tighten CORS)
  ├── Task 2.2 (Auth rate limit)
  └── Task 2.3 (Global rate limit) ← depends on 1.2

Phase 3 (Validation + Headers) ← independent, can parallel with Phase 2
  ├── Task 3.1 (Zod schemas)
  ├── Task 3.2 (Security headers)
  └── Task 3.3 (Error sanitization)

Phase 4 (Client-side) ← depends on Phase 1 (needs signed tokens)
  ├── Task 4.1 (Remove hardcoded key)
  ├── Task 4.2 (Encrypt IndexedDB) ← depends on 4.1
  ├── Task 4.3 (Memory-only tokens)
  └── Task 4.4 (Password policy)

Phase 5 (Infrastructure) ← independent
  ├── Task 5.1 (Seed cleanup)
  ├── Task 5.2 (Tenant isolation)
  ├── Task 5.3 (Fingerprint improvement)
  ├── Task 5.4 (WAF rules)
  └── Task 5.5 (Production checklist)
```

---

## Migration Strategy

Since signing JWTs will invalidate all existing tokens:

1. **Deploy Phase 1 with a grace period:** Accept both unsigned and signed tokens for 24-48 hours (log warnings for unsigned)
2. **Force re-login:** After grace period, reject unsigned tokens. All clients will need to re-authenticate.
3. **Communicate:** Add a banner in the app warning users of upcoming forced logout.

```typescript
// Temporary dual-mode verification (remove after grace period)
function verifyJwt(token: string, masterKey: string): Payload | null {
  const [header, body, sig] = token.split(".");
  const payload = JSON.parse(atob(body));

  if (sig === "unsigned") {
    console.warn("DEPRECATED: unsigned token used", { accountId: payload.accountId });
    // Grace period: allow but log
    return payload;
  }

  // Verify HMAC signature
  const expected = createHmac("sha256", masterKey).update(`${header}.${body}`).digest("base64url");
  if (sig !== expected) return null;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
```

---

## Testing Strategy

Each phase should include:
- **Unit tests** for new middleware/utilities (token signing, verification, rate limiting)
- **Integration tests** for auth flow (login → get token → access protected route)
- **Negative tests** for each vulnerability (forged token rejected, unauthenticated request blocked)
- **Load test** rate limiting behavior under concurrent requests

---

## Risk Assessment Post-Implementation

After all phases are complete:

| Previous Risk | New Status |
|---------------|------------|
| Token forgery | Eliminated (HMAC-SHA256) |
| Unauthenticated endpoints | Eliminated (auth middleware) |
| CORS exploitation | Mitigated (specific origins) |
| Brute force login | Mitigated (rate limiting) |
| Client key exposure | Mitigated (password-derived keys) |
| XSS token theft | Reduced (memory-only + encrypted storage) |
| Missing headers | Eliminated (CSP, HSTS, etc.) |
| Input injection | Mitigated (Zod validation) |
