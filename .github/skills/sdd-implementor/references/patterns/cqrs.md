# CQRS - Command Query Responsibility Segregation

## Purpose

Separates write operations (Commands - mutate state) from read operations (Queries - return data). This prevents read complexity from polluting write logic and vice versa.

## Layer Mapping from SDD

| Spec Layer               | CQRS Role                                                       |
| ------------------------ | --------------------------------------------------------------- |
| API Spec POST/PUT/DELETE | Commands                                                        |
| API Spec GET             | Queries                                                         |
| Tech Specs §behaviors    | Command/Query handler logic                                     |
| Data Spec                | Write model (normalized) + Read model (denormalized/projection) |

## Folder Structure

```
application/
  commands/
    process_payment_command.ts
    process_payment_handler.ts
  queries/
    get_card_balance_query.ts
    get_card_balance_handler.ts
  read_models/
    card_balance_view.ts
```

## Command Template

```ts
// Spec: API Spec §5 POST /cards/{uid}/payment
// Pattern: CQRS - Command + Handler

export class ProcessPaymentCommand {
  constructor(
    public readonly cardUid: string,
    public readonly amount: number,
    public readonly terminalId: string,
  ) {}
}

export class ProcessPaymentHandler {
  constructor(
    private readonly cardRepo: ICardRepository,
    private readonly logRepo: ITransactionLogRepository,
  ) {}

  async execute(cmd: ProcessPaymentCommand): Promise<void> {
    const card = await this.cardRepo.findByUid(cmd.cardUid);
    card.debit(cmd.amount); // domain rule enforced here
    await this.cardRepo.save(card);
    await this.logRepo.append(TransactionLog.from(cmd));
  }
}
```

## Query Template

```ts
// Spec: API Spec §5 GET /cards/{uid}/balance
// Pattern: CQRS - Query + Handler

export class GetCardBalanceQuery {
  constructor(public readonly cardUid: string) {}
}

export class GetCardBalanceHandler {
  constructor(private readonly readDb: IReadDatabase) {}

  async execute(query: GetCardBalanceQuery): Promise<CardBalanceView> {
    return this.readDb.cardBalances.findOne(query.cardUid);
  }
}
```

## Rules

- Command handlers must not return domain data - only success/failure.
- Query handlers must not mutate state.
- Read models can be denormalized projections optimized for display.
- Use event publishing (optional) between write side and read side for eventual consistency.

## Antipatterns

- Command handlers that also return full entity data (breaks separation).
- Queries that trigger side effects.
- Mixing command and query logic in one "service" class.
