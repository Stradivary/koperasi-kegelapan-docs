# State Pattern

## Purpose

Allow an object to alter its behavior when its internal state changes. The object appears to change its class. Eliminates large switch/if-else chains on status fields.

## SDD Trigger

System Design §4 card-state-machine → implement directly as State pattern.

Any spec that defines a state machine diagram or state transition table should become a State pattern implementation.

## Structure

```
Context (Card)
  - state: ICardState
  + handle(event): void

ICardState
  ├── InitialState
  ├── ActiveState
  ├── SuspendedState
  └── BlockedState
```

## Code Template (TypeScript)

```ts
// Spec: System Design §4 - Card state machine
// Pattern: State

export interface ICardState {
  onActivate(card: Card): void;
  onDebit(card: Card, amount: number): void;
  onBlock(card: Card, reason: string): void;
  onSuspend(card: Card): void;
}

export class ActiveState implements ICardState {
  onActivate(card: Card): void {
    throw new InvalidTransitionError("Card is already active");
  }
  onDebit(card: Card, amount: number): void {
    // Spec: Tech Specs §15 - balance deduction rules
    card.balance -= amount;
  }
  onBlock(card: Card, reason: string): void {
    card.setState(new BlockedState(reason));
  }
  onSuspend(card: Card): void {
    card.setState(new SuspendedState());
  }
}

export class BlockedState implements ICardState {
  constructor(private reason: string) {}
  onActivate(_card: Card): void {
    throw new InvalidTransitionError("Blocked card cannot be activated directly");
  }
  onDebit(_card: Card, _amount: number): void {
    throw new CardBlockedError(this.reason);
  }
  onBlock(_card: Card, _reason: string): void {
    /* already blocked */
  }
  onSuspend(_card: Card): void {
    /* no-op or throw */
  }
}

export class Card {
  private state: ICardState = new InitialState();
  balance: number = 0;

  setState(state: ICardState): void {
    this.state = state;
  }
  debit(amount: number): void {
    this.state.onDebit(this, amount);
  }
  block(reason: string): void {
    this.state.onBlock(this, reason);
  }
}
```

## Spec Traceability

Map every state transition in the spec to a method transition in the State class:

| Spec Transition    | State Method              | Source            |
| ------------------ | ------------------------- | ----------------- |
| initial → active   | `InitialState.onActivate` | System Design §4  |
| active → blocked   | `ActiveState.onBlock`     | System Design §15 |
| active → suspended | `ActiveState.onSuspend`   | System Design §11 |

## Antipatterns

- Status enum + switch statement scattered across the codebase (brittle, violates OCP).
- State transitions outside the state objects (breaks encapsulation).
