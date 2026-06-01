# 13. Role-specific App Models

## Permission matrix

| Operation                 | Station | Gate | Terminal | Member view |
| ------------------------- | ------- | ---- | -------- | ----------- |
| Read card state           | ✓       | ✓    | ✓        | ✓           |
| Issue / re-key card       | ✓       | −    | −        | −           |
| Top-up balance            | ✓       | −    | −        | −           |
| Check-in (open session)   | −       | ✓    | −        | −           |
| Check-out (close session) | −       | ✓    | −        | −           |
| Debit transaction         | −       | −    | ✓        | −           |
| Block card                | ✓       | ∓    | ∓        | −           |
| View transaction logs     | ✓       | ✓    | ✓        | ✓           |
| Upload reconciliation     | ∓       | ∓    | ✓        | −           |
| Manage blacklists         | ✓       | −    | −        | −           |

(✓ = always allowed, ∓ = allowed in specific conditions, − = not allowed)

## Station

- **Purpose**: card issuance, top-up, and lifecycle management.
- **Operations**: register new cards; write initial payload; top-up balance (requires backend validation); assign or change status; maintain blacklists; issue session grants for offline gate/terminal use.
- **UI mode**: authenticated staff interface; requires both operator login and enrolled-device authentication inside the active tenant.
- **Key access**: holds a provisioning key for initial card writes; does not hold debit permissions.

## Gate

- **Purpose**: session lifecycle - checking users in and out.
- **Operations**: read card state; open a session (`IDLE → CHECKED_IN`); close a session (`CHECKED_IN → CHECKED_OUT`); validate expiry.
- **UI mode**: kiosk or turnstile-style interface; minimal user interaction.
- **Simulation mode**: gates may run in simulation mode for testing without writing to live cards.
- **Key access**: holds a session grant with `checkin` and `checkout` permissions.

## Terminal

- **Purpose**: transaction processing at point of service.
- **Operations**: read and validate card state; perform debit transactions; mark suspicious cards; queue and upload reconciliation events.
- **UI mode**: staff-operated or self-service transaction screen.
- **Offline behavior**: queues events locally and flushes to backend when connectivity returns.
- **Key access**: holds a session grant with `debit` permission; may not issue cards or top up.

## Member view (Scout view)

- **Purpose**: cardholder self-service information.
- **Operations**: read balance, session state, and transaction log; view card status.
- **UI mode**: read-only web or mobile interface; no Web NFC write calls.
- **Key access**: no session grant required; uses a public read key or no key if the member-view payload is unencrypted.
