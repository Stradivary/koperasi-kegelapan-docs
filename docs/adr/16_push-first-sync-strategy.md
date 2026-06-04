# ADR-016: Push-First Sync Strategy with Debounce and Periodic Pull

**Date**: 2026-06-01  
**Status**: Accepted

## Context

The application maintains local state in IndexedDB (members, cards, transactions) that must be synchronized with the Cloudflare D1 backend. Multiple sync triggers exist: user actions, timer-based polling, visibility changes, and connectivity restoration. The sync strategy must:

1. Ensure offline transactions are uploaded before pulling new server state (to avoid overwriting pending local changes)
2. Avoid excessive API calls from rapid local mutations
3. Keep local replicas reasonably fresh for multi-device scenarios
4. Handle failures gracefully with retry logic

## Decision

Adopt a **push-first** sync strategy with debounced triggers and periodic background pull:

**Push-first ordering:**
1. Push pending entity changes (members, cards) via `POST /api/sync/push-entities`
2. Push pending transactions via `POST /api/sync/push` with idempotency keys
3. Pull server updates via `GET /api/sync/pull` with cursor-based pagination
4. Update local sync cursors on successful pull

**Trigger debouncing:**
- After any local mutation, wait **5 seconds** of inactivity before triggering sync
- This collapses rapid consecutive operations (e.g., issuing multiple cards) into a single sync batch

**Periodic pull:**
- Every **30 seconds**, trigger a pull cycle to catch changes from other devices
- Skipped if a sync is already in progress

**Additional triggers:**
- `visibilitychange` event (tab becomes active again)
- `online` event (connectivity restored)
- Initial app mount

**Retry policy:**
- Exponential backoff: 1s → 2s → 4s → 8s → 16s (capped at 60s)
- Maximum 5 consecutive retry attempts per cycle
- HTTP 401: abort immediately, signal re-authentication
- HTTP 429: respect `Retry-After` header
- Device blocked: abort immediately, no retry

## Consequences

**Positive:**

- Local offline transactions are never lost — they're pushed before remote state could overwrite them
- Debouncing prevents API spam from rapid UI operations
- 30s polling keeps multi-device scenarios reasonably consistent
- Idempotency keys make retries safe
- Cursor-based pagination efficiently handles large datasets without re-downloading everything

**Negative:**

- 30s polling interval means multi-device consistency has up to 30s lag
- Push-first means server state might be slightly stale until pull completes
- 5s debounce adds perceived latency for users expecting immediate server confirmation

**Risks:**

- If push consistently fails (server down), the outbox grows unbounded — needs max size or cleanup policy
- Rapid page reloads could trigger multiple concurrent sync cycles — mitigated by "sync in progress" guard

## Alternatives Considered

| Option                         | Reason Rejected                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Pull-first sync**           | Risks overwriting pending local changes with stale server state. Breaks outbox-first principle. |
| **Real-time WebSocket sync**  | Cloudflare Workers don't support persistent WebSocket connections well. Adds complexity.         |
| **No periodic pull**          | Multi-device scenarios would only sync on explicit user action. Too stale.                       |
| **Immediate sync (no debounce)** | Excessive API calls during batch operations (card issuance, bulk registration).               |

## References

- ADR-011: [Outbox-First Reconciliation Sync](11_outbox-first-reconciliation-sync.md)
- Data Spec §5: [Multitenancy, Auth & Local-first Storage](../data-spec/5_multitenancy-auth-local-first.md)
- API Spec §6: [Sync](../api-spec/6_sync.md)
- assumptions.md §8: Sinkronisasi (Online/Offline)
