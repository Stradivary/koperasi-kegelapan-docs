# Observer Pattern

## Purpose

Define a one-to-many dependency so that when one object changes state, all dependents are notified automatically. Also called: Event, Listener, Pub/Sub.

## SDD Trigger

- Tech Specs §transaction-log → append log entry on every state change.
- System Design §hash-chain-log → log must be updated on every transaction.
- Any spec requirement that says "when X happens, Y and Z must also occur" → Observer.

## Structure

```
IObserver
  + update(event: DomainEvent): void

EventEmitter / Subject
  + subscribe(observer: IObserver): void
  + notify(event: DomainEvent): void

ConcreteObserver (LogAppender, AuditRecorder, NotificationSender)
```

## Code Template (TypeScript)

```ts
// Spec: System Design §6 - Log chain model
// Pattern: Observer (Domain Events)

export interface IDomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

export class TransactionLoggedEvent {
  constructor(
    public readonly cardUid: string,
    public readonly amount: number,
    public readonly timestamp: Date,
  ) {}
}

export class HashChainLogHandler implements IDomainEventHandler<TransactionLoggedEvent> {
  constructor(private readonly logRepo: ITransactionLogRepository) {}

  async handle(event: TransactionLoggedEvent): Promise<void> {
    // Spec: ADR §5 - Hash chain log entry
    const previous = await this.logRepo.getLatest(event.cardUid);
    const entry = TransactionLog.create(event, previous?.hash ?? null);
    await this.logRepo.append(entry);
  }
}
```

## Framework-Specific Notes

- **NestJS (backend)**: Use `EventEmitter2` or CQRS `EventBus`.
- **React (frontend)**: Use Zustand subscriptions, Redux middleware, or custom `EventEmitter` utilities.
- **Domain Events**: Preferred over direct calls - keeps domain decoupled from side effects.

## Antipatterns

- Calling log/audit methods directly inside domain entities (tight coupling).
- Synchronous observer chains that can fail silently.
- Observers that modify the subject's state (creates cycles).
