# Atomic Design

## Purpose

Organises UI components into a strict hierarchy from smallest to largest. Encourages reuse, consistency, and a shared design language that maps directly from Product Spec user flows.

## Hierarchy

```
Atoms        → Smallest indivisible UI elements (Button, Badge, Input, Icon)
Molecules    → Simple groups of atoms (FormField, CardStatus, SearchBar)
Organisms    → Complex sections composed of molecules (CardList, NavBar, PaymentForm)
Templates    → Page layouts - no real data, only structure
Pages        → Templates with real data injected (connected to ViewModel / React Query)
```

## Layer Mapping from SDD

| Spec Layer              | Atomic Layer         | Example                                     |
| ----------------------- | -------------------- | ------------------------------------------- |
| Design system tokens    | Atoms                | `Button.tsx`, `Badge.tsx`, `Input.tsx`      |
| Product Spec user flows | Organisms / Pages    | `CardDetailPage.tsx`, `PaymentForm.tsx`     |
| Tech Spec UI states     | Molecules            | `CardStatusBadge.tsx`, `BalanceDisplay.tsx` |
| API Spec response shape | Pages (data binding) | Connects React Query to Template            |

## Folder Structure (React + TypeScript)

```
src/
  shared/
    components/
      atoms/
        Button.tsx
        Badge.tsx
        Input.tsx
        Spinner.tsx
      molecules/
        FormField.tsx
        CardStatusBadge.tsx
        BalanceDisplay.tsx
        AlertBanner.tsx
      organisms/
        CardList.tsx
        PaymentForm.tsx
        NavigationBar.tsx
  features/<feature>/
    components/
      CardDetailPage.tsx        # Page - connects data to template
      CardDetailTemplate.tsx    # Template - layout, no data
      CardSummaryCard.tsx       # Organism
```

## Component Rules

- **Atoms** - zero business logic, zero API calls, accept only primitive props.
- **Molecules** - composed of atoms, may have local UI state (open/closed), no async.
- **Organisms** - may receive complex typed props or subscribe to a ViewModel hook; no direct API calls.
- **Pages** - the only layer that calls `useCardViewModel` or `useCardQuery` hooks.
- All components must be typed with explicit `interface Props` - no implicit `any`.

## Code Template (Atom)

```tsx
// Spec: Product Spec §2 - card status display
// Pattern: Atomic Design - Atom

interface BadgeProps {
  label: string;
  variant: "active" | "suspended" | "blocked" | "initial";
}

export function StatusBadge({ label, variant }: BadgeProps) {
  const colorMap: Record<BadgeProps["variant"], string> = {
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    blocked: "bg-red-100 text-red-800",
    initial: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[variant]}`}>{label}</span>
  );
}
```

## Code Template (Page - data binding)

```tsx
// Spec: Product Spec §2 - card detail user flow
// Pattern: Atomic Design - Page

export function CardDetailPage({ uid }: { uid: string }) {
  const { data: card, isLoading, error } = useCardQuery(uid, cardRepository);

  if (isLoading) return <Spinner />;
  if (error) return <AlertBanner message="Failed to load card" />;

  return <CardDetailTemplate card={card} />;
}
```

## Antipatterns

- Atoms that call `fetch` or import from `react-query`.
- Organisms that contain routing or page-level side effects.
- Props drilling more than 2 levels deep - lift to ViewModel or Context instead.
