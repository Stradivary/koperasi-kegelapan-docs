# Event Sourcing

## Purpose

Instead of storing only the current state, store every state-changing **event** in an append-only log. Current state is derived by replaying events. Provides full audit history and enables temporal queries.

## SDD Trigger

- System Design §6 - log chain model → the hash-chain transaction log is effectively an event store.
- ADR §5 - hash-chain log → each entry is an immutable domain event.
- Any spec requirement for full audit trail, undo, or replay.

## Concepts

```
Event      → Immutable fact: "CardDebited { uid, amount, timestamp }"
Aggregate  → Domain object that applies events to rebuild state (Card)
Event Store → Append-only log of all events (IEventStore)
Projection → Read model built by processing event stream
```

## Layer Mapping from SDD

| Spec Layer                     | Event Sourcing Role                         |
| ------------------------------ | ------------------------------------------- |
| System Design §6 log chain     | Event Store (append-only)                   |
| Tech Specs §14 transaction log | Event schema / format                       |
| Data Spec storage              | EventStore persistence adapter              |
| System Design §4 state machine | Aggregate state rebuilt by replaying events |
| API Spec GET endpoints         | Projections / read models                   |

## Code Template (TypeScript - NestJS backend)

```ts
// Spec: System Design §6 - Log chain model
// Pattern: Event Sourcing

// Domain event
export class CardDebitedEvent {
  readonly type = "CardDebited" as const;
  constructor(
    public readonly cardUid: string,
    public readonly amount: number,
    public readonly terminalId: string,
    public readonly timestamp: Date,
    public readonly previousHash: string | null,
  ) {}
}

// Aggregate
export class Card {
  uid!: string;
  balance!: number;
  status!: CardStatus;
  private uncommittedEvents: DomainEvent[] = [];

  static reconstitute(events: DomainEvent[]): Card {
    const card = new Card();
    events.forEach((e) => card.apply(e));
    return card;
  }

  debit(amount: number, terminalId: string): void {
    // Spec: Tech Specs §9 - balance ceiling check before recording
    if (this.balance < amount) throw new InsufficientBalanceError();
    this.record(new CardDebitedEvent(this.uid, amount, terminalId, new Date(), null));
  }

  private record(event: DomainEvent): void {
    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  private apply(event: DomainEvent): void {
    if (event.type === "CardDebited") {
      this.balance -= (event as CardDebitedEvent).amount;
    }
    // ... other event types
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }
}

// Event store interface (driven port)
export interface IEventStore {
  append(streamId: string, events: DomainEvent[]): Promise<void>;
  load(streamId: string): Promise<DomainEvent[]>;
}
```

## Rules

- Events are **immutable** - never update or delete an event.
- Aggregate must rebuild from events (`reconstitute`) - no direct field assignment from DB rows.
- Separate the write side (event store) from the read side (projections) - combine with CQRS.
- Event schema changes require versioned migration strategies (upcasting).

## Antipatterns

- Storing mutable state AND events (two sources of truth).
- Using Event Sourcing for simple CRUD with no audit requirements (over-engineering - YAGNI).
- Replaying all events on every request without snapshotting for large streams.
