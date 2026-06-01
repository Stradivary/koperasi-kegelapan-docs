# Command Pattern

## Purpose

Encapsulate a request as an object, allowing parameterisation, queuing, logging, and undo/redo of operations.

## SDD Trigger

- CQRS Commands are the Command pattern - every write operation in the API Spec is a Command.
- Undo/redo requirements in Tech Specs.
- Queueing deferred operations (offline payment queue when NFC terminal is disconnected).
- Any spec that says "record what was requested, not just what happened."

## Code Template (TypeScript - CQRS Command object)

```ts
// Spec: API Spec §5 POST /cards/{uid}/payment
// Pattern: Command

export class ProcessPaymentCommand {
  readonly type = "ProcessPayment" as const;

  constructor(
    public readonly cardUid: string,
    public readonly amount: number,
    public readonly terminalId: string,
    public readonly requestedAt: Date = new Date(),
  ) {}
}

export interface ICommandHandler<TCommand> {
  execute(command: TCommand): Promise<void>;
}

export class ProcessPaymentHandler implements ICommandHandler<ProcessPaymentCommand> {
  constructor(
    private readonly cardRepo: ICardRepository,
    private readonly logRepo: ITransactionLogRepository,
    private readonly policy: ILimitPolicy,
  ) {}

  async execute(cmd: ProcessPaymentCommand): Promise<void> {
    const card = await this.cardRepo.findByUid(cmd.cardUid);
    if (!card) throw new CardNotFoundError(cmd.cardUid);

    this.policy.enforce(card, cmd.amount);
    card.debit(cmd.amount);

    await this.cardRepo.save(card);
    await this.logRepo.append(TransactionLog.fromCommand(cmd));
  }
}
```

## Code Template (TypeScript - Offline command queue)

```ts
// Spec: System Design §9 - Write strategy (buffered/offline)
// Pattern: Command + Queue

export class OfflineCommandQueue {
  private queue: ProcessPaymentCommand[] = [];

  enqueue(command: ProcessPaymentCommand): void {
    this.queue.push(command);
  }

  async flush(handler: ICommandHandler<ProcessPaymentCommand>): Promise<void> {
    while (this.queue.length > 0) {
      const cmd = this.queue.shift()!;
      await handler.execute(cmd);
    }
  }
}
```

## Rules

- Commands are immutable value objects - no setters after construction.
- One handler per command type (single responsibility).
- Commands carry all data needed to execute - no hidden dependencies.

## Antipatterns

- Command handler that returns domain data (use Query for reads).
- Mutable command objects that get modified by the handler.
