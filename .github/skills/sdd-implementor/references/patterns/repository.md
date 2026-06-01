# Repository Pattern

## Purpose

Abstracts data access behind an interface. The domain never knows whether data comes from a database, an NFC card, an HTTP API, or a cache.

## Layer Mapping from SDD

| Spec Layer                 | Repository Role                             |
| -------------------------- | ------------------------------------------- |
| Data Spec §storage         | Defines fields the repo reads/writes        |
| API Spec §endpoints        | Remote repository implementation uses these |
| Tech Specs §interfaces     | Defines the IRepository interface contract  |
| System Design §trust model | Determines which repo is authoritative      |

## Interface Template

```ts
// Spec: Tech Specs §3 - Card storage model
// Pattern: Repository interface

export interface ICardRepository {
  findByUid(uid: string): Promise<Card | null>;
  save(card: Card): Promise<void>;
  listByMemberId(memberId: string): Promise<Card[]>;
}
```

## Implementation Template (Prisma)

```ts
// Spec: Tech Specs §3 - Card storage model
// Pattern: Repository implementation (Prisma)

export class PrismaCardRepository implements ICardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUid(uid: string): Promise<Card | null> {
    const row = await this.prisma.card.findUnique({ where: { uid } });
    return row ? CardMapper.toDomain(row) : null;
  }

  async save(card: Card): Promise<void> {
    await this.prisma.card.upsert({
      where: { uid: card.uid },
      update: CardMapper.toPersistence(card),
      create: CardMapper.toPersistence(card),
    });
  }
}
```

## Unit of Work (Optional)

Use when multiple repositories must commit atomically (e.g., payment + log entry):

```ts
export interface IUnitOfWork {
  cards: ICardRepository;
  transactions: ITransactionRepository;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
```

## Rules

- Repository interface lives in the **domain layer** - zero framework imports.
- Implementation lives in the **infrastructure layer**.
- Never expose raw ORM objects (Prisma models, ActiveRecord) to the domain.
- Use a Mapper class to convert between persistence models and domain entities.

## Antipatterns

- Leaking SQL/ORM queries into use cases or controllers.
- One giant "God repository" with 20+ methods.
- Returning `null` without documenting the null contract in the interface.
