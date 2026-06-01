# Decorator Pattern

## Purpose

Attach additional responsibilities to an object dynamically by wrapping it in a decorator that implements the same interface. Preferred over subclassing for extending behavior.

## SDD Trigger

- Adding cross-cutting concerns (logging, caching, retry, auth check) to existing services without modifying them.
- Any Security Spec requirement to intercept and validate before a domain operation.
- NestJS interceptors, guards, and middleware are Decorator pattern implementations.

## Code Template (TypeScript - Repository with caching decorator)

```ts
// Spec: Tech Specs §3 - Card storage with caching
// Pattern: Decorator

export class CachedCardRepository implements ICardRepository {
  private cache = new Map<string, Card>();

  constructor(private readonly inner: ICardRepository) {}

  async findByUid(uid: string): Promise<Card | null> {
    if (this.cache.has(uid)) return this.cache.get(uid)!;
    const card = await this.inner.findByUid(uid);
    if (card) this.cache.set(uid, card);
    return card;
  }

  async save(card: Card): Promise<void> {
    await this.inner.save(card);
    this.cache.set(card.uid, card); // invalidate/update cache
  }
}

// Usage - compose at composition root
const cardRepo: ICardRepository = new CachedCardRepository(new PrismaCardRepository(prisma));
```

## Code Template (TypeScript - Logging decorator)

```ts
// Pattern: Decorator - logging

export class LoggingCardRepository implements ICardRepository {
  constructor(
    private readonly inner: ICardRepository,
    private readonly logger: ILogger,
  ) {}

  async findByUid(uid: string): Promise<Card | null> {
    this.logger.debug(`findByUid: ${uid}`);
    const result = await this.inner.findByUid(uid);
    this.logger.debug(`findByUid result: ${result?.status ?? "not found"}`);
    return result;
  }

  async save(card: Card): Promise<void> {
    this.logger.info(`Saving card ${card.uid} status=${card.status}`);
    await this.inner.save(card);
  }
}
```

## Stacking Decorators

```ts
const cardRepo: ICardRepository = new LoggingCardRepository(
  new CachedCardRepository(new PrismaCardRepository(prisma)),
  logger,
);
```

## Antipatterns

- Decorator that changes the behavior contract (violates Liskov).
- Deeply nested decorators with no clear order - document the composition order.
