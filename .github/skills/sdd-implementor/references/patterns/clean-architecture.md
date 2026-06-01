# Clean Architecture

## Purpose

Organizes code into concentric dependency rings. Inner rings are pure domain logic; outer rings are infrastructure. Dependencies only point inward.

```
[Frameworks & Drivers]  ← outermost (DB, HTTP, UI)
  [Interface Adapters]  ← controllers, presenters, gateways
    [Application Layer] ← use cases
      [Domain Layer]    ← entities, rules ← innermost
```

## Layer Mapping from SDD

| Spec Layer          | Clean Arch Layer                    | Example                                    |
| ------------------- | ----------------------------------- | ------------------------------------------ |
| Data Spec entities  | Domain - Entities                   | `Card`, `Transaction`                      |
| Tech Spec behaviors | Application - Use Cases             | `LoadCardUseCase`, `ProcessPaymentUseCase` |
| API Spec endpoints  | Interface Adapters - Controllers    | `CardController`, `SessionController`      |
| Data Spec storage   | Interface Adapters - Gateways/Repos | `CardRepositoryImpl`                       |
| Infrastructure      | Frameworks & Drivers                | NestJS, Prisma, HTTP client                |
| Security Spec rules | Domain - Policies                   | `BalanceCeilingPolicy`, `BlockedCardRule`  |

## Folder Structure

```
src/
  domain/
    entities/
      card.ts
    policies/
      balance_ceiling_policy.ts
    repositories/
      i_card_repository.ts     # Interface only - no imports from outer rings
  application/
    use_cases/
      load_card_use_case.ts
      process_payment_use_case.ts
  adapters/
    controllers/
      card_controller.ts
    repositories/
      card_repository_impl.ts
    presenters/
      card_presenter.ts
  infrastructure/
    database/
      prisma_card_repository.ts
    http/
      card_routes.ts
```

## Dependency Rule

```
infrastructure → adapters → application → domain
NEVER: domain → application, application → adapters, etc.
```

## Code Template (TypeScript / NestJS)

```ts
// Spec: Tech Specs §3 - Card storage model
// Pattern: Clean Architecture - Use Case

export class LoadCardUseCase {
  constructor(private readonly repo: ICardRepository) {}

  async execute(uid: string): Promise<Card> {
    const card = await this.repo.findByUid(uid);
    if (!card) throw new CardNotFoundError(uid);
    return card;
  }
}
```

## Antipatterns to Avoid

- Importing Prisma/TypeORM inside a Use Case or Entity.
- Putting business rules in Controllers.
- Skipping the interface for repositories (breaks testability and DIP).
