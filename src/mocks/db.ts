/**
 * The fake backend's "database": an in-memory array persisted to localStorage
 * so your shelf survives page reloads.
 *
 * App code should NEVER import from src/mocks/. Pretend this lives on a server.
 * The only way to reach it is over HTTP: fetch('/api/...').
 */

export type ReadingStatus = 'want' | 'reading' | 'done'

export interface ShelfBookRecord {
  id: string
  workKey: string
  title: string
  authors: string[]
  coverId: number | null
  firstPublishYear: number | null
  status: ReadingStatus
  rating: number | null
  notes: string
  addedAt: string
  updatedAt: string
}

const STORAGE_KEY = 'mock:shelf'

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}

function seed(): ShelfBookRecord[] {
  const base = [
    {
      workKey: '/works/OL893414W',
      title: 'Dune',
      authors: ['Frank Herbert'],
      coverId: 11481354,
      firstPublishYear: 1965,
      status: 'done' as const,
      rating: 5,
      notes: 'The spice must flow.',
      age: 40,
    },
    {
      workKey: '/works/OL21745884W',
      title: 'Project Hail Mary',
      authors: ['Andy Weir'],
      coverId: 11200092,
      firstPublishYear: 2021,
      status: 'reading' as const,
      rating: null,
      notes: '',
      age: 12,
    },
    {
      workKey: '/works/OL5748544W',
      title: 'The Pragmatic Programmer',
      authors: ['Andrew Hunt', 'Dave Thomas'],
      coverId: 10143650,
      firstPublishYear: 1999,
      status: 'reading' as const,
      rating: null,
      notes: '',
      age: 5,
    },
    {
      workKey: '/works/OL20893680W',
      title: 'Piranesi',
      authors: ['Susanna Clarke'],
      coverId: 10226290,
      firstPublishYear: 2020,
      status: 'want' as const,
      rating: null,
      notes: '',
      age: 1,
    },
  ]
  return base.map(({ age, ...b }) => ({
    ...b,
    id: crypto.randomUUID(),
    addedAt: daysAgo(age),
    updatedAt: daysAgo(age),
  }))
}

function load(): ShelfBookRecord[] {
  if (typeof localStorage === 'undefined') return seed()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ShelfBookRecord[]
  } catch {
    // corrupted storage: fall through to seed
  }
  return seed()
}

let rows: ShelfBookRecord[] = load()

function persist() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

export const db = {
  all(): ShelfBookRecord[] {
    return rows
  },
  find(id: string): ShelfBookRecord | undefined {
    return rows.find((r) => r.id === id)
  },
  findByWorkKey(workKey: string): ShelfBookRecord | undefined {
    return rows.find((r) => r.workKey === workKey)
  },
  insert(row: ShelfBookRecord): ShelfBookRecord {
    rows = [...rows, row]
    persist()
    return row
  },
  update(id: string, patch: Partial<ShelfBookRecord>): ShelfBookRecord | undefined {
    const existing = rows.find((r) => r.id === id)
    if (!existing) return undefined
    const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() }
    rows = rows.map((r) => (r.id === id ? updated : r))
    persist()
    return updated
  },
  remove(id: string): boolean {
    const before = rows.length
    rows = rows.filter((r) => r.id !== id)
    persist()
    return rows.length !== before
  },
  reset(): ShelfBookRecord[] {
    rows = seed()
    persist()
    return rows
  },
}
