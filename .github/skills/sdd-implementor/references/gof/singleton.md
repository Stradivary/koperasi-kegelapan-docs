# Singleton Pattern

## Purpose

Ensure a class has only one instance and provide a global access point to it. Use sparingly - most use cases in modern TypeScript are better served by DI containers or module-level exports.

## SDD Trigger

- A shared resource that must be initialised once: DB connection pool, config loader, logger.
- Composition root bindings that should resolve to the same instance across the app.

## Code Template (TypeScript - module singleton, preferred)

```ts
// Spec: Infrastructure - single DB connection pool
// Pattern: Singleton (module export - preferred in Node.js)

import { PrismaClient } from "@prisma/client";

// Node.js module system guarantees single instance per process
export const prisma = new PrismaClient();
```

## Code Template (TypeScript - class singleton, when needed)

```ts
// Pattern: Singleton (class-based)

export class ConfigService {
  private static instance: ConfigService | null = null;
  private readonly config: Record<string, string>;

  private constructor() {
    // Load once from environment
    this.config = {
      apiKey: process.env.API_KEY ?? "",
      dbUrl: process.env.DATABASE_URL ?? "",
    };
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  get(key: string): string {
    return this.config[key] ?? "";
  }
}
```

## Rules

- Prefer module-level singletons (`export const x = new X()`) over class-based in Node.js/TypeScript.
- In NestJS, use `@Injectable()` with default scope - the DI container handles singleton lifecycle.
- Never use Singleton for objects with mutable state shared across requests in a web server (race conditions).
- In React, use React Context or Zustand store instead of class singletons.

## Antipatterns

- Singletons with mutable global state that causes test pollution.
- Using Singleton as a substitute for proper dependency injection.
