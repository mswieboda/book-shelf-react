# React architecture primer

This is a cheat sheet for interviews. Skim it before you start, then come back when a milestone points you here. Questions to test yourself are at the bottom.

It's aimed at the range of codebases you'll actually meet: apps started around 2020–2023 (axios, custom hooks, maybe Redux or React Query) as well as newer ones.

---

## 1. The big idea: there are several kinds of state

Most "which state library should I use?" debates go away once you notice that apps hold **several different kinds of state**, and each has a natural home.

| Kind | Examples (in this app) | Where it lives | Tool |
|---|---|---|---|
| **Server state** | the shelf, a book's details, search results | the backend; you hold a *cache* of it | an API layer + a data layer (yours in M5; in libraries: TanStack Query, SWR, RTK Query) |
| **URL state** | current page, `?status=reading`, `?q=dune`, `?sort=title` | the address bar | the router: `useSearchParams`, `useParams` |
| **Local UI state** | is this dropdown open, a text input's draft value | one component | `useState` / `useReducer` |
| **Shared client state** | theme, grid/list view preference, multi-select | the browser only, needed by distant components | **Context** (rarely changes) or **Zustand** / **Redux Toolkit** (changes often, or many consumers) |
| **Form state** | the notes and rating being edited | the form | uncontrolled inputs + `FormData` / `useActionState`, or controlled inputs, or react-hook-form for big forms |

Two habits that follow from the table:
- **Server data is a cache, not app state.** The classic 2018-era pattern fetched in a Redux thunk and stored the result in the global store next to UI state. Then you had to hand-write loading flags, staleness, and "refetch after save" for every resource. Modern codebases keep server data in a **dedicated cache layer** (a library, or a well-designed custom one like M5) and keep the client store small.
- **Derive, don't duplicate.** A filtered or sorted list, a count, or "is this book already on my shelf?" should be computed during render from existing state. Don't keep a copy in `useState` and try to keep it in sync with an effect.

---

## 2. Getting data from a server: the layers

```
Component  ──calls──▶  feature hook        ──calls──▶  API function          ──uses──▶  HTTP client
ShelfPage              useShelf(status)                getShelf(status)                 http (axios instance)
                       useUpdateBook()                 updateBook(id, patch)            interceptors, baseURL,
                       (cache, loading, errors)        (URL, params, types)             timeout, error mapping
```

