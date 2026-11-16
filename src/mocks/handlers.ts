/**
 * The fake REST API. See docs/API.md for the contract.
 *
 * MSW intercepts HTTP (fetch and XHR, so axios too) at the network level (a Service Worker in the browser,
 * a request interceptor in Node/tests), so your app code makes real HTTP calls
 * and has no idea it's talking to a mock. When we build the Node backend later,
 * it implements this same contract and these handlers simply get switched off.
 */
import { delay, http, HttpResponse } from 'msw'
import { mockConfig } from './config'
import { db, type ReadingStatus, type ShelfBookRecord } from './db'

const STATUSES: ReadingStatus[] = ['want', 'reading', 'done']
const NOTES_MAX = 1000

function isStatus(v: unknown): v is ReadingStatus {
  return typeof v === 'string' && (STATUSES as string[]).includes(v)
}

function error(status: number, message: string) {
  return HttpResponse.json({ error: message }, { status })
}

/** Simulated latency + random failures, applied to every /api request. */
async function networkConditions() {
  await delay(mockConfig.latencyMs + Math.random() * mockConfig.latencyMs)
  if (Math.random() < mockConfig.failRate) {
    return error(500, 'Simulated server error (see src/mocks/config.ts)')
  }
  return null
}

export const handlers = [
  // GET /api/shelf?status=reading
  http.get('/api/shelf', async ({ request }) => {
    const failure = await networkConditions()
    if (failure) return failure

    const status = new URL(request.url).searchParams.get('status')
    if (status !== null && !isStatus(status)) {
      return error(400, `status must be one of: ${STATUSES.join(', ')}`)
    }
    const rows = status ? db.all().filter((r) => r.status === status) : db.all()
    // newest first
    return HttpResponse.json([...rows].sort((a, b) => b.addedAt.localeCompare(a.addedAt)))
  }),

  // GET /api/shelf/:id
  http.get('/api/shelf/:id', async ({ params }) => {
    const failure = await networkConditions()
    if (failure) return failure

    const row = db.find(String(params.id))
    return row ? HttpResponse.json(row) : error(404, 'Book not found on shelf')
  }),

  // POST /api/shelf
  http.post('/api/shelf', async ({ request }) => {
    const failure = await networkConditions()
    if (failure) return failure

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body.workKey !== 'string' || typeof body.title !== 'string') {
      return error(400, 'workKey and title are required strings')
    }
    if (body.status !== undefined && !isStatus(body.status)) {
      return error(400, `status must be one of: ${STATUSES.join(', ')}`)
    }
    if (db.findByWorkKey(body.workKey)) {
      return error(409, 'That book is already on your shelf')
    }

    const now = new Date().toISOString()
    const row: ShelfBookRecord = {
      id: crypto.randomUUID(),
      workKey: body.workKey,
      title: body.title,
      authors: Array.isArray(body.authors) ? body.authors.map(String) : [],
      coverId: typeof body.coverId === 'number' ? body.coverId : null,
      firstPublishYear: typeof body.firstPublishYear === 'number' ? body.firstPublishYear : null,
      status: isStatus(body.status) ? body.status : 'want',
      rating: null,
      notes: '',
      addedAt: now,
      updatedAt: now,
    }
    return HttpResponse.json(db.insert(row), { status: 201 })
  }),

  // PATCH /api/shelf/:id  { status?, rating?, notes? }
  http.patch('/api/shelf/:id', async ({ params, request }) => {
    const failure = await networkConditions()
    if (failure) return failure

    const id = String(params.id)
    if (!db.find(id)) return error(404, 'Book not found on shelf')

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) return error(400, 'Body must be JSON')

    const patch: Partial<ShelfBookRecord> = {}
    if ('status' in body) {
      if (!isStatus(body.status)) return error(400, `status must be one of: ${STATUSES.join(', ')}`)
      patch.status = body.status
    }
    if ('rating' in body) {
      const r = body.rating
      if (r !== null && !(typeof r === 'number' && Number.isInteger(r) && r >= 1 && r <= 5)) {
        return error(400, 'rating must be an integer 1-5, or null')
      }
      patch.rating = r
    }
    if ('notes' in body) {
      if (typeof body.notes !== 'string') return error(400, 'notes must be a string')
      if (body.notes.length > NOTES_MAX) return error(400, `notes must be at most ${NOTES_MAX} characters`)
      patch.notes = body.notes
    }
    if (Object.keys(patch).length === 0) {
      return error(400, 'Nothing to update: send status, rating and/or notes')
    }
    return HttpResponse.json(db.update(id, patch))
  }),

  // DELETE /api/shelf/:id
  http.delete('/api/shelf/:id', async ({ params }) => {
    const failure = await networkConditions()
    if (failure) return failure

    return db.remove(String(params.id))
      ? new HttpResponse(null, { status: 204 })
      : error(404, 'Book not found on shelf')
  }),

  // POST /api/_reset  (dev helper: restore the seed data; no latency/failures)
  http.post('/api/_reset', () => HttpResponse.json(db.reset())),
]
