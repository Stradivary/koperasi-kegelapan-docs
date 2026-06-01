# Proxy Pattern

## Purpose

Provide a surrogate or placeholder for another object to control access to it. Common uses: access control, lazy initialisation, logging, and remote proxies.

## SDD Trigger

- Security Spec - access control before domain operations (auth guard proxy).
- Lazy loading expensive resources (NFC reader connection, large config).
- Any Tech Spec that says "only authorised roles may perform X" - implement as Proxy around the real service.

## Code Template (TypeScript - Auth guard proxy)

```ts
// Spec: Security Spec - role-based access control
// Pattern: Proxy

export class AuthorizedCardRepository implements ICardRepository {
  constructor(
    private readonly inner: ICardRepository,
    private readonly authContext: IAuthContext,
  ) {}

  async findByUid(uid: string): Promise<Card | null> {
    // Spec: Tech Specs §13 - client roles
    if (!this.authContext.hasPermission("card:read")) {
      throw new ForbiddenError("Insufficient permissions to read card");
    }
    return this.inner.findByUid(uid);
  }

  async save(card: Card): Promise<void> {
    if (!this.authContext.hasPermission("card:write")) {
      throw new ForbiddenError("Insufficient permissions to write card");
    }
    return this.inner.save(card);
  }
}
```

## Code Template (TypeScript - Lazy proxy)

```ts
// Pattern: Proxy - lazy initialisation

export class LazyNfcReaderProxy implements INfcReader {
  private reader: NfcReader | null = null;

  private getReader(): NfcReader {
    if (!this.reader) {
      this.reader = new NfcReader(); // expensive initialisation deferred
    }
    return this.reader;
  }

  async readCard(uid: string): Promise<CardData> {
    return this.getReader().readCard(uid);
  }
}
```

## When to Use vs. Decorator

| Pattern   | Use When                                                |
| --------- | ------------------------------------------------------- |
| Proxy     | Controlling access to or lifecycle of the real object   |
| Decorator | Adding behavior/responsibilities without access control |

## Antipatterns

- Proxy that silently swallows permission errors instead of throwing.
- Proxy with business logic - keep it as a pure access control layer.
