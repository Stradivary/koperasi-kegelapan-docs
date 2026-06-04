# 1. Overview

## Testing philosophy

Every test assertion must trace to at least one claim in a spec layer above it. Tests that cannot be traced to a spec are candidates for deletion or for a spec gap to be filled. The acceptance criteria in [Product Spec §4](../product-spec/4_acceptance-criteria.md) are the top-level regression checklist; all 19 must have at least one E2E scenario.

---

## Test types

### Unit tests

**Scope**: a single pure function or module in isolation. External dependencies (backend API, IndexedDB, NFC hardware) are replaced by deterministic fakes or mocks.

**What is unit-tested**:

- Cryptographic primitives: key derivation, HMAC, nonce generation, AES-GCM encrypt/decrypt
- The full 8-step card validation sequence (each step independently and in combination)
- Card state machine transitions (valid and invalid)
- Financial limit enforcement logic
- Local-first store operations (outbox write, retry, idempotency, dead-letter)
- Auth token parsing, scope extraction, and expiry checking
- Encoding / decoding of binary card fields

**What is not unit-tested**:

- Web NFC hardware interactions (integration or E2E scope)
- Live backend responses (E2E scope)
- Full reconciliation round-trips (E2E scope)

### E2E tests

**Scope**: the full application stack from browser UI through to backend API and back, running against a real (seeded) test database and a mock NFC card reader.

**What is E2E-tested**:

- Complete offline transaction flows including card read, write, and state transitions
- Tamper detection: deliberately corrupted cards trigger the correct response chain
- Session lifecycle: check-in, transaction, check-out, session expiry
- Reconciliation: batch upload, acceptance, flag propagation
- Tenant isolation: cross-tenant access attempts are blocked
- Auth flows: login, session expiry, token rotation, device blocking, logout
- Financial limit enforcement from the UI through to backend flag

**What is not E2E-tested**:

- Physical NFC hardware failure modes (separate hardware integration tests)

---

## Tooling

| Layer                 | Tool                           | Notes                                                                             |
| --------------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| Unit tests            | **Vitest**                     | Co-located with source files as `*.test.ts`; runs in Node and jsdom               |
| E2E tests             | **Playwright**                 | Chromium (Web NFC available via mock); tests in `e2e/` directory                  |
| NFC mock              | Custom Playwright fixture      | Intercepts `NDEFReader` and `NDEFWriter` calls; feeds deterministic card payloads |
| Backend test instance | Miniflare (Cloudflare Workers) | In-process; seeded before each E2E suite                                          |
| Test database         | SQLite (D1 compat)             | Reset before each E2E suite; pre-seeded with tenant, account, and card fixtures   |
| Coverage              | Vitest `v8` provider           | Target: 90% line coverage on crypto, validation, and state-machine modules        |

---

## Environments

| Environment         | Used by         | Database          | Backend                    |
| ------------------- | --------------- | ----------------- | -------------------------- |
| Local development   | Developer       | Local SQLite seed | Miniflare dev mode         |
| CI (GitHub Actions) | Automated tests | In-memory SQLite  | Miniflare                  |
| Staging             | Pre-release E2E | Staging D1        | Real Cloudflare Worker     |
| Production          | -               | -                 | Not tested (monitors only) |

---

## Coverage requirements

| Module                                        | Minimum line coverage |
| --------------------------------------------- | --------------------- |
| `crypto/` (key derivation, HMAC, nonce, AES)  | 100%                  |
| `validation/` (tamper detection steps 0–8)    | 100%                  |
| `state-machine/` (card state transitions)     | 95%                   |
| `limits/` (financial limit enforcement)       | 95%                   |
| `outbox/` (local-first reconciliation outbox) | 90%                   |
| `auth/` (token parse, scope check, expiry)    | 95%                   |
| Everything else                               | 80%                   |

CI must fail on any coverage drop below the above thresholds.

---

## Test data conventions

- Use deterministic card IDs and tenant IDs in fixture files; never random UUIDs in fixtures.
- All card payloads used in unit tests are pre-computed with known keys and annotated with the key derivation parameters.
- Financial amounts in test fixtures use Rp values that are clearly distinguishable from limit boundaries (e.g., use Rp 500,000 for a normal debit, not Rp 999,999).
- Tamper test fixtures explicitly document which byte was modified and why the validation step should catch it.

---

## Cross-references

- Product Spec §4: [Acceptance Criteria](../product-spec/4_acceptance-criteria.md)
- Security Spec §1: [Overview](../security-spec/1_overview.md)
