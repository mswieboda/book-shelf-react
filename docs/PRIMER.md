# React architecture primer (2026 edition)

This is a cheat sheet for interviews. Skim it before you start, then come back when a milestone points you here. Questions to test yourself are at the bottom.

---

## 1. The big idea: there are several kinds of state

Most "which state library should I use?" debates go away once you notice that apps hold **several different kinds of state**, and each has a natural home.

| Kind | Examples (in this app) | Where it lives | Tool |
|---|---|---|---|
| **Server state** | the shelf, a book's details, search results | the backend; you hold a *cache* of it | **TanStack Query** (or RTK Query / SWR / framework loaders) |
| **URL state** | current page, `?status=reading`, `?q=dune`, `?sort=title` | the address bar | the router: `useSearchParams`, `useParams` |
| **Local UI state** | is this dropdown open, a text input's draft value | one component | `useState` / `useReducer` |
| **Shared client state** | theme, grid/list view preference, multi-select | the browser only, needed by distant components | **Context** (rarely changes) or **Zustand** (changes often, or many consumers) |
| **Form state** | the notes and rating being edited | the form | uncontrolled inputs + `FormData` / `useActionState`, or controlled inputs, or react-hook-form for big forms |

Two habits that follow from the table:
- **Server data does not belong in a global store.** In 2018 people fetched data in a Redux thunk and put it in the store. Today server data sits in a query cache that handles caching, deduping, refetching, and invalidation for you. Your global client store ends up small, often nonexistent.
- **Derive, don't duplicate.** A filtered or sorted list, a count, or "is this book already on my shelf?" should be computed during render from existing state. Don't keep a copy in `useState` and try to keep it in sync with an effect.

---

## 2. Getting data from a server

From most to least recommended for a new app in 2026:

1. **Framework data loading.** Next.js App Router (React Server Components), React Router "framework mode" or its data loaders, TanStack Start/Router loaders. Data is fetched before or while the route renders, so there are no waterfalls. The React docs recommend starting new apps with a framework. You don't need one for this practice app, but be able to explain what they're for.
2. **TanStack Query in a client-side app.** This is what this repo uses, and it's the most common answer to "how do you fetch data in a React SPA?" You get caching, deduping, background refetch, retries, cancellation, pagination, and optimistic updates.
3. **`useEffect` + `fetch`.** It works, and interviewers still ask you to write it to see whether you understand effects. In real code it's a smell. You'll do it once (Milestone 2) to feel why.

Why plain `useEffect` fetching falls short:
- **Race conditions.** Type "du", then "dune". If the "du" response arrives last, the screen shows the wrong results. You have to handle this yourself with `AbortController` or an `ignore` flag.
- **No cache.** Navigate away and back and it fetches again with a spinner. Two components needing the same data make two requests.
- **Waterfalls.** The parent fetches, renders, then the child starts its fetch.
- **Boilerplate.** Every fetch needs `data` / `error` / `isLoading` state, retries, and refetch-on-focus.
- **StrictMode** runs effects twice in development. That's on purpose: it surfaces missing cleanup.

**Keep an API layer.** Components shouldn't call `fetch` directly. Use a typed `apiFetch()` wrapper that throws on non-2xx responses, plus functions like `getShelf(status)` and `updateBook(id, patch)`. Hooks wrap those (`useShelf`, `useUpdateBook`), and components call the hooks. Each layer can then change on its own, for example swapping the mock for the real Node backend, or swapping the fetching library.

**Map external APIs at the edge.** Convert Open Library's `author_name` / `cover_i` into your own `SearchResult` type in one function. (Validating at that boundary with **zod** is a common upgrade.)

---

## 3. TanStack Query in five minutes

```tsx
// the query key is like a dependency array for the cache
const shelfKeys = {
  all: ['shelf'] as const,
  lists: () => [...shelfKeys.all, 'list'] as const,
  list: (status?: ReadingStatus) => [...shelfKeys.lists(), { status }] as const,
  detail: (id: string) => [...shelfKeys.all, 'detail', id] as const,
}

const { data, isPending, isError, error, isFetching } = useQuery({
  queryKey: shelfKeys.list(status),
  queryFn: ({ signal }) => getShelf(status, { signal }), // signal gives free cancellation
  staleTime: 30_000,
})

const queryClient = useQueryClient()
const addBook = useMutation({
  mutationFn: createShelfBook,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: shelfKeys.all }),
})
```

