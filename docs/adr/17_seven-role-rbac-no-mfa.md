# ADR-017: Six-Role RBAC without MFA

**Date**: 2026-06-01  
**Status**: Accepted

## Context

The system serves multiple operator types with different responsibilities: full administrators, station staff (issuance/topup), gate operators (checkin), terminal operators (debit/checkout), read-only member views, and platform-level superadmins.

The original security spec called for MFA (TOTP/WebAuthn) on all privileged roles. However:

1. Target operators are koperasi staff in Indonesian venues — many use shared Android devices without biometric hardware.
2. WebAuthn (FIDO2) requires compatible hardware or platform authenticator — not reliably available on budget Android devices.
3. TOTP requires operators to install an authenticator app and manage enrollment — operational overhead for small cooperatives.
4. The offline-first model means MFA verification would need to be cached/skipped during offline operation, undermining its security value.

## Decision

Implement **six distinct roles** with password-only authentication. No MFA is enforced in v1.

**Roles and their session grant `allowedOps`:**

| Role       | allowedOps                                             | Auth requirement                    |
| ---------- | ------------------------------------------------------ | ----------------------------------- |
| admin      | read, debit, credit, checkin, checkout, admin, station | username + password + tenantSlug    |
| station    | read, credit, checkin, checkout, admin                 | username + password + tenantSlug    |
| gate       | read, checkin                                          | username + password + tenantSlug    |
| terminal   | read, debit, checkout                                  | username + password + tenantSlug    |
| scout      | read                                                   | none (anonymous)                    |
| superadmin | (API management, no card ops)                          | username + password (no tenantSlug) |

**Security controls in place of MFA:**

- Device fingerprint registration at login (tracks which devices access which accounts)
- Device blocking capability (superadmin can block compromised devices)
- 1-hour JWT expiry (short-lived access tokens)
- Refresh token rotation (single-use, replay detection)
- Auth rate limiting (brute-force protection)
- PBKDF2-SHA256 100k iterations (password hash resistance)

## Consequences

**Positive:**

- Low operational friction for koperasi staff — no authenticator app enrollment
- Works on any Android device with Chrome — no hardware requirements beyond NFC
- Offline-first model is simpler without cached MFA state
- Six granular roles provide least-privilege without over-engineering

**Negative:**

- Password-only auth is vulnerable to credential theft, phishing, and social engineering
- No protection against account takeover if password is compromised
- Does not meet OWASP recommendation for MFA on privileged accounts
- Shared device scenarios (multiple operators on same tablet) rely on logout discipline

**Risks:**

- Credential stuffing attacks mitigated only by rate limiting (no lockout)
- A compromised admin password gives full tenant access for up to 1 hour (token lifetime)
- Shared device with cached credentials could allow unauthorized access

**Future enhancement path:**

- Add optional TOTP for admin/station roles when operational readiness allows
- Add WebAuthn for organizations with compatible hardware
- Consider hardware token (Yubikey) for superadmin accounts

## Alternatives Considered

| Option                           | Reason Rejected                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| **Mandatory TOTP for all roles** | Operational overhead too high for target user base. Offline MFA verification is complex. |
| **WebAuthn mandatory**           | Hardware compatibility not guaranteed on budget Android devices.                         |
| **4-role simplified model**      | Insufficient granularity — gate has fundamentally different operations from terminal.    |
| **Role-per-tenant config**       | Adds complexity without clear benefit at current scale.                                  |

## References

- Security Spec §2: [Authentication & Authorization](../security-spec/2_authentication-authorization.md)
- System Design §13: [Client Roles & Apps](../system-design/13_client-roles.md)
- Tech Specs §13: [Role-specific App Models](../tech-specs/13_roles-app-models.md)
- `src/core/auth/roleOps.ts` — role-to-allowedOps mapping
