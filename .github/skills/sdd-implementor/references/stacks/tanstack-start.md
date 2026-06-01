# TanStack Start - Full-Stack React Stack

## Overview

TanStack Start is a full-stack React framework built on **TanStack Router** with SSR, streaming, and server functions. It is type-safe end-to-end: routes, loaders, server functions, and client state are all fully typed.

## Core Libraries

| Library                         | Role                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------- |
| TanStack Router                 | File-based routing, type-safe params, search params                           |
| TanStack Query (React Query)    | Server state - data fetching, caching, mutations                              |
| TanStack Start Server Functions | `createServerFn` - RPC-style server actions, replaces REST for internal calls |
| Zustand / Jotai                 | Client UI state (modals, selections, form steps)                              |
| Zod                             | Schema validation - request/response DTOs from API Spec                       |
| Vite                            | Build tooling                                                                 |

## Pattern Stack (SDD-aligned)

```
Product Spec user flows     → Route files (src/routes/)
API Spec endpoints          → Server Functions (createServerFn) or API routes
Tech Spec behaviors         → React Query hooks + Repository layer
Data Spec entities          → TypeScript interfaces + Zod schemas
Security Spec constraints   → Middleware functions + server function guards
System Design state machine → State Pattern helpers in utils/
```

## Folder Structure

```
src/
  routes/
    __root.tsx                        # Root layout, global providers
    _authenticated.tsx                # Auth guard layout route
    _authenticated/
      cards/
        index.tsx                     # /cards - CardListPage
        $uid.tsx                      # /cards/:uid - CardDetailPage
      session/
        index.tsx                     # /session - SessionPage
  server/
    functions/
      card.functions.ts               # createServerFn - card operations
      session.functions.ts            # createServerFn - session operations
    repositories/
      ICardRepository.ts              # Interface (shared - importable by server fns)
      prisma-card.repository.ts       # Prisma implementation
    policies/
      balance-ceiling.policy.ts       # Spec: Security Spec constraints
  features/
    cards/
      queries/
        useCardQuery.ts               # React Query - wraps server function
        useCardMutations.ts
      viewmodels/
        useCardViewModel.ts           # Client UI state (MVVM hook)
      components/
        CardDetailPage.tsx            # Route component
        CardStatusBadge.tsx           # Atom/Molecule
  shared/
    components/                       # Atomic Design system atoms/molecules / Shadcn compatible (ui/block/)
    types/
      card.types.ts                   # Data Spec entity interfaces
      api.types.ts
    schemas/
      card.schema.ts                  # Zod schemas - validate at boundary
  di/
    container.ts                      # Composition root
```

## Server Function Template

```ts
// Spec: API Spec §5 POST /cards/{uid}/payment
// Pattern: TanStack Start - Server Function (replaces REST controller)

import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { cardRepository } from "../../di/container";
import { BalanceCeilingPolicy } from "../policies/balance-ceiling.policy";

const ProcessPaymentInput = z.object({
  cardUid: z.string(),
  amount: z.number().positive(),
  terminalId: z.string(),
});

export const processPayment = createServerFn({ method: "POST" })
  .validator(ProcessPaymentInput)
  .handler(async ({ data }) => {
    // Spec: Security Spec - enforce limit policy
    const policy = new BalanceCeilingPolicy();
    const card = await cardRepository.findByUid(data.cardUid);
    if (!card) throw new Error("Card not found");

    policy.enforce(card, data.amount);
    card.debit(data.amount);
    await cardRepository.save(card);

    return { success: true, newBalance: card.balance };
  });
```

## Route Loader Template

```tsx
// Spec: Product Spec §2 - card detail user flow
// Pattern: TanStack Start - Route with loader

import { createFileRoute } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { getCard } from "../../server/functions/card.functions";

const cardQueryOptions = (uid: string) =>
  queryOptions({
    queryKey: ["cards", uid],
    queryFn: () => getCard({ data: { uid } }),
    staleTime: 30_000, // Spec: System Design §17 - time validation assumptions
  });

export const Route = createFileRoute("/_authenticated/cards/$uid")({
  loader: ({ context: { queryClient }, params: { uid } }) =>
    queryClient.ensureQueryData(cardQueryOptions(uid)),

  component: CardDetailPage,
});

function CardDetailPage() {
  const { uid } = Route.useParams();
  const card = Route.useLoaderData(); // SSR-prefetched, no loading state needed

  return <CardDetail card={card} uid={uid} />;
}
```

## React Query Hook (wrapping server function)

```ts
// Spec: API Spec §5 GET /cards/{uid}
// Pattern: TanStack Start - React Query wrapping server function

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCard, processPayment } from "../../server/functions/card.functions";

export function useCardQuery(uid: string) {
  return useQuery({
    queryKey: ["cards", uid],
    queryFn: () => getCard({ data: { uid } }),
    staleTime: 30_000,
  });
}

export function useProcessPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: processPayment,
    onSuccess: (_, { data: { cardUid } }) => {
      queryClient.invalidateQueries({ queryKey: ["cards", cardUid] });
    },
  });
}
```

## Auth Middleware Template

```ts
// Spec: Security Spec - session validation
// Pattern: TanStack Start - Middleware

import { createMiddleware } from "@tanstack/start";
import { sessionService } from "../../di/container";

export const authMiddleware = createMiddleware().server(async ({ next, context }) => {
  const token = context.request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");

  const session = await sessionService.validate(token);
  return next({ context: { session } });
});

// Apply to server function
export const processPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(ProcessPaymentInput)
  .handler(async ({ data, context }) => {
    // context.session is typed and validated here
  });
```

## Key Differences from Next.js

| Concern          | TanStack Start                          | Next.js                         |
| ---------------- | --------------------------------------- | ------------------------------- |
| Routing          | TanStack Router (type-safe, file-based) | App Router / Pages Router       |
| Server actions   | `createServerFn` (explicit, composable) | Server Actions (`'use server'`) |
| Data fetching    | React Query + loaders                   | `fetch` in Server Components    |
| Type safety      | End-to-end, inferred                    | Partial (needs explicit types)  |
| State management | Zustand / Jotai + React Query           | Zustand / Jotai + React Query   |

## SDD Spec Trace Rules for TanStack Start

- **Route file** = Product Spec user flow entry point. Add spec trace in component comment.
- **Server function** = API Spec endpoint equivalent. Name matches the operation, not the HTTP verb.
- **Loader** = Read path (Query in CQRS terms).
- **Server function (POST/mutation)** = Write path (Command in CQRS terms).
- **Middleware** = Security Spec constraint enforcement point.
- **Zod schema** = Data Spec validation at system boundary.
