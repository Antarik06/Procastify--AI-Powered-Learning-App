# Architecture

Procastify is a React + Vite single-page app. There is no URL router — the shell
renders one screen at a time based on navigation state.

```
App.tsx                 re-export of app/App (index.html expects this path)
app/                    application shell
  App.tsx               pre-auth vs authenticated split
  AppRouter.tsx         view -> screen mapping, supplies props from providers
  routes.ts             lazy imports, one entry per screen
  components/           Sidebar, AppShell, GuestBanner
  providers/            Session, Workspace, Navigation, AppProviders
  navigation/           nav items, role home view
  hooks/                shell-level hooks (study tracking)
components/ui/          design system — the only place raw styling lives
features/<feature>/     one folder per product area
  <Name>Page.tsx        screen entry
  components/           presentational pieces
  hooks/                stateful logic
  utils/                pure helpers
  services/             feature-owned data access
  types.ts              feature types
  index.ts              public surface (barrel)
services/               cross-feature infrastructure
  ai/                   Gemini calls, split by domain
  storage/              persistence, one repository per domain
lib/                    framework-free helpers (cn, dates, formatting, ids)
types/                  domain types, split by area, re-exported from types/index
```

## Rules of thumb

- **UI comes from `components/ui`.** Buttons, cards, inputs, modals, empty
  states and toasts are all there. A feature should rarely write raw
  `className` soup; if a pattern repeats, promote it to the kit.
- **Features don't import each other's internals.** Import from the feature
  barrel (`features/notes`), not a deep path.
- **State lives in providers, not in `App`.** `useSession` (who), `useWorkspace`
  (their content), `useNavigation` (what's on screen).
- **Services are split by domain.** `services/geminiService` and
  `services/storageService` are thin re-exports kept for existing call sites;
  new code should import `services/ai/quiz`, `services/storage/notes`, etc.
- **Storage session state** (`currentUserId`, `isGuestMode`) lives in
  `services/storage/session.ts` and is read through ES live bindings. Only that
  module assigns it.

## Data flow

```
Firebase auth ─► SessionProvider ─► WorkspaceProvider ─► AppRouter ─► screens
                                       │
                                       └─ services/storage (Firestore or localStorage)
```

Guest mode swaps Firestore for localStorage inside the storage layer, so no
feature code branches on it.

## Adding a screen

1. Build it under `features/<name>/` with a barrel.
2. Add a lazy import in `app/routes.ts`.
3. Add a `case` in `app/AppRouter.tsx`.
4. If it needs a sidebar entry, add it to `app/navigation/navItems.ts`.
