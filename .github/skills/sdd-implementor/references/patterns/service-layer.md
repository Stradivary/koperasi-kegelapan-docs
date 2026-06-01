# Service Layer Pattern

## Purpose

Defines an application's boundary with a set of available operations. Coordinates domain objects and infrastructure to fulfil use cases. Acts as the transaction boundary and the entry point for controllers/handlers.

## SDD Trigger

- Any Tech Spec behavior that requires coordinating multiple domain entities or repositories.
- When CQRS feels like overkill but you still need business logic separated from controllers.

## Relationship to Other Patterns

```
Controller (HTTP adapter)
    ↓ calls
Service Layer          ← orchestrates domain logic
    ↓ uses
Domain Entities + Repositories
```

## Layer Mapping from SDD

| Spec Layer                | Service Layer Role                        |
| ------------------------- | ----------------------------------------- |
| Tech Spec behaviors       | One service method per behavior           |
| API Spec endpoints        | One controller method → one service call  |
| Data Spec                 | Service uses repository interfaces        |
| Security Spec constraints | Service enforces policies before mutating |

## Folder Structure (NestJS)

```
src/modules/<feature>/
  application/
    card.service.ts          # Service layer
  infrastructure/
    card.controller.ts       # Calls service
    prisma-card.repository.ts
  domain/
    card.entity.ts
    i-card-repository.ts
```

## Code Template (TypeScript - NestJS)

```ts
// Spec: Tech Specs §6 - Session state rules
// Pattern: Service Layer

@Injectable()
export class CardService {
  constructor(
    private readonly cardRepo: ICardRepository,
    private readonly logRepo: ITransactionLogRepository,
    private readonly policy: ILimitPolicy,
  ) {}

  async processPayment(cardUid: string, amount: number, terminalId: string): Promise<void> {
    const card = await this.cardRepo.findByUid(cardUid);
    if (!card) throw new CardNotFoundError(cardUid);

    // Spec: Security Spec - balance ceiling enforcement
    this.policy.enforce(card, amount);

    // Spec: System Design §4 - state machine: active required
    card.debit(amount);

    await this.cardRepo.save(card);

    // Spec: System Design §6 - log chain append
    await this.logRepo.append(TransactionLog.create(card, amount, terminalId));
  }
}
```

## Rules

- Service methods map 1:1 to Tech Spec behaviors - one method per operation.
- Services must not contain HTTP-specific logic (no `Request`, `Response` objects).
- Services are the transaction boundary - wrap the entire operation in a DB transaction.
- Services call domain entities for business rules, never raw SQL.

## Antipatterns

- "Anemic service" that only shuffles data with no real domain logic.
- Service that returns HTTP status codes (that's the controller's job).
- Service that directly queries the DB instead of using repository interfaces.
