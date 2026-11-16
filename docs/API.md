# API contract

Two data sources:

1. **Your backend**: `/api/*`. For now it's faked in the browser by [MSW](https://mswjs.io) (`src/mocks/`). Later, a Node server will implement this exact contract and the app code won't change.
2. **An external API**: [Open Library](https://openlibrary.org/developers/api). It's real, public, needs no key, and allows CORS.

> **Rule:** app code never imports from `src/mocks/`. Treat it as a server on another machine. The only way in is HTTP, via your axios instance (`baseURL: '/api'`).

---

## Your backend: `/api/shelf`

### Data shape

```ts
type ReadingStatus = 'want' | 'reading' | 'done'

interface ShelfBook {
  id: string                    // uuid, assigned by the server
  workKey: string               // Open Library work key, e.g. "/works/OL893414W" (unique per shelf)
  title: string
  authors: string[]
  coverId: number | null        // Open Library cover id (see "Covers" below)
  firstPublishYear: number | null
  status: ReadingStatus
  rating: number | null         // integer 1–5, or null
  notes: string                 // max 1000 chars
  addedAt: string               // ISO 8601
  updatedAt: string             // ISO 8601
}
```

Every error response has the same shape:

```ts
interface ApiErrorBody { error: string }
```

### Endpoints

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| `GET` | `/api/shelf` | none | `200 ShelfBook[]`, newest first | `400` bad `status` |
| `GET` | `/api/shelf?status=reading` | none | `200 ShelfBook[]`, filtered | `400` |
| `GET` | `/api/shelf/:id` | none | `200 ShelfBook` | `404` |
| `POST` | `/api/shelf` | `{ workKey, title, authors?, coverId?, firstPublishYear?, status? }` | `201 ShelfBook` (status defaults to `want`) | `400` missing fields, `409` already on shelf |
| `PATCH` | `/api/shelf/:id` | any of `{ status?, rating?, notes? }` | `200 ShelfBook` | `400` validation, `404` |
| `DELETE` | `/api/shelf/:id` | none | `204` empty body | `404` |
| `POST` | `/api/_reset` | none | `200 ShelfBook[]` | dev helper: restores the seed data |

With axios, pass a plain object as the body (`http.post('/shelf', input)`). It sets `Content-Type: application/json` and serializes for you. Any non-2xx response rejects, with the `{ error }` body in `err.response.data`.

```ts
const http = axios.create({ baseURL: '/api' })
await http.get<ShelfBook[]>('/shelf', { params: { status: 'reading' } }) // GET /api/shelf?status=reading
await http.patch<ShelfBook>(`/shelf/${id}`, { status: 'done', rating: 5 })
await http.delete(`/shelf/${id}`)                                          // 204: response.data is empty
```

### Simulating a real network

Every `/api` request waits 400–800ms by default. To exercise loading and error states, run these in the browser console and reload:

```js
localStorage.setItem('mock:latency', '2000')  // slow network
localStorage.setItem('mock:failRate', '0.3')  // 30% of requests return 500
localStorage.removeItem('mock:failRate')      // back to normal
await fetch('/api/_reset', { method: 'POST' }) // restore seed data
```

---

## External: Open Library

### Search

```
GET https://openlibrary.org/search.json?q=dune&fields=key,title,author_name,first_publish_year,cover_i&limit=20
```

Pass `fields` so the response stays small (the default response is huge). With axios, give Open Library its own instance:

```ts
const openLibrary = axios.create({ baseURL: 'https://openlibrary.org', timeout: 10_000 })
await openLibrary.get<OpenLibrarySearchResponse>('/search.json', {
  params: { q: 'dune', fields: 'key,title,author_name,first_publish_year,cover_i', limit: 20 },
  signal,
})
```

Response, trimmed:

```json
{
  "numFound": 124,
  "docs": [
    {
      "key": "/works/OL893414W",
      "title": "Dune",
      "author_name": ["Frank Herbert"],
      "first_publish_year": 1965,
      "cover_i": 11481354
    }
  ]
}
```

Any field except `key` and `title` can be missing. Your types should say so.

Notes:
- Open Library is a free service and is sometimes slow (1–3s), which makes it good practice for loading states. Don't send a request on every keystroke (see Milestone 4).
- Don't pass Open Library's response shape around your app. Map it into your own type at the edge, e.g. `author_name` → `authors`, `cover_i` → `coverId`, `key` → `workKey`. Then a change in their API breaks one function instead of twenty components.

### Covers

```
https://covers.openlibrary.org/b/id/{coverId}-S.jpg   (small)
https://covers.openlibrary.org/b/id/{coverId}-M.jpg   (medium)
https://covers.openlibrary.org/b/id/{coverId}-L.jpg   (large)
```

`coverId` can be `null`, so render a placeholder in that case.
