# Hexagonal Architecture (Ports & Adapters)

## Purpose

Isolates the domain from all infrastructure by defining Ports (interfaces) the domain owns, and Adapters (implementations) that plug in from outside. Enables swapping databases, UIs, and frameworks without touching domain logic.

## Concepts

- **Driving ports (in)**: Interfaces the domain exposes for callers (use cases, HTTP controllers call these).
- **Driven ports (out)**: Interfaces the domain requires from infrastructure (repository, email, NFC reader).
- **Adapters (in)**: Translate external input (HTTP, CLI, test) into driving port calls.
- **Adapters (out)**: Implement driven ports using real infrastructure (DB, API, NFC).

## Layer Mapping from SDD

| Spec Layer          | Hexagonal Role                      |
| ------------------- | ----------------------------------- |
| Tech Spec behaviors | Driving ports (use case interfaces) |
| API Spec endpoints  | Driving adapter (HTTP controller)   |
| Data Spec storage   | Driven port (ICardRepository)       |
| DB/NFC/API          | Driven adapter implementations      |
| Security Spec       | Domain policies inside the hexagon  |

## Folder Structure (Java/Spring)

```
domain/
  model/Card.java
  port/
    in/ActivateCardUseCase.java      # Driving port
    out/SaveCardPort.java            # Driven port
  service/CardService.java           # Implements driving port

adapter/
  in/web/CardController.java         # Driving adapter
  out/persistence/CardPersistenceAdapter.java  # Driven adapter
```

## Rules

- Domain (model + ports + service) has zero framework imports.
- Adapters depend on domain - never the reverse.
- Each driven port should map to one Tech Spec interface definition.
