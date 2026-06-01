# Factory / Abstract Factory Pattern

## Purpose

Encapsulate object creation logic. Use when the exact type to instantiate depends on runtime conditions, configuration, or context.

## SDD Trigger

- Multiple card types (standard, admin, merchant) → `CardFactory`
- Multiple crypto providers (AES-GCM, future algorithm) → `CryptoProviderFactory`
- Multiple terminal types → `TerminalFactory`
- Any Data Spec entity with a `type` or `kind` discriminator field.

## Factory Method Template (TypeScript)

```ts
// Spec: System Design §12 - Key trust model
// Pattern: Factory Method

export abstract class CryptoProviderFactory {
  abstract createProvider(keyId: string): ICryptoProvider;

  // Template method
  async encryptPayload(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    const provider = this.createProvider(keyId);
    return provider.encrypt(data);
  }
}

export class AesGcmProviderFactory extends CryptoProviderFactory {
  createProvider(keyId: string): ICryptoProvider {
    // Spec: ADR §2 - AES-GCM
    return new AesGcmProvider(keyId);
  }
}
```

## Static Factory Template (TypeScript)

```ts
// Spec: System Design §4 - Card state machine initial state
// Pattern: Static Factory

export class Card {
  private constructor(
    public readonly uid: string,
    public readonly memberId: string,
    private state: ICardState,
    public balance: number,
  ) {}

  static createNew(uid: string, memberId: string): Card {
    // Spec: Tech Specs §18 - Card initialisation state
    return new Card(uid, memberId, new InitialState(), 0);
  }

  static reconstitute(data: CardPersistenceModel): Card {
    const state = CardStateFactory.fromString(data.status);
    return new Card(data.uid, data.memberId, state, data.balance);
  }
}
```

## Abstract Factory (Multiple Related Objects)

Use when a feature needs a consistent "family" of objects:

```ts
export interface ICardInfrastructureFactory {
  createRepository(): ICardRepository;
  createCryptoProvider(): ICryptoProvider;
  createWriteStrategy(): IWriteStrategy;
}

export class NfcCardInfrastructureFactory implements ICardInfrastructureFactory {
  createRepository() {
    return new NfcCardRepository();
  }
  createCryptoProvider() {
    return new AesGcmProvider();
  }
  createWriteStrategy() {
    return new BufferedWriteStrategy();
  }
}
```

## Antipatterns

- Constructors with boolean flags controlling behavior (`new Card(uid, true, false, 'admin')`).
- Switch/if-else chains outside a factory to decide which class to new up.