Vocabulary interviewers like:
- **`staleTime`**: how long data counts as fresh. While fresh, it won't refetch. The default is 0, so data is stale immediately and refetches on mount, window focus, and reconnect.
- **`gcTime`** (formerly `cacheTime`): how long *unused* data stays in memory before garbage collection. The default is 5 minutes.
- **`isPending`** means there's no data yet. **`isFetching`** means a request is in flight, which includes background refetches while old data is still on screen.
- **Invalidation** marks matching queries stale and refetches the active ones. Keys match by prefix, so `['shelf']` invalidates every list and detail.
- **Optimistic update**: change the UI before the server confirms, and roll back if it fails. There are two flavours, cache-based (`onMutate` / `setQueryData`) and UI-based (render `mutation.variables` while pending).
- **`queryOptions()`** helper: defines key + fn + options once and reuses them in `useQuery`, `prefetchQuery`, `useSuspenseQuery`, and route loaders.

---

## 4. Client state: useState → Context → Zustand

Start with the cheapest tool that works and escalate:

1. **`useState` in the component that needs it.**
2. **Lift state up** to the nearest common parent and pass props down. This is fine for a level or two.
3. **Composition** (`children`, passing components as props) often removes prop drilling without any global state.
4. **Context** suits values that change rarely and many components read: theme, current user, locale. The catch is that *every* consumer re-renders when the value changes, and Context has no selectors.
5. **Zustand** (or Jotai) suits shared state that changes often or has many consumers. Components subscribe with a **selector**, `useStore(s => s.view)`, and only re-render when that slice changes. It's tiny, needs no provider, and has middleware like `persist`.
6. **Redux Toolkit** is still everywhere in large and enterprise codebases. Know `configureStore`, `createSlice`, `useSelector` / `useDispatch`, and that **RTK Query** is Redux's answer to TanStack Query. You'd choose it with a large team that wants strict conventions, an existing Redux codebase, or a need for time-travel devtools.

---

## 5. React 19 features worth knowing

- **Actions**: pass an async function to `<form action={fn}>`. React tracks the pending state, and uncontrolled fields reset after it succeeds.
- **`useActionState(fn, initial)`** returns `[state, formAction, isPending]`. It's good for "submit → show server validation error".
- **`useFormStatus()`** lets a child of a `<form>` (say a `SubmitButton`) read `pending` without prop drilling.
- **`useOptimistic(state, updateFn)`** shows an optimistic value while an action is in flight.
- **`use(promise | context)`** reads a promise (suspends until it resolves) or a context, and unlike hooks it may be called conditionally. Promises must be cached or stable; don't create one during render. Libraries handle that for you.
- **`ref` is a normal prop.** `forwardRef` is no longer needed. `<Context>` can be used directly as a provider.
- **React Compiler** (1.0 since late 2025) memoizes automatically, so hand-written `useMemo` / `useCallback` / `memo` are needed much less. Still know what they do and when they mattered (referential equality, expensive computations, memoized children).
- **19.2 additions**: `<Activity>` hides UI while keeping its state, and `useEffectEvent` reads the latest props or state inside an effect without re-running it.
- **Server Components** are concept-only in this Vite SPA. They run on the server, can `await` data directly, ship zero JS, and can't use state or effects. `'use client'` marks the boundary.

---

## 6. Effects: you probably need fewer than you think

Before you write `useEffect`, ask whether it's one of these:
- **Derived from props or state?** Compute it during render.
- **A reaction to a user event?** Put it in the event handler.
- **Resetting state when a prop changes?** Pass a `key` to remount the component.
- **Fetching data?** Use the query library or a route loader.

Effects are for **synchronizing with external systems**: subscriptions, timers, non-React widgets, `document.title`, and so on. Always return a cleanup function when you set something up.

---

## 7. Folder structure

