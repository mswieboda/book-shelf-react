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
- **Next up**: build the real Node backend that implements [`docs/API.md`](docs/API.md), point the app at it, turn off MSW in dev, and keep it for tests.

---

## Final self-check

Take out your Milestone 0 paper diagram. For each piece of state, compare where you *planned* to put it with where it *ended up*. Being able to explain that difference is what an architecture interview is looking for.
