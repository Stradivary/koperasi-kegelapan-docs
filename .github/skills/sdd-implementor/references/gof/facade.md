# Facade Pattern

## Purpose

Provide a simplified interface to a complex subsystem. Reduces coupling between clients and the internals of the subsystem.

## SDD Trigger

- A feature that touches multiple subsystems (crypto + NFC + log) - wrap in one `CardOperationFacade`.
- Frontend: a single `useCardActions` hook that internally coordinates React Query mutations and Zustand store updates.
- Any Tech Spec behavior that says "the client calls one operation, but multiple internal steps happen."

## Code Template (TypeScript - Backend service facade)

```ts
// Spec: Tech Specs §6 - Payment session flow
// Pattern: Facade

export class PaymentFacade {
  constructor(
    private readonly cardService: CardService,
    private readonly sessionService: SessionService,
    private readonly logService: TransactionLogService,
    private readonly cryptoService: CryptoService,
  ) {}

  // Single entry point for a complex multi-step operation
  async processOfflinePayment(
    encryptedPayload: Uint8Array,
    sessionToken: string,
  ): Promise<PaymentResult> {
    // Spec: System Design §12 - Key trust model
    const payload = await this.cryptoService.decrypt(encryptedPayload);

    // Spec: Tech Specs §6 - Session grant validation
    const session = await this.sessionService.validate(sessionToken);

    // Spec: System Design §4 - State machine: debit
    await this.cardService.processPayment(session.cardUid, payload.amount);

    // Spec: System Design §6 - Log chain append
    await this.logService.append(session.cardUid, payload);

    return { success: true, balance: await this.cardService.getBalance(session.cardUid) };
  }
}
```

## Code Template (TypeScript - Frontend hook facade)

```ts
// Pattern: Facade - frontend hook

export function useCardActions(uid: string) {
  const blockMutation = useBlockCardMutation(cardRepository);
  const { setNotification } = useNotificationStore();

  const blockCard = async (reason: string) => {
    await blockMutation.mutateAsync({ uid, reason });
    setNotification({ type: "success", message: "Card blocked successfully" });
  };

  return { blockCard, isBlocking: blockMutation.isPending };
}
```

## Rules

- Facade must not contain business logic - it orchestrates, it doesn't decide.
- Facade can be the single entry point referenced by controllers/components.
- Keep subsystems independently testable - don't merge them into the Facade class.

## Antipatterns

- Facade that grows into a "God class" containing business rules.
- Using Facade to hide design problems instead of fixing them.
