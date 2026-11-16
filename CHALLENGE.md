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

**What's provided:**
- Vite + React 19 + TypeScript + Tailwind v4 (already set up)
- A **fake backend** (MSW) that answers `fetch('/api/shelf')` like a real server, with latency, validation errors, and switchable random failures. See [`docs/API.md`](docs/API.md).
- [`docs/PRIMER.md`](docs/PRIMER.md): the architecture cheat sheet. Read sections 1–2 before you start.

**What's not provided:** any app code. That's your job.

---

## Ground rules

1. **Don't import from `src/mocks/`** in app code. It's "the server", reachable only through `fetch`.
2. **One milestone at a time**, with a git commit at the end of each (`git commit -m "M2: fetch shelf with useEffect"`). Then you can diff milestones and see how much code TanStack Query deleted.
3. **Talk out loud / write it down first.** Before each milestone, sketch the component tree and decide *where each piece of state lives*. That's the part interviews grade.
4. **Hints are folded.** Try for 10–15 minutes before opening one.
5. **Stuck or done? Ask Claude to review**, not to solve: "review my M4, don't give me the answer, just point at problems."
6. Styling is not the point. Use plain Tailwind utilities and move on.

**Pacing:** Milestones 0–6 are the core (about a weekend). 7–9 level you up. Each has a rough time box. If you blow through it, stop, look at the hints, and keep moving.

---

## Milestone 0: Orientation (15 min)

- [ ] `npm run dev`, open the app, open DevTools.
- [ ] In the console, run `await (await fetch('/api/shelf')).json()`. You should get 4 seeded books. Check the Network tab: the request is answered by the mock service worker.
- [ ] Open `https://openlibrary.org/search.json?q=hobbit&fields=key,title,author_name,first_publish_year,cover_i&limit=5` in a tab and get a feel for the response.
- [ ] Read [`docs/PRIMER.md`](docs/PRIMER.md) sections 1–2.
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

---

## Milestone 2: Fetching the hard way with `useEffect` (45 min)

Replace the fixtures with real data from `GET /api/shelf`. You're deliberately doing this *without* a library, to understand what libraries do for you.

- [ ] `src/lib/apiClient.ts`: an `apiFetch<T>(path, init?)` wrapper. It parses JSON, **throws an `ApiError`** (with `status` and `message` from `{ error }`) on non-2xx responses, and handles `204`.
- [ ] `src/features/shelf/api.ts`: `getShelf(status?, { signal }?)`.
- [ ] A custom hook `useShelf(status)` that returns `{ data, error, isLoading, refetch }`, built from `useState` + `useEffect`.
- [ ] Filter **on the server** now: pass `?status=` when a tab is selected, refetching when it changes.
- [ ] Handle **race conditions** with `AbortController` in the effect cleanup.
- [ ] Loading state, error state with a **Retry** button, empty state.
- [ ] Test it: in the console, `localStorage.setItem('mock:latency','2000')` and `localStorage.setItem('mock:failRate','0.3')`, then reload. Click through tabs quickly. Make sure the screen never shows the wrong tab's data.
- [ ] Status changes and removes still only update local state for now. That's fine.

**Concepts:** the effect lifecycle and dependency array, cleanup, StrictMode double-invoke, `AbortController`, separating the API layer from components, custom hooks.

<details><summary>Hint: the hook skeleton</summary>

```ts
useEffect(() => {
  const controller = new AbortController()
  setIsLoading(true)
  getShelf(status, { signal: controller.signal })
    .then(setData)
    .catch((e) => { if (e.name !== 'AbortError') setError(e) })
    .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
  return () => controller.abort()
}, [status, /* something that changes when you call refetch() */])
```

For `refetch`, a common trick is a counter in state (`const [nonce, setNonce] = useState(0)`) that you add to the dependency list.
</details>

**Be ready to answer:** Why did the request fire twice on load? What happens without the cleanup if responses arrive out of order? List three things this hook *doesn't* do that you'd want in production.

---

## Milestone 3: An external API: Search (45 min)

Add a **Search** section. Put it above the shelf, or toggle between them with a `useState`; routing comes in M6.

