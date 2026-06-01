# Backend Scaffold Structure

Use this reference when scaffolding a backend feature from SDD specs.

## NestJS (Clean Architecture + CQRS + Repository)

```
src/
  modules/
    <feature>/                              # e.g. cards
      domain/
        entities/
          card.entity.ts                   # Data Spec entity (pure, no ORM)
          card-state.ts                    # State Pattern
        policies/
          balance-ceiling.policy.ts        # Security/Product Spec constraint
          blocked-card.rule.ts
        repositories/
          i-card.repository.ts             # Interface - no framework deps
        events/
          card-activated.event.ts          # Domain event
      application/
        commands/
          activate-card/
            activate-card.command.ts
            activate-card.handler.ts
        queries/
          get-card-balance/
            get-card-balance.query.ts
            get-card-balance.handler.ts
        use-cases/                         # Non-CQRS alternative
          process-payment.use-case.ts
      infrastructure/
        persistence/
          prisma-card.repository.ts        # Implements ICardRepository
          card.mapper.ts                   # Domain ↔ Prisma model
          schemas/
            card.schema.ts
        http/
          card.controller.ts               # API Spec endpoints
          dtos/
            activate-card.dto.ts
            card-response.dto.ts
      card.module.ts
```

## Laravel (MVC + Service Layer + Repository)

```
app/
  Http/
    Controllers/
      CardController.php               # API Spec endpoints
    Requests/
      ActivateCardRequest.php          # Validation - Tech Spec rules
    Resources/
      CardResource.php                 # Response shape - API Spec
  Domain/
    Card/
      Card.php                         # Domain entity (not Eloquent)
      CardStateMachine.php             # State Pattern
      ICardRepository.php
  Services/
    CardService.php                    # Application service
    PaymentService.php
  Policies/
    BalanceCeilingPolicy.php           # Security Spec constraint
  Infrastructure/
    Repositories/
      EloquentCardRepository.php       # Implements ICardRepository
    Models/
      CardModel.php                    # Eloquent model (persistence only)
```

## Spring Boot (Hexagonal + Repository)

```
src/main/java/com/app/
  domain/
    model/
      Card.java
      CardStatus.java
    port/
      in/
        ActivateCardUseCase.java        # Driving port
        ProcessPaymentUseCase.java
      out/
        LoadCardPort.java               # Driven port
        SaveCardPort.java
    service/
      CardService.java                  # Implements driving ports
  adapter/
    in/
      web/
        CardController.java             # API Spec endpoints
        CardRequest.java
        CardResponse.java
    out/
      persistence/
        CardPersistenceAdapter.java     # Implements driven ports
        CardJpaEntity.java
        CardMapper.java
        CardRepository.java             # Spring Data JPA interface
```

## File Header Convention

```java
// Feature: <feature-name>
// Spec:    <layer> §<section> - <claim>
// Pattern: <design pattern>
```

## API Spec → Controller Mapping

For each API Spec endpoint, generate one controller method:

| API Spec Entry             | HTTP Method | Controller Method | Command/Query          |
| -------------------------- | ----------- | ----------------- | ---------------------- |
| POST /cards/{uid}/activate | POST        | `activateCard()`  | `ActivateCardCommand`  |
| GET /cards/{uid}/balance   | GET         | `getBalance()`    | `GetCardBalanceQuery`  |
| POST /session              | POST        | `createSession()` | `CreateSessionCommand` |
| DELETE /session/{id}       | DELETE      | `revokeSession()` | `RevokeSessionCommand` |