Each layer has one job and can change on its own:
- **HTTP client** (`lib/http.ts`): transport concerns, i.e. base URL, timeout, auth headers, and turning every failure into one `ApiError` type. Swap axios for `fetch` here and nothing else changes.
- **API functions** (`features/*/api.ts`): one function per endpoint, typed inputs and outputs, returning **data**, not HTTP responses. External APIs get **mapped into your own types** here (Open Library's `author_name` → `authors`), so a change on their side breaks one function instead of twenty components.
- **Hooks** (`features/*/queries.ts`): React-facing. They connect the API functions to the cache and expose `{ data, error, isLoading }` / `mutate`. They also own the cache keys.
- **Components**: render and handle events. They never import axios and never build URLs.

Where data fetching is heading (be able to talk about it):
1. **Framework data loading.** Next.js App Router (React Server Components), React Router loaders and "framework mode", TanStack Start/Router loaders. Data is fetched before or while the route renders, so there are no waterfalls.
2. **Client-side data libraries** in single-page apps: TanStack Query (called **React Query** until 2022), SWR, RTK Query. Very common in 2021+ codebases.
3. **Custom hooks over an axios layer**: still everywhere. This challenge builds this first, then a cache on top of it.

Why plain `useEffect` fetching falls short (you'll feel each of these in M3–M4):
- **Race conditions.** Type "du", then "dune". If the "du" response arrives last, the screen shows the wrong results.
- **No cache.** Navigate away and back and it fetches again with a spinner. Two components needing the same data make two requests.
- **Waterfalls.** The parent fetches, renders, then the child starts its fetch.
- **Boilerplate.** Every fetch needs `data` / `error` / `isLoading` state, retries, and refetch logic.
- **StrictMode** runs effects twice in development. That's on purpose: it surfaces missing cleanup.

---

## 3. HTTP clients: axios (and how it compares to `fetch`)

### axios in five minutes

```ts
// lib/http.ts
export const http = axios.create({ baseURL: '/api', timeout: 10_000 })

http.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getToken()}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(toApiError(err)), // one error type for the whole app
)

// features/shelf/api.ts
export async function getShelf(status?: ReadingStatus, opts?: { signal?: AbortSignal }) {
  const { data } = await http.get<ShelfBook[]>('/shelf', { params: { status }, signal: opts?.signal })
  return data
}

export async function updateBook(id: string, patch: BookPatch) {
  const { data } = await http.patch<ShelfBook>(`/shelf/${id}`, patch) // JSON body + header handled for you
  return data
}
```

Things to know cold:
- **Instances** (`axios.create`) hold per-host config. Use one per backend or API.
- **Interceptors** run on every request or response. Common uses: auth headers, refreshing a token on `401` and replaying the request, logging and timing, error normalization, retries.
- **Errors:** axios **rejects on any non-2xx status**. `axios.isAxiosError(e)`, then `e.response?.status` and `e.response?.data`. If there's no `e.response`, it was a network error or timeout (`e.code === 'ECONNABORTED'`).
- **Cancellation:** pass `{ signal: controller.signal }`. Canceled requests reject with an error where `axios.isCancel(e)` is true. Don't show that to the user.
- **Typing:** `http.get<T>()` types `response.data` as `T`. It's a **promise, not a validation**: the server can still send something else. Use zod at the boundary if you need real guarantees.
- **`params`** builds the query string for you and drops `undefined` values.

### axios vs `fetch`

| | `fetch` (built in) | axios |
|---|---|---|
| Non-2xx status (404, 500) | **resolves**; you must check `res.ok` | rejects |
| JSON | manual `JSON.stringify` + header, `await res.json()` | automatic both ways |
| Timeout | `AbortSignal.timeout(ms)` | `timeout` option |
| Base URL / shared config | write a wrapper | `axios.create` |
| Interceptors | write a wrapper | built in |
| Query params | `new URLSearchParams(...)` | `params` option |
| Cancellation | `AbortController` | `AbortController` (same) |
| Bundle size | 0 | ~13 KB gzipped |
| Upload progress | no (streams only) | yes (`onUploadProgress`) |

In interviews: say you'd use whatever the codebase already uses. Either way you'd wrap it in a client module so the rest of the app doesn't care. In live coding with no packages, expect `fetch`, and the classic bug is forgetting that **`fetch` doesn't throw on 404 or 500**.

---

## 4. What a data layer does

This is the concept list behind M5 and M6, and behind every data-fetching library. If you can explain these, you can work in any codebase.

| Concept | What it means | Your version (M5–M6) | TanStack Query name |
|---|---|---|---|
| **Cache** | Keep responses in memory keyed by what was asked for | `queryCache` (a `Map`) | `QueryClient` / `QueryCache` |
| **Query key** | Serializable id for a request: `['shelf', 'list', { status }]` | your keys + `shelfKeys` factory | `queryKey` |
| **De-duping** | Two components ask for the same key at once → one request | share the in-flight promise | automatic |
| **Staleness** | Data is "fresh" for N ms; after that, show it but refetch in the background (stale-while-revalidate) | `staleTime` + `fetchedAt` | `staleTime` |
| **Loading vs fetching** | No data yet (spinner) vs refreshing data already on screen (subtle indicator) | `isLoading` / `isFetching` | `isPending` / `isFetching` |
| **Invalidation** | After a write, mark related keys stale and refetch the ones on screen | `invalidate(prefix)` | `invalidateQueries` |
| **Direct cache writes** | Put a server response or an optimistic value straight into the cache | `setData(key, updater)` | `setQueryData` |
| **Optimistic update** | Update the UI before the server confirms, roll back on failure | `onMutate` → snapshot, `onError` → restore | same |
| **Garbage collection** | Drop unused entries after a while | (stretch goal) | `gcTime` |
| **Retries, refetch on focus** | Resilience and freshness | (stretch goals) | built in |

How caching per key fixes race conditions: in M3, a slow "want" response could land after you switched to "reading" and overwrite the screen. With a cache, each response is stored **under its own key**, and the screen reads the key for the *current* filter. A late response just fills in a different entry. That's a good line for an interview.

Two ways to keep a list fresh after a create, update or delete:
1. **Invalidate and refetch**: simple and always correct, at the cost of an extra request and a short delay.
2. **Write the server's response into the cache**: instant and no extra request, but you must update every cached list the item appears in. (Easy for one list, harder with server-side filters and pagination.)

Many apps do (2) for the detail view and (1) for lists.

---

## 5. Client state: useState → Context → Zustand / Redux

Start with the cheapest tool that works and escalate:

1. **`useState` in the component that needs it.**
2. **Lift state up** to the nearest common parent and pass props down. This is fine for a level or two.
3. **Composition** (`children`, passing components as props) often removes prop drilling without any global state.
4. **Context** suits values that change rarely and many components read: theme, current user, locale. The catch is that *every* consumer re-renders when the value changes, and Context has no selectors.
5. **Zustand** (or Jotai) suits shared state that changes often or has many consumers. Components subscribe with a **selector**, `useStore(s => s.view)`, and only re-render when that slice changes. It's tiny, needs no provider, and has middleware like `persist`. (Under the hood it's `subscribe` + `useSyncExternalStore`, the same as your M5 cache.)
6. **Redux Toolkit** is very common in codebases from 2019–2023, especially larger teams. Know `configureStore`, `createSlice`, `useSelector` / `useDispatch`, `createAsyncThunk` (fetching via thunks), and that **RTK Query** is Redux's built-in data-caching layer. You'd choose it with a large team that wants strict conventions, an existing Redux codebase, or a need for time-travel devtools. Old-style Redux (hand-written action types, `switch` reducers, `connect()`) still exists in older code. Recognise it, and know RTK replaced it.

---

## 6. React 18 / 19 features worth knowing

**React 18 (2022), the baseline for a 2023 app:**
- `createRoot`, **automatic batching** (multiple `setState` calls cause one render, even in promises and timeouts)
- **StrictMode** double-invokes effects in dev
- `useTransition` / `useDeferredValue` to mark updates as non-urgent so typing stays snappy
- `useId` (accessible ids), `useSyncExternalStore` (subscribing to outside stores)
- Suspense for `React.lazy` code splitting

**React 19 (Dec 2024) and later:**
- **Actions**: pass an async function to `<form action={fn}>`. React tracks the pending state, and uncontrolled fields reset after it succeeds.
- **`useActionState(fn, initial)`** returns `[state, formAction, isPending]`. It's good for "submit → show server validation error".
- **`useFormStatus()`** lets a child of a `<form>` (say a `SubmitButton`) read `pending` without prop drilling.
- **`useOptimistic(state, updateFn)`** shows an optimistic value while an action is in flight.
- **`use(promise | context)`** reads a promise (suspends until it resolves) or a context, and unlike hooks it may be called conditionally. The promise must be cached or stable.
- **`ref` is a normal prop.** `forwardRef` is no longer needed. `<Context>` can be used directly as a provider.
- **React Compiler** (1.0 since late 2025) memoizes automatically, so hand-written `useMemo` / `useCallback` / `memo` are needed much less. Still know what they do and when they matter (referential equality, expensive computations, memoized children).
- **19.2**: `<Activity>` hides UI while keeping its state, and `useEffectEvent` reads the latest props or state inside an effect without re-running it.
- **Server Components** are concept-only in this Vite app. They run on the server, can `await` data directly, ship zero JS, and can't use state or effects. `'use client'` marks the boundary.

---

## 7. Effects: you probably need fewer than you think

Before you write `useEffect`, ask whether it's one of these:
- **Derived from props or state?** Compute it during render.
- **A reaction to a user event?** Put it in the event handler. A POST on button click belongs in `onClick`, not in an effect watching a flag.
- **Resetting state when a prop changes?** Pass a `key` to remount the component.
- **Fetching data?** Put it behind a hook in your data layer (or a library or route loader), not in an ad-hoc effect in the component.

Effects are for **synchronizing with external systems**: subscriptions, timers, non-React widgets, `document.title`, and so on. Always return a cleanup function when you set something up.

---

## 8. Folder structure

Group by **feature**, not by file type. Shared code moves *up* only once two features need it.

```
src/
  app/                  App.tsx, providers.tsx (Theme…), routes, Layout
  features/
    shelf/
      api.ts            getShelf, getBook, addBook, updateBook, removeBook (uses lib/http)
      queries.ts        shelfKeys, useShelf, useBook, useUpdateBook, useRemoveBook…
      components/       BookCard, ShelfList, StatusFilter, BookDetail…
      types.ts
    search/
      api.ts            Open Library axios instance + mapping to your own types
      queries.ts        useSearch
      components/
      types.ts
  components/ui/        dumb, reusable components: Button, Spinner, ErrorMessage, Cover
  hooks/                generic hooks: useDebouncedValue, useApiQuery, useApiMutation
  lib/                  http.ts (axios instance + interceptors), ApiError, queryCache.ts
  stores/               Zustand stores
  mocks/                the fake backend (provided; don't import from app code)
  test/                 test setup + renderWithProviders
```

Don't create all of this up front. Grow into it as each milestone needs a new piece.

---

## 9. Test yourself

<details><summary>How would you avoid fetching the same data twice?</summary>

Put a cache between components and the network, keyed by the request (e.g. `['shelf', 'list', { status }]`). If fresh data exists for the key, return it. If a request for that key is already in flight, return the same promise (de-duping). Components then subscribe to the key instead of each owning a `useEffect`. It's what TanStack Query, SWR and RTK Query do, and what you build in M5.
</details>

<details><summary>How do you keep a list fresh after a create?</summary>

Either invalidate the list's cache key so it refetches (simple, always correct, one extra request), or write the server's response into the cached list directly (instant, but you must update every list it belongs in). Optionally show it optimistically before the server responds, and roll back on error.
</details>

<details><summary>axios vs fetch: what are the differences, and which would you use?</summary>

axios rejects on non-2xx responses, handles JSON both ways, and has `timeout`, `baseURL` instances, interceptors, `params`, and upload progress. `fetch` is built in and needs no dependency, but it **resolves on 404 or 500** (check `res.ok`), needs manual JSON handling, and has no interceptors. Use what the codebase uses, behind a client module either way.
</details>

<details><summary>Name three uses for axios interceptors.</summary>

Attaching auth tokens. Catching `401`, refreshing the token, and replaying queued requests. Normalizing errors into one app-wide type. Logging and timing. Retry with backoff. Adding a request id or correlation header.
</details>

<details><summary>Why does my effect run twice in development?</summary>

StrictMode mounts, unmounts, and remounts components in dev to surface effects with missing cleanup. It doesn't happen in production. The fix is a correct cleanup (or a de-duping data layer), not removing StrictMode.
</details>

<details><summary>What's a race condition when fetching, and how do you fix it?</summary>

An older, slower response arrives after a newer one and overwrites it. Fix it with `AbortController` (abort in the cleanup function), with an `ignore` flag set in the cleanup and checked before `setState`, or by design: store results per cache key so a late response can't affect what the current key shows.
</details>

<details><summary>Server state vs client state?</summary>

Server state is owned remotely, shared with other users, can go stale, and is async. You hold a cache of it. Client state is owned by this browser tab and is synchronous. They need different tools: a cache layer for the first, `useState` / Context / Zustand / Redux for the second.
</details>

<details><summary>When would you use Context vs Zustand vs Redux Toolkit?</summary>

Context for low-frequency, app-wide values (theme, auth user) and for dependency injection. Zustand for shared state that updates often or needs selectors so components re-render less. Redux Toolkit for large teams or existing Redux codebases that need strict patterns and devtools. In all three cases, server data goes in a cache layer, not the store.
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

Errors in event handlers, in async code (`setTimeout`, promise callbacks), during SSR, or in the boundary itself. Handle those with try/catch and state, or store the error and rethrow it during render. Error boundaries are still class components under the hood; most people use `react-error-boundary`.
</details>

<details><summary>How does an optimistic update with rollback work?</summary>

Before the request: snapshot the cached data, write the optimistic value into the cache, and keep the snapshot. On error: restore the snapshot and tell the user. Afterwards, success or not: invalidate so the server's truth wins. Libraries also cancel in-flight refetches first so they can't overwrite the optimistic value.
</details>

<details><summary>What does the React Compiler change?</summary>

It automatically memoizes components and values at build time, so most hand-written `useMemo` / `useCallback` / `React.memo` become unnecessary. Code still has to follow the Rules of React (pure render, no mutating props or state), which the `eslint-plugin-react-hooks` rules check.
</details>