- [ ] `src/features/search/api.ts`: `searchBooks(query, { signal })` calls Open Library and **maps** the response into your own `SearchResult` type (`workKey`, `title`, `authors`, `coverId`, `firstPublishYear`). Nothing outside this file knows about `author_name` or `cover_i`.
- [ ] A controlled search input.
- [ ] A generic `useDebouncedValue(value, delayMs)` hook in `src/hooks/`. Search only fires about 400ms after typing stops, and only for 2+ characters.
- [ ] Same `useEffect` + abort pattern as M2 (copy-paste it; the duplication is part of the lesson).
- [ ] Each result has **+ Add**, which calls `POST /api/shelf`. Show `409` ("already on your shelf") nicely.
- [ ] Results already on your shelf show "✓ On shelf" instead of the button.

**Concepts:** debouncing with effect cleanup (`setTimeout` / `clearTimeout`), mapping external data at the boundary, handling a `409`.

At the end of M3, **write down the pain points** you hit. You should find at least these:
1. Duplicated loading/error/abort boilerplate in two hooks.
2. To show "✓ On shelf", search needs the shelf data too. Do you fetch it again? Lift it up?
3. After **+ Add**, the shelf list is stale until you refresh.
4. Switching tabs back and forth refetches every time, with a spinner, even though nothing changed.

Milestone 4 fixes all four.

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

## Milestone 4: Server state with TanStack Query (1 hr)

`npm i @tanstack/react-query @tanstack/react-query-devtools`