Group by **feature**, not by file type. Shared code moves *up* only once two features need it.

```
src/
  app/                  App.tsx, providers.tsx (QueryClient, Theme), routes, Layout
  features/
    shelf/
      api.ts            getShelf, getBook, createBook, updateBook, deleteBook
      queries.ts        shelfKeys, queryOptions, useShelf / useUpdateBook hooks
      components/       BookCard, ShelfList, StatusFilter, BookDetail…
      types.ts
    search/
      api.ts            Open Library client + mapping to your own types
      components/
      types.ts
  components/ui/        dumb, reusable components: Button, Spinner, ErrorMessage, Cover
  hooks/                generic hooks: useDebouncedValue
  lib/                  apiClient.ts (fetch wrapper + ApiError)
  stores/               Zustand stores (if any)
  mocks/                the fake backend (provided; don't import from app code)
  test/                 test setup + renderWithProviders
```

Don't create all of this up front. Grow into it as each milestone needs a new piece.

---

## 8. Test yourself

<details><summary>Why does my effect run twice in development?</summary>

StrictMode mounts, unmounts, and remounts components in dev to surface effects with missing cleanup. It doesn't happen in production. The fix is a correct cleanup, not removing StrictMode.
</details>

<details><summary>What's a race condition when fetching, and two ways to fix it?</summary>

An older, slower response arrives after a newer one and overwrites it. Fix it with `AbortController` (abort in the cleanup function), or an `ignore` / `cancelled` flag set in the cleanup and checked before `setState`. Query libraries do this by keying the cache on the inputs.
</details>

<details><summary>Server state vs client state?</summary>

Server state is owned remotely, shared with other users, can go stale, and is async. You hold a cache of it. Client state is owned by this browser tab and is synchronous. They need different tools: a query cache for the first, `useState` / Context / Zustand for the second.
</details>

<details><summary>staleTime vs gcTime?</summary>

`staleTime` is how long cached data counts as fresh, so no refetch happens. `gcTime` is how long inactive data stays in memory after the last component using it unmounts.
</details>

<details><summary>When would you use Context vs Zustand vs Redux Toolkit?</summary>

Context for low-frequency, app-wide values (theme, auth user) and for dependency injection. Zustand for shared state that updates often or needs selectors so components re-render less. Redux Toolkit for large teams or existing Redux codebases that need strict patterns and devtools. In all three cases, server data goes in a query cache, not the store.
</details>

<details><summary>What state should live in the URL?</summary>

Anything a user would expect to survive a refresh, be shareable as a link, or work with the back button: current page, selected item id, filters, sort, search query, pagination.
</details>

<details><summary>Controlled vs uncontrolled inputs?</summary>

Controlled: React state is the source of truth (`value` + `onChange`). Use it for live validation, character counters, or inputs that drive other UI. Uncontrolled: the DOM holds the value (`defaultValue`), and you read it on submit via `FormData` or a ref. It's simpler and pairs naturally with React 19 form actions.
</details>

<details><summary>Why do lists need keys, and why not use the index?</summary>

Keys let React match items between renders. With index keys, inserting, removing, or reordering items makes React reuse the wrong component, so state such as input values or open/closed sticks to the wrong row. Use a stable id.
</details>

<details><summary>What can't an error boundary catch?</summary>

Errors in event handlers, in async code (`setTimeout`, promises you don't render), during SSR, or in the boundary itself. Handle those with try/catch and state, or rethrow them during render. Error boundaries are still class components under the hood; most people use `react-error-boundary`.
</details>

<details><summary>How does an optimistic update with rollback work?</summary>

In `onMutate`, cancel in-flight queries for that key (so they can't overwrite your change), snapshot the current cache, write the optimistic value with `setQueryData`, and return the snapshot as context. In `onError`, restore the snapshot. In `onSettled`, invalidate so the server's truth wins.
</details>

<details><summary>What does the React Compiler change?</summary>

It automatically memoizes components and values at build time, so most hand-written `useMemo` / `useCallback` / `React.memo` become unnecessary. Code still has to follow the Rules of React (pure render, no mutating props or state), which the `eslint-plugin-react-hooks` rules check.
</details>
