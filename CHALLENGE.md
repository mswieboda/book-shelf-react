# The Challenge: **Shelf**, a personal reading list

You'll build a small app for tracking books you want to read, are reading, and have finished. You search a real public API (Open Library) to find books, add them to your shelf (your "backend"), and manage them.

The domain is small on purpose, so your attention goes to the **React fundamentals and architecture** an interviewer will ask about, not the business logic.

```
┌──────────────────────────────────────────────────────────┐
│  📚 Shelf            [ My shelf ]  [ Search ]       ☀/🌙  │
├──────────────────────────────────────────────────────────┤
│  All (4) │ Want (1) │ Reading (2) │ Done (1)   Sort: [▾]  │
│                                                          │
│  ┌──────┐ Project Hail Mary          [Reading ▾]  [🗑]   │
│  │cover │ Andy Weir · 2021                               │
│  └──────┘                                                │
│  ┌──────┐ Dune                       [Done ▾]     [🗑]   │
│  │cover │ Frank Herbert · 1965   ★★★★★                   │
│  └──────┘                                                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Search: [ hobbit_______ ]                               │
│  ┌──────┐ The Hobbit · J.R.R. Tolkien · 1937  [+ Add]     │
│  ┌──────┐ Dune · Frank Herbert · 1965         ✓ On shelf  │
└──────────────────────────────────────────────────────────┘
```

**The approach:** you talk to the backend with **axios**, through an API layer you design, and you **build your own small data layer** (a cache, shared in-flight requests, invalidation, optimistic updates) instead of using a data-fetching library. That way, when an interviewer asks "how would you avoid fetching the same data twice?" or "how do you keep a list fresh after a create?", you can answer from having built it. Libraries like TanStack Query (React Query), SWR and RTK Query do the same jobs, and you'll compare against one at the end.

**What's provided:**
- Vite + React 19 + TypeScript + Tailwind v4 (already set up)
- A **fake backend** (MSW) that answers HTTP requests to `/api/*` like a real server, with latency, validation errors, and switchable random failures. See [`docs/API.md`](docs/API.md).
- [`docs/PRIMER.md`](docs/PRIMER.md): the architecture cheat sheet. Read sections 1–3 before you start.

**What's not provided:** any app code. That's your job.

---

## Ground rules

