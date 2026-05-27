# 6. Data Protection

## Storage classification

| Storage area                       | Classification              | Encryption at rest                      | Access control                            |
| ---------------------------------- | --------------------------- | --------------------------------------- | ----------------------------------------- |
| NFC card payload                   | Financial — sensitive       | AES-256-GCM (application-level)         | Requires valid session grant to write     |
| Backend database (PostgreSQL)      | Financial + PII             | Database-level TDE + tenant isolation   | Backend API only; no direct client access |
| Secrets manager (Vault / KV)       | Secret                      | Platform-level encryption               | Backend service identity only             |
| IndexedDB — `operatorSession`      | Sensitive                   | AES-256-GCM via WebCrypto               | Active authenticated session only         |
| IndexedDB — `cardSnapshot`         | Internal                    | None required (no PII, no key material) | Active authenticated session only         |
| IndexedDB — `reconciliationOutbox` | Internal                    | None required (no key material)         | Active authenticated session only         |
| Browser `localStorage`             | Not used for sensitive data | N/A                                     | —                                         |

---

## PII minimisation

The following personal data is intentionally excluded or limited:

| Data                        | Decision                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Member full name on card    | Excluded from card binary; stored server-side only                                     |
| National ID / IC number     | Not collected; out of scope (see [Product Spec §5](../product-spec/5_out-of-scope.md)) |
| Biometric data              | Not collected at any layer                                                             |
| Location data               | Not collected; no GPS or IP-to-location inference stored                               |
| Device hardware fingerprint | Only the enrolled `device_id` (UUID) is stored; no raw fingerprint                     |
| Operator email              | Stored as `username` in `accounts`; protected by Argon2id password hash                |

PII stored on the backend is limited to: operator username/display name, member name, and the join between `user_id` and `card_id`. No government-issued identifier is stored.

---

## Plaintext prohibitions

The following values must never appear in plaintext in any log, database row, API response, or client-side storage:

- Session keys
- Card encryption / HMAC keys
- Refresh tokens (raw)
- OTP seeds
- Operator passwords
- Device commissioning secrets (after enrollment)
- Master or tenant signing keys

Violations must be treated as a security incident: rotate all affected material, audit access logs for the period, and notify the affected tenant admin.

---

## IndexedDB security requirements

1. **`operatorSession.refreshTokenCiphertext`**: AES-256-GCM encrypted using a non-extractable `CryptoKey` derived from device-bound material (e.g., WebAuthn PRF extension, or a key stored in the system keystore). The raw refresh token must never appear in IndexedDB or any other persistent store.
2. **Database-level access**: IndexedDB stores must be opened with the correct origin and scheme. The application must validate that it is running on the correct origin before reading or writing any sensitive store.
3. **Clear on logout**: on operator logout or tenant switch, all tenant-scoped stores must be cleared for the departing tenant. Use `IDBObjectStore.clear()` rather than origin-level `indexedDB.deleteDatabase()` to avoid disrupting other tenants sharing the app.
4. **No cross-origin sharing**: the app must not use `postMessage` or `BroadcastChannel` to share IndexedDB contents with untrusted origins.

---

## Tenant data isolation

Every row in every business table carries `tenant_id`. The API layer must enforce:

1. Extract `tenantId` from the verified access token only.
2. Append `WHERE tenant_id = $tenantId` (or equivalent) to every query.
3. Never accept `tenantId` from the request body or query string as an authoritative scope.
4. Log any request where the token `tenantId` does not match a path parameter `tenantId` as a `cross_tenant_attempt` security event.

---

## Backup and export security

- Database backups must be encrypted with a separate backup key (not the application key).
- Exports (e.g., CSV reconciliation reports) must be scoped to the requesting tenant and must not include PII beyond what the requesting role is permitted to view.
- Export files must not be served via a publicly guessable URL. Use signed short-TTL presigned URLs.

---

## Cross-references

- Data Spec §5: [Multitenancy, Auth & Local-first Storage](../data-spec/5_multitenancy-auth-local-first.md)
- Security Spec §2: [Authentication & Authorization](2_authentication-authorization.md)
- Security Spec §3: [Cryptographic Controls](3_cryptographic-controls.md)
- Product Spec §5: [Out of Scope](../product-spec/5_out-of-scope.md)
