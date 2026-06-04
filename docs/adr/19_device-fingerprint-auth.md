# ADR-019: Device Fingerprint Authentication (No Cryptographic Device Identity)

**Date**: 2026-06-01  
**Status**: Accepted

## Context

The original security design called for cryptographic device identity: a commissioning secret exchanged for an ECDSA P-256 key pair stored in WebCrypto as a non-extractable `CryptoKey`. This would provide strong device binding — even if credentials are stolen, they can't be used from a different device.

However, implementation revealed several issues:

1. WebCrypto's `generateKey` with `extractable: false` is not persistent across page reloads in all browsers — the key exists only in the `CryptoKey` object's lifetime unless explicitly stored in IndexedDB.
2. Storing a `CryptoKey` in IndexedDB works but provides no real hardware binding — the IDB database can be exported/copied between devices.
3. The challenge-response flow adds a round-trip to every authentication, increasing login complexity.
4. Target devices (budget Android tablets) don't have TPM/TEE-backed WebCrypto — `CryptoKey` lives in software memory, not a secure enclave.

The system needs device tracking for audit and blocking purposes, but hardware-grade device binding is not achievable in a browser-only environment on target hardware.

## Decision

Use a **browser fingerprint hash** as a soft device identifier instead of a cryptographic key pair.

**Implementation:**
- At login time, the client computes a fingerprint from: a hash combining `userAgent`, `platform`, and other browser characteristics.
- The fingerprint is sent as `deviceFingerprint: { hash, userAgent, platform }` in the auth request.
- The server registers/upserts a `devices` row: `deviceId` (generated UUID), `fingerprintHash`, `tenantId`, `accountId`.
- The `deviceId` is included in the JWT and attached to all subsequent API calls.
- Device blocking uses the `devices.blocked_until` field — a blocked device gets 403 from the `deviceBlockCheck` middleware.

**What this provides:**
- Device tracking for audit trail (which device performed which operations)
- Device blocking capability (superadmin can disable a specific device)
- Session binding (refresh tokens are per-device)
- Fingerprint stability across page reloads (deterministic from browser properties)

**What this does NOT provide:**
- Hardware-grade device binding (fingerprint can be spoofed)
- Prevention of credential reuse on a different device (same username/password works elsewhere)
- Attestation that the device is genuine or unmodified

## Consequences

**Positive:**

- Simple to implement — no key generation, no challenge-response protocol
- Works on all browsers without WebCrypto key persistence issues
- Provides sufficient device tracking for operational security (audit + blocking)
- No hardware requirements beyond what Chrome provides
- Device blocking effectively revokes all sessions and prevents new grants

**Negative:**

- Not a true cryptographic device identity — fingerprint can be cloned
- Cannot prove a request came from a specific physical device
- Fingerprint may change if browser is updated or user clears data (creates new device record)
- Multiple incognito sessions = multiple device records

**Risks:**

- An attacker with stolen credentials can authenticate from any device (just creates a new device record)
- Device blocking is reactive, not preventive — the attacker has already authenticated once
- Fingerprint collision could cause two different devices to share a device record (unlikely with hash diversity)

**Future enhancement path:**
- Add WebAuthn as optional device attestation when supported hardware is available
- Use PRF extension (WebAuthn Level 3) for hardware-bound encryption keys
- Consider mandatory device enrollment workflow for admin/station roles

## Alternatives Considered

| Option                                | Reason Rejected                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **ECDSA P-256 device key pair**       | Not hardware-bound in browsers. CryptoKey persistence is fragile. Adds protocol complexity.      |
| **WebAuthn as device identity**       | Not reliably available on budget Android devices. Requires biometric or PIN setup.               |
| **No device tracking at all**         | Loses audit capability and device blocking. Too risky for a financial system.                    |
| **Cookie-based device ID**            | Clearable, not cross-origin persistent, inconsistent in incognito. Less reliable than fingerprint.|
| **Hardware serial number**            | Not accessible from browser environment.                                                         |

## References

- Security Spec §2: [Authentication & Authorization](../security-spec/2_authentication-authorization.md)
- API Spec §2: [Authentication](../api-spec/2_auth.md)
- Data Spec §3: [`devices` table](../data-spec/3_backend-db-schema.md)
- assumptions.md §9: Device Management