1. **Don't import from `src/mocks/`** in app code. It's "the server", reachable only over HTTP.
2. **Components never import axios.** They call hooks, hooks call API functions, and API functions use your axios instance. (Why: [primer, section 2](docs/PRIMER.md#2-getting-data-from-a-server-the-layers).)
3. **One milestone at a time**, with a git commit at the end of each (`git commit -m "M3: fetch shelf with useEffect"`). Then you can diff milestones and see your architecture evolve.
4. **Talk out loud / write it down first.** Before each milestone, sketch the component tree and decide *where each piece of state lives*. That's the part interviews grade.
5. **Hints are folded.** Try for 10–15 minutes before opening one.
6. **Stuck or done? Ask Claude to review**, not to solve: "review my M5, don't give me the answer, just point at problems."
7. Styling is not the point. Use plain Tailwind utilities and move on.

**Pacing:** Milestones 0–7 are the core (about a weekend; M5 and M6 are the meatiest). 8–10 level you up. Each has a rough time box. If you blow through it, stop, look at the hints, and keep moving.

---

## Milestone 0: Orientation (15 min)

- [ ] `npm run dev`, open the app, open DevTools.
- [ ] In the console, run `await (await fetch('/api/shelf')).json()`. You should get 4 seeded books. Check the Network tab: the request is answered by the mock service worker. (Plain `fetch` is fine for poking around in the console. The app will use axios.)
- [ ] Open `https://openlibrary.org/search.json?q=hobbit&fields=key,title,author_name,first_publish_year,cover_i&limit=5` in a tab and get a feel for the response.
- [ ] Read [`docs/PRIMER.md`](docs/PRIMER.md) sections 1–3.
- [ ] On paper: draw the component tree for the two screens above, and label every piece of state with its kind (server / URL / local / shared client / form). Keep the paper; you'll check it against the final app.

---

## Milestone 1: Components, props & state, with no network (45 min)

Build the **shelf screen** using a hardcoded array (copy 3–4 books from `/api/shelf` into `src/features/shelf/fixtures.ts`).

- [ ] Write a `ShelfBook` type and a `ReadingStatus` type (`'want' | 'reading' | 'done'`) in `features/shelf/types.ts`.
- [ ] Components: `ShelfPage` → `StatusFilter` + `ShelfList` → `BookCard`. Add a `Cover` component that handles `coverId === null`.
- [ ] Filter tabs (All / Want / Reading / Done) with counts per tab.
- [ ] A sort dropdown (newest added, title A–Z).
- [ ] Each card has a status `<select>` that changes the book's status, and a remove button.
- [ ] An empty state ("Nothing here yet") when a filter has no books.

**Concepts:** props vs state, lifting state up, lists and `key`, controlled `<select>`, immutable updates (`map` / `filter`, never `push` or mutation), **derived state**.

<details><summary>Hint: where does state live?</summary>

`books` and `statusFilter` and `sort` all live in `ShelfPage`. The visible list is **computed** during render: `const visible = sortBooks(filterBooks(books, statusFilter), sort)`. It is *not* a separate `useState`. Same for the counts. `BookCard` receives the book plus `onStatusChange(id, status)` / `onRemove(id)` callbacks.
</details>

<details><summary>Hint: sorting gotcha</summary>

`Array.prototype.sort` mutates in place. Sorting a state array directly is a bug. Use `[...arr].sort()` or `arr.toSorted()`.
</details>

**Be ready to answer:** Why not store `filteredBooks` in state? Why does `key={index}` cause bugs here (try it with the remove button and a focused select)?

> **Deferred from M1 (do as "M1.5", or fold into M3):**
> - [ ] Empty state ("Nothing here yet") when a filter has no books. M3 already asks for an empty state, so it fits naturally there.
> - [ ] `Cover` component that handles `coverId === null`.
> - [ ] Decide the default filter: `ShelfPage` currently starts on `'want'`, not `'all'`.

---

## Milestone 2: The HTTP client & API layer (45 min)

`npm i axios`

No UI changes yet. You're building the plumbing every later milestone sits on. An interviewer asking you to "design the API layer" wants to see this.

- [ ] `src/lib/http.ts`: an axios **instance** for your backend, `axios.create({ baseURL: '/api', timeout: 10_000 })`.
- [ ] A **response interceptor** that turns every failure into your own `ApiError` class (`status`, `message`, and `code`, e.g. `'TIMEOUT' | 'NETWORK' | 'CANCELED' | 'HTTP'`). Pull the message out of the server's `{ error: string }` body when there is one. After this, nothing outside `lib/` needs to know what an `AxiosError` looks like.
- [ ] A **request interceptor** that does something real: in dev, log `→ GET /shelf` and time each request (stash the start time on the config), or attach an `Authorization: Bearer demo-token` header as you would for a real auth token. (The mock backend ignores it, but you can see it in the Network tab.)
- [ ] `src/features/shelf/api.ts`: typed functions `getShelf(status?, opts?)`, `getBook(id)`, `addBook(input)`, `updateBook(id, patch)`, `removeBook(id)`. Each returns **data**, not the axios response (`Promise<ShelfBook[]>`, not `Promise<AxiosResponse<…>>`). Each accepts an optional `{ signal }` for cancellation.
- [ ] A **second instance** for Open Library in `src/features/search/api.ts` (`baseURL: 'https://openlibrary.org'`), because different hosts get different config.
- [ ] Prove it works without UI: temporarily expose it, e.g. `if (import.meta.env.DEV) Object.assign(window, { shelfApi })` in `main.tsx`, then in the console: `await shelfApi.getShelf('reading')`, `await shelfApi.updateBook('bad-id', { status: 'done' }).catch(e => e)` (it should be your `ApiError` with status 404), and `await shelfApi.addBook({ workKey: '/works/OL893414W', title: 'Dune' }).catch(e => e)` (409).

**Concepts:** axios instances, interceptors, error normalization, TypeScript generics (`http.get<ShelfBook[]>(…)`), separation of concerns, cancellation with `AbortSignal`.

<details><summary>Hint: interceptor shape</summary>

```ts
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)

function toApiError(error: unknown): ApiError {
  if (axios.isCancel(error)) return new ApiError('Request canceled', { code: 'CANCELED' })
  if (axios.isAxiosError<{ error?: string }>(error)) {
    if (error.code === 'ECONNABORTED') return new ApiError('Request timed out', { code: 'TIMEOUT' })
    if (!error.response) return new ApiError('Network error', { code: 'NETWORK' })
    return new ApiError(error.response.data?.error ?? error.message, {
      code: 'HTTP',
      status: error.response.status,
    })
  }
  return new ApiError('Unknown error', { code: 'UNKNOWN' })
}
```

Keep the `CANCELED` case distinct: in later milestones a canceled request is expected, not an error to show the user.
</details>

**Be ready to answer:** What does axios give you over `fetch`, and what would you have to write yourself without it? Name three uses for interceptors. Why wrap axios errors instead of letting components check `error.response.status`?

---

## Milestone 3: Fetching in components with `useEffect` (45 min)

Replace the fixtures with real data via your API layer.

- [ ] A custom hook `useShelf(status)` returning `{ data, error, isLoading, refetch }`, built from `useState` + `useEffect`.
- [ ] Filter **on the server**: pass `?status=` when a tab is selected, refetching when it changes. (`http.get('/shelf', { params: { status } })`; axios drops `undefined` params for you.)
- [ ] Handle **race conditions** with an `AbortController` in the effect cleanup, and ignore your `CANCELED` errors.
- [ ] Loading state, error state with a **Retry** button, empty state.
- [ ] Test it: in the console, `localStorage.setItem('mock:latency','2000')` and `localStorage.setItem('mock:failRate','0.3')`, then reload. Click through tabs quickly. Make sure the screen never shows the wrong tab's data.
- [ ] Status changes and removes still only update local state for now. That's fine.

**Concepts:** the effect lifecycle and dependency array, cleanup, StrictMode double-invoke, `AbortController`, custom hooks.

<details><summary>Hint: the hook skeleton</summary>

```ts
useEffect(() => {
  const controller = new AbortController()
  setIsLoading(true)
  setError(null)
  getShelf(status, { signal: controller.signal })
    .then(setData)
    .catch((e: ApiError) => { if (e.code !== 'CANCELED') setError(e) })
    .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
  return () => controller.abort()
}, [status, reloadCount])
```

For `refetch`, a common trick is a counter in state (`const [reloadCount, setReloadCount] = useState(0)`) that's in the dependency list.
</details>

**Be ready to answer:** Why did the request fire twice on load (check the Network tab)? What happens without the cleanup if responses arrive out of order? List three things this hook *doesn't* do that you'd want in production.

---

## Milestone 4: An external API: Search (45 min)

Add a **Search** section. Put it above the shelf, or toggle between them with a `useState`; routing comes in M7.

- [ ] `searchBooks(query, { signal })` calls Open Library (`/search.json` with `params: { q, fields, limit }`) and **maps** the response into your own `SearchResult` type (`workKey`, `title`, `authors`, `coverId`, `firstPublishYear`). Nothing outside this file knows about `author_name` or `cover_i`.
- [ ] A controlled search input.
- [ ] A generic `useDebouncedValue(value, delayMs)` hook in `src/hooks/`. Search only fires about 400ms after typing stops, and only for 2+ characters.
- [ ] A `useSearch(query)` hook using the same `useEffect` + abort pattern as M3 (copy-paste it; the duplication is part of the lesson).
- [ ] Each result has **+ Add**, which calls `addBook()`. Show `409` ("already on your shelf") nicely. Disable the button while the request is in flight.
- [ ] Results already on your shelf show "✓ On shelf" instead of the button.

**Concepts:** debouncing with effect cleanup (`setTimeout` / `clearTimeout`), mapping external data at the boundary, handling a `409`.

At the end of M4, **write down the pain points** you hit. You should find at least these:
1. Duplicated loading/error/abort boilerplate in two hooks (and more coming).
2. To show "✓ On shelf", search needs the shelf data too. Do you fetch it again? Lift it up?
3. After **+ Add**, the shelf list is stale until you refresh.
4. Switching tabs back and forth refetches every time, with a spinner, even though nothing changed.
5. StrictMode fires every request twice in dev.

Milestones 5 and 6 fix all five.

<details><summary>Hint: useDebouncedValue</summary>

```ts
const [debounced, setDebounced] = useState(value)
useEffect(() => {
  const t = setTimeout(() => setDebounced(value), delayMs)
  return () => clearTimeout(t)
}, [value, delayMs])
return debounced
```
</details>

---

## Milestone 5: Your own data layer: cache, sharing, staleness (1.5 hr)

This is the core architecture milestone. You'll build a **small query cache** and one generic hook to replace `useShelf` and `useSearch`. Keep it to about 80–120 lines. The goal is to understand the ideas, not to rebuild React Query. Read [primer, section 4](docs/PRIMER.md#4-what-a-data-layer-does) first.

- [ ] `src/lib/queryCache.ts`: a module-level store.
  - [ ] Entries keyed by a **query key** (an array like `['shelf', 'list', { status }]`, serialized to a string for the `Map`).
  - [ ] Each entry holds `data`, `error`, `status`, `fetchedAt`, and the **in-flight promise**.
  - [ ] `fetch(key, fn, { staleTime })`: return cached data if it's fresh; if a request for this key is already in flight, **return that same promise** (de-duping); otherwise call `fn` and store the result.
  - [ ] `subscribe(key, listener)` / `getSnapshot(key)` so React can re-render when an entry changes.
  - [ ] `setData(key, updater)`, `invalidate(keyPrefix)` (marks matching entries stale and refetches the ones on screen), and `clear()` (you'll need it in tests).
- [ ] `src/hooks/useApiQuery.ts`: `useApiQuery(key, fn, { staleTime?, enabled? })` → `{ data, error, isLoading, isFetching, refetch }`.
  - `isLoading`: no data yet and a request is running (show a spinner).
  - `isFetching`: any request is running, including a background refresh while old data is on screen (show a subtle indicator).
- [ ] Replace `useShelf` and `useSearch` with thin wrappers: `useShelf(status) = useApiQuery(shelfKeys.list(status), () => getShelf(status), { staleTime: 30_000 })`.
- [ ] A **query key factory** in `features/shelf/queries.ts`: `shelfKeys.all`, `.lists()`, `.list(status)`, `.detail(id)`.
- [ ] "✓ On shelf" reads the *same* cached shelf query. Confirm in the Network tab that no duplicate request is made, **including under StrictMode**.
- [ ] After **+ Add** succeeds, call `queryCache.invalidate(shelfKeys.all)`. The shelf updates without a refresh.
- [ ] Switch tabs back and forth: tabs you've visited show instantly, with no spinner, within `staleTime`.

**Concepts:** caching, query keys, request de-duping, stale-while-revalidate, invalidation, `useSyncExternalStore`, why per-key caching makes the M3 race condition go away.

<details><summary>Hint: subscribing React to an external store</summary>

React's built-in hook for "re-render when this outside thing changes" is `useSyncExternalStore(subscribe, getSnapshot)`. `getSnapshot` must return the **same object reference** when nothing changed, so replace entries immutably (`map.set(k, { ...old, data })`) rather than mutating them, or you get an infinite render loop.

```ts
const hash = JSON.stringify(key)
const entry = useSyncExternalStore(
  (onChange) => queryCache.subscribe(hash, onChange),
  () => queryCache.getSnapshot(hash),
)
```
</details>

<details><summary>Hint: the key and fn identity trap</summary>

`useApiQuery(['shelf', 'list', { status }], () => getShelf(status))` creates a **new array and a new function every render**. If either goes in an effect's dependency list, it fires every render. Fixes:
- depend on the **serialized** key (`hash`), not the array (this is why libraries hash keys)
- read the latest `fn` without depending on it: store it in a ref (`fnRef.current = fn`), or use React 19.2's `useEffectEvent`
</details>

<details><summary>Hint: invalidating by prefix</summary>

Keep the original key array next to each entry, then match element by element: `['shelf']` matches `['shelf', 'list', {…}]` and `['shelf', 'detail', 'abc']`. Comparing `JSON.stringify(prefix[i]) === JSON.stringify(key[i])` for each `i` is fine here. For entries with active subscribers, refetch immediately. For the rest, just mark them stale so they refetch next time they're used.
</details>

<details><summary>Hint: what about cancellation?</summary>

Once several components can share one in-flight request, aborting it when *one* of them unmounts would break the others. Keep it simple: don't abort in the cache layer. Since results are stored **per key**, a slow response for `status=want` can no longer overwrite what the `status=reading` tab shows. The race from M3 is gone by design. Be ready to explain that.
</details>

**Be ready to answer:** "How would you avoid fetching the same data twice?" "How do you keep a list fresh after a create?" What's the difference between stale data and missing data, and what does the user see in each case? Where would this design fall over (memory growth, cache eviction, pagination)?

---

## Milestone 6: Mutations & optimistic UI (1 hr)

- [ ] `src/hooks/useApiMutation.ts`: `useApiMutation(mutationFn, { onMutate?, onSuccess?, onError?, onSettled? })` → `{ mutate, mutateAsync, isPending, error, variables, reset }`. `onMutate` can return a **context** value that gets passed to `onError` (for rollback).
- [ ] **Status `<select>` → `updateBook()`**, done **optimistically**: in `onMutate`, snapshot the affected cached lists and write the new status into them with `queryCache.setData`, then return the snapshot. In `onError`, restore the snapshot and show an error. In `onSettled`, invalidate.
- [ ] **Remove → `removeBook()`**, done the **other way**: no cache surgery. While pending, render that card faded or struck through (check `isPending` and `variables`), and let invalidation remove it for real once it succeeds.
- [ ] Try both refresh strategies and note the trade-off: **invalidate and refetch** vs. **write the server's response into the cache** (`PATCH` returns the updated book).
- [ ] Turn on `mock:failRate = 0.5` and hammer both. The UI must always end up matching the server. Reset if needed with `await fetch('/api/_reset', { method: 'POST' })`.
- [ ] Wrap these in feature hooks: `useUpdateBook()`, `useRemoveBook()`, `useAddBook()`. Components shouldn't know about cache keys.

**Concepts:** optimistic vs pessimistic updates, rollback, mutation lifecycle, hooks as the boundary between UI and data.

<details><summary>Hint: a refetch can overwrite your optimistic value</summary>

If a background refetch of the list started *before* your PATCH and finishes *after* your optimistic write, it puts the old status back. Libraries handle this by cancelling in-flight queries in `onMutate`. In your cache, a simple fix is to ignore a fetch result if the entry was `setData`'d after that fetch started (compare timestamps). Or accept the flicker and let `onSettled`'s invalidation correct it. Either way, be able to explain it.
</details>

<details><summary>Hint: server-side filtering + status changes</summary>

If you're on the "Reading" tab and change a book to "Done", should it vanish from that list optimistically? Which cached lists do you need to update: `list('reading')`, `list('done')`, `list(undefined)`? This is the main argument for fetching the whole shelf once and filtering on the client. Pick one design and **defend it**.
</details>

**Be ready to answer:** When is optimistic UI a bad idea? (Think payments, irreversible actions, and actions that usually fail.)

---

## Milestone 7: Routing & URL state (1 hr)

`npm i react-router`

- [ ] Routes: `/` → redirect to `/shelf`; `/shelf`; `/shelf/:id`; `/search`; `*` → Not Found.
- [ ] A **layout route** with the header and nav (`NavLink` with active styling) and an `<Outlet />`.
- [ ] Move UI state into the URL with `useSearchParams`: the shelf filter and sort become `/shelf?status=reading&sort=title`, and the search query becomes `/search?q=hobbit`. Refresh, back/forward, and copying the link should all work.
- [ ] **Detail page** `/shelf/:id`: `useParams` + a `useBook(id)` query. Show a proper "not found" state for a 404 (your `ApiError.status` makes this easy).
- [ ] On the detail page, a **notes + rating form** using a React 19 **form action** + `useActionState`. Show server validation errors (try saving more than 1000 characters of notes). Make a `SubmitButton` that uses `useFormStatus()` for its pending state.
- [ ] Bonus: make the detail page show instantly when you come from the list, by seeding it from the list cache. (Should your `useApiQuery` take an `initialData` option?)

**Concepts:** URL as the source of truth, layout/nested routes, params vs search params, uncontrolled forms with `FormData`, `useActionState`, `useFormStatus`.

<details><summary>Hint: useActionState + your mutation</summary>

```tsx
const update = useUpdateBook()
const [state, formAction, isPending] = useActionState(
  async (_prev: { error?: string } | null, formData: FormData) => {
    try {
      await update.mutateAsync({ id, patch: { notes: String(formData.get('notes')), /* rating */ } })
      return null
    } catch (e) {
      return { error: e instanceof ApiError ? e.message : 'Something went wrong' }
    }
  },
  null,
)
// <form action={formAction}> <textarea name="notes" defaultValue={book.notes} /> …
```

Gotcha: React **resets uncontrolled fields** after a successful action. Make sure `defaultValue` already reflects the saved data by then (write the PATCH response into the cache in `onSuccess`), or the textarea flashes back to the old text.
</details>

**Be ready to answer:** What belongs in the URL and what doesn't? Controlled vs uncontrolled: why did you pick uncontrolled for the notes form? Would a live character counter change that?

---

## Milestone 8: Client state: Context vs Zustand (45 min)

There's finally some **client-only shared state**, so it's time to choose the right tool for it.

- [ ] **Theme (Context):** `ThemeProvider` + `useTheme()` with `'light' | 'dark' | 'system'`, persisted to `localStorage`, plus a toggle in the header. `useTheme()` should throw a helpful error if it's used outside the provider. (Tailwind v4 dark mode by class: add `@custom-variant dark (&:where(.dark, .dark *));` to `index.css` and toggle `.dark` on `<html>`.)
- [ ] **Shelf UI store (Zustand):** `npm i zustand`. Add a `view: 'grid' | 'list'` preference (persisted with the `persist` middleware) and **multi-select** (`selectedIds`) with a floating "N selected: Mark done · Remove" bar in the layout. Components read slices with **selectors**.
- [ ] The store holds **ids only**, never copies of book objects. Book data stays in your query cache.
- [ ] Clear the selection when the filter changes or after a bulk action.

**Concepts:** when Context is enough, Context re-render behaviour, selectors, persisted state, not duplicating server state.

<details><summary>Hint: why not put theme in Zustand too?</summary>

You could, and it would be fine. Context is taught here because interviews *always* ask about it, and theme is the textbook case: it changes rarely, everyone reads it, and it suits dependency injection. Be ready to say why you'd pick one over the other ([primer, section 5](docs/PRIMER.md#5-client-state-usestate--context--zustand--redux)).
</details>

<details><summary>Hint: you've already built a store</summary>

Your M5 `queryCache` with `subscribe` + `useSyncExternalStore` is essentially how Zustand works internally. Zustand adds selectors and a nicer API. Being able to say that in an interview is a nice touch.
</details>

**Be ready to answer:** Why does every consumer of a Context re-render on change, and what are the mitigations? (Split contexts, memoize the value, or move to a selector-based store.) When would you reach for Redux Toolkit instead?

---

## Milestone 9: Resilience: error boundaries & code splitting (45 min)

`npm i react-error-boundary`

- [ ] Add an `ErrorBoundary` around the routed content (inside the layout, so the nav survives a crash) with a "Try again" button. Use `resetKeys={[location.pathname]}` so navigating away clears the error.
- [ ] Throw a deliberate error in a component to prove the boundary works, then remove it.
- [ ] Error boundaries don't catch errors from async code. Add a `throwOnError` option to `useApiQuery` that **rethrows the error during render** so the boundary catches it. Use it on the detail page for 5xx errors (keep the friendly 404 state).
- [ ] Lazy-load the search route with `React.lazy` + `<Suspense fallback>` and check the Network tab for the separate chunk.
- [ ] Audit your loading, empty, and error states on every screen with `failRate = 0.3`.

**Concepts:** what error boundaries can and can't catch, declarative fallback UI, Suspense for code splitting.

**Be ready to answer:** Why can't an error boundary catch an error thrown in a `.then()` or an `onClick`? How did you work around that?

---

## Milestone 10: Testing (1 hr)

`npm i -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`

The fake backend runs in tests too: `src/mocks/node.ts` exports an MSW `server` with the same handlers, and axios requests go through it unchanged. Latency is automatically 0 under Vitest.

- [ ] Configure Vitest (`test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'] }` in `vite.config.ts`, plus `"types": ["vitest/globals"]` if you use globals).
- [ ] `src/test/setup.ts`: `server.listen()` in `beforeAll`, `server.resetHandlers()` in `afterEach`, `server.close()` in `afterAll`.
- [ ] Also in `afterEach`: `queryCache.clear()`, `localStorage.clear()`, and `await fetch('/api/_reset', { method: 'POST' })`. Notice **why** the cache needs clearing: it's module-level, so it leaks between tests. (That's why TanStack Query recommends a new `QueryClient` per test. Could your cache be created per app and provided via Context instead?)
- [ ] `src/test/render.tsx`: `renderWithProviders(ui, { route })` with a `MemoryRouter` and your theme provider.
- [ ] Tests (query by role and label, like a user would):
  - [ ] The shelf shows the 4 seeded books.
  - [ ] Clicking the "Reading" tab shows only reading books, and the URL has `?status=reading`.
  - [ ] Shows the error state when the API fails: `server.use(http.get('/api/shelf', () => HttpResponse.json({ error: 'boom' }, { status: 500 })))`.
  - [ ] An optimistic status change **rolls back** when `PATCH` fails.
  - [ ] Unit test your `queryCache`: two simultaneous `fetch`es for the same key call `fn` **once**.
  - [ ] Unit test `useDebouncedValue` with `vi.useFakeTimers()` + `renderHook`.
- [ ] Add `"test": "vitest"` to `package.json` scripts.

**Concepts:** testing behaviour rather than implementation, network-level mocking instead of mocking axios or hooks, test isolation and shared module state.

**Be ready to answer:** Why mock the network (MSW) instead of `vi.mock('axios')`? What leaked between your tests before you added `queryCache.clear()`?

---

## Stretch goals (pick any)

- **Compare against TanStack Query**: in a branch, replace `queryCache` / `useApiQuery` / `useApiMutation` with TanStack Query. Write down what you get for free (devtools, retries, garbage collection, refetch on window focus, infinite queries) and how the names map to yours. That gives you a concrete "I built X, the library adds Y" answer, and you'll be fluent if a job uses it.
- **Raw `fetch` mini-challenge**: rewrite `lib/http.ts` on plain `fetch` with the same public API (non-2xx → throw, JSON, timeout via `AbortSignal.timeout`, base URL). If your layering is right, nothing else changes.
- **Retry with backoff** in your data layer or an axios interceptor. Retry 5xx and network errors, never 4xx.
- **Auth refresh flow**: design (on paper or in code) the classic axios interceptor that catches a `401`, refreshes the token once, queues concurrent requests, and replays them. It's a common interview whiteboard question.
- **Refetch on window focus** (`visibilitychange`) and **cache eviction** (drop entries with no subscribers after N minutes).
- **zod**: validate the Open Library and `/api` responses in the API layer, and infer your TS types from the schemas.
- **Pagination / "load more"** for search (Open Library supports `page=`). How do you key that in your cache?
- **React Compiler**: enable `babel-plugin-react-compiler` with the Vite React plugin, then delete any `useMemo` / `useCallback` you wrote. Does anything break?
- **Redux Toolkit comparison**: re-implement the Zustand store as an RTK slice in a branch. Compare the boilerplate, and be able to talk about it.
- **Accessibility pass**: keyboard-only use, focus management after a delete, `aria-live` for errors.
- **Next up**: build the real backend in [Part 2](#part-2-the-backend-node-gateway--ruby-microservice).

---

## Final self-check

Take out your Milestone 0 paper diagram. For each piece of state, compare where you *planned* to put it with where it *ended up*. Being able to explain that difference is what an architecture interview is looking for.

---
---

# Part 2: The backend (Node gateway + Ruby microservice)

You'll replace the MSW fake with real services, following the path many real systems take: **start with a monolith, then extract a service.**

1. A **Node + Express** server implements [`docs/API.md`](docs/API.md) as a monolith on Postgres.
2. You **extract** the Reviews domain (`rating` + `notes`) into a **Ruby service, built with Rails API mode with Grape mounted inside it**, with its own database.
3. Node becomes the **gateway (BFF)**: the browser only ever talks to Node, and Node calls Ruby.
4. Node gains a **GraphQL** endpoint next to REST.
5. **Docker Compose** runs it all.

```
 Browser (React, :5173)
   │  /api/*  (Vite proxy)          /graphql
   ▼                                   ▼
 ┌─────────────────────────────────────────┐
 │  shelf-api  Node 24 · Express 5 · TS    │  :4000   ← the only public entry point
 │  routes → handlers → services → repos   │
 │  Prisma ──────────► Postgres db "shelf" │
 │  reviewsClient (axios) ─┐               │
 └─────────────────────────┼───────────────┘
                           ▼  internal HTTP, snake_case, /v1
 ┌─────────────────────────────────────────┐
 │  reviews  Ruby 3.4 · Rails 8 API · Grape│  :4001
 │  ActiveRecord ──► Postgres "reviews_*"  │
 └─────────────────────────────────────────┘
```

**Decisions already made** (be ready to defend them):

| Decision | Choice | Why |
|---|---|---|
| Approach | Monolith first, then extract | It's how real systems get there, and you can explain the migration in an interview |
| Node stack | Express 5 + TypeScript, zod, pino, Prisma, Vitest + supertest | What most 2022/23-era Node codebases look like |
| Ruby stack | Rails 8 API mode + Grape 4.x + grape-entity, RSpec | Rails handles the infrastructure (ActiveRecord, migrations, config, test env); Grape handles the endpoints |
| Data | Postgres, **one database per service** | Services own their data, and only reach each other's data through APIs |
| Topology | Node is the gateway; Ruby is internal only | The frontend contract never changes |
| Remove a book | **Soft delete** (`archived_at`); re-adding the same `workKey` restores the row with its **same id** | Notes and rating come back on re-add, and a remove never has to call Ruby |
| Ruby is down | **Reads degrade** (`rating: null`, `notes: ""`); **writes fail** | A list without ratings is better than no list, but a silently lost write is not acceptable |
| Gateway → Ruby | axios, with its own instance | The same ideas as M2, now server to server |

**Ground rules:**
1. **`docs/API.md` is the contract.** The React app must not change, except for turning MSW off in dev and adding the Vite proxy. If you have to touch a component, something leaked.
2. **Layers in Node:** route → handler (HTTP only) → service (business rules) → repository (database). Handlers never touch Prisma, and services never touch `req`/`res`.
3. **Ruby is never called by the browser.** Only Node knows its URL.
4. Same as Part 1: one milestone per commit (`"B2: Prisma + soft delete"`), write your plan first, and ask for reviews, not solutions.

**When to start:** any time after M3, since the frontend only needs the contract. Doing it after M7 feels most natural.

**Setup:** [`docs/BACKEND_SETUP.md`](docs/BACKEND_SETUP.md) covers installing the tools (Node 24 via fnm, Ruby 3.4 via asdf, Rails, libpq, Docker Desktop), the ports and databases, env files, how to start everything each day, a verification checklist, and troubleshooting. Do its section 1 before B0.

**Repo layout:**
```
src/                 React app (Part 1)
server/              Node gateway: its own package.json, tsconfig and prisma/
services/reviews/    Rails API + Grape
docker/              Postgres init script
docker-compose.yml
```

---

## Milestone B0: Orientation & Postgres (45 min)

- [ ] Draw the diagram above on paper from memory. For each field of `ShelfBook`, mark **which service owns it** after the extraction.
- [x] Machine setup: work through [`docs/BACKEND_SETUP.md` section 1](docs/BACKEND_SETUP.md#1-one-time-machine-setup-any-time) and pin Node and Ruby for the repo.
- [x] `docker-compose.yml` with **only Postgres** for now (`postgres:17`, with a named volume and a healthcheck). Add an init script in `docker/postgres/` that creates `shelf` and `shelf_test`. (Rails creates its own `reviews_*` databases in B4.)
- [x] `docker compose up -d`, then `psql` in (`docker compose exec postgres psql -U postgres -l`) and confirm both databases exist.
- [x] Scaffold `server/`: `npm init`, TypeScript, `tsx` for dev (`tsx watch src/index.ts`), and Express 5 with a `GET /healthz` that returns `{ ok: true }`.

**Concepts:** why one database per service, why containerized Postgres beats installing it locally (it's disposable, version-pinned and the same for everyone), and how compose networking works (services reach each other by **service name**, the host reaches them through **published ports**).

<details><summary>Hint: creating two databases at startup</summary>

The official Postgres image runs any `*.sql` or `*.sh` file mounted at `/docker-entrypoint-initdb.d/` the **first** time the volume is created. Mount `./docker/postgres` there. Gotcha: if you change the script later, it won't run again until you `docker compose down -v` (which deletes the volume).
</details>

**Be ready to answer:** Why not have both services share one database with two schemas? What does that couple together?

---

## Milestone B1: Express REST monolith (1.5 hr)

Implement every endpoint in `docs/API.md` (including `POST /api/_reset`) in `server/`, using an **in-memory array** for now. The database comes in B2.

- [ ] **Layers:** `routes/shelf.ts` → `handlers` → `services/shelfService.ts` → `repositories/shelfRepo.ts` (with an in-memory implementation). Write the repository as an **interface**, because B2 swaps the implementation.
- [ ] **Validation with zod** on query strings and bodies (`status` must be a `ReadingStatus`, `rating` 1–5 or null, `notes` ≤ 1000). Bad input → `400 { error }`.
- [ ] **Domain errors**: a small `AppError` (or `NotFoundError`, `ConflictError`) thrown by services and turned into HTTP by **one error-handling middleware**. Every error response is `{ error: string }`, including unknown routes (404) and crashes (500, without leaking stack traces).
- [ ] **Async errors:** let Express 5 forward rejected promises from `async` handlers to your error middleware. No try/catch in handlers.
- [ ] **Request logging** with `pino-http`, and a **request id** (reuse an incoming `X-Request-Id` or generate one, then send it back in the response).
- [ ] **CORS:** you don't need it if the browser goes through the Vite proxy. Be able to explain why.
- [ ] **Point the frontend at it:** in `vite.config.ts`, `server.proxy: { '/api': 'http://localhost:4000' }`, and gate MSW behind an env flag (e.g. `VITE_USE_MOCKS=true`) in `main.tsx`. Keep MSW for frontend tests.
- [ ] Click through the whole app against the real server. Nothing in `src/features` should change.

**Concepts:** middleware order, the four-argument error middleware, separating HTTP from business logic, validating at the edge, and the Express 4 vs 5 differences.

<details><summary>Hint: Express 4 vs 5, the interview version</summary>

In **Express 4**, a rejected promise in an `async` handler is *not* caught: the request hangs or the process logs an unhandled rejection. Teams wrapped every handler (`asyncHandler(fn)`) or imported `express-async-errors`. **Express 5** forwards rejections to `next(err)` for you. Other v5 changes you might hit: wildcard routes need a name (`/*splat`), and `req.query` is a read-only getter, so you can't reassign it after zod parses it. Store the parsed value elsewhere, e.g. `res.locals`.
</details>

<details><summary>Hint: where the 404 and error handlers go</summary>

Order matters. Register routes first, then a catch-all `app.use((req, res) => …404…)` with **no path**, then the error handler `app.use((err, req, res, next) => …)` last. Express recognizes an error handler by its **four** parameters, so keep `next` even if you don't use it.
</details>

**Be ready to answer:** Why keep `req`/`res` out of the service layer? (Hint: GraphQL in B6 reuses the services.) What does `app.listen` do that a test with supertest doesn't need?

---

## Milestone B2: Postgres + Prisma, and soft delete (1.5 hr)

- [ ] `npm i prisma @prisma/client` and `npx prisma init`. Model `ShelfBook` in `schema.prisma`: uuid id, unique `workKey`, `authors` as a `String[]`, a `status` enum, nullable `rating`, `notes`, `addedAt`, `updatedAt`, **`archivedAt` (nullable)**.
- [ ] `prisma migrate dev`, plus a **seed script** with the same 4 books as the mock (`_reset` can reuse it).
- [ ] **Swap only the repository** for a Prisma implementation. If you have to edit a handler or service, your layers leaked.
- [ ] **Map Prisma errors to domain errors in the repository**: unique violation (`P2002`) → `ConflictError` (409), record not found (`P2025`) → `NotFoundError` (404).
- [ ] **Soft delete:** `DELETE /api/shelf/:id` sets `archivedAt` and returns `204`. Every read filters out archived rows (`GET` of an archived id → `404`).
- [ ] **Restore on re-add:** `POST` with a `workKey` that matches an *archived* row un-archives it and returns `201` with the **same id**. A `workKey` that matches an *active* row is still `409`. Decide what happens to `status` and `addedAt` on restore, and write it down.
- [ ] Add a "Real server" note to `docs/API.md` describing the restore behavior.

**Concepts:** schema-first ORM and migrations (compare with ActiveRecord migrations), mapping DB errors at the boundary, soft delete trade-offs, and connection pooling (one `PrismaClient` per process).

<details><summary>Hint: the 409 check and race conditions</summary>

"Check if it exists, then insert" has a race: two simultaneous `POST`s can both pass the check. Let the **unique constraint** be the source of truth and translate the error. Because restore reuses the archived row, a plain `@unique` on `workKey` still works. You don't need a partial index.
</details>

**Be ready to answer:** Prisma vs a query builder (Knex) vs raw SQL: what do you give up? What does soft delete cost you (every query needs a filter, unique constraints get tricky, GDPR "delete my data" requests)? Where would you put an index here?

---

## Milestone B3: Testing the API (1 hr)

- [ ] Vitest + `supertest` in `server/`. Export `app` separately from `listen` so tests don't open a port.
- [ ] A **test database** (`shelf_test`) via `DATABASE_URL` in a test env file. Reset between tests (truncate or re-seed in `beforeEach`).
- [ ] Contract tests, one `describe` per endpoint: the happy path, `400`, `404`, `409`, the `{ error }` shape, and **remove → re-add restores the same id**.
- [ ] One unit test of a service with a fake in-memory repository. Notice how easy the repository interface makes this.

**Concepts:** integration tests vs unit tests on the server, test isolation with a real database, testing through HTTP.

**Be ready to answer:** Why test against real Postgres instead of mocking Prisma? When would you mock the repository?

---

## Milestone B4: The Reviews service (Rails API + Grape) (2 hr)

Build the service on its own first. Node doesn't call it until B5.

- [x] Generate the app with the flags in [`docs/BACKEND_SETUP.md` section 4](docs/BACKEND_SETUP.md#4-rails--grape-reviews-service-b4) (API mode, Postgres, RSpec instead of Minitest). It uses its own `reviews_development` / `reviews_test` databases on the same Postgres server. Port **4001**.
- [ ] `Review` model: `shelf_book_id` (uuid, **unique**, no foreign key, because the shelf lives in another database), `rating` (1–5 or null), `notes` (≤ 1000, default `""`), timestamps. Put the validations in the model **and** the constraints in the migration.
- [ ] **Grape mounted in Rails** (`mount ... => '/'` in `config/routes.rb`), versioned under `/v1`:
  - `GET /v1/reviews?shelf_book_ids[]=…`: **batch** lookup (returns only the ones that exist)
  - `GET /v1/reviews/:shelf_book_id` → `200` or `404`
  - `PUT /v1/reviews/:shelf_book_id`: **upsert**, idempotent. Returns the review.
  - `DELETE /v1/reviews/:shelf_book_id` → `204` (for admin/cleanup; the shelf no longer calls it on remove)
- [ ] Grape `params do … end` for coercion and validation, **grape-entity** for the response shape, and `rescue_from` so every error is `{ "error": "…" }` (validation → 400, `RecordNotFound` → 404, anything else → 500).
- [ ] snake_case JSON. Node will map it.
- [ ] RSpec request specs, plus FactoryBot for a review.

**Concepts:** what Rails provides vs what Grape provides, Zeitwerk autoloading, idempotency, referencing data across services by id (no foreign keys across databases).

<details><summary>Hint: Zeitwerk + Grape in <code>app/api</code></summary>

Every folder under `app/` is an autoload root, so `app/api/v1/reviews.rb` is expected to define `V1::Reviews`, **not** `API::V1::Reviews`. Pick one: drop the `API` namespace, or nest it (`app/api/api/v1/...`) and add an `API` acronym inflection. `bin/rails zeitwerk:check` tells you if you got it right.
</details>

<details><summary>Hint: why PUT, not POST</summary>

Each shelf book has exactly one review, so the client knows the resource's address up front (`/v1/reviews/:shelf_book_id`). `PUT` there means "make it look like this", and sending it twice gives the same result. That's what makes it **safe to retry** from the gateway in B5. A `POST` retried after a timeout could create duplicates.
</details>

**Be ready to answer:** Why Grape inside Rails instead of plain Rails controllers? (Params DSL, versioning, entities, and teams with existing Grape APIs.) What would you lose with Sinatra or Roda?

---

## Milestone B5: The extraction: Node becomes the gateway (2 hr)

The interview story: "We moved reviews out of the monolith without the frontend noticing."

- [ ] **`reviewsClient`** in `server/src/clients/reviews.ts`: an axios instance (`baseURL` from env, **timeout around 2s**), a response interceptor that normalizes errors (the same idea as `ApiError` in M2), mapping snake_case ↔ camelCase **at this boundary only**, and forwarding of the incoming **`X-Request-Id`**.
- [ ] **Retries for idempotent calls only** (`GET`, `PUT`, `DELETE`): one or two retries with a short backoff, only on network errors and 5xx, never on 4xx.
- [ ] **Compose the responses** so `docs/API.md` stays exactly the same:
  - `GET /api/shelf`: fetch the books, then **one batch call** for their reviews, and merge. No N+1.
  - `GET /api/shelf/:id`: book + single review.
  - `PATCH /api/shelf/:id`: `status` goes to Postgres; `rating` / `notes` go to Ruby via `PUT`. Pass Ruby's `400` and its `{ error }` through unchanged.
- [ ] **Failure policy:** if Ruby is down or times out, **reads** return books with `rating: null, notes: ""` (and log a warning); **writes** that touch rating/notes fail with `502`/`503 { error }`.
- [ ] **Migrate the data:** a one-off backfill script copies existing `rating` / `notes` from the `shelf` DB into Ruby (via its `PUT`, so it's idempotent and safe to re-run). Then a Prisma migration **drops** those columns from Node's DB.
- [ ] Node tests: mock the Ruby service **at the network level** with MSW's `setupServer` (the same tool as the frontend!). Test the merge, the degrade-on-read and the fail-on-write paths.
- [ ] Run the React app end to end with all three pieces up. Stop Rails and confirm the shelf still loads.

**Concepts:** BFF/gateway pattern, partial failure, timeouts and retries, idempotency, N+1 across services, data migration during an extraction (expand → migrate → contract), correlation ids.

<details><summary>Hint: the PATCH that's half saved</summary>

`{ status: 'done', rating: 5 }` writes to two databases with no shared transaction. If Postgres succeeds and Ruby fails, what does the client see? Options: (1) call Ruby **first**, since it's the one more likely to fail, then Postgres; (2) on failure, compensate by reverting the status; (3) accept it and return an error saying what failed. Pick one and explain why. This is the smallest version of the "distributed transaction / saga" interview question.
</details>

<details><summary>Hint: how soft delete paid off</summary>

Because remove only archives the shelf row, the review simply stays in Ruby. There's no cross-service delete, no orphan cleanup job and no "Ruby was down during the delete" case, and re-add gets the notes back for free. Being able to say "we changed the product behavior to avoid a distributed write" is a strong answer.
</details>

**Be ready to answer:** Why must the browser never call Ruby directly? What happens to latency when every shelf read fans out to a second service, and how would you fix it (parallel calls, caching, putting the data where it's read)? When is extracting a service the *wrong* move?

---

## Milestone B6: GraphQL on the gateway (1.5 hr)

GraphQL is an **API layer**, not a database layer: it sits next to REST in Node and calls the **same services**. Apollo Server is what 2022/23 job descriptions usually mean by it.

- [ ] Apollo Server mounted on Express at `/graphql`. (Apollo's Express integration lives in a separate package; use the one for **Express 5**.)
- [ ] **Schema-first SDL:** `type ShelfBook { id, workKey, title, authors, coverId, firstPublishYear, status, addedAt, updatedAt, review: Review }`, `type Review { rating, notes }`, `enum ReadingStatus`.
  - Queries: `shelf(status: ReadingStatus): [ShelfBook!]!`, `book(id: ID!): ShelfBook`
  - Mutations: `addBook`, `updateBook`, `removeBook`
- [ ] Resolvers call your **services**, never Prisma directly.
- [ ] **`ShelfBook.review` as a field resolver backed by DataLoader**, so `shelf { review { rating } }` makes **one** batch call to Ruby, not one per book. Create the loaders **per request** (in the context function).
- [ ] Errors: map domain errors to GraphQL errors with `extensions.code` (`NOT_FOUND`, `BAD_USER_INPUT`, …). If Ruby is down, `review` resolves to `null` with an error in `errors[]` while the rest of the data still returns. That's GraphQL's built-in partial success.
- [ ] Optional: `graphql-codegen` to generate TypeScript types for your resolvers.
- [ ] Try it in Apollo Sandbox (at `/graphql` in dev). Write one query that over-fetches in REST terms (the whole shelf) and one that fetches just titles.
- [ ] Supertest a couple of queries (`POST /graphql` with `{ query, variables }`).

**Concepts:** schema vs resolvers, field resolvers, the N+1 problem and DataLoader, partial errors, why GraphQL usually answers `200` even when something failed.

<details><summary>Hint: why DataLoader must be per request</summary>

DataLoader batches calls within one tick **and caches** by key. A loader shared across requests would serve user A's cached data to user B and never see updates. A new loader per request scopes both the batching and the cache to that request.
</details>

**Be ready to answer:** REST vs GraphQL: when would you choose each? Why is HTTP caching harder with GraphQL, and what does Apollo Client's normalized cache do instead (compare with your M5 `queryCache`)? How would you stop a client sending a very expensive query (depth or complexity limits, persisted queries)?

---

## Milestone B7: Everything in Docker Compose (1 hr)

- [ ] **`server/Dockerfile`:** multi-stage (install + build stage → slim runtime stage running `node dist/index.js`), with a `.dockerignore`, `prisma migrate deploy` on start, and a non-root user.
- [ ] **`services/reviews/Dockerfile`:** Rails 7.1+ already generated one. Read it and understand it rather than rewriting it (note: it's production-oriented). Run `db:prepare` on start.
- [ ] Add both to `docker-compose.yml`: `depends_on` with `condition: service_healthy` on Postgres, **env vars for configuration** (`DATABASE_URL`, `REVIEWS_URL=http://reviews:4001`, which uses the service name, not localhost), and healthchecks (`/healthz`, and Rails's built-in `/up`).
- [ ] `docker compose up --build` brings up the whole backend. The Vite dev server stays on your machine and proxies to `localhost:4000`.
- [ ] **Day-to-day dev:** keep Postgres in Docker, and run Node (`tsx watch`) and Rails (`bin/rails s`) natively for fast reloads. Or try `docker compose watch`. Write down which you prefer and why.

**Concepts:** image layers and caching, multi-stage builds, configuration through environment variables, service discovery by name, startup ordering vs readiness.

**Be ready to answer:** Why does `depends_on` alone not guarantee Postgres is ready? What changes between this compose file and a real deployment (secrets, migrations as a separate step, multiple replicas, a real gateway or load balancer)?

---

## Backend stretch goals (pick any)

- **Second extraction: a reading log / stats service** (Ruby again, or Node to compare): `POST /reading-sessions` (pages read per day), plus a yearly stats endpoint. Who owns what, and how does the gateway expose it?
- **Third extraction: book metadata.** Move Open Library calls behind your own service with caching (Postgres table or Redis) and rate limiting. The frontend's `searchBooks` would then hit `/api/search`. What happens to the M4 search code?
- **Events instead of HTTP calls:** publish `shelf_book.archived` (Redis streams, or a Postgres outbox table polled by a worker) and let Reviews react. Explain the **outbox pattern** and why "write to DB then publish" isn't safe on its own.
- **Circuit breaker** around `reviewsClient` (e.g. `opossum`): stop calling Ruby for 30s after repeated failures.
- **Auth at the gateway:** JWT on `/api`, plus a service-to-service token (or mTLS, discussed only) between Node and Ruby.
- **OpenAPI:** `grape-swagger` in Ruby, and zod → OpenAPI in Node. Generate the frontend's types from it.
- **Contract tests between services** (Pact, or a shared JSON fixture both test suites use).
- **Express 4 rewrite** of B1's error handling (`asyncHandler` wrappers) to feel the difference.
- **Apollo Client on the frontend** for one screen. Compare its normalized cache with your `queryCache`.
- **NestJS comparison:** port one module and compare its decorators/DI with your hand-wired layers.
- **Observability:** OpenTelemetry tracing across Node → Ruby, using the request id you already pass along.
