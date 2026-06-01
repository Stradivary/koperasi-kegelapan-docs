# Adapter Pattern

## Purpose

Convert the interface of a class into another interface that clients expect. Allows incompatible interfaces to work together without modifying either.

## SDD Trigger

- Integrating a third-party SDK/library that doesn't match the domain interface.
- Wrapping a legacy API response into the Data Spec entity shape.
- Any Tech Spec interface that infrastructure must implement without the domain knowing the underlying library.

## Code Template (TypeScript)

```ts
// Spec: Tech Specs §4 - Cryptography interface
// Pattern: Adapter

// Domain-facing interface (owned by domain layer)
export interface ICryptoProvider {
  encrypt(data: Uint8Array, key: CryptoKey): Promise<Uint8Array>;
  decrypt(data: Uint8Array, key: CryptoKey): Promise<Uint8Array>;
}

// Third-party: Web Crypto API (different interface)
// Adapter wraps it to match ICryptoProvider
export class WebCryptoAdapter implements ICryptoProvider {
  async encrypt(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    // Spec: ADR §2 - AES-GCM: prepend IV to ciphertext
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);
    return result;
  }

  async decrypt(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new Uint8Array(decrypted);
  }
}
```

## When to Use vs. Facade

| Pattern | Use When                                                              |
| ------- | --------------------------------------------------------------------- |
| Adapter | You need to match a specific interface contract                       |
| Facade  | You want to simplify a complex subsystem without a required interface |

## Antipatterns

- Adapter that leaks third-party types into the domain (defeats the purpose).
- Adapter with business logic - keep it as a pure interface translation layer.