- [ ] `src/app/providers.tsx`: create a `QueryClient` (outside the component, or in `useState(() => new QueryClient())`), wrap the app in `QueryClientProvider`, and add `<ReactQueryDevtools />`.
- [ ] A **query key factory** (`shelfKeys`) and `queryOptions()` definitions in `features/shelf/queries.ts`. See the [primer, section 3](docs/PRIMER.md#3-tanstack-query-in-five-minutes).
- [ ] Replace `useShelf` with `useQuery`. Pass TanStack's `signal` to your API function; the hand-written abort logic goes away.
- [ ] Search: `useQuery` with `enabled: debouncedQuery.length >= 2` and `placeholderData: keepPreviousData` so old results stay visible while new ones load.
- [ ] "✓ On shelf": search reads the *same* cached shelf query (`useQuery(shelfQueryOptions())`). Confirm in the Network tab that no duplicate request is made.
- [ ] **+ Add** becomes a `useMutation`. On success, `invalidateQueries({ queryKey: shelfKeys.all })`. Disable the button while `isPending`.
- [ ] Set a sensible `staleTime` (say 30s) and watch the devtools: tabs you've already visited now show instantly.
- [ ] Delete the M2/M3 hand-written hooks. Run `git diff --stat` and enjoy it.

**Concepts:** server state vs client state, query keys, cache, `staleTime` vs `gcTime`, `isPending` vs `isFetching`, deduping, invalidation, refetch on window focus.

<details><summary>Hint: filtering. Should status be in the key?</summary>

There are two valid designs: (a) key per status `['shelf','list',{status}]` with server-side filtering, or (b) one query for the whole shelf with client-side filtering via `select`. (b) makes the tab counts free and makes "On shelf" trivial. (a) scales to huge lists. Pick one and **be able to defend it**. That trade-off is a good interview conversation.
</details>

**Be ready to answer:** What exactly happens when you call `invalidateQueries({ queryKey: ['shelf'] })`? Why does the shelf refetch when you alt-tab back to the browser, and how would you turn that off?

---

## Milestone 5: Mutations & optimistic UI (1 hr)

- [ ] Status `<select>` → `PATCH /api/shelf/:id`, implemented as a **cache-based optimistic update**: `onMutate` (cancel queries, snapshot, `setQueryData`, return the snapshot), `onError` (roll back and show an error), `onSettled` (invalidate).
- [ ] Remove → `DELETE /api/shelf/:id`, implemented the **other way**: no cache surgery. While the mutation is pending, render that card faded or struck through using `isPending` and `variables`, and let `onSuccess` invalidation remove it for real.
- [ ] Turn on `mock:failRate = 0.5` and hammer both. The UI must always end up matching the server. Click **Reset** if needed: `await fetch('/api/_reset', { method: 'POST' })`.
- [ ] Wrap these in custom hooks: `useUpdateBook()` and `useRemoveBook()`. Components shouldn't know about query keys.

**Concepts:** optimistic vs pessimistic updates, rollback, why you `cancelQueries` first, custom hooks as the boundary between UI and data.

<details><summary>Hint: onMutate shape</summary>

```ts
onMutate: async ({ id, patch }) => {
  await queryClient.cancelQueries({ queryKey: shelfKeys.all })
  const previous = queryClient.getQueriesData<ShelfBook[]>({ queryKey: shelfKeys.lists() })
  queryClient.setQueriesData<ShelfBook[]>({ queryKey: shelfKeys.lists() }, (old) =>
    old?.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  )
  return { previous }
},
onError: (_err, _vars, context) => {
  context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
},
onSettled: () => queryClient.invalidateQueries({ queryKey: shelfKeys.all }),
```

(Your exact keys depend on your M4 design. If you filter by status on the server, think about what happens when a book's status changes while you're on the "Reading" tab.)
</details>

**Be ready to answer:** When is optimistic UI a bad idea? (Think payments, irreversible actions, and actions that usually fail.)

---

## Milestone 6: Routing & URL state (1 hr)

`npm i react-router`

- [ ] Routes: `/` → redirect to `/shelf`; `/shelf`; `/shelf/:id`; `/search`; `*` → Not Found.
- [ ] A **layout route** with the header and nav (`NavLink` with active styling) and an `<Outlet />`.
- [ ] Move UI state into the URL with `useSearchParams`: the shelf filter and sort become `/shelf?status=reading&sort=title`, and the search query becomes `/search?q=hobbit`. Refresh, back/forward, and copying the link should all work.
- [ ] **Detail page** `/shelf/:id`: `useParams` + a detail query. Show a 404 state for unknown ids.
- [ ] On the detail page, a **notes + rating form** using a React 19 **form action** + `useActionState`. Show server validation errors (try saving more than 1000 characters of notes). Make a `SubmitButton` that uses `useFormStatus()` for its pending state.
- [ ] Bonus: make the detail page show instantly when you come from the list, using the list cache as `placeholderData` for the detail query.

**Concepts:** URL as the source of truth, layout/nested routes, params vs search params, uncontrolled forms with `FormData`, `useActionState`, `useFormStatus`.

<details><summary>Hint: useActionState + a mutation</summary>

```tsx
const update = useUpdateBook()
const [state, formAction, isPending] = useActionState(
  async (_prev: { error?: string } | null, formData: FormData) => {
    try {
      await update.mutateAsync({ id, patch: { notes: String(formData.get('notes')), /* rating */ } })
      return null
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Something went wrong' }
    }
  },
  null,
)
// <form action={formAction}> <textarea name="notes" defaultValue={book.notes} /> …
```

Gotcha: React **resets uncontrolled fields** after a successful action. Make sure `defaultValue` already reflects the saved data by then (e.g. `setQueryData` in the mutation's `onSuccess`), or the textarea flashes back to the old text.
</details>

**Be ready to answer:** What belongs in the URL and what doesn't? Controlled vs uncontrolled: why did you pick uncontrolled for the notes form? Would a live character counter change that?

---

## Milestone 7: Client state: Context vs Zustand (45 min)

There's finally some **client-only shared state**, so it's time to choose the right tool for it.

- [ ] **Theme (Context):** `ThemeProvider` + `useTheme()` with `'light' | 'dark' | 'system'`, persisted to `localStorage`, plus a toggle in the header. `useTheme()` should throw a helpful error if it's used outside the provider. (Tailwind v4 dark mode by class: add `@custom-variant dark (&:where(.dark, .dark *));` to `index.css` and toggle `.dark` on `<html>`.)
- [ ] **Shelf UI store (Zustand):** `npm i zustand`. Add a `view: 'grid' | 'list'` preference (persisted with the `persist` middleware) and **multi-select** (`selectedIds`) with a floating "N selected: Mark done · Remove" bar in the layout. Components read slices with **selectors**.
- [ ] The store holds **ids only**, never copies of book objects. Book data stays in the query cache.
- [ ] Clear the selection when the filter changes or after a bulk action.

**Concepts:** when Context is enough, Context re-render behaviour, selectors, persisted state, not duplicating server state.

<details><summary>Hint: why not put theme in Zustand too?</summary>

You could, and it would be fine. Context is taught here because interviews *always* ask about it, and theme is the textbook case: it changes rarely, everyone reads it, and it suits dependency injection. Be ready to say why you'd pick one over the other ([primer, section 4](docs/PRIMER.md#4-client-state-usestate--context--zustand)).
</details>

**Be ready to answer:** Why does every consumer of a Context re-render on change, and what are the mitigations? (Split contexts, memoize the value, or move to a selector-based store.)

---

## Milestone 8: Resilience: Suspense & error boundaries (45 min)

`npm i react-error-boundary`

- [ ] Convert the detail page to `useSuspenseQuery` with a `<Suspense fallback={<BookDetailSkeleton/>}>`. Note how the component no longer handles `isPending`.
- [ ] Add an `ErrorBoundary` around the routed content (inside the layout, so the nav survives a crash) with a "Try again" button. Use `resetKeys={[location.pathname]}` so navigating away clears the error, and `QueryErrorResetBoundary` so "Try again" refetches.
- [ ] Throw a deliberate error in a component to prove the boundary works, then remove it.
- [ ] Lazy-load the search route with `React.lazy` + `Suspense` and check the Network tab for the separate chunk.
- [ ] Audit your loading, empty, and error states on every screen with `failRate = 0.3`.

**Concepts:** declarative loading and error states, what error boundaries can and can't catch, code splitting.

---

## Milestone 9: Testing (1 hr)

`npm i -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`

The fake backend runs in tests too: `src/mocks/node.ts` exports an MSW `server` with the same handlers. Latency is automatically 0 under Vitest.

- [ ] Configure Vitest (`test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'] }` in `vite.config.ts`, plus `"types": ["vitest/globals"]` if you use globals).
- [ ] `src/test/setup.ts`: `server.listen()` in `beforeAll`, `server.resetHandlers()` + `localStorage.clear()` + `await fetch('/api/_reset', { method: 'POST' })` in `afterEach`, and `server.close()` in `afterAll`.
- [ ] `src/test/render.tsx`: `renderWithProviders(ui, { route })` creates a **fresh `QueryClient` per test** (with `retry: false`) and a `MemoryRouter`.
- [ ] Tests (query by role and label, like a user would):
  - [ ] The shelf shows the 4 seeded books.
  - [ ] Clicking the "Reading" tab shows only reading books, and the URL has `?status=reading`.
  - [ ] Shows the error state when the API fails: `server.use(http.get('/api/shelf', () => HttpResponse.json({ error: 'boom' }, { status: 500 })))`.
  - [ ] An optimistic status change **rolls back** when `PATCH` fails.
  - [ ] Unit test `useDebouncedValue` with `vi.useFakeTimers()` + `renderHook`.
- [ ] Add `"test": "vitest"` to `package.json` scripts.

**Concepts:** testing behaviour rather than implementation, network-level mocking instead of mocking `fetch` or hooks, test isolation.

**Be ready to answer:** Why mock the network (MSW) instead of `vi.mock('./api')`? Why a new `QueryClient` per test?

---

## Stretch goals (pick any)

- **React Compiler**: enable `babel-plugin-react-compiler` with the Vite React plugin, then delete any `useMemo` / `useCallback` you wrote. Does anything break?
- **zod**: validate the Open Library and `/api` responses at the API layer, and infer your TS types from the schemas.
- **Infinite scroll** on search with `useInfiniteQuery` (Open Library supports `page=`).
- **`useTransition`** around filter changes, and compare it with `isFetching`.
- **Route loaders**: move to React Router's data mode (`createBrowserRouter`) and prefetch queries in `loader`s with `queryClient.ensureQueryData`. This is how the frameworks avoid waterfalls.
- **Redux Toolkit comparison**: re-implement the Zustand store as an RTK slice in a branch. Compare the boilerplate, and be able to talk about it.
- **Accessibility pass**: keyboard-only use, focus management after a delete, `aria-live` for errors.
- **Next up**: build the real Node backend that implements [`docs/API.md`](docs/API.md), point the app at it, turn off MSW in dev, and keep it for tests.

---

## Final self-check

Take out your Milestone 0 paper diagram. For each piece of state, compare where you *planned* to put it with where it *ended up*. Being able to explain that difference is what an architecture interview is looking for.
